"use server";
// Staff server actions for the CRM. Every action re-checks the staff session.
import { APPLICANT_NUMBERS, applicantCount, applicantEmails, applicants } from "./applicants";
import { addBrokerNote, noteDate } from "@/modules/crm-extra/lib/notes";
import { syncCaseContacts } from "@/modules/crm-extra/lib/marketing";
import { dealSaveData } from "@/modules/crm-extra/lib/income";
import { getIncomeSettings } from "@/modules/crm-extra/lib/income-settings";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin, requireStaff } from "@/lib/session";
import { deleteStoredFile } from "@/lib/storage";
import { escapeHtml } from "@/lib/mail";
import { createCase, docFiles, ensureToken, loadCase, logEvent, portalUrl, setPortal, setStage, setStatus } from "./cases";
import { applyPresets, chase, evaluateDocs, onCaseCreated } from "./automation";
import { mergePlaceholders, sendToCaseClients, buildContext } from "./email";
import { adminReply } from "./factfind";
import { sendForm, unassignForm } from "./forms/service";
import { normalizeSchema } from "./forms/engine";
import { CHASE_BUCKETS, DOC_STATUSES, STAGES } from "./constants";
import {
  AUTO_DEFAULTS, getAutoOptions, getCrmOptions, saveAutoOptions, saveCrmOptions, saveFormEmailTpl, savePresets, setFfFormId, type AutoOptions, type Preset,
} from "./options";
import { cleanEmailHtml, extractEmails, newToken, stripTags } from "./util";
import { setTaskDone } from "./reminders-bridge";
import { saveMailSettings } from "@/modules/crm-extra/lib/opts";

type R = { ok: boolean; message?: string; error?: string; [k: string]: unknown };
const ok = (message = "Done", extra: Record<string, unknown> = {}): R => ({ ok: true, message, ...extra });
const fail = (error: string): R => ({ ok: false, error });
const rev = (id?: number) => {
  if (id) revalidatePath(`/admin/cases/${id}`);
  revalidatePath("/admin/cases");
  revalidatePath("/admin");
};

/* ---------------- header / quick actions ---------------- */
export async function chaseNowAction(caseId: number): Promise<R> {
  await requireStaff();
  const r = await chase(caseId, true);
  rev(caseId);
  return r.ok ? ok("Reminder sent") : fail(r.error);
}

export async function setStageAction(caseId: number, stage: string): Promise<R> {
  await requireStaff();
  if (!(await setStage(caseId, stage))) return fail("Unknown stage");
  await logEvent(caseId, "stage", `Stage changed to ${STAGES[stage]}`, "admin");
  rev(caseId);
  return ok("Stage updated", { stage });
}

export async function setStatusAction(caseId: number, slug: string): Promise<R> {
  await requireStaff();
  if (!(await setStatus(caseId, slug))) return fail("Unknown status");
  const c = await prisma.case.findUnique({ where: { id: caseId }, select: { portalClosed: true } });
  rev(caseId);
  return ok("Status updated", { portal_closed: !!c?.portalClosed });
}

export async function bulkStatusAction(ids: number[], slug: string): Promise<R> {
  await requireStaff();
  let n = 0;
  for (const id of ids) if (await setStatus(id, slug)) n++;
  rev();
  return ok(`${n} case(s) moved`, { n });
}

export async function kanbanMoveAction(caseId: number, tax: "stage" | "chase", bucket: string): Promise<R> {
  await requireStaff();
  if (tax === "chase") {
    if (!CHASE_BUCKETS[bucket]) return fail("Bucket not found");
    await prisma.case.update({ where: { id: caseId }, data: { chaseBucket: bucket } });
  } else if (!(await setStage(caseId, bucket))) return fail("Bucket not found");
  rev(caseId);
  revalidatePath("/admin/kanban");
  return ok();
}

export async function pauseChaseAction(caseId: number, pause: boolean): Promise<R> {
  await requireStaff();
  await prisma.case.update({ where: { id: caseId }, data: { chasePaused: pause } });
  rev(caseId);
  return ok(pause ? "Auto-reminders paused" : "Auto-reminders on");
}

export async function portalToggleAction(caseId: number, open: boolean): Promise<R> {
  await requireStaff();
  await setPortal(caseId, open, open ? "manually re-opened" : "manually closed");
  rev(caseId);
  return ok(open ? "Client portal re-opened" : "Client portal closed", { open });
}

export async function resetTokenAction(caseId: number): Promise<R> {
  await requireStaff();
  await prisma.case.update({ where: { id: caseId }, data: { portalToken: newToken() } });
  rev(caseId);
  return ok("New portal link generated");
}

export async function applyPresetAction(caseId: number, presets: string[]): Promise<R> {
  await requireStaff();
  const n = await applyPresets(caseId, presets);
  rev(caseId);
  return ok(`${n} documents added`, { added: n });
}

/* ---------------- case details ---------------- */
const ymd = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

export async function saveApplicantsAction(caseId: number, fd: FormData): Promise<R> {
  await requireStaff();
  const g = (k: string) => String(fd.get(k) ?? "").trim();
  const c = await prisma.case.findUnique({ where: { id: caseId } });
  if (!c) return fail("Bad case");
  const dob = (k: string, cur: string) => (g(k) === "" ? "" : ymd(g(k)) || cur);
  await prisma.case.update({
    where: { id: caseId },
    data: {
      title: g("title") || c.title,
      ...Object.fromEntries(APPLICANT_NUMBERS.flatMap(n => [
        [`app${n}Name`, g(`app${n}Name`)], [`app${n}Email`, extractEmails(g(`app${n}Email`))[0] ?? ""],
        [`app${n}Mobile`, g(`app${n}Mobile`)], [`app${n}Dob`, dob(`app${n}Dob`, c[`app${n}Dob`])],
      ])),
      applicantCount: Math.max(1, Math.min(4, parseInt(g('applicantCount'), 10) || applicantCount(c))),
      initDone: true,
    },
  });
  rev(caseId);
  await syncCaseContacts(caseId);
  return ok("Case saved.");
}

export async function savePortalSectionsAction(caseId: number, showFactfind: boolean, showDocuments: boolean): Promise<R> {
  await requireStaff();
  await prisma.case.update({ where: { id: caseId }, data: { showFactfind, showDocuments } });
  rev(caseId);
  return ok("Portal sections saved");
}

export async function saveDealAction(caseId: number, fd: FormData): Promise<R> {
  await requireStaff();
  const n = (k: string) => {
    const s = String(fd.get(k) ?? "").replace(/[^0-9.\-]/g, "");
    return s === "" ? null : Number(s);
  };
  await prisma.case.update({ where: { id: caseId }, data: { loanType: String(fd.get("loanType") ?? ""), loanAmount: n("loanAmount") } });
  rev(caseId);
  return ok("Saved");
}

/* ---------------- checklist ---------------- */
export type ChecklistRow = { id?: number; label: string; status: string; note: string };

export async function saveChecklistAction(caseId: number, rows: ChecklistRow[]): Promise<R> {
  await requireStaff();
  const existing = await prisma.caseDocument.findMany({ where: { caseId } });
  const keep = new Set<number>();
  let sort = 0;
  for (const r of rows) {
    const label = String(r.label || "").trim();
    if (!label) continue;
    const status = (DOC_STATUSES as readonly string[]).includes(r.status) ? r.status : "Pending";
    const note = String(r.note || "");
    const row = r.id ? existing.find((e) => e.id === r.id) : undefined;
    if (row) {
      keep.add(row.id);
      await prisma.caseDocument.update({ where: { id: row.id }, data: { label, status, note, sort: sort++ } });
    } else {
      const created = await prisma.caseDocument.create({ data: { caseId, label, status, note, sort: sort++ } });
      keep.add(created.id);
    }
  }
  const removed = existing.filter((e) => !keep.has(e.id));
  if (removed.length) await prisma.caseDocument.deleteMany({ where: { id: { in: removed.map((r) => r.id) } } });
  await evaluateDocs(caseId);
  rev(caseId);
  return ok("Checklist saved");
}

export async function removeDocFileAction(caseId: number, docId: number, fileKey: string): Promise<R> {
  await requireStaff();
  const d = await prisma.caseDocument.findFirst({ where: { id: docId, caseId } });
  if (!d) return fail("Not found");
  const files = docFiles(d);
  const target = files.find((f) => (f.fileId || f.url) === fileKey);
  const rest = files.filter((f) => f !== target);
  await prisma.caseDocument.update({ where: { id: d.id }, data: { files: rest as unknown as Prisma.InputJsonValue } });
  if (target?.fileId) await deleteStoredFile(target.fileId);
  rev(caseId);
  return ok("File removed");
}

/* ---------------- forms ---------------- */
export async function sendFormAction(caseId: number, formId: string, email: boolean, subject: string, body: string): Promise<R> {
  await requireStaff();
  const fid = formId === "ff" ? "ff" : parseInt(formId, 10);
  if (fid !== "ff" && !fid) return fail("Form not found");
  const [good, msg] = await sendForm(caseId, fid, email, subject.trim(), body);
  rev(caseId);
  return good ? ok(msg) : fail(msg);
}

export async function unassignFormAction(caseId: number, formId: number): Promise<R> {
  await requireStaff();
  await unassignForm(caseId, formId);
  rev(caseId);
  return ok("Removed");
}

/* ---------------- email composer ---------------- */
export async function insertTemplateAction(caseId: number, templateId: number): Promise<R> {
  await requireStaff();
  const t = await prisma.emailTemplate.findUnique({ where: { id: templateId } });
  if (!t) return fail("Not found");
  const c = await loadCase(caseId);
  if (!c) return ok("", { subject: t.subject || t.title, body: t.body });
  const ctx = await buildContext(c);
  return ok("", { subject: await mergePlaceholders(c, t.subject || t.title, false, ctx), body: cleanEmailHtml(await mergePlaceholders(c, t.body, true, ctx)) });
}

export async function sendEmailAction(caseId: number, input: { to: string; cc: string; bcc: string; subject: string; body: string; pending?: boolean }): Promise<R> {
  const me = await requireStaff();
  const c = await loadCase(caseId);
  if (!c) return fail("Bad case");
  let to = extractEmails(input.to.replace(/;/g, ","));
  if (!to.length) to = applicantEmails(c);
  if (!to.length) to = extractEmails(c.legacyEmail);
  if (!to.length) return fail("Recipient is required");
  const ctx = await buildContext(c);
  let subject: string, body: string;
  if (input.pending) {
    subject = await mergePlaceholders(c, input.subject.trim() || "Documents needed for {{applicant_full_name}}", false, ctx);
    body = await mergePlaceholders(
      c,
      `<p>Hi {{applicant_first_name}},</p>\n<p>I hope you're doing well!</p>\n<p>Just a gentle reminder — we’re almost there, but we’re still waiting on the following documents for the application::</p>\n{{checklist_pending_list}}\n<p>{{portal_button}}</p>\n<p style="color:#666;font-size:12px">This secure link is unique to you 🔐.</p>`,
      true,
      ctx,
    );
  } else {
    subject = await mergePlaceholders(c, input.subject.trim() || "📄 Update from Mustang Mortgage", false, ctx);
    body = await mergePlaceholders(c, input.body, true, ctx);
  }
  const r = await sendToCaseClients(caseId, to, stripTags(subject), body, { noWrap: true, sentBy: me.name, cc: extractEmails(input.cc.replace(/;/g, ",")), bcc: extractEmails(input.bcc.replace(/;/g, ",")) });
  if (!r.ok) return fail(r.error || "Send failed");
  const s = subject.toLowerCase();
  const type = s.includes("document") ? "email_docs" : s.includes("reminder") ? "email_reminder" : s.includes("portal") ? "email_invite" : "email_sent";
  await logEvent(caseId, type, `Sent — "${stripTags(subject)}" → ${to.join(", ")}`, "admin");
  rev(caseId);
  return ok("Email sent");
}

export async function sendPortalLinkAction(caseId: number, to: string): Promise<R> {
  await requireStaff();
  const c = await loadCase(caseId);
  if (!c) return fail("Bad case");
  if (c.portalClosed) return fail("The portal is closed — re-open it first.");
  const url = await portalUrl(c, { step: "factfind" });
  const body = `<p>Hi,</p><p>Your secure client portal is ready. You can complete your Fact Find and upload documents here:</p><p><a href="${escapeHtml(url)}" style="background:#987633;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;display:inline-block">Open your secure portal</a></p>`;
  return sendEmailAction(caseId, { to, cc: "", bcc: "", subject: "Your secure Mustang Mortgage portal", body });
}

/* ---------------- portal messages ---------------- */
export async function adminReplyAction(caseId: number, text: string): Promise<R> {
  const s = await requireStaff();
  const row = await adminReply(caseId, text, { id: s.uid, name: s.name });
  if (!row) return fail("Type a reply.");
  rev(caseId);
  return ok("Reply sent");
}

/* ---------------- New Client wizard ---------------- */
export async function wizardCreateAction(fd: FormData) {
  const me = await requireStaff();
  const g = (k: string) => String(fd.get(k) ?? "").trim();
  const count = Math.max(1, Math.min(4, parseInt(g("app_count"), 10) || (g("p2_name") ? 2 : 1)));
  const apps = APPLICANT_NUMBERS.filter(n => n <= count).map(n => ({ n, name: g(`p${n}_name`), email: extractEmails(g(`p${n}_email`))[0] ?? '', mobile: g(`p${n}_mobile`) }));
  const { name: n1, email: e1 } = apps[0];
  const n2 = apps[1]?.name || '', e2 = apps[1]?.email || '';
  const income = await getIncomeSettings();
  if (!n1) redirect("/admin/cases/new?err=" + encodeURIComponent("Please enter the applicant’s name."));
  const loanType = (g("loan_type") || "purchase").toLowerCase().replace(/[^a-z_\-]/g, "");
  const title = (n1 + (n2 ? " & " + n2 : "")).trim() + " — " + loanType.charAt(0).toUpperCase() + loanType.slice(1);
  const amount = parseFloat(g("loan_amount"));
  const c = await createCase({
    title, applicantCount: count,
    ...Object.fromEntries(apps.flatMap(a => [[`app${a.n}Name`, a.name], [`app${a.n}Email`, a.email], [`app${a.n}Mobile`, a.mobile]])),
    legacyName: n1, legacyEmail: e1, showFactfind: !!fd.get("send_ff"), showDocuments: true,
    loanType, ...(Number.isFinite(amount) && amount > 0 ? dealSaveData(amount, income.bank_pct, income.agg_pct, income.trail_pct) : {}),
    stage: "new", status: "active", chasePaused: !fd.get("auto_chase"), initDone: true,
  });
  const when = noteDate(new Date(), ', '), contact = g('contact_type'), source = g('lead_source'), conv = g('conv_notes');
  const esc = escapeHtml;
  const body = `<p><strong>Recorded:</strong> ${esc(when)} by ${esc(me.name)}${contact ? ` · <strong>Contact:</strong> ${esc(contact)}` : ''}${source ? ` · <strong>Source:</strong> ${esc(source)}` : ''}</p>`
    + `<p><strong>Enquiry:</strong> ${esc(loanType)}${amount > 0 ? ` · approx. $${amount.toLocaleString('en-AU')}` : ''} · ${g('income_type') === 'self' ? 'Self-employed' : 'PAYG / employed'}</p>`
    + `<ul>${apps.filter(a => a.name || a.email || a.mobile).map(a => `<li><strong>Applicant ${a.n}:</strong> ${esc([a.name, a.email || 'no email', a.mobile || 'no mobile'].join(' · '))}</li>`).join('')}</ul>`
    + (conv ? `<p><strong>Conversation:</strong></p><p>${esc(conv).replace(/\n/g, '<br>')}</p>` : '<p><em>No conversation details were entered.</em></p>');
  await addBrokerNote(c.id, `Initial conversation — ${contact || 'new client'} — ${when}`, body, me.name, me.uid);
  await syncCaseContacts(c.id);
  const added = await applyPresets(c.id, fd.getAll("presets").map(String));
  await onCaseCreated(c.id, "wizard");
  let msg = "Case created" + (added ? ` with ${added} document requests` : "") + ".";
  const send = !!fd.get("send_welcome");
  const targets: (number | "ff")[] = [];
  if (fd.get("send_ff")) targets.push("ff");
  for (const f of fd.getAll("send_forms")) if (parseInt(String(f), 10)) targets.push(parseInt(String(f), 10));
  let first = true;
  for (const t of targets) {
    const [good, m] = await sendForm(c.id, t, send && first);
    if (send && first) { msg += " " + (good ? "Email sent." : m); first = false; }
  }
  if (send && !targets.length && apps.some(a => a.email)) {
    const full = (await loadCase(c.id))!;
    const html = await mergePlaceholders(full, "Hi {{greeting_names}},\n\nThanks for choosing us. Here's your secure portal where you can upload documents any time:\n\n{{portal_button}}", true);
    const r = await sendToCaseClients(c.id, apps.map(a => a.email).filter(Boolean), "Your secure portal — Mustang Mortgage", html);
    msg += r.ok ? " Email sent." : " " + r.error;
  }
  rev();
  redirect(`/admin/cases/${c.id}?notice=${encodeURIComponent(msg)}`);
}

export async function createBlankCaseAction(fd: FormData) {
  await requireStaff();
  const title = String(fd.get("title") ?? "").trim() || "New case";
  const c = await createCase({ title, stage: "new", status: "active" });
  await prisma.caseDocument.createMany({ data: ["Payslips", "Photo ID", "Bank Statements"].map((label, i) => ({ caseId: c.id, label, sort: i })) });
  await ensureToken(c.id);
  redirect(`/admin/cases/${c.id}?notice=${encodeURIComponent("Case created.")}`);
}

export async function deleteCaseAction(caseId: number) {
  await requireAdmin();
  const docs = await prisma.caseDocument.findMany({ where: { caseId } });
  for (const d of docs) for (const f of docFiles(d)) if (f.fileId) await deleteStoredFile(f.fileId);
  await prisma.$transaction([
    prisma.caseEvent.deleteMany({ where: { caseId } }),
    prisma.caseMessage.deleteMany({ where: { caseId } }),
    prisma.caseForm.deleteMany({ where: { caseId } }),
    prisma.factFindSubmission.deleteMany({ where: { caseId } }),
    prisma.case.delete({ where: { id: caseId } }),
  ]);
  rev();
  redirect("/admin/cases");
}

/* ---------------- dashboard tasks ---------------- */
export async function toggleTaskAction(id: number, done: boolean): Promise<R> {
  const s = await requireStaff();
  const good = await setTaskDone(id, done, s.name);
  revalidatePath("/admin");
  return good ? ok(done ? "Task completed" : "Task re-opened") : fail("Could not update task");
}

/* ---------------- settings / automation ---------------- */
export async function saveSettingsAction(fd: FormData) {
  await requireAdmin();
  const o = await getCrmOptions();
  const target = String(fd.get("commission_target") ?? "").replace(/[, ]/g, "");
  await saveCrmOptions({
    ...o,
    brand_logo: String(fd.get("brand_logo") ?? "").trim(),
    from_name: String(fd.get("from_name") ?? "").trim(),
    from_email: extractEmails(String(fd.get("from_email") ?? ""))[0] ?? "",
    notify_email: String(fd.get("notify_email") ?? "").trim(),
    signature_html: cleanEmailHtml(String(fd.get("signature_html") ?? "")),
    auto_append_signature: fd.get("auto_append_signature") ? 1 : 0,
    commission_target: target && !isNaN(Number(target)) ? Number(target) : 0,
  });
  // crm-extra keeps the effective signature in its own mail settings — keep both in sync.
  await saveMailSettings({ signatureHtml: cleanEmailHtml(String(fd.get("signature_html") ?? "")), autoAppendSignature: !!fd.get("auto_append_signature") });
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}

export async function saveAutomationAction(fd: FormData) {
  await requireAdmin();
  const o: AutoOptions = { ...AUTO_DEFAULTS, ...(await getAutoOptions()) };
  for (const b of ["stage_on_docs", "task_on_ff", "task_on_form", "task_on_create", "welcome_public", "chase_enabled", "chase_weekends", "portal_off_on_flex", "portal_off_on_close"] as const) o[b] = fd.get(b) ? 1 : 0;
  const ranges: [keyof AutoOptions, number, number][] = [["followup_days", 1, 30], ["chase_after_days", 1, 30], ["chase_every_days", 1, 30], ["chase_max", 1, 10], ["chase_hour_from", 0, 23], ["chase_hour_to", 1, 24]];
  for (const [k, lo, hi] of ranges) {
    const v = parseInt(String(fd.get(k) ?? o[k]), 10);
    (o as Record<string, unknown>)[k] = Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : (o[k] as number)));
  }
  o.chase_subject = stripTags(String(fd.get("chase_subject") ?? o.chase_subject));
  o.chase_body = String(fd.get("chase_body") ?? o.chase_body).replace(/<(script|iframe)[\s\S]*?<\/\1>/gi, "");
  await saveAutoOptions(o);
  await saveFormEmailTpl({ subject: stripTags(String(fd.get("form_subject") ?? "")), body: String(fd.get("form_body") ?? "") });
  const names = fd.getAll("pre_name").map(String);
  const tags = fd.getAll("pre_tags").map(String);
  const items = fd.getAll("pre_items").map(String);
  const presets: Preset[] = [];
  names.forEach((name, i) => {
    name = name.trim();
    if (!name) return;
    const list = (items[i] || "").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const tg = (tags[i] || "").split(",").map((s) => s.trim().toLowerCase().replace(/[^a-z0-9_\-]/g, "")).filter(Boolean);
    if (list.length) presets.push({ name, tags: tg, items: list });
  });
  await savePresets(presets);
  revalidatePath("/admin/automation");
  redirect("/admin/automation?saved=1");
}

/* ---------------- forms admin ---------------- */
export async function saveFormAction(id: number | null, title: string, schemaJson: string, isFf: boolean): Promise<R> {
  const s = await requireStaff();
  const schema = normalizeSchema(schemaJson);
  const data = { title: title.trim() || "Untitled form", schema: schema as unknown as Prisma.InputJsonValue, status: "publish" };
  const f = id ? await prisma.crmForm.update({ where: { id }, data }) : await prisma.crmForm.create({ data });
  if (s.role === "ADMIN") {
    const { getFfFormId } = await import("./options");
    const cur = await getFfFormId();
    if (isFf) await setFfFormId(f.id);
    else if (cur === f.id) await setFfFormId(0);
  }
  revalidatePath("/admin/forms");
  return ok("Form saved", { id: f.id });
}

export async function duplicateFormAction(id: number) {
  await requireStaff();
  const f = await prisma.crmForm.findUnique({ where: { id } });
  if (!f) return;
  const n = await prisma.crmForm.create({ data: { title: f.title + " (copy)", schema: f.schema as Prisma.InputJsonValue, status: "publish" } });
  redirect(`/admin/forms/${n.id}`);
}

export async function setFfFormAction(id: number) {
  await requireAdmin();
  await setFfFormId(id);
  revalidatePath("/admin/forms");
}

export async function trashFormAction(id: number) {
  await requireStaff();
  await prisma.crmForm.update({ where: { id }, data: { status: "trash" } });
  const { getFfFormId } = await import("./options");
  if ((await getFfFormId()) === id) await setFfFormId(0);
  revalidatePath("/admin/forms");
}

/* ---------------- templates ---------------- */
export async function saveTemplateAction(id: number | null, fd: FormData) {
  await requireStaff();
  const data = { title: String(fd.get("title") ?? "").trim() || "Untitled template", subject: String(fd.get("subject") ?? "").trim(), body: cleanEmailHtml(String(fd.get("body") ?? "")) };
  const t = id ? await prisma.emailTemplate.update({ where: { id }, data }) : await prisma.emailTemplate.create({ data });
  revalidatePath("/admin/templates");
  redirect(`/admin/templates/${t.id}?saved=1`);
}

export async function deleteTemplateAction(id: number) {
  await requireStaff();
  await prisma.emailTemplate.delete({ where: { id } }).catch(() => undefined);
  revalidatePath("/admin/templates");
  redirect("/admin/templates");
}
