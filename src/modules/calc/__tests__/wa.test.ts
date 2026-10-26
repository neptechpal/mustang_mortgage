// WA — expected values from the RevenueWA duty calculator (contract date 26/10/2026), the official transfer-duty-assessment
// page examples ($650k → $24,890; $700k → $27,265; $850k → $34,890.50), the FTD fact sheet and off-the-plan page
// ("Lucy" example), and Landgate's transfer lodgement fee calculator.
import { test } from "node:test";
import assert from "node:assert/strict";
import { calcStampDuty } from "../stampDuty";
import type { StampDutyInput } from "../types";

const base: StampDutyInput = { state: "WA", price: 0, propertyType: "established", firstHomeBuyer: false, foreignPurchaser: false, ownerOccupier: false, contractDate: "2026-10-26" };
const run = (o: Partial<StampDutyInput>) => calcStampDuty({ ...base, ...o });

test("WA general rate (calculator + official examples)", () => {
  assert.equal(run({ price: 120_000 }).transferDuty, 2_280);
  assert.equal(run({ price: 120_001 }).transferDuty, 2_282.85);
  assert.equal(run({ price: 360_050 }).transferDuty, 11_119.75);
  assert.equal(run({ price: 500_000 }).transferDuty, 17_765);
  assert.equal(run({ price: 650_000 }).transferDuty, 24_890);
  assert.equal(run({ price: 700_000 }).transferDuty, 27_265);
  assert.equal(run({ price: 725_000 }).transferDuty, 28_452.5);
  assert.equal(run({ price: 725_001 }).transferDuty, 28_458.15);
  assert.equal(run({ price: 800_000 }).transferDuty, 32_315.5);
  assert.equal(run({ price: 850_000 }).transferDuty, 34_890.5);
  assert.equal(run({ price: 1_000_000 }).transferDuty, 42_615.5);
});

test("WA concessional rate for a home ≤ $200,000 (s 147)", () => {
  const oo = (price: number) => run({ price, ownerOccupier: true }).transferDuty;
  assert.equal(oo(100_000), 1_500);
  assert.equal(oo(120_001), 1_804);
  assert.equal(oo(120_101), 1_808.05); // floored to 5c
  assert.equal(oo(150_000), 3_012);
  assert.equal(oo(200_000), 5_032);
});

test("WA first home owner rate from 7 May 2026: home $600k / $800k, land $450k / $550k", () => {
  const fh = (price: number, propertyType: StampDutyInput["propertyType"] = "established") => run({ price, propertyType, firstHomeBuyer: true, ownerOccupier: true }).transferDuty;
  assert.equal(fh(600_000), 0);
  assert.equal(fh(600_001), 16.15);
  assert.equal(fh(650_050), 8_091.15);
  assert.equal(fh(700_000, "new"), 16_150);
  assert.equal(fh(800_000), 32_300);
  assert.equal(fh(800_001), 32_320.65); // general rate above $800,000
  assert.equal(fh(450_000, "vacant-land"), 0);
  assert.equal(fh(450_001, "vacant-land"), 20.1);
  assert.equal(fh(450_301, "vacant-land"), 80.55);
  assert.equal(fh(500_000, "vacant-land"), 10_070);
  assert.equal(fh(500_050, "vacant-land"), 10_090.1);
  assert.equal(fh(550_000, "vacant-land"), 20_140);
});

test("WA foreign transfer duty 7%", () => {
  const r = run({ price: 500_000, foreignPurchaser: true });
  assert.equal(r.transferDuty + r.surcharge, 52_765);
  assert.equal(r.surcharge, 35_000);
});

test("WA off-the-plan concession (from 12 Mar 2026): pre-construction and under construction", () => {
  const otp = (price: number, o: Partial<StampDutyInput> = {}) => {
    const r = run({ price, propertyType: "off-the-plan", ...o });
    return { payable: Math.round((r.transferDuty + r.surcharge) * 100) / 100, concession: r.offThePlanConcession };
  };
  assert.deepEqual(otp(700_000), { payable: 0, concession: 27_265 });
  assert.deepEqual(otp(850_000), { payable: 8_722.6, concession: 26_167.9 });
  assert.equal(otp(1_000_000).payable, 21_307.75);
  assert.deepEqual(otp(3_000_000), { payable: 95_615.5, concession: 50_000 });
  assert.equal(otp(700_000, { foreignPurchaser: true }).payable, 26_265); // official "Lucy" example
  assert.equal(otp(800_000, { offThePlanStage: "under-construction" }).payable, 8_078.85);
  assert.deepEqual(otp(850_000, { offThePlanStage: "under-construction" }), { payable: 15_264.55, concession: 19_625.95 });
  assert.equal(otp(1_000_000, { offThePlanStage: "under-construction" }).payable, 26_634.65);
});

test("WA FHOG $10,000: new homes ≤ $800k south / $1m north of the 26th parallel; Landgate fees", () => {
  const g = (o: Partial<StampDutyInput>) => run({ propertyType: "new", firstHomeBuyer: true, ownerOccupier: true, ...o });
  assert.equal(g({ price: 800_000 }).fhogAmount, 10_000);
  assert.equal(g({ price: 800_001 }).fhogEligible, false);
  assert.equal(g({ price: 950_000, regional: true }).fhogAmount, 10_000);
  assert.equal(g({ price: 500_000, propertyType: "established" }).fhogEligible, false);
  const fee = (price: number) => run({ price }).transferFee;
  assert.equal(fee(85_000), 225.1);
  assert.equal(fee(85_001), 235.1);
  assert.equal(fee(120_001), 255.1);
  assert.equal(fee(200_000), 255.1);
  assert.equal(fee(200_001), 275.1);
  assert.equal(fee(300_001), 295.1);
  assert.equal(fee(650_000), 355.1);
  assert.equal(fee(1_000_000), 415.1);
  assert.equal(fee(1_000_001), 435.1);
  assert.equal(run({ price: 500_000 }).mortgageRegFee, 225.1);
});
