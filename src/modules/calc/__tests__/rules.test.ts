// Data-integrity checks over every StateRules record (catches typos in bracket bases, missing sources, stale data).
import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_RULES, RULES } from "../rules";
import { auditFreshness } from "../freshness";
import { dutyFromScale, calcStampDuty } from "../stampDuty";
import { AU_STATES, type DutyScale } from "../types";

const VERIFIED_ON = new Date("2026-10-26T00:00:00Z");

test("every fact group has official sources and is fresh/verified as of the verification date", () => {
  assert.deepEqual(auditFreshness(ALL_RULES, VERIFIED_ON), []);
  for (const s of AU_STATES) {
    const R = RULES[s];
    const groups = [R.generalScale, R.ownerOccupierScale?.scale, ...R.concessions, ...R.grants, R.foreignSurcharge, R.govtFees, ...R.otherConcessions, ...(R.totalDutyConcessions ?? [])];
    for (const g of groups) if (g) assert.ok(g.sourceUrls.length > 0 && g.sourceUrls.every((u) => u.startsWith("https://")), `${s}: missing source`);
  }
});

// Each marginal bracket's base should equal the previous bracket's duty at its upper threshold (±$1), except where the
// law itself has a step (listed). This catches transcription errors in the tables.
const KNOWN_STEPS = new Set(["WA:general:725000"]); // statutory base $28,453 vs $28,452.50
function checkContinuity(state: string, scale: DutyScale) {
  const raw = { ...scale, roundValueUpTo: undefined, minimumDuty: undefined, nilIfBelow: undefined, roundDuty: "cents" as const };
  scale.brackets.forEach((b, idx) => {
    if (idx === 0 || b.kind !== "marginal") return;
    const prev = scale.brackets[idx - 1];
    if (prev.kind !== "marginal" || prev.upTo === null) return;
    const atThreshold = dutyFromScale(raw, prev.upTo);
    const key = `${state}:${scale.id}:${prev.upTo}`;
    if (!KNOWN_STEPS.has(key)) assert.ok(Math.abs(atThreshold - b.base) <= 1, `${key}: base ${b.base} vs ${atThreshold}`);
    assert.equal(b.over, prev.upTo, `${key}: 'over' must equal previous threshold`);
  });
}
test("bracket tables are internally consistent", () => {
  for (const s of AU_STATES) {
    checkContinuity(s, RULES[s].generalScale);
    const oo = RULES[s].ownerOccupierScale;
    if (oo) checkContinuity(s, oo.scale);
  }
});

test("engine handles zero / invalid prices and every state × property type without throwing", () => {
  for (const s of AU_STATES)
    for (const propertyType of ["established", "new", "vacant-land", "off-the-plan"] as const)
      for (const price of [0, 1, 350_000, 799_999.99, 1_250_000, 6_000_000]) {
        const r = calcStampDuty({ state: s, price, propertyType, firstHomeBuyer: true, foreignPurchaser: false, ownerOccupier: true, contractDate: "2026-10-26" });
        assert.ok(Number.isFinite(r.totalGovtCosts) && r.transferDuty >= 0 && r.transferDuty <= r.baseDuty + 1e-9);
        assert.ok(r.sources.length > 0 && r.rulesVerifiedAt === "2026-10-26");
      }
  assert.equal(calcStampDuty({ state: "NSW", price: Number.NaN, propertyType: "established", firstHomeBuyer: false, foreignPurchaser: false, ownerOccupier: true }).transferDuty, 0);
});
