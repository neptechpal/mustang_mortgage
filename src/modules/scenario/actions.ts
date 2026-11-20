"use server";
// Server actions for the case Scenario page. Every action re-checks staff access and the case.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { FIELD_DEFS, type FactInput } from "./facts";
import * as svc from "./service";

type Tab = "facts" | "analysis" | "ask" | "review" | "tasks" | "history";

async function guard(caseId: number) {
  const s = await requireStaff();
  if (!Number.isInteger(caseId) || !(await prisma.case.findUnique({ where: { id: caseId }, select: { id: true } }))) throw new Error("Case not found");
  return { uid: s.uid, name: s.name };
}
function back(caseId: number, tab: Tab, extra: Record<string, string> = {}): never {
  revalidatePath(`/admin/cases/${caseId}/scenario`);
  const q = new URLSearchParams({ tab, ...extra });
  redirect(`/admin/cases/${caseId}/scenario?${q}`);
}
const msg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong").slice(0, 400);

export async function saveFactsAction(caseId: number, fd: FormData) {
  const who = await guard(caseId);
  const edits: Record<string, FactInput> = {};
  for (const d of FIELD_DEFS) {
    const present = fd.has(`f:${d.key}`) || fd.has(`f:${d.key}:amount`) || fd.has(`present:${d.key}`);
    if (!present) continue;
    let v: unknown;
    if (d.type === "income") {
      const amount = String(fd.get(`f:${d.key}:amount`) ?? "").trim();
      v = amount === "" ? null : { amount: amount.replace(/[$,\s]/g, ""), freq: fd.get(`f:${d.key}:freq`), basis: fd.get(`f:${d.key}:basis`), months: String(fd.get(`f:${d.key}:months`) ?? "").trim() };
    } else if (d.type === "multi") v = fd.getAll(`f:${d.key}`).map(String);
    else v = String(fd.get(`f:${d.key}`) ?? "").trim();
    edits[d.key] = { v, ok: fd.get(`ok:${d.key}`) === "1" };
  }
  let res: Awaited<ReturnType<typeof svc.saveFacts>>;
  try {
    res = await svc.saveFacts(caseId, edits, who);
  } catch (e) {
    back(caseId, "facts", { err: msg(e) });
  }
  if (!res.ok) back(caseId, "facts", { err: res.errors.join(" · ") });
  const then = fd.get("then") === "run";
  if (then) {
    try {
      await svc.runAssessment(caseId, who);
    } catch (e) {
      back(caseId, "facts", { err: msg(e) });
    }
    back(caseId, "analysis", { msg: "Facts saved and assessment run." });
  }
  back(caseId, "facts", { msg: res.superseded ? `Facts saved — ${res.superseded} earlier analysis marked superseded. Rerun when ready.` : "Facts saved." });
}

export async function reimportAction(caseId: number) {
  const who = await guard(caseId);
  await svc.reimportEnquiry(caseId, who);
  back(caseId, "facts", { msg: "Unknown fields re-filled from the enquiry (broker values kept)." });
}

export async function runAction(caseId: number) {
  const who = await guard(caseId);
  try {
    await svc.runAssessment(caseId, who);
  } catch (e) {
    back(caseId, "analysis", { err: msg(e) });
  }
  back(caseId, "analysis", { msg: "Assessment complete." });
}

export async function saveDraftsAction(caseId: number, assessmentId: number, fd: FormData) {
  await guard(caseId);
  const selections: Record<string, { decision: string; reason: string }> = {};
  for (const k of fd.keys()) {
    const m = /^sel:(.+)$/.exec(k);
    if (m) selections[m[1]] = { decision: String(fd.get(k)), reason: String(fd.get(`why:${m[1]}`) ?? "").trim().slice(0, 1000) };
  }
  const tab = (String(fd.get("tab") || "review") as Tab);
  try {
    await svc.saveDrafts(assessmentId, {
      clientUpdate: fd.has("clientUpdate") ? String(fd.get("clientUpdate")) : undefined,
      bdmDraft: fd.has("bdmDraft") ? String(fd.get("bdmDraft")) : undefined,
      rationale: fd.has("rationale") ? String(fd.get("rationale")) : undefined,
      overrideReason: fd.has("overrideReason") ? String(fd.get("overrideReason")) : undefined,
      selections: Object.keys(selections).length ? selections : undefined,
    });
    if (fd.get("signoff") === "1") {
      const who = await guard(caseId);
      await svc.signOff(assessmentId, who);
      back(caseId, "review", { msg: "Analysis reviewed and signed off." });
    }
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e; // let redirect() through
    back(caseId, tab, { err: msg(e) });
  }
  back(caseId, tab, { msg: "Saved." });
}

export async function askAction(caseId: number, assessmentId: number, fd: FormData) {
  const who = await guard(caseId);
  try {
    await svc.ask(assessmentId, String(fd.get("question") ?? ""), who);
  } catch (e) {
    back(caseId, "ask", { err: msg(e) });
  }
  back(caseId, "ask");
}

export async function addSvcAction(caseId: number, fd: FormData) {
  const who = await guard(caseId);
  const lenderId = Number(fd.get("lenderId"));
  const productId = fd.get("productId") ? Number(fd.get("productId")) : null;
  const maxBorrowing = Number(String(fd.get("maxBorrowing") ?? "").replace(/[$,\s]/g, ""));
  const calculator = String(fd.get("calculator") ?? "").trim().slice(0, 200);
  const date = String(fd.get("calculatedAt") ?? "");
  const calculatedAt = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T12:00:00+11:00`) : null;
  if (!Number.isInteger(lenderId) || !calculator || !Number.isFinite(maxBorrowing) || maxBorrowing <= 0 || !calculatedAt || calculatedAt.getTime() > Date.now() + 86400_000)
    back(caseId, "analysis", { err: "Calculator result needs lender, calculator name, a positive maximum and a date (not in the future)." });
  await svc.addServiceability(caseId, { lenderId, productId, calculator, maxBorrowing, calculatedAt, note: String(fd.get("note") ?? "").slice(0, 1000) }, who);
  back(caseId, "analysis", { msg: "Calculator result recorded. Rerun the assessment to refresh the shortlist." });
}

export async function taskAction(caseId: number, fd: FormData) {
  const who = await guard(caseId);
  const id = Number(fd.get("id"));
  const op = String(fd.get("op"));
  const due = String(fd.get("dueAt") ?? "");
  try {
    if (op === "done" || op === "open") await svc.updateTask(id, { status: op }, who);
    else if (op === "edit")
      await svc.updateTask(id, { owner: String(fd.get("owner") ?? "").trim().slice(0, 100), dueAt: /^\d{4}-\d{2}-\d{2}$/.test(due) ? new Date(`${due}T09:00:00+11:00`) : null }, who);
  } catch (e) {
    back(caseId, "tasks", { err: msg(e) });
  }
  back(caseId, "tasks");
}

export async function complianceAction(caseId: number, fd: FormData) {
  const who = await guard(caseId);
  const stage = String(fd.get("stage"));
  const key = String(fd.get("key"));
  const date = String(fd.get("date") ?? "");
  await svc.setComplianceItem(caseId, stage, key, { done: fd.get("done") === "1" || /^\d{4}-\d{2}-\d{2}$/.test(date), date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "", evidence: String(fd.get("evidence") ?? "").slice(0, 1000) }, who);
  back(caseId, "tasks");
}

export async function gateAction(caseId: number, fd: FormData) {
  const who = await guard(caseId);
  const gate = fd.get("gate") === "application_ready" ? "application_ready" : "recommendation_ready";
  try {
    await svc.markGate(caseId, gate, { rationale: String(fd.get("rationale") ?? ""), overrideReason: String(fd.get("overrideReason") ?? "") }, who);
  } catch (e) {
    back(caseId, "review", { err: msg(e) });
  }
  back(caseId, "review", { msg: gate === "recommendation_ready" ? "Recommendation marked ready to share." : "Application marked ready to lodge." });
}

export async function revokeGateAction(caseId: number, fd: FormData) {
  await guard(caseId);
  await prisma.scnReviewGate.updateMany({ where: { id: Number(fd.get("id")), caseId }, data: { revoked: true } });
  back(caseId, "review", { msg: "Review gate revoked." });
}
