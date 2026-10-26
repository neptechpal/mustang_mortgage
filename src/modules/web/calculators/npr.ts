// Pure conversion logic for the NPR / AUD / lakh-crore / land-area converter.
// Ported from src/modules/tools/converter/engine.ts (WPCode snippet 2748 [mustang_converter]): same unit
// constants, formulas, best-fit rules, number formatting and localStorage keys. Additions: a "One" unit
// (the number as entered), and no default exchange rate (the user enters today's rate).

export const UNITS: Record<string, number> = {
  One: 1,
  Hundred: 1e2,
  Thousand: 1e3,
  Lakh: 1e5,
  Million: 1e6,
  Crore: 1e7,
  Billion: 1e9,
  Arab: 1e9, // 1 arab = 100 crore = 1 billion
  Kharab: 1e11,
  Trillion: 1e12,
};
export const UNIT_LIST = ["One", "Hundred", "Thousand", "Lakh", "Million", "Crore", "Billion", "Arab", "Kharab", "Trillion"] as const;
export type Unit = (typeof UNIT_LIST)[number];
export const UNIT_LABEL: Record<Unit, string> = {
  One: "Number as entered",
  Hundred: "Hundred",
  Thousand: "Thousand",
  Lakh: "Lakh (1,00,000)",
  Million: "Million",
  Crore: "Crore (1,00,00,000)",
  Billion: "Billion",
  Arab: "Arab (100 crore)",
  Kharab: "Kharab (100 arab)",
  Trillion: "Trillion",
};
const UNIT_ORDER_WEST: Unit[] = ["Trillion", "Billion", "Million", "Thousand", "Hundred"];
const UNIT_ORDER_IND: Unit[] = ["Kharab", "Arab", "Crore", "Lakh", "Thousand", "Hundred"];
const INDIAN_TARGETS = new Set(["Lakh", "Crore", "Arab", "Kharab", "NPR"]);

const ROPANI = 508.737;
const BIGHA = 6772.63;
export const AREA: Record<string, number> = {
  "Square metre (m²)": 1,
  "Square kilometre (km²)": 1_000_000,
  "Hectare (ha)": 10_000,
  Acre: 4046.8564224,
  "Square foot (ft²)": 0.09290304,
  "Square yard (yd²)": 0.83612736,
  "Square inch (in²)": 0.00064516,
  // Nepal, hilly region
  Ropani: ROPANI,
  Aana: ROPANI / 16,
  Paisa: ROPANI / 64,
  Dam: ROPANI / 256,
  // Nepal, Terai
  Bigha: BIGHA,
  Kattha: BIGHA / 20,
  Dhur: BIGHA / 400,
};
export const AREA_LIST = Object.keys(AREA);
export const AREA_GROUPS: { label: string; units: string[] }[] = [
  { label: "Metric and imperial", units: ["Square metre (m²)", "Square kilometre (km²)", "Hectare (ha)", "Acre", "Square foot (ft²)", "Square yard (yd²)", "Square inch (in²)"] },
  { label: "Nepal: hilly region", units: ["Ropani", "Aana", "Paisa", "Dam"] },
  { label: "Nepal: Terai", units: ["Bigha", "Kattha", "Dhur"] },
];
const PREF_ORDER_AREA = [
  "Square kilometre (km²)",
  "Hectare (ha)",
  "Acre",
  "Square metre (m²)",
  "Bigha",
  "Ropani",
  "Kattha",
  "Aana",
  "Dhur",
  "Paisa",
  "Dam",
  "Square foot (ft²)",
  "Square yard (yd²)",
];

/** localStorage keys (same as the original widget, so saved preferences carry over). */
export const LS = {
  round: "mmc_round",
  indian: "mmc_indian",
  rate: "mmc_rate",
  numFrom: "mmc_num_from",
  numTo: "mmc_num_to",
  curFromUnit: "mmc_cur_unit_from",
  curToUnit: "mmc_cur_unit_to",
  curFromCur: "mmc_cur_from",
  curToCur: "mmc_cur_to",
  areaFrom: "mmc_area_from",
  areaTo: "mmc_area_to",
} as const;

/** Old saved area names used US spelling ("Square meter (m²)"). */
export function normaliseAreaName(s: string) {
  return s.replace("meter", "metre").replace("kilometer", "kilometre");
}

/** Nepali/Indian digit grouping: 12,34,56,789.00 */
export function formatIndian(x: number, dp: number) {
  const neg = x < 0;
  const parts = Math.abs(Number(x)).toFixed(dp).split(".");
  const n = parts[0];
  const dec = parts[1] ? "." + parts[1] : "";
  const last3 = n.slice(-3);
  const rest = n.slice(0, -3);
  const restFmt = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return (neg ? "-" : "") + (rest ? restFmt + "," : "") + last3 + dec;
}
export function formatWestern(x: number, dp: number) {
  return Number(x).toLocaleString("en-AU", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
export const formatAuto = (x: number, dp: number, indian: boolean) => (indian ? formatIndian(x, dp) : formatWestern(x, dp));

function bestUnit(value: number, order: Unit[]) {
  for (const u of order) if (value >= UNITS[u]) return { unit: u, value: value / UNITS[u] };
  return { unit: "Hundred" as Unit, value: value / UNITS.Hundred };
}
const preferIndian = (target: string, groupingOn: boolean) => groupingOn && INDIAN_TARGETS.has(target);

export type ConvResult = { primary: string; secondary: string; formula: string; chips: string[]; copyText: string };

export function convertNumbering(v: number, from: Unit, to: Unit, dp: number, groupingOn: boolean): ConvResult {
  const abs = v * (UNITS[from] || 1);
  const res = abs / (UNITS[to] || 1);
  const ind = preferIndian(to, groupingOn);
  const primary = `${formatAuto(res, dp, ind)} ${to === "One" ? "" : to}`.trim();
  const best = bestUnit(abs, ind ? UNIT_ORDER_IND : UNIT_ORDER_WEST);
  const secondary = `≈ ${formatAuto(best.value, dp, ind)} ${best.unit}`;
  return {
    primary,
    secondary,
    formula: `${v} × ${UNITS[from].toLocaleString("en-AU")} ÷ ${UNITS[to].toLocaleString("en-AU")} = ${res.toFixed(dp)}`,
    chips: [`Base: ${formatAuto(abs, dp, ind)}`, `Best fit: ${best.unit}`, `Rounding: ${dp} dp`, `${ind ? "Nepali" : "Western"} grouping`],
    copyText: `${primary} | ${secondary}`,
  };
}

export type Currency = "AUD" | "NPR";

export function convertCurrency(amount: number, rate: number, fromUnit: Unit, fromCur: Currency, toCur: Currency, toUnit: Unit, dp: number, groupingOn: boolean): ConvResult {
  let base = amount * (UNITS[fromUnit] || 1);
  if (fromCur === "AUD" && toCur === "NPR") base *= rate;
  if (fromCur === "NPR" && toCur === "AUD") base /= rate;
  const res = base / (UNITS[toUnit] || 1);
  const ind = preferIndian(toCur, groupingOn) || preferIndian(toUnit, groupingOn);
  const unitText = toUnit === "One" ? "" : ` ${toUnit}`;
  const primary = `${toCur} ${formatAuto(res, dp, ind)}${unitText}`;
  const best = bestUnit(base, toCur === "AUD" ? UNIT_ORDER_WEST : UNIT_ORDER_IND);
  const secondary = `≈ ${toCur} ${formatAuto(best.value, dp, ind)} ${best.unit} (${formatAuto(base, 0, ind)})`;
  return {
    primary,
    secondary,
    formula: `${fromUnit === "One" ? amount : `(${amount} × ${fromUnit})`} ${fromCur} → ${toCur} at ${rate}${toUnit === "One" ? "" : ` → ÷ ${toUnit}`} = ${res.toFixed(dp)}`,
    chips: [`Rate: 1 AUD = ${formatWestern(rate, 4)} NPR`, `Best fit: ${best.unit}`, `Rounding: ${dp} dp`, `${ind ? "Nepali" : "Western"} grouping`],
    copyText: `${primary} | ${secondary}`,
  };
}

export function breakdownHilly(m2: number) {
  const ro = Math.floor(m2 / AREA.Ropani);
  m2 -= ro * AREA.Ropani;
  const an = Math.floor(m2 / AREA.Aana);
  m2 -= an * AREA.Aana;
  const pa = Math.floor(m2 / AREA.Paisa);
  m2 -= pa * AREA.Paisa;
  const da = Math.round(m2 / AREA.Dam);
  return { ro, an, pa, da };
}
export function breakdownTerai(m2: number) {
  const bi = Math.floor(m2 / AREA.Bigha);
  m2 -= bi * AREA.Bigha;
  const ka = Math.floor(m2 / AREA.Kattha);
  m2 -= ka * AREA.Kattha;
  const dh = Math.round(m2 / AREA.Dhur);
  return { bi, ka, dh };
}
export const hillyToM2 = (ro: number, an: number, pa: number, da: number) => ro * AREA.Ropani + an * AREA.Aana + pa * AREA.Paisa + da * AREA.Dam;
export const teraiToM2 = (bi: number, ka: number, dh: number) => bi * AREA.Bigha + ka * AREA.Kattha + dh * AREA.Dhur;

export function convertArea(amount: number, from: string, to: string, dp: number): ConvResult & { m2: number } {
  const m2 = amount * (AREA[from] || 1);
  const res = m2 / (AREA[to] || 1);
  const best = (() => {
    for (const u of PREF_ORDER_AREA) if (m2 >= AREA[u]) return { unit: u, value: m2 / AREA[u] };
    return { unit: "Square metre (m²)", value: m2 };
  })();
  const h = breakdownHilly(m2);
  const t = breakdownTerai(m2);
  const primary = `${formatWestern(res, dp)} ${to}`;
  const secondary = `≈ ${formatWestern(best.value, dp)} ${best.unit}`;
  return {
    m2,
    primary,
    secondary,
    formula: `${amount} × ${from} → ${m2.toFixed(6)} m² → ÷ ${to} = ${res.toFixed(dp)} ${to}`,
    chips: [`Base: ${formatWestern(m2, 4)} m²`, `Hilly: ${h.ro} ropani ${h.an} aana ${h.pa} paisa ${h.da} dam`, `Terai: ${t.bi} bigha ${t.ka} kattha ${t.dh} dhur`, `Rounding: ${dp} dp`],
    copyText: `${primary} | ${secondary}`,
  };
}
