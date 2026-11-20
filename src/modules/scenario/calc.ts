// Server-side funding / LVR / repayment arithmetic for a scenario. Pure (no DB).
// Every figure carries whether it was entered, estimated or derived, and what is missing.
import { calcStampDuty } from "@/modules/calc/stampDuty";
import { annuityPayment } from "@/modules/calc/repayments";
import type { AuState, PropertyType } from "@/modules/calc/types";
import { applicantIds, bool, num, str, type Facts } from "./facts";

export const CALC_VERSION = "scn-calc-2026-11-20";

export type Line = { key: string; label: string; amount: number | null; basis: "entered" | "estimate" | "derived" | "missing"; note?: string };

export type ScenarioCalc = {
  version: string;
  purpose: "purchase" | "refinance" | null;
  securityValue: number | null;
  securityBasis: string;
  costs: Line[];
  totalCosts: number | null;
  contributions: Line[];
  totalContributions: number | null;
  fundsRequired: number | null;
  loanNeeded: number | null; // what the numbers say is needed (before capitalised LMI)
  loanUsed: number | null; // the loan the comparison uses (requested amount, else loanNeeded)
  loanBasis: string;
  lmiCapitalised: number;
  totalLoan: number | null; // loanUsed + capitalised LMI
  lvrPct: number | null; // loanUsed / security
  lvrInclLmiPct: number | null;
  depositPct: number | null;
  genuineSavingsPct: number | null;
  fundingGap: number | null; // positive = shortfall
  termYears: number;
  repaymentType: "PI" | "IO";
  ioYears: number;
  duty: { amount: number | null; estimate: boolean; source: string; unverifiedRules: boolean; concession?: string } | null;
  missing: string[]; // fact keys
  assumptions: string[];
  flags: string[];
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 10000) / 100 : null);

function dutyType(t: string | null, newBuild: boolean | null): PropertyType {
  if (t === "land") return "vacant-land";
  if (t === "off_the_plan") return "off-the-plan";
  if (newBuild || t === "construction") return "new";
  return "established";
}

export function calcScenario(f: Facts, today = new Date()): ScenarioCalc {
  const missing: string[] = [];
  const assumptions: string[] = [];
  const flags: string[] = [];
  const need = (k: string, v: number | string | boolean | null) => {
    if (v === null) missing.push(k);
    return v;
  };

  const purpose = (str(f, "loan.purpose") as "purchase" | "refinance" | null) ?? null;
  need("loan.purpose", purpose);
  const termYears = num(f, "loan.termYears") ?? 30;
  if (num(f, "loan.termYears") === null) assumptions.push("Loan term assumed 30 years (not entered).");
  const repaymentType = (str(f, "loan.repayment") as "PI" | "IO" | null) ?? "PI";
  if (!str(f, "loan.repayment")) assumptions.push("Principal & interest repayments assumed (preference not entered).");
  const ioYears = repaymentType === "IO" ? num(f, "loan.ioYears") ?? 5 : 0;
  if (repaymentType === "IO" && num(f, "loan.ioYears") === null) assumptions.push("Interest-only period assumed 5 years.");

  const price = num(f, "prop.price");
  const valuation = num(f, "prop.valuation");
  const requested = num(f, "loan.amount");

  let securityValue: number | null = null;
  let securityBasis = "";
  if (purpose === "refinance") {
    securityValue = valuation;
    securityBasis = valuation !== null ? "Valuation / estimated value (refinance)" : "Unknown — valuation needed";
    need("prop.valuation", valuation);
  } else {
    need("prop.price", price);
    if (price !== null && valuation !== null) {
      securityValue = Math.min(price, valuation);
      securityBasis = valuation < price ? "Valuation (lower than price)" : "Purchase price (lower of price and valuation)";
    } else if (price !== null) {
      securityValue = price;
      securityBasis = "Purchase price (no valuation yet — lender valuation may differ)";
      assumptions.push("Security value = purchase price until a valuation is available.");
    }
  }

  /* ---- costs */
  const costs: Line[] = [];
  let duty: ScenarioCalc["duty"] = null;
  if (purpose !== "refinance") {
    const brokerDuty = num(f, "con.duty");
    if (brokerDuty !== null) {
      duty = { amount: brokerDuty, estimate: false, source: str(f, "con.dutySource") ?? "Broker-entered", unverifiedRules: false };
      if (!str(f, "con.dutySource")) flags.push("Stamp duty figure has no source recorded.");
    } else {
      const state = str(f, "prop.state") as AuState | null;
      const fhb = bool(f, "prop.firstHome");
      const occ = str(f, "loan.occupancy");
      const residencies = applicantIds(f).map((a) => str(f, `${a}.residency`));
      const foreign = residencies.length > 0 && residencies.every((r) => r === "foreign_non_resident" || r === "temporary_visa");
      const known = state && price !== null && fhb !== null && occ && residencies.every((r) => r !== null);
      if (known) {
        const d = calcStampDuty({
          state: state as AuState, price: price as number, propertyType: dutyType(str(f, "prop.type"), bool(f, "prop.newBuild")),
          firstHomeBuyer: Boolean(fhb), foreignPurchaser: foreign, ownerOccupier: occ === "owner_occupied",
          citizenOrPR: !foreign, withMortgage: true, contractDate: today.toISOString().slice(0, 10),
        });
        duty = { amount: r2(d.transferDuty + d.surcharge), estimate: true, source: `State duty engine ${d.rulesVersion} (verified ${d.rulesVerifiedAt})`, unverifiedRules: d.hasUnverified, concession: d.concessionName };
        if (num(f, "con.govtFees") === null) costs.push({ key: "con.govtFees", label: "Government fees (estimate)", amount: r2(d.mortgageRegFee + d.transferFee), basis: "estimate", note: "Mortgage registration + transfer fee" });
        if (foreign) flags.push("Duty estimate assumes all purchasers are foreign persons (surcharge on 100%). Mixed ownership needs the revenue office calculator.");
        if (d.hasUnverified) flags.push("Duty estimate uses a rule group marked unverified — check the official calculator.");
        assumptions.push("Stamp duty is an estimate from the state rules engine — confirm with the conveyancer.");
      } else {
        duty = { amount: null, estimate: true, source: "Not enough facts (state, price, first home, occupancy, residency)", unverifiedRules: false };
        missing.push("con.duty");
      }
    }
    costs.unshift({ key: "con.duty", label: "Stamp duty / surcharge", amount: duty.amount, basis: duty.amount === null ? "missing" : duty.estimate ? "estimate" : "entered", note: duty.source });
    const gov = num(f, "con.govtFees");
    if (gov !== null) costs.push({ key: "con.govtFees", label: "Government fees", amount: gov, basis: "entered" });
  }
  const legal = num(f, "con.legal");
  costs.push({ key: "con.legal", label: "Legal / conveyancing", amount: legal, basis: legal === null ? "missing" : "entered" });
  if (legal === null) assumptions.push("Legal / conveyancing costs not entered — excluded from totals.");
  const other = num(f, "con.otherCosts");
  if (other !== null) costs.push({ key: "con.otherCosts", label: "Other costs", amount: other, basis: "entered" });
  const lmi = num(f, "con.lmi");
  const lmiCap = bool(f, "con.lmiCapitalised") === true;
  if (lmi !== null && !lmiCap) costs.push({ key: "con.lmi", label: "LMI (paid upfront)", amount: lmi, basis: "entered", note: str(f, "con.lmiSource") ?? "no source recorded" });
  if (lmi !== null && !str(f, "con.lmiSource")) flags.push("LMI premium has no source recorded.");

  const known = costs.filter((c) => c.amount !== null);
  const totalCosts = costs.some((c) => c.basis === "missing" && c.key === "con.duty") ? null : r2(known.reduce((s, c) => s + (c.amount ?? 0), 0));

  /* ---- contributions */
  const savings = num(f, "con.savings");
  const gift = num(f, "con.gift");
  const equity = num(f, "con.equity");
  const contributions: Line[] = [
    { key: "con.savings", label: "Savings", amount: savings, basis: savings === null ? "missing" : "entered" },
    { key: "con.gift", label: "Gifted funds", amount: gift, basis: gift === null ? "missing" : "entered" },
    { key: "con.equity", label: "Equity", amount: equity, basis: equity === null ? "missing" : "entered" },
  ];
  if (purpose !== "refinance") need("con.savings", savings);
  const totalContributions = savings === null && purpose !== "refinance" ? null : r2((savings ?? 0) + (gift ?? 0) + (equity ?? 0));
  if (purpose !== "refinance" && savings !== null && (gift === null || equity === null)) assumptions.push("Unknown gift / equity treated as $0.");

  /* ---- loan */
  let fundsRequired: number | null = null;
  let loanNeeded: number | null = null;
  if (purpose === "refinance") {
    const bal = num(f, "prop.existingBalance");
    need("prop.existingBalance", bal);
    if (bal !== null) {
      fundsRequired = r2(bal + (totalCosts ?? 0));
      loanNeeded = fundsRequired;
    }
  } else if (price !== null && totalCosts !== null) {
    fundsRequired = r2(price + totalCosts);
    if (totalContributions !== null) loanNeeded = r2(Math.max(0, fundsRequired - totalContributions));
  }
  let loanUsed: number | null = requested ?? loanNeeded;
  const loanBasis = requested !== null ? "Requested loan amount" : loanNeeded !== null ? "Derived: funds required − contributions" : "Unknown";
  if (requested === null) {
    if (loanNeeded !== null) assumptions.push("Loan amount derived from funds required less contributions (no requested amount).");
    else missing.push("loan.amount");
  }
  if (loanUsed !== null) loanUsed = r2(loanUsed);
  const lmiCapitalised = lmiCap && lmi !== null ? lmi : 0;
  if (lmiCap && lmi === null) flags.push("LMI marked capitalised but no premium entered.");
  const totalLoan = loanUsed !== null ? r2(loanUsed + lmiCapitalised) : null;

  const lvrPct = loanUsed !== null && securityValue ? pct(loanUsed, securityValue) : null;
  const lvrInclLmiPct = totalLoan !== null && securityValue ? pct(totalLoan, securityValue) : null;
  const depositPct = purpose !== "refinance" && price && loanUsed !== null ? pct(price - loanUsed, price) : null;
  const genuineSavingsPct = purpose !== "refinance" && price && savings !== null ? pct(savings, price) : null;
  const fundingGap =
    purpose === "refinance"
      ? fundsRequired !== null && loanUsed !== null ? r2(fundsRequired - loanUsed - (totalContributions ?? 0)) : null
      : fundsRequired !== null && totalContributions !== null && loanUsed !== null ? r2(fundsRequired - totalContributions - loanUsed) : null;
  if (fundingGap !== null && fundingGap > 0) flags.push(`Funding shortfall of $${fundingGap.toLocaleString("en-AU")} at the requested loan amount.`);
  if (lvrPct !== null && lvrPct > 80 && lmi === null) flags.push("LVR above 80% — LMI likely unless a guarantee scheme or waiver applies; no LMI figure entered.");

  return {
    version: CALC_VERSION, purpose, securityValue, securityBasis, costs, totalCosts, contributions, totalContributions,
    fundsRequired, loanNeeded, loanUsed, loanBasis, lmiCapitalised, totalLoan, lvrPct, lvrInclLmiPct, depositPct, genuineSavingsPct,
    fundingGap, termYears, repaymentType, ioYears, duty, missing: Array.from(new Set(missing)), assumptions, flags,
  };
}

/** Monthly repayment on the same loan assumptions for every option. */
export function monthlyRepayment(principal: number, ratePct: number, termYears: number, type: "PI" | "IO", ioYears = 0) {
  const r = ratePct / 100 / 12;
  if (type === "IO") return { initial: r2(principal * r), after: r2(annuityPayment(principal, r, Math.max(1, (termYears - ioYears) * 12))) };
  const p = r2(annuityPayment(principal, r, termYears * 12));
  return { initial: p, after: p };
}
