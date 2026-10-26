/**
 * Types for the programmatic-SEO datasets (suburbs, LGAs, visa policies).
 * Data only — no rendering logic. See README.md in this folder for the data dictionary.
 */

export type StateCode = "NSW" | "VIC" | "QLD" | "WA" | "SA" | "TAS" | "ACT" | "NT";
export const STATE_CODES: readonly StateCode[] = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];

/** Provenance attached to every field group. */
export interface SourceRef {
  /** Human-readable source name, e.g. "ABS, Census of Population and Housing 2021". */
  source: string;
  /** The exact URL the values came from (API query, file download or page). */
  sourceUrl: string;
  licence: string;
  /** Attribution string to show on the page. */
  attribution: string;
  /** Reference year of the data (Census year). */
  year?: number;
  /** Reference quarter, e.g. "2026-Q2". */
  quarter?: string;
  /** Reference period as printed by the publisher, e.g. "April to June 2026". */
  period?: string;
}

// ---------------------------------------------------------------- suburbs

export interface CountryOfBirthCount {
  /** ABS BPLP code (e.g. "7105" = Nepal); null when the country is not itemised in G09. */
  code: string | null;
  name: string;
  count: number;
  /** Share of total persons (incl. "not stated"), 1 dp. */
  pct: number;
}

export interface LgaShare {
  /** ASGS 2021 LGA code. */
  code: string;
  /** ASGS 2021 LGA name with any "(NSW)" suffix removed. */
  name: string;
  /** Share of the suburb's land area inside this LGA (grid-sampled), 1 dp. */
  areaSharePct: number;
}

export interface PostcodeShare {
  /** ABS Postal Area (POA 2021) code — an approximation of the Australia Post postcode. */
  poa: string;
  areaSharePct: number;
}

export interface DwellingMix {
  /** Basis: occupied private dwellings (ABS G36 "OCC"). All values are % of that total, 1 dp. */
  separateHousePct: number;
  semiDetachedPct: number;
  flatApartmentPct: number;
  otherPct: number;
  notStatedPct: number;
  occupiedPrivateDwellings: number;
}

export interface CensusData {
  sourceRef: SourceRef;
  /** ABS QuickStats page for human verification. */
  quickStatsUrl: string;
  /** Exact API queries used, per ABS table id (G01, G02, …). */
  tableUrls: Record<string, string>;

  // G01
  population: number | null;
  bornOverseas: number | null;
  bornOverseasPct: number | null;
  australianCitizenPct: number | null;

  // G09
  nepalBorn: number | null;
  nepalBornPct: number | null;
  /** Top 3 countries of birth excluding Australia (from G09; cross-checked against QuickStats, see topCountriesCheck). */
  topCountriesOfBirth: CountryOfBirthCount[] | null;
  /**
   * "match" = QuickStats top responses (full classification) agree with the G09 ranking;
   * "replaced" = QuickStats differed (a country not itemised in G09 ranks higher) and its values were used;
   * "unchecked" = QuickStats page could not be read.
   */
  topCountriesCheck: "match" | "replaced" | "unchecked";

  // G13
  nepaliSpokenAtHome: number | null;
  nepaliSpokenAtHomePct: number | null;

  // G10 (overseas-born persons by year of arrival)
  /** Overseas-born persons who arrived 2016 – Census night 2021. */
  arrived2016to2021: number | null;
  /** arrived2016to2021 as % of total population (G01 P_1), 1 dp. */
  arrivedLast5yrsPct: number | null;
  /** arrived2016to2021 as % of overseas-born persons (G10 total), 1 dp. */
  arrivedLast5yrsPctOfOverseasBorn: number | null;

  // G02
  medianAge: number | null;
  medianHouseholdIncomeWk: number | null;
  medianPersonalIncomeWk: number | null;
  medianRentWk2021: number | null;
  medianMortgageRepayMth2021: number | null;
  avgHouseholdSize: number | null;

  // G37 (occupied private dwellings by tenure)
  occupiedPrivateDwellings: number | null;
  renterPct: number | null;
  ownerWithMortgagePct: number | null;
  ownedOutrightPct: number | null;

  // G36
  dwellingMix: DwellingMix | null;

  // G62 (employed persons aged 15+, travel to work on Census day)
  /** Employed persons whose trip to work included a train (train only, train + 1, train + 2 methods) as % of all employed persons, 1 dp. */
  trainToWorkPct: number | null;
  /** Context for trainToWorkPct: Census day 10 Aug 2021 fell in the Greater Sydney COVID-19 lockdown. */
  workedAtHomePct: number | null;
  employedPersons: number | null;
}

export interface DcjSales {
  sourceRef: SourceRef;
  /** Geography the figures are reported for. "lga" = postcode figure suppressed, LGA fallback used. */
  geography: "postcode" | "lga";
  geographyName: string;
  /** Median sale price in AUD (DCJ publishes $'000s; multiplied by 1000 here). */
  medianSalePriceStrata: number | null;
  strataSales: number | null;
  /** True when DCJ flags the count with "s" (11–30 sales — treat with caution). */
  strataSmallSample: boolean;
  medianSalePriceNonStrata: number | null;
  nonStrataSales: number | null;
  nonStrataSmallSample: boolean;
  medianSalePriceAll: number | null;
  allSales: number | null;
  allSmallSample: boolean;
}

export interface DcjRentRow {
  dwellingType: "Total" | "House" | "Townhouse" | "Flat/Unit" | "Other";
  bedrooms: "Total" | "Bedsitter" | "1 Bedroom" | "2 Bedrooms" | "3 Bedrooms" | "4 or more Bedrooms" | "Not Specified";
  medianWk: number;
  /** New bonds lodged in the quarter; null when DCJ shows "s" (11–30). */
  newBonds: number | null;
  smallSample: boolean;
}

export interface DcjRent {
  sourceRef: SourceRef;
  geography: "postcode" | "lga";
  geographyName: string;
  /** Median weekly rent for new bonds, all dwellings, all bedrooms. */
  medianRentWkLatest: number | null;
  /** Every dwelling-type × bedrooms row with a published median. */
  rows: DcjRentRow[];
}

export interface NearbySuburb {
  salCode: string;
  slug: string;
  name: string;
  distanceKm: number;
}

export type SelectionRule = "nepalBorn>=500" | "overseas>=50%&renters>=50%" | "none";

export interface Completeness {
  score: number;
  of: 14;
  missing: string[];
}

export interface SuburbRecord {
  salCode: string;
  name: string;
  /** URL slug: "{name}-{postcode}", e.g. "rockdale-2216". */
  slug: string;
  state: StateCode;
  postcode: string;
  batch: 1 | 2;
  /** ASGS GCCSA name of the centroid, e.g. "Greater Sydney" / "Rest of NSW". */
  gccsa: string | null;
  selectionRule: SelectionRule;

  /** Primary LGA = largest area share. */
  lga: LgaShare | null;
  /** All LGAs covering ≥1% of the suburb's area. Length > 1 ⇒ suburb straddles LGAs. */
  lgas: LgaShare[];
  /** ASGS POA overlap — used to sanity-check `postcode`. */
  poaShares: PostcodeShare[];
  centroid: { lat: number; lng: number } | null;
  areaSqKm: number | null;
  geoSourceRef: SourceRef;

  census: CensusData;
  dcj: {
    /** Postcode-level sales; falls back to the primary LGA only when the postcode has no strata/non-strata median. */
    sales: DcjSales | null;
    /** Primary-LGA sales for context (e.g. a house median when the postcode's is suppressed). */
    salesLga: DcjSales | null;
    rent: DcjRent | null;
    /** Other dataset suburbs that share this postcode (postcode-level DCJ figures are shared). */
    postcodeSharedWith: string[];
    note: string | null;
  };
  /** Up to 6 dataset suburbs within 25 km, nearest first (UI filters to published and shows 3–5). */
  nearest: NearbySuburb[];
  completeness: Completeness;
  /** Data caveats specific to this suburb. */
  notes: string[];
}

export interface SuburbDataset {
  pulledAt: string;
  generator: string;
  sources: Record<string, SourceRef>;
  /** Dataset-wide caveats. */
  notes: string[];
  suburbs: SuburbRecord[];
}

// ---------------------------------------------------------------- visas

export type Tri = "yes" | "no" | "conditional" | "unknown";

/** Residency class used to look up state rules. */
export type ResidencyClass = "citizen" | "permanent" | "nz444" | "temporary";

export interface Sourced {
  sourceUrls: string[];
  verified: boolean;
  verifiedAt: string;
  note?: string;
}

export interface StateResidencyRule extends Sourced {
  state: StateCode;
  residencyClass: Exclude<ResidencyClass, "citizen">;
  /** Foreign purchaser surcharge/additional duty applies to this class? */
  surcharge: Tri;
  surchargeNote: string;
  /** First-home-buyer transfer duty concession/exemption available to this class? */
  fhbConcession: Tri;
  fhbConcessionNote: string;
  /** First Home Owner Grant available to this class? */
  fhog: Tri;
  fhogNote: string;
}

export interface FirbStatus extends Sourced {
  /** Is the buyer a "foreign person" for residential land under FATA? */
  foreignPerson: Tri;
  /** Needs FIRB approval to buy residential land? */
  approvalRequired: Tri;
  note: string;
}

export interface EstablishedDwellingBan extends Sourced {
  applies: Tri;
  /** ISO date the ban started. */
  from: string | null;
  /** ISO date the ban ends (as currently announced). */
  to: string | null;
  note: string;
}

export interface VisaPolicy {
  /** Route slug under /visa-home-loans/. */
  slug: string;
  /** Subclass numbers covered, e.g. ["491"], ["820", "801"]. Empty for general categories. */
  subclasses: string[];
  name: string;
  homeAffairsUrl: string | null;
  permanent: boolean | "mixed";
  /** "mixed" for two-stage visas (partner): the record's FIRB/state fields describe the temporary stage; see `stages`. */
  residencyClass: ResidencyClass | "mixed";
  stages?: { subclasses: string[]; permanent: boolean; residencyClass: Exclude<ResidencyClass, "citizen">; note: string }[];
  stayNote: string;
  firb: FirbStatus;
  establishedDwellingBan: EstablishedDwellingBan;
  newDwellingFirb: Sourced & { required: Tri; note: string };
  regionalCondition: (Sourced & { applies: boolean; conditionCode: string | null; note: string }) | null;
  /** Per-state eligibility summaries (numbers live in the stamp-duty/StateRules engine). */
  stateRules: StateResidencyRule[];
  fiveDepositScheme: Sourced & { eligible: Tri; note: string };
  helpToBuy: Sourced & { eligible: Tri; note: string };
  /** Typical lender document requests (lending practice, not a government rule) — broker to confirm. */
  typicalDocuments: string[];
  pathway: (Sourced & { note: string }) | null;
  /** Broker-verified LVR range — intentionally null until the broker supplies it. */
  typicalMaxLvrRange: string | null;
  verifiedAt: string;
  /** Overall: every fact on this record verified against an official source. */
  verified: boolean;
  unverifiedNotes: string[];
}
