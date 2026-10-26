// Queensland — Queensland Revenue Office (QRO) / Titles Queensland. Verified 2026-10-26.
// Law: Duties Act 2001 (reprint current from 22 Oct 2026) Sch 3 (general rates), s 91 (home concession),
// s 92 + Sch 4A (first home concession), s 92A (first home new home), s 92B (first home vacant land),
// s 90A (specified resident — required for every home concession for contracts from 1 Aug 2026), s 244 (AFAD 8%).
// Rates computed "for each $100, or part of $100" (the QRO estimator rounds the value up to the next $100). No minimum duty.

import type { StateRules } from "../types";

const V = "2026-10-26";
const SRC = {
  rates: "https://qro.qld.gov.au/duties/transfer-duty/calculate/rates/",
  concessionRates: "https://qro.qld.gov.au/duties/transfer-duty/calculate/concession-rates/",
  act: "https://www.legislation.qld.gov.au/view/whole/html/inforce/current/act-2001-071",
  homeConcession: "https://qro.qld.gov.au/duties/transfer-duty/concessions/homes/home-concession/",
  firstHome: "https://qro.qld.gov.au/duties/transfer-duty/concessions/homes/first-home/",
  firstNewHome: "https://qro.qld.gov.au/duties/transfer-duty/concessions/homes/first-home-new-home/",
  firstVacantLand: "https://qro.qld.gov.au/duties/transfer-duty/concessions/homes/first-home-vacant-land/",
  estimator: "https://qro.qld.gov.au/duties/transfer-duty/calculate/transfer-duty-estimator/",
  fhog: "https://qro.qld.gov.au/property-concessions-grants/first-home-grant/eligibility/",
  fhogAct: "https://www.legislation.qld.gov.au/view/whole/html/inforce/current/act-2000-014",
  budget26: "https://qro.qld.gov.au/2026/06/state-budget-2026/",
  afad: "https://qro.qld.gov.au/duties/investors/afad/assessing/",
  titlesFees: "https://www.titlesqld.com.au/wp-content/uploads/2026/05/Titles-Registry-Fees_FY-2026-to-2027.pdf",
  titlesAlert: "https://www.titlesqld.com.au/alert/239-notification-of-revised-fees-effective-1-july-2026/",
  afadForeign: "https://qro.qld.gov.au/duties/investors/afad/foreign-persons/",
  afadExemption: "https://qro.qld.gov.au/duties/investors/afad/exemption/",
};

const SPECIFIED_RESIDENT =
  "For contracts from 1 August 2026 every buyer must be a 'specified resident': an Australian citizen, a permanent resident (incl. a New Zealand citizen on a special category visa) or a specified foreign retiree (Duties Act s 90A).";

export const QLD: StateRules = {
  state: "QLD",
  name: "Queensland",
  revenueOffice: "Queensland Revenue Office",
  revenueOfficeUrl: "https://qro.qld.gov.au/duties/transfer-duty/",
  rulesVersion: "2026-27",

  generalScale: {
    id: "general",
    label: "General transfer duty rates",
    effectiveFrom: "2012-09-21",
    roundValueUpTo: 100,
    roundDuty: "cents",
    brackets: [
      { kind: "marginal", upTo: 5_000, over: 0, base: 0, ratePct: 0 },
      { kind: "marginal", upTo: 75_000, over: 5_000, base: 0, ratePct: 1.5 },
      { kind: "marginal", upTo: 540_000, over: 75_000, base: 1_050, ratePct: 3.5 },
      { kind: "marginal", upTo: 1_000_000, over: 540_000, base: 17_325, ratePct: 4.5 },
      { kind: "marginal", upTo: null, over: 1_000_000, base: 38_025, ratePct: 5.75 },
    ],
    sourceUrls: [SRC.rates, SRC.act, SRC.estimator],
    verifiedAt: V,
    verified: true,
    note: "Duties Act Sch 3, unchanged since 21 Sep 2012. QRO rates page last updated 25 Jun 2026.",
  },

  ownerOccupierScale: {
    scale: {
      id: "home-concession",
      label: "Home concession rates (owner-occupier)",
      effectiveFrom: "2012-09-21",
      roundValueUpTo: 100,
      roundDuty: "cents",
      brackets: [
        { kind: "marginal", upTo: 350_000, over: 0, base: 0, ratePct: 1 },
        { kind: "marginal", upTo: 540_000, over: 350_000, base: 3_500, ratePct: 3.5 },
        { kind: "marginal", upTo: 1_000_000, over: 540_000, base: 10_150, ratePct: 4.5 },
        { kind: "marginal", upTo: null, over: 1_000_000, base: 30_850, ratePct: 5.75 },
      ],
      sourceUrls: [SRC.concessionRates, SRC.homeConcession, SRC.act],
      verifiedAt: V,
      verified: true,
      note: "s 91: above $350,000 the home concession saves $7,175 on general duty.",
    },
    appliesTo: ["established", "new", "off-the-plan"],
    requiresCitizenOrPR: true,
    conditions: [
      "You buy as individuals (not as a trustee) and move in within 1 year of settlement.",
      "You lose the concession if you sell, transfer or lease the whole home before moving in or within 1 year of moving in.",
      SPECIFIED_RESIDENT,
    ],
  },

  concessions: [
    {
      id: "first-home-concession",
      name: "First home concession (established home)",
      requiresFirstHomeBuyer: true,
      effectiveFrom: "2024-06-09",
      appliesTo: ["established"],
      baseScale: "owner-occupier",
      // Sch 4A: concession subtracted from home-concession duty. Nil duty to $700,000; nil concession from $800,000.
      bands: [
        {
          kind: "concession-table",
          from: 0,
          rows: [
            { upTo: 709_999.99, concession: 17_350 },
            { upTo: 719_999.99, concession: 15_615 },
            { upTo: 729_999.99, concession: 13_880 },
            { upTo: 739_999.99, concession: 12_145 },
            { upTo: 749_999.99, concession: 10_410 },
            { upTo: 759_999.99, concession: 8_675 },
            { upTo: 769_999.99, concession: 6_940 },
            { upTo: 779_999.99, concession: 5_205 },
            { upTo: 789_999.99, concession: 3_470 },
            { upTo: 799_999.99, concession: 1_735 },
          ],
        },
      ],
      requiresCitizenOrPR: true,
      requiresOwnerOccupier: true,
      eligibility: [
        "All buyers are individuals aged 18 or over who have never held an interest in residential land anywhere (Australia or overseas).",
        SPECIFIED_RESIDENT,
        "Move in within 1 year of settlement. Above $700,000 the price must be at least market value.",
      ],
      sourceUrls: [SRC.firstHome, SRC.concessionRates, SRC.act, SRC.estimator],
      verifiedAt: V,
      verified: true,
    },
    {
      id: "first-home-new-home",
      name: "First home (new home) concession",
      requiresFirstHomeBuyer: true,
      effectiveFrom: "2025-05-01",
      appliesTo: ["new", "off-the-plan"],
      baseScale: "general",
      // s 92A: duty only on any non-residential land; no value cap.
      bands: [{ kind: "exempt", upTo: Number.POSITIVE_INFINITY }],
      requiresCitizenOrPR: true,
      requiresOwnerOccupier: true,
      eligibility: [
        "A new home never previously occupied or sold as a residence, a substantially renovated home, or off the plan. No value cap.",
        "Not available if you demolish an existing home and rebuild.",
        "Same buyer tests as the first home concession, including the specified-resident rule from 1 August 2026.",
      ],
      sourceUrls: [SRC.firstNewHome, SRC.act],
      verifiedAt: V,
      verified: true,
    },
    {
      id: "first-home-vacant-land",
      name: "First home vacant land concession",
      requiresFirstHomeBuyer: true,
      effectiveFrom: "2025-05-01",
      appliesTo: ["vacant-land"],
      baseScale: "general",
      // s 92B: duty only on any non-residential land; no value cap.
      bands: [{ kind: "exempt", upTo: Number.POSITIVE_INFINITY }],
      requiresCitizenOrPR: true,
      requiresOwnerOccupier: true,
      eligibility: [
        "Vacant residential land on which you build your first home and move in within 2 years of settlement. No value cap.",
        "Same buyer tests as the first home concession, including the specified-resident rule from 1 August 2026.",
      ],
      sourceUrls: [SRC.firstVacantLand, SRC.act],
      verifiedAt: V,
      verified: true,
    },
  ],

  grants: [
    {
      id: "fhog",
      name: "First Home Owner Grant",
      amount: 30_000,
      appliesTo: ["new", "off-the-plan", "vacant-land"],
      priceCap: 750_000,
      buildCap: 750_000,
      capIsExclusive: true,
      requiresCitizenOrPR: true,
      requiresFirstHomeBuyer: true,
      effectiveFrom: "2023-11-20",
      eligibility: [
        "$30,000 for new homes (contracts from 20 November 2023; continued permanently from 1 July 2026). No grants for established homes.",
        "Value (including land and contract variations) must be less than $750,000.",
        "At least one applicant an Australian citizen or permanent resident; 18 or over; no previous grant; never owned and lived in a home in Australia since 1 July 2000.",
        "Move in within 1 year and live there for 6 continuous months. No income test.",
      ],
      sourceUrls: [SRC.fhog, SRC.fhogAct, SRC.budget26],
      verifiedAt: V,
      verified: true,
      note: "QRO 2026-27 Budget news: 'The $30,000 first home owner grant will be continued for eligible contracts signed from 1 July 2026 going forward.'",
    },
  ],

  foreignSurcharge: {
    name: "Additional foreign acquirer duty (AFAD)",
    ratePct: 8,
    effectiveFrom: "2024-07-01",
    roundTo: "cents",
    foreignMeansNotCitizenOrPR: true,
    whoPays: [
      "Foreign individuals: anyone who is not an Australian citizen or permanent resident, including temporary visa holders and New Zealand citizens without a special category visa.",
      "Foreign companies and trusts (50%+ foreign interest). Applies to owner-occupied and investment purchases.",
      "Status is fixed at the contract date; no refund if you later become a permanent resident.",
      "From 1 August 2026 a foreign buyer (other than a specified foreign retiree) also cannot claim any home concession.",
    ],
    exemptions: [
      "New Zealand citizens on a special category visa (treated as permanent residents).",
      "Specified foreign retirees (subclass 405/410) buying their principal place of residence (s 246).",
    ],
    sourceUrls: [SRC.afad, SRC.afadForeign, SRC.afadExemption, SRC.act],
    verifiedAt: V,
    verified: true,
    note: "QRO: 'The current rate of AFAD is 8% in addition to the transfer duty rate.'",
  },

  otherConcessions: [],

  govtFees: {
    authority: "Titles Queensland",
    effectiveFrom: "2026-07-01",
    // Transfer of a fee simple (1 lot) $248.04 + $46.56 for each $10,000 or part over $180,000. Mortgage = "any other instrument" $248.04.
    mortgageRegistration: { kind: "flat", amount: 248.04 },
    transfer: { kind: "stepped", base: 248.04, over: 180_000, step: 10_000, perStep: 46.56 },
    sourceUrls: [SRC.titlesFees, SRC.titlesAlert],
    verifiedAt: V,
    verified: true,
  },

  notes: ["Specified foreign retirees (405/410 visa) have their own exemptions; this calculator treats every foreign purchaser as paying AFAD at general rates."],
};
