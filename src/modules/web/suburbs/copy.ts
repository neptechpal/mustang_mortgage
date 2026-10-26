/**
 * Sentence builders for the suburb guides.
 *
 * Every sentence is built from the suburb's own values: thresholds choose the framing (renters a majority or a
 * minority, unit or house market, under or over a duty threshold, regional or not) and the numbers carry the
 * substance. Where two constructions say the same thing equally well, `pick` chooses one by the suburb's position in
 * postcode order, so neighbouring suburbs and suburbs that share a postcode (identical DCJ figures) read differently.
 * No landmark or lifestyle filler (research §C5.10). Voice: plain, specific, "we" for the business, Sulav by name.
 */
import type { SuburbRecord } from "@/modules/seo-data/types";
import { formatAud } from "../format";
import { PUBLISHED_SUBURBS, type MedianPrice, type PriceBlock, type SuburbView } from "./model";

/* ------------------------------------------------------------------ number helpers */

export const aud = (n: number) => formatAud(n);
export const num = (n: number) => n.toLocaleString("en-AU");
export const pct = (n: number) => `${Number.isInteger(n) ? n.toFixed(0) : n.toFixed(1)}%`;
/** "January - March 2026" → "January to March 2026" */
export const period = (p: string) => p.replace(/\s+-\s+/, " to ");
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
export const inWords = (n: number) => WORDS[n] ?? String(n);
export const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Which suburbs read most alike: same postcode (identical DCJ figures), same council, same framing branches.
 * Used only to spread equivalent sentence constructions, never to change a fact.
 */
function profile(s: SuburbRecord) {
  const c = s.census;
  const top = c.topCountriesOfBirth ?? [];
  return [
    `pc:${s.postcode}`,
    `lga:${s.lga?.code}`,
    `nep:${top.findIndex((x) => x.code === "7105")}`,
    `rent:${c.renterPct == null ? "?" : c.renterPct >= 60 ? 3 : c.renterPct >= 50 ? 2 : c.renterPct >= 40 ? 1 : 0}`,
    `mix:${!c.dwellingMix ? "?" : c.dwellingMix.flatApartmentPct >= 60 ? "u" : c.dwellingMix.separateHousePct >= 60 ? "h" : "m"}`,
    `hs:${s.dcj.sales?.medianSalePriceNonStrata != null}`,
    `us:${s.dcj.sales?.medianSalePriceStrata != null}`,
    `arr:${(c.arrivedLast5yrsPct ?? 0) >= 12}`,
    `mort:${(c.ownerWithMortgagePct ?? 0) >= 25}`,
  ];
}
const WEIGHT: Record<string, number> = { pc: 6, lga: 2 };
const PROFILES = PUBLISHED_SUBURBS.map((s) => ({ slug: s.slug, p: profile(s) }));
const SIM = new Map<string, Map<string, number>>();
for (const a of PROFILES) {
  const m = new Map<string, number>();
  for (const b of PROFILES) {
    if (a === b) continue;
    let w = 0;
    a.p.forEach((f, i) => {
      if (f === b.p[i]) w += WEIGHT[f.split(":")[0]] ?? 1;
    });
    m.set(b.slug, w);
  }
  SIM.set(a.slug, m);
}
const ASSIGN = new Map<string, Map<string, number>>();

/**
 * Deterministic choice between equivalent constructions. Per slot, suburbs are assigned greedily (fixed order) to the
 * construction least used by the suburbs they most resemble, so look-alike pages read differently.
 */
export function pick<T>(slug: string, slot: string, options: readonly T[]): T {
  const n = options.length;
  if (n <= 1) return options[0];
  const id = `${slot}|${n}`;
  let a = ASSIGN.get(id);
  if (!a) {
    a = new Map();
    const order = [...PROFILES].sort((x, y) => hash(`${slot}:${x.slug}`) - hash(`${slot}:${y.slug}`));
    for (const { slug: sl } of order) {
      const cost = new Array(n).fill(0);
      for (const [other, k] of a) cost[k] += (SIM.get(sl)?.get(other) ?? 0) ** 2;
      let best = hash(`${slot}#${sl}`) % n;
      for (let k = 0; k < n; k++) if (cost[k] < cost[best]) best = k;
      a.set(sl, best);
    }
    ASSIGN.set(id, a);
  }
  return options[a.get(slug) ?? hash(`${slot}#${slug}`) % n];
}

const ORD = ["", "", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
const ordinal = (n: number) => {
  if (n < ORD.length) return ORD[n];
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${s}`;
};

/** Natural-language share: 47 → "just under half", 15.8 → "about one in six", 69.5 → "about seven in ten". */
export function shareWords(p: number): string {
  if (p <= 0) return "none";
  if (p < 12) return `about one in ${Math.round(100 / p)}`;
  if (p >= 46 && p <= 54) return p < 49 ? "just under half" : p > 51 ? "just over half" : "about half";
  const fr: [number, string][] = [
    [12.5, "one in eight"], [16.7, "one in six"], [20, "one in five"], [25, "a quarter"], [33.3, "a third"],
    [40, "two in five"], [60, "three in five"], [66.7, "two-thirds"], [70, "seven in ten"], [75, "three-quarters"],
    [80, "four in five"], [90, "nine in ten"],
  ];
  let best = fr[0];
  for (const f of fr) if (Math.abs(f[0] - p) < Math.abs(best[0] - p)) best = f;
  const diff = p - best[0];
  return `${Math.abs(diff) < 1.2 ? "about" : diff < 0 ? "almost" : "just over"} ${best[1]}`;
}

/** Rank of a suburb among the published set for a field (1 = highest). */
export function rankOf(s: SuburbRecord, get: (x: SuburbRecord) => number | null | undefined) {
  const vals = PUBLISHED_SUBURBS.map((x) => ({ slug: x.slug, v: get(x) })).filter((x): x is { slug: string; v: number } => typeof x.v === "number");
  vals.sort((a, b) => b.v - a.v);
  const i = vals.findIndex((x) => x.slug === s.slug);
  return i < 0 ? null : { rank: i + 1, of: vals.length };
}

/** "the highest" / "the third-highest" / "the lowest" / "the second-lowest" / "the 14th-highest" */
export function rankPhrase(r: { rank: number; of: number }, high = "highest", low = "lowest") {
  if (r.rank === 1) return `the ${high}`;
  if (r.rank === r.of) return `the ${low}`;
  if (r.of - r.rank + 1 <= 3) return `the ${ordinal(r.of - r.rank + 1)}-${low}`;
  return `the ${ordinal(r.rank)}-${high}`;
}

export const countryName = (n: string) =>
  n.replace(" (excludes SARs and Taiwan)", "").replace(" (SAR of China)", "").replace("Korea, Republic of (South)", "South Korea");

export const priceWord = (k: MedianPrice["kind"]) => (k === "unit" ? "unit" : "house");
/** "median unit", or "council-area median house" when the postcode figure was suppressed. */
export const medianOf = (b: PriceBlock) => `${b.price.geography === "lga" ? "council-area " : ""}median ${priceWord(b.price.kind)}`;

/** "first", "fifth", "second-lowest", "last" */
function rankWord(r: { rank: number; of: number }) {
  if (r.rank === 1) return "first";
  if (r.rank === r.of) return "last";
  if (r.of - r.rank + 1 <= 3) return `${ordinal(r.of - r.rank + 1)}-lowest`;
  return ordinal(r.rank);
}

/* ------------------------------------------------------------------ section headings (varied, all descriptive) */

export function headings(v: SuburbView) {
  const n = v.s.name;
  const sl = v.s.slug;
  return {
    glance: pick(sl, "hGlance", [`${n} at a glance`, `${n} in numbers`, `Who lives in ${n}`]),
    cost: pick(sl, "hCost", [`What it costs to buy in ${n}`, `Buying costs at ${n}'s median prices`, `The cost of buying in ${n}`]),
    rent: pick(sl, "hRent", [`Renting vs buying in ${n}`, `Rent in ${n} compared with buying`, `${n} rents and what they mean for buying`]),
    help: pick(sl, "hHelp", [`Who we help in ${n}`, `${n} buyers we work with`, `Where we can help in ${n}`]),
    nearby: pick(sl, "hNear", ["Compare nearby suburbs", `${n} and its neighbours`, "Nearby suburbs side by side"]),
    faq: pick(sl, "hFaq", [`Questions about buying in ${n}`, `${n} buyers often ask`, `Common questions from ${n}`]),
  };
}

/* ------------------------------------------------------------------ intro (lede) */

export function introSentences(v: SuburbView, modes: string): string[] {
  const { s } = v;
  const c = s.census;
  const name = s.name;
  const sl = s.slug;
  const top = (c.topCountriesOfBirth ?? []).map((t) => ({ ...t, name: countryName(t.name) }));
  const nepalRank = top.findIndex((t) => t.code === "7105");
  const out: string[] = [];

  if (c.population && c.bornOverseasPct != null) {
    if (nepalRank === 0 && c.nepalBorn) {
      out.push(
        pick(sl, "introA0", [
          `${num(c.nepalBorn)} of ${name}'s ${num(c.population)} residents were born in Nepal, more than any other country outside Australia, and ${pct(c.bornOverseasPct)} of the suburb was born overseas (ABS Census 2021).`,
          `Nepal is the most common overseas birthplace in ${name}: ${num(c.nepalBorn)} of its ${num(c.population)} residents were born there, and ${pct(c.bornOverseasPct)} of all residents were born outside Australia (ABS Census 2021).`,
          `More ${name} residents were born in Nepal than in any other overseas country: ${num(c.nepalBorn)} people out of ${num(c.population)} at the 2021 Census, in a suburb where ${pct(c.bornOverseasPct)} were born overseas.`,
        ]),
      );
    } else if (nepalRank > 0 && c.nepalBorn) {
      out.push(
        pick(sl, "introA1", [
          `${name} had ${num(c.population)} residents at the 2021 Census and ${pct(c.bornOverseasPct)} were born overseas, most often in ${top[0].name} (${num(top[0].count)}), with Nepal ${ordinal(nepalRank + 1)} (${num(c.nepalBorn)}).`,
          `Of ${name}'s ${num(c.population)} residents in 2021, ${pct(c.bornOverseasPct)} were born overseas. ${top[0].name} led the overseas birthplaces with ${num(top[0].count)} people and Nepal came ${ordinal(nepalRank + 1)} with ${num(c.nepalBorn)}.`,
          `${num(c.nepalBorn)} Nepal-born people lived in ${name} at the 2021 Census, the ${ordinal(nepalRank + 1)}-largest overseas-born group after ${top[0].name} (${num(top[0].count)}), out of ${num(c.population)} residents.`,
        ]),
      );
    } else if (c.bornOverseasPct >= 30 && top.length >= 2) {
      out.push(
        `${num(c.population)} people lived in ${name} at the 2021 Census, ${shareWords(c.bornOverseasPct)} of them born overseas, most commonly in ${top[0].name} and ${top[1].name}${c.nepalBorn ? `; ${num(c.nepalBorn)} were born in Nepal` : ""}.`,
      );
    } else {
      out.push(
        `Most of ${name}'s ${num(c.population)} residents were born in Australia (${pct(c.bornOverseasPct)} were born overseas in 2021), and ${top[0]?.name ?? "India"} and ${top[1]?.name ?? "Nepal"} lead the overseas birthplaces${c.nepalBorn ? `, with ${num(c.nepalBorn)} Nepal-born residents` : ""}.`,
      );
    }
  }

  const mix = c.dwellingMix;
  const u = v.unit?.price;
  const h = v.house?.price;
  const per = period((u ?? h)?.period ?? "");
  if (mix && mix.flatApartmentPct >= 60 && u) {
    out.push(
      pick(sl, "introB0", [
        `Flats and apartments make up ${pct(mix.flatApartmentPct)} of occupied homes, and the median strata sale in ${u.where} was ${aud(u.value)} in ${per}.`,
        `It is mostly a unit market: ${pct(mix.flatApartmentPct)} of homes are flats or apartments, and the median unit in ${u.where} sold for ${aud(u.value)} in ${per}.`,
        `With ${pct(mix.flatApartmentPct)} of homes in apartment buildings, most first purchases here are units; the median in ${u.where} was ${aud(u.value)} in ${per}.`,
      ]),
    );
  } else if (mix && mix.separateHousePct >= 60 && h) {
    out.push(
      pick(sl, "introB1", [
        `Most homes are separate houses (${pct(mix.separateHousePct)}), and the median house in ${h.where} sold for ${aud(h.value)} in ${per}.`,
        `${pct(mix.separateHousePct)} of homes here are separate houses; the median house sale in ${h.where} was ${aud(h.value)} in ${per}.`,
        `This is house country: ${pct(mix.separateHousePct)} of occupied homes are detached, and houses in ${h.where} had a median sale price of ${aud(h.value)} in ${per}.`,
      ]),
    );
  } else if (u && h) {
    out.push(
      pick(sl, "introB2", [
        `The housing is mixed (${pct(mix?.flatApartmentPct ?? 0)} units, ${pct(mix?.separateHousePct ?? 0)} houses), and median sales in ${per} were ${aud(u.value)} for a unit and ${aud(h.value)} for a house.`,
        `Units (${pct(mix?.flatApartmentPct ?? 0)} of homes) and houses (${pct(mix?.separateHousePct ?? 0)}) sit side by side, at median prices of ${aud(u.value)} and ${aud(h.value)} in ${per}.`,
      ]),
    );
  } else if (u ?? h) {
    const p = (u ?? h)!;
    out.push(`The median ${priceWord(p.kind)} sale in ${p.where} was ${aud(p.value)} in ${per}.`);
  }

  out.push(
    pick(sl, "introC", [
      `We don't have an office in ${name}. Sulav Adhikari works with buyers here by ${modes}, from the first conversation to settlement.`,
      `Our office isn't local: we meet ${name} clients by ${modes}, at morning, midday or evening times, seven days a week.`,
      `There is no ${name} shopfront to visit. Sulav meets clients from ${name} by ${modes} and manages the loan through to settlement.`,
    ]),
  );
  return out;
}

/* ------------------------------------------------------------------ at a glance commentary */

export function glanceCommentary(v: SuburbView): string[] {
  const { s } = v;
  const c = s.census;
  const sl = s.slug;
  const out: string[] = [];

  if (s.lgas.length > 1) {
    const parts = s.lgas.filter((l) => l.areaSharePct >= 5).map((l) => `${l.name} (${pct(l.areaSharePct)} of its land)`);
    out.push(
      pick(sl, "lgaMulti", [
        `${s.name} straddles more than one council area: ${parts.join(" and ")}.`,
        `The suburb is split between councils, ${parts.join(" and ")}, which matters for council rates and planning rules.`,
      ]),
    );
  } else if (s.lga) {
    out.push(
      pick(sl, "lga", [
        `${s.name} sits entirely within ${s.lga.name} council area${s.areaSqKm ? ` and covers ${s.areaSqKm} km²` : ""}.`,
        `The suburb${s.areaSqKm ? ` covers ${s.areaSqKm} km² and` : ""} is wholly in the ${s.lga.name} council area.`,
        `All of ${s.name}${s.areaSqKm ? ` (${s.areaSqKm} km²)` : ""} is in ${s.lga.name} council area.`,
      ]),
    );
  }

  const rN = rankOf(s, (x) => x.census.nepalBorn);
  const rInc = rankOf(s, (x) => x.census.medianHouseholdIncomeWk);
  const rRent = rankOf(s, (x) => x.census.renterPct);
  const of = rN?.of ?? PUBLISHED_SUBURBS.length;
  if (rN && rInc && c.nepalBorn && c.medianHouseholdIncomeWk) {
    out.push(
      pick(sl, "ranks", [
        `Of the ${of} NSW suburbs in our guides, ${s.name} has ${rankPhrase(rN)} Nepal-born population (${num(c.nepalBorn)}) and ${rankPhrase(rInc)} median household income (${aud(c.medianHouseholdIncomeWk)} a week).`,
        `Across our ${of} NSW suburb guides it ranks ${rankWord(rN)} for Nepal-born residents and ${rankWord(rInc)} for household income, at ${aud(c.medianHouseholdIncomeWk * 52)} a year.`,
        `Compared with the other suburbs we cover, its Nepal-born count is ${rankPhrase(rN)} of ${of} and its share of renters is ${rRent ? rankPhrase(rRent) : "mid-range"}.`,
      ]),
    );
  }

  const rAge = rankOf(s, (x) => x.census.medianAge);
  if (rAge && c.medianAge) {
    const young = rAge.rank > rAge.of * 0.66;
    const old = rAge.rank <= rAge.of * 0.33;
    out.push(
      young
        ? `A median age of ${c.medianAge} makes it one of the younger suburbs we cover${c.avgHouseholdSize ? `, with ${c.avgHouseholdSize} people in the average household` : ""}.`
        : old
          ? `At ${c.medianAge}, the median age is among the oldest of our suburbs${c.avgHouseholdSize ? `, and households average ${c.avgHouseholdSize} people` : ""}.`
          : `The median resident is ${c.medianAge}${c.avgHouseholdSize ? ` and the average household has ${c.avgHouseholdSize} people` : ""}.`,
    );
  }

  if (s.dcj.postcodeSharedWith.length) {
    const others = s.dcj.postcodeSharedWith.map((x) => PUBLISHED_SUBURBS.find((p) => p.slug === x)?.name ?? x);
    out.push(`${s.name} shares postcode ${s.postcode} with ${others.join(" and ")}, so the DCJ sale and rent figures cover the whole postcode, not ${s.name} alone.`);
  }

  if (c.trainToWorkPct != null) {
    const home = c.workedAtHomePct != null ? pct(c.workedAtHomePct) : "many";
    if (c.trainToWorkPct >= 15)
      out.push(
        pick(sl, "train", [
          `On Census day ${pct(c.trainToWorkPct)} of employed residents took a train to work, even though ${home} worked from home in the August 2021 lockdown, so normal train use is higher.`,
          `${pct(c.trainToWorkPct)} of workers caught a train on Census day 2021, a lockdown day when ${home} stayed home, which makes this a rail commuter suburb.`,
        ]),
      );
    else if (c.trainToWorkPct >= 5) out.push(`Only ${pct(c.trainToWorkPct)} of workers used a train on Census day 2021, a lockdown day when ${home} worked from home.`);
    else out.push(`Hardly anyone commuted by train on Census day 2021 (${pct(c.trainToWorkPct)} of workers), and ${home} worked from home.`);
  }
  return out;
}

/* ------------------------------------------------------------------ cost to buy */

export function costIntro(v: SuburbView): string[] {
  const { s } = v;
  const sl = s.slug;
  const out: string[] = [];
  const inc = s.census.medianHouseholdIncomeWk;
  const u = v.unit;
  const h = v.house;
  const sales = (b: PriceBlock) => (b.price.sales ? ` from ${num(b.price.sales)} sales` : "");
  const per = period((u ?? h)?.price.period ?? "");

  if (u && h && u.price.geography === "postcode" && h.price.geography === "postcode") {
    out.push(
      pick(sl, "cost0", [
        `In ${per}, the median strata sale (mostly units and townhouses) in ${u.price.where} was ${aud(u.price.value)}${sales(u)}, and the median non-strata sale (mostly houses) was ${aud(h.price.value)}${sales(h)}.`,
        `NSW DCJ's latest sales figures (${per}) put the median unit price in ${u.price.where} at ${aud(u.price.value)}${sales(u)} and the median house at ${aud(h.price.value)}${sales(h)}.`,
        `A typical unit in ${u.price.where} changed hands for ${aud(u.price.value)} in ${per}${sales(u)}, while houses went for a median ${aud(h.price.value)}${sales(h)}.`,
      ]),
    );
  } else {
    if (u) out.push(`In ${per}, the median strata sale (mostly units and townhouses) in ${u.price.where} was ${aud(u.price.value)}${sales(u)}.`);
    if (h) out.push(`${u ? "For houses, the" : `In ${per}, the`} median non-strata sale in ${h.price.where} was ${aud(h.price.value)}${sales(h)}.`);
  }
  for (const b of [u, h]) {
    if (b && b.price.geography === "lga")
      out.push(`DCJ did not publish a ${priceWord(b.price.kind)} median for postcode ${s.postcode} this quarter (10 or fewer sales), so the ${priceWord(b.price.kind)} column uses the ${b.price.geographyName} council-area median.`);
    else if (b && b.price.smallSample)
      out.push(
        pick(sl, `small-${b.price.kind}`, [
          `The ${priceWord(b.price.kind)} median rests on only ${b.price.sales ? num(b.price.sales) : "a few"} sales, which DCJ flags as a small sample, so treat it as a rough guide.`,
          `Read the ${priceWord(b.price.kind)} figure with care: DCJ marks it as a small sample${b.price.sales ? ` (${num(b.price.sales)} sales)` : ""}.`,
        ]),
      );
  }
  if (!u) out.push(`There was no unit median for ${s.name} or its council area this quarter, so this page shows house figures only.`);
  if (!h) out.push(`There was no house median for ${s.name} or its council area this quarter, so this page shows unit figures only.`);
  if (u && h && h.price.value > u.price.value) {
    const ratio = Math.round((h.price.value / u.price.value) * 10) / 10;
    out.push(
      pick(sl, "gap", [
        `A house costs ${ratio} times as much as a unit here, a gap of ${aud(h.price.value - u.price.value)}.`,
        `The step up from the median unit to the median house is ${aud(h.price.value - u.price.value)}.`,
      ]),
    );
  }
  if (inc && (u?.incomeMultiple || h?.incomeMultiple)) {
    const yr = aud(inc * 52);
    const um = u?.incomeMultiple;
    const hm = h?.incomeMultiple;
    out.push(
      pick(sl, "multiple", [
        `Against the median household income recorded here in 2021 (${yr} a year), that is ${[um ? `${um} times for a unit` : null, hm ? `${hm} times for a house` : null].filter(Boolean).join(" and ")}.`,
        `${um ? `A median unit costs ${um} years` : `A median house costs ${hm} years`} of the suburb's 2021 median household income of ${yr}${um && hm ? `; a house, ${hm} years` : ""}.`,
        `Measured in local incomes (${yr} a year at the 2021 Census), the median ${um ? `unit is ${um}` : `house is ${hm}`} times that figure${um && hm ? ` and the median house ${hm} times` : ""}.`,
      ]),
    );
  }
  return out;
}

/** FHBAS outcome at the medians, from calcStampDuty results. */
export function dutySentences(v: SuburbView): string[] {
  const { s } = v;
  const sl = s.slug;
  const bands = v.fhbas?.bands ?? [];
  const exemptTo = bands.find((b) => b.kind === "exempt") as { upTo: number } | undefined;
  const taper = bands.find((b) => b.kind === "taper-saving-from-lower") as { from: number; below: number } | undefined;
  const lim = exemptTo ? aud(exemptTo.upTo) : "the exemption threshold";
  const top = taper ? aud(taper.below) : "the upper threshold";

  const one = (b: PriceBlock) => {
    const w = priceWord(b.price.kind);
    const m = medianOf(b);
    const std = b.duty.standard.transferDuty;
    const fh = b.duty.firstHome.transferDuty;
    if (fh === 0 && std > 0)
      return pick(sl, `dutyEx-${w}`, [
        `At ${aud(b.price.value)}, the ${m} is under the ${lim} limit of the First Home Buyers Assistance Scheme, so an eligible first home buyer pays no transfer duty instead of ${aud(std)}.`,
        `An eligible first home buyer pays no transfer duty on the ${m}, because ${aud(b.price.value)} is below the scheme's ${lim} full-exemption limit; anyone else pays ${aud(std)}.`,
        `The first home exemption covers the ${m} in full: ${aud(std)} of duty becomes nil for an eligible buyer.`,
      ]);
    if (fh < std)
      return pick(sl, `dutyTaper-${w}`, [
        `The median ${w} (${aud(b.price.value)}) falls in the concession taper between ${lim} and ${top}: a first home buyer pays ${aud(fh)} instead of ${aud(std)}, saving ${aud(std - fh)}.`,
        `Because ${aud(b.price.value)} sits between ${lim} and ${top}, the ${m} gets a partial concession, ${aud(std - fh)} off the ${aud(std)} duty bill.`,
      ]);
    return pick(sl, `dutyNone-${w}`, [
      `The median ${w} is over ${top}, so no first home concession applies and every buyer pays ${aud(std)} in duty.`,
      `At ${aud(b.price.value)} the ${m} is above the ${top} cut-off, so a first home buyer pays the full ${aud(std)}.`,
      `No first home concession reaches the ${m}; at that price the duty is ${aud(std)} for everyone.`,
    ]);
  };
  return [v.unit, v.house].filter((b): b is PriceBlock => !!b).map(one);
}

export function schemeSentences(v: SuburbView): string[] {
  const { s } = v;
  const sl = s.slug;
  const capAud = aud(v.schemeCap);
  const where = v.schemeArea === "capital" ? "Sydney" : "the rest of NSW";
  const u = v.unit;
  const h = v.house;
  const out: string[] = [];
  if (v.schemeArea === "regional")
    out.push(`${s.name} is outside Sydney and isn't one of the regional centres that share Sydney's cap, so the ${capAud} cap for other areas of NSW applies; confirm it for the postcode with the official tool.`);
  if (u && h) {
    const inU = u.scheme.withinCap;
    const inH = h.scheme.withinCap;
    if (inU && inH)
      out.push(
        pick(sl, "schemeBoth", [
          `Both medians are under the 5% Deposit Scheme cap for ${where} (${capAud}), so an eligible first home buyer could buy at either price with a 5% deposit and no lenders mortgage insurance (LMI).`,
          `Unit and house medians both fit under the ${capAud} 5% Deposit Scheme cap, leaving ${aud(v.schemeCap - h.price.value)} of headroom even at the house median.`,
        ]),
      );
    else if (inU && !inH)
      out.push(
        pick(sl, "schemeUnit", [
          `The ${medianOf(u)} is under the 5% Deposit Scheme cap for ${where} (${capAud}); the ${medianOf(h)} is ${aud(h.price.value - v.schemeCap)} over it, so a house at that price needs a bigger deposit or LMI.`,
          `With the scheme, a unit at the median needs only ${aud(u.deposit.rows[0].deposit)} down and no LMI. The ${medianOf(h)} is ${aud(h.price.value - v.schemeCap)} above the ${capAud} cap.`,
          `The ${capAud} scheme cap leaves ${aud(v.schemeCap - u.price.value)} of room above the ${medianOf(u)}, but the ${medianOf(h)} is out of range by ${aud(h.price.value - v.schemeCap)}.`,
        ]),
      );
    else if (!inU && inH) out.push(`The ${medianOf(h)} is under the ${capAud} cap for ${where}, but the ${medianOf(u)} is over it.`);
    else out.push(`Both medians are over the ${capAud} cap for ${where}, so the 5% Deposit Scheme only helps below the typical price here.`);
  } else {
    const b = (u ?? h)!;
    out.push(
      b.scheme.withinCap
        ? `The ${medianOf(b)} (${aud(b.price.value)}) is ${aud(v.schemeCap - b.price.value)} under the 5% Deposit Scheme cap for ${where} (${capAud}), so an eligible first home buyer could buy it with ${aud(b.deposit.rows[0].deposit)} down and no LMI.`
        : `The ${medianOf(b)} (${aud(b.price.value)}) is over the 5% Deposit Scheme cap for ${where} (${capAud}).`,
    );
  }
  return out;
}

/* ------------------------------------------------------------------ rent vs buy */

/** Rent vs buy as paragraphs: [current rents], [2021 comparison], [deposit and tenure]. */
export function rentSentences(v: SuburbView): string[][] {
  const { s, rent: r } = v;
  const c = s.census;
  const sl = s.slug;
  const now: string[] = [];
  const then: string[] = [];
  const out: string[] = [];
  if (r.latestWk && r.latestMonthly) {
    const total = r.rows.find((x) => x.label === "All dwellings");
    const yr = aud(r.latestWk * 52);
    now.push(
      pick(sl, "rent0", [
        `New leases in ${r.where} had a median rent of ${aud(r.latestWk)} a week in ${period(r.period)}, or ${yr} a year${total?.bonds ? `, across ${num(total.bonds)} new bonds` : ""}.`,
        `The median rent on a new lease in ${r.where} was ${aud(r.latestWk)} a week in ${period(r.period)}${total?.bonds ? `, based on ${num(total.bonds)} bonds lodged` : ""}, which adds up to ${yr} over a year.`,
        `A renter signing a new lease in ${r.where} in ${period(r.period)} paid a median ${aud(r.latestWk)} a week (${yr} a year)${total?.bonds ? `; DCJ counted ${num(total.bonds)} new bonds` : ""}.`,
      ]),
    );
    const two = r.rows.find((x) => x.label === "2-bedroom unit");
    const one = r.rows.find((x) => x.label === "1-bedroom unit");
    const three = r.rows.find((x) => x.label === "3-bedroom house") ?? r.rows.find((x) => x.label === "3-bedroom unit");
    if (two && three) now.push(`By size, a two-bedroom unit leased for ${aud(two.medianWk)} a week and a ${three.label.replace("3-bedroom", "three-bedroom")} for ${aud(three.medianWk)}.`);
    else if (one && two) now.push(`One-bedroom units leased for ${aud(one.medianWk)} a week and two-bedroom units for ${aud(two.medianWk)}.`);
    else if (two) now.push(`Two-bedroom units leased at a median ${aud(two.medianWk)} a week.`);
  }
  if (r.census2021Wk && r.census2021Monthly && r.censusRepayMonthly && r.repayVsRent2021Pct != null) {
    const d = r.repayVsRent2021Pct;
    const rel = d > 2 ? `${Math.abs(d)}% more than the median rent` : d < -2 ? `${Math.abs(d)}% less than the median rent` : "about the same as the median rent";
    then.push(
      pick(sl, "rent2021", [
        `At the 2021 Census the median renter here paid ${aud(r.census2021Wk)} a week, and the median household with a mortgage repaid ${aud(r.censusRepayMonthly)} a month, ${rel}.`,
        `Back in 2021, ${s.name} households with a mortgage repaid a median ${aud(r.censusRepayMonthly)} a month, ${rel} (${aud(r.census2021Wk)} a week).`,
        `The 2021 Census recorded a median rent of ${aud(r.census2021Wk)} a week and a median mortgage repayment of ${aud(r.censusRepayMonthly)} a month, ${rel}.`,
      ]),
    );
  }
  if (r.changeSince2021Pct != null && r.changeSince2021Pct > 0)
    then.push(
      pick(sl, "rentRise", [
        `Today's new-lease median is ${r.changeSince2021Pct}% above that 2021 rent. DCJ counts only new bonds and the Census counts every renting household, so read the gap as a direction, not an exact rise.`,
        `New leases now cost ${r.changeSince2021Pct}% more than the 2021 median, although the two sources measure different things (new bonds against all renters).`,
      ]),
    );
  if (r.rentToIncome2021Pct != null)
    then.push(
      pick(sl, "rentInc", [
        `In 2021, the median rent took ${r.rentToIncome2021Pct}% of the median household income.`,
        `That 2021 rent was ${r.rentToIncome2021Pct}% of a median household's income.`,
      ]),
    );

  const b = v.unit ?? v.house;
  if (b?.rentWeeksFor5pc && r.latestWk) {
    const w = b.rentWeeksFor5pc;
    const span = w < 52 ? "less than a year of rent" : w <= 104 ? "between one and two years of rent" : "more than two years of rent";
    out.push(
      pick(sl, "rentDep", [
        `A 5% deposit on the median ${priceWord(b.price.kind)} (${aud(b.price.value * 0.05)}) equals about ${w} weeks of the current median rent, ${span}.`,
        `Put another way, ${w} weeks of today's median rent would cover a 5% deposit (${aud(b.price.value * 0.05)}) on the median ${priceWord(b.price.kind)}.`,
      ]),
    );
  }
  if (c.renterPct != null) {
    const rp = c.renterPct;
    const mort = c.ownerWithMortgagePct != null ? pct(c.ownerWithMortgagePct) : null;
    const own = c.ownedOutrightPct != null ? pct(c.ownedOutrightPct) : null;
    out.push(
      rp >= 60
        ? pick(sl, "tenure60", [
            `With ${pct(rp)} of households renting, ${s.name} is mainly a renters' suburb, so for many people here the question is when to make the first purchase, not where.`,
            `${cap(shareWords(rp))} households rent (${pct(rp)}), and only ${own ?? "a small share"} own outright.`,
          ])
        : rp >= 50
          ? `Renters are a narrow majority (${pct(rp)} of households)${mort ? `, while ${mort} of homes are owned with a mortgage` : ""}.`
          : rp >= 40
            ? `Renters are a large minority here (${pct(rp)} of households)${mort && own ? `; ${mort} of homes have a mortgage and ${own} are owned outright` : ""}.`
            : `Most households here own their home: ${pct(rp)} rent${mort && own ? `, ${mort} have a mortgage and ${own} own outright` : ""}.`,
    );
  }
  return [now, then, out].filter((g) => g.length);
}

/* ------------------------------------------------------------------ nearby */

export function nearbySentence(v: SuburbView): string | null {
  const rows = v.nearby;
  if (!rows.length) return null;
  const me = v.unit?.price.value;
  const near = rows[0];
  const sl = v.s.slug;
  const parts: string[] = [
    pick(sl, "near0", [
      `${near.name} is the closest suburb in our guides, ${near.distanceKm} km from ${v.s.name}.`,
      `The nearest suburb we cover is ${near.name}, ${near.distanceKm} km away.`,
    ]),
  ];
  if (me) {
    const priced = rows.filter((r) => r.unit);
    const cheaper = priced.filter((r) => r.unit!.value < me).length;
    if (priced.length) {
      if (cheaper === 0) parts.push(`Every neighbour listed has a higher median unit price than ${v.s.name}'s ${aud(me)}.`);
      else if (cheaper === priced.length) parts.push(`All ${inWords(priced.length)} neighbours listed have a lower median unit price than ${v.s.name} (${aud(me)}).`);
      else parts.push(`${cap(inWords(cheaper))} of the ${inWords(priced.length)} neighbours listed ${cheaper === 1 ? "has" : "have"} a lower median unit price than ${v.s.name}'s ${aud(me)}.`);
    }
  }
  const topNepal = [...rows].filter((r) => r.nepalBorn != null).sort((a, b) => (b.nepalBorn ?? 0) - (a.nepalBorn ?? 0))[0];
  if (topNepal?.nepalBorn && v.s.census.nepalBorn != null)
    parts.push(
      topNepal.nepalBorn > v.s.census.nepalBorn
        ? `${topNepal.name} has a larger Nepal-born community (${num(topNepal.nepalBorn)} people).`
        : `None of them has more Nepal-born residents than ${v.s.name}; ${topNepal.name} comes closest with ${num(topNepal.nepalBorn)}.`,
    );
  return parts.join(" ");
}

export const nearbyAnchor = (slug: string, i: number, name: string) =>
  pick(slug, `anchor${i}`, [`home prices in ${name}`, `buying in ${name}`, `our ${name} guide`, `${name} rents and prices`, `the ${name} suburb guide`]);
