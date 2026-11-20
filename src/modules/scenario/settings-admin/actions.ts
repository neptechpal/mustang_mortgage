"use server";
// /admin/scenario-settings server actions (ADMIN only).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { AI_MODELS, STAGES, saveChecklists, saveScenarioSettings, type Checklists } from "../settings";
import { bool, errMessage, fail, oneOf, text } from "../policy/form";
import { fromDateInput, toDateInput, withQuery } from "../policy/meta";
import { removeAnthropicKey, saveAnthropicKey } from "../secret";
import { testAnthropicKey } from "../ai";

const PATH = "/admin/scenario-settings";

function intIn(fd: FormData, k: string, label: string, min: number, max: number) {
  const n = Number(text(fd, k, 10));
  if (!Number.isInteger(n) || n < min || n > max) fail(`${label}: whole number between ${min} and ${max}`);
  return n;
}

export async function saveScenarioSettingsAction(fd: FormData) {
  await requireAdmin();
  let msg = "";
  try {
    const aiEnabled = bool(fd, "aiEnabled");
    const privacyConfirmed = bool(fd, "privacyConfirmed");
    await saveScenarioSettings({
      aiEnabled,
      model: oneOf(fd, "model", AI_MODELS, "Model"),
      effort: oneOf(fd, "effort", ["low", "medium", "high"] as const, "Effort"),
      privacyConfirmed,
      privacyNote: text(fd, "privacyNote", 2000),
      taskDueDays: intIn(fd, "taskDueDays", "Task due days", 0, 60),
      reviewDays: intIn(fd, "reviewDays", "Review period", 7, 730),
    });
    msg = aiEnabled && !privacyConfirmed ? "Saved. AI is ON but privacy is not confirmed — do not process live enquiries with AI yet." : "Settings saved.";
  } catch (e) {
    revalidatePath(PATH);
    redirect(withQuery(PATH, { err: errMessage(e) }));
  }
  revalidatePath(PATH);
  redirect(withQuery(PATH, { msg }) + "#ai");
}

const itemSchema = z.object({
  key: z.string().trim().regex(/^[a-z0-9_]{1,60}$/, "keys use a–z, 0–9 and _ only"),
  label: z.string().trim().min(1, "label is required").max(200),
  kind: z.enum(["check", "date"]),
  required: z.boolean(),
  help: z.string().trim().max(500).optional(),
});

export async function saveChecklistsAction(fd: FormData) {
  const s = await requireAdmin();
  let msg = "";
  try {
    let raw: unknown;
    try {
      raw = JSON.parse(text(fd, "stages", 100_000) || "{}");
    } catch {
      fail("Checklist data is not valid JSON");
    }
    const stages: Checklists["stages"] = {};
    for (const [stage, stageLabel] of STAGES) {
      const list = (raw as Record<string, unknown>)?.[stage];
      if (list === undefined) {
        stages[stage] = [];
        continue;
      }
      const r = z.array(itemSchema).max(40, "max 40 items per stage").safeParse(list);
      if (!r.success) fail(`${stageLabel}: ${r.error.issues.map((i) => `item ${Number(i.path[0]) + 1 || ""} ${i.message}`.trim()).join("; ")}`);
      const items = (r as { data: z.infer<typeof itemSchema>[] }).data;
      const keys = new Set<string>();
      for (const it of items) {
        if (keys.has(it.key)) fail(`${stageLabel}: duplicate key "${it.key}"`);
        keys.add(it.key);
      }
      stages[stage] = items.map((it) => ({ key: it.key, label: it.label, kind: it.kind, required: it.required, ...(it.help ? { help: it.help } : {}) }));
    }
    const confirmed = bool(fd, "confirmed");
    const atRaw = text(fd, "confirmedAt", 20);
    if (atRaw && !fromDateInput(atRaw)) fail("Confirmed on: invalid date");
    await saveChecklists({
      confirmed,
      confirmedBy: text(fd, "confirmedBy", 160) || (confirmed ? s.name : ""),
      confirmedAt: atRaw || (confirmed ? toDateInput(new Date()) : ""),
      note: text(fd, "note", 4000),
      stages,
    });
    msg = confirmed ? "Checklist templates saved." : "Checklist templates saved (still unconfirmed by the licensee / aggregator).";
  } catch (e) {
    revalidatePath(PATH);
    redirect(withQuery(PATH, { err: errMessage(e) }) + "#checklists");
  }
  revalidatePath(PATH);
  redirect(withQuery(PATH, { msg }) + "#checklists");
}

/** Save / replace / remove the Anthropic API key (stored encrypted; never echoed back). */
export async function saveApiKeyAction(fd: FormData) {
  const s = await requireAdmin();
  const op = String(fd.get("op") ?? "save");
  let q: Record<string, string>;
  try {
    if (op === "remove") {
      await removeAnthropicKey();
      q = { msg: "API key removed. AI calls are unavailable until a key is set." };
    } else if (op === "test") {
      const r = await testAnthropicKey();
      q = r.ok ? { msg: r.message } : { warn: `Connection test failed: ${r.message}` };
    } else {
      await saveAnthropicKey(String(fd.get("apiKey") ?? ""), s.name);
      const r = await testAnthropicKey();
      q = r.ok ? { msg: `API key saved (encrypted). ${r.message}` } : { warn: `API key saved (encrypted), but the connection test failed: ${r.message}` };
    }
  } catch (e) {
    q = { err: errMessage(e) };
  }
  revalidatePath(PATH);
  redirect(withQuery(PATH, q) + "#apikey");
}
