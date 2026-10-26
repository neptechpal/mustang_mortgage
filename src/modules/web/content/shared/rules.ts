import { FEDERAL, RULES } from "@/modules/calc/rules";
import { calcStampDuty, dutyFromScale } from "@/modules/calc/stampDuty";
import type { AuState, DutyConcession, StampDutyInput, StampDutyResult } from "@/modules/calc/types";

/**
 * Small read-only helpers over the verified rules data (src/modules/calc/rules). Every number a page shows
 * comes through here or straight from calcStampDuty, never from page copy.
 */

export const STATE_ORDER: AuState[] = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"];
export const stateSlug = (s: AuState) => s.toLowerCase();
export const stateFromSlug = (slug: string): AuState | undefined => STATE_ORDER.find((s) => stateSlug(s) === slug);

/** "the ACT" / "NSW" for running text. */
export const stateShort = (s: AuState) => (s === "ACT" ? "the ACT" : s === "NT" ? "the NT" : s);
export const stateName = (s: AuState) => RULES[s].name;

/** First Home Owner Grant record for a state (null where none exists, e.g. ACT). */
export const fhogFor = (s: AuState) => RULES[s].grants.find((g) => g.id.startsWith("fhog")) ?? null;
/** First-home duty concessions (modelled). */
export const fhbConcessionsFor = (s: AuState) => RULES[s].concessions.filter((c) => c.requiresFirstHomeBuyer);

/** FIRB application fee (2026-27 schedule) for a new dwelling or vacant land at this price. */
export function firbNewDwellingFee(price: number) {
  const f = FEDERAL.FIRB.fees2026_27;
  const row = f.newOrVacant.find((r) => price <= r.upTo) ?? null;
  return { fee: row?.fee ?? null, upTo: row?.upTo ?? null, url: f.scheduleUrl, feesUrl: f.feesUrl, verifiedAt: FEDERAL.FIRB.verifiedAt };
}

/** calcStampDuty pinned to the rules' check date so page figures don't drift with the build date. */
export function duty(input: Omit<StampDutyInput, "contractDate"> & { contractDate?: string }): StampDutyResult {
  return calcStampDuty({ contractDate: RULES[input.state].generalScale.verifiedAt, ...input });
}

/** Total registration fees (mortgage + transfer), rounded to cents. */
export const regFees = (r: StampDutyResult) => Math.round((r.mortgageRegFee + r.transferFee) * 100) / 100;

export const DEPOSIT_SCHEME = FEDERAL.FIVE_PERCENT_DEPOSIT_SCHEME;
export const HELP_TO_BUY = FEDERAL.HELP_TO_BUY;
export const FHSS = FEDERAL.FIRST_HOME_SUPER_SAVER;
export const FIRB_RULES = FEDERAL.FIRB;

/**
 * First home duty concession thresholds for a property type, read from the rules bands:
 * `exemptTo` = no duty up to this value (Infinity = no cap); `reducedTo` = some concession up to this value.
 */
export function fhbThresholds(state: AuState, propertyType: "established" | "new" | "vacant-land" = "established") {
  const c = fhbConcessionsFor(state).find((x) => x.appliesTo.includes(propertyType));
  return c ? concessionThresholds(state, c) : null;
}

/** Thresholds for one concession record (see fhbThresholds). */
export function concessionThresholds(state: AuState, c: DutyConcession) {
  let exemptTo: number | null = null;
  let reducedTo: number | null = null;
  for (const b of c.bands) {
    if (b.kind === "exempt") exemptTo = b.upTo;
    else if (b.kind === "taper-saving-from-lower" || b.kind === "taper-duty") reducedTo = b.below;
    else if (b.kind === "marginal") reducedTo = b.upTo;
    else if (b.kind === "concession-table") {
      reducedTo = b.rows[b.rows.length - 1].upTo;
      // Nil duty while the concession covers the whole base duty.
      const R = RULES[state];
      const scale = c.baseScale === "owner-occupier" && R.ownerOccupierScale ? R.ownerOccupierScale.scale : R.generalScale;
      let nil = 0;
      for (let v = 10_000; v <= b.rows[0].upTo; v += 10_000) if (dutyFromScale(scale, v) <= b.rows[0].concession) nil = v;
      exemptTo = nil || null;
    }
  }
  return { name: c.name, exemptTo, reducedTo: reducedTo !== null ? Math.ceil(reducedTo) : null, sourceUrls: c.sourceUrls, verifiedAt: c.verifiedAt };
}

const TYPE_WORDS: Record<string, string> = { established: "existing homes", new: "new homes", "off-the-plan": "off-the-plan homes", "vacant-land": "vacant land" };

/** "No duty up to $800,000, reduced duty up to $1,000,000 (existing homes, new homes …)" from the bands. */
export function concessionSentence(state: AuState, c: DutyConcession, fmt: (n: number) => string) {
  const t = concessionThresholds(state, c);
  const types = c.appliesTo.map((x) => TYPE_WORDS[x]).join(", ");
  const head =
    t.exemptTo === Number.POSITIVE_INFINITY
      ? "No transfer duty at any price"
      : t.exemptTo
        ? `No transfer duty up to ${fmt(t.exemptTo)}${t.reducedTo ? `, reduced duty up to ${fmt(t.reducedTo)}` : ""}`
        : t.reducedTo
          ? `Reduced duty up to ${fmt(t.reducedTo)}`
          : "A concession applies";
  return `${head} (${types}).`;
}

/** Regional centres that use the capital-city 5% Deposit Scheme cap, read from the rules text (e.g. "NSW"). */
export function regionalCentresFor(state: "NSW" | "VIC" | "QLD"): string | null {
  const m = DEPOSIT_SCHEME.regionalCentres.match(new RegExp(`${state}: ([^;.]+)`));
  return m ? m[1].trim() : null;
}
