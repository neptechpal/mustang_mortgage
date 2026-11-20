// Server orchestration. Dependencies can be replaced in tests; no model call when AI is off.
import { AiUnavailable, callStructuredModel } from "./ai";
import { getScenarioSettings } from "./settings";
import { getAnthropicKey } from "./secret";
import { loadPanel } from "./service";
import {
  computeQuickScenario, QuickOutputSchema, quickPanelEvidence, quickPayloadInputs, QUICK_SYSTEM, validateQuickOutput,
  type QuickDeterministic, type QuickOutput, type QuickEvidence,
} from "./quick-core";

export type QuickResult = QuickDeterministic & {
  assessment: QuickOutput; aiStatus: "off" | "ok" | "partial" | "unavailable";
  aiMessage: string; withheld: number; model: string | null;
};
type Dependencies = {
  settings: typeof getScenarioSettings;
  key: typeof getAnthropicKey;
  panel: () => Promise<QuickEvidence[]>;
  explain: (payload: string) => Promise<{ data: QuickOutput; model: string }>;
};
const defaults: Dependencies = {
  settings: getScenarioSettings, key: getAnthropicKey,
  panel: async () => quickPanelEvidence(await loadPanel(0)),
  explain: (payload) => callStructuredModel(QuickOutputSchema, QUICK_SYSTEM, payload, 8000, { maxEffort: "medium" }),
};

export async function runQuickScenario(raw: unknown, overrides: Partial<Dependencies> = {}, now = new Date()): Promise<QuickResult> {
  const d = { ...defaults, ...overrides };
  const base = computeQuickScenario(raw, now);
  const result: QuickResult = { ...base, assessment: base.fallback, aiStatus: "off", aiMessage: "AI is off in Scenario settings. Calculations and the rule-based checklist are available.", withheld: 0, model: null };
  try {
    const settings = await d.settings();
    if (!settings.aiEnabled) return result;
    if (!await d.key()) return { ...result, aiMessage: "AI is off because no readable Anthropic API key is configured. Calculations and the rule-based checklist are available." };
    const panel = await d.panel();
    const ev = [...base.evidence, ...panel];
    const inputs = quickPayloadInputs(raw);
    const payload = JSON.stringify({ task: "Prepare an initial broker conversation using these estimates and evidence; no recommendation or approval.", inputs, evidence: ev });
    const { data, model } = await d.explain(payload);
    const { assessment, withheld } = validateQuickOutput(QuickOutputSchema.parse(data), ev, inputs);
    return {
      ...result, evidence: ev, assessment: { ...assessment,
        questionsToAsk: [...new Set([...assessment.questionsToAsk, ...base.fallback.questionsToAsk])],
        documentsToRequest: [...new Set([...assessment.documentsToRequest, ...base.fallback.documentsToRequest])],
        nextSteps: [...new Set([...assessment.nextSteps, ...base.fallback.nextSteps])],
      },
      aiStatus: withheld ? "partial" : "ok", withheld, model,
      aiMessage: withheld ? `${withheld} AI items withheld because they could not be safely supported by the supplied evidence.` : "AI talking points checked against the supplied evidence. Broker verification is still required.",
    };
  } catch (e) {
    const message = e instanceof AiUnavailable ? e.message : "AI explanation is unavailable (settings, evidence or response could not be read).";
    return { ...result, aiStatus: "unavailable", aiMessage: `${message} Calculations and the rule-based checklist are still available.` };
  }
}
