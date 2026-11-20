// Acceptance tests (handoff §8) against the pure engine with SYNTHETIC lenders and policy.
// Run: npx tsx --test src/modules/scenario/__tests__/*.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyEdits, serviceabilityHash, type Facts, type FactInput } from "../facts";
import { calcScenario } from "../calc";
import { runEngine, type LenderIn, type PriceIn, type RuleIn, type SourceIn, type SvcIn } from "../engine";
import { planTasks } from "../tasks";
import { buildEvidence, minimalFacts, numbersSupported, redact, validateAnswer, validateAssessment, type AssessmentOutT } from "../ai-core";

const NOW = new Date("2026-11-20T00:00:00Z");
const D = (s: string) => new Date(`${s}T00:00:00Z`);

const product = (id: number, lenderId: number, extra: Partial<LenderIn["products"][number]> = {}) => ({
  id, lenderId, name: `Product ${id}`, code: `P${id}`, purposes: ["purchase", "refinance"], occupancies: ["owner_occupied", "investment"],
  repaymentTypes: ["PI", "IO"], rateType: "variable", features: ["offset", "redraw"], minLoan: null, maxLoan: 2_000_000, active: true, ...extra,
});
const LENDERS: LenderIn[] = [
  { id: 1, name: "Demo Lender A", code: "A", onPanel: true, products: [product(11, 1)] },
  { id: 2, name: "Demo Lender B", code: "B", onPanel: true, products: [product(21, 2, { features: ["redraw"] })] },
];
const SOURCES: SourceIn[] = [
  { id: 1, title: "Lender A guide (synthetic)", kind: "lender_guide", status: "published", permStore: true, permAi: true, url: "", fileId: null, lenderId: 1, caseId: null, reference: "v1" },
  { id: 2, title: "Lender B guide (synthetic)", kind: "lender_guide", status: "published", permStore: true, permAi: false, url: "", fileId: null, lenderId: 2, caseId: null, reference: "v1" },
];
let rid = 100;
const rule = (lenderId: number, check: string, category: string, params: Record<string, unknown>, extra: Partial<RuleIn> = {}): RuleIn => ({
  id: ++rid, ruleKey: `k${rid}`, version: 1, lenderId, productId: null, category, check, params, statement: `${check} rule`, caseId: null, segment: "all",
  sourceId: lenderId, sourceSection: "s1", conditions: "", exceptions: "", status: "published", effectiveFrom: D("2026-01-01"), effectiveTo: null,
  verifiedAt: D("2026-11-01"), reviewDue: D("2027-02-01"), ...extra,
});
const baseRules = (): RuleIn[] => [
  rule(1, "max_lvr", "max_lvr", { maxLvrPct: 95, includesLmi: false, occupancy: ["owner_occupied"], purpose: [], residency: [], propertyTypes: [] }),
  rule(1, "max_lvr", "max_lvr", { maxLvrPct: 80, includesLmi: false, occupancy: [], purpose: [], residency: ["temporary_visa"], propertyTypes: [] }, { segment: "temporary visa" }),
  rule(1, "residency", "visa_residency", { accepted: ["citizen", "permanent_resident", "nz_citizen"], conditional: ["temporary_visa"], subclassesAllowed: ["482", "186", "491"], subclassesExcluded: [], minVisaMonths: 12 }),
  rule(1, "combination", "borrower_combination", { tempWithResident: "accept", allTemp: "conditional", residentIncomeOnly: false }),
  rule(1, "employment", "employment", { employmentTypes: ["casual", "payg_part_time", "payg_full_time"], minTenureMonths: 6, minIndustryMonths: 12, probation: "conditional", returnFromLeave: "conditional", minPayslips: 2 }),
  rule(1, "income", "income", { component: "penalties", employmentTypes: [], treatment: "accept", minHistoryMonths: 6, requiresConfirmation: true }),
  rule(1, "income", "income", { component: "director", employmentTypes: [], treatment: "conditional", minHistoryMonths: 24, requiresConfirmation: true }),
  rule(1, "genuine_savings", "genuine_savings", { appliesAboveLvrPct: 85, minPct: 5, minHeldMonths: 3, giftAccepted: true, giftCountsAsGenuine: false }),
  rule(1, "scheme", "scheme", { schemes: ["fhbg"] }),
  rule(2, "max_lvr", "max_lvr", { maxLvrPct: 90, includesLmi: false, occupancy: [], purpose: [], residency: [], propertyTypes: [] }),
  rule(2, "residency", "visa_residency", { accepted: ["citizen", "permanent_resident"], conditional: [], subclassesAllowed: [], subclassesExcluded: [] }),
];
const price = (id: number, lenderId: number, productId: number, extra: Partial<PriceIn> = {}): PriceIn => ({
  id, recordKey: `pk${id}`, version: 1, lenderId, productId, occupancy: "owner_occupied", repaymentType: "PI", lvrMin: 0, lvrMax: 95, ratePct: 6.09,
  comparisonPct: 6.2, upfrontFees: 0, annualFee: 395, monthlyFee: 0, cashback: 0, cashbackTerms: "", cashbackExpiry: null, pricingType: "published",
  caseId: null, sourceId: lenderId, sourceSection: "rates", effectiveFrom: D("2026-11-01"), expiresAt: null, verifiedAt: D("2026-11-15"), reviewDue: D("2026-12-15"),
  status: "published", ...extra,
});

function facts(v: Record<string, unknown>, verified = true): Facts {
  const edits: Record<string, FactInput> = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, { v: x, ok: verified }]));
  const r = applyEdits({}, edits);
  assert.deepEqual(r.errors, []);
  return r.facts;
}
const run = (f: Facts, opts: { rules?: RuleIn[]; prices?: PriceIn[]; svc?: SvcIn[]; lenders?: LenderIn[] } = {}) => {
  const calc = calcScenario(f, NOW);
  const engine = runEngine({ facts: f, calc, lenders: opts.lenders ?? LENDERS, rules: opts.rules ?? baseRules(), prices: opts.prices ?? [], svc: opts.svc ?? [], sources: SOURCES, caseId: 1, now: NOW });
  return { calc, engine };
};
const purchase = {
  "loan.purpose": "purchase", "loan.occupancy": "owner_occupied", "loan.termYears": 30, "loan.repayment": "PI", "prop.state": "NSW", "prop.type": "house",
  "prop.price": 800_000, "prop.firstHome": true, "con.legal": 2000,
};

test("1. joint PR + temporary visa: each borrower and the combination are checked; missing subclass/expiry requested with dated sources", () => {
  const f = facts({ ...purchase, "app.count": 2, "loan.amount": 600_000, "con.savings": 230_000, "a1.residency": "permanent_resident", "a2.residency": "temporary_visa", "a1.employment": "payg_full_time", "a2.employment": "payg_full_time" });
  const rules = baseRules();
  const { engine } = run(f, { rules });
  const a = engine.candidates.find((c) => c.lenderId === 1)!;
  const residency = a.rules.filter((r) => r.check === "residency");
  assert.equal(residency.length, 2, "evaluated per applicant");
  assert.equal(residency.find((r) => r.applicant === "a1")!.status, "pass");
  assert.equal(residency.find((r) => r.applicant === "a2")!.status, "unknown");
  assert.ok(a.missing.includes("a2.visaSubclass"));
  assert.ok(a.missing.includes("a2.visaExpiry"));
  assert.ok(a.rules.some((r) => r.check === "combination" && r.status === "pass"));
  assert.equal(a.tier, "verify");
  // temporary-visa max LVR rule applies (75% ≤ 80%)
  assert.ok(a.rules.some((r) => r.check === "max_lvr" && r.reason.includes("vs max 80%") && r.status === "pass"));
  const b = engine.candidates.find((c) => c.lenderId === 2)!;
  assert.equal(b.tier, "outside", "Lender B does not accept temporary visa holders");
  const tasks = planTasks(f, calcScenario(f, NOW), engine, NOW);
  assert.ok(tasks.some((t) => t.key === "visa:a2"));
  const ev = buildEvidence(engine, rules, [], SOURCES, calcScenario(f, NOW));
  assert.ok(ev.some((e) => e.id.startsWith("R") && e.text.includes("verifiedAt")), "evidence carries verified dates");
  assert.ok(!ev.some((e) => e.lenderId === 2), "source without AI permission is never transmitted");
});

test("2. recent casual / back from parental leave with one payslip: tenure, income and evidence checks + follow-up tasks, no assumed income", () => {
  const f = facts({ ...purchase, "loan.amount": 640_000, "con.savings": 180_000, "a1.residency": "citizen", "a1.employment": "casual", "a1.startDate": "2026-08-01", "a1.priorMonths": 3, "a1.payslips": 1, "a1.leave": "parental_returned", "a1.returnDate": "2026-09-15" });
  const { calc, engine } = run(f);
  const a = engine.candidates.find((c) => c.lenderId === 1)!;
  const emp = a.rules.find((r) => r.check === "employment")!;
  assert.equal(emp.status, "fail", "3 months in job + 3 prior < 12 industry months");
  assert.match(emp.reason, /payslips: 1 of 2/);
  assert.ok(a.evidenceNeeded.some((e) => e.includes("employment letter")));
  const tasks = planTasks(f, calc, engine, NOW);
  assert.ok(tasks.some((t) => t.key === "payslips:a1"));
  assert.ok(tasks.some((t) => t.key === "emp_letter:a1"));
  const apps = minimalFacts(f, NOW).applicants as { incomes: Record<string, unknown> }[];
  assert.equal(Object.keys(apps[0].incomes).length, 0, "no income invented");
});

test("3. director wages + weekend penalty rates: each component evaluated, written confirmation flagged", () => {
  const f = facts({ ...purchase, "loan.amount": 600_000, "con.savings": 230_000, "a1.residency": "citizen", "a1.employment": "director", "a1.startDate": "2020-01-01",
    "a1.inc.director": { amount: 9000, freq: "monthly", basis: "gross", months: 30 }, "a1.inc.penalties": { amount: 400, freq: "weekly", basis: "gross", months: 4 } });
  const { engine } = run(f);
  const a = engine.candidates.find((c) => c.lenderId === 1)!;
  const director = a.rules.find((r) => r.component === "director")!;
  const pen = a.rules.find((r) => r.component === "penalties")!;
  assert.equal(director.status, "conditional");
  assert.equal(pen.status, "conditional", "4 months evidence < 6 required");
  assert.ok(a.confirmations.length >= 2, "written lender confirmation needed for both");
  const b = engine.candidates.find((c) => c.lenderId === 2)!;
  assert.ok(b.missingEvidence.some((m) => m.includes("income (director)")), "lender B has no director-income policy → verification");
  assert.equal(b.tier, "verify");
});

test("4. 5% deposit with gifted funds: funding gap, genuine savings, scheme eligibility and lender participation checked separately", () => {
  const f = facts({ ...purchase, "loan.amount": 760_000, "con.savings": 25_000, "con.savingsHeldMonths": 6, "con.gift": 10_000, "con.giftFrom": "parent", "con.scheme": "fhbg", "a1.residency": "citizen", "a1.employment": "payg_full_time", "a1.startDate": "2022-01-01", "a1.payslips": 2 });
  const { calc, engine } = run(f);
  assert.equal(calc.lvrPct, 95);
  assert.ok(calc.fundsRequired! > 800_000);
  assert.ok(calc.fundingGap !== null && calc.fundingGap > 0, "duty + costs exceed contributions at 95% → shortfall shown");
  const a = engine.candidates.find((c) => c.lenderId === 1)!;
  const gs = a.rules.filter((r) => r.check === "genuine_savings");
  assert.ok(gs.some((r) => r.reason.includes("Gift")), "gift handled");
  assert.ok(gs.some((r) => /genuine savings 3\.13% < 5%/.test(r.reason)), "genuine savings excludes the gift");
  assert.ok(a.rules.some((r) => r.check === "scheme" && r.status === "pass" && r.reason.includes("eligibility")), "participation separate from eligibility");
  const b = engine.candidates.find((c) => c.lenderId === 2)!;
  assert.equal(b.tier, "outside", "95% > lender B max 90%");
});

test("5. expired cashback / conflicting policies: verification flagged, stale terms excluded from verified comparison", () => {
  const f = facts({ ...purchase, "loan.amount": 600_000, "con.savings": 230_000, "a1.residency": "citizen", "a1.employment": "payg_full_time", "a1.startDate": "2020-01-01", "a1.payslips": 2 });
  const prices = [price(1, 1, 11, { cashback: 3000, cashbackExpiry: D("2026-11-01") }), price(2, 2, 21)];
  const conflicting = [...baseRules(), rule(1, "max_lvr", "max_lvr", { maxLvrPct: 70, includesLmi: false, occupancy: ["owner_occupied"], purpose: [], residency: [], propertyTypes: [] })];
  const { engine } = run(f, { prices, rules: conflicting });
  const a = engine.candidates.find((c) => c.lenderId === 1)!;
  assert.equal(a.pricing.state, "verify");
  assert.equal(a.pricing.cashbackCounted, false);
  assert.ok(a.conflicts.length > 0, "two max-LVR rules in the same segment disagree");
  assert.equal(a.tier, "verify");
  const b = engine.candidates.find((c) => c.lenderId === 2)!;
  assert.equal(b.pricing.state, "verified");
  assert.ok(b.rankReason.includes("verified 3-yr cost"));
  assert.ok(a.rankReason.includes("no verified price"));
});

test("6. no calculator result, then income changes: prompt for a run and suppress the obsolete maximum", () => {
  const v = { ...purchase, "loan.amount": 600_000, "con.savings": 230_000, "a1.residency": "citizen", "a1.employment": "payg_full_time", "a1.startDate": "2020-01-01", "a1.payslips": 2, "a1.inc.base": { amount: 120000, freq: "annual", basis: "gross", months: 12 } };
  const f1 = facts(v);
  const r1 = run(f1);
  assert.equal(r1.engine.candidates[0].serviceability.state, "missing");
  const svc: SvcIn[] = [{ id: 1, lenderId: 1, productId: null, calculator: "Lender A calc", inputsHash: serviceabilityHash(f1), maxBorrowing: 700_000, calculatedAt: NOW }];
  const r2 = run(f1, { svc });
  assert.equal(r2.engine.candidates.find((c) => c.lenderId === 1)!.serviceability.maxBorrowing, 700_000);
  const f2 = facts({ ...v, "a1.inc.base": { amount: 100000, freq: "annual", basis: "gross", months: 12 } });
  const s3 = run(f2, { svc }).engine.candidates.find((c) => c.lenderId === 1)!.serviceability;
  assert.equal(s3.state, "obsolete");
  assert.equal(s3.maxBorrowing, null, "obsolete result suppressed");
  const tasks = planTasks(f2, calcScenario(f2, NOW), run(f2, { svc }).engine, NOW);
  assert.ok(tasks.some((t) => t.key === "calc:1" && t.title.startsWith("Rerun")));
});

test("7. unsupported AI claims are withheld; unknown ids rejected; AI cannot upgrade status", () => {
  const f = facts({ ...purchase, "loan.amount": 600_000, "con.savings": 230_000, "a1.residency": "citizen", "a1.employment": "payg_full_time", "a1.startDate": "2020-01-01", "a1.payslips": 2 });
  const rules = baseRules();
  const { calc, engine } = run(f, { rules });
  const evidence = buildEvidence(engine, rules, [], SOURCES, calc);
  const a = engine.candidates.find((c) => c.lenderId === 1)!;
  const rId = evidence.find((e) => e.id.startsWith("R") && e.text.includes("95"))!.id;
  const out: AssessmentOutT = {
    candidates: [
      { candidateId: a.id, status: "fit", summary: "ok", claims: [
        { text: "Maximum LVR is 95% for owner-occupiers.", sourceIds: [rId] },
        { text: "This lender will waive LMI.", sourceIds: [] },
        { text: "Max LVR is 97%.", sourceIds: [rId] },
        { text: "Accepted per another lender.", sourceIds: ["R99999"] },
      ], openQuestions: [], missingFacts: [], assumptions: [], nextActions: [] },
      { candidateId: "L9-P9", status: "fit", summary: "invented", claims: [], openQuestions: [], missingFacts: [], assumptions: [], nextActions: [] },
    ],
    overall: { summary: "", missingFacts: [], assumptions: [], nextActions: [] },
    clientUpdate: "Call me on 0412 345 678",
    bdmEnquiry: { needed: false, lenderCandidateIds: [], draft: "" },
  };
  const v = validateAssessment(out, engine, evidence, JSON.stringify(minimalFacts(f, NOW)));
  assert.equal(v.status, "partial");
  assert.equal(v.ai.candidates[a.id].claims.length, 1);
  assert.equal(v.ai.withheld.length, 4);
  assert.equal(v.ai.clientUpdate, "", "contact details withheld");
  assert.equal(v.ai.candidates[a.id].status, a.tier, "server status kept");
  const ans = validateAnswer({ inScope: true, answer: "Yes, 100% of penalty income counts.", claims: [{ text: "100% counted", sourceIds: [] }], confidence: "high", needsBdmConfirmation: false, bdmQuestion: "" }, evidence, "{}");
  assert.equal(ans.status, "withheld");
  assert.equal(ans.needsBdmConfirmation, true);
});

test("8. reruns produce stable task keys (no duplicate reminders) and redaction strips identifiers", () => {
  const f = facts({ ...purchase, "loan.amount": 600_000, "con.savings": 230_000, "a1.residency": "temporary_visa", "a1.employment": "casual" });
  const t1 = planTasks(f, calcScenario(f, NOW), run(f).engine, NOW).map((t) => t.key);
  const t2 = planTasks(f, calcScenario(f, NOW), run(f).engine, NOW).map((t) => t.key);
  assert.deepEqual(t1, t2);
  assert.equal(new Set(t1).size, t1.length);
  assert.equal(redact("Email jo@x.com or 0412 345 678, lives at 12 Smith Street"), "Email [email] or [number], lives at [address]");
  assert.ok(numbersSupported("LVR 95%", "maxLvrPct 95"));
  assert.ok(!numbersSupported("rate 5.99%", "6.09"));
});

test("AI payload allowlist never includes names, suburb, postcode or exact dates", () => {
  const f = facts({ ...purchase, "prop.suburb": "Parramatta", "prop.postcode": "2150", "a1.residency": "temporary_visa", "a1.visaExpiry": "2028-05-01", "a1.startDate": "2025-01-10", "loan.objectives": "Jane Citizen wants an offset, call 0400 000 000" });
  const s = JSON.stringify(minimalFacts(f, NOW));
  assert.ok(!s.includes("Parramatta") && !s.includes("2150") && !s.includes("2028-05-01") && !s.includes("2025-01-10") && !s.includes("0400"));
});

test("facts hash is stable when the database reorders JSON keys", async () => {
  const { factsHash } = await import("../facts");
  const a = { "a1.inc.base": { v: { amount: 1, freq: "annual" as const, basis: "gross" as const, months: 12 }, src: "broker" as const } };
  const b = { "a1.inc.base": { v: { months: 12, basis: "gross" as const, freq: "annual" as const, amount: 1 }, src: "broker" as const } };
  assert.equal(factsHash(a), factsHash(b));
});
