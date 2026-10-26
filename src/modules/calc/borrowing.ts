// Typed wrapper around the existing borrowing-power maths in src/modules/tools/serviceability/math.ts
// (a verbatim port of the old WordPress borrow.js). The serviceability formula is unchanged; this file gives it a
// clean, named API for the public calculators and supplies the CURRENT income tax scale (the original tax() is
// FY2024-25 and stays as-is for the staff CRM tool).
//
// Known limitations (raise with the broker before changing):
// - Tax: resident rates + 2% Medicare levy, no offsets, no Medicare low-income reduction, no HELP.
// - Living costs: the old plugin's flat household benchmarks (single, couple, + dependants). They are NOT the licensed
//   Melbourne Institute HEM table that lenders use; the UI labels them "indicative living-cost benchmarks".
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
import { calcStampDuty } from "./stampDuty";
import type { AuState, PropertyType, Provenance } from "./types";

export type { BorrowAssumptions, BorrowInputs };
export { BORROW_DEFAULTS, GROUPS, grossFromNet, netOf, pmt, pv, tax };

// ---------------------------------------------------------------------------------------------------------
// Income tax (resident individuals)

export type TaxScale = Provenance & {
  incomeYear: string;
  /** Marginal brackets on taxable income: rate applies to the part above `over` up to `upTo`. */
  brackets: { over: number; upTo: number | null; ratePct: number }[];
  medicareLevyPct: number;
};

/**
 * 2026-27 resident rates: Income Tax Rates Act 1986 Sch 7 Pt I cl 1, table "Tax rates for resident taxpayers for the
 * 2026-27 year of income" as inserted by the Treasury Laws Amendment (More Cost of Living Relief) Act 2025 (No. 28, 2025)
 * Sch 1 item 2: 15% to $45,000, 30% to $135,000, 37% to $190,000, 45% above; tax-free threshold $18,200.
 * Medicare levy 2% (Medicare Levy Act 1986 s 6).
 */
export const TAX_2026_27: TaxScale = {
  incomeYear: "2026-27",
  brackets: [
    { over: 0, upTo: 18_200, ratePct: 0 },
    { over: 18_200, upTo: 45_000, ratePct: 15 },
    { over: 45_000, upTo: 135_000, ratePct: 30 },
    { over: 135_000, upTo: 190_000, ratePct: 37 },
    { over: 190_000, upTo: null, ratePct: 45 },
  ],
  medicareLevyPct: 2,
  sourceUrls: [
    "https://www.legislation.gov.au/C2025A00028/asmade/text",
    "https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents",
    "https://www.ato.gov.au/about-ato/new-legislation/in-detail/individuals/personal-income-tax-new-tax-cuts-for-every-australian-taxpayer",
  ],
  verifiedAt: "2026-10-26",
  verified: true,
  note: "Rates read from the amending Act on the Federal Register of Legislation (Sch 1 item 2, 2026-27 table; 14% from 2027-28). ato.gov.au blocks scripted access; ATO search excerpts confirm 'From 1 July 2026, the 16 per cent rate will be reduced to 15 per cent'.",
};

/** The original FY2024-25 scale used by tools/serviceability tax() — kept for parity tests and the staff tool. */
export const TAX_2024_25: TaxScale = {
  incomeYear: "2024-25",
  brackets: [
    { over: 0, upTo: 18_200, ratePct: 0 },
    { over: 18_200, upTo: 45_000, ratePct: 16 },
    { over: 45_000, upTo: 135_000, ratePct: 30 },
    { over: 135_000, upTo: 190_000, ratePct: 37 },
    { over: 190_000, upTo: null, ratePct: 45 },
  ],
  medicareLevyPct: 2,
  sourceUrls: ["https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents"],
  verifiedAt: "2024-07-01",
  verified: true,
  note: "Superseded from 1 July 2026. Retained only so the legacy maths can be reproduced.",
};

/** Income tax + Medicare levy on a gross annual income (no offsets). */
export function incomeTax(gross: number, scale: TaxScale = TAX_2026_27): number {
  const inc = Math.max(0, gross || 0);
  let t = 0;
  for (const b of scale.brackets) {
    if (inc <= b.over) break;
    const top = b.upTo === null ? inc : Math.min(inc, b.upTo);
    t += ((top - b.over) * b.ratePct) / 100;
  }
  return t + (inc * scale.medicareLevyPct) / 100;
}

/** Living-cost benchmarks the maths uses (per month), labelled for display. Indicative only. */
const HOUSEHOLD_LABEL: Record<Household, string> = {
  single: "Single",
  single1: "Single, with dependants",
  couple: "Couple",
  c1: "Couple, 1 dependant",
  c2: "Couple, 2 dependants",
  c3: "Couple, 3 or more dependants",
};
export function livingBenchmarks(S: BorrowAssumptions = BORROW_DEFAULTS) {
  return (Object.keys(GROUPS) as Household[]).map((k) => ({ key: k, label: HOUSEHOLD_LABEL[k] ?? GROUPS[k], monthly: Number((S as unknown as Record<string, number>)[`hem_${k}`]) || 0 }));
}

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
 * Indicative borrowing power with the current tax scale (default TAX_2026_27). Same serviceability maths and the same
 * "price you could buy" logic as the existing
 * ServiceabilityCalculator component (purchase price = min(maxLoan + deposit − costs, (deposit − costs)/(1 − LVR))).
 */
export function estimateBorrowingPower(input: BorrowingInput, assumptions: Partial<BorrowAssumptions> = {}, taxScale: TaxScale = TAX_2026_27): BorrowingResult {
  if (!(input.productRatePct > 0)) throw new Error("productRatePct is required (the user supplies the rate; we never publish rates).");
  const S: BorrowAssumptions = { ...BORROW_DEFAULTS, ...assumptions, fees: { ...BORROW_DEFAULTS.fees, ...(assumptions.fees ?? {}) } };
  const i = toBorrowInputs(input, S);
  const r = compute(S, i, undefined, (inc) => incomeTax(inc, taxScale));
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
      `Tax is estimated with ${taxScale.incomeYear} resident rates plus the ${taxScale.medicareLevyPct}% Medicare levy, without offsets.`,
      "Living costs use the higher of your figure and an indicative household benchmark. Lenders use their own measures (often the Household Expenditure Measure), which can be higher.",
    ],
  };
}

// ---------------------------------------------------------------------------------------------------------
// "Price you could look at": deposit + max loan, less stamp duty and government fees (computed with the verified
// duty engine for the state), capped by a target LVR. Duty depends on the price, so iterate to a fixed point.

export type PurchasePriceInput = {
  maxLoan: number;
  deposit: number;
  /** 0–1, e.g. 0.8 */
  targetLvr: number;
  state: AuState;
  firstHomeBuyer: boolean;
  propertyType?: PropertyType;
  /** Other upfront costs (conveyancing, inspections, lender fees). */
  otherCosts?: number;
};

export function estimatePurchasePrice(p: PurchasePriceInput) {
  const lvr = Math.min(0.99, Math.max(0.01, p.targetLvr || 0.8));
  const other = Math.max(0, p.otherCosts || 0);
  const govt = (price: number) =>
    price > 0
      ? calcStampDuty({ state: p.state, price, propertyType: p.propertyType ?? "established", firstHomeBuyer: p.firstHomeBuyer, ownerOccupier: true, foreignPurchaser: false }).totalGovtCosts
      : 0;
  let price = Math.max(0, p.maxLoan + p.deposit);
  let costs = 0;
  for (let k = 0; k < 12; k++) {
    costs = govt(price) + other;
    const cash = p.deposit - costs;
    const next = Math.max(0, Math.min(p.maxLoan + cash, cash > 0 ? cash / (1 - lvr) : 0));
    if (Math.abs(next - price) < 1) {
      price = next;
      break;
    }
    price = next;
  }
  costs = govt(price) + other;
  const loan = Math.max(0, price - (p.deposit - costs));
  return { price, loan, govtCosts: costs - other, otherCosts: other, lvrPct: price > 0 ? (loan / price) * 100 : 0 };
}
