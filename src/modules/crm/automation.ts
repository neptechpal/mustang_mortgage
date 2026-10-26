// MMCRM_Automation: presets, docs-complete once-flag, chasing, event reactions.
import { prisma } from "@/lib/db";
import { escapeHtml } from "@/lib/mail";
import { caseFacts, loadCase, logEvent, portalUrl, setStage } from "./cases";
import { buttonHtml, mergePlaceholders, sendToCaseClients } from "./email";
import { getAutoOptions, getPresets } from "./options";
import { addAutoReminder } from "./reminders-bridge";
import { autop, stripTags, sydParts } from "./util";

const HOUR = 3600_000, DAY = 86400_000;

/** Append preset documents, skipping duplicate labels. Returns number added. */
export async function applyPresets(caseId: number, names: string[]) {
  const presets = await getPresets();
  const docs = await prisma.caseDocument.findMany({ where: { caseId }, orderBy: { sort: "desc" } });
  const have = new Set(docs.map((d) => d.label.trim().toLowerCase()));
  let sort = (docs[0]?.sort ?? -1) + 1;
  const rows: { caseId: number; label: string; sort: number }[] = [];
  for (const p of presets) {
    if (!names.includes(p.name)) continue;
    for (const label of p.items) {
      const k = label.trim().toLowerCase();
      if (!k || have.has(k)) continue;
      rows.push({ caseId, label, sort: sort++ });
      have.add(k);
    }
  }
  if (rows.length) await prisma.caseDocument.createMany({ data: rows });
  return rows.length;
}

/** All documents received → advance stage once and flag it (evaluate_docs). */
export async function evaluateDocs(caseId: number) {
  const c = await loadCase(caseId);
  if (!c) return;
  const f = caseFacts(c);
  if (!f.docs_total || f.docs_pending > 0) return;
  if (c.docsDoneAt) return;
  await prisma.case.update({ where: { id: caseId }, data: { docsDoneAt: new Date() } });
  const o = await getAutoOptions();
  if (o.stage_on_docs && f.stage === "new") await setStage(caseId, "awaiting-docs");
  await logEvent(caseId, "docs_complete", "All requested documents are in", "system");
  if (o.task_on_ff) await addAutoReminder(caseId, `Documents complete for ${f.name} — review`, new Date(Date.now() + HOUR));
}

export async function onCaseCreated(caseId: number, source = "") {
  const o = await getAutoOptions();
  const c = await loadCase(caseId);
  if (!c) return;
  if (o.task_on_create) await addAutoReminder(caseId, "Follow up with " + caseFacts(c).name, new Date(Date.now() + Math.max(1, o.followup_days) * DAY));
  if (source === "public_form" && o.welcome_public) {
    const { sendForm } = await import("./forms/service");
    await sendForm(caseId, "ff", true);
  }
}

export async function onFfSubmitted(caseId: number) {
  const o = await getAutoOptions();
  const c = await loadCase(caseId);
  if (!c) return;
  if (o.task_on_ff) await addAutoReminder(caseId, `Review Fact Find for ${caseFacts(c).name} and enter in Flex`, new Date(Date.now() + HOUR), "High");
  await evaluateDocs(caseId);
}

export async function onFormSubmitted(caseId: number, formTitle: string) {
  const o = await getAutoOptions();
  if (!o.task_on_form) return;
  const c = await loadCase(caseId);
  if (!c) return;
  await addAutoReminder(caseId, `Review "${formTitle}" from ${caseFacts(c).name}`, new Date(Date.now() + HOUR));
}

/* ---------------- chasing ---------------- */
async function outstandingHtml(c: NonNullable<Awaited<ReturnType<typeof loadCase>>>) {
  let h = "";
  if (!c.ffDone && c.showFactfind) h += "<li><strong>Your Fact Find</strong> — please complete the online form</li>";
  for (const d of c.documents) {
    if (d.status !== "Pending" && d.status !== "Rejected") continue;
    const n = d.note.trim();
    h += `<li>${escapeHtml(d.label)}${d.status === "Rejected" ? " <em>(needs re-upload)</em>" : ""}${n ? " — " + escapeHtml(n) : ""}</li>`;
  }
  return h ? `<ul>${h}</ul>` : "";
}

/** Send the reminder email. */
export async function chase(caseId: number, manual: boolean): Promise<{ ok: true } | { ok: false; error: string }> {
  const c = await loadCase(caseId);
  if (!c) return { ok: false, error: "Invalid case" };
  const facts = caseFacts(c);
  if (!facts.emails.length) return { ok: false, error: "This case has no client email address." };
  const out = await outstandingHtml(c);
  if (!out) return { ok: false, error: "Nothing is outstanding for this client." };
  const o = await getAutoOptions();
  let body = await mergePlaceholders(c, o.chase_body, false);
  body = body.replaceAll("{{outstanding}}", out);
  let html = autop(body);
  if (!o.chase_body.includes("{{portal_button}}")) html += buttonHtml(await portalUrl(c), "Open your secure portal");
  const subject = stripTags(await mergePlaceholders(c, o.chase_subject, false));
  const r = await sendToCaseClients(caseId, facts.emails, subject, html);
  if (!r.ok) return { ok: false, error: r.error || "The email could not be sent." };
  const n = c.chaseCount + 1;
  await prisma.case.update({ where: { id: caseId }, data: { lastChaseAt: new Date(), chaseCount: n } });
  await logEvent(caseId, "email_reminder", `${manual ? "Reminder sent" : `Automatic reminder #${n} sent`} to ${facts.emails.join(", ")}`, manual ? "admin" : "system");
  return { ok: true };
}

/** Hourly cron (mmcrm_auto_hourly). Returns a small report. */
export async function runChaseCron(now = new Date()) {
  const o = await getAutoOptions();
  const report = { enabled: !!o.chase_enabled, checked: 0, sent: 0, exhausted: 0, skipped: "" };
  if (!o.chase_enabled) return { ...report, skipped: "disabled" };
  const { H, dow } = sydParts(now);
  if (H < o.chase_hour_from || H >= o.chase_hour_to) return { ...report, skipped: "outside hours" };
  if (!o.chase_weekends && dow >= 6) return { ...report, skipped: "weekend" };

  const cases = await prisma.case.findMany({ where: { status: "active" }, orderBy: { createdAt: "desc" }, take: 300 });
  for (const c of cases) {
    if (report.sent >= 15) break; // gentle: max 15 emails per hour
    report.checked++;
    if (c.chasePaused || c.portalClosed) continue;
    if (!["new", "awaiting-docs"].includes(c.stage)) continue;
    if (now.getTime() - c.createdAt.getTime() < o.chase_after_days * DAY) continue;
    if (c.chaseCount >= o.chase_max) {
      if (c.chaseCount === o.chase_max && !c.chaseExhausted) {
        await prisma.case.update({ where: { id: c.id }, data: { chaseExhausted: true } });
        const full = await loadCase(c.id);
        if (full) await addAutoReminder(c.id, `Auto-reminders finished for ${caseFacts(full).name} — give them a call`, new Date(now.getTime() + HOUR), "High");
        report.exhausted++;
      }
      continue;
    }
    if (c.lastChaseAt && now.getTime() - c.lastChaseAt.getTime() < o.chase_every_days * DAY) continue;
    // client was active recently? leave them alone
    const last = await prisma.caseActivity.findFirst({ where: { caseId: c.id }, orderBy: { createdAt: "desc" } });
    if (last && now.getTime() - last.createdAt.getTime() < DAY && ["upload", "ff_submit", "ff_draft"].includes(last.type)) continue;
    const r = await chase(c.id, false);
    if (r.ok) report.sent++;
  }
  return report;
}
