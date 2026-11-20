// Deterministic shortlist engine: evaluates every panel lender/product against the published,
// authorised policy rules and price records. Pure (no DB) — inputs are loaded by service.ts.
// Ranking uses ONLY policy fit, the client's documented objectives (must-have features),
// verified costs and conditions. Broker commission / referral revenue is never an input.
import { list, serviceabilityHash, str, type Facts } from "./facts";
import { monthlyRepayment, type ScenarioCalc } from "./calc";
import { evaluateRule, requiredCategories, type RuleEval, type RuleLike } from "./policy/checks";

export type Tier = "fit" | "conditional" | "verify" | "outside";
export const TIER_LABEL: Record<Tier, string> = { fit: "Potential fit", conditional: "Conditional", verify: "Needs verification", outside: "Outside stated policy" };
export const COST_DISCLOSURE =
  "Costs compare every option on the same loan amount, term and repayment type. 3-year cost = repayments for 36 months + upfront fees + 3 years of ongoing fees − cashback (cashback is netted only when its terms are current). Fees are assumed paid, not capitalised. Unverified or expired pricing is shown but excluded from verified comparisons.";

export type ProductIn = {
  id: number; lenderId: number; name: string; code: string; purposes: string[]; occupancies: string[]; repaymentTypes: string[];
  rateType: string; features: string[]; minLoan: number | null; maxLoan: number | null; active: boolean;
};
export type LenderIn = { id: number; name: string; code: string; onPanel: boolean; products: ProductIn[] };
export type SourceIn = { id: number; title: string; kind: string; status: string; permStore: boolean; permAi: boolean; url: string; fileId: string | null; lenderId: number | null; caseId: number | null; reference: string };
export type RuleIn = RuleLike & {
  sourceId: number; sourceSection: string; conditions: string; exceptions: string; status: string;
  effectiveFrom: Date | null; effectiveTo: Date | null; verifiedAt: Date | null; reviewDue: Date | null;
};
export type PriceIn = {
  id: number; recordKey: string; version: number; lenderId: number; productId: number; occupancy: string; repaymentType: string;
  lvrMin: number; lvrMax: number; ratePct: number; comparisonPct: number | null; upfrontFees: number; annualFee: number; monthlyFee: number;
  cashback: number; cashbackTerms: string; cashbackExpiry: Date | null; pricingType: string; caseId: number | null; sourceId: number;
  sourceSection: string; effectiveFrom: Date | null; expiresAt: Date | null; verifiedAt: Date | null; reviewDue: Date | null; status: string;
};
export type SvcIn = { id: number; lenderId: number; productId: number | null; calculator: string; inputsHash: string; maxBorrowing: number; calculatedAt: Date };

export type RuleResult = RuleEval & { stale?: string; conflict?: boolean; overriddenBy?: number; sourceId: number; caseSpecific: boolean };
export type Pricing = {
  state: "verified" | "verify" | "none"; label: string; recordId?: number; recordKey?: string; version?: number; ratePct?: number; comparisonPct?: number | null;
  upfrontFees?: number; ongoingFeesPerYear?: number; cashback?: number; cashbackCounted?: boolean; monthly?: number; monthlyAfterIo?: number;
  cost3y?: number; verifiedAt?: string | null; sourceId?: number; reasons: string[];
};
export type Serviceability = { state: "current" | "obsolete" | "missing"; recordId?: number; calculator?: string; maxBorrowing: number | null; calculatedAt?: string; shortfall: boolean };
export type Candidate = {
  id: string; lenderId: number; lenderName: string; productId: number; productName: string; tier: Tier; reasons: string[];
  rules: RuleResult[]; missing: string[]; conflicts: string[]; missingEvidence: string[]; stale: string[]; confirmations: string[];
  evidenceNeeded: string[]; conditions: string[]; pricing: Pricing; serviceability: Serviceability; features: { has: string[]; missingMustHave: string[] };
  rank: number; rankReason: string; nextCheck: string;
};
export type EngineResult = {
  panel: { lenderId: number; name: string; products: { id: number; name: string }[] }[];
  candidates: Candidate[];
  required: { category: string; why: string; component?: string }[];
  svcHash: string;
  usedRuleIds: number[];
  usedPriceIds: number[];
};

const TIER_ORDER: Tier[] = ["fit", "conditional", "verify", "outside"];
const SYD_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" });
const iso = (d: Date | null | undefined) => (d ? SYD_DAY.format(d) : null); // YYYY-MM-DD in Sydney

export function ruleFreshness(r: { verifiedAt: Date | null; reviewDue: Date | null; effectiveTo: Date | null }, now: Date): string | undefined {
  if (!r.verifiedAt) return "never verified";
  if (r.effectiveTo && r.effectiveTo < now) return `expired ${iso(r.effectiveTo)}`;
  if (r.reviewDue && r.reviewDue < now) return `review overdue since ${iso(r.reviewDue)}`;
  return undefined;
}

/** Rules usable as evidence: published, effective, from a published source with storage permission. */
export function usableRules(rules: RuleIn[], sources: Map<number, SourceIn>, caseId: number, now: Date) {
  return rules.filter((r) => {
    if (r.status !== "published") return false;
    if (r.caseId !== null && r.caseId !== caseId) return false;
    if (r.effectiveFrom && r.effectiveFrom > now) return false;
    const s = sources.get(r.sourceId);
    return Boolean(s && s.status === "published" && s.permStore);
  });
}

function pickPrice(prices: PriceIn[], sources: Map<number, SourceIn>, p: ProductIn, f: Facts, calc: ScenarioCalc, caseId: number, now: Date): Pricing {
  const occ = str(f, "loan.occupancy");
  const lvr = calc.lvrInclLmiPct ?? calc.lvrPct;
  const reasons: string[] = [];
  const pool = prices.filter((x) => {
    if (x.productId !== p.id || x.status !== "published") return false;
    if (x.caseId !== null && x.caseId !== caseId) return false;
    const s = sources.get(x.sourceId);
    return Boolean(s && s.status === "published" && s.permStore);
  });
  if (!pool.length) return { state: "none", label: "No pricing on file", reasons: ["No published price record for this product"] };
  if (!occ) return { state: "none", label: "Occupancy needed", reasons: ["Occupancy unknown — cannot select a price"] };
  if (lvr === null) return { state: "none", label: "LVR needed", reasons: ["LVR unknown — cannot select an LVR band"] };
  const match = pool.filter((x) => x.occupancy === occ && x.repaymentType === calc.repaymentType && lvr > x.lvrMin && lvr <= x.lvrMax);
  if (!match.length) return { state: "none", label: "No price for this band", reasons: [`No price for ${occ.replace("_", "-")} ${calc.repaymentType} at LVR ${lvr}%`] };
  match.sort((a, b) => (b.caseId !== null ? 1 : 0) - (a.caseId !== null ? 1 : 0) || (b.verifiedAt?.getTime() ?? 0) - (a.verifiedAt?.getTime() ?? 0));
  const x = match[0];
  let state: Pricing["state"] = "verified";
  if (!x.verifiedAt) {
    state = "verify";
    reasons.push("never verified");
  }
  if (x.expiresAt && x.expiresAt < now) {
    state = "verify";
    reasons.push(`pricing expired ${iso(x.expiresAt)}`);
  }
  if (x.reviewDue && x.reviewDue < now) {
    state = "verify";
    reasons.push(`review overdue since ${iso(x.reviewDue)}`);
  }
  let cashbackCounted = x.cashback > 0;
  if (x.cashback > 0 && x.cashbackExpiry && x.cashbackExpiry < now) {
    state = "verify";
    cashbackCounted = false;
    reasons.push(`cashback offer expired ${iso(x.cashbackExpiry)}`);
  }
  const principal = calc.totalLoan ?? calc.loanUsed ?? 0;
  const rep = principal > 0 ? monthlyRepayment(principal, x.ratePct, calc.termYears, calc.repaymentType, calc.ioYears) : null;
  const ongoing = x.annualFee + x.monthlyFee * 12;
  let cost3y: number | undefined;
  if (rep) {
    const ioMonths = calc.repaymentType === "IO" ? Math.min(36, calc.ioYears * 12) : 0;
    cost3y = Math.round(rep.initial * ioMonths + rep.after * (36 - ioMonths) + x.upfrontFees + ongoing * 3 - (cashbackCounted ? x.cashback : 0));
  }
  const label = x.pricingType === "confirmed_quote" ? "Confirmed quote" : x.pricingType === "conditional" ? "Conditional pricing" : "Published pricing";
  return {
    state, label, recordId: x.id, recordKey: x.recordKey, version: x.version, ratePct: x.ratePct, comparisonPct: x.comparisonPct,
    upfrontFees: x.upfrontFees, ongoingFeesPerYear: ongoing, cashback: x.cashback, cashbackCounted, monthly: rep?.initial, monthlyAfterIo: rep?.after,
    cost3y, verifiedAt: iso(x.verifiedAt), sourceId: x.sourceId, reasons,
  };
}

function pickSvc(svc: SvcIn[], lenderId: number, productId: number, hash: string, loanNeeded: number | null): Serviceability {
  const mine = svc.filter((s) => s.lenderId === lenderId && (s.productId === null || s.productId === productId)).sort((a, b) => b.calculatedAt.getTime() - a.calculatedAt.getTime());
  const s = mine[0];
  if (!s) return { state: "missing", maxBorrowing: null, shortfall: false };
  if (s.inputsHash !== hash) return { state: "obsolete", recordId: s.id, calculator: s.calculator, maxBorrowing: null, calculatedAt: iso(s.calculatedAt) ?? undefined, shortfall: false };
  return { state: "current", recordId: s.id, calculator: s.calculator, maxBorrowing: s.maxBorrowing, calculatedAt: iso(s.calculatedAt) ?? undefined, shortfall: loanNeeded !== null && s.maxBorrowing < loanNeeded };
}

export function runEngine(input: {
  facts: Facts; calc: ScenarioCalc; lenders: LenderIn[]; rules: RuleIn[]; prices: PriceIn[]; svc: SvcIn[]; sources: SourceIn[]; caseId: number; now?: Date;
}): EngineResult {
  const now = input.now ?? new Date();
  const { facts: f, calc } = input;
  const sources = new Map(input.sources.map((s) => [s.id, s]));
  const rules = usableRules(input.rules, sources, input.caseId, now);
  const required = requiredCategories(f, calc);
  const svcHash = serviceabilityHash(f);
  const mustHave = list(f, "loan.features") ?? [];
  const occ = str(f, "loan.occupancy");
  const panel = input.lenders.filter((l) => l.onPanel);
  const candidates: Candidate[] = [];
  const usedRules = new Set<number>();
  const usedPrices = new Set<number>();

  for (const l of panel) {
    for (const p of l.products.filter((x) => x.active)) {
      const reasons: string[] = [];
      let outside = false;
      if (calc.purpose && !p.purposes.includes(calc.purpose)) {
        outside = true;
        reasons.push(`Product not offered for ${calc.purpose}`);
      }
      if (occ && !p.occupancies.includes(occ)) {
        outside = true;
        reasons.push(`Product not offered for ${occ.replace("_", "-")}`);
      }
      if (!p.repaymentTypes.includes(calc.repaymentType)) {
        outside = true;
        reasons.push(`${calc.repaymentType} repayments not offered`);
      }
      const loan = calc.totalLoan ?? calc.loanUsed;
      if (loan !== null && p.maxLoan && loan > p.maxLoan) {
        outside = true;
        reasons.push(`Loan $${loan.toLocaleString("en-AU")} above product limit $${p.maxLoan.toLocaleString("en-AU")}`);
      }
      if (loan !== null && p.minLoan && loan < p.minLoan) {
        outside = true;
        reasons.push(`Loan below product minimum $${p.minLoan.toLocaleString("en-AU")}`);
      }

      const applicable = rules.filter((r) => r.lenderId === l.id && (r.productId === null || r.productId === p.id));
      const groupKey = (r: RuleIn) => `${r.check}|${r.check === "income" ? String((r.params as Record<string, unknown>)?.component ?? "") : ""}`;
      const caseKeys = new Map<string, number>();
      for (const r of applicable) if (r.caseId !== null) caseKeys.set(groupKey(r), r.id);

      const results: RuleResult[] = [];
      for (const r of applicable) {
        usedRules.add(r.id);
        const override = r.caseId === null ? caseKeys.get(groupKey(r)) : undefined;
        const stale = ruleFreshness(r, now);
        for (const e of evaluateRule(r, { f, calc, now })) {
          if (override) {
            results.push({ ...e, status: "n/a", reason: `${e.reason} — superseded for this case by BDM confirmation`, overriddenBy: override, sourceId: r.sourceId, caseSpecific: false });
            continue;
          }
          results.push({ ...e, stale: e.status === "n/a" ? undefined : stale, sourceId: r.sourceId, caseSpecific: r.caseId !== null });
        }
      }

      // Conflicts: rules in the same check group + segment giving different definite answers for the same applicant.
      const conflicts: string[] = [];
      const groups = new Map<string, RuleResult[]>();
      for (const x of results) {
        if (x.overriddenBy || !["pass", "fail", "conditional"].includes(x.status)) continue;
        const r = applicable.find((y) => y.id === x.ruleId)!;
        const k = `${groupKey(r)}|${r.segment.trim().toLowerCase()}|${x.applicant ?? ""}`;
        groups.set(k, [...(groups.get(k) ?? []), x]);
      }
      for (const [k, xs] of groups) {
        const ids = new Set(xs.map((x) => x.ruleKey));
        if (ids.size > 1 && new Set(xs.map((x) => x.status)).size > 1) {
          xs.forEach((x) => (x.conflict = true));
          conflicts.push(`${k.split("|")[0]} rules disagree (${xs.map((x) => `R${x.ruleId}: ${x.status}`).join(", ")})`);
        }
      }

      const missingEvidence: string[] = [];
      for (const req of required) {
        const has = applicable.some((r) => r.category === req.category && (req.category !== "income" || (r.params as Record<string, unknown>)?.component === req.component));
        if (!has) missingEvidence.push(`No ${req.category.replace(/_/g, " ")}${req.component ? ` (${req.component})` : ""} policy on file (${req.why})`);
      }

      const live = results.filter((x) => !x.overriddenBy && x.status !== "n/a");
      const stale = live.filter((x) => x.stale).map((x) => `R${x.ruleId} ${x.check}: ${x.stale}`);
      const missing = Array.from(new Set(live.flatMap((x) => x.missing)));
      const confirmations = live.filter((x) => x.requiresConfirmation).map((x) => `${x.applicant ? `Applicant ${x.applicant.slice(1)} ` : ""}${x.component ?? x.check} treatment (R${x.ruleId})`);
      const evidenceNeeded = Array.from(new Set(live.flatMap((x) => (x.evidence ?? []).map((e) => `${x.applicant ? `Applicant ${x.applicant.slice(1)}: ` : ""}${e}`))));
      const conditions = live.filter((x) => x.status === "conditional").map((x) => x.reason);
      const hardFails = live.filter((x) => x.status === "fail" && !x.stale && !x.conflict);
      if (hardFails.length) {
        outside = true;
        reasons.push(...hardFails.map((x) => x.reason));
      }

      const pricing = pickPrice(input.prices, sources, p, f, calc, input.caseId, now);
      if (pricing.recordId) usedPrices.add(pricing.recordId);
      const serviceability = pickSvc(input.svc, l.id, p.id, svcHash, calc.totalLoan ?? calc.loanUsed);
      if (serviceability.shortfall) {
        outside = true;
        reasons.push(`Lender calculator max borrowing $${serviceability.maxBorrowing?.toLocaleString("en-AU")} below the loan required`);
      }

      let tier: Tier;
      if (outside) tier = "outside";
      else if (missing.length || stale.length || conflicts.length || missingEvidence.length || live.some((x) => x.status === "unknown") || live.some((x) => x.status === "fail")) {
        tier = "verify";
        if (missing.length) reasons.push(`Missing facts: ${missing.length}`);
        if (stale.length) reasons.push("Stale policy evidence");
        if (conflicts.length) reasons.push("Conflicting policy evidence");
        if (missingEvidence.length) reasons.push("Policy evidence missing for a required area");
        if (live.some((x) => x.status === "fail" && (x.stale || x.conflict))) reasons.push("A failing rule is stale or conflicted — verify before excluding");
      } else if (conditions.length || confirmations.length) {
        tier = "conditional";
        reasons.push(...conditions);
        if (confirmations.length) reasons.push("Written lender confirmation needed");
      } else {
        tier = "fit";
        reasons.push("Meets every applicable published rule on the facts provided");
      }

      const has = p.features;
      const missingMustHave = mustHave.filter((x) => !has.includes(x));

      let nextCheck = "Prepare recommendation and record rationale";
      if (tier === "outside") nextCheck = "Record exclusion reason";
      else if (missingEvidence.length || conflicts.length) nextCheck = `Confirm policy with ${l.name} BDM (${missingEvidence.length ? "missing evidence" : "conflict"})`;
      else if (stale.length) nextCheck = "Re-verify stale policy rule";
      else if (missing.length) nextCheck = `Collect missing facts (${missing.length})`;
      else if (confirmations.length) nextCheck = `Get written confirmation from ${l.name}`;
      else if (serviceability.state !== "current") nextCheck = serviceability.state === "obsolete" ? "Rerun lender calculator (inputs changed)" : "Run lender calculator";
      else if (pricing.state !== "verified") nextCheck = "Verify pricing";

      candidates.push({
        id: `L${l.id}-P${p.id}`, lenderId: l.id, lenderName: l.name, productId: p.id, productName: p.name, tier, reasons, rules: results,
        missing, conflicts, missingEvidence, stale, confirmations, evidenceNeeded, conditions, pricing, serviceability,
        features: { has, missingMustHave }, rank: 0, rankReason: "", nextCheck,
      });
    }
  }

  candidates.sort((a, b) => {
    const t = TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier);
    if (t) return t;
    const feat = a.features.missingMustHave.length - b.features.missingMustHave.length;
    if (feat) return feat;
    const av = a.pricing.state === "verified" && a.pricing.cost3y !== undefined ? a.pricing.cost3y : Infinity;
    const bv = b.pricing.state === "verified" && b.pricing.cost3y !== undefined ? b.pricing.cost3y : Infinity;
    if (av !== bv) return av - bv;
    const c = a.conditions.length - b.conditions.length;
    if (c) return c;
    return a.lenderName.localeCompare(b.lenderName) || a.productName.localeCompare(b.productName);
  });
  candidates.forEach((c, i) => {
    c.rank = i + 1;
    const bits = [TIER_LABEL[c.tier]];
    bits.push(c.features.missingMustHave.length ? `missing ${c.features.missingMustHave.length} must-have feature(s)` : mustHave.length ? "has all must-have features" : "no must-have features recorded");
    bits.push(c.pricing.state === "verified" && c.pricing.cost3y !== undefined ? `verified 3-yr cost $${c.pricing.cost3y.toLocaleString("en-AU")}` : "no verified price");
    if (c.conditions.length) bits.push(`${c.conditions.length} condition(s)`);
    c.rankReason = bits.join(" · ");
  });

  return {
    panel: panel.map((l) => ({ lenderId: l.id, name: l.name, products: l.products.filter((p) => p.active).map((p) => ({ id: p.id, name: p.name })) })),
    candidates, required, svcHash, usedRuleIds: [...usedRules], usedPriceIds: [...usedPrices],
  };
}
