// QLD — expected values from QRO's own worked examples (rates / concession / AFAD pages) and from QRO's transfer duty
// estimator logic run with contract date 26/10/2026 (qro.qld.gov.au/duties/transfer-duty/calculate/transfer-duty-estimator/).
// Titles fees from Titles Queensland FY2026/27 fee schedule.
import { test } from "node:test";
import assert from "node:assert/strict";
import { calcStampDuty } from "../stampDuty";
import type { StampDutyInput } from "../types";

const base: StampDutyInput = { state: "QLD", price: 0, propertyType: "established", firstHomeBuyer: false, foreignPurchaser: false, ownerOccupier: false, contractDate: "2026-10-26" };
const run = (o: Partial<StampDutyInput>) => calcStampDuty({ ...base, ...o });

test("QLD general rates (investor): QRO example $850,000 → $31,275; estimator edges", () => {
  assert.equal(run({ price: 850_000 }).transferDuty, 31_275); // QRO rates page example
  assert.equal(run({ price: 1_750_000 }).transferDuty, 81_150); // QRO new-home page example
  assert.equal(run({ price: 1_000_001 }).transferDuty, 38_030.75); // estimator ($100 or part)
  assert.equal(run({ price: 540_001 }).transferDuty, 17_329.5);
  assert.equal(run({ price: 75_001 }).transferDuty, 1_053.5);
  assert.equal(run({ price: 5_000 }).transferDuty, 0);
});

test("QLD home concession (owner-occupier): QRO examples $550,000 → $10,600; $950,000 → $28,600", () => {
  const a = run({ price: 550_000, ownerOccupier: true });
  assert.equal(a.transferDuty, 10_600);
  assert.equal(run({ price: 550_000 }).transferDuty, 17_775); // without the concession
  assert.equal(run({ price: 950_000, ownerOccupier: true }).transferDuty, 28_600);
  assert.equal(run({ price: 1_200_000, ownerOccupier: true }).transferDuty, 42_350); // estimator
  assert.equal(run({ price: 350_001, ownerOccupier: true }).transferDuty, 3_503.5);
});

test("QLD first home concession (established), Sch 4A table", () => {
  const fh = (price: number) => run({ price, ownerOccupier: true, firstHomeBuyer: true }).transferDuty;
  assert.equal(fh(650_000), 0); // QRO example
  assert.equal(fh(700_000), 0); // estimator
  assert.equal(fh(700_001), 4.5);
  assert.equal(fh(709_999.99), 450);
  assert.equal(fh(710_000), 2_185);
  assert.equal(fh(730_000), 6_555); // QRO example
  assert.equal(fh(795_000), 19_890); // QRO example
  assert.equal(fh(799_999.99), 20_115);
  assert.equal(fh(800_000), 21_850); // home concession only
  assert.equal(fh(850_000), 24_100); // QRO example
});

test("QLD first home new home and vacant land: no duty, no value cap", () => {
  assert.equal(run({ price: 1_230_000, propertyType: "new", ownerOccupier: true, firstHomeBuyer: true }).transferDuty, 0); // QRO example
  assert.equal(run({ price: 2_000_000, propertyType: "off-the-plan", ownerOccupier: true, firstHomeBuyer: true }).transferDuty, 0);
  assert.equal(run({ price: 750_000, propertyType: "vacant-land", ownerOccupier: true, firstHomeBuyer: true }).transferDuty, 0); // QRO example
});

test("QLD AFAD 8%: QRO example foreign investor $980,000 → $37,125 + $78,400", () => {
  const r = run({ price: 980_000, foreignPurchaser: true });
  assert.equal(r.transferDuty, 37_125);
  assert.equal(r.surcharge, 78_400);
  // From 1 Aug 2026 a foreign (non-retiree) buyer cannot claim home or first home concessions.
  const f = run({ price: 650_000, foreignPurchaser: true, ownerOccupier: true, firstHomeBuyer: true });
  assert.equal(f.transferDuty, run({ price: 650_000 }).transferDuty);
  assert.equal(f.surcharge, 52_000);
});

test("QLD FHOG $30,000: new homes valued less than $750,000", () => {
  const g = (o: Partial<StampDutyInput>) => run({ ownerOccupier: true, firstHomeBuyer: true, propertyType: "new", ...o });
  assert.equal(g({ price: 749_999 }).fhogAmount, 30_000);
  assert.equal(g({ price: 750_000 }).fhogEligible, false); // "not eligible ... if the value is $750,000 or more"
  assert.equal(g({ price: 600_000, propertyType: "established" }).fhogEligible, false);
  assert.equal(g({ price: 300_000, propertyType: "vacant-land", buildContractPrice: 400_000 }).fhogAmount, 30_000);
});

test("QLD Titles fees FY2026/27: transfer $248.04 + $46.56 per $10,000 or part over $180,000; mortgage $248.04", () => {
  assert.equal(run({ price: 180_000 }).transferFee, 248.04);
  assert.equal(run({ price: 180_001 }).transferFee, 294.6);
  assert.equal(run({ price: 600_000 }).transferFee, 2_203.56);
  assert.equal(run({ price: 750_000 }).transferFee, 2_901.96);
  assert.equal(run({ price: 1_000_000 }).transferFee, 4_065.96);
  assert.equal(run({ price: 1_000_000 }).mortgageRegFee, 248.04);
});
