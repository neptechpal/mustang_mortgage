// ACT — expected values from the ACT Revenue Office's official conveyance duty calculator logic (global.js + 2026-27
// config, run locally; Wayback capture 2026-10-05), the 2026 duty determination DI2026-155 and its explanatory
// statement ($580,000 non-owner-occupier example = $14,856), and Land Titles (Fees) Determination 2026 (No 2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { calcStampDuty } from "../stampDuty";
import type { StampDutyInput } from "../types";

const base: StampDutyInput = { state: "ACT", price: 0, propertyType: "established", firstHomeBuyer: false, foreignPurchaser: false, ownerOccupier: false, contractDate: "2026-10-26" };
const run = (o: Partial<StampDutyInput>) => calcStampDuty({ ...base, ...o });

test("ACT non-owner-occupier rates (Table 2)", () => {
  assert.equal(run({ price: 580_000 }).transferDuty, 14_856); // ES example + calculator
  assert.equal(run({ price: 200_000 }).transferDuty, 2_400);
  assert.equal(run({ price: 200_001 }).transferDuty, 2_402.2);
  assert.equal(run({ price: 300_000 }).transferDuty, 4_600);
  assert.equal(run({ price: 500_050 }).transferDuty, 11_404.32);
  assert.equal(run({ price: 750_000 }).transferDuty, 22_200);
  assert.equal(run({ price: 1_000_000 }).transferDuty, 36_950);
  assert.equal(run({ price: 1_455_000 }).transferDuty, 66_070);
  assert.equal(run({ price: 1_455_001 }).transferDuty, 66_061.54); // calculator rounds value up to $100
  assert.equal(run({ price: 2_000_000 }).transferDuty, 90_800);
  assert.equal(run({ price: 450_000, propertyType: "vacant-land" }).transferDuty, 9_700);
});

test("ACT owner-occupier rates (Table 1)", () => {
  const oo = (price: number, propertyType: StampDutyInput["propertyType"] = "established") => run({ price, propertyType, ownerOccupier: true }).transferDuty;
  assert.equal(oo(580_000), 11_864);
  assert.equal(oo(260_000), 728);
  assert.equal(oo(260_001), 730.2);
  assert.equal(oo(300_000), 1_608);
  assert.equal(oo(750_000), 19_208);
  assert.equal(oo(1_000_000), 33_958);
  assert.equal(oo(1_455_000), 63_078);
  assert.equal(oo(1_455_001), 66_061.54);
  assert.equal(oo(450_000, "vacant-land"), 6_708);
  assert.equal(oo(5_000), 0); // $14 is under the Duties Act s 229 $20 threshold
});

test("ACT Home Buyer Concession Scheme: nil duty at any price from 1 July 2026, no citizenship test", () => {
  const h = (o: Partial<StampDutyInput>) => run({ ownerOccupier: true, firstHomeBuyer: true, ...o });
  assert.equal(h({ price: 900_000 }).transferDuty, 0);
  assert.equal(h({ price: 900_000 }).concession, 28_058); // saving vs the owner-occupier rate (calculator "full duty" $31,050 is the Table 2 rate)
  assert.equal(h({ price: 3_000_000 }).transferDuty, 0);
  assert.equal(h({ price: 3_000_000 }).concession, 136_200);
  assert.equal(h({ price: 450_000, propertyType: "vacant-land" }).transferDuty, 0);
  assert.equal(h({ price: 900_000, citizenOrPR: false, foreignPurchaser: true }).transferDuty, 0);
  assert.equal(run({ price: 900_000, firstHomeBuyer: true, ownerOccupier: false }).transferDuty, 31_050); // must live in it
});

test("ACT off-the-plan unit exemption (any owner-occupier), no foreign surcharge, no FHOG, fees", () => {
  assert.equal(run({ price: 1_200_000, propertyType: "off-the-plan", ownerOccupier: true }).transferDuty, 0);
  assert.ok(run({ price: 1_200_000, propertyType: "off-the-plan" }).transferDuty > 0); // investors pay
  const f = run({ price: 800_000, foreignPurchaser: true });
  assert.equal(f.surcharge, 0);
  assert.equal(run({ price: 500_000, propertyType: "new", firstHomeBuyer: true, ownerOccupier: true }).fhogEligible, false);
  assert.equal(f.transferFee, 496);
  assert.equal(f.mortgageRegFee, 184);
});
