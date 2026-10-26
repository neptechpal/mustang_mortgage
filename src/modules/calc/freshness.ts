// Data-freshness policy for government rules (FRONTEND.md non-negotiable 4; programmatic-seo.md C4.2 gates).
// Every fact group carries `verifiedAt` (ISO date the value was last checked against the official source).
// A fact is stale when it was checked more than MAX_AGE_DAYS ago. Pages must not present stale or unverified
// numbers as current: show the official link instead, and the pSEO build gate should fail.

export const MAX_AGE_DAYS = 90;

const DAY_MS = 86_400_000;

function toDate(d: string | Date): Date {
  if (d instanceof Date) return d;
  // Treat plain YYYY-MM-DD as a calendar date in UTC so the age doesn't drift with the server timezone.
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00Z` : d);
}

/** Whole days between verifiedAt and `now` (default: today). Negative if verifiedAt is in the future. */
export function ageInDays(verifiedAt: string | Date, now: Date = new Date()): number {
  const v = toDate(verifiedAt);
  if (Number.isNaN(v.getTime())) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - v.getTime()) / DAY_MS);
}

/** True when the fact was verified more than `maxAgeDays` (default 90) days ago, or the date is invalid. */
export function isStale(verifiedAt: string | Date, now: Date = new Date(), maxAgeDays = MAX_AGE_DAYS): boolean {
  return ageInDays(verifiedAt, now) > maxAgeDays;
}

export type FreshnessIssue = { path: string; verifiedAt: string; reason: "stale" | "unverified" | "invalid-date" };

/**
 * Walk any rules object and list every fact group (an object with a `verifiedAt` string) that is stale or
 * explicitly `verified: false`. Use it in a build gate: `if (auditFreshness(ALL_RULES).length) process.exit(1)`.
 */
export function auditFreshness(root: unknown, now: Date = new Date(), maxAgeDays = MAX_AGE_DAYS): FreshnessIssue[] {
  const out: FreshnessIssue[] = [];
  const seen = new Set<unknown>();
  const walk = (node: unknown, path: string) => {
    if (!node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    const rec = node as Record<string, unknown>;
    if (typeof rec.verifiedAt === "string") {
      const age = ageInDays(rec.verifiedAt, now);
      if (!Number.isFinite(age)) out.push({ path, verifiedAt: rec.verifiedAt, reason: "invalid-date" });
      else if (age > maxAgeDays) out.push({ path, verifiedAt: rec.verifiedAt, reason: "stale" });
      if (rec.verified === false) out.push({ path, verifiedAt: rec.verifiedAt, reason: "unverified" });
    }
    for (const [k, v] of Object.entries(rec)) if (v && typeof v === "object") walk(v, path ? `${path}.${k}` : k);
  };
  walk(root, "");
  return out;
}
