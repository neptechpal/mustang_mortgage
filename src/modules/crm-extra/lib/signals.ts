// Case Activity signals (port of includes/signals.php).
import { prisma } from "@/lib/db";
import { logActivity } from "@/modules/crm/activity";
import { fromSydLocal } from "./cases";

export const STALE_D = 3;
export const MAX_CASES = 200;
export const MAX_ITEMS_COL = 12;
/** Activity types never shown as signals (internal audit trail). */
const HIDDEN = ["audit"];

export const TYPE_TAG: Record<string, { label: string; tone: "good" | "bad" | "" }> = {
  ff_draft: { label: "Fact Find", tone: "" },
  ff_submit: { label: "Fact Find", tone: "good" },
  docs_all: { label: "Documents", tone: "good" },
  docs_pending: { label: "Documents", tone: "bad" },
  upload: { label: "Upload", tone: "" },
  docs_upload: { label: "Upload", tone: "" },
};
export const tagFor = (t: string) => TYPE_TAG[t] ?? { label: "Update", tone: "" as const };

/** Fact-find hook: "Fact Find draft saved by {who}" / "Fact Find submitted by {who}". */
export async function onFactFindEvent(caseId: number, event: "draft_saved" | "submitted", who = "") {
  const by = who ? ` by ${who}` : "";
  if (event === "submitted") await logActivity(caseId, "ff_submit", `Fact Find submitted${by}`, who);
  else await logActivity(caseId, "ff_draft", `Fact Find draft saved${by}`, who);
}
export async function onPortalUpload(caseId: number) {
  await logActivity(caseId, "upload", "Client uploaded a file.", "client");
}

async function docState(caseId: number) {
  const docs = await prisma.caseDocument.findMany({ where: { caseId }, select: { status: true, files: true } });
  const hasFiles = (f: unknown) => Array.isArray(f) && f.length > 0;
  return {
    count: docs.length,
    allHaveFiles: docs.length > 0 && docs.every((d) => hasFiles(d.files)),
    hasPending: docs.some((d) => (d.status || "Pending") === "Pending" || d.status === "Rejected"),
  };
}

/** evaluate_docs: one-shot "all uploaded" + "still pending" at most every 3 days. */
export async function evaluateDocs(caseId: number) {
  const s = await docState(caseId);
  if (!s.count) return;
  const st = await prisma.caseSignalState.findUnique({ where: { caseId } });
  const now = new Date();
  if (s.allHaveFiles && !st?.lastAllUp) {
    await logActivity(caseId, "docs_all", "All checklist documents have been uploaded.", "system");
    await prisma.caseSignalState.upsert({ where: { caseId }, create: { caseId, lastAllUp: now }, update: { lastAllUp: now } });
  }
  const last = st?.lastPendingAlert?.getTime() ?? 0;
  if (s.hasPending && (!last || now.getTime() - last >= STALE_D * 86400000)) {
    await logActivity(caseId, "docs_pending", `Some documents are still pending (>${STALE_D} days).`, "system");
    await prisma.caseSignalState.upsert({ where: { caseId }, create: { caseId, lastPendingAlert: now }, update: { lastPendingAlert: now } });
  }
}

/** Daily cron (~02:17): re-evaluate every case. */
export async function signalsDaily() {
  const ids = await prisma.case.findMany({ select: { id: true } });
  for (const { id } of ids) await evaluateDocs(id).catch(() => undefined);
  return { cases: ids.length };
}

export function parseRange(range: string, from?: string, to?: string): [Date, Date] {
  const end = new Date();
  const day = 86400000;
  if (range === "custom") {
    let f = from ? fromSydLocal(`${from}T00:00`) : null;
    let t = to ? new Date((fromSydLocal(`${to}T00:00`)?.getTime() ?? end.getTime()) + day - 1000) : end;
    if (!f) f = new Date(end.getTime() - 7 * day);
    if (f > t) [f, t] = [t, f];
    return [f, t];
  }
  const n = range === "30d" ? 30 : range === "90d" ? 90 : range === "1y" ? 365 : 7;
  return [new Date(end.getTime() - n * day), end];
}

export type SignalItem = { id: number; type: string; msg: string; at: Date; dismissed: boolean };
export type SignalCard = { caseId: number; title: string; items: SignalItem[] };

/**
 * Board / feed selection: range filter → drop docs_pending when no pending
 * docs now → drop docs_pending older than latest docs_all → drop dismissed
 * (unless show) → newest first, cap 12 → hide empty cards.
 */
export async function buildBoard(opts: {
  from: Date;
  to: Date;
  showDismissed?: boolean;
  status?: "active" | "completed" | "all";
  evaluate?: boolean;
}): Promise<SignalCard[]> {
  const status = opts.status ?? "active";
  const cases = await prisma.case.findMany({
    where: status === "all" ? {} : { status },
    orderBy: { createdAt: "desc" },
    take: MAX_CASES,
    select: { id: true, title: true },
  });
  if (opts.evaluate) for (const c of cases) await evaluateDocs(c.id).catch(() => undefined);
  const ids = cases.map((c) => c.id);
  const acts = await prisma.caseActivity.findMany({
    where: { caseId: { in: ids }, createdAt: { gte: opts.from, lte: opts.to }, type: { notIn: HIDDEN } },
    orderBy: { createdAt: "asc" },
  });
  const pendingNow = new Map<number, boolean>();
  const docs = await prisma.caseDocument.findMany({ where: { caseId: { in: ids } }, select: { caseId: true, status: true } });
  for (const d of docs) if (d.status === "Pending" || d.status === "Rejected") pendingNow.set(d.caseId, true);
  const out: SignalCard[] = [];
  for (const c of cases) {
    let rows = acts.filter((a) => a.caseId === c.id);
    if (!pendingNow.get(c.id)) rows = rows.filter((r) => r.type !== "docs_pending");
    const lastAll = rows.filter((r) => r.type === "docs_all").reduce((m, r) => Math.max(m, r.createdAt.getTime()), 0);
    if (lastAll) rows = rows.filter((r) => !(r.type === "docs_pending" && r.createdAt.getTime() < lastAll));
    if (!opts.showDismissed) rows = rows.filter((r) => !r.dismissed);
    if (!rows.length) continue;
    out.push({
      caseId: c.id,
      title: c.title || `Case #${c.id}`,
      items: rows
        .reverse()
        .slice(0, MAX_ITEMS_COL)
        .map((r) => ({ id: r.id, type: r.type, msg: r.detail, at: r.createdAt, dismissed: r.dismissed })),
    });
  }
  return out;
}

/** mmcrm_signals_feed (flat, for ICS). */
export async function signalsFeed(status: "active" | "completed" | "all", range: string, from?: string, to?: string, show = false) {
  const [f, t] = parseRange(range, from, to);
  const cards = await buildBoard({ from: f, to: t, showDismissed: show, status });
  return cards.flatMap((c) =>
    c.items.map((i) => ({ caseId: c.caseId, caseTitle: c.title, title: i.msg || "Update", when: i.at, notes: "", priority: i.type === "docs_pending" ? "High" : "", done: false })),
  );
}
