// AI calls (Claude via the official Anthropic SDK). Pure payload/validation logic is in ai-core.ts.
export { PROMPT_VERSION } from "./ai-core";
import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod/v4";
import type { Facts } from "./facts";
import type { ScenarioCalc } from "./calc";
import type { EngineResult } from "./engine";
import { getScenarioSettings } from "./settings";
import { getAnthropicKey } from "./secret";
import { AnswerOut, ASK_SYSTEM, AssessmentOut, calcSummary, candidateView, minimalFacts, redact, SYSTEM, validateAnswer, validateAssessment, type EvidenceItem } from "./ai-core";

/* ------------------------------------------------------------------ model call */

export class AiUnavailable extends Error {}

/** Shared structured call. The optional cap only lowers effort; existing assessments keep their settings. */
export async function callStructuredModel<T>(schema: z.ZodType<T>, system: string, user: string, maxTokens: number, options: { maxEffort?: "medium" } = {}): Promise<{ data: T; model: string }> {
  const s = await getScenarioSettings();
  if (!s.aiEnabled) throw new AiUnavailable("AI is switched off in Scenario settings");
  const apiKey = await getAnthropicKey();
  if (!apiKey) throw new AiUnavailable("No Anthropic API key is configured (Scenario settings → API key)");
  const client = new Anthropic({ apiKey, timeout: 120_000, maxRetries: 1 });
  try {
    const res = await client.beta.messages.parse({
      model: s.model,
      max_tokens: maxTokens,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      output_config: { effort: options.maxEffort === "medium" && s.effort === "high" ? "medium" : s.effort, format: betaZodOutputFormat(schema) },
      messages: [{ role: "user", content: user }],
    });
    if (res.stop_reason === "refusal") throw new AiUnavailable("The model declined this request");
    if (res.stop_reason === "max_tokens") throw new AiUnavailable("The model response was cut off (max tokens)");
    if (!res.parsed_output) throw new AiUnavailable("The model response did not match the required schema");
    return { data: res.parsed_output as T, model: res.model };
  } catch (e) {
    if (e instanceof AiUnavailable) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new AiUnavailable("AI provider rejected the API key");
    if (e instanceof Anthropic.RateLimitError) throw new AiUnavailable("AI provider rate limit — try again shortly");
    if (e instanceof Anthropic.APIError) throw new AiUnavailable(`AI provider error ${e.status ?? ""}`.trim());
    throw new AiUnavailable("AI request failed (network or parsing)");
  }
}

/* ------------------------------------------------------------------ public entry points */

export function payloadHash(s: string) {
  return createHash("sha256").update(s).digest("hex").slice(0, 16);
}

export async function explainAssessment(input: { facts: Facts; calc: ScenarioCalc; engine: EngineResult; evidence: EvidenceItem[] }) {
  const allowed = new Set(input.evidence.map((e) => e.id));
  const facts = minimalFacts(input.facts);
  const body = {
    task: "Explain the server's shortlist for each candidate, list open questions, missing facts, assumptions and next actions; draft a client update and, if needed, a BDM enquiry.",
    scenario: facts,
    calculations: calcSummary(input.calc),
    candidates: input.engine.candidates.map((c) => candidateView(c, allowed)),
    evidence: input.evidence.map((e) => ({ id: e.id, kind: e.kind, lenderId: e.lenderId, content: e.text })),
  };
  const user = JSON.stringify(body);
  const { data, model } = await callStructuredModel(AssessmentOut, SYSTEM, user, 16000);
  const factsJson = JSON.stringify({ facts, calc: calcSummary(input.calc) });
  const v = validateAssessment(data, input.engine, input.evidence, factsJson);
  return { ...v, model, payloadHash: payloadHash(user) };
}

export async function answerQuestion(input: { question: string; facts: Facts; calc: ScenarioCalc; engine: EngineResult; evidence: EvidenceItem[] }) {
  const allowed = new Set(input.evidence.map((e) => e.id));
  const facts = minimalFacts(input.facts);
  const user = JSON.stringify({
    question: redact(input.question, 600),
    scenario: facts,
    calculations: calcSummary(input.calc),
    candidates: input.engine.candidates.map((c) => candidateView(c, allowed)),
    evidence: input.evidence.map((e) => ({ id: e.id, kind: e.kind, lenderId: e.lenderId, content: e.text })),
  });
  const { data, model } = await callStructuredModel(AnswerOut, ASK_SYSTEM, user, 6000);
  return { ...validateAnswer(data, input.evidence, JSON.stringify({ facts, calc: calcSummary(input.calc) })), model };
}

/** Cheap credential check for the settings page (no tokens used): retrieve the configured model. */
export async function testAnthropicKey(): Promise<{ ok: boolean; message: string }> {
  const apiKey = await getAnthropicKey();
  if (!apiKey) return { ok: false, message: "No API key configured." };
  const s = await getScenarioSettings();
  try {
    const m = await new Anthropic({ apiKey, timeout: 20_000, maxRetries: 0 }).models.retrieve(s.model);
    return { ok: true, message: `Key works — ${m.display_name} is available.` };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return { ok: false, message: "The provider rejected this API key." };
    if (e instanceof Anthropic.PermissionDeniedError) return { ok: false, message: "This key has no access to the selected model." };
    if (e instanceof Anthropic.NotFoundError) return { ok: false, message: `Model ${s.model} not found for this key.` };
    if (e instanceof Anthropic.APIError) return { ok: false, message: `Provider error ${e.status ?? ""}`.trim() };
    return { ok: false, message: "Could not reach the AI provider." };
  }
}
