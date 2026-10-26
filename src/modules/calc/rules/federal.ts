// Commonwealth schemes: 5% Deposit Scheme (Home Guarantee), Help to Buy, FIRB established-dwelling ban,
// First Home Super Saver. Verified 2026-10-26 against firsthomebuyers.gov.au, foreigninvestment.gov.au and
// ATO pages (ATO blocks scripted access; ATO text read from Wayback copies of the official pages, dated below).

import type { AuState, Provenance } from "../types";

const V = "2026-10-26";
const SRC = {
  caps: "https://firsthomebuyers.gov.au/australian-government-5-percent-deposit-scheme/property-price-caps",
  scheme: "https://firsthomebuyers.gov.au/australian-government-5-percent-deposit-scheme",
  fhbElig: "https://firsthomebuyers.gov.au/node/69409",
  singleParent: "https://firsthomebuyers.gov.au/node/69410",
  pmRelease: "https://www.pm.gov.au/media/uncapped-5-cent-deposits-available-first-home-buyers-today",
  htb: "https://firsthomebuyers.gov.au/australian-government-help-buy-scheme",
  htbCaps: "https://firsthomebuyers.gov.au/help-buy-tools-and-resources/help-buy-property-price-caps",
  htbThresholds: "https://firsthomebuyers.gov.au/htb-thresholds",
  firbResidential: "https://foreigninvestment.gov.au/guidance/types-investments/residential-land",
  firbKeyConcepts: "https://foreigninvestment.gov.au/guidance/general/key-concepts",
  firbFees: "https://foreigninvestment.gov.au/guidance/exemptions-and-fees/fees",
  firbSchedule: "https://foreigninvestment.gov.au/sites/foreigninvestment.gov.au/files/2026-06/schedule-of-fees-v8.pdf",
  atoBan: "https://www.ato.gov.au/about-ato/new-legislation/in-detail/international/banning-foreign-purchases-of-established-dwellings",
  fhss: "https://firsthomebuyers.gov.au/first-home-super-saver-scheme",
};

export type DepositSchemeArea = "capital" | "regional";

/** Price caps: "capital" = capital city AND listed regional centres; "regional" = other areas of the state. */
export type PriceCaps = Record<AuState, { capital: number; regional: number }>;

export const FIVE_PERCENT_DEPOSIT_SCHEME = {
  name: "Australian Government 5% Deposit Scheme",
  formerNames: ["Home Guarantee Scheme", "First Home Guarantee"],
  administrator: "Housing Australia",
  effectiveFrom: "2026-07-01",
  // ACT has one cap for all areas. NT: Darwin $750,000 / rest of NT $600,000 from 1 July 2026.
  priceCaps: {
    NSW: { capital: 1_500_000, regional: 800_000 },
    VIC: { capital: 950_000, regional: 650_000 },
    QLD: { capital: 1_000_000, regional: 700_000 },
    WA: { capital: 850_000, regional: 600_000 },
    SA: { capital: 900_000, regional: 500_000 },
    TAS: { capital: 700_000, regional: 550_000 },
    ACT: { capital: 1_000_000, regional: 1_000_000 },
    NT: { capital: 750_000, regional: 600_000 },
  } satisfies PriceCaps,
  regionalCentres:
    "Capital-city caps also apply in these regional centres — NSW: Central Coast, Coffs Harbour–Grafton, Illawarra, Mid North Coast, Richmond–Tweed, Newcastle and Lake Macquarie; VIC: Geelong; QLD: Gold Coast and Sunshine Coast. Caps are set by suburb and postcode — confirm with the official postcode tool.",
  capTest:
    "Both the purchase price and the lender's valuation must be at or below the cap. When building on vacant land with separate contracts, land price plus build cost must be under the cap.",
  minDepositPct: 5,
  maxGuaranteePct: 15,
  noIncomeCapsOrPlaceLimitsSince: "2025-10-01",
  lmiPayable: false,
  eligibility: [
    "Australian citizen or permanent resident, aged 18 or over (tested at the home loan date).",
    "First home buyer, or have not owned a property or land in Australia in the last 10 years.",
    "Deposit of at least 5% and less than 20%; the Government guarantees up to 15% of the property value, so no LMI is payable.",
    "Owner-occupier; principal and interest loan up to 30 years; on your own or jointly with one other person.",
    "No income caps and no limit on places since 1 October 2025.",
    "Apply through a Participating Lender (or a broker who uses one).",
  ],
  singleParent: {
    name: "Single parent stream (Family Home Guarantee)",
    minDepositPct: 2,
    maxGuaranteePct: 18,
    eligibility: [
      "Single parent or legal guardian of at least one dependent child; applying alone.",
      "Australian citizen or permanent resident, 18 or over.",
      "Need not be a first home buyer, but must not own any other property interest once the new home settles.",
    ],
  },
  sourceUrls: [SRC.caps, SRC.scheme, SRC.fhbElig, SRC.singleParent, SRC.pmRelease],
  verifiedAt: V,
  verified: true,
} satisfies Provenance & Record<string, unknown>;

export const HELP_TO_BUY = {
  name: "Australian Government Help to Buy Scheme",
  status: "open" as const,
  openedOn: "2025-12-05",
  placesPerYear: 10_000,
  equityShareMaxPct: { established: 30, new: 40 },
  equityShareMinPct: 5,
  minDepositPct: 2,
  /** FY2026-27 income caps (tested on the FY2026 notice of assessment); wage-indexed each 1 July. */
  incomeCaps: { single: 103_000, singleParent: 165_000, joint: 165_000, financialYear: "2026-27" },
  /** Not indexed. Different from the 5% Deposit Scheme caps (NSW $1.3m; NT has no Darwin split). */
  priceCaps: {
    NSW: { capital: 1_300_000, regional: 800_000 },
    VIC: { capital: 950_000, regional: 650_000 },
    QLD: { capital: 1_000_000, regional: 700_000 },
    WA: { capital: 850_000, regional: 600_000 },
    SA: { capital: 900_000, regional: 500_000 },
    TAS: { capital: 700_000, regional: 550_000 },
    ACT: { capital: 1_000_000, regional: 1_000_000 },
    NT: { capital: 600_000, regional: 600_000 },
  } satisfies PriceCaps,
  eligibility: [
    "All applicants must be Australian citizens (permanent residents are not eligible), aged 18 or over.",
    "Must not own or beneficially own any property in Australia or overseas (exceptions for single parents).",
    "Owner-occupier (principal place of residence). Minimum 2% deposit; no LMI.",
    "Government contributes up to 30% (existing homes) or 40% (new homes) of the price.",
    "Can be combined with state stamp duty concessions and grants, not with state shared-equity schemes.",
  ],
  sourceUrls: [SRC.htb, SRC.htbCaps, SRC.htbThresholds],
  verifiedAt: V,
  verified: true,
} satisfies Provenance & Record<string, unknown>;

export const FIRB = {
  establishedDwellingBan: {
    from: "2025-04-01",
    to: "2029-06-30",
    summary:
      "From 1 April 2025 to 30 June 2029, foreign persons (including temporary residents and foreign-owned companies) are generally prohibited from buying established dwellings. Extended in the 2026-27 Budget from the original 31 March 2027 end date.",
    exceptions: [
      "Redevelopment that adds at least 20 dwellings; commercial-scale housing (build-to-rent, retirement villages, aged care, student accommodation); PALM worker housing — all still need FIRB approval.",
      "New dwellings and vacant land can still be bought with FIRB approval.",
    ],
    notAffected: ["Australian citizens", "Permanent residents", "New Zealand citizens (special category visa holders or eligible)"],
  },
  foreignPerson:
    "For FIRB, temporary residents, foreign non-residents and New Zealand citizens not ordinarily resident in Australia are foreign persons. Permanent residents, Australian citizens living abroad and New Zealand citizens who hold or are eligible for a special category visa do not need approval for residential land. State surcharge rules use different definitions.",
  /** 2026-27 Schedule of Fees v8 (1 July 2026): fee by consideration. */
  fees2026_27: {
    note: "Application fees for residential land, 2026-27 (Schedule of Fees v8). Higher tiers in the schedule.",
    newOrVacant: [
      { upTo: 75_000, fee: 4_600 },
      { upTo: 1_000_000, fee: 15_600 },
      { upTo: 2_000_000, fee: 31_300 },
      { upTo: 3_000_000, fee: 62_600 },
      { upTo: 4_000_000, fee: 93_900 },
    ],
    establishedWhereExceptionApplies: [
      { upTo: 75_000, fee: 13_800 },
      { upTo: 1_000_000, fee: 46_800 },
      { upTo: 2_000_000, fee: 93_900 },
      { upTo: 3_000_000, fee: 187_800 },
      { upTo: 4_000_000, fee: 281_700 },
    ],
    feesUrl: SRC.firbFees,
    scheduleUrl: SRC.firbSchedule,
  },
  sourceUrls: [SRC.firbResidential, SRC.firbKeyConcepts, SRC.firbFees, SRC.firbSchedule, SRC.atoBan],
  verifiedAt: V,
  verified: true,
  note: "ATO page read from a Wayback copy dated 2026-09-01 (live ATO site blocks scripted access); FIRB pages read live.",
} satisfies Provenance & Record<string, unknown>;

export const FIRST_HOME_SUPER_SAVER = {
  name: "First Home Super Saver Scheme",
  maxPerFinancialYear: 15_000,
  maxTotal: 50_000,
  summary:
    "Voluntary super contributions (up to $15,000 a financial year, $50,000 in total) plus associated earnings can be released towards a first home deposit. 100% of non-concessional and 85% of concessional contributions count.",
  sourceUrls: [SRC.fhss],
  verifiedAt: V,
  verified: true,
} satisfies Provenance & Record<string, unknown>;

export const FEDERAL = { FIVE_PERCENT_DEPOSIT_SCHEME, HELP_TO_BUY, FIRB, FIRST_HOME_SUPER_SAVER };

/** 5% Deposit Scheme price-cap check for a state and area. */
export function depositSchemeCheck(state: AuState, price: number, area: DepositSchemeArea = "capital") {
  const cap = FIVE_PERCENT_DEPOSIT_SCHEME.priceCaps[state][area];
  const withinCap = price <= cap;
  const where = state === "ACT" ? "the ACT" : area === "capital" ? `${state} capital city / regional centres` : `${state} other areas`;
  return {
    cap,
    withinCap,
    area,
    message: withinCap
      ? `Under the 5% Deposit Scheme cap for ${where} ($${cap.toLocaleString("en-AU")}): eligible buyers can buy with a 5% deposit and no LMI.`
      : `Above the 5% Deposit Scheme cap for ${where} ($${cap.toLocaleString("en-AU")}).`,
    sourceUrl: SRC.caps,
    verifiedAt: FIVE_PERCENT_DEPOSIT_SCHEME.verifiedAt,
  };
}
