// SA — expected values from RevenueSA's own calculator function (live page, 26 Oct 2026), RevenueSA FOS page examples
// and the Land Services SA 2026-27 ad valorem transfer fee table.
import { test } from "node:test";
import assert from "node:assert/strict";
import { calcStampDuty } from "../stampDuty";
import type { StampDutyInput } from "../types";

const base: StampDutyInput = { state: "SA", price: 0, propertyType: "established", firstHomeBuyer: false, foreignPurchaser: false, ownerOccupier: false, contractDate: "2026-10-26" };
const run = (o: Partial<StampDutyInput>) => calcStampDuty({ ...base, ...o });

test("SA conveyance duty (RevenueSA calculator)", () => {
  assert.equal(run({ price: 12_000 }).transferDuty, 120);
  assert.equal(run({ price: 12_001 }).transferDuty, 122);
  assert.equal(run({ price: 200_050 }).transferDuty, 6_834.25);
  assert.equal(run({ price: 500_000 }).transferDuty, 21_330);
  assert.equal(run({ price: 500_001 }).transferDuty, 21_335.5);
  assert.equal(run({ price: 500_050 }).transferDuty, 21_335.5);
  assert.equal(run({ price: 750_000 }).transferDuty, 35_080);
  assert.equal(run({ price: 1_500_000 }).transferDuty, 76_330);
  assert.equal(run({ price: 450_000, propertyType: "vacant-land" }).transferDuty, 18_830);
});

test("SA first home buyer relief: new / off-the-plan / vacant land only, no value cap", () => {
  const fh = (price: number, propertyType: StampDutyInput["propertyType"]) => run({ price, propertyType, firstHomeBuyer: true, ownerOccupier: true });
  assert.equal(fh(750_000, "new").transferDuty, 0);
  assert.equal(fh(750_000, "new").concession, 35_080);
  assert.equal(fh(1_500_000, "off-the-plan").transferDuty, 0);
  assert.equal(fh(450_000, "vacant-land").transferDuty, 0);
  assert.equal(fh(600_000, "established").transferDuty, 26_830); // no relief for established homes
});

test("SA foreign ownership surcharge 7% (RevenueSA FOS example 1: $600,000 → $26,830 + $42,000)", () => {
  const r = run({ price: 600_000, foreignPurchaser: true });
  assert.equal(r.transferDuty, 26_830);
  assert.equal(r.surcharge, 42_000);
  // Relief never reduces the surcharge; a wholly foreign purchase gets no relief.
  const f = run({ price: 750_000, propertyType: "new", foreignPurchaser: true, firstHomeBuyer: true, ownerOccupier: true });
  assert.equal(f.surcharge, 52_500);
});

test("SA FHOG $15,000 new homes, no cap; Land Services SA fees", () => {
  assert.equal(run({ price: 2_000_000, propertyType: "new", firstHomeBuyer: true, ownerOccupier: true }).fhogAmount, 15_000);
  assert.equal(run({ price: 500_000, propertyType: "established", firstHomeBuyer: true, ownerOccupier: true }).fhogEligible, false);
  const fee = (price: number) => run({ price }).transferFee;
  assert.equal(fee(5_000), 204);
  assert.equal(fee(50_000), 353);
  assert.equal(fee(50_001), 458);
  assert.equal(fee(600_000), 6_128);
  assert.equal(fee(1_000_000), 10_328);
  assert.equal(run({ price: 600_000 }).mortgageRegFee, 204);
});
