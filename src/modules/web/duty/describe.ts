// Plain-English descriptions of the verified duty rules (src/modules/calc/rules). Every number here is read from
// the rules data or computed by the engine; nothing is typed into page copy.

import { FEDERAL, RULES } from "@/modules/calc/rules";
import { dutyFromScale, feeFromRule } from "@/modules/calc/stampDuty";
import type { AuState, Bracket, DutyConcession, DutyScale, FeeRule, FhbBand, PropertyType, StampDutyResult } from "@/modules/calc/types";
import { duty, fhogFor, stateShort } from "../content/shared/rules";
import { fromSourced, toSourceItems, type SourceInput } from "../content/shared/sources";
import type { SourceItem } from "../components/content/Sources";
import { formatDate } from "../format";

const AUD0 = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
const AUD2 = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** $1,234 or $1,234.56 (cents only when present). */
export const money = (n: number) => (Math.abs(n - Math.round(n)) > 0.004 ? AUD2.format(n) : AUD0.format(Math.round(n)));
const pctText = (p: number) => `${Number(p.toFixed(4)).toLocaleString("en-AU", { maximumFractionDigits: 4 })}%`;
const whole = (n: number) => AUD0.format(Math.floor(n + 1e-6));

export const TYPE_LABEL: Record<PropertyType, string> = {
  established: "established homes",
  new: "new homes",
  "off-the-plan": "off-the-plan purchases",
  "vacant-land": "vacant land",
};
export const typeList = (t: PropertyType[]) => {
  const l = t.map((x) => TYPE_LABEL[x]);
  return l.length > 1 ? `${l.slice(0, -1).join(", ")} and ${l[l.length - 1]}` : (l[0] ?? "");
};

/* ------------------------------------------------------------------ */
/* Rate tables                                                         */
/* ------------------------------------------------------------------ */

export type RateRow = { range: string; duty: string };

function bracketDuty(b: Bracket): string {
  switch (b.kind) {
    case "marginal":
      if (b.ratePct === 0) return b.base ? money(b.base) : "Nil";
      if (b.base === 0 && b.over === 0) return `${pctText(b.ratePct)} of the value`;
      return `${money(b.base)} plus ${pctText(b.ratePct)} of the value over ${whole(b.over)}`;
    case "whole":
      return `${pctText(b.ratePct)} of the whole value`;
    case "quadratic":
      return `(${b.a} × V²) + ${b.b}V, where V is the value in thousands of dollars`;
  }
}

/** Rows for a duty scale: "Up to $18,000" → "1.25% of the value", … */
export function rateRows(scale: DutyScale): RateRow[] {
  let prev = 0;
  return scale.brackets.map((b, i) => {
    const range = b.upTo === null ? `Over ${whole(prev)}` : i === 0 ? `Up to ${whole(b.upTo)}` : `${whole(prev + 1)} to ${whole(b.upTo)}`;
    if (b.upTo !== null) prev = Math.floor(b.upTo + 1e-6);
    return { range, duty: bracketDuty(b) };
  });
}

export function scaleNotes(scale: DutyScale): string[] {
  const out: string[] = [];
  if (scale.roundValueUpTo) out.push(`The value is rounded up to the next ${whole(scale.roundValueUpTo)} before the rates apply.`);
  if (scale.minimumDuty) out.push(`Minimum duty ${money(scale.minimumDuty)}.`);
  if (scale.nilIfBelow) out.push(`No duty is payable if it would be less than ${money(scale.nilIfBelow)}.`);
  return out;
}

/* ------------------------------------------------------------------ */
/* Concessions and fees                                                */
/* ------------------------------------------------------------------ */

function bandText(b: FhbBand): string {
  switch (b.kind) {
    case "exempt":
      return Number.isFinite(b.upTo) ? `No duty up to ${whole(b.upTo)}` : "No duty, at any price";
    case "taper-saving-from-lower":
    case "taper-duty":
      return `Reduced duty above ${whole(b.from)} and below ${whole(b.below)}; full duty from ${whole(b.below)}`;
    case "marginal":
      return `Above ${whole(b.from)} up to ${whole(b.upTo)}: ${b.base ? `${money(b.base)} plus ` : ""}${pctText(b.ratePct)} of the value over ${whole(b.from)}; general rates above ${whole(b.upTo)}`;
    case "concession-table": {
      const first = b.rows[0];
      const last = b.rows[b.rows.length - 1];
      return `Up to ${money(first.concession)} off duty, stepping down to ${money(last.concession)} below ${whole(Math.ceil(last.upTo))}; no concession from ${whole(Math.ceil(last.upTo))}`;
    }
    case "max-saving":
      return `Up to ${money(b.maxSaving)} off duty for values up to ${whole(b.upTo)}`;
  }
}

export function concessionSummary(c: DutyConcession): string {
  return c.bands.map(bandText).join(". ") + ".";
}

export function feeText(rule: FeeRule): string {
  switch (rule.kind) {
    case "flat":
      return money(rule.amount);
    case "stepped":
      return `${money(rule.base)}, plus ${money(rule.perStep)} for every ${whole(rule.step)} (or part) over ${whole(rule.over)}${rule.max ? `, up to ${money(rule.max)}` : ""}`;
    case "table": {
      const rows = rule.rows.map((r) => `${money(r.fee)} up to ${whole(r.upTo)}`).join("; ");
      const a = rule.above;
      return `${rows}${a ? `; then ${money(a.base)} plus ${money(a.perStep)} for every ${whole(a.step)} (or part) over ${whole(a.over)}` : ""}`;
    }
    case "per-thousand":
      return `${money(rule.base)} plus ${money(rule.perThousand)} for every ${rule.roundThousands === "down" ? "whole " : ""}$1,000 of value${rule.max ? `, up to ${money(rule.max)}` : ""}`;
  }
}
export const feeAt = (rule: FeeRule, value: number) => feeFromRule(rule, value);

/* ------------------------------------------------------------------ */
/* Computed figures                                                    */
/* ------------------------------------------------------------------ */

export const PRICE_POINTS = [500_000, 650_000, 750_000, 900_000, 1_100_000, 1_500_000];

const base = { foreignPurchaser: false, citizenOrPR: true } as const;

export type PriceRow = { price: number; investor: number; home: number; fhbEstablished: number; fhbNew: number };

/** Transfer duty (excluding fees) at each price point for the common buyer types. */
export function priceTable(state: AuState): { rows: PriceRow[]; hasOwnerOccupierScale: boolean } {
  const rows = PRICE_POINTS.map((price) => ({
    price,
    investor: duty({ ...base, state, price, propertyType: "established", firstHomeBuyer: false, ownerOccupier: false }).transferDuty,
    home: duty({ ...base, state, price, propertyType: "established", firstHomeBuyer: false, ownerOccupier: true }).transferDuty,
    fhbEstablished: duty({ ...base, state, price, propertyType: "established", firstHomeBuyer: true, ownerOccupier: true }).transferDuty,
    fhbNew: duty({ ...base, state, price, propertyType: "new", firstHomeBuyer: true, ownerOccupier: true }).transferDuty,
  }));
  return { rows, hasOwnerOccupierScale: !!RULES[state].ownerOccupierScale };
}

/** General-scale duty at a value (no concessions), for quick mentions. */
export const generalDutyAt = (state: AuState, value: number) => dutyFromScale(RULES[state].generalScale, value);

export type Example = { id: string; title: string; who: string; result: StampDutyResult; summary: string; assumptions: string[] };

/** Example prices per state (inputs only, not market claims). */
const EXAMPLE_PRICES: Record<AuState, { fhb: number; fhbType: PropertyType; upgrade: number; visa: number }> = {
  NSW: { fhb: 900_000, fhbType: "established", upgrade: 1_200_000, visa: 850_000 },
  VIC: { fhb: 700_000, fhbType: "established", upgrade: 950_000, visa: 650_000 },
  QLD: { fhb: 750_000, fhbType: "established", upgrade: 900_000, visa: 700_000 },
  WA: { fhb: 700_000, fhbType: "established", upgrade: 850_000, visa: 650_000 },
  SA: { fhb: 650_000, fhbType: "new", upgrade: 750_000, visa: 650_000 },
  ACT: { fhb: 750_000, fhbType: "established", upgrade: 950_000, visa: 700_000 },
  TAS: { fhb: 600_000, fhbType: "established", upgrade: 750_000, visa: 550_000 },
  NT: { fhb: 550_000, fhbType: "established", upgrade: 700_000, visa: 500_000 },
};

function summarise(r: StampDutyResult, state: AuState): string {
  const parts: string[] = [];
  if (r.concession > 0 && r.transferDuty === 0) parts.push(`The ${r.concessionName} removes the ${money(r.baseDuty)} of transfer duty.`);
  else if (r.concession > 0) parts.push(`The ${r.concessionName} cuts transfer duty from ${money(r.baseDuty)} to ${money(r.transferDuty)}.`);
  else parts.push(`Transfer duty is ${money(r.transferDuty)} at the ${r.scaleUsed === RULES[state].generalScale.label ? "general rates" : r.scaleUsed.charAt(0).toLowerCase() + r.scaleUsed.slice(1)}${r.concession === 0 && r.baseDuty > 0 ? ", with no concession at this price" : ""}.`);
  if (r.surcharge > 0) parts.push(`The ${lowerFirst(RULES[state].foreignSurcharge.name)} adds ${money(r.surcharge)}.`);
  if (r.fhogEligible) parts.push(`A ${money(r.fhogAmount)} ${fhogFor(state)?.name ?? "First Home Owner Grant"} may also be available, paid separately.`);
  return parts.join(" ");
}

export function workedExamples(state: AuState): Example[] {
  const P = EXAMPLE_PRICES[state];
  const R = RULES[state];
  const checked = `Rules checked against ${R.revenueOffice} on ${formatDate(stateCheckedAt(state))}`;
  const banTo = formatDate(FEDERAL.FIRB.establishedDwellingBan.to);
  const fhb = duty({ ...base, state, price: P.fhb, propertyType: P.fhbType, firstHomeBuyer: true, ownerOccupier: true });
  const up = duty({ ...base, state, price: P.upgrade, propertyType: "established", firstHomeBuyer: false, ownerOccupier: true });
  const visa = duty({ state, price: P.visa, propertyType: "new", firstHomeBuyer: true, ownerOccupier: true, foreignPurchaser: true, citizenOrPR: false });
  const fhbWhat = P.fhbType === "new" ? "new home" : "established home";
  return [
    {
      id: "example-first-home",
      title: `A first home buyer buys a ${money(P.fhb)} ${fhbWhat}`,
      who: `Citizens or permanent residents buying their first ${P.fhbType === "new" ? "home, newly built," : "home"} to live in.`,
      result: fhb,
      summary: summarise(fhb, state),
      assumptions: [fhb.concessionName ? `Meets every condition of the ${fhb.concessionName}` : `No first home concession applies to this purchase in ${stateShort(state)}`, checked],
    },
    {
      id: "example-next-home",
      title: `Buying a ${money(P.upgrade)} established home to live in`,
      who: `Owner-occupiers who have owned property before, buying in ${stateShort(state)} with a home loan.`,
      result: up,
      summary: summarise(up, state),
      assumptions: [up.scaleUsed === R.generalScale.label ? `${R.generalScale.label}` : `${up.scaleUsed}`, checked],
    },
    {
      id: "example-temporary-visa",
      title: `A temporary visa holder buys a ${money(P.visa)} new home`,
      who: `Every buyer holds a temporary visa and has never owned property. They buy new because foreign persons generally can't buy established homes until ${banTo}.`,
      result: visa,
      summary: summarise(visa, state),
      assumptions: [visa.surcharge > 0 ? `${R.foreignSurcharge.name} at ${R.foreignSurcharge.ratePct}% on the full price` : `No foreign purchaser surcharge in ${stateShort(state)}`, "FIRB application fee not included", checked],
    },
  ];
}

/** Every source behind a state's rules, with the date each was checked (deduped). */
/** "General transfer duty rates: official calculator" etc. — the fact group's name plus what kind of link it is. */
export function sourceTitle(label: string, url: string) {
  if (/calculators?\/|\/calculator\b|-calculator|estimator|calculatorservice|landsalesimple|fhba\.php|surchargeduty/i.test(url)) return `${label}: official calculator`;
  if (/legislation\.|\/act-|Act\/|\/di\/|statutes|law_/i.test(url)) return `${label}: legislation`;
  if (/\.pdf($|\?)/i.test(url)) return `${label} (PDF)`;
  return label;
}
const titled = (g: { sourceUrls: readonly string[]; verifiedAt: string }, label: string) => fromSourced(g, (u) => sourceTitle(label, u));

export function stateSources(state: AuState, extra: SourceInput[] = []): SourceItem[] {
  const R = RULES[state];
  const groups: SourceInput[] = [
    ...titled(R.generalScale, R.generalScale.label),
    ...(R.ownerOccupierScale ? titled(R.ownerOccupierScale.scale, R.ownerOccupierScale.scale.label) : []),
    ...R.concessions.flatMap((c) => titled(c, c.name)),
    ...(R.totalDutyConcessions ?? []).flatMap((c) => titled(c, c.name)),
    ...R.grants.flatMap((g) => titled(g, g.name)),
    ...titled(R.foreignSurcharge, R.foreignSurcharge.name),
    ...R.otherConcessions.flatMap((c) => titled(c, c.name)),
    ...titled(R.govtFees, `${R.govtFees.authority} fees`),
    ...extra,
  ];
  return toSourceItems(groups);
}

/** Earliest verifiedAt across a state's fact groups (what "checked on" means for the whole page). */
export function stateCheckedAt(state: AuState): string {
  const R = RULES[state];
  const d = [
    R.generalScale.verifiedAt,
    R.ownerOccupierScale?.scale.verifiedAt,
    ...R.concessions.map((c) => c.verifiedAt),
    ...R.grants.map((g) => g.verifiedAt),
    R.foreignSurcharge.verifiedAt,
    R.govtFees.verifiedAt,
  ].filter((x): x is string => !!x);
  return d.sort()[0] ?? R.generalScale.verifiedAt;
}

export { stateShort };

/* ------------------------------------------------------------------ */
/* State-specific key points and FAQs (all computed from the rules)    */
/* ------------------------------------------------------------------ */

const theName = (s: AuState) => (s === "ACT" || s === "NT" ? `the ${RULES[s].name}` : RULES[s].name);
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
/** "Foreign investor duty surcharge (FIDS)" → "foreign investor duty surcharge (FIDS)" */
export const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
const pctOf = (part: number, whole: number) => `${((part / whole) * 100).toLocaleString("en-AU", { maximumFractionDigits: 1 })}%`;

/** Top band of a scale in words: "7% of the value over $3,870,000". */
function topBand(scale: DutyScale) {
  const b = scale.brackets[scale.brackets.length - 1];
  const prev = scale.brackets.length > 1 ? scale.brackets[scale.brackets.length - 2].upTo : 0;
  if (b.kind === "whole") return `${pctText(b.ratePct)} of the whole value from ${whole(Math.floor(prev ?? 0) + 1)}`;
  if (b.kind === "marginal") return `${pctText(b.ratePct)} on every dollar above ${whole(b.over)}`;
  return "a formula";
}

export type KeyPoint = { title: string; body: string };

export function keyPoints(state: AuState, price: number): KeyPoint[] {
  const R = RULES[state];
  const base0 = { state, price, propertyType: "established" as const, foreignPurchaser: false, citizenOrPR: true };
  const home = duty({ ...base0, firstHomeBuyer: false, ownerOccupier: true });
  const inv = duty({ ...base0, firstHomeBuyer: false, ownerOccupier: false });
  const fhb = duty({ ...base0, firstHomeBuyer: true, ownerOccupier: true });
  const fhbNew = duty({ ...base0, propertyType: "new", firstHomeBuyer: true, ownerOccupier: true });
  const FS = R.foreignSurcharge;
  const g = fhogFor(state);
  const pts: KeyPoint[] = [];

  pts.push({
    title: `${money(home.transferDuty)} on a ${money(price)} home`,
    body: `That is ${pctOf(home.transferDuty, price)} of the price for a home buyer who is not buying their first home${inv.transferDuty !== home.transferDuty ? `, or ${money(inv.transferDuty)} for an investor` : ""}. The top rate is ${topBand(R.generalScale)}.`,
  });

  const fhbList = R.concessions.filter((c) => c.requiresFirstHomeBuyer);
  pts.push(
    fhbList.length
      ? {
          title: fhb.transferDuty === 0 ? `First home buyers: $0 at ${money(price)}` : `First home buyers: ${money(fhb.transferDuty)} at ${money(price)}`,
          body: `${fhbList.map((c) => `${c.name}: ${concessionSummary(c)}`).join(" ")}${fhbNew.transferDuty !== fhb.transferDuty ? ` A new home at the same price costs ${money(fhbNew.transferDuty)}.` : ""}`,
        }
      : {
          title: "No first home buyer duty concession",
          body: `First home buyers in ${theName(state)} pay the same ${money(home.transferDuty)} at ${money(price)}.${R.otherConcessions.find((c) => c.appliesTo?.includes("established") && /ended/i.test(c.name)) ? ` ${R.otherConcessions.find((c) => c.appliesTo?.includes("established") && /ended/i.test(c.name))!.summary.split(". ")[0]}.` : ""}`,
        },
  );

  if (R.ownerOccupierScale) {
    const o = R.ownerOccupierScale;
    pts.push({
      title: o.maxValue ? `Lower rates for homes up to ${money(o.maxValue)}` : "Lower rates if you live in it",
      body: `${o.scale.label}. ${o.conditions[0]}`,
    });
  }

  pts.push(
    FS.ratePct > 0
      ? {
          title: `${FS.ratePct}% ${lowerFirst(FS.name)}`,
          body: `${money(duty({ ...base0, firstHomeBuyer: false, ownerOccupier: true, foreignPurchaser: true, citizenOrPR: false }).surcharge)} extra at ${money(price)}. ${
            FS.foreignMeansNotCitizenOrPR ? "Permanent residents are not foreign persons for this surcharge." : "Permanent residents can count as foreign persons if they don't meet the residence test."
          }`,
        }
      : { title: "No foreign buyer surcharge", body: `${cap(theName(state))} doesn't add a surcharge to duty for foreign buyers. ${FS.exemptions[0] ?? ""}`.trim() },
  );

  if (g) {
    pts.push({
      title: `${money(g.amount)} ${g.name}`,
      body: `For ${typeList(g.appliesTo.filter((t) => t !== "vacant-land"))}${g.priceCap ? ` up to ${money(g.priceCap)}` : ", with no price cap"}${g.effectiveTo ? `, for contracts before ${formatDate(g.effectiveTo)}` : ""}. Not for established homes.`,
    });
  }

  const F = R.govtFees;
  pts.push({
    title: `${money(feeFromRule(F.transfer, price) + feeFromRule(F.mortgageRegistration, price))} in registration fees`,
    body: `${F.authority}: transfer ${feeText(F.transfer)}; mortgage ${feeText(F.mortgageRegistration)}.`,
  });
  return pts;
}

export type DataFaq = { question: string; answer: string };

/** Extra FAQs that only exist for some states (owner-occupier rates, other concessions, PR surcharge rules, off-the-plan). */
export function stateFaqs(state: AuState, price: number): DataFaq[] {
  const R = RULES[state];
  const S = stateShort(state);
  const out: DataFaq[] = [];
  const o = R.ownerOccupierScale;
  if (o) {
    const home = duty({ state, price: Math.min(price, o.maxValue ?? price), propertyType: "established", firstHomeBuyer: false, ownerOccupier: true, foreignPurchaser: false, citizenOrPR: true });
    const inv = duty({ state, price: Math.min(price, o.maxValue ?? price), propertyType: "established", firstHomeBuyer: false, ownerOccupier: false, foreignPurchaser: false, citizenOrPR: true });
    out.push({
      question: `Is stamp duty lower in ${S} if I live in the property?`,
      answer: `Yes${o.maxValue ? `, for values up to ${money(o.maxValue)}` : ""}. The ${o.scale.label.charAt(0).toLowerCase() + o.scale.label.slice(1)} apply instead of the general rates: at ${money(Math.min(price, o.maxValue ?? price))} that is ${money(home.transferDuty)} rather than ${money(inv.transferDuty)}. ${o.conditions.join(" ")}`,
    });
  }
  const FS = R.foreignSurcharge;
  if (FS.ratePct > 0) {
    out.push({
      question: `Do permanent residents pay the foreign surcharge in ${S}?`,
      answer: FS.foreignMeansNotCitizenOrPR
        ? `No. In ${S} a foreign person is someone who is not an Australian citizen or permanent resident, so permanent residents pay normal duty. ${FS.exemptions[0] ?? ""}`.trim()
        : `Usually not, but in ${S} a permanent resident can be a foreign person. ${FS.whoPays.find((w) => /permanent resident/i.test(w)) ?? ""} ${FS.exemptions.find((e) => /permanent resident/i.test(e)) ?? ""}`.trim(),
    });
  }
  const otp = [...(R.totalDutyConcessions ?? []).map((c) => ({ name: c.name, text: c.eligibility.join(" ") })), ...R.otherConcessions.filter((c) => c.appliesTo?.includes("off-the-plan")).map((c) => ({ name: c.name, text: c.summary }))];
  if (otp.length) {
    out.push({ question: `Is there a stamp duty concession for off-the-plan purchases in ${S}?`, answer: otp.map((c) => `${c.name}: ${c.text}`).join(" ") });
  }
  const info = R.otherConcessions.filter((c) => !c.appliesTo?.includes("off-the-plan") && !c.id.includes("fhog"));
  for (const c of info.slice(0, 2)) {
    const ended = /—\s*ended$/i.test(c.name);
    const name = lowerFirst(c.name.replace(/\s*—\s*ended$/i, ""));
    out.push({ question: ended ? `Is the ${name} still available in ${S}?` : `What is the ${name} in ${S}?`, answer: c.summary });
  }
  return out;
}
