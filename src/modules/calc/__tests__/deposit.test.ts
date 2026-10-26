// Deposit / LVR / LMI indicator + 5% Deposit Scheme caps (firsthomebuyers.gov.au property price caps, from 1 July 2026).
import { test } from "node:test";
import assert from "node:assert/strict";
import { calcDeposit } from "../deposit";
import { depositSchemeCheck, FIVE_PERCENT_DEPOSIT_SCHEME, HELP_TO_BUY, FIRB } from "../rules/federal";
import { auditFreshness, isStale } from "../freshness";
import { estimateBorrowingPower } from "../borrowing";
import { BORROW_DEFAULTS, compute, type BorrowInputs } from "../../tools/serviceability/math";

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

test("Borrowing wrapper reproduces the original compute() exactly and requires a user rate", () => {
  assert.throws(() => estimateBorrowingPower({ applicant1Gross: 100_000, household: "single", productRatePct: 0 }));
  const r = estimateBorrowingPower({ applicant1Gross: 120_000, household: "couple", applicant2Gross: 80_000, livingExpensesMonthly: 3_000, creditCardLimits: 10_000, productRatePct: 6.2 });
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
