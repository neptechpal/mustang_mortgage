import type { SourceItem } from "../../components/content/Sources";
import { SRC } from "@/modules/seo-data/visas";

/**
 * Turns the sourceUrls carried by the rules data (calc/rules, seo-data/visas) into <Sources> items with a
 * readable title, the publisher and the date each fact group was checked. Titles describe the page; they
 * never add facts.
 */

const PUBLISHERS: [RegExp, string][] = [
  [/foreigninvestment\.gov\.au/, "Foreign Investment Review Board"],
  [/homeaffairs\.gov\.au/, "Department of Home Affairs"],
  [/budget\.gov\.au/, "Australian Government, Budget 2026-27"],
  [/ministers\.treasury\.gov\.au/, "The Treasury (Treasurer's media release)"],
  [/firsthomebuyers\.gov\.au/, "Housing Australia"],
  [/pm\.gov\.au/, "Prime Minister of Australia (media release)"],
  [/ato\.gov\.au/, "Australian Taxation Office"],
  [/revenue\.nsw\.gov\.au/, "Revenue NSW"],
  [/nswlrs\.com\.au/, "NSW Land Registry Services"],
  [/sro\.vic\.gov\.au/, "State Revenue Office Victoria"],
  [/legislation\.vic\.gov\.au|vic\.gov\.au/, "Victorian Government"],
  [/qro\.qld\.gov\.au/, "Queensland Revenue Office"],
  [/legislation\.qld\.gov\.au/, "Queensland Legislation"],
  [/titlesqld\.com\.au/, "Titles Queensland"],
  [/legislation\.wa\.gov\.au/, "WA Legislation"],
  [/landgate\.wa\.gov\.au/, "Landgate"],
  [/wa\.gov\.au/, "RevenueWA"],
  [/revenuesa\.sa\.gov\.au/, "RevenueSA"],
  [/legislation\.sa\.gov\.au/, "SA Legislation"],
  [/landservices\.com\.au/, "Land Services SA"],
  [/sro\.tas\.gov\.au|tro\.tas\.gov\.au/, "State Revenue Office Tasmania"],
  [/legislation\.tas\.gov\.au/, "Tasmanian Legislation"],
  [/nre\.tas\.gov\.au/, "Land Titles Office Tasmania"],
  [/legislation\.act\.gov\.au/, "ACT Legislation Register"],
  [/revenue\.act\.gov\.au/, "ACT Revenue Office"],
  [/legislation\.nt\.gov\.au/, "NT Legislation"],
  [/nt\.gov\.au/, "Northern Territory Government"],
  [/abs\.gov\.au/, "Australian Bureau of Statistics"],
  [/dcj\.nsw\.gov\.au/, "NSW Department of Communities and Justice"],
  [/nrb\.org\.np/, "Nepal Rastra Bank"],
  [/moneysmart\.gov\.au/, "Moneysmart (ASIC)"],
];

export function publisherFor(url: string): string | undefined {
  return PUBLISHERS.find(([re]) => re.test(url))?.[1];
}

/** Titles for the visa/FIRB/scheme URLs in seo-data SRC. */
const SRC_TITLES: Partial<Record<keyof typeof SRC, string>> = {
  firbGn2: "Guidance Note 2: Key concepts (version 5)",
  firbGn6: "Guidance Note 6: Residential land (version 5)",
  firbResidential: "Residential investment information",
  firbFees: "Fees",
  budget2026Bp2: "Budget Paper No. 2, 2026-27",
  treasuryBanExtension: "More homes and a fair go for first home buyers",
  treasuryBanOriginal: "Clamping down on foreign purchases of established homes",
  scheme5pcGuide: "5% Deposit Scheme information guide",
  scheme5pcFaq: "5% Deposit Scheme FAQs",
  scheme5pcCaps: "5% Deposit Scheme property price caps",
  helpToBuy: "Help to Buy scheme",
  draAreas: "Eligible regional areas",
  draPostcodes: "Regional postcodes",
  cond8579Foi: "Condition 8579 (FOI release)",
  ha189: "Skilled Independent visa (subclass 189)",
  ha189Points: "Subclass 189, Points-tested stream",
  ha190: "Skilled Nominated visa (subclass 190)",
  ha491: "Skilled Work Regional (Provisional) visa (subclass 491)",
  ha491App: "Subclass 491: applying and conditions",
  ha191: "Permanent Residence (Skilled Regional) visa (subclass 191)",
  ha482: "Skills in Demand visa (subclass 482)",
  ha482Core: "Subclass 482, Core Skills stream",
  ha482TssRepealed: "Temporary Skill Shortage visa (repealed)",
  ha494: "Skilled Employer Sponsored Regional (Provisional) visa (subclass 494)",
  ha186Trt: "Subclass 186, Temporary Residence Transition stream",
  ha186De: "Subclass 186, Direct Entry stream",
  ha820: "Partner visa (subclass 820)",
  ha801: "Partner visa (subclass 801)",
  ha309: "Partner (Provisional) visa (subclass 309)",
  ha100: "Partner (Migrant) visa (subclass 100)",
  haBva: "Bridging visa A (subclass 010)",
  haBvb: "Bridging visa B (subclass 020)",
  haBvc: "Bridging visa C (subclass 030)",
  haBve: "Bridging visa E (subclass 050)",
  ha444: "Special Category visa (subclass 444)",
  nswSpdIndividuals: "Surcharge purchaser duty: individuals",
  nswSpdWhat: "What is surcharge purchaser duty",
  nswFhbas: "First Home Buyers Assistance Scheme",
  nswFhbasNzForm: "FHBAS: New Zealand citizen declaration (form)",
  nswFhog: "First Home Owner (New Homes) Grant",
  vicFpad: "Foreign purchaser additional duty",
  vicFpadExemptions: "Foreign purchaser additional duty: exemptions and rules",
  vicFhb: "First home buyer duty exemption or concession",
  vicFhog: "First Home Owner Grant",
  qldAfad: "Additional foreign acquirer duty: foreign persons",
  qldAfadAssessing: "Additional foreign acquirer duty: assessing",
  qldFhb: "First home concession",
  qldFhog: "First home owner grant: eligibility",
  waFtd: "Foreign transfer duty fact sheet",
  waFtdAbout: "About foreign buyers duty",
  waFhor: "First home owner rate fact sheet",
  waFhog: "First Home Owner Grant fact sheet",
  waFhogTerms: "FHOG lodgement guide: terms used",
  saFos: "Foreign ownership surcharge: foreign person",
  saFosFaq: "Foreign ownership surcharge FAQs",
  saFhb: "First home buyer relief: eligible applicants",
  saFhog: "First Home Owner Grant: eligible applicants",
  tasFids: "Foreign investor duty surcharge: definition of foreign",
  tasFidsExemptions: "Foreign investor duty surcharge: exemptions",
  tasFhbEnded: "First home buyers of established homes duty relief (ended)",
  tasFhog: "First Home Owner Grant: eligibility",
  actDutiesAct: "Duties Act 1999 (ACT)",
  actHbcs: "Home Buyer Concession Scheme determination (DI2026-157)",
  actFhog: "First Home Owner Grant (closed)",
  ntStampDutyAct: "Stamp Duty Act 1978 (NT)",
  ntFhogAct: "First Home Owner Grant Act 2000 (NT)",
};

const URL_TITLES = new Map<string, string>(
  (Object.entries(SRC_TITLES) as [keyof typeof SRC, string][]).map(([k, t]) => [SRC[k], t]),
);

export type SourceInput = { url: string; verifiedAt?: string; title?: string; publisher?: string };

function fallbackTitle(url: string) {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop() ?? u.hostname;
    const t = decodeURIComponent(last).replace(/\.(pdf|html?)$/i, "").replace(/[-_]+/g, " ").trim();
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : u.hostname;
  } catch {
    return url;
  }
}

/** Known title for an official URL, else the given fallback, else one derived from the URL path. */
export function titleFor(url: string, fallback?: string) {
  return URL_TITLES.get(url) ?? fallback ?? fallbackTitle(url);
}

/** What kind of page a URL is, to tell apart two links with the same title. */
export function urlKind(url: string) {
  if (/calc|estimator/i.test(url)) return "official calculator";
  if (/legislation\.|\/act-|Act\/|DownloadFile/i.test(url)) return "legislation";
  if (/fee/i.test(url)) return "fees";
  if (/\.pdf$/i.test(url)) return "PDF";
  return fallbackTitle(url).toLowerCase();
}

/** Dedupe by URL (first title wins, earliest verifiedAt kept) and add publisher + title. */
export function toSourceItems(inputs: SourceInput[]): SourceItem[] {
  const out = new Map<string, SourceItem>();
  const titles = new Set<string>();
  for (const s of inputs) {
    const prev = out.get(s.url);
    if (prev) {
      if (s.verifiedAt && (!prev.checkedAt || s.verifiedAt < prev.checkedAt)) prev.checkedAt = s.verifiedAt;
      continue;
    }
    let title = URL_TITLES.get(s.url) ?? s.title ?? fallbackTitle(s.url);
    if (titles.has(title)) title = `${title} (${urlKind(s.url)})`;
    titles.add(title);
    out.set(s.url, { url: s.url, title, publisher: s.publisher ?? publisherFor(s.url), checkedAt: s.verifiedAt });
  }
  return [...out.values()];
}

/** Sourced fact group → SourceInput[] */
export function fromSourced(g: { sourceUrls: readonly string[]; verifiedAt: string }, title?: (url: string) => string | undefined): SourceInput[] {
  return g.sourceUrls.map((url) => ({ url, verifiedAt: g.verifiedAt, title: title?.(url) }));
}

/** Latest ISO date in a list (for dateModified). */
export const latestDate = (...dates: (string | undefined | null)[]) => dates.filter((d): d is string => !!d).sort().pop() ?? "";
/** Earliest ISO date (for "checked on" when several groups are combined). */
export const earliestDate = (...dates: (string | undefined | null)[]) => dates.filter((d): d is string => !!d).sort()[0] ?? "";
