// New South Wales — Revenue NSW / NSW Land Registry Services. Verified 2026-10-26.
// General duty thresholds are CPI-indexed every 1 July; FHBAS thresholds are not indexed.
// Calculator behaviour (rounding, $20 minimum, FHBAS taper, 9% surcharge truncated to whole dollars) was confirmed by
// posting to Revenue NSW's own calculators (apps09.revenue.nsw.gov.au/erevenue/calculators/{landsalesimple,fhba,surchargeduty}.php).

import type { StateRules } from "../types";

const V = "2026-10-26";
const SRC = {
  rates: "https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/transfer-duty/understanding-transfer-duty/calculate-transfer-duty",
  fhbas: "https://www.revenue.nsw.gov.au/grants-schemes/first-home-buyer/assistance-scheme",
  fhbasCalc: "https://www.apps09.revenue.nsw.gov.au/erevenue/calculators/fhba.php",
  dutyCalc: "https://www.apps09.revenue.nsw.gov.au/erevenue/calculators/landsalesimple.php",
  fhog: "https://www.revenue.nsw.gov.au/grants-schemes/first-home-owner-new-homes-grant",
  surcharge: "https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/transfer-duty/surcharge-purchaser-duty/surcharge-for-individuals",
  surchargeCalc: "https://www.apps09.revenue.nsw.gov.au/erevenue/calculators/surchargeduty.php",
  otp: "https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/transfer-duty/understanding-transfer-duty/off-the-plan-property-purchases",
  lrsFees: "https://nswlrs.com.au/assets/f/1129775276948026/x/5fed3e7cd6/2026-2027_nsw-lrs-fees_final.pdf",
};

export const NSW: StateRules = {
  state: "NSW",
  name: "New South Wales",
  revenueOffice: "Revenue NSW",
  revenueOfficeUrl: "https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/transfer-duty",
  rulesVersion: "2026-27",

  generalScale: {
    id: "general",
    label: "General transfer duty rates 2026/2027 (incl. premium residential rate)",
    effectiveFrom: "2026-07-01",
    // "$1.25 for every $100 (minimum $20)"; the official calculator rounds the value up to the next $100
    // ($103,050 → $1,665.50) and applies the $20 minimum.
    roundValueUpTo: 100,
    minimumDuty: 20,
    roundDuty: "cents",
    brackets: [
      { kind: "marginal", upTo: 18_000, over: 0, base: 0, ratePct: 1.25 },
      { kind: "marginal", upTo: 38_000, over: 18_000, base: 225, ratePct: 1.5 },
      { kind: "marginal", upTo: 103_000, over: 38_000, base: 525, ratePct: 1.75 },
      { kind: "marginal", upTo: 387_000, over: 103_000, base: 1_662, ratePct: 3.5 },
      { kind: "marginal", upTo: 1_290_000, over: 387_000, base: 11_602, ratePct: 4.5 },
      { kind: "marginal", upTo: 3_870_000, over: 1_290_000, base: 52_237, ratePct: 5.5 },
      // Premium property duty — residential land only.
      { kind: "marginal", upTo: null, over: 3_870_000, base: 194_137, ratePct: 7 },
    ],
    sourceUrls: [SRC.rates, SRC.dutyCalc],
    verifiedAt: V,
    verified: true,
    note: "Revenue NSW: 'The rates for the 2026/2027 financial year'; premium threshold $3,870,000 applies to residential property only.",
  },

  concessions: [
    {
      id: "fhbas-home",
      name: "First Home Buyers Assistance Scheme (new or existing home)",
      requiresFirstHomeBuyer: true,
      effectiveFrom: "2023-07-01",
      appliesTo: ["established", "new", "off-the-plan"],
      baseScale: "general",
      // Exempt ≤ $800,000. Concession above $800,000 and below $1m: the official calculator gives
      // saving = D($800,000) × ($1,000,000 − value) / $200,000 (e.g. $900,000 existing home → duty $19,593.50, saving $15,093.50).
      bands: [
        { kind: "exempt", upTo: 800_000 },
        { kind: "taper-saving-from-lower", from: 800_000, below: 1_000_000 },
      ],
      requiresCitizenOrPR: true,
      requiresOwnerOccupier: true,
      eligibility: [
        "Individuals aged 18 or over (not a company or trust).",
        "You and your spouse or partner have never owned or co-owned residential property in Australia, and never received this exemption or concession.",
        "At least one first home buyer must be an Australian citizen or permanent resident.",
        "Move in within 12 months after settlement and live there for at least 12 continuous months.",
        "Must be the whole property (shared-equity rules apply when buying with ineligible buyers).",
      ],
      sourceUrls: [SRC.fhbas, SRC.fhbasCalc],
      verifiedAt: V,
      verified: true,
    },
    {
      id: "fhbas-land",
      name: "First Home Buyers Assistance Scheme (vacant land)",
      requiresFirstHomeBuyer: true,
      effectiveFrom: "2023-07-01",
      appliesTo: ["vacant-land"],
      baseScale: "general",
      // Exempt ≤ $350,000; concession above $350,000 and below $450,000 (official calculator: $400,000 → duty $7,033.50).
      bands: [
        { kind: "exempt", upTo: 350_000 },
        { kind: "taper-saving-from-lower", from: 350_000, below: 450_000 },
      ],
      requiresCitizenOrPR: true,
      requiresOwnerOccupier: true,
      eligibility: [
        "Vacant land on which you intend to build your first home.",
        "Same buyer requirements as for homes (18+, never owned residential property in Australia, at least one citizen or permanent resident).",
      ],
      sourceUrls: [SRC.fhbas, SRC.fhbasCalc],
      verifiedAt: V,
      verified: true,
    },
  ],

  grants: [
    {
      id: "fhog",
      name: "First Home Owner (New Homes) Grant",
      amount: 10_000,
      appliesTo: ["new", "off-the-plan", "vacant-land"],
      priceCap: 600_000,
      buildCap: 750_000,
      requiresCitizenOrPR: true,
      requiresFirstHomeBuyer: true,
      eligibility: [
        "New, off-the-plan or substantially renovated homes only. Not available for established homes.",
        "Purchase price must not exceed $600,000; building (land + comprehensive building contract) must not exceed $750,000.",
        "At least one applicant must be an Australian citizen or permanent resident; each applicant 18 or over.",
        "Live in the home within 12 months and for at least 12 continuous months (contracts from 1 July 2023).",
        "One grant per transaction; not available to temporary residents.",
      ],
      sourceUrls: [SRC.fhog],
      verifiedAt: V,
      verified: true,
    },
  ],

  foreignSurcharge: {
    name: "Surcharge purchaser duty",
    ratePct: 9,
    // Official surcharge calculator: $1,000,050 → $90,004.00 (9% truncated to whole dollars).
    roundTo: "dollar-down",
    whoPays: [
      "Foreign persons acquiring residential-related property in NSW, in addition to transfer duty.",
      "Temporary and bridging visa holders are foreign persons (except partner visa 309/820 holders who are ordinarily resident or exempt, and retirement visa 405/410 holders who meet the residence requirement).",
      "Permanent residents who were in Australia fewer than 200 days in the previous 12 months, unless they qualify as an exempt permanent resident.",
    ],
    exemptions: [
      "Australian citizens.",
      "Permanent residents ordinarily resident in Australia (200+ days in Australia in the 12 months before the contract).",
      "Exempt permanent residents: buy as an individual and live in the property as your principal place of residence for 200 days within 12 months.",
      "New Zealand citizens on a Special Category visa (444) who meet the 200-day residence requirement.",
      "Eligibility for the First Home Buyers Assistance Scheme does not exempt a foreign person from the surcharge.",
    ],
    sourceUrls: [SRC.rates, SRC.surcharge, SRC.surchargeCalc],
    verifiedAt: V,
    verified: true,
    note: "Revenue NSW: 'The current rate is 9% of the dutiable value.'",
  },

  otherConcessions: [
    {
      id: "otp-deferral",
      name: "Off-the-plan duty payment deferral",
      summary:
        "Owner-occupiers buying off the plan can defer paying transfer duty for up to 12 months (pay at the earliest of 15 months after the contract, settlement, or sale/assignment). Not a reduction in duty. Not available if any purchaser is a foreign person, or for vacant land.",
      modelled: false,
      appliesTo: ["off-the-plan"],
      sourceUrls: [SRC.otp],
      verifiedAt: V,
      verified: true,
    },
  ],

  govtFees: {
    authority: "NSW Land Registry Services",
    effectiveFrom: "2026-07-01",
    // 2026/27 fees update: Mortgage and Transfer (s46 Real Property Act) $166.60 excl. GST (incl. $5.35 Torrens Assurance
    // Fund levy) = $182.73 incl. GST.
    mortgageRegistration: { kind: "flat", amount: 182.73 },
    transfer: { kind: "flat", amount: 182.73 },
    notes: ["Fees include GST and the Torrens Assurance Fund levy. Revenue NSW also charges $20 per duplicate/transfer when stamping."],
    sourceUrls: [SRC.lrsFees],
    verifiedAt: V,
    verified: true,
  },
};
