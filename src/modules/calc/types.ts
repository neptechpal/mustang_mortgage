// Types for government rules data (state duty, grants, surcharges, fees) and the stamp-duty engine.
// Every fact group carries provenance: sourceUrls + verifiedAt (+ verified:false and a note when a value
// could not be confirmed on the official source). See README.md for the update policy.

export type AuState = "NSW" | "VIC" | "QLD" | "WA" | "SA" | "ACT" | "TAS" | "NT";
export const AU_STATES: AuState[] = ["NSW", "VIC", "QLD", "WA", "SA", "ACT", "TAS", "NT"];

/** What is being bought. "new" = never lived in (incl. substantially renovated); "off-the-plan" = contract before completion. */
export type PropertyType = "established" | "new" | "vacant-land" | "off-the-plan";
export const HOME_TYPES: PropertyType[] = ["established", "new", "off-the-plan"];
export const NEW_HOME_TYPES: PropertyType[] = ["new", "off-the-plan"];

export type Provenance = {
  /** Official pages / PDFs / legislation the values were checked against. */
  sourceUrls: string[];
  /** ISO date (YYYY-MM-DD) the values were last checked against the sources. */
  verifiedAt: string;
  /** false = could not be confirmed on an official source; do not present as fact. */
  verified: boolean;
  note?: string;
};

// ---------------------------------------------------------------------------------------------------------
// Duty scales

export type Bracket =
  /** duty = base + ratePct% × (value − over), for value ≤ upTo (null = no upper limit). */
  | { kind: "marginal"; upTo: number | null; over: number; base: number; ratePct: number }
  /** duty = ratePct% × whole value (e.g. VIC $960k–$2m band, NT over $525k). */
  | { kind: "whole"; upTo: number | null; ratePct: number }
  /** duty = a·V² + b·V where V = value / unit (NT formula up to $525,000). */
  | { kind: "quadratic"; upTo: number | null; a: number; b: number; unit: number };

/** "dollar-half-down": nearest dollar, 50c rounds down (VIC Duties Act s 28(1)). "down-5c": down to a multiple of 5 cents (RevenueWA calculator). */
export type RoundMode = "cents" | "dollar-nearest" | "dollar-half-down" | "dollar-down" | "dollar-up" | "down-5c";

export type DutyScale = Provenance & {
  id: string;
  label: string;
  /** Contract date from which this table applies. */
  effectiveFrom: string;
  brackets: Bracket[];
  /** Round the dutiable value UP to a multiple of this before applying brackets ("for every $100 or part"). */
  roundValueUpTo?: number;
  /** Minimum duty payable when any duty is payable. */
  minimumDuty?: number;
  /** Duty below this amount is not payable at all (ACT Duties Act s 229: under $20 → nil). */
  nilIfBelow?: number;
  /** Rounding of the final duty figure. Default "cents". */
  roundDuty?: RoundMode;
};

/** A concessional scale for owner-occupiers that applies regardless of first-home status (e.g. VIC PPR, QLD home concession). */
export type OwnerOccupierScale = {
  scale: DutyScale;
  /** Only available when value is within [minValue, maxValue] (inclusive). */
  minValue?: number;
  maxValue?: number;
  /** Property types it applies to. */
  appliesTo: PropertyType[];
  /** Buyers must be Australian citizens / permanent residents (e.g. QLD "specified resident" from 1 Aug 2026). */
  requiresCitizenOrPR?: boolean;
  conditions: string[];
};

// ---------------------------------------------------------------------------------------------------------
// Duty concessions / exemptions (first home buyer schemes and other modelled exemptions)

export type FhbBand =
  /** No duty when value ≤ upTo. Use Infinity for "no value cap". */
  | { kind: "exempt"; upTo: number }
  /** NSW: saving = D(from) × (below − value)/(below − from), for from < value < below. */
  | { kind: "taper-saving-from-lower"; from: number; below: number }
  /** duty = D(value) × (value − from)/(below − from), for from < value < below. */
  | { kind: "taper-duty"; from: number; below: number; roundResult?: RoundMode }
  /** duty = base + ratePct% × (value − from), value rounded up to `roundValueUpTo`, for from < value ≤ upTo. */
  | { kind: "marginal"; from: number; upTo: number; base: number; ratePct: number; roundValueUpTo?: number; roundResult?: RoundMode }
  /** Stepped concession amount subtracted from the base duty: first row whose upTo ≥ value (QLD style). */
  | { kind: "concession-table"; from: number; rows: { upTo: number; concession: number }[] }
  /** Saving = min(D(value), maxSaving) for value ≤ upTo. */
  | { kind: "max-saving"; upTo: number; maxSaving: number };

export type DutyConcession = Provenance & {
  id: string;
  name: string;
  /** true for first-home schemes; false for concessions open to any eligible owner-occupier (e.g. ACT off-the-plan unit exemption). */
  requiresFirstHomeBuyer: boolean;
  effectiveFrom: string;
  /** Contract date after which it no longer applies (exclusive), if it is time-limited. */
  effectiveTo?: string;
  appliesTo: PropertyType[];
  /** Which duty scale D(value) the bands are computed from. */
  baseScale: "general" | "owner-occupier";
  /** Evaluated in order; above the last band there is no concession. */
  bands: FhbBand[];
  requiresCitizenOrPR: boolean;
  requiresOwnerOccupier: boolean;
  /** Household income cap (gross, previous financial year) if the scheme is income tested. */
  incomeCap?: { base: number; perDependant?: number; note?: string };
  eligibility: string[];
  /** Shown with the result when this concession is applied (assumptions the user must check). */
  appliedNote?: string;
};
/** @deprecated alias */
export type FhbConcession = DutyConcession;

// ---------------------------------------------------------------------------------------------------------
// Grants, surcharge, fees, other concessions

export type Grant = Provenance & {
  id: string;
  name: string;
  amount: number;
  /** Property types that can qualify. Vacant land qualifies only with a building contract (see buildCap). */
  appliesTo: PropertyType[];
  /** Max purchase price of a new home (null = no cap). */
  priceCap: number | null;
  /** Caps are "less than" rather than "not more than" (e.g. QLD "less than $750,000"). */
  capIsExclusive?: boolean;
  /** Max land + building contract value when building (null = no cap; undefined = same as priceCap). */
  buildCap?: number | null;
  /** Alternative caps (e.g. WA north of the 26th parallel). */
  regionalCap?: { label: string; priceCap: number | null; buildCap?: number | null };
  requiresCitizenOrPR: boolean;
  requiresFirstHomeBuyer: boolean;
  /** Only for buyers who are NOT first home buyers (e.g. NT FreshStart New Home Grant). */
  nonFirstHomeBuyersOnly?: boolean;
  /** Must live in the home (all current grants require it). Default true. */
  requiresOwnerOccupier?: boolean;
  effectiveFrom?: string;
  /** Contract-date end (exclusive) of this grant amount, if time-limited. */
  effectiveTo?: string;
  eligibility: string[];
};

export type ForeignSurcharge = Provenance & {
  name: string;
  /** Percent of the dutiable value. 0 = no surcharge in this jurisdiction. */
  ratePct: number;
  effectiveFrom?: string;
  roundTo?: RoundMode;
  /** In this state a foreign purchaser is by definition not an Australian citizen/PR, so they also lose
   *  citizen/PR-only concessions (QLD s 235). False where PRs can be "foreign" (NSW 200-day rule). */
  foreignMeansNotCitizenOrPR?: boolean;
  /** Who is treated as foreign (plain English). */
  whoPays: string[];
  exemptions: string[];
};

export type FeeRule =
  | { kind: "flat"; amount: number }
  /** base for value ≤ over; then + perStep for every `step` (or part) above `over`; optional cap on the total. */
  | { kind: "stepped"; base: number; over: number; step: number; perStep: number; max?: number }
  /** First row whose upTo ≥ value; `above` handles values past the last row. */
  | {
      kind: "table";
      rows: { upTo: number; fee: number }[];
      above?: { base: number; over: number; step: number; perStep: number; max?: number };
    }
  /** base + perThousand × (value / 1000) [rounded per `roundThousands`], then `roundResult`, capped at max. */
  | { kind: "per-thousand"; base: number; perThousand: number; max?: number; roundThousands?: "up" | "down" | "none"; roundResult?: RoundMode };

export type GovtFees = Provenance & {
  /** Who charges them (land titles office). */
  authority: string;
  effectiveFrom: string;
  mortgageRegistration: FeeRule;
  transfer: FeeRule;
  notes?: string[];
};

/**
 * A concession applied to the total duty (transfer duty + surcharge) as a percentage that tapers with value, capped
 * (WA off-the-plan duty concession, Duties Act 2008 ss 266I–266L). Percentage: fullPct up to fullUpTo; floorPct from
 * floorFrom; in between fullPct − stepPctPer100 × whole $100s above fullUpTo.
 */
export type TotalDutyConcession = Provenance & {
  id: string;
  name: string;
  appliesTo: PropertyType[];
  effectiveFrom?: string;
  effectiveTo?: string;
  includesSurcharge: boolean;
  fullUpTo: number;
  floorFrom: number;
  stages: Record<OffThePlanStage, { fullPct: number; floorPct: number; stepPctPer100: number }>;
  maxSaving: number;
  /** Rounding applied to the payable amount after the concession. */
  roundPayable?: RoundMode;
  eligibility: string[];
  appliedNote?: string;
};

export type OffThePlanStage = "pre-construction" | "under-construction";

export type InfoConcession = Provenance & {
  id: string;
  name: string;
  summary: string;
  /** true when calcStampDuty applies it; false = information only (shown as a note / link). */
  modelled: boolean;
  appliesTo?: PropertyType[];
  effectiveFrom?: string;
  effectiveTo?: string;
};

export type StateRules = {
  state: AuState;
  name: string;
  revenueOffice: string;
  revenueOfficeUrl: string;
  /** Financial year the duty tables belong to, e.g. "2026-27". */
  rulesVersion: string;
  generalScale: DutyScale;
  ownerOccupierScale?: OwnerOccupierScale;
  /** First-home and other modelled duty concessions/exemptions. The lowest eligible duty wins. */
  concessions: DutyConcession[];
  grants: Grant[];
  foreignSurcharge: ForeignSurcharge;
  /** Concessions on total duty (after first-home concessions and surcharge), e.g. WA off-the-plan. */
  totalDutyConcessions?: TotalDutyConcession[];
  otherConcessions: InfoConcession[];
  govtFees: GovtFees;
  /** State-specific notes always shown with results. */
  notes?: string[];
};

// ---------------------------------------------------------------------------------------------------------
// Engine I/O

export type StampDutyInput = {
  state: AuState;
  /** Dutiable value: the higher of price and market value. */
  price: number;
  propertyType: PropertyType;
  firstHomeBuyer: boolean;
  /** Any purchaser is a foreign person for the state surcharge (whole property assumed). */
  foreignPurchaser: boolean;
  /** Will live in the property as principal place of residence. */
  ownerOccupier: boolean;
  /** At least one purchaser is an Australian citizen or permanent resident. Default true. */
  citizenOrPR?: boolean;
  /** Vacant land: value of the building contract (for FHOG land+build caps). */
  buildContractPrice?: number;
  /** Outside the capital / in the regional zone where a state uses different caps (e.g. WA north of 26th parallel). */
  regional?: boolean;
  /** Gross household income for income-tested schemes (ACT). */
  householdIncome?: number;
  dependants?: number;
  /** Off-the-plan: construction stage at the contract date (WA concession). Default "pre-construction". */
  offThePlanStage?: OffThePlanStage;
  /** Include the mortgage registration fee (true when buying with a loan). Default true. */
  withMortgage?: boolean;
  /** ISO contract date. Default today. Used only to warn when outside the rules' effective dates. */
  contractDate?: string;
};

export type BreakdownLine = { label: string; amount: number; detail?: string };

export type StampDutyResult = {
  state: AuState;
  price: number;
  /** Duty before any first-home concession (general or owner-occupier scale). */
  baseDuty: number;
  scaleUsed: string;
  /** Transfer duty payable after concessions (excludes the foreign surcharge). */
  transferDuty: number;
  /** First-home (or other modelled) concession: baseDuty − transferDuty. */
  concession: number;
  concessionName?: string;
  surcharge: number;
  /** Off-the-plan (total duty) concession, already deducted from transferDuty/surcharge. */
  offThePlanConcession: number;
  mortgageRegFee: number;
  transferFee: number;
  /** transferDuty + surcharge + mortgageRegFee + transferFee. */
  totalGovtCosts: number;
  fhogEligible: boolean;
  fhogAmount: number;
  /** Other grants (e.g. NT HomeGrown Territory Grant) the inputs appear eligible for. */
  otherGrants: { name: string; amount: number }[];
  notes: string[];
  breakdown: BreakdownLine[];
  rulesVerifiedAt: string;
  rulesVersion: string;
  /** True if any fact group used is unverified. */
  hasUnverified: boolean;
  sources: { label: string; url: string; verifiedAt: string }[];
};
