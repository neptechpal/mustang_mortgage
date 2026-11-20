// Lender policy admin: read-side queries (server only).
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { CATEGORIES, CHECKS } from "./checks";
import { REVIEW_WINDOW_DAYS, addDaysSydney, recordFlags, startOfTodaySydney, type Flag } from "./meta";

export type LenderLite = { id: number; name: string; code: string; onPanel: boolean };
export type ProductLite = { id: number; lenderId: number; name: string; code: string; active: boolean };
export type SourceLite = { id: number; lenderId: number | null; title: string; reference: string; kind: string; status: string; permStore: boolean; caseId: number | null };

export async function loadLookups() {
  const [lenders, products, sources] = await Promise.all([
    prisma.scnLender.findMany({ orderBy: [{ sort: "asc" }, { name: "asc" }], select: { id: true, name: true, code: true, onPanel: true } }),
    prisma.scnProduct.findMany({ orderBy: [{ lenderId: "asc" }, { name: "asc" }], select: { id: true, lenderId: true, name: true, code: true, active: true } }),
    prisma.scnSource.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], select: { id: true, lenderId: true, title: true, reference: true, kind: true, status: true, permStore: true, caseId: true } }),
  ]);
  return {
    lenders: lenders as LenderLite[],
    products: products as ProductLite[],
    sources: sources as SourceLite[],
    lenderById: new Map(lenders.map((l) => [l.id, l])),
    productById: new Map(products.map((p) => [p.id, p])),
    sourceById: new Map(sources.map((s) => [s.id, s])),
  };
}
export type Lookups = Awaited<ReturnType<typeof loadLookups>>;

/** CHECKS as plain serialisable data for the client rule editor. */
export function checkCatalogue() {
  return Object.entries(CHECKS).map(([key, c]) => ({ key, label: c.label, category: c.category, help: c.help, params: c.params }));
}
export type CheckDef = ReturnType<typeof checkCatalogue>[number];

export const categoryLabel = (c: string) => CATEGORIES.find(([k]) => k === c)?.[1] ?? c;

/* ----------------------------------------------------------------- lists */

export type RuleFilters = { lender?: string; category?: string; status?: string; due?: string; q?: string };

export async function listRules(f: RuleFilters) {
  const now = new Date();
  const soon = addDaysSydney(startOfTodaySydney(now), REVIEW_WINDOW_DAYS);
  const where: Prisma.ScnPolicyRuleWhereInput = {};
  if (f.lender && Number(f.lender)) where.lenderId = Number(f.lender);
  if (f.category) where.category = f.category;
  const st = f.status || "current";
  if (st === "current") where.status = { in: ["draft", "published"] };
  else if (st !== "all") where.status = st;
  if (f.due === "1") where.OR = [{ reviewDue: { lte: soon } }, { verifiedAt: null }, { effectiveTo: { lt: startOfTodaySydney(now) } }];
  if (f.q) where.AND = [{ OR: [{ statement: { contains: f.q, mode: "insensitive" } }, { segment: { contains: f.q, mode: "insensitive" } }, { ruleKey: { contains: f.q } }] }];
  return prisma.scnPolicyRule.findMany({ where, orderBy: [{ lenderId: "asc" }, { category: "asc" }, { check: "asc" }, { segment: "asc" }, { version: "desc" }], take: 500 });
}

export type PriceFilters = { lender?: string; status?: string; verify?: string };

export async function listPrices(f: PriceFilters) {
  const where: Prisma.ScnPriceRecordWhereInput = {};
  if (f.lender && Number(f.lender)) where.lenderId = Number(f.lender);
  const st = f.status || "current";
  if (st === "current") where.status = { in: ["draft", "published"] };
  else if (st !== "all") where.status = st;
  return prisma.scnPriceRecord.findMany({ where, orderBy: [{ lenderId: "asc" }, { productId: "asc" }, { occupancy: "asc" }, { repaymentType: "asc" }, { lvrMin: "asc" }, { version: "desc" }], take: 500 });
}

/** Published rule/price counts that rely on a source (these stop being used if it is withdrawn/superseded). */
export async function sourceUsage(sourceId: number) {
  const [rules, prices, drafts] = await Promise.all([
    prisma.scnPolicyRule.count({ where: { sourceId, status: "published" } }),
    prisma.scnPriceRecord.count({ where: { sourceId, status: "published" } }),
    Promise.all([prisma.scnPolicyRule.count({ where: { sourceId, status: "draft" } }), prisma.scnPriceRecord.count({ where: { sourceId, status: "draft" } })]).then(([a, b]) => a + b),
  ]);
  return { rules, prices, drafts };
}

/* ---------------------------------------------------------- review queue */

export type QueueItem = {
  kind: "rule" | "price" | "source";
  id: number;
  href: string;
  title: string;
  subtitle: string;
  lenderId: number | null;
  status: string;
  flags: Flag[];
  sortDue: number;
  severity: number;
};

export async function buildReviewQueue(): Promise<QueueItem[]> {
  const now = new Date();
  const [rules, prices, sources, lk] = await Promise.all([
    prisma.scnPolicyRule.findMany({ where: { status: { in: ["draft", "published"] } } }),
    prisma.scnPriceRecord.findMany({ where: { status: { in: ["draft", "published"] } } }),
    prisma.scnSource.findMany({ where: { status: { in: ["draft", "published"] } } }),
    loadLookups(),
  ]);
  const out: QueueItem[] = [];
  const sev = (fl: Flag[]) => (fl.some((f) => f.tone === "danger") ? 0 : fl.some((f) => f.tone === "warning") ? 1 : 2);
  const dueOf = (fl: Flag[]) => Math.min(...fl.map((f) => f.due?.getTime() ?? Number.MAX_SAFE_INTEGER));
  for (const r of rules) {
    const src = lk.sourceById.get(r.sourceId);
    const flags = recordFlags({ ...r, sourceStatus: src?.status ?? null, sourcePermStore: src?.permStore ?? null }, now);
    if (!flags.length) continue;
    const prod = r.productId ? lk.productById.get(r.productId)?.name : null;
    out.push({
      kind: "rule", id: r.id, href: `/admin/lender-policy/rules/${r.id}`, status: r.status, lenderId: r.lenderId,
      title: r.statement, subtitle: `${CHECKS[r.check]?.label ?? r.check} · ${r.segment}${prod ? ` · ${prod}` : ""} · ${r.ruleKey} v${r.version}`,
      flags, severity: sev(flags), sortDue: dueOf(flags),
    });
  }
  for (const p of prices) {
    const src = lk.sourceById.get(p.sourceId);
    const flags = recordFlags({ ...p, sourceStatus: src?.status ?? null, sourcePermStore: src?.permStore ?? null }, now);
    if (!flags.length) continue;
    const prod = lk.productById.get(p.productId);
    out.push({
      kind: "price", id: p.id, href: `/admin/lender-policy/pricing/${p.id}`, status: p.status, lenderId: p.lenderId,
      title: `${prod?.name ?? `Product #${p.productId}`} — ${p.ratePct.toFixed(2)}%`,
      subtitle: `${p.occupancy === "investment" ? "Investment" : "Owner-occupied"} · ${p.repaymentType} · LVR ${p.lvrMin}–${p.lvrMax}% · ${p.recordKey} v${p.version}`,
      flags, severity: sev(flags), sortDue: dueOf(flags),
    });
  }
  for (const s of sources) {
    const flags: Flag[] = [];
    if (s.status === "draft") flags.push({ key: "draft", label: "Draft awaiting publish", tone: "info" });
    if (!s.permStore) flags.push({ key: "perm_store", label: "Storage permission not confirmed", tone: s.status === "published" ? "danger" : "warning" });
    if (!s.permAi) flags.push({ key: "perm_ai", label: "AI transmission permission not confirmed", tone: "warning" });
    if (!flags.length) continue;
    out.push({
      kind: "source", id: s.id, href: `/admin/lender-policy/sources/${s.id}`, status: s.status, lenderId: s.lenderId,
      title: s.title, subtitle: [s.reference, s.lenderId ? lk.lenderById.get(s.lenderId)?.name : "Panel-wide"].filter(Boolean).join(" · "),
      flags, severity: sev(flags), sortDue: Number.MAX_SAFE_INTEGER,
    });
  }
  return out.sort((a, b) => a.severity - b.severity || a.sortDue - b.sortDue || a.kind.localeCompare(b.kind) || a.id - b.id);
}
