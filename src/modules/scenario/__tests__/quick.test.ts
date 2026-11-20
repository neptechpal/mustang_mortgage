// Quick Scenario: privacy boundary, deterministic figures, AI output validation and the AI-off path.
// Run: npx tsx --test src/modules/scenario/__tests__/*.test.ts  (no network; the model call is mocked)
import { test } from "node:test";
import assert from "node:assert/strict";
import { calcStampDuty } from "../../calc/stampDuty";
import { computeQuickScenario, quickNote, quickPayloadInputs, validateQuickOutput, type QuickOutput } from "../quick-core";
import { runQuickScenario } from "../quick";
import { SCENARIO_DEFAULTS } from "../settings";

const NOW = new Date("2026-11-20T00:00:00Z");
const FIRST_HOME = {
  goal: "first_home", state: "NSW", price: 750_000, funds: 80_000, applicantCount: 2,
  applicant1: { income: 95_000, employment: "full_time", monthsInJob: 30 },
  applicant2: { income: 70_000, employment: "part_time", monthsInJob: 14 },
  residency: "permanent", dependants: 0, otherRepayments: 0, cardLimits: 10_000, propertyType: "established", ratePct: 6.2,
  anythingElse: "Gift from parents. Call Ram Sharma on 0412 345 678 or ram@example.com, 12 George Street",
};

test("payload allowlist: free text never leaves as text, amounts rounded, unknown keys dropped", () => {
  const p = quickPayloadInputs({ ...FIRST_HOME, price: 751_234, secretField: "x" });
  const json = JSON.stringify(p);
  assert.equal(p.price, 751_200);
  assert.deepEqual(p.topics, ["gift"]);
  for (const leak of ["Ram", "Sharma", "0412", "example.com", "George", "secretField", "anythingElse"]) assert.ok(!json.includes(leak), `leaked ${leak}`);
});

test("NSW first-home duty figures come straight from the verified engine", () => {
  const r = computeQuickScenario(FIRST_HOME, NOW);
  const base = { state: "NSW" as const, price: 750_000, propertyType: "established" as const, ownerOccupier: true, foreignPurchaser: false, citizenOrPR: true };
  const fig = (k: string) => r.figures.find((f) => f.key === k)?.value;
  assert.equal(fig("dutyWith"), calcStampDuty({ ...base, firstHomeBuyer: true }).transferDuty);
  assert.equal(fig("dutyWithout"), calcStampDuty({ ...base, firstHomeBuyer: false }).transferDuty);
  assert.equal(fig("dutyWith"), 0); // NSW FHBAS full exemption up to $800,000
  assert.ok((fig("borrowing") ?? 0) > 0);
  assert.equal(r.input.anythingElse, ""); // raw notes are not retained in the result
});

test("temporary visa is priced conservatively and flagged", () => {
  const r = computeQuickScenario({ ...FIRST_HOME, residency: "visa", visaSubclass: "482" }, NOW);
  assert.ok((r.figures.find((f) => f.key === "surcharge")?.value ?? 0) > 0);
  assert.ok(r.warnings.some((w) => /visa/i.test(w)));
  assert.equal(r.scheme.residencyEligible, "no");
});

const output = (over: Partial<QuickOutput> = {}): QuickOutput => ({
  headline: "A workable starting point if the income and savings check out.",
  confidence: "high",
  talkingPoints: [
    { text: "As a first home buyer here, the estimated transfer duty is $0.", sourceIds: ["DUTY"] },
    { text: "Your borrowing power could be around $9,999,999 on these numbers.", sourceIds: ["BORROW"] },
    { text: "We will verify your income and expenses before confirming anything.", sourceIds: ["CHECKLIST"] },
    { text: "This is guaranteed to be approved.", sourceIds: ["CHECKLIST"] },
    { text: "Rates at Example Bank suit you.", sourceIds: ["NOPE"] },
  ],
  keyNumbers: [], strengths: ["Stable employment history"], watchOuts: [],
  questionsToAsk: ["Call me on 0412 345 678"], documentsToRequest: ["Recent payslips"], nextSteps: ["Book a full assessment"], complianceReminders: [],
  ...over,
});

test("validation withholds unsupported numbers, unknown sources, guarantees and contact details", () => {
  const r = computeQuickScenario(FIRST_HOME, NOW);
  const inputs = quickPayloadInputs(FIRST_HOME);
  const { assessment, withheld } = validateQuickOutput(output(), r.evidence, inputs);
  const texts = assessment.talkingPoints.map((t) => t.text);
  assert.ok(texts.some((t) => t.includes("$0")));
  assert.ok(!texts.some((t) => t.includes("9,999,999")));
  assert.ok(!texts.some((t) => /guaranteed/i.test(t)));
  assert.ok(!texts.some((t) => t.includes("Example Bank")));
  assert.equal(assessment.questionsToAsk.length, 0);
  assert.ok(withheld >= 4);
  assert.notEqual(assessment.confidence, "high"); // never more than medium; low once anything was withheld
  assert.ok(assessment.complianceReminders.some((c) => /Credit Guide/.test(c)));
});

test("AI off: deterministic result, no model call", async () => {
  let called = false;
  const r = await runQuickScenario(FIRST_HOME, {
    settings: async () => ({ ...SCENARIO_DEFAULTS, aiEnabled: false }),
    key: async () => "sk-test",
    panel: async () => [],
    explain: async () => { called = true; throw new Error("should not be called"); },
  }, NOW);
  assert.equal(called, false);
  assert.equal(r.aiStatus, "off");
  assert.ok(r.figures.length > 0);
  assert.ok(r.assessment.talkingPoints.length >= 4);
});

test("AI on: payload carries no free text; output validated", async () => {
  let sent = "";
  const r = await runQuickScenario(FIRST_HOME, {
    settings: async () => ({ ...SCENARIO_DEFAULTS, aiEnabled: true }),
    key: async () => "sk-test",
    panel: async () => [],
    explain: async (payload) => { sent = payload; return { data: output(), model: "claude-opus-5-5" }; },
  }, NOW);
  for (const leak of ["Ram", "0412", "example.com", "George"]) assert.ok(!sent.includes(leak), `payload leaked ${leak}`);
  assert.equal(r.aiStatus, "partial");
  assert.ok(r.withheld > 0);
  const note = quickNote(r);
  assert.ok(note.body.includes("Applicant 2:"));
  assert.ok(!note.body.includes("{"), "note should be readable text, not JSON");
});
