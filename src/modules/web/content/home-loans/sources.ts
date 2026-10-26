import type { SourceItem } from "../../components/content/Sources";

/**
 * Official sources behind the rules stated on the home-loan service pages.
 * Each was opened and checked on HOME_LOANS_CHECKED_AT. If a rule changes, update the page text
 * and this date together. Lender policy (not law) is described as "most lenders / some lenders"
 * and is not sourced here.
 */
export const HOME_LOANS_CHECKED_AT = "2026-10-26";
const checkedAt = HOME_LOANS_CHECKED_AT;

const MONEYSMART = "Moneysmart (ASIC)";

export const HL_SOURCES = {
  lmi: { title: "Lenders mortgage insurance (LMI)", publisher: MONEYSMART, url: "https://moneysmart.gov.au/glossary/lenders-mortgage-insurance-lmi", checkedAt },
  switching: { title: "Switching home loans", publisher: MONEYSMART, url: "https://moneysmart.gov.au/home-loans/switching-home-loans", checkedAt },
  fixedVariable: {
    title: "Fixed vs variable home loan interest rates",
    publisher: MONEYSMART,
    url: "https://moneysmart.gov.au/home-loans/fixed-vs-variable-home-loan-interest-rates",
    checkedAt,
  },
  breakFee: { title: "Break fee", publisher: MONEYSMART, url: "https://moneysmart.gov.au/glossary/break-fee", checkedAt },
  interestOnly: { title: "Interest-only home loans", publisher: MONEYSMART, url: "https://moneysmart.gov.au/home-loans/interest-only-home-loans", checkedAt },
  debtConsolidation: {
    title: "Debt consolidation and refinancing",
    publisher: MONEYSMART,
    url: "https://moneysmart.gov.au/managing-debt/debt-consolidation-and-refinancing",
    checkedAt,
  },
  hardship: { title: "Financial hardship", publisher: MONEYSMART, url: "https://moneysmart.gov.au/managing-debt/financial-hardship", checkedAt },
  carLoans: { title: "Car loans", publisher: MONEYSMART, url: "https://moneysmart.gov.au/loans/car-loans", checkedAt },
  comparisonRate: { title: "Comparison rate", publisher: MONEYSMART, url: "https://moneysmart.gov.au/glossary/comparison-rate", checkedAt },
  ndh: { title: "National Debt Helpline", publisher: "National Debt Helpline", url: "https://ndh.org.au/", checkedAt },
  apraBuffer: {
    title: "APRA’s System Risk Outlook, May 2026 (mortgage serviceability buffer)",
    publisher: "Australian Prudential Regulation Authority (APRA)",
    url: "https://www.apra.gov.au/news-and-publications/apras-system-risk-outlook-may-2026",
    checkedAt,
  },
  apraDti: {
    title: "APRA to limit high debt-to-income home loans to constrain riskier lending",
    publisher: "Australian Prudential Regulation Authority (APRA)",
    url: "https://www.apra.gov.au/news-and-publications/apra-limit-high-debt-income-home-loans-constrain-riskier-lending",
    checkedAt,
  },
  asicRg209: {
    title: "RG 209 Credit licensing: Responsible lending conduct",
    publisher: "Australian Securities and Investments Commission (ASIC)",
    url: "https://asic.gov.au/regulatory-resources/find-a-document/regulatory-guides/rg-209-credit-licensing-responsible-lending-conduct/",
    checkedAt,
  },
  asicRg220: {
    title: "RG 220 Early termination fees for residential loans",
    publisher: "Australian Securities and Investments Commission (ASIC)",
    url: "https://www.asic.gov.au/regulatory-resources/find-a-document/regulatory-guides/rg-220-early-termination-fees-for-residential-loans-unconscionable-fees-and-unfair-contract-terms",
    checkedAt,
  },
  atoInterest: {
    title: "Interest expenses (residential rental properties)",
    publisher: "Australian Taxation Office",
    url: "https://www.ato.gov.au/individuals-and-families/investments-and-assets/property-and-land/residential-rental-properties/rental-expenses/interest-expenses",
    checkedAt,
  },
  atoIncomeStatement: {
    title: "Access your income statement",
    publisher: "Australian Taxation Office",
    url: "https://www.ato.gov.au/individuals-and-families/jobs-and-employment-types/working-as-an-employee/income-statements/access-your-income-statement",
    checkedAt,
  },
  nswLandTax: {
    title: "Land tax thresholds and rates",
    publisher: "Revenue NSW",
    url: "https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/land-tax/understanding-land-tax/thresholds-and-rates",
    checkedAt,
  },
  nswBuildingContracts: {
    title: "Contracts for residential building work",
    publisher: "NSW Government (Building Commission NSW)",
    url: "https://www.nsw.gov.au/housing-and-construction/building-or-renovating-a-home/preparing/contracts",
    checkedAt,
  },
  nswCoolingOff: {
    title: "Contracts and deposits when buying property in NSW",
    publisher: "NSW Government",
    url: "https://www.nsw.gov.au/housing-and-construction/buying-and-selling-property/buying-property-nsw/contracts-and-deposits",
    checkedAt,
  },
  nswlrsFees: { title: "Land title fees (mortgages and discharges)", publisher: "NSW Land Registry Services", url: "https://nswlrs.com.au/services/fees-payments/fees", checkedAt },
  scheme5pc: {
    title: "Australian Government 5% Deposit Scheme: FAQs",
    publisher: "Housing Australia",
    url: "https://firsthomebuyers.gov.au/australian-government-5-percent-deposit-scheme/5-percent-tools-and-resources/faqs",
    checkedAt,
  },
  ppsr: { title: "Do a used car or vehicle search", publisher: "Personal Property Securities Register (PPSR)", url: "https://www.ppsr.gov.au/carcheck", checkedAt },
} satisfies Record<string, SourceItem>;
