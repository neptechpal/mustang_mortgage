// Typed wrapper around the existing borrowing-power maths in src/modules/tools/serviceability/math.ts
// (a verbatim port of the old WordPress borrow.js). The maths is NOT changed here — this file only gives it a
// clean, named API for the new public calculators.
//
// Known limitations of the underlying maths (do not "fix" here; raise with the broker):
// - tax() uses 2024-25 resident rates + 2% Medicare, no offsets/low-income reductions.
// - HEM figures are the WordPress plugin's flat household benchmarks, not the licensed Melbourne Institute HEM table.
// - The plugin's default product rate is deliberately NOT used: the user must supply the rate (we never publish rates).

import {
  BORROW_DEFAULTS,
  compute,
  fees as stateFees,
  GROUPS,
  grossFromNet,
  netOf,
  pmt,
  pv,
  tax,
  type BorrowAssumptions,
  type BorrowInputs,
} from "../tools/serviceability/math";

export type { BorrowAssumptions, BorrowInputs };
export { BORROW_DEFAULTS, GROUPS, grossFromNet, netOf, pmt, pv, tax };

export type Household = "single" | "single1" | "couple" | "c1" | "c2" | "c3";

export type BorrowingInput = {
  /** Annual gross salary, applicant 1 and (optional) applicant 2. */
  applicant1Gross: number;
  applicant2Gross?: number;
  /** Other annual income (bonus/overtime/commission) — shaded by the assumptions' bonus_shade_pct. */
  applicant1Other?: number;
  applicant2Other?: number;
  /** Rental income per week from investment property (shaded by rent_shade_pct). */
  rentalIncomeWeekly?: number;
  household: Household;
  dependants?: number;
  /** Declared living expenses per month. The higher of this and the benchmark is used when useBenchmark is true. */
  livingExpensesMonthly?: number;
  useBenchmark?: boolean;
  /** Total credit card limits (assessed at cc_assess_pct of the limit per month). */
  creditCardLimits?: number;
  /** Other loan repayments per month (car, personal). */
  otherLoanRepaymentsMonthly?: number;
  /** HECS/HELP repayments per month. */
  helpRepaymentsMonthly?: number;
  /** Any other monthly commitments (child support, etc.). */
  otherCommitmentsMonthly?: number;
  /** Balances of existing property loans (assessed as P&I over 30 years at the assessment rate). */
  existingPropertyLoans?: number;
  /** Product interest rate in percent — REQUIRED, supplied by the user. */
  productRatePct: number;
  /** Serviceability buffer added to the product rate (default from assumptions, 3%). */
  bufferPct?: number;
  /** Minimum assessment (floor) rate (default from assumptions). */
  floorRatePct?: number;
  termYears?: number;
  repaymentType?: "PI" | "IO";
  state?: string;
  /** Deposit / savings available, target LVR (0–1) and a stamp-duty allowance, for the "price you could buy" figure. */
  deposit?: number;
  targetLvr?: number;
  stampDutyAllowance?: number;
};

export type BorrowingResult = ReturnType<typeof compute> & {
  /** Indicative purchase price from max loan + deposit − costs, capped by target LVR; null without a deposit. */
  indicativePrice: number | null;
  loanAtPrice: number;
  upfrontCostsAssumed: number;
  notes: string[];
};

/** Map the friendly input onto the original BorrowInputs shape. */
export function toBorrowInputs(i: BorrowingInput, S: BorrowAssumptions = BORROW_DEFAULTS): BorrowInputs {
  const n = (x: number | undefined) => (Number.isFinite(x) && (x as number) > 0 ? (x as number) : 0);
  return {
    a1Name: "",
    a2Name: "",
    a1Gross: n(i.applicant1Gross),
    a1Other: n(i.applicant1Other),
    a2Gross: n(i.applicant2Gross),
    a2Other: n(i.applicant2Other),
    rentPw: n(i.rentalIncomeWeekly),
    household: i.household,
    dependants: n(i.dependants),
    livingPm: n(i.livingExpensesMonthly),
    ccLimit: n(i.creditCardLimits),
    otherPm: n(i.otherLoanRepaymentsMonthly),
    helpPm: n(i.helpRepaymentsMonthly),
    otherCommit: n(i.otherCommitmentsMonthly),
    propLoans: n(i.existingPropertyLoans),
    useHem: i.useBenchmark ?? true,
    prodRate: n(i.productRatePct),
    buffer: i.bufferPct ?? S.buffer_percent,
    floorRate: i.floorRatePct ?? S.floor_rate,
    termYears: n(i.termYears) || S.term_years || 30,
    repayType: i.repaymentType === "IO" ? "IO" : "PI",
    state: i.state ?? "NSW",
    desired: 0,
    deposit: n(i.deposit),
    targetLvr: i.targetLvr && i.targetLvr > 0 ? i.targetLvr : 0.8,
    dutyAllow: n(i.stampDutyAllowance),
  };
}

/**
 * Indicative borrowing power. Same maths and same "price you could buy" logic as the existing
 * ServiceabilityCalculator component (purchase price = min(maxLoan + deposit − costs, (deposit − costs)/(1 − LVR))).
 */
export function estimateBorrowingPower(input: BorrowingInput, assumptions: Partial<BorrowAssumptions> = {}): BorrowingResult {
  if (!(input.productRatePct > 0)) throw new Error("productRatePct is required (the user supplies the rate; we never publish rates).");
  const S: BorrowAssumptions = { ...BORROW_DEFAULTS, ...assumptions, fees: { ...BORROW_DEFAULTS.fees, ...(assumptions.fees ?? {}) } };
  const i = toBorrowInputs(input, S);
  const r = compute(S, i);
  const costs = i.dutyAllow + stateFees(S, i.state);
  let price: number | null = null;
  let loanAtPrice = 0;
  if (i.deposit > 0 && r.gross) {
    const p1 = r.maxLoan + i.deposit - costs;
    const p2 = i.targetLvr < 1 ? (i.deposit - costs) / (1 - i.targetLvr) : p1;
    price = Math.max(0, Math.min(p1, p2));
    loanAtPrice = Math.max(0, price - (i.deposit - costs));
  }
  return {
    ...r,
    indicativePrice: price,
    loanAtPrice,
    upfrontCostsAssumed: costs,
    notes: [
      `Assessed at ${r.assess.toFixed(2)}% (your rate plus a ${i.buffer}% buffer, or the ${i.floorRate}% floor if higher).`,
      "Indicative only. Each lender applies its own income shading, living-expense benchmarks and debt-to-income limits.",
      "Tax is estimated with 2024-25 resident rates plus the 2% Medicare levy, without offsets.",
    ],
  };
}
