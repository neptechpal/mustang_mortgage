// Server-side data for /admin/seo: review rows, the latest pseo-audit report, data dates and the sign-off log.
import fs from "node:fs/promises";
import path from "node:path";
import type { SeoReview } from "@prisma/client";
import { prisma } from "@/lib/db";
import { RULES } from "@/modules/calc/rules";
import type { AuState } from "@/modules/calc/types";
import { formatDate } from "@/modules/web/format";
import { ensureReviewRows } from "@/modules/web/review";
import { VISA_POLICIES } from "@/modules/seo-data/visas";
import { suburbDataset } from "@/modules/seo-data/suburbs";
import { PUBLISHED_SUBURBS, suburbKey, suburbReviewRows } from "@/modules/web/suburbs/model";
import { KIND_ORDER } from "./shared";

/* ------------------------------------------------------------------ audit report (scripts/pseo-audit.ts) */

export type AuditPage = {
  kind: string;
  key: string;
  path: string;
  status: number;
  title: string | null;
  words: number;
  minWords: number | null;
  uniqueness: { min: number; median: number; nearest: string | null } | null;
  completeness: { score: number; of: number } | null;
  rules: { stale: string[]; unverified: number; fresh: boolean };
  disclaimer: boolean;
  licence: boolean;
  canonicalOk: boolean;
  indexable: boolean;
  inSitemap: boolean;
  hard: string[];
  fails: string[];
  warns: string[];
};
export type AuditType = { pages: number; minUniq: number | null; medianUniq: number | null; medianOfMins: number | null; minWords: number; medianWords: number; maxWords: number; hard: number; fails: number };
export type AuditReport = {
  generatedAt: string;
  base: string;
  thresholds: { minWords: Record<string, number>; uniqWarn: number; uniqHard: number; uniqMedian: number; noteMinWords: number };
  types: Record<string, AuditType>;
  totals: { pages: number; hardStops: number; gateFailures: number; warnings: number; skippedNotBuilt: number };
  pages: AuditPage[];
};

export const AUDIT_REPORT_PATH = path.join(process.cwd(), "scripts", "out", "pseo-audit.json");

export async function loadAuditReport(): Promise<AuditReport | null> {
  try {
    return JSON.parse(await fs.readFile(AUDIT_REPORT_PATH, "utf8")) as AuditReport;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ rows */

/** All review rows (suburb rows are registered from route data first, so they show before anyone visits a page). */
export async function loadReviewRows(): Promise<SeoReview[]> {
  await ensureReviewRows(suburbReviewRows());
  const rows = await prisma.seoReview.findMany();
  const order = (k: string) => (KIND_ORDER.indexOf(k) < 0 ? 99 : KIND_ORDER.indexOf(k));
  return rows.sort((a, b) => order(a.kind) - order(b.kind) || a.path.localeCompare(b.path));
}

/* ------------------------------------------------------------------ labels and data dates */

const SUBURB_BY_KEY = new Map(PUBLISHED_SUBURBS.map((s) => [suburbKey(s), s]));

function oldestVerifiedAt(root: unknown): string | null {
  let min: string | null = null;
  const seen = new Set<unknown>();
  const walk = (n: unknown) => {
    if (!n || typeof n !== "object" || seen.has(n)) return;
    seen.add(n);
    const r = n as Record<string, unknown>;
    if (typeof r.verifiedAt === "string" && (!min || r.verifiedAt < min)) min = r.verifiedAt;
    for (const v of Object.values(r)) if (v && typeof v === "object") walk(v);
  };
  walk(root);
  return min;
}

export function pageLabel(row: Pick<SeoReview, "key" | "kind" | "path">, audit?: AuditPage) {
  const s = SUBURB_BY_KEY.get(row.key);
  if (s) return `${s.name} ${s.postcode}`;
  const slug = row.key.slice(row.key.indexOf(":") + 1);
  if (row.kind === "visa") return VISA_POLICIES.find((v) => v.slug === slug)?.name ?? slug;
  if (audit?.title) return audit.title.replace(/\s*\|\s*Mustang Mortgage$/, "");
  if (row.kind === "fhb") return `First home buyers ${slug.toUpperCase()}`;
  if (row.kind === "duty") return `Stamp duty ${slug.toUpperCase()}`;
  return row.path || slug;
}

/** What the page's facts were last refreshed or verified against, for the "Data" column. */
export function dataDate(row: Pick<SeoReview, "key" | "kind">): { date: string | null; label: string } {
  const slug = row.key.slice(row.key.indexOf(":") + 1);
  if (row.kind === "suburb") {
    const q = suburbDataset.sources.dcjSales?.quarter;
    return { date: suburbDataset.pulledAt.slice(0, 10), label: `ABS 2021 + DCJ${q ? ` ${q.replace("-", " ")}` : ""}` };
  }
  if (row.kind === "visa") {
    const v = VISA_POLICIES.find((x) => x.slug === slug);
    return { date: v?.verifiedAt ?? null, label: v ? (v.verified ? "Visa rules verified" : "Visa rules (some unverified)") : "—" };
  }
  if (row.kind === "fhb" || row.kind === "duty") {
    const st = slug.toUpperCase() as AuState;
    const r = RULES[st];
    return { date: r ? oldestVerifiedAt(r) : null, label: r ? `${r.revenueOffice} rules ${r.rulesVersion}` : "—" };
  }
  return { date: null, label: "—" };
}

export const fmtDate = (d: string | Date | null | undefined) => (d ? formatDate(typeof d === "string" ? d : d.toISOString()) : "—");

export function suburbFor(key: string) {
  return SUBURB_BY_KEY.get(key) ?? null;
}

/* ------------------------------------------------------------------ sign-off log (Setting "seo.reviewLog") */

export type LogEntry = { at: string; by: string; key: string; action: "approved" | "unapproved" | "saved" | "auto-unapproved"; words: number };
export const LOG_KEY = "seo.reviewLog";
const LOG_MAX = 1000;

export async function readLog(key?: string): Promise<LogEntry[]> {
  try {
    const s = await prisma.setting.findUnique({ where: { key: LOG_KEY } });
    const all = (Array.isArray(s?.value) ? s.value : []) as unknown as LogEntry[];
    return (key ? all.filter((e) => e.key === key) : all).slice(-50).reverse();
  } catch {
    return [];
  }
}

export async function appendLog(e: LogEntry) {
  const s = await prisma.setting.findUnique({ where: { key: LOG_KEY } });
  const all = (Array.isArray(s?.value) ? s.value : []) as unknown as LogEntry[];
  const next = [...all, e].slice(-LOG_MAX);
  await prisma.setting.upsert({ where: { key: LOG_KEY }, create: { key: LOG_KEY, value: next as never }, update: { value: next as never } });
}
