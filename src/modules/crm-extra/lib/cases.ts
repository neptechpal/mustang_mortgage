// Case helpers shared by crm-extra (port of mmcrm_case_facts & friends).
import { applicantNames, applicantEmails, type ApplicantCase } from "@/modules/crm/applicants";
import { readDeal, INCOME_DEFAULTS } from "./income";
import { getIncomeSettings } from "./income-settings";
import { prisma } from "@/lib/db";
import { SITE_URL } from "./opts";
import { indexGet } from "./threading";

export type CaseRow = NonNullable<Awaited<ReturnType<typeof prisma.case.findUnique>>>;

export const STAGES: Record<string, string> = {
  new: "New and Awaiting Docs",
  "awaiting-docs": "Docs Received",
  submitted: "Submitted",
  "pre-approved": "Pre-Approved",
  "full-approval": "Full Approval",
  settlement: "Settlement",
};

export const caseEditUrl = (id: number) => `/admin/cases/${id}`;

/** Secure portal URL (secure-upload page, ?mm_case=&mm_key=). */
export const portalUrl = (c: { id: number; portalToken: string }) =>
  `${SITE_URL}/secure-upload?mm_case=${c.id}&mm_key=${encodeURIComponent(c.portalToken)}`;

export const num = (v: unknown) => {
  const s = String(v ?? "").replace(/[^0-9.\-]/g, "");
  return s === "" || s === "-" ? 0 : parseFloat(s) || 0;
};

export const money = (n: number, dec = 0) =>
  "$" + (Number(n) || 0).toLocaleString("en-AU", { minimumFractionDigits: dec, maximumFractionDigits: dec });

/** Normalise "80" / "0.8" → percent (0 < v < 1 ⇒ ×100). */
export const normPct = (v: number | null | undefined) => {
  const n = Number(v) || 0;
  return n > 0 && n < 1 ? n * 100 : n;
};

/** Compatibility reader for legacy commission inputs. */
export const calcCommission = (loan?: number | null, bank?: number | null, mm?: number | null) =>
  readDeal({ loanAmount: loan, commPct: bank, commMmPct: mm }, INCOME_DEFAULTS).upfrontYou;

export function caseName(c: ApplicantCase & { id: number; title: string }) {
  return applicantNames(c) || c.title || `Case #${c.id}`;
}
export function caseEmails(c: ApplicantCase) {
  return Array.from(new Set([...applicantEmails(c), (c.legacyEmail || '').trim().toLowerCase()].filter(Boolean)));
}

export async function caseFacts(caseId: number) {
  const c = await prisma.case.findUnique({ where: { id: caseId }, include: { documents: true } });
  if (!c) return null;
  let recv = 0,
    pending = 0,
    rejected = 0;
  for (const d of c.documents) {
    if (d.status === "Received" || d.status === "Accepted") recv++;
    else if (d.status === "Rejected") {
      rejected++;
      pending++;
    } else pending++;
  }
  const total = c.documents.length;
  const deal = readDeal(c, await getIncomeSettings());
  return {
    c,
    id: c.id,
    a1: c.app1Name.trim(),
    a2: c.app2Name.trim(),
    name: caseName(c),
    emails: caseEmails(c),
    docsTotal: total,
    docsDone: recv,
    docsPending: pending,
    docsRejected: rejected,
    loan: c.loanAmount ?? 0,
    commission: deal.upfrontYou, trailMonth: deal.trailMonthYou, deal,
    ff: (c.ffDraft && typeof c.ffDraft === "object" ? c.ffDraft : {}) as Record<string, unknown>,
  };
}

/** mmcrm_guess_case_by_email: exact match on case emails, then substring; newest 200 cases. */
export async function guessCaseByEmail(email: string): Promise<number> {
  const e = email.trim().toLowerCase();
  if (!e) return 0;
  const exact = await prisma.case.findFirst({
    where: {
      OR: [
        { app1Email: { equals: e, mode: "insensitive" } },
        { app2Email: { equals: e, mode: "insensitive" } },
        { app3Email: { equals: e, mode: "insensitive" } },
        { app4Email: { equals: e, mode: "insensitive" } },
        { legacyEmail: { equals: e, mode: "insensitive" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (exact) return exact.id;
  const idx = await indexGet("contact", e);
  if (idx) return idx;
  const recent = await prisma.case.findMany({
    where: { OR: [{ app1Email: { contains: "@" } }, { app2Email: { contains: "@" } }, { app3Email: { contains: "@" } }, { app4Email: { contains: "@" } }, { legacyEmail: { contains: "@" } }] },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, app1Email: true, app2Email: true, app3Email: true, app4Email: true, legacyEmail: true },
  });
  for (const r of recent) if (caseEmails(r).some((x) => x.includes(e))) return r.id;
  return 0;
}

export async function caseOptions() {
  const rows = await prisma.case.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    select: { id: true, title: true, app1Name: true, app2Name: true, app3Name: true, app4Name: true, status: true },
  });
  return rows.map((r) => ({ id: r.id, label: `${caseName(r)} (#${r.id})`, status: r.status }));
}

/** Sydney-local formatting helpers. */
const TZ = "Australia/Sydney";
export function fmtDate(d: Date | string | number | null | undefined, opts: Intl.DateTimeFormatOptions) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "";
  return new Intl.DateTimeFormat("en-AU", { timeZone: TZ, ...opts }).format(dt);
}
/** "Y-m-d H:i" in Sydney time. */
export function ymdHi(d: Date | string | number | null | undefined) {
  if (!d) return "";
  const dt = new Date(d);
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(dt)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day} ${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}
/** Sydney wall-clock parts for a Date. */
export function sydParts(d = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hour12: false,
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value]),
  );
  return { y: +p.year, m: +p.month, d: +p.day, h: p.hour === "24" ? 0 : +p.hour, min: +p.minute, wd: p.weekday };
}
/** Convert a Sydney-local "YYYY-MM-DDTHH:mm" (datetime-local) to a Date. */
export function fromSydLocal(v: string): Date | null {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0));
  // offset = local(guess) - guess
  const p = sydParts(new Date(guess));
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min);
  const off = asUtc - guess;
  return new Date(guess - off);
}
/** Date → Sydney "YYYY-MM-DDTHH:mm" for datetime-local inputs. */
export function toSydLocal(d: Date | null | undefined) {
  if (!d) return "";
  return ymdHi(d).replace(" ", "T");
}
