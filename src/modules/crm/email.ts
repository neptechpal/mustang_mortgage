import { applicants, applicantEmails } from "./applicants";
import type { Case, CaseDocument } from "@prisma/client";
import { escapeHtml, sendMail } from "@/lib/mail";
import { sendCaseEmail } from "@/modules/crm-extra/send";
import { getCrmOptions as getMailOptions } from "@/modules/crm-extra/lib/opts";
import { getCrmOptions } from "./options";
import { portalUrl } from "./cases";
import { autop, cleanEmailHtml, extractEmails, firstWord, fmtDate, joinIfBoth, siteUrl } from "./util";

type CaseWithDocs = Case & { documents: CaseDocument[] };

/** mmcrm_build_context() */
export async function buildContext(c: CaseWithDocs) {
  const o = await getCrmOptions();
  const portal = await portalUrl(c);
  const app1 = c.app1Name, app2 = c.app2Name;
  const f1 = firstWord(app1), f2 = firstWord(app2);
  const smartFirst = applicants(c).map(a => firstWord(a.name)).filter(Boolean).join(" & ");
  const smartFull = applicants(c).map(a => a.name).filter(Boolean).join(" & ");
  const legacyFull = smartFull || c.legacyName;
  const legacyFirst = smartFirst || firstWord(legacyFull);
  const pending = c.documents.filter((d) => d.status === "Pending" || d.status === "Rejected");
  const pendingHtml = pending.length
    ? "<ul>" + pending.map((p) => `<li>${escapeHtml(p.label)} <em>(${escapeHtml(p.status)})</em>${p.note ? " — " + escapeHtml(p.note) : ""}</li>`).join("") + "</ul>"
    : "<p>No pending items.</p>";
  return {
    applicant1_full_name: app1,
    applicant2_full_name: app2,
    applicant3_full_name: c.app3Name, applicant4_full_name: c.app4Name,
    applicant3_first_name: firstWord(c.app3Name), applicant4_first_name: firstWord(c.app4Name),
    applicant1_first_name: f1,
    applicant2_first_name: f2,
    applicants_first_names: smartFirst,
    applicants_full_names: smartFull,
    greeting_names: smartFirst,
    applicant_full_name: legacyFull,
    applicant_first_name: legacyFirst,
    applicant_email_list: applicantEmails(c).join(", "),
    case_id: String(c.id),
    client_name: c.legacyName,
    site_name: "Mustang Mortgage",
    brand_logo_url: o.brand_logo,
    today: fmtDate(new Date(), { day: "numeric", month: "long", year: "numeric" }),
    portal_url: portal,
    portal_button: `<a href="${escapeHtml(portal)}" style="background:#987633;color:#fff;text-decoration:none;padding:8px 12px;border-radius:8px;display:inline-block">Go to your secure portal</a>`,
    checklist_pending_list: pendingHtml,
    signature_html: (await getMailOptions()).signatureHtml || "",
  } as Record<string, string>;
}

/** mmcrm_merge_placeholders(): {{tag}} case-insensitive; autop when no block tags. */
export async function mergePlaceholders(c: CaseWithDocs, text: string, isHtml = true, ctx?: Record<string, string>) {
  const map = ctx ?? (await buildContext(c));
  let out = String(text || "").replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (m, k: string) => (k.toLowerCase() in map ? map[k.toLowerCase()] : m));
  if (isHtml && !/<\/(p|div|ul|ol|table|section|article|header|footer)>/i.test(out)) out = autop(out);
  return out;
}

export const PLACEHOLDER_CATALOG: { key: string; label: string }[] = [
  { key: "greeting_names", label: 'Greeting Names (smart, e.g. "John" or "John & Freddy")' },
  { key: "applicants_first_names", label: "Applicants First Names (smart)" },
  { key: "applicants_full_names", label: "Applicants Full Names (smart)" },
  { key: "applicant1_first_name", label: "Applicant 1 — First Name" },
  { key: "applicant2_first_name", label: "Applicant 2 — First Name" },
  { key: "applicant1_full_name", label: "Applicant 1 — Full Name" },
  { key: "applicant2_full_name", label: "Applicant 2 — Full Name" },
  ...[3, 4].flatMap(n => [{ key: `applicant${n}_first_name`, label: `Applicant ${n} — First Name` }, { key: `applicant${n}_full_name`, label: `Applicant ${n} — Full Name` }]),
  { key: "applicant_first_name", label: "Applicant First Name (legacy)" },
  { key: "applicant_full_name", label: "Applicant Full Name (legacy)" },
  { key: "portal_url", label: "Secure Upload URL" },
  { key: "portal_button", label: "Secure Upload Button (HTML)" },
  { key: "checklist_pending_list", label: "Pending Checklist (HTML list)" },
  { key: "applicant_email_list", label: "Applicant Email List" },
  { key: "client_name", label: "Client/Case Name" },
  { key: "case_id", label: "Case ID" },
  { key: "today", label: "Today's Date" },
  { key: "site_name", label: "Site Name" },
  { key: "brand_logo_url", label: "Brand Logo URL" },
];

export function buttonHtml(url: string, label: string) {
  return `<p style="margin:22px 0"><a href="${escapeHtml(url)}" style="background:#987633;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;display:inline-block;font-weight:600">${escapeHtml(label)}</a></p>`;
}

export async function wrapEmail(inner: string) {
  const o = await getCrmOptions();
  const logo = o.brand_logo ? `<img src="${escapeHtml(o.brand_logo)}" alt="" style="max-height:42px;margin-bottom:14px">` : "";
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827;line-height:1.55;font-size:15px;max-width:620px">${logo}${inner}</div>`;
}

/** mmcrm_send_case_email(): crm-extra's sendCaseEmail wraps with the logo, appends the
 *  signature, sends via Zoho/SMTP2GO and records the email trail. */
export async function sendToCaseClients(caseId: number, to: string[], subject: string, html: string, opts: { noSignature?: boolean; noWrap?: boolean; cc?: string[]; bcc?: string[]; sentBy?: string } = {}) {
  const list = [...new Set(to.flatMap((t) => extractEmails(t)))];
  if (!list.length) return { ok: false, error: "No recipient email address on this case." };
  let body = html;
  let noSignature = !!opts.noSignature;
  if (/\{\{\s*signature_html\s*\}\}/.test(body)) {
    const o = await getMailOptions();
    body = body.replace(/\{\{\s*signature_html\s*\}\}/g, o.signatureHtml || "");
    noSignature = true;
  }
  body = cleanEmailHtml(body);
  if (!body.replace(/<[^>]*>/g, "").trim()) body = "<div>&nbsp;</div>";
  const r = await sendCaseEmail({ caseId, to: list, subject, html: body, cc: opts.cc, bcc: opts.bcc, noWrap: opts.noWrap, noSignature, sentBy: opts.sentBy });
  return r.ok ? { ok: true as const } : { ok: false as const, error: r.error || "The email could not be sent." };
}

/** Broker notification ([MM#id] subject) — internal, not a client email. */
export async function notifyBroker(caseId: number, subject: string, innerHtml: string, to = "") {
  const o = await getCrmOptions();
  const dest = (to || o.notify_email || o.from_email).split(",").map((s) => s.trim()).filter(Boolean);
  if (!dest.length) return;
  const link = `${siteUrl()}/admin/cases/${caseId}`;
  await sendMail({
    to: dest,
    subject: `[MM#${caseId}] ${subject}`,
    html: await wrapEmail(`${innerHtml}<p><a href="${escapeHtml(link)}">Open the case</a></p>`),
    fromName: o.from_name,
    context: `case:${caseId}:notify`,
  });
}

/** [MM#123 • John Smith] */
export function subjectTag(c: Pick<Case, "id" | "app1Name" | "legacyName" | "ffDraft">) {
  let n = c.app1Name.trim();
  const d = (c.ffDraft || {}) as Record<string, unknown>;
  if (!n) n = String(d.applicant1_fullname ?? "").trim();
  if (!n) n = c.legacyName.trim();
  return `[MM#${c.id}${n ? " • " + n : ""}]`;
}
