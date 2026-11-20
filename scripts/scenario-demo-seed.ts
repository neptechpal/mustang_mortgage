// SYNTHETIC demo data for the Scenario assistant — development / testing only.
// Creates 5 fictional lenders (codes SYN-*), products, one synthetic source each, sample policy rules,
// price records and synthetic test cases covering the handoff acceptance scenarios.
// Never run against production with real client data expectations; everything is labelled SYNTHETIC.
//   npx tsx scripts/scenario-demo-seed.ts            (seed)
//   npx tsx scripts/scenario-demo-seed.ts --remove   (delete SYN-* lenders and synthetic cases)
import { randomBytes } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { factsHash, type Facts } from "../src/modules/scenario/facts";

const prisma = new PrismaClient();
const D = (s: string) => new Date(`${s}T00:00:00+11:00`);
const key = () => `r_${randomBytes(5).toString("hex")}`;
const TAG = "SYNTHETIC";

async function remove() {
  const lenders = await prisma.scnLender.findMany({ where: { code: { startsWith: "SYN-" } } });
  const ids = lenders.map((l) => l.id);
  await prisma.scnPolicyRule.deleteMany({ where: { lenderId: { in: ids } } });
  await prisma.scnPriceRecord.deleteMany({ where: { lenderId: { in: ids } } });
  await prisma.scnSource.deleteMany({ where: { OR: [{ lenderId: { in: ids } }, { title: { startsWith: TAG } }] } });
  await prisma.scnLender.deleteMany({ where: { id: { in: ids } } });
  const cases = await prisma.case.findMany({ where: { title: { startsWith: TAG } }, select: { id: true } });
  const cids = cases.map((c) => c.id);
  for (const m of [prisma.scnFacts, prisma.scnAssessment, prisma.scnTask, prisma.scnQuestion, prisma.scnServiceability, prisma.scnComplianceItem, prisma.scnReviewGate, prisma.caseReminder, prisma.caseActivity] as unknown as { deleteMany: (a: object) => Promise<unknown> }[])
    await m.deleteMany({ where: { caseId: { in: cids } } });
  await prisma.case.deleteMany({ where: { id: { in: cids } } });
  console.log(`Removed ${ids.length} synthetic lenders and ${cids.length} synthetic cases.`);
}

type R = { check: string; category: string; params: Record<string, unknown>; statement: string; segment?: string; verifiedAt?: string; reviewDue?: string };

async function seed() {
  await remove();
  const defs: { code: string; name: string; maxLvr: number; tempVisa: boolean; schemes: string[]; rate: number; features: string[]; cashback?: number; cashbackExpiry?: string; extra: R[] }[] = [
    { code: "SYN-A", name: "Synthetic Lender A", maxLvr: 95, tempVisa: true, schemes: ["fhbg", "regional_fhbg"], rate: 6.04, features: ["offset", "redraw", "extra_repayments"], extra: [
      { check: "income", category: "income", params: { component: "penalties", treatment: "accept", minHistoryMonths: 6, requiresConfirmation: false }, statement: "Penalty / shift / weekend rates accepted at 100% with 6 months history (SYNTHETIC)." },
      { check: "income", category: "income", params: { component: "director", treatment: "conditional", minHistoryMonths: 24, requiresConfirmation: true }, statement: "Director wages assessed with 2 years company financials; BDM confirmation required (SYNTHETIC)." },
    ] },
    { code: "SYN-B", name: "Synthetic Lender B", maxLvr: 90, tempVisa: false, schemes: [], rate: 5.94, features: ["redraw", "no_annual_fee"], cashback: 3000, cashbackExpiry: "2026-11-10", extra: [
      { check: "income", category: "income", params: { component: "penalties", treatment: "shade", shadingPct: 80, minHistoryMonths: 12, requiresConfirmation: true }, statement: "Penalty rates shaded to 80%, 12 months history, written BDM confirmation needed (SYNTHETIC)." },
    ] },
    { code: "SYN-C", name: "Synthetic Lender C", maxLvr: 95, tempVisa: true, schemes: ["fhbg"], rate: 6.19, features: ["offset", "redraw", "split", "fixed_option", "package"], extra: [
      { check: "income", category: "income", params: { component: "overtime", treatment: "shade", shadingPct: 80, minHistoryMonths: 6 }, statement: "Overtime 80% with 6 months (SYNTHETIC)." },
    ] },
    { code: "SYN-D", name: "Synthetic Lender D", maxLvr: 80, tempVisa: true, schemes: [], rate: 5.89, features: ["offset"], extra: [
      { check: "max_lvr", category: "max_lvr", segment: "all", params: { maxLvrPct: 85, occupancy: ["owner_occupied"] }, statement: "Rate sheet footnote: max 85% owner-occupied (SYNTHETIC conflicting record)." },
    ] },
    { code: "SYN-E", name: "Synthetic Lender E", maxLvr: 95, tempVisa: false, schemes: ["fhbg", "family_home_guarantee"], rate: 6.29, features: ["offset", "redraw", "extra_repayments", "split"], extra: [] },
  ];
  let sort = 0;
  for (const d of defs) {
    const l = await prisma.scnLender.create({ data: { code: d.code, name: d.name, sort: sort++, notes: `${TAG} demo lender — not real policy.` } });
    const p = await prisma.scnProduct.create({ data: { lenderId: l.id, code: `${d.code}-VAR`, name: "Variable home loan (synthetic)", features: d.features, maxLoan: 2_500_000, minLoan: 50_000 } });
    const s = await prisma.scnSource.create({ data: { lenderId: l.id, kind: "lender_guide", title: `${TAG} ${d.name} credit guide`, reference: "demo-v1", status: "published", permStore: true, permAi: true, permNote: "Synthetic test data", createdBy: "seed", receivedAt: D("2026-11-01") } });
    const rules: R[] = [
      { check: "max_lvr", category: "max_lvr", params: { maxLvrPct: d.maxLvr, occupancy: ["owner_occupied"] }, statement: `Maximum LVR ${d.maxLvr}% owner-occupied, LMI applies above 80% (SYNTHETIC).` },
      { check: "max_lvr", category: "max_lvr", segment: "investment", params: { maxLvrPct: 90, occupancy: ["investment"] }, statement: "Maximum LVR 90% investment (SYNTHETIC)." },
      d.tempVisa
        ? { check: "residency", category: "visa_residency", params: { accepted: ["citizen", "permanent_resident", "nz_citizen"], conditional: ["temporary_visa"], subclassesAllowed: ["482", "186", "187", "491", "494"], minVisaMonths: 12, maxLvrPct: 80 }, statement: "Temporary residents on 482/491/494 accepted to 80% LVR with 12+ months visa remaining (SYNTHETIC)." }
        : { check: "residency", category: "visa_residency", params: { accepted: ["citizen", "permanent_resident", "nz_citizen"] }, statement: "Australian citizens, PR and NZ citizens only (SYNTHETIC)." },
      { check: "combination", category: "borrower_combination", params: { tempWithResident: d.tempVisa ? "accept" : "conditional", allTemp: d.tempVisa ? "conditional" : "decline", residentIncomeOnly: !d.tempVisa }, statement: d.tempVisa ? "Joint with a citizen/PR accepted; both incomes counted (SYNTHETIC)." : "Temporary resident co-borrower case by case; only citizen/PR income counted (SYNTHETIC)." },
      { check: "employment", category: "employment", params: { employmentTypes: ["payg_full_time", "payg_part_time", "casual", "contract"], minTenureMonths: 6, minIndustryMonths: 12, probation: "conditional", returnFromLeave: "conditional", minPayslips: 2 }, statement: "6 months in role or 12 months in industry; probation and return from parental leave case by case with employer letter; 2 payslips (SYNTHETIC)." },
      { check: "genuine_savings", category: "genuine_savings", params: { appliesAboveLvrPct: 85, minPct: 5, minHeldMonths: 3, giftAccepted: true, giftCountsAsGenuine: false }, statement: "Above 85% LVR: 5% genuine savings held 3 months; gifts accepted but not genuine savings (SYNTHETIC)." },
      { check: "scheme", category: "scheme", params: { schemes: d.schemes }, statement: d.schemes.length ? `Participating lender: ${d.schemes.join(", ")} (SYNTHETIC).` : "Not a scheme participating lender (SYNTHETIC)." },
      { check: "property", category: "property", params: { excludedTypes: ["rural"], conditionalTypes: ["high_density", "off_the_plan"] }, statement: "No rural; high-density and off-the-plan restricted (SYNTHETIC)." },
      ...d.extra,
    ];
    for (const r of rules)
      await prisma.scnPolicyRule.create({
        data: {
          ruleKey: key(), lenderId: l.id, category: r.category, check: r.check, params: r.params as Prisma.InputJsonValue, statement: r.statement, segment: r.segment ?? "all",
          sourceId: s.id, sourceSection: "Demo section", effectiveFrom: D("2026-07-01"), verifiedAt: D(r.verifiedAt ?? "2026-11-10"), reviewDue: D(r.reviewDue ?? (d.code === "SYN-E" ? "2026-11-15" : "2027-02-10")),
          reviewer: "Seed (synthetic)", status: "published", createdBy: "seed",
        },
      });
    for (const [lo, hi, add] of [[0, 80, 0], [80, 90, 0.2], [90, 95, 0.4]] as const)
      await prisma.scnPriceRecord.create({
        data: {
          recordKey: key(), lenderId: l.id, productId: p.id, occupancy: "owner_occupied", repaymentType: "PI", lvrMin: lo, lvrMax: hi, ratePct: +(d.rate + add).toFixed(2), comparisonPct: +(d.rate + add + 0.1).toFixed(2),
          upfrontFees: 0, annualFee: d.features.includes("package") ? 395 : 0, cashback: d.cashback ?? 0, cashbackTerms: d.cashback ? "Refinance only, min $250k (SYNTHETIC)" : "", cashbackExpiry: d.cashbackExpiry ? D(d.cashbackExpiry) : null,
          sourceId: s.id, sourceSection: "Rate card", effectiveFrom: D("2026-11-01"), verifiedAt: D("2026-11-15"), reviewDue: D("2026-12-15"), reviewer: "Seed (synthetic)", status: "published", createdBy: "seed",
        },
      });
  }

  const mk = async (title: string, facts: Record<string, unknown>, applicantCount = 1) => {
    const c = await prisma.case.create({ data: { title: `${TAG} — ${title}`, portalToken: randomBytes(16).toString("hex"), applicantCount, loanType: String(facts["loan.purpose"] ?? ""), app1Name: "Test Applicant" } });
    const f = Object.fromEntries(Object.entries(facts).map(([k, v]) => [k, { v, src: "broker", ok: false }]));
    await prisma.scnFacts.create({ data: { caseId: c.id, facts: f as Prisma.InputJsonValue, hash: factsHash(f as Facts), updatedBy: "seed" } });
    return c.id;
  };
  const base = { "loan.purpose": "purchase", "loan.occupancy": "owner_occupied", "loan.termYears": 30, "loan.repayment": "PI", "prop.state": "NSW", "prop.type": "house", "prop.price": 850_000, "prop.firstHome": true, "con.legal": 2200 };
  const ids = [
    await mk("Joint PR + temporary visa", { ...base, "app.count": 2, "loan.amount": 640_000, "con.savings": 240_000, "a1.residency": "permanent_resident", "a2.residency": "temporary_visa", "a1.employment": "payg_full_time", "a2.employment": "payg_full_time", "a1.startDate": "2021-03-01", "a2.startDate": "2024-06-01", "a1.payslips": 2, "a1.inc.base": { amount: 98000, freq: "annual", basis: "gross", months: 12 }, "a2.inc.base": { amount: 85000, freq: "annual", basis: "gross", months: 12 } }, 2),
    await mk("Casual back from parental leave, one payslip", { ...base, "loan.amount": 700_000, "con.savings": 190_000, "a1.residency": "citizen", "a1.employment": "casual", "a1.startDate": "2026-07-01", "a1.priorMonths": 18, "a1.payslips": 1, "a1.leave": "parental_returned", "a1.returnDate": "2026-09-01", "a1.inc.base": { amount: 1450, freq: "weekly", basis: "gross", months: 2 } }),
    await mk("Director wages + weekend penalties", { ...base, "loan.amount": 680_000, "con.savings": 210_000, "a1.residency": "citizen", "a1.employment": "director", "a1.startDate": "2019-02-01", "a1.inc.director": { amount: 8500, freq: "monthly", basis: "gross", months: 30 }, "a1.inc.penalties": { amount: 380, freq: "weekly", basis: "gross", months: 8 } }),
    await mk("5% deposit with gifted funds", { ...base, "prop.price": 750_000, "loan.amount": 712_500, "con.savings": 26_000, "con.savingsHeldMonths": 4, "con.gift": 15_000, "con.giftFrom": "parent", "con.scheme": "fhbg", "a1.residency": "citizen", "a1.employment": "payg_full_time", "a1.startDate": "2022-01-10", "a1.payslips": 2, "loan.features": ["offset"] }),
  ];
  console.log(`Seeded 5 synthetic lenders and synthetic cases: ${ids.join(", ")}`);
}

(process.argv.includes("--remove") ? remove() : seed())
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
