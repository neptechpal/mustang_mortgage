import { prisma } from "@/lib/db";
import { escapeHtml, sendMail } from "@/lib/mail";
import { siteInfo } from "../forms/site-info";
import { LEAD_EMAIL_RE, LEAD_FIELDS, LEAD_FORM } from "./definition";
import { saveFormAnswers } from "@/modules/crm/forms/service";

type Result = { success: boolean; data?: { errors?: string[]; fields?: Record<string, string>; submissionId?: number } };

/**
 * Public lead form 3012 (contact page). Like WP, it creates a CRM case through
 * the CRM forms engine (which also notifies the broker). The answers are also
 * stored as a FormSubmission ("mmf:3012", incl. the CRM field mapping in
 * data._map); if the CRM form is missing, staff get the notification below.
 */
export async function handleLeadSubmission(fd: FormData, ctx: { ip: string; userAgent: string; url: string }): Promise<Result> {
  const values: Record<string, string | string[]> = {};
  const fields: Record<string, string> = {};
  for (const f of LEAD_FIELDS) {
    if (f.type === "checkbox") {
      const v = fd.getAll(`${f.key}[]`).map(String).filter((x) => f.options!.includes(x));
      values[f.key] = v;
      if (f.required && !v.length) fields[f.key] = `${f.label} is required.`;
      continue;
    }
    let v = String(fd.get(f.key) ?? "").trim().slice(0, f.type === "textarea" ? 5000 : 300);
    if (f.type === "select" && v && !f.options!.includes(v)) v = "";
    if (f.type === "currency") v = v.replace(/[^0-9.\-]/g, "");
    values[f.key] = v;
    if (f.required && !v) fields[f.key] = `${f.label} is required.`;
    else if (f.type === "email" && v && !LEAD_EMAIL_RE.test(v)) fields[f.key] = "Enter a valid email address.";
  }
  if (Object.keys(fields).length) return { success: false, data: { errors: Object.values(fields), fields } };

  const map: Record<string, string> = {};
  for (const f of LEAD_FIELDS) if (f.map) map[f.map] = String(values[f.key] ?? "");

  const sub = await prisma.formSubmission.create({
    data: {
      formKey: `mmf:${LEAD_FORM.id}`,
      formTitle: LEAD_FORM.title,
      name: String(values.full_name),
      email: String(values.email),
      data: { ...values, _map: map },
      meta: { ip: ctx.ip, userAgent: ctx.userAgent, url: ctx.url },
    },
  });

  const crmForm = await prisma.crmForm.findFirst({ where: { wpId: LEAD_FORM.id, status: "publish" } });
  if (crmForm) {
    const res = await saveFormAnswers({ formId: crmForm.id, caseId: null, raw: values, mode: "submit", silent: true, ip: ctx.ip }).catch(() => null);
    if (res?.ok) {
      await prisma.formSubmission.update({ where: { id: sub.id }, data: { meta: { ip: ctx.ip, userAgent: ctx.userAgent, url: ctx.url, crmForm: crmForm.id } } });
      return { success: true, data: { submissionId: sub.id } };
    }
  }

  const info = await siteInfo();
  const rows = LEAD_FIELDS.map((f) => {
    const v = values[f.key];
    const s = Array.isArray(v) ? v.join(", ") : f.type === "currency" && v ? `$${Number(v).toLocaleString("en-AU")}` : v;
    return `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">${escapeHtml(f.label)}</td><td style="padding:8px;border:1px solid #ddd">${escapeHtml(s || "—").replace(/\n/g, "<br />")}</td></tr>`;
  }).join("");
  const mail = await sendMail({
    to: info.adminEmail,
    subject: `New website enquiry — ${values.full_name}`,
    replyTo: String(values.email),
    html:
      `<h2 style="color:${LEAD_FORM.accent};font-family:Arial,sans-serif">${escapeHtml(LEAD_FORM.title)}</h2>` +
      `<table style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${rows}</table>` +
      `<p style="font-family:Arial,sans-serif;font-size:13px"><a href="${info.url}/admin/submissions/${sub.id}">View in admin</a></p>`,
    context: `mmf:${LEAD_FORM.id}:${sub.id}`,
  });
  await prisma.formSubmission.update({ where: { id: sub.id }, data: { meta: { ip: ctx.ip, userAgent: ctx.userAgent, url: ctx.url, mail: { notify: mail } } } });
  return { success: true, data: { submissionId: sub.id } };
}

/** Footer "Join Our Community" (was Mailchimp list f735255324). */
export async function handleNewsletter(fd: FormData, ctx: { ip: string; userAgent: string; url: string }) {
  const email = String(fd.get("wpr_mailchimp_email") ?? "").trim().toLowerCase();
  if (!email || !LEAD_EMAIL_RE.test(email) || email.length > 200) return { status: "error" as const };
  const existing = await prisma.formSubmission.findFirst({ where: { formKey: "newsletter", email } });
  if (!existing) {
    await prisma.formSubmission.create({
      data: { formKey: "newsletter", formTitle: "Join Our Community (newsletter)", email, data: { email, listId: "f735255324" }, meta: ctx },
    });
  }
  return { status: "subscribed" as const };
}
