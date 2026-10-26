// Western Australia — RevenueWA (Department of Treasury and Finance) / Landgate. Verified 2026-10-26.
// Law: Duties Act 2008 (consolidated as at 22 Oct 2026) Sch 2 Div 1 (general rate), s 147 + Sch 2 Div 2 (concessional
// rate for a principal place of residence ≤ $200,000), s 142(1A) first home owner rate (amended by the Finance
// Legislation Amendment (Housing Affordability) Act 2026 for contracts from 7 May 2026), s 205O foreign transfer duty 7%,
// ss 266I–266L off-the-plan concession. Rates are "per $100 or part of $100". The RevenueWA calculator rounds the final
// amount DOWN to a multiple of 5 cents (no statutory rule found — we copy the calculator).

import type { StateRules } from "../types";

const V = "2026-10-26";
const SRC = {
  assessment: "https://www.wa.gov.au/organisation/department-of-treasury-and-finance/transfer-duty-assessment",
  transferDuty: "https://www.wa.gov.au/organisation/department-of-treasury-and-finance/transfer-duty",
  act: "https://www.legislation.wa.gov.au/legislation/statutes.nsf/law_a146657.html",
  residential: "https://www.wa.gov.au/government/publications/duties-fact-sheet-residential-land",
  fhor: "https://www.wa.gov.au/government/publications/duties-fact-sheet-first-home-owner-rate",
  circular23: "https://www.wa.gov.au/government/publications/finance-legislation-amendment-housing-affordability-bill-2026",
  fhog: "https://www.wa.gov.au/organisation/department-of-treasury-and-finance/first-home-owner-grant-fhog",
  fhogFacts: "https://www.wa.gov.au/government/publications/about-the-first-home-owner-grant",
  ftd: "https://www.wa.gov.au/government/publications/foreign-transfer-duty",
  foreignBuyers: "https://www.wa.gov.au/service/financial-management/taxation-and-duty/about-foreign-buyers-duty",
  otp: "https://www.wa.gov.au/service/financial-management/taxation-and-duty/apply-the-plan-duty-concession",
  landgateFees: "https://www.landgate.wa.gov.au/land-and-property/land-transactions-hub/land-transaction-fees/",
  landgateCalc: "https://www.landgate.wa.gov.au/land-and-property/land-transactions-hub/transfer-lodgement-fee-calculator/",
  tlr: "https://www.legislation.wa.gov.au/legislation/statutes.nsf/law_s55896.html",
};

export const WA: StateRules = {
  state: "WA",
  name: "Western Australia",
  revenueOffice: "RevenueWA",
  revenueOfficeUrl: SRC.transferDuty,
  rulesVersion: "2026-27",

  generalScale: {
    id: "general",
    label: "General rate of transfer duty",
    effectiveFrom: "2014-07-02",
    roundValueUpTo: 100,
    roundDuty: "down-5c",
    brackets: [
      { kind: "marginal", upTo: 120_000, over: 0, base: 0, ratePct: 1.9 },
      { kind: "marginal", upTo: 150_000, over: 120_000, base: 2_280, ratePct: 2.85 },
      { kind: "marginal", upTo: 360_000, over: 150_000, base: 3_135, ratePct: 3.8 },
      { kind: "marginal", upTo: 725_000, over: 360_000, base: 11_115, ratePct: 4.75 },
      // Statutory base is $28,453 (not the $28,452.50 the previous band reaches at $725,000).
      { kind: "marginal", upTo: null, over: 725_000, base: 28_453, ratePct: 5.15 },
    ],
    sourceUrls: [SRC.assessment, SRC.act],
    verifiedAt: V,
    verified: true,
    note: "The separate 'residential rate' applied only to transactions from 1 July 2008 to 30 June 2022; the general rate now applies.",
  },

  ownerOccupierScale: {
    scale: {
      id: "ppr-concessional",
      label: "Concessional rate for a principal place of residence (value ≤ $200,000)",
      effectiveFrom: "2014-07-02",
      roundValueUpTo: 100,
      roundDuty: "down-5c",
      brackets: [
        { kind: "marginal", upTo: 120_000, over: 0, base: 0, ratePct: 1.5 },
        { kind: "marginal", upTo: 200_000, over: 120_000, base: 1_800, ratePct: 4.04 },
      ],
      sourceUrls: [SRC.residential, SRC.act],
      verifiedAt: V,
      verified: true,
    },
    maxValue: 200_000,
    appliesTo: ["established", "new", "off-the-plan"],
    conditions: [
      "The property includes a house, is worth no more than $200,000 and was not a gift.",
      "You will occupy it as your principal place of residence for an indefinite period.",
    ],
  },

  concessions: [
    {
      id: "fhor-home",
      name: "First home owner rate of duty (home)",
      requiresFirstHomeBuyer: true,
      effectiveFrom: "2026-05-07",
      appliesTo: ["established", "new", "off-the-plan"],
      baseScale: "general",
      bands: [
        { kind: "exempt", upTo: 600_000 },
        { kind: "marginal", from: 600_000, upTo: 800_000, base: 0, ratePct: 16.15, roundValueUpTo: 100, roundResult: "down-5c" },
      ],
      requiresCitizenOrPR: true,
      requiresOwnerOccupier: true,
      eligibility: [
        "New or established home anywhere in WA (one threshold statewide from 7 May 2026): no duty up to $600,000; $16.15 per $100 above $600,000 up to $800,000. Above $800,000 the general rate applies.",
        "Every buyer must qualify as a first home owner under the FHOG rules (or would, but for the home not being new or the value cap): natural persons 18+, at least one an Australian citizen or permanent resident, never received a FHOG or the first home owner rate, never owned and lived in a home in Australia.",
        "Live in the home for at least 6 continuous months, starting within 12 months. No income or assets test.",
      ],
      sourceUrls: [SRC.fhor, SRC.assessment, SRC.circular23, SRC.act],
      verifiedAt: V,
      verified: true,
    },
    {
      id: "fhor-land",
      name: "First home owner rate of duty (vacant land)",
      requiresFirstHomeBuyer: true,
      effectiveFrom: "2026-05-07",
      appliesTo: ["vacant-land"],
      baseScale: "general",
      bands: [
        { kind: "exempt", upTo: 450_000 },
        { kind: "marginal", from: 450_000, upTo: 550_000, base: 0, ratePct: 20.14, roundValueUpTo: 100, roundResult: "down-5c" },
      ],
      requiresCitizenOrPR: true,
      requiresOwnerOccupier: true,
      eligibility: [
        "Vacant land to build your first home: no duty up to $450,000; $20.14 per $100 above $450,000 up to $550,000.",
        "Same first home owner tests as for homes; you need a building contract or owner-builder intent.",
      ],
      sourceUrls: [SRC.fhor, SRC.assessment, SRC.act],
      verifiedAt: V,
      verified: true,
    },
  ],

  totalDutyConcessions: [
    {
      id: "otp",
      name: "Off-the-plan duty concession",
      appliesTo: ["off-the-plan"],
      effectiveFrom: "2026-03-12",
      effectiveTo: "2028-07-01",
      includesSurcharge: true,
      fullUpTo: 800_000,
      floorFrom: 900_000,
      // Pre-construction: 100% ≤ $800k, less 0.05% per $100 above, 50% from $900k. Under construction: 75% / 0.0375% / 37.5%.
      // The RevenueWA calculator counts whole $100s above $800,000.
      stages: {
        "pre-construction": { fullPct: 100, floorPct: 50, stepPctPer100: 0.05 },
        "under-construction": { fullPct: 75, floorPct: 37.5, stepPctPer100: 0.0375 },
      },
      maxSaving: 50_000,
      roundPayable: "down-5c",
      eligibility: [
        "Contracts from 12 March 2026 to 30 June 2028 for a new dwelling off the plan in a strata or community titles scheme (survey-strata / land schemes need a single house-and-land contract).",
        "Open to any buyer — no first home, residence or citizenship test. Concession includes foreign transfer duty (reduces transfer duty first). Capped at $50,000.",
        "Apply with form FDA53 within 12 months of the strata plan registering on title.",
      ],
      appliedNote: "Assumes a new strata or community-titled dwelling bought off the plan from the developer.",
      sourceUrls: [SRC.otp, SRC.act],
      verifiedAt: V,
      verified: true,
    },
  ],

  grants: [
    {
      id: "fhog",
      name: "First Home Owner Grant",
      amount: 10_000,
      appliesTo: ["new", "off-the-plan", "vacant-land"],
      priceCap: 800_000,
      regionalCap: { label: "North of the 26th parallel", priceCap: 1_000_000 },
      requiresCitizenOrPR: true,
      requiresFirstHomeBuyer: true,
      effectiveFrom: "2026-05-07",
      eligibility: [
        "$10,000 (or the price if less) for a new home: buying new/off the plan (first sale from the developer) or building. Not for established homes.",
        "Total value cap $800,000 south of the 26th parallel (incl. all of Perth), $1,000,000 north (contracts from 7 May 2026; previously $750,000 south).",
        "At least one applicant an Australian citizen or permanent resident; live in the home 6 continuous months starting within 12 months. No income test.",
      ],
      sourceUrls: [SRC.fhog, SRC.fhogFacts],
      verifiedAt: V,
      verified: true,
    },
  ],

  foreignSurcharge: {
    name: "Foreign transfer duty",
    ratePct: 7,
    effectiveFrom: "2019-01-01",
    roundTo: "down-5c",
    foreignMeansNotCitizenOrPR: true,
    whoPays: [
      "Foreign persons buying residential property: individuals who are not Australian citizens or holders of a permanent or special category (444) visa — temporary visa holders, including partner (820) and bridging visa holders, pay it.",
      "Foreign corporations and trusts (50% tests). Charged on the foreign buyer's share; joint tenants are treated as equal shares. Paid on top of transfer duty, even when the first home owner rate applies.",
    ],
    exemptions: [
      "Permanent residents and NZ citizens on a special category visa are not foreign (no days-in-Australia test).",
      "Refund if foreign status changes before the transfer (form FDA42). Developer and build-to-sell exemptions exist.",
    ],
    sourceUrls: [SRC.ftd, SRC.foreignBuyers, SRC.act],
    verifiedAt: V,
    verified: true,
    note: "Duties Act s 205O: 'chargeable at the rate of 7% of the dutiable value'.",
  },

  otherConcessions: [],

  govtFees: {
    authority: "Landgate",
    effectiveFrom: "2026-07-01",
    // Transfer of Land Regulations 2004 Sch 1 (as at 1 Jul 2026, Lands Regulations Amendment (Fees and Charges) Regulations 2026):
    // transfer ≤$85k $225.10; ≤$120k $235.10; ≤$200k $255.10; plus $20 per whole or part $100,000 above $200,000. Mortgage $225.10.
    mortgageRegistration: { kind: "flat", amount: 225.1 },
    transfer: {
      kind: "table",
      rows: [
        { upTo: 85_000, fee: 225.1 },
        { upTo: 120_000, fee: 235.1 },
        { upTo: 200_000, fee: 255.1 },
      ],
      above: { base: 255.1, over: 200_000, step: 100_000, perStep: 20 },
    },
    sourceUrls: [SRC.landgateFees, SRC.landgateCalc, SRC.tlr],
    verifiedAt: V,
    verified: true,
  },

  notes: ["RevenueWA's calculator rounds duty down to the nearest 5 cents; this estimate does the same."],
};
