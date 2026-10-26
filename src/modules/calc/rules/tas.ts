// Tasmania — State Revenue Office Tasmania / Land Titles Office (NRE Tasmania). Verified 2026-10-26.
// Law: Duties Act 2001 s 29(1) (rates for transfers from 21 Oct 2013; consolidated to 9 Oct 2026), s 30C foreign investor
// duty surcharge, ss 57C–57F first home buyer established-home exemption (ENDED: transfers to 30 June 2026 only).
// "for every $100, or part" — value rounded up to the next $100. Test values are live outputs of the TRO calculator.

import type { StateRules } from "../types";

const V = "2026-10-26";
const SRC = {
  rates: "https://www.sro.tas.gov.au/property-transfer-duties/rates-of-duty",
  act: "https://www.legislation.tas.gov.au/view/whole/html/inforce/current/act-2001-015",
  calc: "https://www.tro.tas.gov.au/Calculator",
  fhbExpired: "https://www.sro.tas.gov.au/property-transfer-duties/concessions-exemptions/first-home-buyers-of-established-homes-duty-relief",
  concessions: "https://www.sro.tas.gov.au/property-transfer-duties/concessions-exemptions",
  fhog: "https://www.sro.tas.gov.au/first-home-owner/eligibility",
  fhogTxn: "https://www.sro.tas.gov.au/first-home-owner/eligibility/eligible-transaction-requirements",
  fids: "https://www.sro.tas.gov.au/property-transfer-duties/foreign-investor-duty-surcharge/rates-of-surcharge",
  fidsDef: "https://www.sro.tas.gov.au/property-transfer-duties/foreign-investor-duty-surcharge/definition-of-foreign",
  fidsExempt: "https://www.sro.tas.gov.au/property-transfer-duties/foreign-investor-duty-surcharge/exemptions",
  otp: "https://www.sro.tas.gov.au/property-transfer-duties/concessions-exemptions/off-the-plan-apartment-or-unit-duty-concession",
  pensioner: "https://www.sro.tas.gov.au/property-transfer-duties/concessions-exemptions/pensioners-downsizing-to-a-new-home-duty-concession",
  ltoFees: "https://nre.tas.gov.au/Documents/2026-2027%20Brief%20Fee%20Schedule.pdf",
  ltoFeesPage: "https://nre.tas.gov.au/land-tasmania/land-titles-office/land-titles-office-fees",
};

export const TAS: StateRules = {
  state: "TAS",
  name: "Tasmania",
  revenueOffice: "State Revenue Office Tasmania",
  revenueOfficeUrl: "https://www.sro.tas.gov.au/property-transfer-duties",
  rulesVersion: "2026-27",

  generalScale: {
    id: "general",
    label: "Property transfer duty rates",
    effectiveFrom: "2013-10-21",
    roundValueUpTo: 100,
    roundDuty: "cents",
    brackets: [
      { kind: "marginal", upTo: 3_000, over: 0, base: 50, ratePct: 0 },
      { kind: "marginal", upTo: 25_000, over: 3_000, base: 50, ratePct: 1.75 },
      { kind: "marginal", upTo: 75_000, over: 25_000, base: 435, ratePct: 2.25 },
      { kind: "marginal", upTo: 200_000, over: 75_000, base: 1_560, ratePct: 3.5 },
      { kind: "marginal", upTo: 375_000, over: 200_000, base: 5_935, ratePct: 4 },
      { kind: "marginal", upTo: 725_000, over: 375_000, base: 12_935, ratePct: 4.25 },
      { kind: "marginal", upTo: null, over: 725_000, base: 27_810, ratePct: 4.5 },
    ],
    sourceUrls: [SRC.rates, SRC.act, SRC.calc],
    verifiedAt: V,
    verified: true,
    note: "Minimum duty $50 (values up to $3,000). No owner-occupier rate.",
  },

  // No first home buyer duty concession is available for contracts signed now (see otherConcessions).
  concessions: [],

  grants: [
    {
      id: "fhog",
      name: "First Home Owner Grant",
      amount: 20_000,
      appliesTo: ["new", "off-the-plan", "vacant-land"],
      priceCap: null,
      requiresCitizenOrPR: true,
      requiresFirstHomeBuyer: true,
      effectiveFrom: "2026-07-01",
      effectiveTo: "2027-07-01",
      eligibility: [
        "$20,000 for eligible transactions (contract or building start) from 1 July 2026 to 30 June 2027 (First Home Owner Grant Amendment Act 2026 s 18M). Completion within 24 months.",
        "New homes only (never occupied or sold as a residence): buy new or off the plan, build with a builder, or owner-build. No value cap.",
        "Natural persons 18+, at least one an Australian citizen or permanent resident; never received a FHOG or owned and lived in a home in Australia; live in the home 6 continuous months starting within 12 months.",
      ],
      sourceUrls: [SRC.fhog, SRC.fhogTxn],
      verifiedAt: V,
      verified: true,
      note: "SRO: 'Transactions that commence between 1 July 2026 and 30 June 2027 may be eligible for $20 000.' ($30,000 applied 1 Jul 2025 – 30 Jun 2026.)",
    },
  ],

  foreignSurcharge: {
    name: "Foreign investor duty surcharge (FIDS)",
    ratePct: 8,
    effectiveFrom: "2020-04-01",
    roundTo: "cents",
    foreignMeansNotCitizenOrPR: true,
    whoPays: [
      "Foreign persons buying residential property: individuals who are not Australian citizens, permanent visa holders or NZ citizens on a special category visa (no ordinarily-resident test). Temporary visa holders pay it.",
      "Foreign corporations and trusts. Charged on the foreign share of the dutiable value, on top of general duty (1.5% for primary production land).",
    ],
    exemptions: [
      "Spouses or partners holding equal shares where only one is foreign and the home is their principal place of residence.",
      "Vacant land: refund if a principal place of residence is built within 2 years.",
    ],
    sourceUrls: [SRC.fids, SRC.fidsDef, SRC.fidsExempt, SRC.act],
    verifiedAt: V,
    verified: true,
    note: "SRO: agreements on or after 1 April 2020 — 8 per cent on the proportion of the dutiable value of residential property.",
  },

  otherConcessions: [
    {
      id: "fhb-established-ended",
      name: "First home buyer duty exemption (established homes) — ended",
      summary:
        "The 100% duty exemption for first home buyers of established homes up to $750,000 applied to transfers from 18 February 2024 to 30 June 2026. It is not available for transactions settling after 30 June 2026, and no replacement has been announced. First home buyers now pay full duty (the $20,000 grant applies to new homes only).",
      modelled: false,
      appliesTo: ["established"],
      sourceUrls: [SRC.fhbExpired, SRC.concessions, SRC.act],
      verifiedAt: V,
      verified: true,
    },
    {
      id: "otp-ended",
      name: "Off-the-plan apartment/unit duty concession — ended",
      summary: "The 50% concession needed an agreement signed between 1 July 2024 and 30 June 2026 (value ≤ $750,000). Not available for agreements signed after 30 June 2026.",
      modelled: false,
      appliesTo: ["off-the-plan"],
      sourceUrls: [SRC.otp],
      verifiedAt: V,
      verified: true,
    },
  ],

  govtFees: {
    authority: "Land Titles Office (NRE Tasmania)",
    effectiveFrom: "2026-07-01",
    // 2026-2027 Brief Fee Schedule (effective on and from 1 July 2026; fee unit $1.96): Transfer $256.76, Mortgage $167.58.
    mortgageRegistration: { kind: "flat", amount: 167.58 },
    transfer: { kind: "flat", amount: 256.76 },
    sourceUrls: [SRC.ltoFees, SRC.ltoFeesPage],
    verifiedAt: V,
    verified: true,
  },
};
