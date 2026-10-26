/**
 * Public website configuration: the single source of truth for business facts,
 * navigation and launch blockers.
 *
 * RULES
 * - Never invent a fact. Anything we do not know yet is `null` and is rendered
 *   as a visible bracketed token (see `<Fact>` in components/ui/Fact.tsx) and
 *   listed in LAUNCH_BLOCKERS.
 * - URLs are slash-less (Next default): `/home-loans/refinancing`, not `/home-loans/refinancing/`.
 * - Add new pages to NAV / FOOTER_GROUPS only once the route exists or is being built.
 */

/* ------------------------------------------------------------------ */
/* Paths used across the site (import these instead of hard-coding)    */
/* ------------------------------------------------------------------ */

export const PATHS = {
  home: "/",
  about: "/about",
  broker: "/about/sulav-adhikari",
  howWeArePaid: "/how-we-are-paid",
  contact: "/contact",
  book: "/book-appointment",
  login: "/login",
  portal: "/portal",

  homeLoans: "/home-loans",
  firstHomeBuyers: "/first-home-buyers",
  firstHomeBuyersNsw: "/first-home-buyers/nsw",
  refinancing: "/home-loans/refinancing",
  investmentLoans: "/home-loans/investment-loans",
  constructionLoans: "/home-loans/construction-loans",
  debtConsolidation: "/home-loans/debt-consolidation",
  fixedVsVariable: "/home-loans/fixed-vs-variable",
  carLoans: "/car-loans",

  visaHomeLoans: "/visa-home-loans",
  permanentResidents: "/visa-home-loans/permanent-residents",
  visa189: "/visa-home-loans/subclass-189",
  visa190: "/visa-home-loans/subclass-190",
  visa491: "/visa-home-loans/subclass-491",
  visa191: "/visa-home-loans/subclass-191",
  visa482: "/visa-home-loans/subclass-482",
  partnerVisa: "/visa-home-loans/partner-visa",
  bridgingVisa: "/visa-home-loans/bridging-visa",
  nepaliCommunity: "/nepali-mortgage-broker-sydney",

  calculators: "/calculators",
  borrowingPower: "/calculators/borrowing-power",
  repayments: "/calculators/repayments",
  stampDuty: "/stamp-duty",
  stampDutyNsw: "/stamp-duty/nsw",
  nprConverter: "/calculators/npr-aud-converter",

  mortgageBroker: "/mortgage-broker",
  mortgageBrokerNsw: "/mortgage-broker/nsw",

  creditGuide: "/legal/credit-guide",
  privacy: "/legal/privacy-policy",
  complaints: "/legal/complaints",
  hardship: "/legal/financial-hardship",
  terms: "/legal/website-terms",
  importantInfo: "/legal/important-information",
} as const;

/* ------------------------------------------------------------------ */
/* Business facts                                                      */
/* ------------------------------------------------------------------ */

export type Language = { code: string; label: string; confirmed: boolean; note?: string };
export type Photo = { src: string; alt: string; width: number; height: number };
export type Review = { source: string; rating: number; count: number; url: string };

const LOGO_BASE = "/wp-content/uploads/2024/06/Copy-of-Financial-Advisor-Logo-in-Dark-Light-Blue-White-Clean-Minimalist-Style-";

export const SITE = {
  name: "Mustang Mortgage",
  canonicalOrigin: "https://www.mustangmortgage.com.au",
  locale: "en-AU",

  /** Logo badge (round dark badge with gold horse). Used as a seal, not clip-art. */
  logo: {
    badge: `${LOGO_BASE}-300x300.png`,
    badgeLarge: `${LOGO_BASE}-1024x1024.png`,
    alt: "Mustang Mortgage badge",
  },

  /** Legal identity. All unknown until the client supplies them. */
  legal: {
    entityName: null as string | null, // e.g. "Mustang Mortgage Pty Ltd"
    abn: null as string | null,
    acn: null as string | null,
  },

  /**
   * Credit licence. ASIC format, written in full:
   * "{representativeName} is a Credit Representative ({creditRepresentativeNumber}) of
   *  {licenseeName}, Australian Credit Licence {licenseeAcl}."
   */
  licence: {
    representativeName: null as string | null, // the company or Sulav, whoever holds the CR number
    creditRepresentativeNumber: null as string | null,
    licenseeName: null as string | null, // aggregator / licensee
    licenseeAcl: null as string | null,
    afcaMemberNumber: null as string | null,
    licenseeCreditGuideUrl: null as string | null, // PDF supplied by the licensee
  },

  broker: {
    name: "Sulav Adhikari",
    givenName: "Sulav",
    familyName: "Adhikari",
    initials: "SA",
    role: "Mortgage broker",
    phone: "0416 066 954",
    phoneHref: "tel:+61416066954",
    phoneE164: "+61416066954",
    email: "sulav.adhikari@mustangmortgage.com.au",
    /** Set once a real portrait is supplied; until then BrokerCard shows a monogram seal. */
    photo: null as Photo | null,
    qualifications: null as string | null, // e.g. "Diploma of Finance and Mortgage Broking Management"
    memberships: null as string | null, // e.g. "MFAA member" or "FBAA member"
    yearsBroking: null as string | null,
    linkedin: null as string | null,
  },

  contact: {
    email: "info@mustangmortgage.com.au",
    phone: "0416 066 954",
    phoneHref: "tel:+61416066954",
    /** We publish no street address (service-area business). */
    address: null as string | null,
  },

  /** Languages offered. Only `confirmed: true` entries are shown on the site. */
  languages: [
    { code: "en", label: "English", confirmed: true },
    { code: "ne", label: "Nepali", confirmed: false, note: "TODO confirm Sulav consults in Nepali before showing" },
  ] as Language[],

  /** Consultation hours (booking availability), Sydney time. */
  hours: {
    timezone: "Australia/Sydney",
    zoneLabel: "Sydney time",
    days: "7 days a week",
    blocks: [
      { start: "08:00", end: "11:00", label: "Morning" },
      { start: "13:00", end: "14:00", label: "Midday" },
      { start: "15:30", end: "19:00", label: "Afternoon and evening" },
    ],
  },

  consultation: {
    minutes: 60,
    name: "Mortgage consultation",
    /** Confirmed delivery modes. Add "in person" only when confirmed. */
    modes: ["phone", "video"] as string[],
    minNoticeHours: 24,
  },

  responsePromise: "within 1 business day",

  serviceArea: {
    base: "New South Wales",
    short: "Based in NSW. Clients across Australia by phone and video.",
    long: "We are based in New South Wales and most of our clients buy in Sydney and across NSW. We also work with clients anywhere in Australia by phone and video.",
    areaServed: [
      { type: "State", name: "New South Wales" },
      { type: "Country", name: "Australia" },
    ],
  },

  /** Real reviews only (rating + count + source link). Home page shows the reviews section only when set. */
  reviews: null as Review | null,

  lenderPanel: {
    count: null as string | null, // number of lenders on the accredited panel
    names: null as string[] | null, // text list, only lenders we are accredited with
  },

  fees: {
    /** Whether the business ever charges the client a fee. Must match the licensee Credit Guide. */
    clientFeeStatement: null as string | null,
  },

  acknowledgementOfCountry:
    "We acknowledge the Traditional Custodians of the lands on which we live and work, and pay our respects to Elders past and present.",

  social: {
    google: null as string | null,
    facebook: null as string | null,
    linkedin: null as string | null,
  },
};

/** Languages we can state publicly. */
export const confirmedLanguages = () => SITE.languages.filter((l) => l.confirmed);

/* ------------------------------------------------------------------ */
/* Facts that may be unknown: label registry for <Fact path="..."/>    */
/* ------------------------------------------------------------------ */

export const FACT_LABELS = {
  "legal.entityName": "Legal entity name",
  "legal.abn": "ABN",
  "licence.representativeName": "Credit Representative name",
  "licence.creditRepresentativeNumber": "Credit Representative number",
  "licence.licenseeName": "Licensee name",
  "licence.licenseeAcl": "Australian Credit Licence number",
  "licence.afcaMemberNumber": "AFCA member number",
  "broker.qualifications": "Sulav's qualifications",
  "broker.memberships": "Industry association membership",
  "broker.yearsBroking": "Years broking",
  "lenderPanel.count": "Number of lenders on panel",
  "fees.clientFeeStatement": "Client fee statement (from Credit Guide)",
} as const;

export type FactPath = keyof typeof FACT_LABELS;

export function factValue(path: FactPath): string | null {
  const [group, key] = path.split(".") as [keyof typeof SITE, string];
  const g = SITE[group] as unknown as Record<string, unknown> | undefined;
  const v = g?.[key];
  return typeof v === "string" && v.trim() ? v : null;
}

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

export type NavLink = { label: string; href: string; description?: string };
export type NavGroup = { label: string; href: string; overview: string; items: NavLink[]; aside?: { title: string; body: string; link: NavLink } };

export const NAV: NavGroup[] = [
  {
    label: "Home loans",
    href: PATHS.homeLoans,
    overview: "All home loans",
    items: [
      { label: "First home buyers", href: PATHS.firstHomeBuyers, description: "Deposit, LMI and NSW first home buyer concessions" },
      { label: "Refinancing", href: PATHS.refinancing, description: "Review your rate, lender and loan structure" },
      { label: "Investment loans", href: PATHS.investmentLoans, description: "Buying a property to rent out" },
      { label: "Construction loans", href: PATHS.constructionLoans, description: "Building a home, paid in stages" },
      { label: "Debt consolidation", href: PATHS.debtConsolidation, description: "Rolling other debts into your home loan" },
      { label: "Fixed or variable", href: PATHS.fixedVsVariable, description: "How each rate type works, and splitting" },
    ],
  },
  {
    label: "Visa & PR loans",
    href: PATHS.visaHomeLoans,
    overview: "Buying on a visa or as a new PR",
    items: [
      { label: "Permanent residents", href: PATHS.permanentResidents, description: "New PR holders and first home concessions" },
      { label: "Subclass 189", href: PATHS.visa189, description: "Skilled Independent" },
      { label: "Subclass 190", href: PATHS.visa190, description: "Skilled Nominated" },
      { label: "Subclass 491", href: PATHS.visa491, description: "Skilled Work Regional (Provisional)" },
      { label: "Subclass 191", href: PATHS.visa191, description: "Permanent Residence (Skilled Regional)" },
      { label: "Subclass 482", href: PATHS.visa482, description: "Skills in Demand" },
    ],
  },
  {
    label: "Calculators",
    href: PATHS.calculators,
    overview: "All calculators",
    items: [
      { label: "Borrowing power", href: PATHS.borrowingPower, description: "An estimate of what lenders may lend you" },
      { label: "Repayments", href: PATHS.repayments, description: "Weekly, fortnightly and monthly repayments" },
      { label: "Stamp duty", href: PATHS.stampDuty, description: "Transfer duty by state, with first home concessions" },
      { label: "NPR and AUD converter", href: PATHS.nprConverter, description: "Lakh and crore to Australian dollars" },
    ],
  },
  {
    label: "About",
    href: PATHS.about,
    overview: "About Mustang Mortgage",
    items: [
      { label: "Sulav Adhikari", href: PATHS.broker, description: "Your broker" },
      { label: "How we are paid", href: PATHS.howWeArePaid, description: "Commissions, fees and our duty to you" },
      { label: "Where we work", href: PATHS.mortgageBroker, description: "Sydney, NSW and Australia-wide by video" },
      { label: "Contact", href: PATHS.contact, description: "Phone, email and enquiry form" },
    ],
  },
];

export const HEADER_ACTIONS = {
  book: { label: "Book a consultation", href: PATHS.book },
  login: { label: "Client login", href: PATHS.login },
};

export const FOOTER_GROUPS: { title: string; links: NavLink[] }[] = [
  {
    title: "Home loans",
    links: [
      { label: "First home buyers", href: PATHS.firstHomeBuyers },
      { label: "Refinancing", href: PATHS.refinancing },
      { label: "Investment loans", href: PATHS.investmentLoans },
      { label: "Construction loans", href: PATHS.constructionLoans },
      { label: "Debt consolidation", href: PATHS.debtConsolidation },
      { label: "Car loans", href: PATHS.carLoans },
    ],
  },
  {
    title: "Visa & PR loans",
    links: [
      { label: "Overview", href: PATHS.visaHomeLoans },
      { label: "Permanent residents", href: PATHS.permanentResidents },
      { label: "Subclass 189 and 190", href: PATHS.visa189 },
      { label: "Subclass 491 and 191", href: PATHS.visa491 },
      { label: "Subclass 482", href: PATHS.visa482 },
      { label: "Nepali community", href: PATHS.nepaliCommunity },
    ],
  },
  {
    title: "Tools",
    links: [
      { label: "Borrowing power", href: PATHS.borrowingPower },
      { label: "Repayments", href: PATHS.repayments },
      { label: "Stamp duty", href: PATHS.stampDuty },
      { label: "NPR and AUD converter", href: PATHS.nprConverter },
      { label: "Book a consultation", href: PATHS.book },
      { label: "Client login", href: PATHS.login },
    ],
  },
  {
    title: "Mustang Mortgage",
    links: [
      { label: "About us", href: PATHS.about },
      { label: "Sulav Adhikari", href: PATHS.broker },
      { label: "How we are paid", href: PATHS.howWeArePaid },
      { label: "Where we work", href: PATHS.mortgageBroker },
      { label: "Contact", href: PATHS.contact },
    ],
  },
];

export const LEGAL_LINKS: NavLink[] = [
  { label: "Credit Guide", href: PATHS.creditGuide },
  { label: "Privacy policy", href: PATHS.privacy },
  { label: "Complaints", href: PATHS.complaints },
  { label: "Financial hardship", href: PATHS.hardship },
  { label: "Website terms", href: PATHS.terms },
  { label: "Important information", href: PATHS.importantInfo },
];

/* ------------------------------------------------------------------ */
/* Launch blockers                                                     */
/* ------------------------------------------------------------------ */

/** Items that must be resolved before SEO_INDEXING=on. Facts still `null` are added automatically. */
const STATIC_BLOCKERS = [
  "Licensee compliance sign-off of the whole website (most aggregators require a website declaration).",
  "Licensee Credit Guide template (HTML text and PDF) to replace the draft at /legal/credit-guide.",
  "Licensee-approved privacy policy, complaints, hardship and website terms text to replace the drafts under /legal.",
  "Confirm whether Sulav consults in Nepali (SITE.languages) before any Nepali-language claim is shown.",
  "Confirm consultation formats (phone, video, in person) in SITE.consultation.modes.",
  "Real portrait of Sulav for SITE.broker.photo (until then a monogram seal is shown).",
  "Google Business Profile and genuine reviews before any review section is shown (SITE.reviews).",
  "Lender panel list, and permission for any lender names or logos (SITE.lenderPanel).",
];

export const LAUNCH_BLOCKERS: string[] = [
  ...(Object.keys(FACT_LABELS) as FactPath[]).filter((p) => !factValue(p)).map((p) => `Missing fact: ${FACT_LABELS[p]} (${p})`),
  ...STATIC_BLOCKERS,
];

/** Legal pages are drafts until the licensee approves them: shows the draft notice and keeps them noindex. */
export const LEGAL_PAGES_DRAFT = true;
