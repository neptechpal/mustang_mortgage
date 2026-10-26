// Deposit / LVR / LMI indicator + 5% Deposit Scheme caps (firsthomebuyers.gov.au property price caps, from 1 July 2026).
import { test } from "node:test";
import assert from "node:assert/strict";
import { calcDeposit } from "../deposit";
import { depositSchemeCheck, FIVE_PERCENT_DEPOSIT_SCHEME, HELP_TO_BUY, FIRB } from "../rules/federal";
import { auditFreshness, isStale } from "../freshness";
import { estimateBorrowingPower, estimatePurchasePrice, incomeTax, TAX_2024_25, TAX_2026_27 } from "../borrowing";
import { calcStampDuty } from "../stampDuty";
import { BORROW_DEFAULTS, compute, tax, type BorrowInputs } from "../../tools/serviceability/math";

test("5/10/20% deposit rows, LVR and LMI indicator at $800,000", () => {
  const r = calcDeposit({ price: 800_000 });
  assert.deepEqual(
    r.rows.map((x) => [x.depositPct, x.deposit, x.loan, x.lvrPct, x.lmiLikely]),
    [
      [5, 40_000, 760_000, 95, true],
      [10, 80_000, 720_000, 90, true],
      [20, 160_000, 640_000, 80, false], // exactly 80% LVR: LMI not "likely"
    ],
  );
});

test("Cash needed includes NSW stamp duty + fees when a state is given", () => {
  const r = calcDeposit({ price: 650_000, stampDuty: { state: "NSW", propertyType: "established", firstHomeBuyer: false, foreignPurchaser: false, ownerOccupier: true } });
  assert.equal(r.govtCosts, 23_437 + 182.73 * 2);
  assert.equal(r.rows[2].cashNeeded, 130_000 + 23_437 + 182.73 * 2);
  assert.equal(r.depositScheme?.cap, 1_500_000);
  assert.equal(r.depositScheme?.withinCap, true);
});

test("From savings: deposit after costs and shortfall to 20%", () => {
  const r = calcDeposit({ price: 500_000, savings: 60_000, otherCosts: 10_000 });
  assert.equal(r.fromSavings?.deposit, 50_000);
  assert.equal(r.fromSavings?.lvrPct, 90);
  assert.equal(r.fromSavings?.lmiLikely, true);
  assert.equal(r.fromSavings?.shortfallFor20Pct, 50_000);
});

test("5% Deposit Scheme caps (official table, 1 July 2026)", () => {
  assert.equal(depositSchemeCheck("NSW", 1_500_000).withinCap, true);
  assert.equal(depositSchemeCheck("NSW", 1_500_001).withinCap, false);
  assert.equal(depositSchemeCheck("NSW", 800_000, "regional").withinCap, true);
  assert.equal(FIVE_PERCENT_DEPOSIT_SCHEME.priceCaps.VIC.capital, 950_000);
  assert.equal(FIVE_PERCENT_DEPOSIT_SCHEME.priceCaps.NT.capital, 750_000); // Darwin from 1 July 2026
  assert.equal(HELP_TO_BUY.priceCaps.NSW.capital, 1_300_000);
  assert.equal(FIRB.establishedDwellingBan.to, "2029-06-30");
});

test("Freshness: 90-day rule", () => {
  const now = new Date("2026-10-26T00:00:00Z");
  assert.equal(isStale("2026-07-28", now), false); // 90 days
  assert.equal(isStale("2026-07-27", now), true); // 91 days
  assert.equal(isStale("not a date", now), true);
  assert.deepEqual(auditFreshness({ a: { verifiedAt: "2026-10-26", verified: true }, b: { verifiedAt: "2026-01-01", verified: true } }, now).map((x) => x.path), ["b"]);
});

test("Borrowing wrapper reproduces the original compute() exactly (with the legacy 2024-25 scale) and requires a user rate", () => {
  assert.throws(() => estimateBorrowingPower({ applicant1Gross: 100_000, household: "single", productRatePct: 0 }));
  const r = estimateBorrowingPower({ applicant1Gross: 120_000, household: "couple", applicant2Gross: 80_000, livingExpensesMonthly: 3_000, creditCardLimits: 10_000, productRatePct: 6.2 }, {}, TAX_2024_25);
  const raw: BorrowInputs = {
    a1Name: "", a2Name: "", a1Gross: 120_000, a1Other: 0, a2Gross: 80_000, a2Other: 0, rentPw: 0, household: "couple", dependants: 0,
    livingPm: 3_000, ccLimit: 10_000, otherPm: 0, helpPm: 0, otherCommit: 0, propLoans: 0, useHem: true, prodRate: 6.2,
    buffer: BORROW_DEFAULTS.buffer_percent, floorRate: BORROW_DEFAULTS.floor_rate, termYears: 30, repayType: "PI", state: "NSW",
    desired: 0, deposit: 0, targetLvr: 0.8, dutyAllow: 0,
  };
  const c = compute(BORROW_DEFAULTS, raw);
  assert.equal(r.maxLoan, c.maxLoan);
  assert.equal(r.assess, 9.2);
  assert.ok(r.maxLoan > 0);
});

test("Income tax 2026-27 resident scale (Income Tax Rates Act Sch 7 as amended by Act No. 28, 2025) + 2% Medicare", () => {
  // Bracket bases from the marginal rates: $45,000 → 26,800 × 15% = $4,020; $135,000 → $31,020; $190,000 → $51,370.
  assert.equal(incomeTax(18_200), 18_200 * 0.02);
  assert.equal(Math.round(incomeTax(45_000) - 900), 4_020);
  assert.equal(Math.round(incomeTax(135_000) - 2_700), 31_020);
  assert.equal(Math.round(incomeTax(190_000) - 3_800), 51_370);
  assert.equal(Math.round(incomeTax(100_000)), 4_020 + 16_500 + 2_000);
  // The legacy scale still equals the original tax() function.
  for (const g of [0, 18_200, 30_000, 45_000, 90_000, 135_000, 150_000, 190_000, 250_000]) assert.ok(Math.abs(incomeTax(g, TAX_2024_25) - tax(g)) < 1e-6);
  assert.equal(TAX_2026_27.incomeYear, "2026-27");
});

test("Borrowing: 2026-27 tax gives a little more net income than 2024-25, so a slightly higher max loan", () => {
  const input = { applicant1Gross: 95_000, household: "single" as const, livingExpensesMonthly: 2_000, productRatePct: 6 };
  const now = estimateBorrowingPower(input);
  const old = estimateBorrowingPower(input, {}, TAX_2024_25);
  // 1 percentage point on the $18,200–$45,000 band = $268 a year more take-home.
  assert.ok(Math.abs(now.netAnnual - old.netAnnual - 268) < 1e-6);
  assert.ok(now.maxLoan > old.maxLoan);
});

test("Purchase price after NSW duty and fees is self-consistent", () => {
  const r = estimatePurchasePrice({ maxLoan: 600_000, deposit: 120_000, targetLvr: 0.8, state: "NSW", firstHomeBuyer: false });
  const duty = calcStampDuty({ state: "NSW", price: r.price, propertyType: "established", firstHomeBuyer: false, ownerOccupier: true, foreignPurchaser: false }).totalGovtCosts;
  assert.ok(Math.abs(r.govtCosts - duty) < 0.01);
  assert.ok(r.loan <= 600_000 + 1);
  assert.ok(r.lvrPct <= 80 + 0.01);
});
