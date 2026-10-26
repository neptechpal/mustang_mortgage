// VIC — expected values from the SRO's own land transfer duty calculator API
// (e-business.sro.vic.gov.au/calculatorservice/api/v1/land-transfer-duty/calculate, contract & settlement 26/10/2026)
// and SRO page examples (PPR page: "$19,070 … will pay $16,370"; FPAD example 1: "additional duty of $80,000").
import { test } from "node:test";
import assert from "node:assert/strict";
import { calcStampDuty } from "../stampDuty";
import type { StampDutyInput } from "../types";

const base: StampDutyInput = { state: "VIC", price: 0, propertyType: "established", firstHomeBuyer: false, foreignPurchaser: false, ownerOccupier: false, contractDate: "2026-10-26" };
const run = (o: Partial<StampDutyInput>) => calcStampDuty({ ...base, ...o });
const total = (o: Partial<StampDutyInput>) => {
  const r = run(o);
  return r.transferDuty + r.surcharge;
};

test("VIC general rates incl. half-down rounding and the $960k / $2m bands (SRO calculator)", () => {
  assert.equal(run({ price: 400_000 }).transferDuty, 19_070);
  assert.equal(run({ price: 100_000 }).transferDuty, 2_150);
  assert.equal(run({ price: 130_025 }).transferDuty, 2_871); // $2,871.50 rounds down
  assert.equal(run({ price: 612_345 }).transferDuty, 31_811);
  assert.equal(run({ price: 960_000 }).transferDuty, 52_670);
  assert.equal(run({ price: 960_001 }).transferDuty, 52_800);
  assert.equal(run({ price: 960_100 }).transferDuty, 52_805); // $52,805.50 rounds down
  assert.equal(run({ price: 1_000_000 }).transferDuty, 55_000);
  assert.equal(run({ price: 2_000_000 }).transferDuty, 110_000);
  assert.equal(run({ price: 2_500_000 }).transferDuty, 142_500);
  assert.equal(run({ price: 100 }).transferDuty, 1);
});

test("VIC PPR concession to $550,000 (SRO PPR page example + calculator)", () => {
  assert.equal(run({ price: 400_000, ownerOccupier: true }).transferDuty, 16_370);
  assert.equal(run({ price: 455_555, ownerOccupier: true }).transferDuty, 19_303);
  assert.equal(run({ price: 549_999, ownerOccupier: true }).transferDuty, 24_970);
  assert.equal(run({ price: 550_000, ownerOccupier: true }).transferDuty, 24_970);
  assert.equal(run({ price: 550_001, ownerOccupier: true }).transferDuty, 28_070); // general rates above $550k
});

test("VIC first home buyer: exempt to $600k, (A − 600k)/150k × B to $750k, all property types (SRO calculator)", () => {
  const fhb = (price: number, propertyType: StampDutyInput["propertyType"] = "established") =>
    run({ price, propertyType, firstHomeBuyer: true, ownerOccupier: true }).transferDuty;
  assert.equal(fhb(599_999), 0);
  assert.equal(fhb(600_000), 0);
  assert.equal(fhb(600_001), 0);
  assert.equal(fhb(600_100), 20);
  assert.equal(fhb(600_100, "vacant-land"), 20);
  assert.equal(fhb(600_100, "new"), 20);
  assert.equal(fhb(650_000), 11_356);
  assert.equal(fhb(700_000), 24_713);
  assert.equal(fhb(712_345), 28_319);
  assert.equal(fhb(749_999), 40_069);
  assert.equal(fhb(750_000), 40_070);
  assert.equal(fhb(750_001), 40_070);
  assert.equal(fhb(800_000), 43_070);
});

test("VIC FPAD 8% on the full value, PPR still applies to base duty (SRO calculator / FPAD example)", () => {
  assert.equal(total({ price: 1_000_000, foreignPurchaser: true }), 135_000);
  assert.equal(run({ price: 1_000_000, foreignPurchaser: true }).surcharge, 80_000);
  assert.equal(total({ price: 400_000, foreignPurchaser: true }), 51_070);
  assert.equal(total({ price: 400_000, foreignPurchaser: true, ownerOccupier: true }), 48_370);
  assert.equal(total({ price: 500_000, foreignPurchaser: true, ownerOccupier: true, firstHomeBuyer: true }), 61_970); // no FHB for foreign
  assert.equal(total({ price: 612_345, foreignPurchaser: true }), 80_799);
  assert.equal(total({ price: 2_500_000, foreignPurchaser: true }), 342_500);
});

test("VIC FHOG $10,000 new homes ≤ $750,000; government fees 2026-27", () => {
  assert.equal(run({ price: 750_000, propertyType: "new", firstHomeBuyer: true, ownerOccupier: true }).fhogAmount, 10_000);
  assert.equal(run({ price: 750_001, propertyType: "new", firstHomeBuyer: true, ownerOccupier: true }).fhogEligible, false);
  assert.equal(run({ price: 500_000, propertyType: "established", firstHomeBuyer: true, ownerOccupier: true }).fhogEligible, false);
  // Transfer of Land (Fees) Regs 2016 Sch 1 item 19 at fee unit $17.27: ceil(104.30 + 2.34 × whole $1,000s), cap $3,614.
  assert.equal(run({ price: 650_000 }).transferFee, 1_626);
  assert.equal(run({ price: 1_000_000 }).transferFee, 2_445);
  assert.equal(run({ price: 655_000 }).transferFee, 1_637);
  assert.equal(run({ price: 2_000_000 }).transferFee, 3_614);
  assert.equal(run({ price: 650_000 }).mortgageRegFee, 129.2);
  // Temporary off-the-plan concession is surfaced as a note (not modelled).
  assert.ok(run({ price: 700_000, propertyType: "off-the-plan" }).notes.some((n) => n.includes("21 April 2027")));
});
