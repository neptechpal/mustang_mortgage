// Scenario assistant orchestration (DB). Analyses are stored independently of the lead (Case) so
// reruns never overwrite reviewed history. Callers must already have checked staff access.
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logActivity } from "@/modules/crm/activity";
import { applyEdits, factsHash, labelOf, prefill, serviceabilityHash, type FactInput, type Facts } from "./facts";
import { calcScenario, CALC_VERSION, type ScenarioCalc } from "./calc";
import { runEngine, TIER_LABEL, type EngineResult, type LenderIn, type PriceIn, type RuleIn, type SourceIn, type SvcIn } from "./engine";
import { buildEvidence, PROMPT_VERSION, type ValidatedAi } from "./ai-core";
import { AiUnavailable, answerQuestion, explainAssessment } from "./ai";
import { planTasks } from "./tasks";
import { getChecklists, getScenarioSettings } from "./settings";

type Who = { uid: number; name: string };
const json = (v: unknown) => v as Prisma.InputJsonValue;

/* ------------------------------------------------------------------ facts */

export async function findEnquirySubmission(c: { app1Email: string; legacyEmail: string; createdAt: Date }) {
  const emails = [c.app1Email, c.legacyEmail].map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!emails.length) return null;
  const subs = await prisma.formSubmission.findMany({
    where: { formKey: { in: ["mmf:3012", "cf7:1767"] }, email: { in: emails, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  // closest submission at or before the case was created (lead form creates both at once)
  return subs.find((s) => s.createdAt.getTime() <= c.createdAt.getTime() + 120_000) ?? subs[subs.length - 1] ?? null;
}

export async function loadFacts(caseId: number) {
  const c = await prisma.case.findUnique({ where: { id: caseId } });
  if (!c) return null;
  let row = await prisma.scnFacts.findUnique({ where: { caseId } });
  if (!row) {
    const sub = await findEnquirySubmission(c);
    const facts = prefill({}, {
      loanType: c.loanType, loanAmount: c.loanAmount, applicantCount: c.applicantCount, settlementDate: c.settlementDate,
      submission: (sub?.data as Record<string, unknown>) ?? null,
    });
    row = await prisma.scnFacts.create({ data: { caseId, submissionId: sub?.id ?? null, facts: json(facts), hash: factsHash(facts), updatedBy: "system (pre-filled from enquiry)" } });
  }
  return { case: c, row, facts: (row.facts ?? {}) as Facts };
}

/** Save broker corrections. If any value changed, every current analysis is marked superseded. */
export async function saveFacts(caseId: number, edits: Record<string, FactInput>, who: Who) {
  const cur = await loadFacts(caseId);
  if (!cur) throw new Error("Case not found");
  const { facts, errors } = applyEdits(cur.facts, edits);
  if (errors.length) return { ok: false as const, errors };
  const hash = factsHash(facts);
  await prisma.scnFacts.update({ where: { caseId }, data: { facts: json(facts), hash, updatedBy: who.name } });
  let superseded = 0;
  if (hash !== cur.row.hash) {
    const r = await prisma.scnAssessment.updateMany({
      where: { caseId, status: { in: ["draft", "reviewed"] }, factsHash: { not: hash } },
      data: { status: "superseded", supersededAt: new Date(), supersededWhy: `Facts changed by ${who.name}` },
    });
    superseded = r.count;
    if (superseded) await logActivity(caseId, "scenario", `Scenario facts changed — ${superseded} analysis marked superseded`, who.name);
  }
  return { ok: true as const, superseded };
}

export async function reimportEnquiry(caseId: number, who: Who) {
  const cur = await loadFacts(caseId);
  if (!cur) throw new Error("Case not found");
  const sub = cur.row.submissionId ? await prisma.formSubmission.findUnique({ where: { id: cur.row.submissionId } }) : await findEnquirySubmission(cur.case);
  const c = cur.case;
  const facts = prefill(cur.facts, { loanType: c.loanType, loanAmount: c.loanAmount, applicantCount: c.applicantCount, settlementDate: c.settlementDate, submission: (sub?.data as Record<string, unknown>) ?? null });
  await prisma.scnFacts.update({ where: { caseId }, data: { facts: json(facts), hash: factsHash(facts), submissionId: sub?.id ?? cur.row.submissionId, updatedBy: who.name } });
}

/* ------------------------------------------------------------------ panel + evidence */

export async function loadPanel(caseId: number) {
  const [lenders, rules, prices, sources, svc] = await Promise.all([
    prisma.scnLender.findMany({ include: { products: true }, orderBy: [{ sort: "asc" }, { name: "asc" }] }),
    prisma.scnPolicyRule.findMany({ where: { status: "published", OR: [{ caseId: null }, { caseId }] } }),
    prisma.scnPriceRecord.findMany({ where: { status: "published", OR: [{ caseId: null }, { caseId }] } }),
    prisma.scnSource.findMany({ where: { OR: [{ caseId: null }, { caseId }] } }),
    prisma.scnServiceability.findMany({ where: { caseId }, orderBy: { calculatedAt: "desc" } }),
  ]);
  return {
    lenders: lenders as unknown as LenderIn[],
    rules: rules as unknown as RuleIn[],
    prices: prices as unknown as PriceIn[],
    sources: sources as unknown as SourceIn[],
    svc: svc as unknown as SvcIn[],
  };
}

export function evaluate(caseId: number, facts: Facts, panel: Awaited<ReturnType<typeof loadPanel>>, now = new Date()) {
  const calc = calcScenario(facts, now);
  const engine = runEngine({ facts, calc, ...panel, caseId, now });
  return { calc, engine };
}

/* ------------------------------------------------------------------ assessment */

export function fallbackClientUpdate(calc: ScenarioCalc, engine: EngineResult): string {
  const viable = engine.candidates.filter((c) => c.tier !== "outside").length;
  const needs = Array.from(new Set(engine.candidates.flatMap((c) => c.evidenceNeeded.map((e) => e.replace(/^Applicant \d: /, ""))))).slice(0, 6);
  const missing = calc.missing.slice(0, 6).map(labelOf);
  const lines = [
    "Hi,",
    "",
    `Thanks for your enquiry. We've completed an initial review of your scenario${calc.loanUsed ? ` (loan of about $${Math.round(calc.loanUsed).toLocaleString("en-AU")}${calc.lvrPct !== null ? `, around ${Math.round(calc.lvrPct)}% of the property value` : ""})` : ""} against the lenders we work with.`,
    viable ? `At this stage ${viable === 1 ? "one option looks" : "a shortlist of options look"} worth checking further. Nothing is approved yet — we still need to confirm a few details with you and with the lenders.` : "We need a few more details before we can say which lenders may suit.",
  ];
  if (missing.length || needs.length) {
    lines.push("", "Could you please send or confirm:");
    for (const m of [...missing, ...needs]) lines.push(`• ${m}`);
  }
  lines.push("", "Once we have these we'll come back to you with our recommendation and the reasons for it.", "", "Kind regards,", "Mustang Mortgage");
  return lines.join("\n");
}

function fallbackBdm(engine: EngineResult): string {
  const asks = engine.candidates.filter((c) => c.tier !== "outside" && (c.missingEvidence.length || c.confirmations.length || c.conflicts.length || c.stale.length));
  if (!asks.length) return "";
  return asks
    .map((c) => [`${c.lenderName} — ${c.productName}`, ...[...c.missingEvidence, ...c.confirmations.map((x) => `Please confirm in writing: ${x}`), ...c.conflicts, ...c.stale].map((x) => `• ${x}`)].join("\n"))
    .join("\n\n");
}

export async function runAssessment(caseId: number, who: Who) {
  const cur = await loadFacts(caseId);
  if (!cur) throw new Error("Case not found");
  const panel = await loadPanel(caseId);
  const now = new Date();
  const { calc, engine } = evaluate(caseId, cur.facts, panel, now);
  const evidenceItems = buildEvidence(engine, panel.rules, panel.prices, panel.sources, calc);
  const settings = await getScenarioSettings();

  let ai: ValidatedAi | Record<string, never> = {};
  let aiStatus = "off";
  let aiError = "";
  let aiModel = "";
  let aiPayloadHash = "";
  if (settings.aiEnabled) {
    try {
      const r = await explainAssessment({ facts: cur.facts, calc, engine, evidence: evidenceItems });
      ai = r.ai;
      aiStatus = r.status;
      aiModel = r.model;
      aiPayloadHash = r.payloadHash;
      if (r.status === "rejected") {
        ai = {};
        aiError = "AI output withheld: it did not reference any known lender/product.";
      }
    } catch (e) {
      aiStatus = "unavailable";
      aiError = e instanceof AiUnavailable ? e.message : "AI request failed";
    }
  } else aiError = "AI explanation is switched off (Scenario settings).";

  const ruleById = new Map(panel.rules.map((r) => [r.id, r]));
  const priceById = new Map(panel.prices.map((p) => [p.id, p]));
  const srcIds = new Set<number>();
  const evidence = [
    ...engine.usedRuleIds.map((id) => {
      const r = ruleById.get(id)!;
      srcIds.add(r.sourceId);
      return { type: "rule", id, key: r.ruleKey, version: r.version, sourceId: r.sourceId, section: r.sourceSection, verifiedAt: r.verifiedAt, reviewDue: r.reviewDue, caseSpecific: r.caseId !== null };
    }),
    ...engine.usedPriceIds.map((id) => {
      const p = priceById.get(id)!;
      srcIds.add(p.sourceId);
      return { type: "price", id, key: p.recordKey, version: p.version, sourceId: p.sourceId, verifiedAt: p.verifiedAt, expiresAt: p.expiresAt };
    }),
    ...panel.sources.filter((s) => srcIds.has(s.id)).map((s) => ({ type: "source", id: s.id, title: s.title, reference: s.reference, kind: s.kind, permAi: s.permAi })),
  ];

  const aiTyped = ai as Partial<ValidatedAi>;
  const clientUpdate = aiTyped.clientUpdate || fallbackClientUpdate(calc, engine);
  const bdmDraft = aiTyped.bdmEnquiry?.needed && aiTyped.bdmEnquiry.draft ? aiTyped.bdmEnquiry.draft : fallbackBdm(engine);
  const hash = factsHash(cur.facts);

  const created = await prisma.$transaction(async (tx) => {
    await tx.scnAssessment.updateMany({
      where: { caseId, status: { in: ["draft", "reviewed"] } },
      data: { status: "superseded", supersededAt: now, supersededWhy: `Rerun by ${who.name}` },
    });
    const last = await tx.scnAssessment.findFirst({ where: { caseId }, orderBy: { runNo: "desc" }, select: { runNo: true } });
    return tx.scnAssessment.create({
      data: {
        caseId, runNo: (last?.runNo ?? 0) + 1, status: "draft", factsSnapshot: json(cur.facts), factsHash: hash, calc: json(calc), engine: json(engine),
        evidence: json(evidence), panel: json(engine.panel), ai: json(ai), aiStatus, aiError, aiModel, promptVersion: PROMPT_VERSION, calcVersion: CALC_VERSION,
        aiPayloadHash, clientUpdate, bdmDraft, createdBy: who.name,
        selections: json(Object.fromEntries(engine.candidates.map((c) => [c.id, { decision: c.tier === "outside" ? "excluded" : "considered", reason: c.tier === "outside" ? c.reasons.join("; ") : "" }]))),
      },
    });
  });

  await syncTasks(caseId, planTasks(cur.facts, calc, engine, now, settings.taskDueDays), who, created.id);
  await logActivity(caseId, "scenario", `Scenario assessment #${created.runNo} run (${engine.candidates.length} options, AI: ${aiStatus})`, who.name);
  return created;
}

/* ------------------------------------------------------------------ tasks (mirrored to CaseReminder) */

export async function syncTasks(caseId: number, plans: ReturnType<typeof planTasks>, who: Who, assessmentId: number) {
  const existing = await prisma.scnTask.findMany({ where: { caseId } });
  const reminderIds = existing.map((t) => t.reminderId).filter((x): x is number => x !== null);
  const reminders = new Map((await prisma.caseReminder.findMany({ where: { id: { in: reminderIds } } })).map((r) => [r.id, r]));
  const byKey = new Map(existing.map((t) => [t.key, t]));
  const wanted = new Set(plans.map((p) => p.key));

  for (const p of plans) {
    const t = byKey.get(p.key);
    const rem = t?.reminderId ? reminders.get(t.reminderId) : undefined;
    const doneElsewhere = rem?.done === true;
    if (t && (t.status === "done" || doneElsewhere)) {
      if (t.status !== "done") await prisma.scnTask.update({ where: { id: t.id }, data: { status: "done", doneAt: rem?.doneAt ?? new Date(), doneBy: rem?.doneBy || "" } });
      continue; // completed tasks are preserved, never reopened
    }
    const note = `${p.detail}\nOwner: ${t?.owner || who.name} · Scenario assistant`;
    if (t) {
      let reminderId = t.reminderId;
      if (rem) await prisma.caseReminder.update({ where: { id: rem.id }, data: { title: p.title, note } });
      else reminderId = (await prisma.caseReminder.create({ data: { caseId, type: "Reminder", title: p.title, note, priority: p.priority, dueAt: t.dueAt ?? p.dueAt, auto: true, createdBy: "scenario" } })).id;
      await prisma.scnTask.update({ where: { id: t.id }, data: { title: p.title, detail: p.detail, category: p.category, status: "open", reminderId, assessmentId } });
    } else {
      const r = await prisma.caseReminder.create({ data: { caseId, type: "Reminder", title: p.title, note, priority: p.priority, dueAt: p.dueAt, auto: true, createdBy: "scenario" } });
      await prisma.scnTask.create({ data: { caseId, key: p.key, category: p.category, title: p.title, detail: p.detail, owner: who.name, ownerId: who.uid, dueAt: p.dueAt, reminderId: r.id, assessmentId } });
    }
  }
  // Open tasks the new plan no longer needs are dismissed (their reminder is closed, not deleted).
  for (const t of existing) {
    if (wanted.has(t.key) || t.status !== "open") continue;
    await prisma.scnTask.update({ where: { id: t.id }, data: { status: "dismissed", doneAt: new Date(), doneBy: "scenario (no longer needed)" } });
    if (t.reminderId && reminders.get(t.reminderId) && !reminders.get(t.reminderId)!.done)
      await prisma.caseReminder.update({ where: { id: t.reminderId }, data: { done: true, doneAt: new Date(), doneBy: "scenario (no longer needed)" } });
  }
}

/** Tasks with status reconciled against their reminder (a reminder ticked on the dashboard completes the task). */
export async function loadTasks(caseId: number) {
  const tasks = await prisma.scnTask.findMany({ where: { caseId }, orderBy: [{ status: "asc" }, { dueAt: "asc" }] });
  const rems = new Map((await prisma.caseReminder.findMany({ where: { id: { in: tasks.map((t) => t.reminderId).filter((x): x is number => x !== null) } } })).map((r) => [r.id, r]));
  for (const t of tasks) {
    const r = t.reminderId ? rems.get(t.reminderId) : undefined;
    if (t.status === "open" && r?.done) {
      t.status = "done";
      t.doneAt = r.doneAt;
      t.doneBy = r.doneBy;
      await prisma.scnTask.update({ where: { id: t.id }, data: { status: "done", doneAt: r.doneAt, doneBy: r.doneBy } });
    }
  }
  return tasks;
}

export async function updateTask(id: number, data: { status?: "open" | "done"; owner?: string; dueAt?: Date | null }, who: Who) {
  const t = await prisma.scnTask.findUnique({ where: { id } });
  if (!t) throw new Error("Task not found");
  const done = data.status === "done";
  await prisma.scnTask.update({
    where: { id },
    data: { ...(data.owner !== undefined ? { owner: data.owner } : {}), ...(data.dueAt !== undefined ? { dueAt: data.dueAt } : {}), ...(data.status ? { status: data.status, doneAt: done ? new Date() : null, doneBy: done ? who.name : "" } : {}) },
  });
  if (t.reminderId) {
    const r = await prisma.caseReminder.findUnique({ where: { id: t.reminderId } });
    if (r)
      await prisma.caseReminder.update({
        where: { id: r.id },
        data: {
          ...(data.status ? { done, doneAt: done ? new Date() : null, doneBy: done ? who.name : "" } : {}),
          ...(data.dueAt !== undefined ? { dueAt: data.dueAt } : {}),
          ...(data.owner !== undefined ? { note: `${t.detail}\nOwner: ${data.owner} · Scenario assistant` } : {}),
        },
      });
  }
  return t.caseId;
}

/* ------------------------------------------------------------------ review / drafts */

export async function saveDrafts(id: number, d: { clientUpdate?: string; bdmDraft?: string; rationale?: string; overrideReason?: string; selections?: Record<string, { decision: string; reason: string }> }) {
  const a = await prisma.scnAssessment.findUnique({ where: { id } });
  if (!a) throw new Error("Assessment not found");
  if (a.status !== "draft") throw new Error("This analysis is signed off or superseded — rerun to make changes.");
  await prisma.scnAssessment.update({
    where: { id },
    data: {
      ...(d.clientUpdate !== undefined ? { clientUpdate: d.clientUpdate.slice(0, 10000) } : {}),
      ...(d.bdmDraft !== undefined ? { bdmDraft: d.bdmDraft.slice(0, 10000) } : {}),
      ...(d.rationale !== undefined ? { rationale: d.rationale.slice(0, 10000) } : {}),
      ...(d.overrideReason !== undefined ? { overrideReason: d.overrideReason.slice(0, 5000) } : {}),
      ...(d.selections ? { selections: json(d.selections) } : {}),
    },
  });
  return a.caseId;
}

export async function signOff(id: number, who: Who) {
  const a = await prisma.scnAssessment.findUnique({ where: { id } });
  if (!a) throw new Error("Assessment not found");
  if (a.status !== "draft") throw new Error("Only a current draft can be signed off.");
  const cur = await prisma.scnFacts.findUnique({ where: { caseId: a.caseId } });
  if (cur && cur.hash !== a.factsHash) throw new Error("Facts changed since this analysis — rerun before signing off.");
  if (a.rationale.trim().length < 20) throw new Error("Record the broker rationale (why options were selected or excluded) before sign-off.");
  const sel = (a.selections ?? {}) as Record<string, { decision: string; reason: string }>;
  const missingReason = Object.entries(sel).filter(([, s]) => (s.decision === "selected" || s.decision === "excluded") && !s.reason.trim());
  if (missingReason.length) throw new Error(`Give a reason for each selected / excluded option (${missingReason.length} missing).`);
  await prisma.scnAssessment.update({ where: { id }, data: { status: "reviewed", reviewedBy: who.name, reviewedById: who.uid, reviewedAt: new Date() } });
  await logActivity(a.caseId, "scenario", `Scenario analysis #${a.runNo} reviewed and signed off`, who.name);
  return a.caseId;
}

/* ------------------------------------------------------------------ serviceability */

export async function addServiceability(caseId: number, d: { lenderId: number; productId: number | null; calculator: string; maxBorrowing: number; calculatedAt: Date; note: string }, who: Who) {
  const cur = await loadFacts(caseId);
  if (!cur) throw new Error("Case not found");
  const f = cur.facts;
  const inputs = Object.fromEntries(Object.entries(f).filter(([k]) => /^(a\d\.(inc\.|employment|startDate)|com\.|loan\.(amount|termYears|repayment|ioYears)|app\.count)/.test(k)).map(([k, x]) => [k, x.v]));
  await prisma.scnServiceability.create({ data: { caseId, ...d, inputs: json(inputs), inputsHash: serviceabilityHash(f), enteredBy: who.name } });
  await logActivity(caseId, "scenario", `Lender calculator result recorded (${d.calculator}): max $${d.maxBorrowing.toLocaleString("en-AU")}`, who.name);
}

/* ------------------------------------------------------------------ Q&A */

export async function ask(assessmentId: number, question: string, who: Who) {
  const a = await prisma.scnAssessment.findUnique({ where: { id: assessmentId } });
  if (!a) throw new Error("Assessment not found");
  const q = question.trim().slice(0, 1000);
  if (q.length < 5) throw new Error("Type a question about this case.");
  const facts = a.factsSnapshot as Facts;
  const panel = await loadPanel(a.caseId);
  const { calc, engine } = evaluate(a.caseId, facts, panel);
  const evidence = buildEvidence(engine, panel.rules, panel.prices, panel.sources, calc);
  try {
    const r = await answerQuestion({ question: q, facts, calc, engine, evidence });
    await prisma.scnQuestion.create({ data: { caseId: a.caseId, assessmentId, question: q, answer: json(r), status: r.status, askedBy: who.name } });
  } catch (e) {
    await prisma.scnQuestion.create({ data: { caseId: a.caseId, assessmentId, question: q, answer: json({ error: e instanceof AiUnavailable ? e.message : "AI request failed" }), status: "unavailable", askedBy: who.name } });
  }
  return a.caseId;
}

/* ------------------------------------------------------------------ compliance + gates */

export async function setComplianceItem(caseId: number, stage: string, itemKey: string, d: { done: boolean; date: string; evidence: string }, who: Who) {
  await prisma.scnComplianceItem.upsert({
    where: { caseId_stage_itemKey: { caseId, stage, itemKey } },
    create: { caseId, stage, itemKey, done: d.done, date: d.date, evidence: d.evidence, by: who.name },
    update: { done: d.done, date: d.date, evidence: d.evidence, by: who.name },
  });
}

export async function gateBlockers(caseId: number, gate: "recommendation_ready" | "application_ready") {
  const [lists, items, latest, gates, facts] = await Promise.all([
    getChecklists(),
    prisma.scnComplianceItem.findMany({ where: { caseId } }),
    prisma.scnAssessment.findFirst({ where: { caseId }, orderBy: { runNo: "desc" } }),
    prisma.scnReviewGate.findMany({ where: { caseId, revoked: false } }),
    prisma.scnFacts.findUnique({ where: { caseId } }),
  ]);
  const blockers: string[] = [];
  const stagesNeeded = gate === "recommendation_ready" ? ["enquiry", "recommendation"] : ["enquiry", "recommendation", "application"];
  for (const st of stagesNeeded)
    for (const it of lists.stages[st] ?? []) {
      if (!it.required) continue;
      const x = items.find((i) => i.stage === st && i.itemKey === it.key);
      if (!x || (it.kind === "date" ? !x.date : !x.done)) blockers.push(`Checklist: ${it.label}`);
    }
  if (!latest) blockers.push("No scenario analysis has been run");
  else {
    if (latest.status !== "reviewed") blockers.push("Latest analysis is not signed off by a broker");
    if (facts && latest.factsHash !== facts.hash) blockers.push("Facts changed since the latest analysis");
  }
  if (gate === "application_ready") {
    if (!gates.some((g) => g.gate === "recommendation_ready")) blockers.push("Recommendation not marked ready to share");
    const sel = (latest?.selections ?? {}) as Record<string, { decision: string }>;
    const chosen = Object.entries(sel).filter(([, s]) => s.decision === "selected").map(([k]) => k);
    if (!chosen.length) blockers.push("No lender/product selected in the signed-off analysis");
    const eng = (latest?.engine ?? {}) as EngineResult;
    for (const id of chosen) {
      const c = eng.candidates?.find((x) => x.id === id);
      if (c && c.serviceability.state !== "current") blockers.push(`${c.lenderName}: lender calculator result not current`);
    }
  }
  return { blockers, latest };
}

export async function markGate(caseId: number, gate: "recommendation_ready" | "application_ready", d: { rationale: string; overrideReason: string }, who: Who) {
  if (d.rationale.trim().length < 20) throw new Error("Record the reviewer rationale (at least a sentence).");
  const { blockers, latest } = await gateBlockers(caseId, gate);
  if (blockers.length && d.overrideReason.trim().length < 20) throw new Error(`Blocked: ${blockers.join("; ")}. Resolve these or record an override reason.`);
  const [items, svc] = await Promise.all([prisma.scnComplianceItem.findMany({ where: { caseId } }), prisma.scnServiceability.findMany({ where: { caseId } })]);
  await prisma.scnReviewGate.create({
    data: {
      caseId, gate, assessmentId: latest?.id ?? null, reviewer: who.name, reviewerId: who.uid, rationale: d.rationale, overrideReason: blockers.length ? d.overrideReason : "",
      evidence: json({ blockersAtSignOff: blockers, checklist: items, calculatorResults: svc, assessment: latest ? { id: latest.id, runNo: latest.runNo, status: latest.status, evidence: latest.evidence, factsHash: latest.factsHash } : null }),
    },
  });
  await logActivity(caseId, "scenario", `${gate === "recommendation_ready" ? "Recommendation marked ready to share" : "Application marked ready to lodge"}${blockers.length ? " (with override)" : ""}`, who.name);
}

export { TIER_LABEL };
