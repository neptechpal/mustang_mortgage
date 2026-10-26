import { prisma } from "./db";

export type MailAttachment = { filename: string; content: Buffer; contentType?: string };

export type MailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  fromName?: string;
  fromEmail?: string;
  attachments?: MailAttachment[];
  context?: string; // free-form tag for MailLog, e.g. "cf7:1767"
};

const list = (v?: string | string[]) => (v ? (Array.isArray(v) ? v : v.split(",")).map((s) => s.trim()).filter(Boolean) : []);

/**
 * Sends mail via the SMTP2GO HTTP API (same transport the WordPress site used
 * through Post SMTP). Without SMTP2GO_API_KEY the mail is logged as "skipped".
 */
export async function sendMail(input: MailInput): Promise<{ ok: boolean; error?: string }> {
  const to = list(input.to);
  const fromEmail = input.fromEmail || process.env.MAIL_FROM || "info@mustangmortgage.com.au";
  const fromName = input.fromName || process.env.MAIL_FROM_NAME || "Mustang Mortgage";
  const apiKey = process.env.SMTP2GO_API_KEY;
  const log = (status: string, error = "") =>
    prisma.mailLog
      .create({ data: { to: to.join(", "), subject: input.subject, status, error, context: input.context ?? "" } })
      .catch(() => undefined);

  if (!to.length) return { ok: false, error: "no recipients" };
  if (!apiKey) {
    await log("skipped", "SMTP2GO_API_KEY not configured");
    return { ok: false, error: "mail not configured" };
  }

  try {
    const res = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Smtp2go-Api-Key": apiKey },
      body: JSON.stringify({
        sender: `${fromName} <${fromEmail}>`,
        to,
        cc: list(input.cc),
        bcc: list(input.bcc),
        subject: input.subject,
        html_body: input.html,
        text_body: input.text,
        custom_headers: input.replyTo ? [{ header: "Reply-To", value: input.replyTo }] : undefined,
        attachments: input.attachments?.map((a) => ({
          filename: a.filename,
          fileblob: a.content.toString("base64"),
          mimetype: a.contentType || "application/octet-stream",
        })),
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { data?: { succeeded?: number; error?: string } };
    if (!res.ok || !body.data?.succeeded) {
      const error = body.data?.error || `HTTP ${res.status}`;
      await log("failed", error);
      return { ok: false, error };
    }
    await log("sent");
    return { ok: true };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await log("failed", error);
    return { ok: false, error };
  }
}

/** Replaces {placeholder} / [placeholder] / {{placeholder}} tokens. Unknown tokens are left intact. */
export function fillTemplate(tpl: string, vars: Record<string, string | number | undefined | null>) {
  return tpl.replace(/\{\{\s*([\w-]+)\s*\}\}|\{([\w-]+)\}|\[([\w-]+)\]/g, (m, a, b, c) => {
    const k = a || b || c;
    const v = vars[k];
    return v === undefined || v === null ? m : String(v);
  });
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
