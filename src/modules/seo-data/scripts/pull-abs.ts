/**
 * Pull suburb data for the programmatic-SEO suburb pages.
 *
 *   cd app && npx tsx src/modules/seo-data/scripts/pull-abs.ts
 *
 * Sources (all public, no key):
 *  - ABS Data API (SDMX) — Census 2021 GCP tables G01 G02 G09 G10 G13 G36 G37 G62 at SAL level (CC BY 4.0)
 *  - ABS ASGS 2021 ArcGIS services on geo.abs.gov.au — SAL point, SAL/LGA/POA polygons, GCCSA (CC BY 4.0)
 *  - NSW DCJ Rent and Sales Report — latest rent tables + sales tables (.xlsx), postcode level
 *
 * Writes src/modules/seo-data/data/suburbs.json. Never invents values: anything unavailable is null
 * and listed in `completeness.missing` / `notes`.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SUBURB_TARGETS, suburbSlug, type SuburbTarget } from "../targets";
import type {
  CensusData,
  CountryOfBirthCount,
  DcjRent,
  DcjRentRow,
  DcjSales,
  DwellingMix,
  LgaShare,
  NearbySuburb,
  PostcodeShare,
  SelectionRule,
  SourceRef,
  SuburbDataset,
  SuburbRecord,
} from "../types";
import { readXlsx, type Sheet } from "./xlsx";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(HERE, "..", "data", "suburbs.json");

const ABS_API = "https://data.api.abs.gov.au/rest";
const ASGS = "https://geo.abs.gov.au/arcgis/rest/services/ASGS2021";
const DCJ_PAGE =
  "https://dcj.nsw.gov.au/about-us/families-and-communities-statistics/housing-rent-and-sales/rent-and-sales-report.html";
const DCJ_ORIGIN = "https://dcj.nsw.gov.au";

const ABS_LICENCE = "CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)";
const ABS_ATTRIBUTION = "Source: ABS, Census of Population and Housing 2021, CC BY 4.0";
const ASGS_ATTRIBUTION = "Source: ABS, Australian Statistical Geography Standard (ASGS) Edition 3, CC BY 4.0";
const DCJ_ATTRIBUTION = "Source: NSW Department of Communities and Justice, Rent and Sales Report";
const DCJ_LICENCE =
  "NSW Government copyright. Data.NSW lists the Rent and Sales Tables as 'Licence specified by agency'; no explicit open licence found on the DCJ page (checked 2026-10-26). Publish aggregates with attribution and a link.";

// ------------------------------------------------------------------ http

async function fetchWithRetry(url: string, init: RequestInit = {}, tries = 3): Promise<Response> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(120_000), redirect: "follow" });
      if (res.ok) return res;
      lastErr = new Error(`HTTP ${res.status} for ${url}`);
      if (res.status >= 400 && res.status < 500 && res.status !== 429) break;
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
  }
  throw lastErr;
}

async function getText(url: string, accept?: string): Promise<string> {
  const res = await fetchWithRetry(url, accept ? { headers: { Accept: accept } } : {});
  return res.text();
}

async function getJson<T>(url: string, body?: URLSearchParams): Promise<T> {
  const res = await fetchWithRetry(
    url,
    body ? { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } } : {},
  );
  return (await res.json()) as T;
}

// ------------------------------------------------------------------ helpers

const round1 = (n: number) => Math.round(n * 10) / 10;
const pct = (num: number | null | undefined, den: number | null | undefined): number | null =>
  num == null || den == null || den <= 0 ? null : round1((num / den) * 100);

function parseCsv(text: string): Record<string, string>[] {
  // SDMX-CSV from the ABS API: no quoted fields when labels are not requested.
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(",");
  return lines.slice(1).map((l) => {
    const cells = l.split(",");
    const row: Record<string, string> = {};
    header.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

// ------------------------------------------------------------------ ABS SDMX

type Obs = Record<string, string>; // dimension values + OBS_VALUE

interface TableSpec {
  id: string;
  /** Key template; "{SAL}" replaced by SAL codes joined with "+". */
  key: string;
}

const TABLES: TableSpec[] = [
  { id: "G01", key: "3.P_1+B_11+B_O+C_1.{SAL}.SAL.1" },
  { id: "G02", key: ".{SAL}.SAL.1" },
  { id: "G09", key: "3.._T.{SAL}.SAL.1" },
  { id: "G10", key: "_T..{SAL}.SAL.1" },
  { id: "G13", key: "3.5206+_T._T.{SAL}.SAL.1" },
  { id: "G36", key: ".D.{SAL}.SAL.1" },
  { id: "G37", key: "._T.{SAL}.SAL.1" },
  { id: "G62", key: ".3.{SAL}.SAL.1" },
];

function tableUrl(id: string, key: string): string {
  return `${ABS_API}/data/ABS,C21_${id}_SAL,1.0.0/${key}`;
}

async function pullAbs(salCodes: string[]) {
  const joined = salCodes.join("+");
  const byTable: Record<string, Obs[]> = {};
  const urls: Record<string, string> = {};
  for (const t of TABLES) {
    const url = tableUrl(t.id, t.key.replace("{SAL}", joined));
    urls[t.id] = url;
    const csv = await getText(url, "application/vnd.sdmx.data+csv");
    byTable[t.id] = parseCsv(csv);
    console.log(`  ABS ${t.id}: ${byTable[t.id].length} observations`);
  }
  // Country names for G09 BPLP codes.
  const cl = JSON.parse(
    await getText(`${ABS_API}/codelist/ABS/CL_C21_BPLP11/1.0.0`, "application/vnd.sdmx.structure+json"),
  ) as { data: { codelists: { codes: { id: string; name: string }[] }[] } };
  const countryNames = new Map(cl.data.codelists[0].codes.map((c) => [c.id, c.name]));
  return { byTable, urls, countryNames };
}

function pick(rows: Obs[], sal: string, match: Record<string, string>): number | null {
  const r = rows.find((o) => o.REGION === sal && Object.entries(match).every(([k, v]) => o[k] === v));
  if (!r || r.OBS_VALUE === "" || r.OBS_VALUE === undefined) return null;
  const n = Number(r.OBS_VALUE);
  return Number.isFinite(n) ? n : null;
}

/** For per-suburb URLs (the batch query is what was actually fetched; this is the citable single-suburb form). */
function perSuburbUrls(sal: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of TABLES) out[t.id] = tableUrl(t.id, t.key.replace("{SAL}", sal));
  return out;
}

function buildCensus(
  sal: string,
  abs: Awaited<ReturnType<typeof pullAbs>>,
): CensusData {
  const T = abs.byTable;
  const nonZero = (n: number | null) => (n == null || n === 0 ? null : n);

  // G01
  const population = pick(T.G01, sal, { PCHAR: "P_1" });
  const bornOverseas = pick(T.G01, sal, { PCHAR: "B_O" });
  const citizens = pick(T.G01, sal, { PCHAR: "C_1" });

  // G09 (persons, all ages)
  const g09 = T.G09.filter((o) => o.REGION === sal && o.AGEP === "_T" && o.SEXP === "3");
  const g09Total = pick(T.G09, sal, { BPLP: "_T", AGEP: "_T" });
  const nepalBorn = pick(T.G09, sal, { BPLP: "7105", AGEP: "_T" });
  const countries: CountryOfBirthCount[] = g09
    .filter((o) => !["_T", "11", "_O", "_N"].includes(o.BPLP))
    .map((o) => ({
      code: o.BPLP,
      name: abs.countryNames.get(o.BPLP) ?? o.BPLP,
      count: Number(o.OBS_VALUE),
      pct: 0,
    }))
    .filter((c) => Number.isFinite(c.count) && c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map((c) => ({ ...c, pct: pct(c.count, g09Total ?? population) ?? 0 }));

  // G13
  const nepali = pick(T.G13, sal, { LANP: "5206", ENGLP: "_T" });

  // G10 (overseas-born persons; YARP 2016..2021 = arrived 2016 to Census night 2021)
  const g10Total = pick(T.G10, sal, { BPLP: "_T", YARP: "_T" });
  const arrYears = ["2016", "2017", "2018", "2019", "2020", "2021"].map((y) => pick(T.G10, sal, { BPLP: "_T", YARP: y }));
  const arrived = arrYears.every((v) => v != null) ? arrYears.reduce<number>((s, v) => s + (v ?? 0), 0) : null;

  // G02
  const g02 = (code: string) => nonZero(pick(T.G02, sal, { MEDAVG: code }));

  // G37 tenure (STRD _T)
  const occ = pick(T.G37, sal, { TENLLD: "_T", STRD: "_T" });
  const rented = pick(T.G37, sal, { TENLLD: "R_T", STRD: "_T" });
  const mortgage = pick(T.G37, sal, { TENLLD: "2", STRD: "_T" });
  const outright = pick(T.G37, sal, { TENLLD: "1", STRD: "_T" });

  // G36 dwelling structure, dwellings count, occupied private dwellings
  const d = (code: string) => pick(T.G36, sal, { DWTSTRD: code, SUM: "D" });
  const occD = d("OCC");
  let dwellingMix: DwellingMix | null = null;
  const sep = d("11"), semi = d("2"), flat = d("3"), oth = d("9"), ns = d("_N");
  if (occD && sep != null && semi != null && flat != null && oth != null) {
    dwellingMix = {
      separateHousePct: pct(sep, occD)!,
      semiDetachedPct: pct(semi, occD)!,
      flatApartmentPct: pct(flat, occD)!,
      otherPct: pct(oth, occD)!,
      notStatedPct: pct(ns ?? 0, occD)!,
      occupiedPrivateDwellings: occD,
    };
  }

  // G62 travel to work (persons)
  const employed = pick(T.G62, sal, { MTWP: "_T" });
  const trainParts = ["1", "1_T", "1_2O"].map((c) => pick(T.G62, sal, { MTWP: c }));
  const train = trainParts.every((v) => v != null) ? trainParts.reduce<number>((s, v) => s + (v ?? 0), 0) : null;
  const wfh = pick(T.G62, sal, { MTWP: "233" });

  return {
    sourceRef: {
      source: "ABS, Census of Population and Housing 2021, General Community Profile (SAL)",
      sourceUrl: `https://www.abs.gov.au/census/find-census-data/quickstats/2021/SAL${sal}`,
      licence: ABS_LICENCE,
      attribution: ABS_ATTRIBUTION,
      year: 2021,
    },
    quickStatsUrl: `https://www.abs.gov.au/census/find-census-data/quickstats/2021/SAL${sal}`,
    tableUrls: perSuburbUrls(sal),
    population,
    bornOverseas,
    bornOverseasPct: pct(bornOverseas, population),
    australianCitizenPct: pct(citizens, population),
    nepalBorn,
    nepalBornPct: pct(nepalBorn, g09Total ?? population),
    topCountriesOfBirth: countries.length === 3 ? countries : null,
    topCountriesCheck: "unchecked",
    nepaliSpokenAtHome: nepali,
    nepaliSpokenAtHomePct: pct(nepali, pick(T.G13, sal, { LANP: "_T", ENGLP: "_T" })),
    arrived2016to2021: arrived,
    arrivedLast5yrsPct: pct(arrived, population),
    arrivedLast5yrsPctOfOverseasBorn: pct(arrived, g10Total),
    medianAge: g02("1"),
    medianPersonalIncomeWk: g02("2"),
    medianHouseholdIncomeWk: g02("4"),
    medianMortgageRepayMth2021: g02("5"),
    medianRentWk2021: g02("6"),
    avgHouseholdSize: g02("8"),
    occupiedPrivateDwellings: occ,
    renterPct: pct(rented, occ),
    ownerWithMortgagePct: pct(mortgage, occ),
    ownedOutrightPct: pct(outright, occ),
    dwellingMix,
    trainToWorkPct: pct(train, employed),
    workedAtHomePct: pct(wfh, employed),
    employedPersons: employed,
  };
}

/**
 * QuickStats "Country of birth, top responses" uses the full country classification, while G09 itemises
 * only 50 countries. Parse the page and use it to confirm (or correct) the G09 top 3.
 */
async function checkTopCountries(census: CensusData, countryCodes: Map<string, string>): Promise<void> {
  let html: string;
  try {
    html = await getText(census.quickStatsUrl);
  } catch {
    return;
  }
  const i = html.indexOf("Country of birth, top responses");
  if (i < 0) return;
  const text = html
    .slice(i, i + 20_000)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|\bnull\b/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .split("More information on")[0];
  const after = text.split("Other top responses:")[1];
  if (!after) return;
  const re = /([A-Z][A-Za-z ,()'.\-]*?)\s+([\d,]+)\s+([\d.]+)\s+[\d,]+\s+[\d.]+\s+[\d,]+\s+[\d.]+/g;
  const qs: CountryOfBirthCount[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(after))) {
    const name = m[1].trim();
    qs.push({ code: countryCodes.get(name) ?? null, name, count: Number(m[2].replace(/,/g, "")), pct: Number(m[3]) });
  }
  if (qs.length < 3) return;
  const top3 = qs.slice(0, 3);
  const g09 = census.topCountriesOfBirth ?? [];
  const same = g09.length === 3 && g09.every((c, k) => c.name === top3[k].name && c.count === top3[k].count);
  census.topCountriesCheck = same ? "match" : "replaced";
  if (!same) census.topCountriesOfBirth = top3;
}

// ------------------------------------------------------------------ ASGS geography

type Ring = [number, number][];
interface EsriPolygon {
  rings: Ring[];
}
interface EsriFeature<A, G> {
  attributes: A;
  geometry?: G;
}
interface EsriResult<A, G> {
  features?: EsriFeature<A, G>[];
  error?: { message: string };
}

function esriQueryUrl(service: string, layer: number) {
  return `${ASGS}/${service}/MapServer/${layer}/query`;
}

async function esriQuery<A, G>(service: string, layer: number, params: Record<string, string>) {
  const body = new URLSearchParams({ f: "json", outSR: "4326", ...params });
  const res = await getJson<EsriResult<A, G>>(esriQueryUrl(service, layer), body);
  if (res.error) throw new Error(`ArcGIS ${service}/${layer}: ${res.error.message}`);
  return res.features ?? [];
}

function pointInRings(x: number, y: number, rings: Ring[]): boolean {
  // Even-odd rule across all rings (handles holes and multipart polygons).
  let inside = false;
  for (const ring of rings) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

function bbox(rings: Ring[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rings)
    for (const [x, y] of r) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  return { minX, minY, maxX, maxY };
}

const GRID = 160;

/** Share of the SAL polygon's area falling in each overlay polygon (grid sampling). */
function areaShares<K extends string>(sal: Ring[], overlays: { key: K; rings: Ring[] }[]) {
  const b = bbox(sal);
  const counts = new Map<K, number>();
  let inside = 0;
  for (let i = 0; i < GRID; i++)
    for (let j = 0; j < GRID; j++) {
      const x = b.minX + ((i + 0.5) / GRID) * (b.maxX - b.minX);
      const y = b.minY + ((j + 0.5) / GRID) * (b.maxY - b.minY);
      if (!pointInRings(x, y, sal)) continue;
      inside++;
      const hit = overlays.find((o) => pointInRings(x, y, o.rings));
      if (hit) counts.set(hit.key, (counts.get(hit.key) ?? 0) + 1);
    }
  return [...counts.entries()]
    .map(([key, n]) => ({ key, sharePct: round1((n / Math.max(inside, 1)) * 100) }))
    .filter((s) => s.sharePct >= 1)
    .sort((a, b) => b.sharePct - a.sharePct);
}

const cleanLgaName = (n: string) => n.replace(/\s*\((NSW|Vic\.|Qld|SA|WA|Tas\.|NT|ACT)\)$/, "");

interface GeoInfo {
  centroid: { lat: number; lng: number } | null;
  areaSqKm: number | null;
  lgas: LgaShare[];
  poaShares: PostcodeShare[];
  gccsa: string | null;
}

async function pullGeo(salCodes: string[]): Promise<Map<string, GeoInfo>> {
  const out = new Map<string, GeoInfo>();
  const pts = await esriQuery<{ sal_code_2021: string; area_albers_sqkm: number }, { points: [number, number][] }>(
    "SAL",
    2,
    { where: `sal_code_2021 IN (${salCodes.map((s) => `'${s}'`).join(",")})`, outFields: "sal_code_2021,area_albers_sqkm", returnGeometry: "true" },
  );
  for (const sal of salCodes) {
    const pt = pts.find((p) => p.attributes.sal_code_2021 === sal);
    const xy = pt?.geometry?.points?.[0];
    const info: GeoInfo = {
      centroid: xy ? { lat: Number(xy[1].toFixed(6)), lng: Number(xy[0].toFixed(6)) } : null,
      areaSqKm: pt ? round1(pt.attributes.area_albers_sqkm * 10) / 10 : null,
      lgas: [],
      poaShares: [],
      gccsa: null,
    };

    const poly = await esriQuery<{ sal_code_2021: string }, EsriPolygon>("SAL", 0, {
      where: `sal_code_2021='${sal}'`,
      outFields: "sal_code_2021",
      returnGeometry: "true",
    });
    const salRings = poly[0]?.geometry?.rings;
    if (salRings?.length) {
      const b = bbox(salRings);
      const envelope = JSON.stringify({ xmin: b.minX, ymin: b.minY, xmax: b.maxX, ymax: b.maxY, spatialReference: { wkid: 4326 } });
      const spatial = {
        geometry: envelope,
        geometryType: "esriGeometryEnvelope",
        inSR: "4326",
        spatialRel: "esriSpatialRelIntersects",
        returnGeometry: "true",
        maxAllowableOffset: "0.00002",
      };
      const lgas = await esriQuery<{ lga_code_2021: string; lga_name_2021: string }, EsriPolygon>("LGA", 0, {
        ...spatial,
        outFields: "lga_code_2021,lga_name_2021",
      });
      info.lgas = areaShares(
        salRings,
        lgas.filter((f) => f.geometry).map((f) => ({ key: `${f.attributes.lga_code_2021}|${f.attributes.lga_name_2021}`, rings: f.geometry!.rings })),
      ).map((s) => {
        const [code, name] = s.key.split("|");
        return { code, name: cleanLgaName(name), areaSharePct: s.sharePct };
      });
      const poas = await esriQuery<{ poa_code_2021: string }, EsriPolygon>("POA", 0, { ...spatial, outFields: "poa_code_2021" });
      info.poaShares = areaShares(
        salRings,
        poas.filter((f) => f.geometry).map((f) => ({ key: f.attributes.poa_code_2021, rings: f.geometry!.rings })),
      ).map((s) => ({ poa: s.key, areaSharePct: s.sharePct }));
    }

    if (info.centroid) {
      const g = await esriQuery<{ gccsa_name_2021: string }, unknown>("GCCSA", 0, {
        geometry: JSON.stringify({ x: info.centroid.lng, y: info.centroid.lat, spatialReference: { wkid: 4326 } }),
        geometryType: "esriGeometryPoint",
        inSR: "4326",
        spatialRel: "esriSpatialRelIntersects",
        outFields: "gccsa_name_2021",
        returnGeometry: "false",
      });
      info.gccsa = g[0]?.attributes.gccsa_name_2021 ?? null;
    }
    out.set(sal, info);
    console.log(
      `  ASGS ${sal}: LGA ${info.lgas.map((l) => `${l.name} ${l.areaSharePct}%`).join(", ")} · POA ${info.poaShares
        .map((p) => `${p.poa} ${p.areaSharePct}%`)
        .join(", ")} · ${info.gccsa}`,
    );
  }
  return out;
}

// ------------------------------------------------------------------ DCJ Rent and Sales

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function quarterFromPeriod(period: string): string | undefined {
  // "Reporting period: April to June 2026" / "January - March 2026"
  const m = /([A-Za-z]+)\s*(?:to|-|–)\s*([A-Za-z]+)\s+(\d{4})/.exec(period);
  if (!m) return undefined;
  const endMonth = MONTHS[m[2].toLowerCase()];
  return endMonth ? `${m[3]}-Q${Math.ceil(endMonth / 3)}` : undefined;
}

const num = (v: string | null | undefined): number | null => {
  if (v == null) return null;
  const s = v.replace(/[,$\s]/g, "");
  if (s === "" || s === "-" || s === "s") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

interface DcjTables {
  rentUrl: string;
  salesUrl: string;
  rentPeriod: string;
  salesPeriod: string;
  rent: Record<string, Sheet>;
  sales: Record<string, Sheet>;
}

async function pullDcj(): Promise<DcjTables> {
  const html = await getText(DCJ_PAGE);
  const hrefs = [...html.matchAll(/href="([^"]+\.xlsx)"/gi)].map((m) => m[1]);
  const rentHref = hrefs.find((h) => /rent-tables-[a-z]+-\d{4}-quarter\.xlsx$/i.test(h));
  const salesHref = hrefs.find((h) => /sales-tables-[a-z]+-\d{4}-quarter\.xlsx$/i.test(h));
  if (!rentHref || !salesHref) throw new Error("DCJ: could not find rent/sales .xlsx links on the report page");
  const abs = (h: string) => (h.startsWith("http") ? h : `${DCJ_ORIGIN}${h}`);
  const download = async (url: string) => {
    const res = await fetchWithRetry(url);
    const finalUrl = res.url || url;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.readUInt32LE(0) !== 0x04034b50) throw new Error(`DCJ: ${url} did not return an xlsx`);
    return { buf, finalUrl };
  };
  const r = await download(abs(rentHref));
  const s = await download(abs(salesHref));
  const rent = readXlsx(r.buf);
  const sales = readXlsx(s.buf);
  const periodOf = (sheet: Sheet | undefined) =>
    (sheet?.slice(0, 5).flat().find((c) => c && /Reporting period/i.test(c)) ?? "").replace(/^Reporting period:\s*/i, "");
  const out: DcjTables = {
    rentUrl: r.finalUrl,
    salesUrl: s.finalUrl,
    rentPeriod: periodOf(rent.Postcode),
    salesPeriod: periodOf(sales.Postcode),
    rent,
    sales,
  };
  console.log(`  DCJ rent: ${out.rentPeriod} (${out.rentUrl})`);
  console.log(`  DCJ sales: ${out.salesPeriod} (${out.salesUrl})`);
  return out;
}

function headerIndex(sheet: Sheet, firstCol: RegExp): number {
  return sheet.findIndex((r) => r && r[0] != null && firstCol.test(r[0]));
}

/** DCJ labels some LGAs by names that differ from ASGS 2021. */
const DCJ_LGA_ALIASES: Record<string, string> = {
  // DCJ sales tables still use "Western Plains Regional" (the council's name May–Sep 2016) for Dubbo Regional.
  "Dubbo Regional": "Western Plains Regional",
};

type SalesRows = (string | null)[][];

function salesRecord(
  t: DcjTables,
  rows: SalesRows,
  layout: { typeCol: number; medianCol: number; countCol: number },
  geography: "postcode" | "lga",
  geographyName: string,
): DcjSales | null {
  const v = (type: string) => {
    const r = rows.find((row) => row[layout.typeCol] === type);
    if (!r) return { median: null, count: null, small: false };
    const median = num(r[layout.medianCol]);
    return {
      median: median == null ? null : median * 1000,
      count: num(r[layout.countCol]),
      small: (r[layout.countCol] ?? "").trim() === "s",
    };
  };
  const strata = v("Strata");
  const non = v("Non Strata");
  const all = v("Total");
  if (strata.median == null && non.median == null && all.median == null) return null;
  return {
    sourceRef: {
      source: `NSW DCJ Rent and Sales Report — sales tables (${geography === "postcode" ? "postcode" : "LGA"} ${geographyName})`,
      sourceUrl: t.salesUrl,
      licence: DCJ_LICENCE,
      attribution: DCJ_ATTRIBUTION,
      period: t.salesPeriod,
      quarter: quarterFromPeriod(t.salesPeriod),
    },
    geography,
    geographyName,
    medianSalePriceStrata: strata.median,
    strataSales: strata.count,
    strataSmallSample: strata.small,
    medianSalePriceNonStrata: non.median,
    nonStrataSales: non.count,
    nonStrataSmallSample: non.small,
    medianSalePriceAll: all.median,
    allSales: all.count,
    allSmallSample: all.small,
  };
}

function dcjSalesPostcode(t: DcjTables, postcode: string): DcjSales | null {
  // Postcode | Dwelling Type | Q1 | Median | Q3 | Mean | Sales No. | …
  const pc = t.sales.Postcode;
  if (!pc) return null;
  const h = headerIndex(pc, /^Postcode$/i);
  const rows = pc.slice(h + 1).filter((r) => r && String(r[0]) === postcode);
  return salesRecord(t, rows, { typeCol: 1, medianCol: 3, countCol: 6 }, "postcode", postcode);
}

function dcjSalesLga(t: DcjTables, asgsLgaName: string): DcjSales | null {
  // GMR | Greater Sydney | Rings | LGA | DwellingType | Q1 | Median | Q3 | Mean | Sales No. | …
  const lg = t.sales.LGA;
  if (!lg) return null;
  const name = DCJ_LGA_ALIASES[asgsLgaName] ?? asgsLgaName;
  const h = headerIndex(lg, /Greater Metropolitan Region/i);
  const rows = lg.slice(h + 1).filter((r) => r && r[3] === name && r[0] === "Total" && r[1] === "Total" && r[2] === "Total");
  return salesRecord(t, rows, { typeCol: 4, medianCol: 6, countCol: 9 }, "lga", name);
}

const RENT_TYPES = new Set(["Total", "House", "Townhouse", "Flat/Unit", "Other"]);
const RENT_BEDS = new Set(["Total", "Bedsitter", "1 Bedroom", "2 Bedrooms", "3 Bedrooms", "4 or more Bedrooms", "Not Specified"]);

function dcjRentFor(t: DcjTables, postcode: string): DcjRent | null {
  const pc = t.rent.Postcode;
  if (!pc) return null;
  const h = headerIndex(pc, /^Postcode$/i);
  // Postcode | Dwelling Types | Number of Bedrooms | Q1 | Median | Q3 | New Bonds Lodged | Total Bonds Held | …
  const rows: DcjRentRow[] = [];
  for (const r of pc.slice(h + 1)) {
    if (!r || String(r[0]) !== postcode) continue;
    const type = r[1] ?? "";
    const beds = r[2] ?? "";
    const median = num(r[4]);
    if (!RENT_TYPES.has(type) || !RENT_BEDS.has(beds) || median == null) continue;
    rows.push({
      dwellingType: type as DcjRentRow["dwellingType"],
      bedrooms: beds as DcjRentRow["bedrooms"],
      medianWk: median,
      newBonds: num(r[6]),
      smallSample: (r[6] ?? "").trim() === "s",
    });
  }
  if (!rows.length) return null;
  const total = rows.find((r) => r.dwellingType === "Total" && r.bedrooms === "Total");
  return {
    sourceRef: {
      source: `NSW DCJ Rent and Sales Report — rent tables (postcode ${postcode}, new bonds lodged)`,
      sourceUrl: t.rentUrl,
      licence: DCJ_LICENCE,
      attribution: DCJ_ATTRIBUTION,
      period: t.rentPeriod,
      quarter: quarterFromPeriod(t.rentPeriod),
    },
    geography: "postcode",
    geographyName: postcode,
    medianRentWkLatest: total?.medianWk ?? null,
    rows,
  };
}

// ------------------------------------------------------------------ derived

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const NEAREST_MAX = 6;
const NEAREST_KM = 25;

/** The 14 field groups of research §C4.1 (identity row excluded). Gate: ≥10 non-null to generate a page. */
export const COMPLETENESS_FIELDS: { key: string; ok: (s: SuburbRecord) => boolean }[] = [
  { key: "population", ok: (s) => s.census.population != null },
  { key: "nepalBorn", ok: (s) => s.census.nepalBorn != null && s.census.nepalBornPct != null },
  { key: "bornOverseas", ok: (s) => s.census.bornOverseasPct != null && (s.census.topCountriesOfBirth?.length ?? 0) === 3 },
  { key: "nepaliSpokenAtHome", ok: (s) => s.census.nepaliSpokenAtHome != null },
  { key: "arrivedLast5yrsPct", ok: (s) => s.census.arrivedLast5yrsPct != null },
  { key: "medianAge", ok: (s) => s.census.medianAge != null },
  { key: "medianHouseholdIncomeWk", ok: (s) => s.census.medianHouseholdIncomeWk != null },
  { key: "rentAndRepayment2021", ok: (s) => s.census.medianRentWk2021 != null && s.census.medianMortgageRepayMth2021 != null },
  { key: "tenure", ok: (s) => s.census.renterPct != null && s.census.ownerWithMortgagePct != null },
  { key: "dwellingMix", ok: (s) => s.census.dwellingMix != null },
  { key: "trainToWorkPct", ok: (s) => s.census.trainToWorkPct != null },
  { key: "dcjSalePrice", ok: (s) => s.dcj.sales != null && (s.dcj.sales.medianSalePriceStrata != null || s.dcj.sales.medianSalePriceNonStrata != null) },
  { key: "dcjRentLatest", ok: (s) => s.dcj.rent?.medianRentWkLatest != null },
  { key: "nearest", ok: (s) => s.nearest.length >= 3 },
];

function selectionRuleOf(c: CensusData): SelectionRule {
  if ((c.nepalBorn ?? 0) >= 500) return "nepalBorn>=500";
  if ((c.bornOverseasPct ?? 0) >= 50 && (c.renterPct ?? 0) >= 50) return "overseas>=50%&renters>=50%";
  return "none";
}

// ------------------------------------------------------------------ main

async function main() {
  const targets: SuburbTarget[] = SUBURB_TARGETS;
  const sals = targets.map((t) => t.salCode);
  console.log(`Pulling ${targets.length} suburbs…`);

  console.log("ABS Data API…");
  const abs = await pullAbs(sals);

  console.log("ASGS geography…");
  const geo = await pullGeo(sals);

  console.log("NSW DCJ Rent and Sales Report…");
  let dcj: DcjTables | null = null;
  let dcjError: string | null = null;
  try {
    dcj = await pullDcj();
  } catch (e) {
    dcjError = e instanceof Error ? e.message : String(e);
    console.warn(`  DCJ unavailable: ${dcjError}`);
  }

  const geoRef: SourceRef = {
    source: "ABS ASGS Edition 3 (2021): SAL_PT, SAL, LGA, POA, GCCSA layers",
    sourceUrl: `${ASGS}`,
    licence: ABS_LICENCE,
    attribution: ASGS_ATTRIBUTION,
    year: 2021,
  };

  const records: SuburbRecord[] = targets.map((t) => {
    const census = buildCensus(t.salCode, abs);
    const g = geo.get(t.salCode);
    const notes: string[] = [];
    const lgas = g?.lgas ?? [];
    if (lgas.length > 1) notes.push(`Straddles LGAs by area: ${lgas.map((l) => `${l.name} ${l.areaSharePct}%`).join(", ")}.`);
    const poaTop = g?.poaShares[0]?.poa;
    if (poaTop && poaTop !== t.postcode)
      notes.push(`Target postcode ${t.postcode} is not the dominant ASGS POA (${poaTop}); check before publishing.`);
    else if (g && !g.poaShares.some((p) => p.poa === t.postcode))
      notes.push(`Target postcode ${t.postcode} not found among ASGS POA overlaps.`);
    if ((g?.poaShares.length ?? 0) > 1)
      notes.push(`Spans postal areas: ${g!.poaShares.map((p) => `${p.poa} ${p.areaSharePct}%`).join(", ")}.`);

    const salesPostcode = dcj ? dcjSalesPostcode(dcj, t.postcode) : null;
    const salesLga = dcj && lgas[0] ? dcjSalesLga(dcj, lgas[0].name) : null;
    // Postcode figures are primary; the primary LGA is used only when the postcode has no strata/non-strata median.
    const postcodeUsable =
      salesPostcode != null && (salesPostcode.medianSalePriceStrata != null || salesPostcode.medianSalePriceNonStrata != null);
    const sales = postcodeUsable ? salesPostcode : salesLga;
    const rent = dcj ? dcjRentFor(dcj, t.postcode) : null;
    let dcjNote: string | null = dcjError ? `DCJ tables could not be downloaded: ${dcjError}` : null;
    if (dcj && !sales) dcjNote = `No published DCJ sale median for postcode ${t.postcode} or its LGA (10 or fewer sales, or name mismatch).`;
    if (dcj && lgas[0] && !salesLga) notes.push(`No DCJ LGA sales row matched "${lgas[0].name}".`);
    if (lgas[0] && DCJ_LGA_ALIASES[lgas[0].name])
      notes.push(`DCJ tables label the ${lgas[0].name} LGA as "${DCJ_LGA_ALIASES[lgas[0].name]}".`);
    if (sales?.geography === "lga") notes.push(`DCJ sale prices use LGA ${sales.geographyName}: postcode ${t.postcode} figures are suppressed.`);
    if (sales && (sales.strataSmallSample || sales.nonStrataSmallSample))
      notes.push("Some DCJ sale medians are based on 11–30 sales ('s' flag) — treat with caution.");
    if (sales && sales.medianSalePriceStrata == null) notes.push("No DCJ strata (unit) sale median published for this quarter.");
    if (sales && sales.medianSalePriceNonStrata == null) notes.push("No DCJ non-strata (house) sale median published for this quarter.");

    return {
      salCode: t.salCode,
      name: t.name,
      slug: suburbSlug(t.name, t.postcode),
      state: t.state,
      postcode: t.postcode,
      batch: t.batch,
      gccsa: g?.gccsa ?? null,
      selectionRule: selectionRuleOf(census),
      lga: lgas[0] ?? null,
      lgas,
      poaShares: g?.poaShares ?? [],
      centroid: g?.centroid ?? null,
      areaSqKm: g?.areaSqKm ?? null,
      geoSourceRef: geoRef,
      census,
      dcj: { sales, salesLga, rent, postcodeSharedWith: [], note: dcjNote },
      nearest: [],
      completeness: { score: 0, of: 14, missing: [] },
      notes,
    };
  });

  console.log("ABS QuickStats cross-check of top countries of birth…");
  const codeByName = new Map([...abs.countryNames.entries()].map(([code, name]) => [name, code]));
  for (const r of records) {
    await checkTopCountries(r.census, codeByName);
    if (r.census.topCountriesCheck === "replaced")
      r.notes.push("Top countries of birth taken from QuickStats (a country not itemised in G09 ranks in the top 3).");
    if (r.census.topCountriesCheck === "unchecked") r.notes.push("Top countries of birth not cross-checked against QuickStats.");
  }

  // shared postcodes, nearest, completeness
  for (const r of records) {
    r.dcj.postcodeSharedWith = records.filter((o) => o !== r && o.postcode === r.postcode).map((o) => o.slug);
    if (r.dcj.postcodeSharedWith.length)
      r.notes.push(`DCJ figures are for postcode ${r.postcode}, shared with: ${r.dcj.postcodeSharedWith.join(", ")}.`);
    if (r.centroid) {
      const near: NearbySuburb[] = records
        .filter((o) => o !== r && o.centroid)
        .map((o) => ({ salCode: o.salCode, slug: o.slug, name: o.name, distanceKm: round1(haversineKm(r.centroid!, o.centroid!)) }))
        .filter((o) => o.distanceKm <= NEAREST_KM)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, NEAREST_MAX);
      r.nearest = near;
    }
  }
  for (const r of records) {
    const missing = COMPLETENESS_FIELDS.filter((f) => !f.ok(r)).map((f) => f.key);
    r.completeness = { score: 14 - missing.length, of: 14, missing };
  }

  const dataset: SuburbDataset = {
    pulledAt: new Date().toISOString(),
    generator: "src/modules/seo-data/scripts/pull-abs.ts",
    sources: {
      absCensus: {
        source: "ABS Data API (SDMX), Census 2021 General Community Profile, SAL level",
        sourceUrl: `${ABS_API}/data/ABS,C21_G02_SAL,1.0.0/`,
        licence: ABS_LICENCE,
        attribution: ABS_ATTRIBUTION,
        year: 2021,
      },
      asgs: geoRef,
      ...(dcj
        ? {
            dcjRent: {
              source: "NSW DCJ Rent and Sales Report — rent tables",
              sourceUrl: dcj.rentUrl,
              licence: DCJ_LICENCE,
              attribution: DCJ_ATTRIBUTION,
              period: dcj.rentPeriod,
              quarter: quarterFromPeriod(dcj.rentPeriod),
            },
            dcjSales: {
              source: "NSW DCJ Rent and Sales Report — sales tables",
              sourceUrl: dcj.salesUrl,
              licence: DCJ_LICENCE,
              attribution: DCJ_ATTRIBUTION,
              period: dcj.salesPeriod,
              quarter: quarterFromPeriod(dcj.salesPeriod),
            },
          }
        : {}),
    },
    notes: [
      "ABS Census values are 2021 (Census night 10 Aug 2021). Small cells are randomly perturbed by the ABS, so components may not sum to totals.",
      "Greater Sydney was in COVID-19 lockdown on Census day 2021: travel-to-work (trainToWorkPct) understates normal train use and workedAtHomePct is inflated.",
      "Year of arrival 2021 covers 1 Jan – 10 Aug 2021 only; international borders were largely closed from Mar 2020.",
      "topCountriesOfBirth is ranked from ABS table G09 (50 itemised countries) and cross-checked against the QuickStats 'top responses' (full classification); see census.topCountriesCheck.",
      "LGA and postcode shares are by land area (grid-sampled from ASGS polygons), not population.",
      "DCJ sale prices are medians for sales contracted in the quarter (lower/upper 5% excluded at LGA level); rents are medians for new bonds lodged in the quarter. Sales are reported ~3 months after quarter end, so the sales quarter lags the rent quarter.",
      "Strata ≈ units/townhouses; non-strata ≈ houses (Torrens-titled multi-unit dwellings count as non-strata).",
    ],
    suburbs: records,
  };

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(dataset, null, 2) + "\n");
  console.log(`\nWrote ${OUT_FILE}`);
  console.table(
    records.map((r) => ({
      suburb: r.slug,
      lga: r.lga?.name,
      nepalBorn: r.census.nepalBorn,
      strata: r.dcj.sales?.medianSalePriceStrata,
      house: r.dcj.sales?.medianSalePriceNonStrata,
      rent: r.dcj.rent?.medianRentWkLatest,
      completeness: `${r.completeness.score}/14`,
      missing: r.completeness.missing.join(","),
    })),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
