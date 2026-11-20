// Lender policy admin: client-safe constants, date helpers (Australia/Sydney) and record flags.
// No server imports here — used by both server pages and client form components.
import type { Tone } from "@/components/admin/ui";

export const BASE = "/admin/lender-policy";
export const TZ = "Australia/Sydney";
export const REVIEW_WINDOW_DAYS = 14;

export type RecStatus = "draft" | "published" | "superseded" | "withdrawn";
export const STATUSES: [RecStatus, string][] = [
  ["draft", "Draft"],
  ["published", "Published"],
  ["superseded", "Superseded"],
  ["withdrawn", "Withdrawn"],
];
export const STATUS_TONE: Record<string, Tone> = { draft: "info", published: "success", superseded: "neutral", withdrawn: "danger" };
export const statusLabel = (s: string) => STATUSES.find(([k]) => k === s)?.[1] ?? s;

export const SOURCE_KINDS: [string, string][] = [
  ["lender_guide", "Lender credit / policy guide"],
  ["rate_sheet", "Rate sheet"],
  ["aggregator", "Aggregator data"],
  ["public_page", "Public product page"],
  ["bdm_confirmation", "BDM written confirmation"],
  ["other", "Other"],
];
export const sourceKindLabel = (k: string) => SOURCE_KINDS.find(([v]) => v === k)?.[1] ?? k;

export const PURPOSES: [string, string][] = [["purchase", "Purchase"], ["refinance", "Refinance"]];
export const OCCUPANCIES: [string, string][] = [["owner_occupied", "Owner-occupied"], ["investment", "Investment"]];
export const REPAYMENT_TYPES: [string, string][] = [["PI", "Principal & interest"], ["IO", "Interest only"]];
export const RATE_TYPES: [string, string][] = [["variable", "Variable"], ["fixed", "Fixed"], ["split", "Split"]];
export const PRICING_TYPES: [string, string][] = [
  ["published", "Published rate"],
  ["conditional", "Conditional / discretionary"],
  ["confirmed_quote", "Confirmed quote (one case)"],
];
export const label = (opts: [string, string][], v: string) => opts.find(([k]) => k === v)?.[1] ?? v;
export const shortOcc = (v: string) => (v === "investment" ? "Investment" : v === "owner_occupied" ? "Owner-occ." : v);

/* ------------------------------------------------------------------ dates */

function tzOffsetMs(at: Date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  );
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(at.getTime() / 1000) * 1000;
}

/** Date → "YYYY-MM-DD" as seen in Sydney (for <input type="date">). */
export function toDateInput(d?: Date | string | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
}

/** "YYYY-MM-DD" → Date at 00:00 Sydney time. Null when blank or not a real date. */
export function fromDateInput(s: string | null | undefined): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const utc = Date.UTC(y, m - 1, d);
  const out = new Date(utc - tzOffsetMs(new Date(utc)));
  return toDateInput(out) === s ? out : null;
}

export function addDaysSydney(d: Date, days: number): Date {
  const [y, m, dd] = toDateInput(d).split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, dd + days));
  return fromDateInput(t.toISOString().slice(0, 10))!;
}

export const startOfTodaySydney = (now = new Date()) => fromDateInput(toDateInput(now))!;

export function fmtDate(d?: Date | string | null) {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-AU", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
}
export function fmtDateTime(d?: Date | string | null) {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-AU", { timeZone: TZ, day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(d));
}

export const money = (n: number | null | undefined) =>
  n === null || n === undefined ? "" : new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: n % 1 ? 2 : 0 }).format(n);
export const pct = (n: number | null | undefined, dp = 2) => (n === null || n === undefined ? "" : `${n.toFixed(dp)}%`);

/* ------------------------------------------------------------------ flags */

export type Flag = { key: string; label: string; tone: Tone; due?: Date | null };

export type FlagInput = {
  status: string;
  verifiedAt: Date | null;
  reviewDue: Date | null;
  effectiveTo?: Date | null;
  expiresAt?: Date | null;
  cashback?: number;
  cashbackExpiry?: Date | null;
  sourceStatus?: string | null;
  sourcePermStore?: boolean | null;
};

/** Everything about a rule / price version that needs broker or admin attention. */
export function recordFlags(r: FlagInput, now = new Date()): Flag[] {
  const out: Flag[] = [];
  const today = startOfTodaySydney(now);
  const soon = addDaysSydney(today, REVIEW_WINDOW_DAYS);
  if (r.status !== "draft" && r.status !== "published") return out;
  if (r.status === "draft") out.push({ key: "draft", label: "Draft awaiting publish", tone: "info" });
  if (!r.verifiedAt) out.push({ key: "unverified", label: "Never verified", tone: "warning" });
  if (r.reviewDue && r.reviewDue < now) out.push({ key: "review_overdue", label: `Review overdue (${fmtDate(r.reviewDue)})`, tone: "danger", due: r.reviewDue });
  else if (r.reviewDue && r.reviewDue <= soon) out.push({ key: "review_soon", label: `Review due ${fmtDate(r.reviewDue)}`, tone: "warning", due: r.reviewDue });
  if (r.effectiveTo && r.effectiveTo < today) out.push({ key: "ended", label: `Effective period ended ${fmtDate(r.effectiveTo)}`, tone: "danger", due: r.effectiveTo });
  if (r.expiresAt && r.expiresAt < now) out.push({ key: "expired", label: `Pricing expired ${fmtDate(r.expiresAt)}`, tone: "danger", due: r.expiresAt });
  if ((r.cashback ?? 0) > 0 && r.cashbackExpiry && r.cashbackExpiry < now) out.push({ key: "cashback_expired", label: `Cashback expired ${fmtDate(r.cashbackExpiry)}`, tone: "warning", due: r.cashbackExpiry });
  if (r.status === "published" && r.sourceStatus !== undefined && r.sourceStatus !== "published")
    out.push({ key: "source_unpublished", label: `Source ${r.sourceStatus ? statusLabel(r.sourceStatus).toLowerCase() : "missing"} — not used`, tone: "danger" });
  else if (r.status === "published" && r.sourcePermStore === false) out.push({ key: "source_perm", label: "Source storage permission missing", tone: "danger" });
  return out;
}

/** Pricing list badge: "Verify pricing" when expired / cashback expired / review due / never verified. */
export function priceVerifyState(p: { verifiedAt: Date | null; reviewDue: Date | null; expiresAt: Date | null; cashback: number; cashbackExpiry: Date | null }, now = new Date()) {
  const reasons: string[] = [];
  if (!p.verifiedAt) reasons.push("never verified");
  if (p.expiresAt && p.expiresAt < now) reasons.push("expired");
  if (p.cashback > 0 && p.cashbackExpiry && p.cashbackExpiry < now) reasons.push("cashback expired");
  if (p.reviewDue && p.reviewDue < now) reasons.push("review due");
  return reasons.length ? { ok: false as const, label: "Verify pricing", reasons } : { ok: true as const, label: `Verified ${fmtDate(p.verifiedAt)}`, reasons };
}

export function withQuery(path: string, q: Record<string, string | number | undefined | null>) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  const s = u.toString();
  return s ? `${path}${path.includes("?") ? "&" : "?"}${s}` : path;
}
