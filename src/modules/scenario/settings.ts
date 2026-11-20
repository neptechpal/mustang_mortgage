// Scenario assistant settings (Setting key "scenario.settings") and compliance checklist templates
// (Setting key "scenario.checklists"). The AI kill switch only disables model calls — the enquiry
// form, lead workflow, facts, calculations and the deterministic shortlist keep working.
import { getSetting, setSetting } from "@/lib/settings";

export type Effort = "low" | "medium" | "high";
export type ScenarioSettings = {
  aiEnabled: boolean;
  model: string;
  effort: Effort;
  /** Business has confirmed privacy notice / consent / provider assessment for live enquiries. */
  privacyConfirmed: boolean;
  privacyNote: string;
  /** Default days until a generated follow-up task is due. */
  taskDueDays: number;
  /** Days before a rule/price record review is due by default. */
  reviewDays: number;
};

export const SCENARIO_DEFAULTS: ScenarioSettings = {
  aiEnabled: false,
  model: "claude-opus-5-5",
  effort: "medium",
  privacyConfirmed: false,
  privacyNote: "",
  taskDueDays: 2,
  reviewDays: 90,
};
export const AI_MODELS: [string, string][] = [
  ["claude-opus-5-5", "Claude Opus 5.5 (default)"],
  ["claude-sonnet-5-5", "Claude Sonnet 5.5 (lower cost)"],
];

export async function getScenarioSettings(): Promise<ScenarioSettings> {
  return getSetting<ScenarioSettings>("scenario.settings", SCENARIO_DEFAULTS);
}
export async function saveScenarioSettings(s: Partial<ScenarioSettings>) {
  await setSetting("scenario.settings", { ...(await getScenarioSettings()), ...s });
}

export type ChecklistItem = { key: string; label: string; kind: "check" | "date"; required: boolean; help?: string };
export type Checklists = { confirmed: boolean; confirmedBy: string; confirmedAt: string; note: string; stages: Record<string, ChecklistItem[]> };
export const STAGES: [string, string][] = [
  ["enquiry", "Enquiry"],
  ["recommendation", "Recommendation"],
  ["application", "Application"],
  ["approval", "Approval"],
  ["settlement", "Settlement"],
];

/** Starter templates only — the licensee / aggregator must confirm items, triggers and retention before launch. */
export const DEFAULT_CHECKLISTS: Checklists = {
  confirmed: false,
  confirmedBy: "",
  confirmedAt: "",
  note: "Draft starter checklist (RG 273 best interests duty / RG 209 responsible lending themes). Not confirmed by the licensee or aggregator.",
  stages: {
    enquiry: [
      { key: "credit_guide", label: "Credit Guide provided", kind: "date", required: true },
      { key: "privacy", label: "Privacy collection notice / consent recorded", kind: "date", required: true },
      { key: "objectives", label: "Client objectives and requirements recorded", kind: "check", required: true },
      { key: "financial_inquiries", label: "Financial situation inquiries made", kind: "check", required: true },
    ],
    recommendation: [
      { key: "preliminary_assessment", label: "Preliminary assessment completed (not unsuitable)", kind: "check", required: true },
      { key: "alternatives", label: "Alternatives considered and recorded", kind: "check", required: true },
      { key: "conflicts", label: "Conflicts of interest considered / disclosed", kind: "check", required: true },
      { key: "bid_rationale", label: "Best-interests rationale recorded", kind: "check", required: true },
      { key: "credit_proposal", label: "Credit proposal disclosure / quote provided", kind: "date", required: true },
    ],
    application: [
      { key: "verification", label: "Income, expenses and identity verification evidence held", kind: "check", required: true },
      { key: "calculator_current", label: "Lender calculator result current for the selected lender", kind: "check", required: true },
      { key: "client_confirmed", label: "Client confirmed application details", kind: "check", required: true },
    ],
    approval: [
      { key: "conditions_reviewed", label: "Approval conditions reviewed with client", kind: "check", required: true },
      { key: "loan_docs", label: "Loan documents explained / issued", kind: "date", required: false },
    ],
    settlement: [
      { key: "settled", label: "Settlement confirmed", kind: "date", required: true },
      { key: "retention", label: "File retained per licensee retention requirement", kind: "check", required: true },
    ],
  },
};

export async function getChecklists(): Promise<Checklists> {
  const c = await getSetting<Checklists>("scenario.checklists", DEFAULT_CHECKLISTS);
  return { ...DEFAULT_CHECKLISTS, ...c, stages: { ...DEFAULT_CHECKLISTS.stages, ...(c.stages ?? {}) } };
}
export async function saveChecklists(c: Checklists) {
  await setSetting("scenario.checklists", c);
}
