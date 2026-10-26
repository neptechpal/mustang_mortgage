// Deposit / LVR / LMI-indicator calculator.
// LMI is shown only as an indicator ("likely applies above 80% LVR"). We do not estimate LMI premiums:
// premiums are set by each insurer/lender and there is no published, citable table to use.

import { round2 } from "./money";
import { calcStampDuty } from "./stampDuty";
import { depositSchemeCheck, type DepositSchemeArea } from "./rules/federal";
import type { AuState, StampDutyInput, StampDutyResult } from "./types";

export const LMI_LVR_THRESHOLD_PCT = 80;

export type DepositInput = {
  price: number;
  /** Deposit percentages to show. Default [5, 10, 20]. */
  depositPcts?: number[];
  /** Optional: the buyer's actual savings available for the deposit (after costs if `includeGovtCosts`). */
  savings?: number;
  /** Optional stamp duty inputs: when given, government costs are added to the cash needed. */
  stampDuty?: Omit<StampDutyInput, "price">;
  /** Other upfront costs to include in cash needed (conveyancing, inspections, lender fees). Default 0. */
  otherCosts?: number;
  /** For the 5% Deposit Scheme cap check: capital city & regional centre vs rest of state. */
  schemeArea?: DepositSchemeArea;
};

export type DepositRow = {
  depositPct: number;
  deposit: number;
  loan: number;
  lvrPct: number;
  /** True when LVR > 80%: lenders usually require lenders mortgage insurance (LMI). */
  lmiLikely: boolean;
  /** Deposit + government costs + other costs. */
  cashNeeded: number;
};

export type DepositResult = {
  price: number;
  rows: DepositRow[];
  /** From `savings`, if given. */
  fromSavings?: DepositRow & { shortfallFor20Pct: number };
  govtCosts: number;
  stampDuty?: StampDutyResult;
  /** 5% Deposit Scheme (no LMI with a 5% deposit) price-cap check, if a state is known. */
  depositScheme?: ReturnType<typeof depositSchemeCheck>;
  notes: string[];
};

function row(price: number, depositPct: number, upfront: number): DepositRow {
  const deposit = round2((price * depositPct) / 100);
  const loan = round2(Math.max(0, price - deposit));
  const lvrPct = price > 0 ? round2((loan / price) * 100) : 0;
  return { depositPct, deposit, loan, lvrPct, lmiLikely: lvrPct > LMI_LVR_THRESHOLD_PCT, cashNeeded: round2(deposit + upfront) };
}

export function calcDeposit(input: DepositInput): DepositResult {
  const price = Math.max(0, input.price || 0);
  const pcts = input.depositPcts?.length ? input.depositPcts : [5, 10, 20];
  const notes: string[] = [];
  let duty: StampDutyResult | undefined;
  if (input.stampDuty) duty = calcStampDuty({ ...input.stampDuty, price });
  const govtCosts = duty ? duty.totalGovtCosts : 0;
  const upfront = govtCosts + Math.max(0, input.otherCosts || 0);

  const rows = pcts.map((p) => row(price, p, upfront));
  let fromSavings: DepositResult["fromSavings"];
  if (input.savings !== undefined && price > 0) {
    const dep = Math.max(0, input.savings - upfront);
    const pct = round2((dep / price) * 100);
    fromSavings = { ...row(price, pct, upfront), deposit: round2(dep), shortfallFor20Pct: round2(Math.max(0, price * 0.2 + upfront - input.savings)) };
    fromSavings.loan = round2(Math.max(0, price - dep));
    fromSavings.lvrPct = round2((fromSavings.loan / price) * 100);
    fromSavings.lmiLikely = fromSavings.lvrPct > LMI_LVR_THRESHOLD_PCT;
  }

  let depositScheme: DepositResult["depositScheme"];
  const state: AuState | undefined = input.stampDuty?.state;
  if (state) {
    depositScheme = depositSchemeCheck(state, price, input.schemeArea ?? "capital");
  }

  notes.push("Lenders mortgage insurance (LMI) usually applies when you borrow more than 80% of the property value. The premium depends on the lender and insurer, so we don't estimate it.");
  if (depositScheme?.withinCap) notes.push(depositScheme.message);
  else if (depositScheme) notes.push(depositScheme.message);
  if (duty) notes.push("Cash needed includes the estimated stamp duty and government registration fees" + (input.otherCosts ? " plus your other costs." : "."));
  notes.push("Lenders also check your genuine savings, income and expenses. Some accept gifts or a guarantor for part of the deposit.");

  return { price, rows, fromSavings, govtCosts, stampDuty: duty, depositScheme, notes };
}
