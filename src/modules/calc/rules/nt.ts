// Northern Territory — Territory Revenue Office / Land Titles Office. Verified 2026-10-26.
// Law: Stamp Duty Act 1978 Sch 1 cl 1(2) (reprint in force 1 July 2025; no stamp duty amendments since), s 90D house and
// land package exemption; Taxation Administration Act 2007 s 27 (duty rounded DOWN to a multiple of 5 cents);
// First Home Owner Grant Act 2000 s 18 (HomeGrown Territory Grant $50,000). nt.gov.au blocks scripted access; its pages and
// the official conveyance calculator were read in a browser (test values are live calculator outputs).

import type { StateRules } from "../types";

const V = "2026-10-26";
const SRC = {
  stampDuty: "https://treasury.nt.gov.au/dtf/territory-revenue-office/stamp-duty",
  act: "https://legislation.nt.gov.au/api/sitecore/Act/PDF?id=11906",
  calc: "https://nt.gov.au/property/buying-and-selling-a-home/settle-the-sale/stamp-duty-buying-or-selling-a-home/conveyance-calculator",
  hlpe: "https://nt.gov.au/property/home-owner-assistance/stamp-duty-exemption",
  homegrown: "https://nt.gov.au/property/home-owner-assistance/buy-build-new-home",
  freshstart: "https://nt.gov.au/property/home-owner-assistance/existing-home-owners",
  established: "https://nt.gov.au/property/home-owner-assistance/bought-an-established-home",
  hub: "https://nt.gov.au/property/home-owner-assistance",
  ltoFees: "https://nt.gov.au/property/land-titles-office/land-titles-forms-and-fees",
};

export const NT: StateRules = {
  state: "NT",
  name: "Northern Territory",
  revenueOffice: "Territory Revenue Office",
  revenueOfficeUrl: SRC.stampDuty,
  rulesVersion: "2026-27",

  generalScale: {
    id: "general",
    label: "Conveyance stamp duty",
    effectiveFrom: "2017-01-01",
    roundDuty: "down-5c",
    brackets: [
      // D = (0.06571441 × V²) + 15V, where V = dutiable value ÷ 1,000.
      { kind: "quadratic", upTo: 525_000, a: 0.06571441, b: 15, unit: 1_000 },
      // "more than $525,000 but less than $3,000,000": 4.95% of the whole value; ≥ $3m 5.75%; ≥ $5m 5.95%.
      { kind: "whole", upTo: 2_999_999.99, ratePct: 4.95 },
      { kind: "whole", upTo: 4_999_999.99, ratePct: 5.75 },
      { kind: "whole", upTo: null, ratePct: 5.95 },
    ],
    sourceUrls: [SRC.stampDuty, SRC.act, SRC.calc],
    verifiedAt: V,
    verified: true,
    note: "Effective-from date is the reprint's current scale; confirm on the TRO page when it changes. No owner-occupier rate (PPR rebate ended 8 Feb 2019).",
  },

  // No first home buyer duty concession for contracts signed now (Territory Home Owner Discount etc. ended 30 June 2021).
  concessions: [],

  grants: [
    {
      id: "fhog",
      name: "HomeGrown Territory Grant (First Home Owner Grant)",
      amount: 50_000,
      appliesTo: ["new", "off-the-plan", "vacant-land"],
      priceCap: null,
      requiresCitizenOrPR: true,
      requiresFirstHomeBuyer: true,
      effectiveFrom: "2024-10-01",
      effectiveTo: "2027-10-01",
      eligibility: [
        "$50,000 for first home buyers buying or building a new home (never lived in or sold as a residence). Contract or building start by 30 September 2027; apply by 30 September 2028. No price cap.",
        "Natural persons, at least one 18+ and one an Australian citizen or permanent resident; live in the home for at least 12 months. Can't be combined with the FreshStart grant.",
        "The $10,000 grant for established homes was only for contracts from 1 October 2024 to 30 September 2025.",
      ],
      sourceUrls: [SRC.homegrown, SRC.established],
      verifiedAt: V,
      verified: true,
      note: "FHOG Act s 18(3E): $50,000 for commencement on or after 1 Oct 2025 and before 1 Oct 2027; reverts to $10,000 after.",
    },
    {
      id: "freshstart",
      name: "FreshStart New Home Grant",
      amount: 30_000,
      appliesTo: ["new", "off-the-plan", "vacant-land"],
      priceCap: null,
      requiresCitizenOrPR: true,
      requiresFirstHomeBuyer: false,
      nonFirstHomeBuyersOnly: true,
      effectiveFrom: "2024-10-01",
      effectiveTo: "2027-10-01",
      eligibility: [
        "$30,000 for buyers who are not first home buyers, to buy or build a new home (incl. off the plan and owner-builders). Contract between 1 October 2024 and 30 September 2027; apply by 31 December 2027. No price cap.",
        "At least one applicant an Australian citizen or permanent resident, one 18+; live in the home for 12 months. Not for an extra residence on land that already has a home.",
      ],
      sourceUrls: [SRC.freshstart, SRC.hub],
      verifiedAt: V,
      verified: true,
      note: "Administrative grant published on nt.gov.au; no statutory instrument located.",
    },
  ],

  foreignSurcharge: {
    name: "Foreign purchaser duty surcharge",
    ratePct: 0,
    whoPays: ["The Northern Territory does not charge a foreign purchaser surcharge on stamp duty."],
    exemptions: ["Commonwealth FIRB rules still apply (approval needed; established dwellings banned for most foreign persons until 30 June 2029)."],
    sourceUrls: [SRC.act, SRC.stampDuty],
    verifiedAt: V,
    verified: true,
    note: "No foreign-purchaser provision in the Stamp Duty Act 1978.",
  },

  otherConcessions: [
    {
      id: "hlpe",
      name: "House and land package exemption",
      summary:
        "No stamp duty (no value cap, not means tested) for a new detached home bought as a house-and-land package from a building contractor who bought the lot from the developer — contracts 1 July 2022 to 30 June 2027; buyer an individual 18+, citizen or permanent resident, living there 6 months starting within 12 months. Not modelled: check eligibility with your conveyancer.",
      modelled: false,
      appliesTo: ["new", "off-the-plan"],
      effectiveFrom: "2022-07-01",
      effectiveTo: "2027-07-01",
      sourceUrls: [SRC.hlpe, SRC.stampDuty],
      verifiedAt: V,
      verified: true,
    },
  ],

  govtFees: {
    authority: "NT Land Titles Office",
    effectiveFrom: "2026-07-01",
    // Registration Regulations 2009 Sch 1: 115 revenue units ($1.49 from 1 July 2026 → $171, rounded down) + $10 levy = $181.
    mortgageRegistration: { kind: "flat", amount: 181 },
    transfer: { kind: "flat", amount: 181 },
    sourceUrls: [SRC.ltoFees],
    verifiedAt: V,
    verified: true,
  },
};
