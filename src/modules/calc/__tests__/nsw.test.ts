// NSW stamp duty — expected values from Revenue NSW's own published examples and calculators (checked 2026-10-26).
import { test } from "node:test";
import assert from "node:assert/strict";
import { calcStampDuty } from "../stampDuty";
import type { StampDutyInput } from "../types";

const base: StampDutyInput = { state: "NSW", price: 0, propertyType: "established", firstHomeBuyer: false, foreignPurchaser: false, ownerOccupier: true, contractDate: "2026-10-26" };
const run = (o: Partial<StampDutyInput>) => calcStampDuty({ ...base, ...o });

// Source: revenue.nsw.gov.au ".../calculate-transfer-duty" worked examples (2026/2027 rates).
test("NSW worked example: Yamba auction $1,350,000 → $55,537", () => {
  assert.equal(run({ price: 1_350_000 }).transferDuty, 55_537);
});
test("NSW worked example: Balmain $4,000,000 premium duty → $203,237", () => {
  assert.equal(run({ price: 4_000_000 }).transferDuty, 203_237);
});
test("NSW worked example: Nowra vacant land $450,000 (no FHBAS) → $14,437", () => {
  assert.equal(run({ price: 450_000, propertyType: "vacant-land" }).transferDuty, 14_437);
});
// Source: Revenue NSW Transfer of Land calculator (landsalesimple.php), execution date 26/10/2026.
test("NSW calculator: $650,000 → $23,437; $103,050 → $1,665.50 (value rounded up to next $100)", () => {
  assert.equal(run({ price: 650_000 }).transferDuty, 23_437);
  assert.equal(run({ price: 103_050 }).transferDuty, 1_665.5);
});
test("NSW minimum duty $20", () => {
  assert.equal(run({ price: 1_000 }).transferDuty, 20);
});
// Source: Revenue NSW First Home Buyers Assistance calculator (fhba.php), execution date 26/10/2026.
test("NSW FHBAS homes: exempt to $800,000, taper to $1m", () => {
  const fhb = (price: number, propertyType: StampDutyInput["propertyType"] = "established") => run({ price, propertyType, firstHomeBuyer: true });
  assert.equal(fhb(650_000).transferDuty, 0);
  assert.equal(fhb(650_000).concession, 23_437);
  assert.equal(fhb(800_000).transferDuty, 0);
  assert.equal(fhb(800_001).transferDuty, 20); // calculator: $20.00, saving $30,171.50
  assert.equal(fhb(850_050).transferDuty, 9_808.8); // calculator: $9,808.80, saving $22,632.70
  assert.equal(fhb(850_050).concession, 22_632.7);
  assert.equal(fhb(900_000).transferDuty, 19_593.5); // calculator: $19,593.50, saving $15,093.50
  assert.equal(fhb(950_000, "new").transferDuty, 29_390.25); // calculator (new home): $29,390.25
  assert.equal(fhb(1_000_000).transferDuty, 39_187); // calculator: no saving at $1m
  assert.equal(fhb(1_000_000).concession, 0);
});
test("NSW FHBAS vacant land: exempt to $350,000, taper to $450,000", () => {
  const land = (price: number) => run({ price, propertyType: "vacant-land", firstHomeBuyer: true });
  assert.equal(land(350_000).transferDuty, 0); // calculator: saving $10,307
  assert.equal(land(350_001).transferDuty, 20); // calculator: $20.00
  assert.equal(land(400_000).transferDuty, 7_033.5); // calculator: $7,033.50
  assert.equal(land(449_999).transferDuty, 14_436.9); // calculator: $14,436.90
  assert.equal(land(450_000).transferDuty, 14_437); // calculator: no saving
});
// Source: Revenue NSW Surcharge Purchaser Duty calculator (surchargeduty.php), 100% foreign interest, residential.
test("NSW surcharge purchaser duty 9%", () => {
  const r = run({ price: 1_000_000, foreignPurchaser: true, ownerOccupier: false });
  assert.equal(r.transferDuty, 39_187);
  assert.equal(r.surcharge, 90_000);
  assert.equal(run({ price: 1_000_050, foreignPurchaser: true }).surcharge, 90_004); // calculator truncates to $90,004.00
});
// $700,000 general duty = $25,687 (FHBA calculator shows saving $25,687 at $700,000).
test("NSW FHBAS needs a citizen/PR and owner-occupation", () => {
  assert.equal(run({ price: 700_000, firstHomeBuyer: true, citizenOrPR: false }).transferDuty, 25_687);
  assert.equal(run({ price: 700_000, firstHomeBuyer: true, ownerOccupier: false }).transferDuty, 25_687);
});
// Source: revenue.nsw.gov.au/grants-schemes/first-home-owner-new-homes-grant ($10,000; new homes ≤ $600,000; build ≤ $750,000).
test("NSW FHOG: new homes only, caps", () => {
  assert.equal(run({ price: 600_000, propertyType: "new", firstHomeBuyer: true }).fhogAmount, 10_000);
  assert.equal(run({ price: 600_001, propertyType: "new", firstHomeBuyer: true }).fhogEligible, false);
  assert.equal(run({ price: 550_000, propertyType: "established", firstHomeBuyer: true }).fhogEligible, false);
  assert.equal(run({ price: 300_000, propertyType: "vacant-land", firstHomeBuyer: true, buildContractPrice: 450_000 }).fhogAmount, 10_000);
  assert.equal(run({ price: 300_000, propertyType: "vacant-land", firstHomeBuyer: true, buildContractPrice: 450_001 }).fhogEligible, false);
  assert.equal(run({ price: 300_000, propertyType: "vacant-land", firstHomeBuyer: true }).fhogEligible, false);
});
// Source: NSW LRS 2026/27 fees update — Mortgage / Transfer $182.73 incl. GST each.
test("NSW government fees and total", () => {
  const r = run({ price: 650_000 });
  assert.equal(r.mortgageRegFee, 182.73);
  assert.equal(r.transferFee, 182.73);
  assert.equal(r.totalGovtCosts, 23_437 + 182.73 * 2);
  assert.equal(run({ price: 650_000, withMortgage: false }).mortgageRegFee, 0);
  assert.ok(r.sources.length > 0 && r.rulesVerifiedAt === "2026-10-26");
});
