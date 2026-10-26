// Stamp (transfer) duty + government costs engine for all 8 states and territories.
// Pure function over the sourced rules data in ./rules. Replaces src/modules/tools/stamp-duty/brackets.ts
// (a quirky port of the old WordPress code — see README.md for the differences).

import { ceilTo, round2 } from "./money";
import { RULES } from "./rules";
import type {
  BreakdownLine,
  DutyScale,
  FeeRule,
  DutyConcession,
  Grant,
  Provenance,
  RoundMode,
  StampDutyInput,
  StampDutyResult,
  StateRules,
} from "./types";

export function applyRound(n: number, mode: RoundMode = "cents"): number {
  switch (mode) {
    case "dollar-nearest":
      return Math.round(n + 1e-9);
    case "dollar-half-down":
      return Math.ceil(n - 0.5 - 1e-9);
    case "down-5c":
      return Math.floor(n * 20 + 1e-7) / 20;
    case "dollar-down":
      return Math.floor(n + 1e-9);
    case "dollar-up":
      return Math.ceil(n - 1e-9);
    default:
      return round2(n);
  }
}

/** Duty on `value` under a scale (no concessions). */
export function dutyFromScale(scale: DutyScale, value: number): number {
  if (!(value > 0)) return 0;
  const v = scale.roundValueUpTo ? ceilTo(value, scale.roundValueUpTo) : value;
  const b = scale.brackets.find((x) => x.upTo === null || v <= x.upTo) ?? scale.brackets[scale.brackets.length - 1];
  let d: number;
  switch (b.kind) {
    case "marginal":
      d = b.base + (b.ratePct / 100) * (v - b.over);
      break;
    case "whole":
      d = (b.ratePct / 100) * v;
      break;
    case "quadratic": {
      const x = v / b.unit;
      d = b.a * x * x + b.b * x;
      break;
    }
  }
  d = applyRound(d, scale.roundDuty);
  if (scale.nilIfBelow && d < scale.nilIfBelow) return 0;
  if (scale.minimumDuty && d < scale.minimumDuty) d = scale.minimumDuty;
  return d;
}

/** Government fee for a fee rule at `value`. */
export function feeFromRule(rule: FeeRule, value: number): number {
  const stepped = (r: { base: number; over: number; step: number; perStep: number; max?: number }) => {
    const f = value <= r.over ? r.base : r.base + r.perStep * Math.ceil((value - r.over) / r.step - 1e-9);
    return r.max !== undefined ? Math.min(f, r.max) : f;
  };
  switch (rule.kind) {
    case "flat":
      return rule.amount;
    case "stepped":
      return round2(stepped(rule));
    case "table": {
      const row = rule.rows.find((r) => value <= r.upTo);
      if (row) return row.fee;
      return rule.above ? round2(stepped(rule.above)) : rule.rows[rule.rows.length - 1].fee;
    }
    case "per-thousand": {
      const k = value / 1000;
      const units = rule.roundThousands === "up" ? Math.ceil(k - 1e-9) : rule.roundThousands === "down" ? Math.floor(k + 1e-9) : k;
      const f = applyRound(rule.base + rule.perThousand * units, rule.roundResult ?? "cents");
      return round2(rule.max !== undefined ? Math.min(f, rule.max) : f);
    }
  }
}

/**
 * Duty under a first-home concession, or null when the value is outside every band (no concession).
 * `D` computes the base duty on the concession's base scale.
 */
export function concessionDuty(c: DutyConcession, value: number, D: (v: number) => number, minimumDuty?: number): number | null {
  const withMin = (d: number) => (d > 0 && minimumDuty && d < minimumDuty ? minimumDuty : d);
  for (const band of c.bands) {
    switch (band.kind) {
      case "exempt":
        if (value <= band.upTo) return 0;
        break;
      case "taper-saving-from-lower":
        if (value > band.from && value < band.below) {
          const saving = round2((D(band.from) * (band.below - value)) / (band.below - band.from));
          return withMin(round2(Math.max(0, D(value) - saving)));
        }
        break;
      case "taper-duty":
        if (value > band.from && value < band.below) {
          return withMin(applyRound((D(value) * (value - band.from)) / (band.below - band.from), band.roundResult ?? "cents"));
        }
        break;
      case "marginal":
        if (value > band.from && value <= band.upTo) {
          const v = band.roundValueUpTo ? ceilTo(value, band.roundValueUpTo) : value;
          return withMin(applyRound(band.base + (band.ratePct / 100) * (v - band.from), band.roundResult ?? "cents"));
        }
        break;
      case "concession-table":
        if (value > band.from) {
          const row = band.rows.find((r) => value <= r.upTo);
          if (row) return withMin(round2(Math.max(0, D(value) - row.concession)));
        }
        break;
      case "max-saving":
        if (value <= band.upTo) return withMin(round2(Math.max(0, D(value) - band.maxSaving)));
        break;
    }
  }
  return null;
}

const today = () => new Date().toISOString().slice(0, 10);
const inWindow = (date: string, from?: string, to?: string) => (!from || date >= from) && (!to || date < to);

function grantEligibility(g: Grant, i: Required<Pick<StampDutyInput, "price" | "propertyType">> & StampDutyInput, date: string) {
  const reasons: string[] = [];
  if (g.requiresFirstHomeBuyer && !i.firstHomeBuyer) reasons.push("not a first home buyer");
  if (g.nonFirstHomeBuyersOnly && i.firstHomeBuyer) reasons.push("only for buyers who are not first home buyers");
  if (g.requiresCitizenOrPR && i.citizenOrPR === false) reasons.push("needs at least one Australian citizen or permanent resident");
  if ((g.requiresOwnerOccupier ?? true) && !i.ownerOccupier) reasons.push("you must live in the home");
  if (!g.appliesTo.includes(i.propertyType)) reasons.push(i.propertyType === "established" ? "established homes are not eligible" : "property type not eligible");
  if (!inWindow(date, g.effectiveFrom, g.effectiveTo)) reasons.push("outside the grant's contract dates");
  const caps = i.regional && g.regionalCap ? g.regionalCap : g;
  if (i.propertyType === "vacant-land") {
    const cap = caps.buildCap === undefined ? caps.priceCap : caps.buildCap;
    if (!(i.buildContractPrice && i.buildContractPrice > 0)) reasons.push("vacant land qualifies only with a contract to build a new home");
    else if (cap !== null && (g.capIsExclusive ? i.price + i.buildContractPrice >= cap : i.price + i.buildContractPrice > cap)) reasons.push(`land + building contract must be ${g.capIsExclusive ? "under" : "at most"} $${cap.toLocaleString("en-AU")}`);
  } else if (caps.priceCap !== null && (g.capIsExclusive ? i.price >= caps.priceCap : i.price > caps.priceCap)) {
    reasons.push(`price must be ${g.capIsExclusive ? "under" : "at most"} $${caps.priceCap.toLocaleString("en-AU")}`);
  }
  return reasons;
}

/** Calculate transfer duty, concessions, surcharge, government fees and grants for a purchase. */
export function calcStampDuty(input: StampDutyInput, rulesOverride?: StateRules): StampDutyResult {
  const R = rulesOverride ?? RULES[input.state];
  if (!R) throw new Error(`Unknown state: ${input.state}`);
  const price = Math.max(0, Number(input.price) || 0);
  const foreignNotPR = !!(input.foreignPurchaser && R.foreignSurcharge.foreignMeansNotCitizenOrPR);
  const i = { ...input, price, citizenOrPR: foreignNotPR ? false : (input.citizenOrPR ?? true) };
  const date = input.contractDate ?? today();
  const notes: string[] = [];
  const breakdown: BreakdownLine[] = [];
  const used: { label: string; p: Provenance }[] = [];

  // 1. Base duty: owner-occupier scale where it applies, otherwise the general scale.
  const G = R.generalScale;
  let scale: DutyScale = G;
  const oo = R.ownerOccupierScale;
  if (
    oo &&
    i.ownerOccupier &&
    oo.appliesTo.includes(i.propertyType) &&
    !(oo.requiresCitizenOrPR && i.citizenOrPR === false) &&
    (oo.minValue === undefined || price >= oo.minValue) &&
    (oo.maxValue === undefined || price <= oo.maxValue)
  ) {
    const generalDuty = dutyFromScale(G, price);
    const ooDuty = dutyFromScale(oo.scale, price);
    if (ooDuty <= generalDuty) scale = oo.scale;
  }
  const baseDuty = dutyFromScale(scale, price);
  used.push({ label: `${R.revenueOffice}: ${scale.label}`, p: scale });
  if (scale !== G) used.push({ label: `${R.revenueOffice}: ${G.label}`, p: G });
  breakdown.push({ label: `Transfer duty (${scale.label})`, amount: baseDuty });
  if (date < scale.effectiveFrom) notes.push(`These are the rates for contracts from ${scale.effectiveFrom}. Earlier contracts used different rates.`);

  // 2. First home buyer (and other modelled) concessions: the lowest eligible duty wins.
  let transferDuty = baseDuty;
  let concessionName: string | undefined;
  {
    const candidates = R.concessions.filter(
      (c) => (i.firstHomeBuyer || !c.requiresFirstHomeBuyer) && c.appliesTo.includes(i.propertyType) && inWindow(date, c.effectiveFrom, c.effectiveTo),
    );
    let best: { c: DutyConcession; duty: number } | null = null;
    const blocked: string[] = [];
    for (const c of candidates) {
      if (c.requiresCitizenOrPR && i.citizenOrPR === false) {
        blocked.push(`${c.name}: at least one buyer must be an Australian citizen or permanent resident.`);
        continue;
      }
      if (c.requiresOwnerOccupier && !i.ownerOccupier) {
        blocked.push(`${c.name}: you must live in the property.`);
        continue;
      }
      if (c.incomeCap && i.householdIncome !== undefined) {
        const cap = c.incomeCap.base + (c.incomeCap.perDependant ?? 0) * Math.max(0, i.dependants ?? 0);
        if (i.householdIncome > cap) {
          blocked.push(`${c.name}: household income above the $${cap.toLocaleString("en-AU")} cap.`);
          continue;
        }
      }
      const baseScale = c.baseScale === "owner-occupier" && oo ? oo.scale : G;
      const d = concessionDuty(c, price, (v) => dutyFromScale(baseScale, v), baseScale.minimumDuty);
      if (d === null) continue;
      if (c.incomeCap && i.householdIncome === undefined)
        notes.push(`${c.name} is income tested (cap $${c.incomeCap.base.toLocaleString("en-AU")}${c.incomeCap.perDependant ? ` plus $${c.incomeCap.perDependant.toLocaleString("en-AU")} per dependent child` : ""}). Assumed eligible.`);
      if (!best || d < best.duty) best = { c, duty: d };
    }
    if (i.firstHomeBuyer || best) notes.push(...blocked);
    if (best && best.duty < baseDuty) {
      transferDuty = best.duty;
      concessionName = best.c.name;
      used.push({ label: `${R.revenueOffice}: ${best.c.name}`, p: best.c });
      breakdown.push({ label: `Less ${best.c.name}`, amount: -round2(baseDuty - transferDuty) });
      if (transferDuty === 0) notes.push(`Full exemption under the ${best.c.name}, if you meet all its conditions.`);
      if (best.c.appliedNote) notes.push(best.c.appliedNote);
    } else if (i.firstHomeBuyer && !blocked.length) {
      const fhbCands = candidates.filter((c) => c.requiresFirstHomeBuyer);
      const c0 = fhbCands[0] ?? R.concessions.find((c) => c.requiresFirstHomeBuyer && c.appliesTo.includes(i.propertyType));
      if (c0) used.push({ label: `${R.revenueOffice}: ${c0.name}`, p: c0 });
      if (!fhbCands.length) notes.push(`No first home buyer duty concession for ${i.propertyType.replace("-", " ")} property in ${R.name}.`);
      else notes.push(`The price is above the first home buyer concession thresholds in ${R.name}.`);
    }
  }

  // 3. Foreign purchaser surcharge.
  const FS = R.foreignSurcharge;
  let surcharge = 0;
  if (i.foreignPurchaser) {
    used.push({ label: `${R.revenueOffice}: ${FS.name}`, p: FS });
    if (FS.ratePct > 0) {
      surcharge = applyRound((FS.ratePct / 100) * price, FS.roundTo ?? "cents");
      breakdown.push({ label: `${FS.name} (${FS.ratePct}%)`, amount: surcharge });
    } else {
      notes.push(`${R.name} does not charge a foreign purchaser duty surcharge.`);
    }
  }

  // 3b. Concessions on total duty (e.g. WA off-the-plan): reduce transfer duty first, then the surcharge.
  const concession = round2(baseDuty - transferDuty);
  let offThePlanConcession = 0;
  for (const c of R.totalDutyConcessions ?? []) {
    if (!c.appliesTo.includes(i.propertyType) || !inWindow(date, c.effectiveFrom, c.effectiveTo)) continue;
    const stage = c.stages[i.offThePlanStage ?? "pre-construction"];
    const pct =
      price <= c.fullUpTo
        ? stage.fullPct
        : price >= c.floorFrom
          ? stage.floorPct
          : stage.fullPct - stage.stepPctPer100 * Math.floor((price - c.fullUpTo) / 100 + 1e-9);
    const total = transferDuty + (c.includesSurcharge ? surcharge : 0);
    if (total <= 0) continue;
    const saving = Math.min(c.maxSaving, (total * pct) / 100);
    const payable = applyRound(total - saving, c.roundPayable ?? "cents");
    const actual = round2(total - payable);
    const fromTd = Math.min(transferDuty, actual);
    transferDuty = round2(transferDuty - fromTd);
    surcharge = round2(surcharge - (actual - fromTd));
    offThePlanConcession = actual;
    used.push({ label: `${R.revenueOffice}: ${c.name}`, p: c });
    breakdown.push({ label: `Less ${c.name} (${round2(pct)}%, max $${c.maxSaving.toLocaleString("en-AU")})`, amount: -actual });
    notes.push(`${c.name} applied assuming the contract was signed ${(i.offThePlanStage ?? "pre-construction").replace("-", " ")} and you meet its conditions.`);
    if (c.appliedNote) notes.push(c.appliedNote);
    break;
  }

  // 4. Government (land titles) fees.
  const F = R.govtFees;
  const mortgageRegFee = i.withMortgage === false ? 0 : feeFromRule(F.mortgageRegistration, price);
  const transferFee = feeFromRule(F.transfer, price);
  used.push({ label: `${F.authority}: registration fees`, p: F });
  if (mortgageRegFee) breakdown.push({ label: "Mortgage registration fee", amount: mortgageRegFee });
  breakdown.push({ label: "Transfer registration fee", amount: transferFee });

  // 5. Grants.
  let fhogEligible = false;
  let fhogAmount = 0;
  const otherGrants: { name: string; amount: number }[] = [];
  for (const g of R.grants) {
    const reasons = grantEligibility(g, i, date);
    const isFhog = g.id.startsWith("fhog");
    if (isFhog) used.push({ label: `${R.revenueOffice}: ${g.name}`, p: g });
    if (reasons.length === 0) {
      if (isFhog && g.amount > fhogAmount) {
        fhogEligible = true;
        fhogAmount = g.amount;
      } else if (!isFhog) {
        otherGrants.push({ name: g.name, amount: g.amount });
        used.push({ label: `${R.revenueOffice}: ${g.name}`, p: g });
      }
    } else if (isFhog && i.firstHomeBuyer && inWindow(date, g.effectiveFrom, g.effectiveTo)) {
      notes.push(`${g.name}: not eligible (${reasons.join("; ")}).`);
    }
  }
  if (fhogEligible) notes.push(`You may be eligible for the $${fhogAmount.toLocaleString("en-AU")} First Home Owner Grant. It is paid separately and is not deducted from duty.`);

  // 6. Information-only concessions relevant to the property type.
  for (const c of R.otherConcessions) {
    if (!c.modelled && (!c.appliesTo || c.appliesTo.includes(i.propertyType)) && inWindow(date, c.effectiveFrom, c.effectiveTo)) {
      notes.push(`${c.name}: ${c.summary}`);
      used.push({ label: `${R.revenueOffice}: ${c.name}`, p: c });
    }
  }
  if (R.notes) notes.push(...R.notes);
  notes.push("Estimate only, based on the price entered as the dutiable value. Your conveyancer or solicitor confirms the duty payable.");

  const totalGovtCosts = round2(transferDuty + surcharge + mortgageRegFee + transferFee);
  const sourceMap = new Map<string, { label: string; url: string; verifiedAt: string }>();
  for (const u of used) for (const url of u.p.sourceUrls) if (!sourceMap.has(url)) sourceMap.set(url, { label: u.label, url, verifiedAt: u.p.verifiedAt });
  const verifiedDates = used.map((u) => u.p.verifiedAt).sort();

  return {
    state: R.state,
    price,
    baseDuty: round2(baseDuty),
    scaleUsed: scale.label,
    transferDuty: round2(transferDuty),
    concession,
    concessionName,
    surcharge: round2(surcharge),
    offThePlanConcession,
    mortgageRegFee: round2(mortgageRegFee),
    transferFee: round2(transferFee),
    totalGovtCosts,
    fhogEligible,
    fhogAmount,
    otherGrants,
    notes: Array.from(new Set(notes)),
    breakdown,
    rulesVerifiedAt: verifiedDates[0] ?? "",
    rulesVersion: R.rulesVersion,
    hasUnverified: used.some((u) => u.p.verified === false),
    sources: Array.from(sourceMap.values()),
  };
}
