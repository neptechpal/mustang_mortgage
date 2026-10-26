// South Australia — RevenueSA / Land Services SA. Verified 2026-10-26.
// Law: Stamp Duties Act 1923 (version from 15 Sep 2026) Sch 2 cl 3(1)(b) (rates unchanged since 2002, "for every $100 or
// fractional part of $100"), s 71DD first home buyer relief (contracts from 6 June 2024: no duty, no value cap, NEW homes /
// off-the-plan / vacant land only — established homes get no relief), s 72 foreign ownership surcharge 7%.
// revenuesa.sa.gov.au and legislation.sa.gov.au block scripted access: pages were checked live in a browser, and test values
// are outputs of RevenueSA's own calculator function. Land Services SA fee PDFs were read from Wayback copies (12 Jun 2026).

import type { StateRules } from "../types";

const V = "2026-10-26";
const SRC = {
  rates: "https://www.revenuesa.sa.gov.au/stampduty/rate-of-stamp-duty",
  calc: "https://www.revenuesa.sa.gov.au/stampduty/calculate-stamp-duty",
  act: "https://www.legislation.sa.gov.au/lz?path=/c/a/stamp%20duties%20act%201923",
  fhbRelief: "https://www.revenuesa.sa.gov.au/stampduty/first-home-buyer-relief/relief-available",
  fhbProps: "https://www.revenuesa.sa.gov.au/stampduty/first-home-buyer-relief/eligible-properties",
  fhbApplicants: "https://www.revenuesa.sa.gov.au/stampduty/first-home-buyer-relief/eligible-applicants",
  fhog: "https://www.revenuesa.sa.gov.au/FHOG",
  fhogProps: "https://www.revenuesa.sa.gov.au/FHOG/eligible-properties",
  fhogDetails: "https://www.revenuesa.sa.gov.au/FHOG/grant-details",
  fos: "https://www.revenuesa.sa.gov.au/stampduty/FOS",
  fosForeign: "https://www.revenuesa.sa.gov.au/stampduty/FOS/foreign-person",
  seniors: "https://www.revenuesa.sa.gov.au/stampduty/seniors-downsizing-stamp-duty-relief",
  lssaAdVal: "https://landservices.com.au/our-resources/industry-ad-valorem-fees-2026-27/",
  lssaDocs: "https://landservices.com.au/our-resources/document-lodgement-fees-2026-27/",
  lssaFees: "https://landservices.com.au/our-resources/fees-and-charges-2026-27/",
};

export const SA: StateRules = {
  state: "SA",
  name: "South Australia",
  revenueOffice: "RevenueSA",
  revenueOfficeUrl: "https://www.revenuesa.sa.gov.au/stampduty",
  rulesVersion: "2026-27",

  generalScale: {
    id: "general",
    label: "Stamp duty on conveyances (residential and primary production land)",
    effectiveFrom: "2002-09-05",
    roundValueUpTo: 100,
    roundDuty: "cents",
    brackets: [
      { kind: "marginal", upTo: 12_000, over: 0, base: 0, ratePct: 1 },
      { kind: "marginal", upTo: 30_000, over: 12_000, base: 120, ratePct: 2 },
      { kind: "marginal", upTo: 50_000, over: 30_000, base: 480, ratePct: 3 },
      { kind: "marginal", upTo: 100_000, over: 50_000, base: 1_080, ratePct: 3.5 },
      { kind: "marginal", upTo: 200_000, over: 100_000, base: 2_830, ratePct: 4 },
      { kind: "marginal", upTo: 250_000, over: 200_000, base: 6_830, ratePct: 4.25 },
      { kind: "marginal", upTo: 300_000, over: 250_000, base: 8_955, ratePct: 4.75 },
      { kind: "marginal", upTo: 500_000, over: 300_000, base: 11_330, ratePct: 5 },
      { kind: "marginal", upTo: null, over: 500_000, base: 21_330, ratePct: 5.5 },
    ],
    sourceUrls: [SRC.rates, SRC.act, SRC.calc],
    verifiedAt: V,
    verified: true,
    note: "No owner-occupier rate and no minimum duty on conveyances. Changes to which land counts as residential took effect 15 Sep 2026 (rates unchanged).",
  },

  concessions: [
    {
      id: "fhb-relief",
      name: "First home buyer stamp duty relief",
      requiresFirstHomeBuyer: true,
      effectiveFrom: "2024-06-06",
      appliesTo: ["new", "off-the-plan", "vacant-land"],
      baseScale: "general",
      bands: [{ kind: "exempt", upTo: Number.POSITIVE_INFINITY }],
      requiresCitizenOrPR: true,
      requiresOwnerOccupier: true,
      eligibility: [
        "Full relief at any value for a new home (incl. substantially renovated, bought from a GST-registered builder/developer), an off-the-plan apartment, or vacant land to build your first home (incl. house-and-land packages).",
        "Not available for established homes, knock-down rebuilds, investment properties or holiday homes.",
        "Applicants are natural persons 18+; at least one an Australian citizen, permanent resident or NZ citizen on a special category visa. No applicant or partner has ever held an interest in Australian residential property (contracts from 13 Feb 2025). Not means tested.",
        "Live in the home for 6 continuous months starting within 12 months of settlement (vacant land: within 12 months of the home being usable or 36 months from settlement).",
        "The relief does not reduce the foreign ownership surcharge.",
      ],
      sourceUrls: [SRC.fhbRelief, SRC.fhbProps, SRC.fhbApplicants, SRC.act],
      verifiedAt: V,
      verified: true,
      note: "RevenueSA: 'Full stamp duty relief is available, regardless of the property value.' / 'not available on the purchase of an established home'.",
    },
  ],

  grants: [
    {
      id: "fhog",
      name: "First Home Owner Grant",
      amount: 15_000,
      appliesTo: ["new", "off-the-plan", "vacant-land"],
      priceCap: null,
      requiresCitizenOrPR: true,
      requiresFirstHomeBuyer: true,
      effectiveFrom: "2024-06-06",
      eligibility: [
        "Up to $15,000 (or the price if less) for buying or building a new home, an off-the-plan apartment or a substantially renovated home. Not for established homes or vacant land alone.",
        "No property value cap for contracts from 6 June 2024.",
        "Same citizen/permanent resident, never-owned and 6-month residence rules as the stamp duty relief. Apply separately.",
      ],
      sourceUrls: [SRC.fhog, SRC.fhogProps, SRC.fhogDetails],
      verifiedAt: V,
      verified: true,
    },
  ],

  foreignSurcharge: {
    name: "Foreign ownership surcharge",
    ratePct: 7,
    effectiveFrom: "2018-01-01",
    roundTo: "cents",
    foreignMeansNotCitizenOrPR: true,
    whoPays: [
      "Foreign persons acquiring residential land: anyone who is not an Australian citizen, permanent resident or NZ citizen on a special category (444) visa — temporary visa holders pay it, even if married to an Australian.",
      "Foreign corporations and trusts. Charged on the value of the interest acquired (joint tenants treated as equal shares), on top of normal duty.",
    ],
    exemptions: [
      "Refund if the buyer stops being a foreign person within 12 months of acquiring the interest.",
      "First home buyer relief does not apply to the surcharge.",
    ],
    sourceUrls: [SRC.fos, SRC.fosForeign, SRC.act],
    verifiedAt: V,
    verified: true,
    note: "Stamp Duties Act s 72(3): 'is 7% of the value of the interest acquired'.",
  },

  otherConcessions: [
    {
      id: "seniors-downsizing",
      name: "Seniors downsizing stamp duty relief",
      summary:
        "For contracts from 25 March 2026: buyers aged 60+ (one a citizen/PR) selling their SA home and buying a new home, off-the-plan apartment or vacant land on a smaller block get full relief up to $2m (new/off-the-plan) or $1.2m (vacant land), reducing to nil at $2.1m / $1.3m. Not modelled — the surcharge still applies.",
      modelled: false,
      appliesTo: ["new", "off-the-plan", "vacant-land"],
      effectiveFrom: "2026-03-25",
      sourceUrls: [SRC.seniors],
      verifiedAt: V,
      verified: true,
      note: "Published on RevenueSA (2026-27 Budget measure); the legislative basis was not located in the Stamp Duties Act as at 15 Sep 2026.",
    },
  ],

  govtFees: {
    authority: "Land Services SA",
    effectiveFrom: "2026-07-01",
    // Real Property (Fees) Notice 2026: transfer ≤$5k $204; ≤$20k $228; ≤$40k $251; ≤$50k $353; then +$105 per $10,000 (or part)
    // above $50,000 (matches all 106 rows of the 2026-27 ad valorem table). Mortgage (M1) $204. Fees include a $15 transaction fee.
    mortgageRegistration: { kind: "flat", amount: 204 },
    transfer: {
      kind: "table",
      rows: [
        { upTo: 5_000, fee: 204 },
        { upTo: 20_000, fee: 228 },
        { upTo: 40_000, fee: 251 },
        { upTo: 50_000, fee: 353 },
      ],
      above: { base: 353, over: 50_000, step: 10_000, perStep: 105 },
    },
    notes: ["Transfers exempt from duty pay a flat $204. Based on the greater of the price and the capital value."],
    sourceUrls: [SRC.lssaAdVal, SRC.lssaDocs, SRC.lssaFees],
    verifiedAt: V,
    verified: true,
    note: "landservices.com.au is geo-blocked from our network; the official 2026-27 fee PDFs were read from Wayback copies dated 12 Jun 2026, not cross-checked against the Gazette.",
  },
};
