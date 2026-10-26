// Refinance comparison: current loan vs a new loan with the user's own rates and fees.
// We never supply rates. All figures are estimates in today's dollars (no discounting).

import { annuityPayment } from "./repayments";
import { round2 } from "./money";

export type RefinanceInput = {
  /** Current loan balance. */
  balance: number;
  /** Years left on the current loan. */
  remainingYears: number;
  /** Current annual rate, percent. */
  currentRatePct: number;
  /** New annual rate, percent. */
  newRatePct: number;
  /** New loan term in years. Default = remainingYears (like-for-like). */
  newTermYears?: number;
  /** One-off costs of switching: discharge fee, new loan application/settlement fees, government registration fees,
   *  break costs on a fixed loan, etc. Pass a total or a breakdown. */
  switchingCosts?: number | Record<string, number>;
  /** Ongoing fees on the current loan, per year (package/annual fee) and per month (account-keeping). */
  currentAnnualFee?: number;
  currentMonthlyFee?: number;
  /** Ongoing fees on the new loan. */
  newAnnualFee?: number;
  newMonthlyFee?: number;
  /** Add the switching costs to the new loan instead of paying them in cash. Default false. */
  capitaliseCosts?: boolean;
};

export type RefinanceResult = {
  currentMonthlyRepayment: number;
  newMonthlyRepayment: number;
  /** Repayment difference per month (positive = new loan cheaper). */
  monthlyRepaymentSaving: number;
  /** Including ongoing fee differences, per month (positive = new loan cheaper). */
  monthlySaving: number;
  upfrontCosts: number;
  /** Months until cumulative monthly savings cover the upfront costs; null if the new loan never breaks even. */
  breakEvenMonths: number | null;
  /** Total cost over each loan's life: repayments + ongoing fees (+ upfront costs for the new loan if paid in cash). */
  currentTotalCost: number;
  newTotalCost: number;
  /** currentTotalCost − newTotalCost (positive = refinancing saves money over the life of the loans). */
  lifetimeSaving: number;
  currentTotalInterest: number;
  newTotalInterest: number;
  newLoanAmount: number;
  notes: string[];
};

const sumCosts = (c: RefinanceInput["switchingCosts"]): number =>
  typeof c === "number" ? Math.max(0, c) : c ? Object.values(c).reduce((s, x) => s + Math.max(0, Number(x) || 0), 0) : 0;

export function calcRefinance(input: RefinanceInput): RefinanceResult {
  const balance = Math.max(0, input.balance || 0);
  const remYears = Math.max(0, input.remainingYears || 0);
  const newYears = Math.max(0, input.newTermYears ?? remYears);
  const upfront = sumCosts(input.switchingCosts);
  const capitalise = !!input.capitaliseCosts;
  const notes: string[] = [];

  const nCur = Math.round(remYears * 12);
  const nNew = Math.round(newYears * 12);
  const newLoan = balance + (capitalise ? upfront : 0);

  const curPay = annuityPayment(balance, input.currentRatePct / 100 / 12, nCur);
  const newPay = annuityPayment(newLoan, input.newRatePct / 100 / 12, nNew);

  const curFeesPm = Math.max(0, input.currentMonthlyFee || 0) + Math.max(0, input.currentAnnualFee || 0) / 12;
  const newFeesPm = Math.max(0, input.newMonthlyFee || 0) + Math.max(0, input.newAnnualFee || 0) / 12;

  const repaySaving = curPay - newPay;
  const monthlySaving = curPay + curFeesPm - (newPay + newFeesPm);

  const curTotal = curPay * nCur + curFeesPm * nCur;
  const newTotal = newPay * nNew + newFeesPm * nNew + (capitalise ? 0 : upfront);

  // Break-even: when cumulative monthly savings cover the cash costs. If costs are capitalised the cost is already
  // inside the new repayment, so break-even is immediate when the monthly saving is positive.
  let breakEven: number | null = null;
  if (monthlySaving > 0) breakEven = capitalise || upfront === 0 ? 0 : Math.ceil(upfront / monthlySaving - 1e-9);
  if (breakEven !== null && breakEven > nNew) breakEven = null;

  if (newYears > remYears)
    notes.push(
      `The new loan runs ${round2(newYears - remYears)} years longer than your current loan. Lower repayments can still cost more in total because you pay interest for longer.`,
    );
  if (newYears < remYears) notes.push("The new loan has a shorter term than your current loan, so repayments can rise even at a lower rate.");
  if (monthlySaving <= 0) notes.push("At these rates and fees the new loan does not reduce your monthly cost.");
  if (capitalise && upfront > 0) notes.push("Switching costs are added to the new loan, so you pay interest on them.");
  notes.push("Check for break costs if your current loan is fixed, and for a discharge fee. Government mortgage discharge and registration fees apply in every state.");
  notes.push("Estimate only, not a recommendation. A broker or lender must assess whether a new loan is not unsuitable for you.");

  return {
    currentMonthlyRepayment: round2(curPay),
    newMonthlyRepayment: round2(newPay),
    monthlyRepaymentSaving: round2(repaySaving),
    monthlySaving: round2(monthlySaving),
    upfrontCosts: round2(upfront),
    breakEvenMonths: breakEven,
    currentTotalCost: round2(curTotal),
    newTotalCost: round2(newTotal),
    lifetimeSaving: round2(curTotal - newTotal),
    currentTotalInterest: round2(curPay * nCur - balance),
    newTotalInterest: round2(newPay * nNew - newLoan),
    newLoanAmount: round2(newLoan),
    notes,
  };
}
