/**
 * Suburb guide view model: everything the /mortgage-broker/{state}/{slug} template shows, derived from the
 * sourced suburb dataset (src/modules/seo-data) and the calculator engine (src/modules/calc).
 *
 * No numbers are typed here. Prices/rents come from NSW DCJ, people/housing from ABS Census 2021,
 * duty/fees/caps from calcStampDuty / calcDeposit / depositSchemeCheck (rules with sourceUrl + verifiedAt).
 */
import { calcDeposit, type DepositResult } from "@/modules/calc/deposit";
import { isStale } from "@/modules/calc/freshness";
import { FIVE_PERCENT_DEPOSIT_SCHEME, depositSchemeCheck, type DepositSchemeArea } from "@/modules/calc/rules/federal";
import { NSW } from "@/modules/calc/rules/nsw";
import { calcStampDuty } from "@/modules/calc/stampDuty";
import type { StampDutyResult } from "@/modules/calc/types";
import { COMMON_FACTS, NSW_DRA_POSTCODES, VISA_POLICIES, nswDesignatedRegionalCategory } from "@/modules/seo-data/visas";
import { SUBURBS, nearestPublished, suburbDataset, suburbsPassingDataGate } from "@/modules/seo-data/suburbs";
import type { DcjRentRow, DcjSales, SuburbRecord } from "@/modules/seo-data/types";

/* ------------------------------------------------------------------ registry */

export const SUBURB_KIND = "suburb" as const;

/** Suburbs that get a page: dataset rows passing the ≥10/14 completeness gate (research §C4.1). */
export const PUBLISHED_SUBURBS: readonly SuburbRecord[] = suburbsPassingDataGate();
export const PUBLISHED_SLUGS: ReadonlySet<string> = new Set(PUBLISHED_SUBURBS.map((s) => s.slug));

export const stateSlug = (s: Pick<SuburbRecord, "state">) => s.state.toLowerCase();
export const suburbPath = (s: Pick<SuburbRecord, "state" | "slug">) => `/mortgage-broker/${stateSlug(s)}/${s.slug}`;
/** Review key (src/modules/web/review.ts contract): "suburb:nsw/rockdale-2216". */
export const suburbKey = (s: Pick<SuburbRecord, "state" | "slug">) => `suburb:${stateSlug(s)}/${s.slug}`;
export const suburbReviewRows = () => PUBLISHED_SUBURBS.map((s) => ({ key: suburbKey(s), kind: SUBURB_KIND, path: suburbPath(s) }));

export function findPublishedSuburb(state: string, slug: string) {
  return PUBLISHED_SUBURBS.find((s) => stateSlug(s) === state.toLowerCase() && s.slug === slug);
}

export const DATA_PULLED_AT = suburbDataset.pulledAt.slice(0, 10);

/* ------------------------------------------------------------------ prices */

export type PriceKind = "unit" | "house";

export type MedianPrice = {
  kind: PriceKind;
  value: number;
  sales: number | null;
  smallSample: boolean;
  /** "postcode" = the suburb's own postcode figure; "lga" = council-area fallback (postcode median suppressed). */
  geography: "postcode" | "lga";
  geographyName: string;
  period: string;
  sourceUrl: string;
  /** Short label for the figure's geography, e.g. "postcode 2216" or "Canterbury-Bankstown council area". */
  where: string;
};

function priceFrom(d: DcjSales | null, kind: PriceKind): Omit<MedianPrice, "where"> | null {
  if (!d) return null;
  const value = kind === "unit" ? d.medianSalePriceStrata : d.medianSalePriceNonStrata;
  if (value == null) return null;
  return {
    kind,
    value,
    sales: kind === "unit" ? d.strataSales : d.nonStrataSales,
    smallSample: kind === "unit" ? d.strataSmallSample : d.nonStrataSmallSample,
    geography: d.geography,
    geographyName: d.geographyName,
    period: d.sourceRef.period ?? d.sourceRef.quarter ?? "",
    sourceUrl: d.sourceRef.sourceUrl,
  };
}

const whereLabel = (p: Omit<MedianPrice, "where">) => (p.geography === "postcode" ? `postcode ${p.geographyName}` : `${p.geographyName} council area`);

/** Postcode median, else the primary-LGA median (labelled). */
export function medianPrice(s: SuburbRecord, kind: PriceKind): MedianPrice | null {
  const p = priceFrom(s.dcj.sales, kind) ?? priceFrom(s.dcj.salesLga, kind);
  return p ? { ...p, where: whereLabel(p) } : null;
}

/* ------------------------------------------------------------------ duty, deposits, scheme */

export type DutyPair = { standard: StampDutyResult; firstHome: StampDutyResult; foreign: StampDutyResult };

const dutyInput = { state: "NSW" as const, propertyType: "established" as const, ownerOccupier: true, withMortgage: true };

export function dutyAt(price: number): DutyPair {
  return {
    standard: calcStampDuty({ ...dutyInput, price, firstHomeBuyer: false, foreignPurchaser: false }),
    firstHome: calcStampDuty({ ...dutyInput, price, firstHomeBuyer: true, foreignPurchaser: false }),
    foreign: calcStampDuty({ ...dutyInput, price, firstHomeBuyer: false, foreignPurchaser: true, citizenOrPR: false }),
  };
}

export const schemeAreaFor = (s: SuburbRecord): DepositSchemeArea => (s.gccsa === "Greater Sydney" ? "capital" : "regional");

export type PriceBlock = {
  price: MedianPrice;
  duty: DutyPair;
  deposit: DepositResult;
  scheme: ReturnType<typeof depositSchemeCheck>;
  /** Median price ÷ (2021 median weekly household income × 52). */
  incomeMultiple: number | null;
  /** Weeks of the latest median new-bond rent that equal a 5% deposit. */
  rentWeeksFor5pc: number | null;
};

function priceBlock(s: SuburbRecord, price: MedianPrice | null): PriceBlock | null {
  if (!price) return null;
  const area = schemeAreaFor(s);
  const deposit = calcDeposit({
    price: price.value,
    depositPcts: [5, 10, 20],
    stampDuty: { ...dutyInput, firstHomeBuyer: true, foreignPurchaser: false },
    schemeArea: area,
  });
  const inc = s.census.medianHouseholdIncomeWk;
  const rent = s.dcj.rent?.medianRentWkLatest ?? null;
  return {
    price,
    duty: dutyAt(price.value),
    deposit,
    scheme: depositSchemeCheck("NSW", price.value, area),
    incomeMultiple: inc ? Math.round((price.value / (inc * 52)) * 10) / 10 : null,
    rentWeeksFor5pc: rent ? Math.round((price.value * 0.05) / rent) : null,
  };
}

/* ------------------------------------------------------------------ rent */

export type RentView = {
  latestWk: number | null;
  latestMonthly: number | null;
  period: string;
  where: string;
  sourceUrl: string;
  rows: { label: string; medianWk: number; smallSample: boolean; bonds: number | null }[];
  census2021Wk: number | null;
  census2021Monthly: number | null;
  censusRepayMonthly: number | null;
  /** (latest new-bond median − 2021 Census median) / 2021 median, %. Different measures: indicative only. */
  changeSince2021Pct: number | null;
  /** 2021 median rent as % of 2021 median household income. */
  rentToIncome2021Pct: number | null;
  /** 2021 median mortgage repayment vs 2021 median rent (monthly), % difference. */
  repayVsRent2021Pct: number | null;
};

const weeklyToMonthly = (wk: number) => Math.round((wk * 52) / 12);

const ROW_LABEL: Record<string, string> = {
  "Total|Total": "All dwellings",
  "Flat/Unit|1 Bedroom": "1-bedroom unit",
  "Flat/Unit|2 Bedrooms": "2-bedroom unit",
  "Flat/Unit|3 Bedrooms": "3-bedroom unit",
  "House|Total": "House (all sizes)",
  "House|3 Bedrooms": "3-bedroom house",
  "House|4 or more Bedrooms": "4+ bedroom house",
  "Townhouse|Total": "Townhouse (all sizes)",
};

function rentRows(rows: DcjRentRow[]) {
  const order = Object.keys(ROW_LABEL);
  return rows
    .map((r) => ({ key: `${r.dwellingType}|${r.bedrooms}`, r }))
    .filter((x) => ROW_LABEL[x.key])
    .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
    .map(({ key, r }) => ({ label: ROW_LABEL[key], medianWk: r.medianWk, smallSample: r.smallSample, bonds: r.newBonds }));
}

function rentView(s: SuburbRecord): RentView {
  const r = s.dcj.rent;
  const c = s.census;
  const latestWk = r?.medianRentWkLatest ?? null;
  const pctDiff = (a: number | null, b: number | null) => (a != null && b ? Math.round(((a - b) / b) * 100) : null);
  const c21m = c.medianRentWk2021 ? weeklyToMonthly(c.medianRentWk2021) : null;
  return {
    latestWk,
    latestMonthly: latestWk ? weeklyToMonthly(latestWk) : null,
    period: r?.sourceRef.period ?? "",
    where: r ? (r.geography === "postcode" ? `postcode ${r.geographyName}` : `${r.geographyName} council area`) : "",
    sourceUrl: r?.sourceRef.sourceUrl ?? "",
    rows: r ? rentRows(r.rows) : [],
    census2021Wk: c.medianRentWk2021,
    census2021Monthly: c21m,
    censusRepayMonthly: c.medianMortgageRepayMth2021,
    changeSince2021Pct: pctDiff(latestWk, c.medianRentWk2021),
    rentToIncome2021Pct: c.medianRentWk2021 && c.medianHouseholdIncomeWk ? Math.round((c.medianRentWk2021 / c.medianHouseholdIncomeWk) * 100) : null,
    repayVsRent2021Pct: pctDiff(c.medianMortgageRepayMth2021, c21m),
  };
}

/* ------------------------------------------------------------------ nearby */

export type NearbyRow = {
  slug: string;
  name: string;
  postcode: string;
  path: string;
  distanceKm: number;
  nepalBorn: number | null;
  rentWk: number | null;
  unit: MedianPrice | null;
  renterPct: number | null;
};

function nearbyRows(s: SuburbRecord): NearbyRow[] {
  return nearestPublished(s, PUBLISHED_SLUGS, 5)
    .map((n) => {
      const o = SUBURBS.find((x) => x.slug === n.slug);
      if (!o) return null;
      return {
        slug: o.slug,
        name: o.name,
        postcode: o.postcode,
        path: suburbPath(o),
        distanceKm: n.distanceKm,
        nepalBorn: o.census.nepalBorn,
        rentWk: o.dcj.rent?.medianRentWkLatest ?? null,
        unit: medianPrice(o, "unit"),
        renterPct: o.census.renterPct,
      };
    })
    .filter((x): x is NearbyRow => !!x);
}

/* ------------------------------------------------------------------ visa / regional */

const V491 = VISA_POLICIES.find((v) => v.slug === "subclass-491");

export type RegionalView = { category: 2 | 3 | null; sourceUrls: string[]; verifiedAt: string; verified: boolean };

function regionalView(s: SuburbRecord): RegionalView {
  const rc = V491?.regionalCondition;
  return {
    category: nswDesignatedRegionalCategory(s.postcode),
    sourceUrls: rc?.sourceUrls ?? [NSW_DRA_POSTCODES.sourceUrl],
    verifiedAt: rc?.verifiedAt ?? NSW_DRA_POSTCODES.verifiedAt,
    verified: rc?.verified ?? false,
  };
}

/* ------------------------------------------------------------------ the whole page */

export type SuburbView = ReturnType<typeof buildSuburbView>;

export function buildSuburbView(s: SuburbRecord) {
  const unit = priceBlock(s, medianPrice(s, "unit"));
  const house = priceBlock(s, medianPrice(s, "house"));
  const lgaNames = s.lgas.map((l) => l.name);
  const rulesCheckedAt = [unit?.duty.firstHome.rulesVerifiedAt, house?.duty.firstHome.rulesVerifiedAt, FIVE_PERCENT_DEPOSIT_SCHEME.verifiedAt]
    .filter((d): d is string => !!d)
    .sort()[0];
  const anyUnverified = !!(unit?.duty.firstHome.hasUnverified || house?.duty.firstHome.hasUnverified || unit?.duty.standard.hasUnverified || house?.duty.standard.hasUnverified);
  return {
    s,
    path: suburbPath(s),
    key: suburbKey(s),
    lgaNames,
    lgaLabel: s.lga?.name ?? null,
    unit,
    house,
    rent: rentView(s),
    nearby: nearbyRows(s),
    regional: regionalView(s),
    schemeArea: schemeAreaFor(s),
    schemeCap: FIVE_PERCENT_DEPOSIT_SCHEME.priceCaps.NSW[schemeAreaFor(s)],
    surchargePct: NSW.foreignSurcharge.ratePct,
    fhbas: NSW.concessions.find((c) => c.requiresFirstHomeBuyer && c.appliesTo.includes("established")) ?? null,
    ban: COMMON_FACTS.establishedDwellingBan,
    rulesCheckedAt: rulesCheckedAt ?? "",
    /** Rule-based figures are shown as fact only when verified and fresh (FRONTEND.md non-negotiable 4). */
    rulesOk: !anyUnverified && !!rulesCheckedAt && !isStale(rulesCheckedAt),
    dataPulledAt: DATA_PULLED_AT,
  };
}
