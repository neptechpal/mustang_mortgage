// Victoria — State Revenue Office Victoria (SRO) / Land Use Victoria. Verified 2026-10-26.
// Law: Duties Act 2000 (authorised version 141, amendments as at 24 June 2026): s 28(1) general rates, s 57J PPR
// concession, s 57JA first home buyer exemption/concession, s 28A foreign purchaser additional duty (8%), s 21AA
// temporary off-the-plan concession. Duty is rounded to the nearest dollar, with 50c rounding DOWN (s 28(1)).
// Test expectations come from the SRO's own calculator API (e-business.sro.vic.gov.au/calculatorservice, 117 cases).

import type { StateRules } from "../types";

const V = "2026-10-26";
const SRC = {
  generalRates: "https://www.sro.vic.gov.au/about-us/rates-and-statistics/current-rates/land-transfer-duty-non-principal-place-residence-current-rates",
  pprRates: "https://www.sro.vic.gov.au/about-us/rates-and-statistics/current-rates/land-transfer-duty-principal-place-residence-current-rates",
  ppr: "https://www.sro.vic.gov.au/buying-property/land-transfer-stamp-duty/concessions-exemptions-and-waivers/principal-place-residence-duty-concession",
  fhb: "https://www.sro.vic.gov.au/buying-property/land-transfer-stamp-duty/concessions-exemptions-and-waivers/first-home-buyers/first-home-buyer-duty-exemption-or-concession",
  fhog: "https://www.sro.vic.gov.au/buying-property/first-home-owner-grant/understanding-first-home-owner-grant",
  fhogRates: "https://www.sro.vic.gov.au/about-us/rates-and-statistics/current-rates/first-home-owner-grant-current-rates",
  fpadRates: "https://www.sro.vic.gov.au/about-us/rates-and-statistics/current-rates/foreign-purchaser-additional-duty-current-rates",
  fpadStatus: "https://www.sro.vic.gov.au/buying-property/foreign-purchasers-property/confirming-your-foreign-purchaser-status",
  fpadRules: "https://www.sro.vic.gov.au/buying-property/foreign-purchasers-property/exemptions-concessions-and-rules-foreign-purchaser-additional-duty",
  otpTemp:
    "https://www.sro.vic.gov.au/buying-property/land-transfer-stamp-duty/concessions-exemptions-and-waivers/plan-duty-concession-0/strata-apartments-and-townhouses-temporary-concession",
  otp: "https://www.sro.vic.gov.au/buying-property/land-transfer-stamp-duty/concessions-exemptions-and-waivers/plan-duty-concession-0/understanding-plan-duty-concession",
  pensioner: "https://www.sro.vic.gov.au/buying-property/land-transfer-stamp-duty/concessions-exemptions-and-waivers/pensioner-and-concession-cardholder-duty-reduction",
  act: "https://www.legislation.vic.gov.au/in-force/acts/duties-act-2000",
  feesRegs: "https://www.legislation.vic.gov.au/in-force/statutory-rules/transfer-land-fees-regulations-2016",
  feeUnit: "https://www.vic.gov.au/notice-under-section-6-fixing-value-fee-unit-and-penalty-unit-5",
  calcApi: "https://www.e-business.sro.vic.gov.au/calculatorservice/api/v1/land-transfer-duty/calculate",
};

export const VIC: StateRules = {
  state: "VIC",
  name: "Victoria",
  revenueOffice: "State Revenue Office Victoria",
  revenueOfficeUrl: "https://www.sro.vic.gov.au/buying-property/land-transfer-stamp-duty",
  rulesVersion: "2026-27",

  generalScale: {
    id: "general",
    label: "General land transfer duty rates (non-principal place of residence)",
    effectiveFrom: "2021-07-01",
    roundDuty: "dollar-half-down",
    brackets: [
      { kind: "marginal", upTo: 25_000, over: 0, base: 0, ratePct: 1.4 },
      { kind: "marginal", upTo: 130_000, over: 25_000, base: 350, ratePct: 2.4 },
      { kind: "marginal", upTo: 960_000, over: 130_000, base: 2_870, ratePct: 6 },
      // "5.5% of the dutiable value" — note the step from $52,670 at $960,000 to $52,800 at $960,001.
      { kind: "whole", upTo: 2_000_000, ratePct: 5.5 },
      { kind: "marginal", upTo: null, over: 2_000_000, base: 110_000, ratePct: 6.5 },
    ],
    sourceUrls: [SRC.generalRates, SRC.act, SRC.calcApi],
    verifiedAt: V,
    verified: true,
    note: "SRO current rates page (updated 29 Sep 2026): rates apply to contracts on or after 1 July 2021.",
  },

  ownerOccupierScale: {
    scale: {
      id: "ppr",
      label: "Principal place of residence (PPR) concession rates",
      effectiveFrom: "2008-05-06",
      roundDuty: "dollar-half-down",
      brackets: [
        { kind: "marginal", upTo: 25_000, over: 0, base: 0, ratePct: 1.4 },
        { kind: "marginal", upTo: 130_000, over: 25_000, base: 350, ratePct: 2.4 },
        { kind: "marginal", upTo: 440_000, over: 130_000, base: 2_870, ratePct: 5 },
        { kind: "marginal", upTo: 550_000, over: 440_000, base: 18_370, ratePct: 6 },
      ],
      sourceUrls: [SRC.pprRates, SRC.ppr, SRC.act],
      verifiedAt: V,
      verified: true,
      note: "s 57J. Over $550,000 general rates apply to the whole value ($24,970 at $550,000 → $28,070 at $550,001).",
    },
    maxValue: 550_000,
    appliesTo: ["established", "new", "off-the-plan", "vacant-land"],
    conditions: [
      "Available to anyone (not just first home buyers) for property valued up to $550,000.",
      "At least one buyer moves in within 12 months of settlement and lives there for 12 continuous months.",
      "Vacant land: assessed on the land value; move in by the earlier of 12 months after the occupancy certificate or 36 months after settlement.",
    ],
  },

  concessions: [
    {
      id: "fhb",
      name: "First home buyer duty exemption or concession",
      requiresFirstHomeBuyer: true,
      effectiveFrom: "2017-07-01",
      appliesTo: ["established", "new", "off-the-plan", "vacant-land"],
      baseScale: "general",
      // s 57JA(3): duty = (A − $600,000) / $150,000 × B. The SRO calculator rounds B (half down) then truncates the result.
      bands: [
        { kind: "exempt", upTo: 600_000 },
        { kind: "taper-duty", from: 600_000, below: 750_000, roundResult: "dollar-down" },
      ],
      requiresCitizenOrPR: true,
      requiresOwnerOccupier: true,
      eligibility: [
        "No duty up to $600,000; reduced duty from $600,001 to $750,000. New or established homes, and vacant land to build your first home (land value only).",
        "All buyers are natural persons aged 18 or over; at least one is an Australian citizen, New Zealand citizen or permanent resident.",
        "Not available if you or your partner have received a First Home Owner Grant or first home buyer duty concession before, or owned and lived in a home in Australia.",
        "At least one buyer lives there for 12 continuous months starting within 12 months of settlement. No income test.",
      ],
      sourceUrls: [SRC.fhb, SRC.act, SRC.calcApi],
      verifiedAt: V,
      verified: true,
      note: "Rounding of the concession result is not in the Act; it follows the SRO calculator (could differ by $1 from an SRO assessment).",
    },
  ],

  grants: [
    {
      id: "fhog",
      name: "First Home Owner Grant",
      amount: 10_000,
      appliesTo: ["new", "off-the-plan", "vacant-land"],
      priceCap: 750_000,
      requiresCitizenOrPR: true,
      requiresFirstHomeBuyer: true,
      effectiveFrom: "2013-07-01",
      eligibility: [
        "$10,000 for a new home (newly built or never occupied) valued up to $750,000 — for off-the-plan, the contract price; when building, land plus construction.",
        "At least one applicant an Australian citizen, New Zealand citizen or permanent resident.",
        "Live in the home for 12 months, starting within 12 months of settlement or completion. Not available for established homes.",
      ],
      sourceUrls: [SRC.fhog, SRC.fhogRates],
      verifiedAt: V,
      verified: true,
    },
  ],

  foreignSurcharge: {
    name: "Foreign purchaser additional duty (FPAD)",
    ratePct: 8,
    effectiveFrom: "2019-07-01",
    roundTo: "dollar-half-down",
    foreignMeansNotCitizenOrPR: true,
    whoPays: [
      "Foreign natural persons: not an Australian citizen or permanent resident — temporary visa holders (and visa applicants) are foreign.",
      "New Zealand citizens are not foreign if they ordinarily live in Australia for 6 consecutive months within the 12 months before or after settlement (settlements from 26 November 2025).",
      "Foreign corporations and trustees of foreign trusts (more than 50% foreign control). Residential property only.",
      "Charged on the full dutiable value before PPR or off-the-plan concessions; joint purchases pay on the foreign buyer's share only.",
    ],
    exemptions: [
      "Permanent residents are never foreign for FPAD (no days-in-Australia test).",
      "A foreign spouse buying a home with a non-foreign spouse can be exempt if they live there for 12 months.",
      "If the transfer is exempt from land transfer duty it is also exempt from FPAD.",
    ],
    sourceUrls: [SRC.fpadRates, SRC.fpadStatus, SRC.fpadRules, SRC.act],
    verifiedAt: V,
    verified: true,
    note: "SRO: 'From 1 July 2019, the additional duty rate is 8%'.",
  },

  otherConcessions: [
    {
      id: "otp-temporary",
      name: "Temporary off-the-plan concession (apartments and townhouses)",
      summary:
        "For contracts from 21 October 2024 and before 21 April 2027, any buyer (incl. investors) of an off-the-plan lot in a strata subdivision with common property can deduct construction costs incurred after the contract date from the dutiable value. No value cap. Doesn't reduce FPAD. Not modelled here — duty may be much lower; your conveyancer applies it.",
      modelled: false,
      appliesTo: ["off-the-plan"],
      effectiveFrom: "2024-10-21",
      effectiveTo: "2027-04-21",
      sourceUrls: [SRC.otpTemp, SRC.act],
      verifiedAt: V,
      verified: true,
    },
    {
      id: "otp-ongoing",
      name: "Off-the-plan concession (ongoing)",
      summary:
        "Outside the temporary concession, the construction-cost deduction is only for buyers eligible for the PPR concession (value after deduction ≤ $550,000) or first home buyer concession (≤ $750,000).",
      modelled: false,
      appliesTo: ["off-the-plan"],
      sourceUrls: [SRC.otp],
      verifiedAt: V,
      verified: true,
    },
    {
      id: "pensioner",
      name: "Pensioner and concession card holder duty reduction",
      summary: "Exempt up to $600,000 and reduced to $750,000 (same formula as first home buyers) for eligible card holders buying their home. Once only; choose this or the first home buyer concession.",
      modelled: false,
      effectiveFrom: "2023-07-01",
      sourceUrls: [SRC.pensioner],
      verifiedAt: V,
      verified: true,
    },
  ],

  govtFees: {
    authority: "Land Use Victoria",
    effectiveFrom: "2026-07-01",
    // Transfer of Land (Fees) Regulations 2016 Sch 1 (fee unit $17.27 from 1 July 2026):
    // item 19 transfer (electronic) 6.04 fee units ($104.30) + $2.34 per whole $1,000, rounded up to the whole dollar,
    // capped at $3,510 + 6.04 fee units; item 47 mortgage (electronic) 7.48 fee units = $129.20.
    mortgageRegistration: { kind: "flat", amount: 129.2 },
    transfer: { kind: "per-thousand", base: 104.3, perThousand: 2.34, roundThousands: "down", roundResult: "dollar-up", max: 3_614 },
    notes: [
      "Electronic lodgement fees (paper lodgement costs more: transfer base $114.80, mortgage $139.50).",
      "Cap: Land Use Victoria's fee guide shows $3,614.00; the regulation arithmetic gives $3,614.30. Only affects properties over about $1.5m.",
    ],
    sourceUrls: [SRC.feesRegs, SRC.feeUnit],
    verifiedAt: V,
    verified: true,
    note: "land.vic.gov.au blocks scripted access, so the 2026-27 fee guide was not read directly; fees derived from the regulations and the gazetted fee unit.",
  },
};
