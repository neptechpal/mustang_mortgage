// TAS — live outputs of the official TRO calculator backend (tro.tas.gov.au/Calculator/CalculateDuty, 26/10/2026);
// LTO 2026-27 brief fee schedule. NT — live outputs of the official NT conveyance calculator (contract 26/10/2026);
// NT Land Titles Office forms and fees page.
import { test } from "node:test";
import assert from "node:assert/strict";
import { calcStampDuty } from "../stampDuty";
import type { StampDutyInput } from "../types";

const run = (state: "TAS" | "NT", o: Partial<StampDutyInput>) =>
  calcStampDuty({ state, price: 0, propertyType: "established", firstHomeBuyer: false, foreignPurchaser: false, ownerOccupier: false, contractDate: "2026-10-26", ...o });

test("TAS general duty (TRO calculator)", () => {
  const d = (price: number) => run("TAS", { price }).transferDuty;
  assert.equal(d(3_000), 50);
  assert.equal(d(3_001), 51.75);
  assert.equal(d(25_000), 435);
  assert.equal(d(200_000), 5_935);
  assert.equal(d(200_001), 5_939);
  assert.equal(d(375_050), 12_939.25);
  assert.equal(d(400_000), 13_997.5);
  assert.equal(d(500_000), 18_247.5);
  assert.equal(d(600_000), 22_497.5);
  assert.equal(d(725_000), 27_810);
  assert.equal(d(725_001), 27_814.5);
  assert.equal(d(750_000), 28_935);
  assert.equal(d(1_000_000), 40_185);
  assert.equal(d(1_500_000), 62_685);
});

test("TAS: no FHB duty relief for contracts now; FHOG $20,000 new homes (1 Jul 2026 – 30 Jun 2027); FIDS 8%; fees", () => {
  const fhb = run("TAS", { price: 750_000, firstHomeBuyer: true, ownerOccupier: true });
  assert.equal(fhb.transferDuty, 28_935);
  assert.equal(fhb.fhogEligible, false);
  assert.ok(fhb.notes.some((n) => n.includes("30 June 2026")));
  assert.equal(run("TAS", { price: 900_000, propertyType: "new", firstHomeBuyer: true, ownerOccupier: true }).fhogAmount, 20_000);
  assert.equal(run("TAS", { price: 900_000, propertyType: "new", firstHomeBuyer: true, ownerOccupier: true, contractDate: "2027-07-01" }).fhogEligible, false);
  const f = run("TAS", { price: 500_000, foreignPurchaser: true });
  assert.equal(f.transferDuty + f.surcharge, 58_247.5);
  assert.equal(f.transferFee, 256.76);
  assert.equal(f.mortgageRegFee, 167.58);
});

test("NT conveyance duty formula and bands (NT calculator)", () => {
  const d = (price: number) => run("NT", { price }).transferDuty;
  assert.equal(d(1_000), 15.05);
  assert.equal(d(100_000), 2_157.1);
  assert.equal(d(123_457), 2_853.4);
  assert.equal(d(250_000), 7_857.15);
  assert.equal(d(300_000), 10_414.25);
  assert.equal(d(400_000), 16_514.3);
  assert.equal(d(450_000), 20_057.15);
  assert.equal(d(500_000), 23_928.6);
  assert.equal(d(524_999), 25_987.45);
  assert.equal(d(525_000), 25_987.5);
  assert.equal(d(525_001), 25_987.5);
  assert.equal(d(600_000), 29_700);
  assert.equal(d(650_000), 32_175);
  assert.equal(d(750_000), 37_125);
  assert.equal(d(1_000_000), 49_500);
  assert.equal(d(2_999_999), 148_499.95);
  assert.equal(d(3_000_000), 172_500);
  assert.equal(d(4_999_999), 287_499.9);
  assert.equal(d(5_000_000), 297_500);
  assert.equal(d(6_000_000), 357_000);
});

test("NT: no FHB duty concession or foreign surcharge; HomeGrown $50k new homes; FreshStart $30k non-FHB; fees $181", () => {
  const nh = run("NT", { price: 600_000, propertyType: "new", firstHomeBuyer: true, ownerOccupier: true });
  assert.equal(nh.transferDuty, 29_700);
  assert.equal(nh.fhogAmount, 50_000);
  assert.deepEqual(nh.otherGrants, []);
  const est = run("NT", { price: 500_000, firstHomeBuyer: true, ownerOccupier: true });
  assert.equal(est.transferDuty, 23_928.6);
  assert.equal(est.fhogEligible, false);
  const fs = run("NT", { price: 700_000, propertyType: "new", ownerOccupier: true });
  assert.deepEqual(fs.otherGrants, [{ name: "FreshStart New Home Grant", amount: 30_000 }]);
  const f = run("NT", { price: 500_000, foreignPurchaser: true });
  assert.equal(f.surcharge, 0);
  assert.equal(f.transferFee, 181);
  assert.equal(f.mortgageRegFee, 181);
});
