import type { Case, CaseForm, CrmForm, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { escapeHtml } from "@/lib/mail";
import { createCase, ensureToken, loadCase, logEvent, portalUrl, caseFacts } from "../cases";
import { buttonHtml, mergePlaceholders, notifyBroker, sendToCaseClients } from "../email";
import { getFfFormId, getFormEmailTpl } from "../options";
import { autop, mysqlNow, stripTags } from "../util";
import { onCaseCreated, onFormSubmitted } from "../automation";
import { classicFactFind } from "./defaults";
import {
  caseMapColumn, countFields, normalizeSchema, sanitizeValues, stampSignatures, stripHidden, summaryHtml, validate,
  type Schema, type Values,
} from "./engine";

export const formSchema = (f: Pick<CrmForm, "schema">): Schema => normalizeSchema(f.schema);

export async function getPublishedForm(id: number) {
  const f = await prisma.crmForm.findUnique({ where: { id } });
  return f && f.status === "publish" ? f : null;
}

/** Engine Fact Find (designated form) or the classic built-in one. */
export async function factFindSchema(): Promise<{ schema: Schema; formId: number; title: string; engine: boolean }> {
  const id = await getFfFormId();
  if (id) {
    const f = await getPublishedForm(id);
    if (f) {
      const s = formSchema(f);
      if (countFields(s)) return { schema: s, formId: f.id, title: f.title, engine: true };
    }
  }
  return { schema: classicFactFind(), formId: 0, title: "Mustang Mortgage — Client Fact Find", engine: false };
}

/* ---------------- case linkage ---------------- */
type CaseLike = Pick<Case, "app1Name" | "app1Email" | "app1Dob" | "app1Mobile" | "app2Name" | "app2Email" | "app2Dob" | "app2Mobile" | "loanAmount">;

export function prefillFromCase(s: Schema, c: CaseLike, values: Values): Values {
  const out = { ...values };
  for (const sec of s.sections)
    for (const f of sec.fields) {
      if (!f.map || out[f.key]) continue;
      const col = caseMapColumn(f.map) as keyof CaseLike;
      if (!col) continue;
      const v = c[col];
      if (v !== "" && v !== null && v !== undefined && v !== 0) out[f.key] = String(v);
    }
  return out;
}

/** Copy mapped answers into the case (only fills blanks unless overwrite). */
export async function syncToCase(s: Schema, caseId: number, values: Values, overwrite = false) {
  const c = await prisma.case.findUnique({ where: { id: caseId } });
  if (!c) return;
  const data: Record<string, string | number> = {};
  for (const sec of s.sections)
    for (const f of sec.fields) {
      if (!f.map) continue;
      const v = String(values[f.key] ?? "").trim();
      if (!v) continue;
      const col = caseMapColumn(f.map);
      if (!col) continue;
      const cur = (c as unknown as Record<string, unknown>)[col];
      if (overwrite || cur === "" || cur === null || cur === undefined) {
        if (col === "loanAmount") {
          const n = parseFloat(v.replace(/[^0-9.\-]/g, ""));
          if (Number.isFinite(n)) data[col] = n;
        } else data[col] = v;
      }
    }
  if (Object.keys(data).length) await prisma.case.update({ where: { id: caseId }, data });
}

/* ---------------- status ---------------- */
export function statusOf(st: Pick<CaseForm, "submittedAt" | "draft" | "openedAt" | "sentAt">) {
  const draft = st.draft && typeof st.draft === "object" ? Object.keys(st.draft as object).length : 0;
  if (st.submittedAt) return "submitted";
  if (draft) return "in_progress";
  if (st.openedAt) return "opened";
  if (st.sentAt) return "sent";
  return "assigned";
}

export const STATUS_LABELS: Record<string, [string, string]> = {
  submitted: ["Submitted", "good"],
  in_progress: ["In progress", "info"],
  opened: ["Opened", "warn"],
  sent: ["Sent – awaiting", "warn"],
  assigned: ["Not sent yet", ""],
  not_started: ["Not started", ""],
};
export const statusLabel = (s: string): [string, string] => STATUS_LABELS[s] ?? [s, ""];

export async function formUrl(c: Pick<Case, "id" | "portalToken">, formId: number | "ff") {
  return portalUrl(c, { step: formId === "ff" ? "factfind" : `form-${formId}` });
}

export type FormRow = { id: number | "ff"; title: string; status: string; sentAt: Date | null; submittedAt: Date | null; url: string; isFf: boolean };

/** MMCRM_Forms::case_form_rows */
export async function caseFormRows(c: Case): Promise<FormRow[]> {
  const draft = c.ffDraft && typeof c.ffDraft === "object" ? Object.keys(c.ffDraft as object).length : 0;
  const ffStatus = c.ffDone ? "submitted" : draft ? "in_progress" : c.ffSentAt ? "sent" : "not_started";
  const rows: FormRow[] = [{ id: "ff", title: "Fact Find", status: ffStatus, sentAt: c.ffSentAt, submittedAt: c.ffDoneAt, url: await formUrl(c, "ff"), isFf: true }];
  const states = await prisma.caseForm.findMany({ where: { caseId: c.id, removed: false }, orderBy: { id: "asc" } });
  if (states.length) {
    const forms = await prisma.crmForm.findMany({ where: { id: { in: states.map((s) => s.formId) } } });
    for (const st of states) {
      const f = forms.find((x) => x.id === st.formId);
      if (!f || f.status === "trash") continue;
      rows.push({ id: f.id, title: f.title, status: statusOf(st), sentAt: st.sentAt, submittedAt: st.submittedAt, url: await formUrl(c, f.id), isFf: false });
    }
  }
  return rows;
}

/** Forms the client sees as tabs in the portal. */
export async function portalForms(caseId: number) {
  const states = await prisma.caseForm.findMany({ where: { caseId, removed: false }, orderBy: { id: "asc" } });
  if (!states.length) return [];
  const forms = await prisma.crmForm.findMany({ where: { id: { in: states.map((s) => s.formId) }, status: "publish" } });
  return states
    .map((st) => {
      const f = forms.find((x) => x.id === st.formId);
      return f ? { id: f.id, title: f.title, status: statusOf(st), state: st, form: f } : null;
    })
    .filter(Boolean) as { id: number; title: string; status: string; state: CaseForm; form: CrmForm }[];
}

/* ---------------- assign / send ---------------- */
async function mergeFormMail(c: Parameters<typeof mergePlaceholders>[0], text: string, name: string, url: string) {
  const t = await mergePlaceholders(c, text, false);
  return t.replaceAll("{{form_name}}", escapeHtml(name)).replaceAll("{{form_url}}", escapeHtml(url)).replaceAll("{{form_button}}", buttonHtml(url, "Open " + name));
}

/** MMCRM_Forms_Admin::send_form. Returns [ok, message]. */
export async function sendForm(caseId: number, formId: number | "ff", email = true, subject = "", body = ""): Promise<[boolean, string]> {
  const c0 = await prisma.case.findUnique({ where: { id: caseId } });
  if (!c0) return [false, "Invalid case"];
  let name = "Fact Find";
  if (formId !== "ff") {
    const f = await prisma.crmForm.findUnique({ where: { id: formId } });
    if (!f || f.status === "trash") return [false, "Form not found"];
    await prisma.caseForm.upsert({
      where: { caseId_formId: { caseId, formId } },
      create: { caseId, formId, sentAt: new Date() },
      update: { sentAt: new Date(), removed: false },
    });
    name = f.title;
  } else {
    await prisma.case.update({ where: { id: caseId }, data: { ffSentAt: new Date(), showFactfind: true, portalClosed: false } });
  }
  await ensureToken(caseId);
  const c = (await loadCase(caseId))!;
  const url = await formUrl(c, formId);
  let msg = "Link ready.";
  if (email) {
    const tpl = await getFormEmailTpl();
    const sub = subject || tpl.subject;
    const bod = body || tpl.body;
    const subj = stripTags(await mergeFormMail(c, sub, name, url));
    let html = autop(await mergeFormMail(c, bod, name, url));
    if (!bod.includes("{{form_button}}") && !bod.includes("{{form_url}}")) html += buttonHtml(url, "Open " + name);
    const facts = caseFacts(c);
    const r = await sendToCaseClients(caseId, facts.emails, subj, html);
    if (!r.ok) return [false, "Form assigned, but email failed: " + r.error];
    msg = "Sent to " + facts.emails.join(", ");
  }
  await logEvent(caseId, "form_sent", `${email ? "Sent" : "Assigned"} "${name}" to client`, "admin");
  return [true, msg];
}

export async function unassignForm(caseId: number, formId: number) {
  await prisma.caseForm.updateMany({ where: { caseId, formId }, data: { removed: true } });
}

/* ---------------- client save / submit (non Fact Find) ---------------- */
export type SaveResult = { ok: true; saved?: string; done?: boolean; reload?: boolean } | { ok: false; errors: string[]; fields?: Record<string, string> };

export async function saveFormAnswers(opts: {
  formId: number; caseId: number | null; raw: Values; mode: "draft" | "submit"; silent: boolean; ip: string;
}): Promise<SaveResult> {
  const f = await getPublishedForm(opts.formId);
  if (!f) return { ok: false, errors: ["This form is not available."] };
  const schema = formSchema(f);
  let caseId = opts.caseId;
  let st: CaseForm | null = null;
  if (caseId) {
    st = await prisma.caseForm.findUnique({ where: { caseId_formId: { caseId, formId: f.id } } });
    if (!st || st.removed) return { ok: false, errors: ["This form is not available for your case."] };
  } else if (!schema.settings.public) {
    return { ok: false, errors: ["This form is not public."] };
  }
  const old = (st?.draft ?? {}) as Values;
  let values = sanitizeValues(schema, opts.raw);
  values = stampSignatures(schema, values, old, mysqlNow());
  if (opts.mode === "submit") {
    const errors = validate(schema, values);
    if (Object.keys(errors).length) return { ok: false, errors: Object.values(errors), fields: errors };
    values = stripHidden(schema, values);
  }
  const fromPublic = !caseId;
  if (!caseId) {
    // WP always creates a case for public submissions.
    caseId = await createCaseFromPublic(schema, f, values);
    if (!caseId) return { ok: false, errors: ["Sorry, something went wrong. Please try again."] };
  }
  await syncToCase(schema, caseId, values, false);
  const now = new Date();
  if (opts.mode === "submit") {
    const hist = Array.isArray(st?.history) ? (st!.history as Prisma.JsonArray) : [];
    const history = [...hist, { ts: mysqlNow(now), data: values, ip: opts.ip }].slice(-8) as Prisma.InputJsonValue;
    await prisma.caseForm.upsert({
      where: { caseId_formId: { caseId, formId: f.id } },
      create: { caseId, formId: f.id, draft: values as Prisma.InputJsonValue, submittedAt: now, history, sentAt: fromPublic ? null : now },
      update: { draft: values as Prisma.InputJsonValue, submittedAt: now, history },
    });
    await logEvent(caseId, "form_submit", `Client submitted "${f.title}"`, "client");
    await notifyBroker(caseId, `"${f.title}" submitted`, `<p>A client submitted <strong>${escapeHtml(f.title)}</strong>.</p>${summaryHtml(schema, values)}`, schema.settings.notify_email);
    await onFormSubmitted(caseId, f.title);
    return { ok: true, saved: mysqlNow(now), done: true, reload: !fromPublic };
  }
  await prisma.caseForm.update({ where: { caseId_formId: { caseId, formId: f.id } }, data: { draft: values as Prisma.InputJsonValue } });
  if (!opts.silent) await logEvent(caseId, "form_draft", `Client saved a draft of "${f.title}"`, "client");
  return { ok: true, saved: mysqlNow(now) };
}

async function createCaseFromPublic(schema: Schema, f: CrmForm, values: Values) {
  let name = "", email = "";
  for (const sec of schema.sections)
    for (const fl of sec.fields) {
      if (fl.map === "app1_name") name = String(values[fl.key] ?? "");
      if (fl.map === "app1_email") email = String(values[fl.key] ?? "");
    }
  const title = (name || email || "Website enquiry") + " — " + f.title;
  const c = await createCase({ title, originFormId: f.id, legacyEmail: email, legacyName: name, stage: "new", status: "active" });
  await prisma.caseForm.create({ data: { caseId: c.id, formId: f.id, draft: values as Prisma.InputJsonValue } });
  await syncToCase(schema, c.id, values, true);
  await onCaseCreated(c.id, "public_form");
  return c.id;
}
