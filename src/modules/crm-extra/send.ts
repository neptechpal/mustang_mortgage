// CONTRACT: all client-facing CRM emails (portal links, chase, templates)
// go through sendCaseEmail. Port of mmcrm_send_case_email (mmcrm-lib.php):
// wrap with brand logo, append signature when "auto append" is on, clean the
// HTML, send through Zoho Mail when connected (indexing ids for threading),
// otherwise fall back to SMTP2GO via sendMail; record the message in the case
// email trail (CaseEmail).
import { sendMail, type MailAttachment } from "@/lib/mail";
import { prisma } from "@/lib/db";
import { getCrmOptions, getZoho, zohoConnected, fromAddress } from "./lib/opts";
import { zohoSend } from "./lib/zoho";
import { cleanEmailHtml, wrapEmail } from "./lib/html";

export type CaseEmail = {
  caseId: number;
  to: string | string[];
  subject: string;
  html: string;
  cc?: string | string[];
  bcc?: string | string[];
  fromAlias?: string;
  attachments?: MailAttachment[];
  /** Skip the brand wrapper (body already a full email). */
  noWrap?: boolean;
  /** Do not append the signature even when auto-append is on. */
  noSignature?: boolean;
  /** Who sent it (display name) — stored on the trail row. */
  sentBy?: string;
};

const EMAIL_RE = /[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/gi;
export const extractEmails = (v?: string | string[]) => {
  const s = Array.isArray(v) ? v.join(",") : v || "";
  return Array.from(new Set((s.match(EMAIL_RE) || []).map((e) => e.toLowerCase())));
};

export async function sendCaseEmail(m: CaseEmail): Promise<{ ok: boolean; error?: string; via?: "zoho" | "smtp" }> {
  const o = await getCrmOptions();
  const to = extractEmails(m.to);
  const cc = extractEmails(m.cc);
  const bcc = extractEmails(m.bcc);
  if (!to.length) return { ok: false, error: "No recipient email address on this case." };

  let body = m.noWrap ? m.html : wrapEmail(m.html, o.brandLogo);
  if (!m.noSignature && o.autoAppendSignature && o.signatureHtml) body += "<br>" + o.signatureHtml;
  body = cleanEmailHtml(body);

  const z = await getZoho();
  const from = m.fromAlias || (await fromAddress());
  let zohoErr = "";

  // Zoho does not accept attachments through this simple JSON endpoint;
  // mails with attachments go through SMTP2GO (still logged to the trail).
  if (zohoConnected(z) && !m.attachments?.length) {
    const r = await zohoSend(m.caseId, to.join(", "), m.subject, body, cc.join(", "), bcc.join(", "), from);
    if (r.ok) {
      await logOut(m, { to, cc, bcc, from, subject: r.subject, html: body, zohoId: r.messageId, conv: r.conversationId, rfc: r.rfcId, source: "zoho" });
      return { ok: true, via: "zoho" };
    }
    zohoErr = r.error;
  }

  const res = await sendMail({
    to,
    cc,
    bcc,
    subject: m.subject,
    html: body,
    fromEmail: from,
    fromName: o.fromName,
    attachments: m.attachments,
    context: `case:${m.caseId}`,
  });
  if (res.ok) {
    await logOut(m, { to, cc, bcc, from, subject: m.subject, html: body, source: "smtp" });
    return { ok: true, via: "smtp" };
  }
  return { ok: false, error: zohoErr || res.error || "The email could not be sent." };
}

async function logOut(
  m: CaseEmail,
  x: { to: string[]; cc: string[]; bcc: string[]; from: string; subject: string; html: string; zohoId?: string; conv?: string; rfc?: string; source: string },
) {
  if (!m.caseId) return;
  await prisma.caseEmail
    .create({
      data: {
        caseId: m.caseId,
        zohoId: x.zohoId || null,
        conversationId: x.conv || "",
        rfcId: x.rfc || "",
        direction: "out",
        source: x.source,
        fromAddr: x.from.toLowerCase(),
        toAddrs: x.to.join(", "),
        ccAddrs: x.cc.join(", "),
        bccAddrs: x.bcc.join(", "),
        subject: x.subject,
        html: x.html,
        attachments: (m.attachments ?? []).map((a) => ({ name: a.filename, size: a.content.length, type: a.contentType ?? "" })),
        sentBy: m.sentBy ?? "",
      },
    })
    .catch(() => undefined);
}

/**
 * Generic (non-case) send used by marketing & digests: Zoho when connected
 * (no case tag), else SMTP2GO.
 */
export async function sendPlainEmail(to: string, subject: string, html: string, context = "crmx") {
  const z = await getZoho();
  if (zohoConnected(z)) {
    const r = await zohoSend(0, to, subject, html);
    if (r.ok) return { ok: true as const };
  }
  const o = await getCrmOptions();
  const res = await sendMail({ to, subject, html, fromEmail: await fromAddress(), fromName: o.fromName, context });
  return res.ok ? { ok: true as const } : { ok: false as const, error: res.error || "send failed" };
}
