// Australian Capital Territory — ACT Revenue Office / Access Canberra (Land Titles). Verified 2026-10-26.
// Primary sources: ACT Legislation Register determinations commencing 1 July 2026 (fully accessible).
// revenue.act.gov.au blocks scripted access (Cloudflare); its pages were read from Wayback captures dated Jul–Oct 2026,
// and the official conveyance duty calculator (global.js + 2026-27 config) was run locally for test expectations.
// From 1 July 2026 the Home Buyer Concession Scheme, off-the-plan unit, pensioner and disability concessions are
// NIL duty with no property value or income caps (DI2026-156 to DI2026-160 explanatory statements).

import type { StateRules } from "../types";

const V = "2026-10-26";
const SRC = {
  rates: "https://legislation.act.gov.au/di/2026-155/",
  ratesPage: "https://www.revenue.act.gov.au/rates-and-property-charges/conveyance-duty-stamp-duty/conveyance-duty-for-non-commercial-property",
  calc: "https://www.revenue.act.gov.au/help-and-resources/calculators/calculate-your-conveyance-duty",
  hbcs: "https://legislation.act.gov.au/di/2026-157/",
  hbcsClaim: "https://www.revenue.act.gov.au/home-buyer-assistance/home-buyer-concession-scheme/claim-the-home-buyer-concession",
  otp: "https://legislation.act.gov.au/di/2026-158/",
  otpPage: "https://www.revenue.act.gov.au/home-buyer-assistance/off-the-plan-unit-duty-exemption",
  nut: "https://legislation.act.gov.au/di/2026-156/",
  nutPage: "https://www.revenue.act.gov.au/home-buyer-assistance/newly-unit-titled-duty-exemption",
  pensioner: "https://legislation.act.gov.au/di/2026-159/",
  disability: "https://legislation.act.gov.au/di/2026-160/",
  fhog: "https://www.revenue.act.gov.au/home-buyer-assistance/first-home-owner-grant",
  dutiesAct: "https://legislation.act.gov.au/a/1999-7/",
  landTaxForeign: "https://www.revenue.act.gov.au/rates-and-property-charges/land-tax/foreign-ownership-surcharge-for-land-tax",
  fees: "https://legislation.act.gov.au/di/2026-104/",
};

// Official calculator rounds the whole value up to the next $100 before every bracket (incl. the flat >$1.455m rate,
// where the determination says "per $100 applied to the total dutiable amount" without "or part" — max difference $4.54).
// Duties Act s 229: duty under $20 is not payable.
const ROUND_NOTE = "Rounding follows the official ACT calculator (value rounded up to the next $100, including the flat rate above $1,455,000).";

export const ACT: StateRules = {
  state: "ACT",
  name: "Australian Capital Territory",
  revenueOffice: "ACT Revenue Office",
  revenueOfficeUrl: "https://www.revenue.act.gov.au/rates-and-property-charges/conveyance-duty-stamp-duty",
  rulesVersion: "2026-27",

  generalScale: {
    id: "general",
    label: "Conveyance duty, residential — not an eligible owner-occupier (Table 2)",
    effectiveFrom: "2026-07-01",
    roundValueUpTo: 100,
    nilIfBelow: 20,
    roundDuty: "cents",
    brackets: [
      { kind: "marginal", upTo: 200_000, over: 0, base: 0, ratePct: 1.2 },
      { kind: "marginal", upTo: 300_000, over: 200_000, base: 2_400, ratePct: 2.2 },
      { kind: "marginal", upTo: 500_000, over: 300_000, base: 4_600, ratePct: 3.4 },
      { kind: "marginal", upTo: 750_000, over: 500_000, base: 11_400, ratePct: 4.32 },
      { kind: "marginal", upTo: 1_000_000, over: 750_000, base: 22_200, ratePct: 5.9 },
      { kind: "marginal", upTo: 1_455_000, over: 1_000_000, base: 36_950, ratePct: 6.4 },
      { kind: "whole", upTo: null, ratePct: 4.54 },
    ],
    sourceUrls: [SRC.rates, SRC.ratesPage, SRC.calc, SRC.dutiesAct],
    verifiedAt: V,
    verified: true,
    note: `Taxation Administration (Amounts Payable—Duty) Determination 2026 (DI2026-155) s 5 Table 2; residential rates unchanged from 2025-26. ${ROUND_NOTE}`,
  },

  ownerOccupierScale: {
    scale: {
      id: "owner-occupier",
      label: "Conveyance duty — eligible owner-occupier (Table 1)",
      effectiveFrom: "2026-07-01",
      roundValueUpTo: 100,
      nilIfBelow: 20,
      roundDuty: "cents",
      brackets: [
        { kind: "marginal", upTo: 260_000, over: 0, base: 0, ratePct: 0.28 },
        { kind: "marginal", upTo: 300_000, over: 260_000, base: 728, ratePct: 2.2 },
        { kind: "marginal", upTo: 500_000, over: 300_000, base: 1_608, ratePct: 3.4 },
        { kind: "marginal", upTo: 750_000, over: 500_000, base: 8_408, ratePct: 4.32 },
        { kind: "marginal", upTo: 1_000_000, over: 750_000, base: 19_208, ratePct: 5.9 },
        { kind: "marginal", upTo: 1_455_000, over: 1_000_000, base: 33_958, ratePct: 6.4 },
        { kind: "whole", upTo: null, ratePct: 4.54 },
      ],
      sourceUrls: [SRC.rates, SRC.ratesPage, SRC.calc],
      verifiedAt: V,
      verified: true,
      note: `DI2026-155 s 5 Table 1. Above $1,455,000 there is no owner-occupier benefit. ${ROUND_NOTE}`,
    },
    appliesTo: ["established", "new", "off-the-plan", "vacant-land"],
    conditions: [
      "All buyers are individuals buying in their own right.",
      "At least one buyer lives in the home as their principal place of residence within 1 year (of completion, or of the certificate of occupancy for vacant land) for at least 1 continuous year.",
      "No income, value, prior-ownership or citizenship test.",
    ],
  },

  concessions: [
    {
      id: "hbcs",
      name: "Home Buyer Concession Scheme",
      requiresFirstHomeBuyer: true,
      effectiveFrom: "2026-07-01",
      appliesTo: ["established", "new", "off-the-plan", "vacant-land"],
      baseScale: "owner-occupier",
      // DI2026-157 s 7: "nil rate of duty"; income and property thresholds removed from 1 July 2026.
      bands: [{ kind: "exempt", upTo: Number.POSITIVE_INFINITY }],
      requiresCitizenOrPR: false,
      requiresOwnerOccupier: true,
      eligibility: [
        "Nil duty on a home (new or established) or vacant land at any price — no income or property value cap for transactions from 1 July 2026.",
        "All buyers are individuals aged 18 or over.",
        "You (and any domestic partner) have not held an interest in land anywhere (ACT, Australia or overseas) in the previous 5 years. You don't have to be a first home buyer.",
        "At least one buyer lives in the property as their principal place of residence within 1 year, for at least 1 continuous year.",
        "No citizenship or residency requirement.",
      ],
      appliedNote: "The ACT Home Buyer Concession Scheme also applies if you haven't owned property in the last 5 years (you don't need to be a first home buyer).",
      sourceUrls: [SRC.hbcs, SRC.hbcsClaim],
      verifiedAt: V,
      verified: true,
      note: "HBCS claim page (modified 1 Jul 2026): 'For transaction dates from 1 July 2026 no duty is payable'. Revenue pages read via Wayback capture 2026-10-05.",
    },
    {
      id: "otp-unit",
      name: "Off-the-plan unit duty exemption",
      requiresFirstHomeBuyer: false,
      effectiveFrom: "2026-07-01",
      appliesTo: ["off-the-plan"],
      baseScale: "owner-occupier",
      bands: [{ kind: "exempt", upTo: Number.POSITIVE_INFINITY }],
      requiresCitizenOrPR: false,
      requiresOwnerOccupier: true,
      eligibility: [
        "A unit (apartment or townhouse) in a units plan, bought off the plan before the plan is registered. House-and-land packages don't qualify.",
        "Buyers are individuals aged 18 or over; at least one lives in it as their principal place of residence within 1 year of completion, for 1 year.",
        "No value cap (removed 1 July 2026), no income or prior-ownership test.",
      ],
      appliedNote: "Assumes the off-the-plan purchase is a unit in a units plan (apartment or townhouse). Off-the-plan houses pay normal duty.",
      sourceUrls: [SRC.otp, SRC.otpPage],
      verifiedAt: V,
      verified: true,
    },
  ],

  grants: [],

  foreignSurcharge: {
    name: "Foreign purchaser duty surcharge",
    ratePct: 0,
    whoPays: ["The ACT does not charge a foreign purchaser surcharge on conveyance duty."],
    exemptions: [
      "Foreign owners of residential land pay an annual foreign ownership land tax surcharge (0.75% of the base value for 2026-27) unless they live in the property as their principal place of residence — an ongoing cost, not a purchase cost.",
      "Commonwealth FIRB rules still apply (approval needed; established dwellings banned for most foreign persons until 30 June 2029).",
    ],
    sourceUrls: [SRC.dutiesAct, SRC.rates, SRC.landTaxForeign],
    verifiedAt: V,
    verified: true,
    note: "No surcharge provision in the Duties Act 1999 (republication effective 16 Dec 2025) or the 2026 duty determination.",
  },

  otherConcessions: [
    {
      id: "newly-unit-titled",
      name: "Newly unit titled duty exemption",
      summary:
        "Nil duty for a completed, never-occupied unit bought directly from the developer within 2 years of the units plan being registered, if you live in it for 1 year (not for off-the-plan contracts). No value cap.",
      modelled: false,
      appliesTo: ["new"],
      effectiveFrom: "2026-07-01",
      sourceUrls: [SRC.nut, SRC.nutPage],
      verifiedAt: V,
      verified: true,
    },
    {
      id: "pensioner",
      name: "Pensioner duty concession",
      summary:
        "Nil duty (no value cap from 1 July 2026) when at least one buyer receives an eligible pension or holds a DVA Gold Card and sells their former home within 1 year. Once only.",
      modelled: false,
      effectiveFrom: "2026-07-01",
      sourceUrls: [SRC.pensioner],
      verifiedAt: V,
      verified: true,
    },
    {
      id: "disability",
      name: "Disability duty concession",
      summary: "Nil duty on the principal place of residence of an NDIS participant with an individualised funding package (threshold removed 1 July 2026).",
      modelled: false,
      effectiveFrom: "2026-07-01",
      sourceUrls: [SRC.disability],
      verifiedAt: V,
      verified: true,
    },
    {
      id: "fhog-abolished",
      name: "First Home Owner Grant",
      summary: "The ACT First Home Owner Grant ended on 1 July 2019. There is no ACT home buyer grant.",
      modelled: false,
      sourceUrls: [SRC.fhog],
      verifiedAt: V,
      verified: true,
    },
  ],

  govtFees: {
    authority: "Access Canberra (Land Titles)",
    effectiveFrom: "2026-07-01",
    // Land Titles (Fees) Determination 2026 (No 2), DI2026-104: item 9 transfer $496.00, item 15 mortgage $184.00 (no GST).
    mortgageRegistration: { kind: "flat", amount: 184 },
    transfer: { kind: "flat", amount: 496 },
    notes: ["Electronic lodgment network fees (about $6–$18 per lodgment) are extra."],
    sourceUrls: [SRC.fees],
    verifiedAt: V,
    verified: true,
  },
};
