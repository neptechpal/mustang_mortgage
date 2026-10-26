/**
 * Visa / residency policy facts for /visa-home-loans/{slug}/ (research §C4.4).
 *
 * Facts only — no marketing copy. Every fact group has `sourceUrls`, `verified`, `verifiedAt`.
 * `verified: false` ⇒ do not state it as fact on a page; link the official source instead.
 * Dollar amounts, duty rates and thresholds belong to the stamp-duty / StateRules engine (other owner);
 * state entries here are eligibility summaries by residency class only.
 *
 * Checked 2026-10-26 against Home Affairs, foreigninvestment.gov.au (FIRB Guidance Notes 2 v5 and 6 v5),
 * Treasury/Budget 2026-27, firsthomebuyers.gov.au and each state/territory revenue office or legislation
 * register. ATO foreign-investment pages and RevenueSA / ACT / NT revenue pages blocked automated access
 * (HTTP 403); see notes.
 */
import type {
  EstablishedDwellingBan,
  FirbStatus,
  ResidencyClass,
  Sourced,
  StateCode,
  StateResidencyRule,
  Tri,
  VisaPolicy,
} from "./types";

export const VISA_VERIFIED_AT = "2026-10-26";
const AT = VISA_VERIFIED_AT;

// ------------------------------------------------------------------ source URLs

export const SRC = {
  firbGn2: "https://foreigninvestment.gov.au/sites/foreigninvestment.gov.au/files/2025-12/guidance-note-2-key-concepts-v5.pdf",
  firbGn6: "https://foreigninvestment.gov.au/sites/foreigninvestment.gov.au/files/2026-06/guidance-note-6-residential-land-v5.pdf",
  firbResidential: "https://foreigninvestment.gov.au/getting-started/investment-information/residential",
  firbFees: "https://foreigninvestment.gov.au/guidance/general/fees",
  budget2026Bp2: "https://budget.gov.au/content/bp2/download/bp2_2026-27.pdf",
  treasuryBanExtension:
    "https://ministers.treasury.gov.au/ministers/jim-chalmers-2022/media-releases/more-homes-and-fair-go-first-home-buyers",
  treasuryBanOriginal:
    "https://ministers.treasury.gov.au/ministers/jim-chalmers-2022/media-releases/albanese-government-clamping-down-foreign-purchase",
  scheme5pcGuide:
    "https://firsthomebuyers.gov.au/sites/default/files/2025-09/Australian%20Government%205%25%20Deposit%20Scheme%20Information%20Guide.pdf",
  scheme5pcFaq: "https://firsthomebuyers.gov.au/australian-government-5-percent-deposit-scheme/5-percent-tools-and-resources/faqs",
  scheme5pcCaps: "https://firsthomebuyers.gov.au/australian-government-5-percent-deposit-scheme/property-price-caps",
  helpToBuy: "https://firsthomebuyers.gov.au/australian-government-help-buy-scheme",
  draAreas: "https://immi.homeaffairs.gov.au/visas/working-in-australia/regional-migration/eligible-regional-areas",
  draPostcodes: "https://immi.homeaffairs.gov.au/visas/working-in-australia/skill-occupation-list/regional-postcodes",
  cond8579Foi: "https://www.homeaffairs.gov.au/foi/files/2025/fa-250101348-document-released.PDF",
  ha189: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189",
  ha189Points: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189/points-tested",
  ha190: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-nominated-190",
  ha491: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-work-regional-provisional-491",
  ha491App: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-work-regional-provisional-491/application",
  ha191: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-regional-191/regional-provisional",
  ha482: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-visa-subclass-482",
  ha482Core: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-visa-subclass-482/core-skills-stream",
  ha482TssRepealed:
    "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/repealed-visas/temporary-skill-shortage-short-term-visa-subclass-482",
  ha494: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-employer-sponsored-regional-494/employer-sponsored-stream",
  ha186Trt: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/employer-nomination-scheme-186/temporary-residence-transition-stream",
  ha186De: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/employer-nomination-scheme-186/direct-entry-stream",
  ha820: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-onshore/temporary-820",
  ha801: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-onshore/permanent-801",
  ha309: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-offshore/provisional-309",
  ha100: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-offshore/migrant-100",
  haBva: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/bridging-visa-a-010",
  haBvb: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/bridging-visa-b-020",
  haBvc: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/bridging-visa-c-030",
  haBve: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/bridging-visa-e-050-051/subclass-050",
  ha444: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/special-category-visa-subclass-444",
  nswSpdIndividuals:
    "https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/transfer-duty/surcharge-purchaser-duty/individuals",
  nswSpdWhat:
    "https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/transfer-duty/surcharge-purchaser-duty/what-is-surcharge-purchaser-duty",
  nswFhbas: "https://www.revenue.nsw.gov.au/grants-schemes/first-home-buyer/assistance-scheme",
  nswFhbasNzForm: "https://www.revenue.nsw.gov.au/help-centre/resources-library/forms/fhog/ODA066B.pdf",
  nswFhog: "https://www.revenue.nsw.gov.au/grants-schemes/first-home-owner-new-homes-grant",
  vicFpad: "https://www.sro.vic.gov.au/buying-property/foreign-purchasers-property/understanding-foreign-purchaser-additional-duty",
  vicFpadExemptions:
    "https://www.sro.vic.gov.au/buying-property/foreign-purchasers-property/exemptions-concessions-and-rules-foreign-purchaser-additional-duty",
  vicFhb:
    "https://www.sro.vic.gov.au/buying-property/land-transfer-stamp-duty/concessions-exemptions-and-waivers/first-home-buyers/first-home-buyer-duty-exemption-or-concession",
  vicFhog: "https://www.sro.vic.gov.au/buying-property/first-home-owner-grant/understanding-first-home-owner-grant",
  qldAfad: "https://qro.qld.gov.au/duties/investors/afad/foreign-persons/",
  qldAfadAssessing: "https://qro.qld.gov.au/duties/investors/afad/assessing/",
  qldFhb: "https://qro.qld.gov.au/duties/transfer-duty/concessions/homes/first-home/",
  qldFhog: "https://qro.qld.gov.au/property-concessions-grants/first-home-grant/eligibility/",
  waFtd: "https://www.wa.gov.au/system/files/2026-10/foreign-transfer-duty-fact-sheet.pdf",
  waFtdAbout: "https://www.wa.gov.au/service/financial-management/taxation-and-duty/about-foreign-buyers-duty",
  waFhor: "https://www.wa.gov.au/system/files/2026-08/first-home-owner-rate-fact-sheet.pdf",
  waFhog: "https://www.wa.gov.au/system/files/2026-07/first-home-owner-grant.pdf",
  waFhogTerms: "https://www.wa.gov.au/government/multi-step-guides/fhog-lodgement-guide/fhog-lodgement-guide-terms-used",
  saFos: "https://www.revenuesa.sa.gov.au/stamp-duty/foreign-ownership-surcharge/foreign-person",
  saFosFaq: "https://www.revenuesa.sa.gov.au/taxes-and-duties/foreign-ownership-surcharge/frequently-asked-questions",
  saFhb: "https://www.revenuesa.sa.gov.au/stamp-duty-land/first-home-buyer-relief/eligible-applicants",
  saFhog: "https://revenuesa.sa.gov.au/FirstHomeOwnerGrant/eligible-applicants",
  tasFids: "https://www.sro.tas.gov.au/property-transfer-duties/foreign-investor-duty-surcharge/definition-of-foreign",
  tasFidsExemptions: "https://www.sro.tas.gov.au/property-transfer-duties/foreign-investor-duty-surcharge/exemptions",
  tasFhbEnded:
    "https://www.sro.tas.gov.au/property-transfer-duties/concessions-exemptions/first-home-buyers-of-established-homes-duty-relief",
  tasFhog: "https://www.sro.tas.gov.au/first-home-owner/eligibility",
  actDutiesAct: "https://www.legislation.act.gov.au/DownloadFile/a/1999-7/current/PDF/1999-7.PDF",
  actHbcs: "https://legislation.act.gov.au/DownloadFile/di/2026-157/current/PDF/2026-157.PDF",
  actFhog: "https://www.revenue.act.gov.au/home-buyer-assistance/first-home-owner-grant",
  ntStampDutyAct: "https://legislation.nt.gov.au/api/sitecore/Act/PDF?id=11906",
  ntFhogAct: "https://legislation.nt.gov.au/en/Legislation/FIRST-HOME-OWNER-GRANT-ACT-2000",
} as const;

// ------------------------------------------------------------------ Commonwealth facts by residency class

type Cls = Exclude<ResidencyClass, "citizen">;

export const BAN_FROM = "2025-04-01";
/** Extended in the 2026-27 Budget from the original 2027-03-31. */
export const BAN_TO = "2029-06-30";

const FIRB_BY_CLASS: Record<Cls, FirbStatus> = {
  permanent: {
    foreignPerson: "conditional",
    approvalRequired: "no",
    note:
      "A permanent visa holder in Australia ≥200 days in the previous 12 months is ordinarily resident and not a foreign person (FATA s5; GN2 Example 1). Holders of permanent visas are exempt from needing approval for residential land, including established dwellings (Regulation s38(2); GN6 v5 Example 13). The exemption is stated without a 200-day qualification.",
    sourceUrls: [SRC.firbGn2, SRC.firbGn6, SRC.firbResidential],
    verified: true,
    verifiedAt: AT,
  },
  nz444: {
    foreignPerson: "conditional",
    approvalRequired: "no",
    note:
      "NZ citizens not ordinarily resident are generally foreign persons, but NZ citizens who hold or are eligible for a Special Category visa (444) are exempt from approval for residential land, including established dwellings during the ban (Regulation s38(2); GN6 v5 Example 12).",
    sourceUrls: [SRC.firbGn2, SRC.firbGn6, SRC.firbResidential],
    verified: true,
    verifiedAt: AT,
  },
  temporary: {
    foreignPerson: "yes",
    approvalRequired: "yes",
    note:
      "Temporary residents (temporary visa allowing a continuous stay >12 months, or an onshore bridging visa while a permanent visa application is pending) are foreign persons; 200+ days in Australia does not change this (GN2 Example 2). Exemption: buying as joint tenants with an Australian-citizen, Australian-PR or SCV-eligible NZ-citizen spouse (Regulation s38(3)); not tenants in common.",
    sourceUrls: [SRC.firbGn2, SRC.firbGn6, SRC.firbResidential],
    verified: true,
    verifiedAt: AT,
  },
};

const BAN_SOURCES = [SRC.firbGn6, SRC.firbResidential, SRC.budget2026Bp2, SRC.treasuryBanExtension, SRC.treasuryBanOriginal];

const BAN_BY_CLASS: Record<Cls, EstablishedDwellingBan> = {
  permanent: {
    applies: "no",
    from: null,
    to: null,
    note: "Permanent visa holders do not need approval to buy an established dwelling (GN6 v5 Example 13).",
    sourceUrls: [SRC.firbGn6],
    verified: true,
    verifiedAt: AT,
  },
  nz444: {
    applies: "no",
    from: null,
    to: null,
    note: "NZ citizens holding or eligible for a 444 visa can buy established dwellings without approval during the ban (GN6 v5 Example 12).",
    sourceUrls: [SRC.firbGn6],
    verified: true,
    verifiedAt: AT,
  },
  temporary: {
    applies: "yes",
    from: BAN_FROM,
    to: BAN_TO,
    note:
      "Foreign persons, including temporary residents and foreign-owned companies, are generally prohibited from buying established dwellings from 1 Apr 2025 to 30 Jun 2029 (extended in the 2026-27 Budget from 31 Mar 2027). Temporary residents can no longer get approval to buy an established home to live in. Exceptions are commercial (redevelopment adding ≥20 dwellings, commercial-scale housing, PALM worker housing, some near-new dwellings). The ban does not apply to new dwellings or vacant land that has never had a dwelling.",
    sourceUrls: BAN_SOURCES,
    verified: true,
    verifiedAt: AT,
  },
};

const NEW_DWELLING_BY_CLASS: Record<Cls, VisaPolicy["newDwellingFirb"]> = {
  permanent: { required: "no", note: "Exempt from approval (Regulation s38(2)).", sourceUrls: [SRC.firbResidential], verified: true, verifiedAt: AT },
  nz444: { required: "no", note: "Exempt from approval (Regulation s38(2)).", sourceUrls: [SRC.firbResidential], verified: true, verifiedAt: AT },
  temporary: {
    required: "yes",
    note:
      "Approval needed for a new dwelling (generally conditioned only on price) or vacant land (dwelling must be completed within 4 years). Not needed if the developer holds a New/Near-New Dwelling Exemption Certificate. Application fee applies (see FIRB fees page; amounts owned by the calculator). Annual vacancy fee if not occupied or genuinely available to rent ≥183 days a year.",
    sourceUrls: [SRC.firbGn6, SRC.firbFees],
    verified: true,
    verifiedAt: AT,
  },
};

const FIVE_PC_BY_CLASS: Record<Cls, VisaPolicy["fiveDepositScheme"]> = {
  permanent: {
    eligible: "yes",
    note:
      "Applicants must be Australian citizens or permanent residents at the home loan date (joint applicants: both). From 1 Oct 2025: no income caps, unlimited places. Property price caps apply (NSW: see scheme5pcCaps).",
    sourceUrls: [SRC.scheme5pcGuide, SRC.scheme5pcFaq, SRC.scheme5pcCaps],
    verified: true,
    verifiedAt: AT,
  },
  nz444: {
    eligible: "unknown",
    note:
      "Scheme documents define 'permanent resident' by the Australian Citizenship Act 2007 and do not mention NZ citizens or the 444 visa; the participating lender confirms eligibility.",
    sourceUrls: [SRC.scheme5pcGuide, SRC.scheme5pcFaq],
    verified: false,
    verifiedAt: AT,
  },
  temporary: {
    eligible: "no",
    note:
      "Not eligible if any applicant is a temporary resident, including a couple where only one is a citizen/PR, or where PR has been applied for but not granted.",
    sourceUrls: [SRC.scheme5pcGuide],
    verified: true,
    verifiedAt: AT,
  },
};

const HELP_TO_BUY_BY_CLASS: Record<Cls, VisaPolicy["helpToBuy"]> = {
  permanent: { eligible: "no", note: "Help to Buy requires all applicants to be Australian citizens.", sourceUrls: [SRC.helpToBuy], verified: true, verifiedAt: AT },
  nz444: { eligible: "no", note: "Help to Buy requires all applicants to be Australian citizens.", sourceUrls: [SRC.helpToBuy], verified: true, verifiedAt: AT },
  temporary: { eligible: "no", note: "Help to Buy requires all applicants to be Australian citizens.", sourceUrls: [SRC.helpToBuy], verified: true, verifiedAt: AT },
};

// ------------------------------------------------------------------ state rules by residency class

type RuleInput = Omit<StateResidencyRule, "state" | "residencyClass" | "verifiedAt"> & { verifiedAt?: string };

const R = (state: StateCode, residencyClass: Cls, r: RuleInput): StateResidencyRule => ({
  state,
  residencyClass,
  verifiedAt: AT,
  ...r,
});

const SA_NOTE =
  "revenuesa.sa.gov.au blocks automated access (403): SA entries come from search-engine snippets of RevenueSA pages only. Confirm in a browser before stating.";

/** Eligibility summaries per state × residency class. Numbers (rates, caps, thresholds) live in the calculator's StateRules. */
export const STATE_RESIDENCY_RULES: Record<Cls, StateResidencyRule[]> = {
  permanent: [
    R("NSW", "permanent", {
      surcharge: "conditional",
      surchargeNote:
        "Surcharge purchaser duty applies unless the PR was in Australia ≥200 days in the 12 months before the contract, or lives in the property as principal place of residence for 200 continuous days within 12 months of the contract ('exempt permanent resident'; must apply).",
      fhbConcession: "yes",
      fhbConcessionNote: "FHBAS: at least one buyer must be an Australian citizen or permanent resident.",
      fhog: "yes",
      fhogNote: "First Home Owner (New Homes) Grant: at least one applicant citizen/PR.",
      sourceUrls: [SRC.nswSpdIndividuals, SRC.nswSpdWhat, SRC.nswFhbas, SRC.nswFhog],
      verified: true,
    }),
    R("VIC", "permanent", {
      surcharge: "no",
      surchargeNote: "A permanent visa holder is not a foreign natural person for FPAD; no 200-day test. Status assessed at settlement.",
      fhbConcession: "yes",
      fhbConcessionNote: "At least one purchaser must be an Australian citizen, NZ citizen or permanent resident.",
      fhog: "yes",
      fhogNote: "At least one applicant citizen/PR at the relevant date.",
      sourceUrls: [SRC.vicFpad, SRC.vicFhb, SRC.vicFhog],
      verified: true,
    }),
    R("QLD", "permanent", {
      surcharge: "no",
      surchargeNote: "AFAD: a foreign individual is not an Australian citizen or permanent resident; PR = permanent visa holder.",
      fhbConcession: "yes",
      fhbConcessionNote: "For transactions from 1 Aug 2026 the claimant must be a citizen, PR or specified foreign retiree; assessed per buyer's share.",
      fhog: "yes",
      fhogNote: "Must be a citizen or PR, or apply with someone who is.",
      sourceUrls: [SRC.qldAfad, SRC.qldFhb, SRC.qldFhog],
      verified: true,
    }),
    R("WA", "permanent", {
      surcharge: "no",
      surchargeNote: "Foreign transfer duty: a permanent visa holder is not a foreign individual.",
      fhbConcession: "yes",
      fhbConcessionNote: "First home owner rate (FHOR) follows FHOG eligibility: at least one applicant citizen/PR.",
      fhog: "yes",
      fhogNote: "At least one applicant citizen/PR at the date of application.",
      sourceUrls: [SRC.waFtd, SRC.waFhor, SRC.waFhog],
      verified: true,
    }),
    R("SA", "permanent", {
      surcharge: "no",
      surchargeNote: "Foreign ownership surcharge: a permanent resident is not a foreign natural person.",
      fhbConcession: "yes",
      fhbConcessionNote: "First home buyer stamp duty relief (new homes, off-the-plan, vacant land to build — not established homes): at least one applicant citizen/PR.",
      fhog: "yes",
      fhogNote: "At least one applicant citizen/PR.",
      sourceUrls: [SRC.saFos, SRC.saFhb, SRC.saFhog],
      verified: false,
      note: SA_NOTE,
    }),
    R("TAS", "permanent", {
      surcharge: "no",
      surchargeNote: "Foreign investor duty surcharge: a permanent visa holder is not a foreign natural person.",
      fhbConcession: "no",
      fhbConcessionNote: "No current first-home duty concession: the established-homes duty relief ended for transactions settling after 30 Jun 2026 (applies to all buyers).",
      fhog: "yes",
      fhogNote: "Applicant must be a citizen or PR (joint: one is enough).",
      sourceUrls: [SRC.tasFids, SRC.tasFhbEnded, SRC.tasFhog],
      verified: true,
    }),
    R("ACT", "permanent", {
      surcharge: "no",
      surchargeNote: "No foreign purchaser surcharge on ACT conveyance duty (Duties Act 1999). ACT separately levies an annual foreign-ownership land tax surcharge (not verified first-hand).",
      fhbConcession: "yes",
      fhbConcessionNote: "Home Buyer Concession Scheme (from 1 Jul 2026: nil duty, no income test, no value cap): no citizenship/visa requirement; no interest in land in the previous 5 years.",
      fhog: "no",
      fhogNote: "ACT First Home Owner Grant closed for transactions from 1 Jul 2019 (applies to all buyers).",
      sourceUrls: [SRC.actDutiesAct, SRC.actHbcs, SRC.actFhog],
      verified: true,
      note: "revenue.act.gov.au blocked (403); verified via the ACT legislation register. FHOG closure from a search snippet of the official page.",
    }),
    R("NT", "permanent", {
      surcharge: "no",
      surchargeNote: "NT has no foreign purchaser stamp duty surcharge (Stamp Duty Act 1978, reprint as at 1 Jul 2025).",
      fhbConcession: "yes",
      fhbConcessionNote: "No general first-home duty concession (ended 30 Jun 2021). The House and Land Package Exemption (contracts 1 Jul 2022 – 30 Jun 2027, not first-home-specific) requires at least one conveyee citizen/PR.",
      fhog: "yes",
      fhogNote: "Applicant must be a citizen or PR (joint: one is enough).",
      sourceUrls: [SRC.ntStampDutyAct, SRC.ntFhogAct],
      verified: true,
      note: "NT revenue office pages blocked (403); verified via the NT legislation register. Later amendments to the 1 Jul 2025 reprint not checked.",
    }),
  ],

  nz444: [
    R("NSW", "nz444", {
      surcharge: "conditional",
      surchargeNote: "Not a foreign person if the 444 holder meets a residence requirement (≥200 days in Australia in the prior 12 months, or lives in the property 200 continuous days within 12 months of the contract).",
      fhbConcession: "yes",
      fhbConcessionNote: "FHBAS: 'permanent resident' includes a NZ citizen holding a special category visa.",
      fhog: "yes",
      fhogNote: "PR includes NZ citizen with SCV; must be living in Australia at the commencement date.",
      sourceUrls: [SRC.nswSpdIndividuals, SRC.nswFhbas, SRC.nswFhbasNzForm, SRC.nswFhog],
      verified: true,
    }),
    R("VIC", "nz444", {
      surcharge: "conditional",
      surchargeNote: "From 26 Nov 2025 a NZ citizen is not foreign if ordinarily resident in Australia for 6 consecutive months within the 12 months before or after settlement (before then: needed a 444 at settlement).",
      fhbConcession: "yes",
      fhbConcessionNote: "NZ citizens are eligible purchasers.",
      fhog: "yes",
      fhogNote: "For settlements from 26 Nov 2025 NZ citizens are eligible whether or not they hold a 444.",
      sourceUrls: [SRC.vicFpad, SRC.vicFpadExemptions, SRC.vicFhb, SRC.vicFhog],
      verified: true,
    }),
    R("QLD", "nz444", {
      surcharge: "no",
      surchargeNote: "A NZ citizen holding a 444 when entering the transaction is a permanent resident for AFAD (anti-avoidance rule if entry was to obtain the 444).",
      fhbConcession: "yes",
      fhbConcessionNote: "PR includes a NZ citizen with a special category visa.",
      fhog: "yes",
      fhogNote: "PR includes a NZ citizen with SCV (current NZ passport).",
      sourceUrls: [SRC.qldAfad, SRC.qldFhb, SRC.qldFhog],
      verified: true,
    }),
    R("WA", "nz444", {
      surcharge: "no",
      surchargeNote: "A special category visa holder is not a foreign individual.",
      fhbConcession: "yes",
      fhbConcessionNote: "FHOR follows FHOG eligibility (PR includes NZ citizen with SCV).",
      fhog: "yes",
      fhogNote: "PR includes NZ citizen with SCV; the Act also requires intent to reside permanently in Australia.",
      sourceUrls: [SRC.waFtd, SRC.waFhor, SRC.waFhog, SRC.waFhogTerms],
      verified: true,
      note: "WA 'intent to reside permanently' wording read from a 2015 reprint of the FHOG Act; current reprint not checked.",
    }),
    R("SA", "nz444", {
      surcharge: "no",
      surchargeNote: "Not a foreign natural person if a NZ citizen holding a 444 (some RevenueSA pages add 'permanently residing in Australia').",
      fhbConcession: "yes",
      fhbConcessionNote: "NZ citizen permanently residing in Australia with a 444 qualifies as an applicant.",
      fhog: "yes",
      fhogNote: "NZ citizen permanently residing in Australia with a 444 qualifies.",
      sourceUrls: [SRC.saFos, SRC.saFosFaq, SRC.saFhb, SRC.saFhog],
      verified: false,
      note: SA_NOTE,
    }),
    R("TAS", "nz444", {
      surcharge: "no",
      surchargeNote: "A NZ citizen holding a special category visa is not a foreign natural person.",
      fhbConcession: "no",
      fhbConcessionNote: "No current first-home duty concession (ended for settlements after 30 Jun 2026).",
      fhog: "yes",
      fhogNote: "PR includes NZ citizen with SCV; must be living in Australia when applying.",
      sourceUrls: [SRC.tasFids, SRC.tasFhbEnded, SRC.tasFhog],
      verified: true,
    }),
    R("ACT", "nz444", {
      surcharge: "no",
      surchargeNote: "No foreign purchaser surcharge on conveyance duty.",
      fhbConcession: "yes",
      fhbConcessionNote: "Home Buyer Concession Scheme has no citizenship/visa requirement.",
      fhog: "no",
      fhogNote: "Grant closed from 1 Jul 2019.",
      sourceUrls: [SRC.actDutiesAct, SRC.actHbcs, SRC.actFhog],
      verified: true,
      note: "Verified via the ACT legislation register (revenue site blocked).",
    }),
    R("NT", "nz444", {
      surcharge: "no",
      surchargeNote: "No foreign purchaser surcharge.",
      fhbConcession: "yes",
      fhbConcessionNote: "House and Land Package Exemption: PR (incl. NZ citizen with SCV) qualifies.",
      fhog: "yes",
      fhogNote: "PR includes NZ citizen with SCV.",
      sourceUrls: [SRC.ntStampDutyAct, SRC.ntFhogAct],
      verified: true,
      note: "Verified via the NT legislation register (revenue site blocked).",
    }),
  ],

  temporary: [
    R("NSW", "temporary", {
      surcharge: "yes",
      surchargeNote:
        "Temporary and bridging visa holders pay surcharge purchaser duty, except partner (309/820) holders meeting the residence requirement (treated like PR) and retirement (405/410) holders meeting it. Refund if no longer a foreign person at the date of transfer (e.g. PR granted before settlement).",
      fhbConcession: "conditional",
      fhbConcessionNote: "FHBAS only with a citizen/PR co-buyer (eligible buyers together ≥50%); the temporary-visa co-buyer still pays surcharge on their share.",
      fhog: "conditional",
      fhogNote: "Joint application with a citizen/PR meets the 'at least one applicant' rule, but the Revenue NSW FAQ says benefits are not available for temporary residents and cannot be backdated once PR is granted — confirm with Revenue NSW.",
      sourceUrls: [SRC.nswSpdIndividuals, SRC.nswSpdWhat, SRC.nswFhbas, SRC.nswFhog],
      verified: true,
    }),
    R("VIC", "temporary", {
      surcharge: "yes",
      surchargeNote:
        "FPAD applies to temporary visa holders (visa applied for but not granted = still foreign). Not foreign if PR held by settlement. Exemption: buying a home with a non-foreign spouse/partner and living there 12 months starting within 12 months of settlement.",
      fhbConcession: "conditional",
      fhbConcessionNote: "Only with a citizen/NZ citizen/PR co-purchaser; FPAD may still apply to the foreign share.",
      fhog: "conditional",
      fhogNote: "Only as a joint applicant with a citizen/PR/NZ citizen.",
      sourceUrls: [SRC.vicFpad, SRC.vicFpadExemptions, SRC.vicFhb, SRC.vicFhog],
      verified: true,
    }),
    R("QLD", "temporary", {
      surcharge: "yes",
      surchargeNote: "AFAD applies; status tested when liability arises (contract). No refund if PR is granted later. Exemption only for specified foreign retirees (405/410) buying their home.",
      fhbConcession: "no",
      fhbConcessionNote: "From 1 Aug 2026 the concession is per buyer's share and requires citizen/PR (or specified foreign retiree): a temporary-visa buyer's share pays full duty plus AFAD; a citizen/PR co-buyer's share can still get the concession.",
      fhog: "conditional",
      fhogNote: "Only as a joint applicant with a citizen/PR.",
      sourceUrls: [SRC.qldAfad, SRC.qldAfadAssessing, SRC.qldFhb, SRC.qldFhog],
      verified: true,
    }),
    R("WA", "temporary", {
      surcharge: "yes",
      surchargeNote: "Foreign transfer duty applies (820 and bridging visas are not permanent visas). Reassessment (Form FDA42) if no longer foreign when the property is transferred.",
      fhbConcession: "conditional",
      fhbConcessionNote: "FHOR only with a citizen/PR applicant; foreign transfer duty still charged on the temporary holder's share.",
      fhog: "conditional",
      fhogNote: "Only as a joint applicant with a citizen/PR.",
      sourceUrls: [SRC.waFtd, SRC.waFtdAbout, SRC.waFhor, SRC.waFhog],
      verified: true,
    }),
    R("SA", "temporary", {
      surcharge: "yes",
      surchargeNote: "Foreign ownership surcharge applies to temporary visa holders; refund if the person ceases to be foreign within 12 months of acquisition. Marriage to an Australian citizen does not exempt.",
      fhbConcession: "conditional",
      fhbConcessionNote: "Only alongside a citizen/PR/NZ-444 co-applicant; the surcharge still applies to the foreign share.",
      fhog: "conditional",
      fhogNote: "Only alongside a citizen/PR/NZ-444 co-applicant.",
      sourceUrls: [SRC.saFos, SRC.saFosFaq, SRC.saFhb, SRC.saFhog],
      verified: false,
      note: SA_NOTE,
    }),
    R("TAS", "temporary", {
      surcharge: "yes",
      surchargeNote: "Foreign investor duty surcharge applies; refund if the buyer ceases to be foreign within 6 months. Exemption for a home held in equal shares by spouses where only one is foreign (occupancy conditions).",
      fhbConcession: "no",
      fhbConcessionNote: "No current first-home duty concession for anyone (ended for settlements after 30 Jun 2026).",
      fhog: "conditional",
      fhogNote: "Only as a joint applicant with a citizen/PR.",
      sourceUrls: [SRC.tasFids, SRC.tasFidsExemptions, SRC.tasFhbEnded, SRC.tasFhog],
      verified: true,
    }),
    R("ACT", "temporary", {
      surcharge: "no",
      surchargeNote: "No foreign purchaser surcharge on conveyance duty (FIRB approval rules still apply).",
      fhbConcession: "yes",
      fhbConcessionNote: "Home Buyer Concession Scheme has no citizenship/visa requirement on the face of the instrument (DI2026-157).",
      fhog: "no",
      fhogNote: "Grant closed from 1 Jul 2019.",
      sourceUrls: [SRC.actDutiesAct, SRC.actHbcs, SRC.actFhog],
      verified: true,
      note: "Verified via the ACT legislation register (revenue site blocked). Confirm HBCS treatment of temporary residents with ACT Revenue before stating.",
    }),
    R("NT", "temporary", {
      surcharge: "no",
      surchargeNote: "No foreign purchaser surcharge (FIRB approval rules still apply).",
      fhbConcession: "conditional",
      fhbConcessionNote: "House and Land Package Exemption only with a citizen/PR co-conveyee.",
      fhog: "conditional",
      fhogNote: "Only as a joint applicant with a citizen/PR.",
      sourceUrls: [SRC.ntStampDutyAct, SRC.ntFhogAct],
      verified: true,
      note: "Verified via the NT legislation register (revenue site blocked).",
    }),
  ],
};

/** NSW treats partner (309/820) holders like PRs for surcharge purchaser duty. */
const PARTNER_TEMP_NSW_OVERRIDE: Partial<StateResidencyRule> = {
  surcharge: "conditional",
  surchargeNote:
    "Partner (provisional) 309/820 holders are treated like permanent residents for surcharge purchaser duty: not a foreign person if they meet the residence requirement (≥200 days in Australia in the prior 12 months, or 200 continuous days living in the property within 12 months of the contract).",
};

export function stateRulesFor(cls: Cls, overrides: Partial<Record<StateCode, Partial<StateResidencyRule>>> = {}): StateResidencyRule[] {
  return STATE_RESIDENCY_RULES[cls].map((r) => ({ ...r, ...(overrides[r.state] ?? {}) }));
}

// ------------------------------------------------------------------ regional (491 / 494)

/**
 * NSW designated regional area postcodes (Home Affairs regional postcodes page, updated 7 Oct 2026).
 * Category 2 "Cities and major regional centres" and Category 3 "Regional centres and other regional areas".
 */
export const NSW_DRA_POSTCODES = {
  category2: [[2259, 2259], [2264, 2308], [2500, 2526], [2528, 2535], [2574, 2574]] as [number, number][],
  category3: [
    [2250, 2258], [2260, 2263], [2311, 2490], [2527, 2527], [2536, 2551],
    [2575, 2739], [2753, 2754], [2756, 2758], [2773, 2898],
  ] as [number, number][],
  sourceUrl: SRC.draPostcodes,
  verifiedAt: AT,
};

/** Is this NSW postcode in a designated regional area for 491/494 condition 8579? (Sydney metro postcodes are not.) */
export function nswDesignatedRegionalCategory(postcode: string): 2 | 3 | null {
  const n = Number(postcode);
  const inRanges = (rs: [number, number][]) => rs.some(([a, b]) => n >= a && n <= b);
  if (inRanges(NSW_DRA_POSTCODES.category2)) return 2;
  if (inRanges(NSW_DRA_POSTCODES.category3)) return 3;
  return null;
}

const REGIONAL_8579: VisaPolicy["regionalCondition"] = {
  applies: true,
  conditionCode: "8579",
  note:
    "Condition 8579: while in Australia, live, work and study only in a part of Australia that was a designated regional area when the visa was granted. Designated regional areas = all of Australia except Sydney, Melbourne and Brisbane (Category 2 includes Newcastle/Lake Macquarie and Wollongong/Illawarra). NSW qualifying postcodes: see NSW_DRA_POSTCODES / nswDesignatedRegionalCategory().",
  sourceUrls: [SRC.cond8579Foi, SRC.draAreas, SRC.draPostcodes],
  verified: true,
  verifiedAt: AT,
};

// ------------------------------------------------------------------ documents (lending practice — unverified)

const DOCS_BASE = [
  "Passport",
  "Visa grant notice",
  "VEVO check showing visa conditions and expiry",
  "Recent payslips",
  "Employment contract or employer letter",
  "Bank statements showing savings and deposit source",
  "ATO notice of assessment or income statement",
];
const DOCS_NOTE = "typicalDocuments are common lender requests, not a government rule — broker to confirm per lender.";

// ------------------------------------------------------------------ builder

interface VisaInput {
  slug: string;
  subclasses: string[];
  name: string;
  homeAffairsUrl: string | null;
  permanent: boolean | "mixed";
  cls: Cls;
  residencyClass?: VisaPolicy["residencyClass"];
  stages?: VisaPolicy["stages"];
  stayNote: string;
  firbOverride?: Partial<FirbStatus>;
  banOverride?: Partial<EstablishedDwellingBan>;
  regionalCondition?: VisaPolicy["regionalCondition"];
  stateOverrides?: Partial<Record<StateCode, Partial<StateResidencyRule>>>;
  documents?: string[];
  pathway?: VisaPolicy["pathway"];
  extraUnverified?: string[];
}

function visa(v: VisaInput): VisaPolicy {
  const stateRules = stateRulesFor(v.cls, v.stateOverrides);
  const firb: FirbStatus = { ...FIRB_BY_CLASS[v.cls], ...(v.firbOverride ?? {}) };
  const ban: EstablishedDwellingBan = { ...BAN_BY_CLASS[v.cls], ...(v.banOverride ?? {}) };
  const parts: Sourced[] = [
    firb,
    ban,
    NEW_DWELLING_BY_CLASS[v.cls],
    FIVE_PC_BY_CLASS[v.cls],
    HELP_TO_BUY_BY_CLASS[v.cls],
    ...stateRules,
    ...(v.regionalCondition ? [v.regionalCondition] : []),
    ...(v.pathway ? [v.pathway] : []),
  ];
  const unverifiedNotes = [
    ...parts.filter((p) => !p.verified).map((p) => p.note ?? "Unverified fact group."),
    ...(v.extraUnverified ?? []),
    DOCS_NOTE,
  ].filter((n, i, a) => a.indexOf(n) === i);
  return {
    slug: v.slug,
    subclasses: v.subclasses,
    name: v.name,
    homeAffairsUrl: v.homeAffairsUrl,
    permanent: v.permanent,
    residencyClass: v.residencyClass ?? v.cls,
    ...(v.stages ? { stages: v.stages } : {}),
    stayNote: v.stayNote,
    firb,
    establishedDwellingBan: ban,
    newDwellingFirb: NEW_DWELLING_BY_CLASS[v.cls],
    regionalCondition: v.regionalCondition ?? null,
    stateRules,
    fiveDepositScheme: FIVE_PC_BY_CLASS[v.cls],
    helpToBuy: HELP_TO_BUY_BY_CLASS[v.cls],
    typicalDocuments: [...DOCS_BASE, ...(v.documents ?? [])],
    pathway: v.pathway ?? null,
    typicalMaxLvrRange: null,
    verifiedAt: AT,
    verified: parts.every((p) => p.verified),
    unverifiedNotes,
  };
}

const p = (note: string, sourceUrls: string[], verified = true): VisaPolicy["pathway"] => ({ note, sourceUrls, verified, verifiedAt: AT });

// ------------------------------------------------------------------ records

export const VISA_POLICIES: VisaPolicy[] = [
  visa({
    slug: "subclass-189",
    subclasses: ["189"],
    name: "Skilled Independent visa (subclass 189)",
    homeAffairsUrl: SRC.ha189,
    permanent: true,
    cls: "permanent",
    stayNote: "Permanent: stay indefinitely; 5-year travel facility. Streams: Points-tested, New Zealand, Hong Kong/BNO. No regional condition.",
    pathway: p("Already permanent. Applicants whose last substantive visa was a 491 or 494 must have held it ≥3 years before applying for a 189.", [SRC.ha189Points]),
  }),
  visa({
    slug: "subclass-190",
    subclasses: ["190"],
    name: "Skilled Nominated visa (subclass 190)",
    homeAffairsUrl: SRC.ha190,
    permanent: true,
    cls: "permanent",
    stayNote:
      "Permanent: stay indefinitely; 5-year travel facility. Requires state/territory nomination; Home Affairs lists no visa condition requiring the holder to live in the nominating state.",
    pathway: p("Already permanent.", [SRC.ha190]),
    extraUnverified: ["Any post-grant expectation to live in the nominating state (e.g. NSW) was not found on the NSW 190 page — do not state a period."],
  }),
  visa({
    slug: "subclass-491",
    subclasses: ["491"],
    name: "Skilled Work Regional (Provisional) visa (subclass 491)",
    homeAffairsUrl: SRC.ha491,
    permanent: false,
    cls: "temporary",
    stayNote: "Provisional (temporary), 5 years; cannot be extended. State/territory nominated or eligible-relative sponsored.",
    regionalCondition: REGIONAL_8579,
    pathway: p(
      "Permanent Residence (Skilled Regional) visa (subclass 191) after holding the 491 for at least 3 years and complying with its conditions; 191 has no minimum income requirement but needs ATO notices of assessment for 3 income years. Once the 191 is granted the holder is a PR (see /visa-home-loans/subclass-191/).",
      [SRC.ha491App, SRC.ha191],
    ),
  }),
  visa({
    slug: "subclass-191",
    subclasses: ["191"],
    name: "Permanent Residence (Skilled Regional) visa (subclass 191)",
    homeAffairsUrl: SRC.ha191,
    permanent: true,
    cls: "permanent",
    stayNote: "Permanent. Eligibility: held an eligible 491 or 494 for ≥3 years, complied with its conditions, ATO notices of assessment for 3 income years (no minimum income).",
    pathway: p("Pathway from 491 or 494 (≥3 years).", [SRC.ha191]),
    extraUnverified: ["Date the former 191 minimum taxable income requirement was removed — not found."],
  }),
  visa({
    slug: "subclass-482",
    subclasses: ["482"],
    name: "Skills in Demand visa (subclass 482)",
    homeAffairsUrl: SRC.ha482,
    permanent: false,
    cls: "temporary",
    stayNote:
      "Temporary, up to 4 years (5 for Hong Kong passport holders). Replaced the Temporary Skill Shortage (TSS) visa on 7 Dec 2024 (TSS applications lodged on/before 6 Dec 2024 decided under TSS rules). Streams: Core Skills, Specialist Skills, Labour Agreement.",
    documents: ["Sponsoring employer details"],
    pathway: p(
      "Employer Nomination Scheme (subclass 186), Temporary Residence Transition stream: usually 2 years full-time sponsored employment in the 3 years before applying.",
      [SRC.ha482Core, SRC.ha186Trt, SRC.ha482TssRepealed],
    ),
  }),
  visa({
    slug: "subclass-494",
    subclasses: ["494"],
    name: "Skilled Employer Sponsored Regional (Provisional) visa (subclass 494)",
    homeAffairsUrl: SRC.ha494,
    permanent: false,
    cls: "temporary",
    stayNote: "Provisional (temporary), 5 years; employer sponsored; live, work and study only in regional Australia.",
    regionalCondition: REGIONAL_8579,
    documents: ["Sponsoring employer details"],
    pathway: p("Subclass 191 after holding the 494 for at least 3 years.", [SRC.ha494, SRC.ha191]),
  }),
  visa({
    slug: "subclass-186",
    subclasses: ["186"],
    name: "Employer Nomination Scheme visa (subclass 186)",
    homeAffairsUrl: SRC.ha186De,
    permanent: true,
    cls: "permanent",
    stayNote: "Permanent: stay indefinitely. Streams: Temporary Residence Transition, Direct Entry, Labour Agreement.",
    pathway: p("Already permanent; TRT stream is the usual route from a 482.", [SRC.ha186Trt, SRC.ha186De]),
  }),
  visa({
    slug: "permanent-residents",
    subclasses: [],
    name: "Permanent residents (any permanent visa)",
    homeAffairsUrl: null,
    permanent: true,
    cls: "permanent",
    stayNote:
      "Any permanent visa holder. 'Ordinarily resident' (FATA s5) = in Australia ≥200 days in the previous 12 months with no legal time limit on stay. FIRB approval is not needed either way; the 200-day test matters for NSW surcharge purchaser duty.",
    documents: ["International movement records (to show days in Australia for the NSW 200-day test)"],
    pathway: null,
  }),
  visa({
    slug: "partner-visa",
    subclasses: ["820", "801", "309", "100"],
    name: "Partner visas (subclasses 820/801 onshore, 309/100 offshore)",
    homeAffairsUrl: SRC.ha820,
    permanent: "mixed",
    cls: "temporary",
    residencyClass: "mixed",
    stages: [
      { subclasses: ["820", "309"], permanent: false, residencyClass: "temporary", note: "Temporary until the permanent stage is decided. Fields on this record describe this stage." },
      { subclasses: ["801", "100"], permanent: true, residencyClass: "permanent", note: "Permanent; eligibility usually assessed 2 years after the combined application. Use STATE_RESIDENCY_RULES.permanent." },
    ],
    stayNote:
      "Two-stage: 820 (onshore, temporary) → 801 (permanent); 309 (offshore, provisional) → 100 (permanent). Temporary stage is a foreign person for FIRB, but buying as joint tenants with an Australian-citizen, PR or SCV-eligible NZ spouse needs no FIRB approval (Regulation s38(3)).",
    firbOverride: {
      note:
        "820/309 holders are temporary residents (foreign persons). Exemption: buying as joint tenants with an Australian-citizen, Australian-PR or SCV-eligible NZ-citizen spouse (Regulation s38(3)); not tenants in common. 801/100 holders are permanent visa holders (exempt).",
    },
    banOverride: {
      note:
        "Applies to an 820/309 holder buying alone or as tenants in common (1 Apr 2025 – 30 Jun 2029). Joint tenancy with an Australian-citizen/PR/SCV-eligible NZ spouse is exempt from approval under s38(3).",
    },
    stateOverrides: { NSW: PARTNER_TEMP_NSW_OVERRIDE },
    documents: ["Marriage certificate or relationship evidence", "Partner visa application acknowledgement (if on a bridging visa)"],
    pathway: p("820 → 801 and 309 → 100; eligibility for the permanent stage is generally considered 2 years after applying.", [SRC.ha820, SRC.ha801, SRC.ha309, SRC.ha100]),
    extraUnverified: [
      "Whether the s38(3) spouse joint-tenant exemption also covers established dwellings during the ban is not stated in the GN6 v5 examples checked — confirm with FIRB before stating.",
    ],
  }),
  visa({
    slug: "bridging-visa",
    subclasses: ["010", "020", "030", "050", "051"],
    name: "Bridging visas (BVA 010, BVB 020, BVC 030, BVE 050/051)",
    homeAffairsUrl: SRC.haBva,
    permanent: false,
    cls: "temporary",
    stayNote:
      "Temporary visas that keep the holder lawful while a substantive visa application or immigration matter is decided. BVA: stay after a substantive visa ends; BVB: travel and return during a set period; BVC: applied without holding a substantive visa; BVE: arrangements to leave, finalise a matter or await a decision.",
    firbOverride: {
      note:
        "An onshore bridging-visa holder awaiting a permanent visa decision is a 'temporary resident' (foreign person) for FIRB. Joint-tenant spouse exemption (s38(3)) as for other temporary residents.",
    },
    documents: ["Bridging visa grant notice", "Acknowledgement of the substantive visa application"],
    pathway: p("Depends on the substantive visa applied for; on grant of a permanent visa the PR rules apply.", [SRC.haBva, SRC.haBvb, SRC.haBvc, SRC.haBve]),
  }),
  visa({
    slug: "new-zealand-citizens",
    subclasses: ["444"],
    name: "New Zealand citizens (Special Category visa, subclass 444)",
    homeAffairsUrl: SRC.ha444,
    permanent: false,
    cls: "nz444",
    stayNote: "The 444 is a temporary visa, usually granted on each arrival; it lasts until the holder leaves Australia (or PR/citizenship is granted).",
    documents: ["New Zealand passport"],
    pathway: null,
  }),
];

export function getVisaPolicy(slug: string): VisaPolicy | undefined {
  return VISA_POLICIES.find((v) => v.slug === slug);
}

/** Helper for summary tables: one cell value per state for a visa. */
export function stateCell(v: VisaPolicy, state: StateCode, field: "surcharge" | "fhbConcession" | "fhog"): Tri {
  return v.stateRules.find((r) => r.state === state)?.[field] ?? "unknown";
}

/** Facts that apply across all visa pages (for the hub / sources block). */
export const COMMON_FACTS = {
  establishedDwellingBan: { from: BAN_FROM, to: BAN_TO, originalTo: "2027-03-31", sourceUrls: BAN_SOURCES, verified: true, verifiedAt: AT },
  fiveDepositSchemeNswCaps: {
    note: "NSW price caps: Sydney and regional centres (Central Coast, Coffs Harbour–Grafton, Illawarra, Mid North Coast, Richmond–Tweed, Newcastle and Lake Macquarie) vs rest of state — amounts owned by the calculator's StateRules; confirm with the official postcode tool.",
    sourceUrls: [SRC.scheme5pcCaps],
    verified: true,
    verifiedAt: AT,
  },
  atoPagesBlocked: "ATO foreign-investment pages returned HTTP 403 to automated fetches; FIRB guidance notes used instead.",
} as const;
