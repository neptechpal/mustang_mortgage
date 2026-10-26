// Loan repayment engine: principal & interest or interest-only, weekly / fortnightly / monthly,
// optional extra repayments. The user always supplies the interest rate — we never publish rates.
//
// Method (same as standard Australian online calculators, e.g. ASIC Moneysmart):
//   periodic rate r = annual rate / periods per year; P&I repayment = P·r / (1 − (1+r)^−n).
//   Lenders calculate interest daily and charge it monthly, so real repayments differ by cents.
//   "half-monthly" fortnightly = monthly repayment ÷ 2 paid 26 times a year (pays the loan off sooner).

import { round2 } from "./money";

export type Frequency = "weekly" | "fortnightly" | "monthly";
export const PERIODS_PER_YEAR: Record<Frequency, number> = { weekly: 52, fortnightly: 26, monthly: 12 };

export type RepaymentInput = {
  /** Loan amount in dollars. */
  principal: number;
  /** Annual interest rate in percent, e.g. 6.25. Supplied by the user. */
  annualRatePct: number;
  /** Loan term in years (whole loan, including any interest-only period). */
  termYears: number;
  /** Default "monthly". */
  frequency?: Frequency;
  /** Default "PI". */
  repaymentType?: "PI" | "IO";
  /** Interest-only years before switching to P&I for the rest of the term. Default 5 (capped at the term). Ignored for PI. */
  interestOnlyYears?: number;
  /** Extra amount paid every period on top of the scheduled repayment. Default 0. */
  extraPerPeriod?: number;
  /** Fortnightly only: "true" = amortised over 26 periods/yr (default); "half-monthly" = monthly ÷ 2. */
  fortnightlyMethod?: "true" | "half-monthly";
};

export type YearRow = { year: number; openingBalance: number; interest: number; principal: number; closingBalance: number };

export type ScheduleSummary = {
  periods: number;
  years: number;
  totalRepaid: number;
  totalInterest: number;
};

export type RepaymentResult = {
  frequency: Frequency;
  periodsPerYear: number;
  /** Scheduled repayment for the first phase (the interest-only payment for IO loans). */
  repayment: number;
  /** IO loans: the interest-only repayment; undefined for P&I. */
  interestOnlyRepayment?: number;
  /** The principal & interest repayment (after the IO period for IO loans). */
  principalAndInterestRepayment: number;
  interestOnlyYears: number;
  /** Repayment per month equivalent, for comparisons (repayment × periods per year ÷ 12). */
  monthlyEquivalent: number;
  /** Scheduled loan without extra repayments. */
  scheduled: ScheduleSummary;
  /** With the extra repayments (equals `scheduled` when no extra is given). */
  withExtra: ScheduleSummary & { interestSaved: number; periodsSaved: number; timeSavedYears: number };
  /** Year-by-year summary of the loan as it will run (with extras if given). */
  yearly: YearRow[];
  notes: string[];
};

/** Standard annuity payment. rate = periodic rate (decimal), n = number of periods. */
export function annuityPayment(principal: number, rate: number, n: number): number {
  if (principal <= 0 || n <= 0) return 0;
  if (rate === 0) return principal / n;
  return (principal * rate) / (1 - Math.pow(1 + rate, -n));
}

type SimOut = ScheduleSummary & { yearly: YearRow[] };

function simulate(
  principal: number,
  rate: number,
  ppy: number,
  ioPeriods: number,
  ioPayment: number,
  piPayment: number,
  extra: number,
  maxPeriods: number,
): SimOut {
  let bal = principal;
  let totalInterest = 0;
  let totalRepaid = 0;
  let p = 0;
  const yearly: YearRow[] = [];
  let yr: YearRow = { year: 1, openingBalance: bal, interest: 0, principal: 0, closingBalance: bal };
  // Hard stop: a payment that doesn't cover interest would never finish.
  const limit = Math.max(maxPeriods, 1) * 3;
  while (bal > 0.005 && p < limit) {
    const interest = bal * rate;
    const scheduled = p < ioPeriods ? ioPayment : piPayment;
    let pay = scheduled + extra;
    if (pay > bal + interest) pay = bal + interest;
    // After the interest-only period a payment that doesn't cover the interest never repays the loan.
    if (p >= ioPeriods && pay <= interest) break;
    const princ = pay - interest;
    bal -= princ;
    totalInterest += interest;
    totalRepaid += pay;
    yr.interest += interest;
    yr.principal += princ;
    p++;
    if (p % ppy === 0 || bal <= 0.005) {
      yr.closingBalance = Math.max(0, bal);
      yearly.push({
        year: yr.year,
        openingBalance: round2(yr.openingBalance),
        interest: round2(yr.interest),
        principal: round2(yr.principal),
        closingBalance: round2(yr.closingBalance),
      });
      yr = { year: yr.year + 1, openingBalance: Math.max(0, bal), interest: 0, principal: 0, closingBalance: Math.max(0, bal) };
    }
  }
  return { periods: p, years: round2(p / ppy), totalRepaid: round2(totalRepaid), totalInterest: round2(totalInterest), yearly };
}

export function calcRepayments(input: RepaymentInput): RepaymentResult {
  const frequency: Frequency = input.frequency ?? "monthly";
  const ppy = PERIODS_PER_YEAR[frequency];
  const principal = Math.max(0, input.principal || 0);
  const ratePct = Math.max(0, input.annualRatePct || 0);
  const termYears = Math.max(0, input.termYears || 0);
  const type = input.repaymentType ?? "PI";
  const extra = Math.max(0, input.extraPerPeriod || 0);
  const notes: string[] = [];

  const ioYears = type === "IO" ? Math.min(Math.max(0, input.interestOnlyYears ?? 5), termYears) : 0;
  const n = Math.round(termYears * ppy);
  const ioPeriods = Math.round(ioYears * ppy);
  const r = ratePct / 100 / ppy;

  const ioPayment = principal * r;
  let piPayment: number;
  if (frequency === "fortnightly" && input.fortnightlyMethod === "half-monthly") {
    const monthlyR = ratePct / 100 / 12;
    const monthlyN = Math.round((termYears - ioYears) * 12);
    piPayment = annuityPayment(principal, monthlyR, monthlyN) / 2;
    notes.push("Fortnightly repayments are half the monthly repayment, paid 26 times a year, so the loan is repaid sooner than the term.");
  } else {
    piPayment = annuityPayment(principal, r, n - ioPeriods);
  }
  if (type === "IO" && ioYears >= termYears && termYears > 0) {
    notes.push("The whole term is interest-only: the loan balance is still owed in full at the end.");
  } else if (type === "IO") {
    notes.push(`Interest-only for ${ioYears} years, then principal and interest over the remaining ${round2(termYears - ioYears)} years. Repayments rise when the interest-only period ends.`);
  }

  const sched = simulate(principal, r, ppy, ioPeriods, ioPayment, piPayment, 0, n);
  const run = extra > 0 ? simulate(principal, r, ppy, ioPeriods, ioPayment, piPayment, extra, n) : sched;
  // Interest-only for the whole term: scheduled payments never repay principal; the simulation above stops after n periods.
  if (type === "IO" && ioYears >= termYears) {
    const totalInterest = round2(ioPayment * n);
    sched.totalInterest = totalInterest;
    sched.totalRepaid = round2(totalInterest + principal);
    sched.periods = n;
    sched.years = termYears;
  }
  if (extra > 0) notes.push("Extra repayments are applied every period. Check your loan allows them without fees (fixed-rate loans often cap extra repayments).");
  notes.push("Estimate only. Lenders calculate interest daily and charge it monthly, so actual repayments can differ slightly.");

  const repayment = type === "IO" && ioPeriods > 0 ? ioPayment : piPayment;
  return {
    frequency,
    periodsPerYear: ppy,
    repayment: round2(repayment),
    interestOnlyRepayment: type === "IO" ? round2(ioPayment) : undefined,
    principalAndInterestRepayment: round2(piPayment),
    interestOnlyYears: ioYears,
    monthlyEquivalent: round2((repayment * ppy) / 12),
    scheduled: { periods: sched.periods, years: sched.years, totalRepaid: sched.totalRepaid, totalInterest: sched.totalInterest },
    withExtra: {
      periods: run.periods,
      years: run.years,
      totalRepaid: run.totalRepaid,
      totalInterest: run.totalInterest,
      interestSaved: round2(Math.max(0, sched.totalInterest - run.totalInterest)),
      periodsSaved: Math.max(0, sched.periods - run.periods),
      timeSavedYears: round2(Math.max(0, sched.periods - run.periods) / ppy),
    },
    yearly: run.yearly,
    notes,
  };
}

/** Convenience: repayment for each frequency at once (P&I, no extras). */
export function repaymentsByFrequency(principal: number, annualRatePct: number, termYears: number): Record<Frequency, number> {
  const out = {} as Record<Frequency, number>;
  for (const f of Object.keys(PERIODS_PER_YEAR) as Frequency[]) {
    out[f] = calcRepayments({ principal, annualRatePct, termYears, frequency: f }).repayment;
  }
  return out;
}
