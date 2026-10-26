// Repayment / refinance engines. Expected values use the standard annuity formula
// P = L·r / (1 − (1+r)^−n) with r = annual rate ÷ periods per year (the method used by ASIC Moneysmart and
// other Australian online calculators). Independent closed forms are computed in-test where noted.
import { test } from "node:test";
import assert from "node:assert/strict";
import { calcRepayments, repaymentsByFrequency } from "../repayments";
import { calcRefinance } from "../refinance";

const pmt = (L: number, annualPct: number, ppy: number, years: number) => {
  const r = annualPct / 100 / ppy;
  const n = years * ppy;
  return (L * r) / (1 - Math.pow(1 + r, -n));
};
const near = (a: number, b: number, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test("P&I monthly: $500,000 at 6% over 30 years = $2,997.75/month", () => {
  const r = calcRepayments({ principal: 500_000, annualRatePct: 6, termYears: 30 });
  assert.equal(r.repayment, 2_997.75);
  assert.equal(r.scheduled.periods, 360);
  near(r.scheduled.totalInterest, 2_997.7526 * 360 - 500_000, 1); // ≈ $579,190.95
  assert.equal(r.yearly.length, 30);
  near(r.yearly[29].closingBalance, 0);
});

test("P&I monthly: $300,000 at 5% over 25 years = $1,753.77/month", () => {
  assert.equal(calcRepayments({ principal: 300_000, annualRatePct: 5, termYears: 25 }).repayment, 1_753.77);
});

test("Weekly and fortnightly use 52 / 26 periods", () => {
  const f = repaymentsByFrequency(500_000, 6, 30);
  near(f.weekly, pmt(500_000, 6, 52, 30));
  near(f.fortnightly, pmt(500_000, 6, 26, 30));
  assert.equal(f.monthly, 2_997.75);
});

test("Fortnightly half-monthly method repays sooner", () => {
  const r = calcRepayments({ principal: 500_000, annualRatePct: 6, termYears: 30, frequency: "fortnightly", fortnightlyMethod: "half-monthly" });
  near(r.repayment, 2_997.75 / 2, 0.01);
  assert.ok(r.scheduled.years < 30 && r.scheduled.years > 24);
});

test("Interest-only: $600,000 at 6% = $3,000/month for 5 years, then P&I over 25 years", () => {
  const r = calcRepayments({ principal: 600_000, annualRatePct: 6, termYears: 30, repaymentType: "IO", interestOnlyYears: 5 });
  assert.equal(r.repayment, 3_000);
  assert.equal(r.interestOnlyRepayment, 3_000);
  near(r.principalAndInterestRepayment, pmt(600_000, 6, 12, 25));
  assert.equal(r.scheduled.periods, 360);
});

test("Interest-only for the whole term: balance owed at the end", () => {
  const r = calcRepayments({ principal: 400_000, annualRatePct: 5, termYears: 5, repaymentType: "IO", interestOnlyYears: 5 });
  assert.equal(r.repayment, 1_666.67);
  near(r.scheduled.totalInterest, 100_000, 0.5);
  near(r.scheduled.totalRepaid, 500_000, 0.5);
});

test("Extra repayments: periods match the closed-form n = −ln(1 − rL/P)/ln(1+r)", () => {
  const r = calcRepayments({ principal: 500_000, annualRatePct: 6, termYears: 30, extraPerPeriod: 500 });
  const P = pmt(500_000, 6, 12, 30) + 500;
  const nExact = -Math.log(1 - (0.005 * 500_000) / P) / Math.log(1.005);
  assert.equal(r.withExtra.periods, Math.ceil(nExact));
  assert.ok(r.withExtra.interestSaved > 150_000);
  assert.equal(r.withExtra.periodsSaved, 360 - Math.ceil(nExact));
});

test("Zero rate repays principal evenly", () => {
  const r = calcRepayments({ principal: 120_000, annualRatePct: 0, termYears: 10 });
  assert.equal(r.repayment, 1_000);
  assert.equal(r.scheduled.totalInterest, 0);
});

test("Refinance: like-for-like term, cheaper rate, $2,000 costs", () => {
  const r = calcRefinance({ balance: 500_000, remainingYears: 25, currentRatePct: 6.5, newRatePct: 6.0, switchingCosts: { discharge: 350, application: 600, government: 1_050 } });
  const cur = pmt(500_000, 6.5, 12, 25);
  const nw = pmt(500_000, 6.0, 12, 25);
  near(r.currentMonthlyRepayment, cur);
  near(r.newMonthlyRepayment, nw);
  near(r.monthlySaving, cur - nw);
  assert.equal(r.upfrontCosts, 2_000);
  assert.equal(r.breakEvenMonths, Math.ceil(2_000 / (cur - nw)));
  near(r.lifetimeSaving, (cur - nw) * 300 - 2_000, 0.05);
});

test("Refinance: higher fees can cancel a lower rate; longer term flagged", () => {
  const r = calcRefinance({ balance: 300_000, remainingYears: 20, currentRatePct: 6.0, newRatePct: 5.99, newAnnualFee: 395, switchingCosts: 1_500 });
  assert.ok(r.monthlySaving < 0);
  assert.equal(r.breakEvenMonths, null);
  const r2 = calcRefinance({ balance: 300_000, remainingYears: 20, currentRatePct: 6.0, newRatePct: 6.0, newTermYears: 30 });
  assert.ok(r2.monthlySaving > 0 && r2.lifetimeSaving < 0);
  assert.ok(r2.notes.some((n) => n.includes("longer")));
});
