import type { Case, CaseDocument, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logActivity } from "./activity";
import { getAutoOptions, getPortalPath } from "./options";
import { STAGES, STATUSES } from "./constants";
import { mysqlNow, newToken, safeEqual, siteUrl } from "./util";

export type FileRef = { fileId?: string; name: string; uploadedAt?: string; url?: string };

export function docFiles(d: Pick<CaseDocument, "files">): FileRef[] {
  const raw = Array.isArray(d.files) ? (d.files as unknown[]) : [];
  return raw
    .map((f) => {
      if (typeof f === "string") return { name: decodeURIComponent(f.split("/").pop() || f), url: f };
      if (f && typeof f === "object") return f as FileRef;
      return null;
    })
    .filter(Boolean) as FileRef[];
}

/** mmcrm_case_facts() */
export function caseFacts(c: Case & { documents: CaseDocument[] }) {
  const a1 = c.app1Name.trim();
  const a2 = c.app2Name.trim();
  const e1 = c.app1Email.trim();
  const e2 = c.app2Email.trim();
  let recv = 0, pending = 0, rejected = 0;
  for (const d of c.documents) {
    if (d.status === "Received" || d.status === "Accepted") recv++;
    else if (d.status === "Rejected") { rejected++; pending++; }
    else pending++;
  }
  const total = c.documents.length;
  const loan = c.loanAmount || 0;
  let cpct = c.commPct || 0, mpct = c.commMmPct || 0;
  if (cpct > 0 && cpct < 1) cpct *= 100;
  if (mpct > 0 && mpct < 1) mpct *= 100;
  const commission = Math.max(0, loan * (cpct / 100) * (mpct / 100));
  const names = [a1, a2].filter(Boolean);
  const draft = (c.ffDraft && typeof c.ffDraft === "object" ? c.ffDraft : {}) as Record<string, unknown>;
  return {
    id: c.id,
    a1, a2, e1, e2,
    name: names.length ? names.join(" & ") : c.title || `Case #${c.id}`,
    emails: [e1, e2].filter(Boolean),
    stage: STAGES[c.stage] ? c.stage : "new",
    status: c.status,
    statusLabel: STATUSES[c.status] ?? "Active",
    docs_total: total,
    docs_done: recv,
    docs_pending: pending,
    docs_rejected: rejected,
    docs_pct: total ? Math.round((100 * recv) / total) : 0,
    loan,
    commission,
    created: c.createdAt,
    modified: c.updatedAt,
    ff_done: c.ffDone,
    ff_done_at: c.ffDoneAt,
    ff_started: Object.keys(draft).length > 0,
    showFactfind: c.showFactfind,
    edit_url: `/admin/cases/${c.id}`,
  };
}
export type CaseFacts = ReturnType<typeof caseFacts>;

export async function loadCase(id: number) {
  return prisma.case.findUnique({ where: { id }, include: { documents: { orderBy: [{ sort: "asc" }, { id: "asc" }] } } });
}

export async function ensureToken(caseId: number) {
  const c = await prisma.case.findUnique({ where: { id: caseId }, select: { portalToken: true } });
  if (c?.portalToken) return c.portalToken;
  const t = newToken();
  await prisma.case.update({ where: { id: caseId }, data: { portalToken: t } });
  return t;
}

/** mmcrm_portal_url() — absolute URL with mm_case/mm_key. */
export async function portalUrl(c: Pick<Case, "id" | "portalToken">, extra: Record<string, string> = {}) {
  const path = await getPortalPath();
  const q = new URLSearchParams({ mm_case: String(c.id), mm_key: c.portalToken, ...extra });
  return `${siteUrl()}${path}?${q.toString()}`;
}

/** Token check for the public portal (hash_equals). Returns the case or null. */
export async function authPortal(caseIdRaw: unknown, keyRaw: unknown, opts: { allowClosed?: boolean } = {}) {
  const caseId = parseInt(String(caseIdRaw ?? ""), 10);
  const key = String(keyRaw ?? "");
  if (!caseId || !key) return null;
  const c = await prisma.case.findUnique({ where: { id: caseId }, include: { documents: { orderBy: [{ sort: "asc" }, { id: "asc" }] } } });
  if (!c || !c.portalToken || !safeEqual(c.portalToken, key)) return null;
  if (c.portalClosed && !opts.allowClosed) return null;
  return c;
}

/** Case timeline (_mm_ff_activity) + signals feed. MMCRM_Forms_Admin::log_event */
export async function logEvent(caseId: number, type: string, detail: string, by = "client", extra: Prisma.InputJsonValue = {}) {
  await prisma.caseEvent.create({ data: { caseId, type, detail, by, extra } });
  const signal = type === "form_submit" ? "ff_submit" : type === "submit" ? "ff_submit" : type === "save" ? "ff_draft" : type === "docs_upload" ? "upload" : "sys";
  await logActivity(caseId, signal, detail, by);
}

/** mmcrm_portal_set() */
export async function setPortal(caseId: number, open: boolean, why = "") {
  await prisma.case.update({ where: { id: caseId }, data: { portalClosed: !open } });
  await logEvent(caseId, open ? "portal_enabled" : "portal_disabled", (open ? "Client portal re-opened" : "Client portal closed") + (why ? " — " + why : ""), "admin");
}

export async function setStage(caseId: number, slug: string) {
  if (!STAGES[slug]) return false;
  await prisma.case.update({ where: { id: caseId }, data: { stage: slug } });
  return true;
}

/** Single status; closing a case closes the portal (on_status_terms). */
export async function setStatus(caseId: number, slug: string) {
  if (!STATUSES[slug]) return false;
  const c = await prisma.case.update({ where: { id: caseId }, data: { status: slug } });
  if (["completed", "archive", "unsuccessful"].includes(slug) && !c.portalClosed) {
    const o = await getAutoOptions();
    if (o.portal_off_on_close) await setPortal(caseId, false, "case marked " + STATUSES[slug]);
  }
  return true;
}

/** Title gets " — Case #ID" on first publish (core.php transition_post_status). */
export async function createCase(data: Omit<Prisma.CaseCreateInput, "portalToken" | "title"> & { title: string }) {
  const c = await prisma.case.create({ data: { ...data, title: data.title, portalToken: newToken() } });
  const suffix = ` — Case #${c.id}`;
  if (!c.title.includes(suffix)) return prisma.case.update({ where: { id: c.id }, data: { title: c.title + suffix } });
  return c;
}

export const nowMysql = mysqlNow;
