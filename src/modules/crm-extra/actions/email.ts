"use server";
// Case email composer (ajax.php mm_send_email / mm_send_pending / mm_get_template) + Email Trail.
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { sendCaseEmail, extractEmails } from "../send";
import { buildContext, merge } from "../lib/merge";
import { getTemplate } from "../lib/templates";
import { cleanEmailHtml } from "../lib/html";
import { fetchTrail, trailBody, trailAttachments, type Cursor } from "../lib/trail";

type R = { ok: boolean; error?: string };

async function recipients(caseId: number, to: string) {
  let list = extractEmails(to.replace(/;/g, ","));
  if (!list.length) {
    const c = await prisma.case.findUnique({ where: { id: caseId }, select: { app1Email: true, app2Email: true, app3Email: true, app4Email: true, legacyEmail: true } });
    if (c) list = extractEmails([c.app1Email, c.app2Email, c.app3Email, c.app4Email].join(",")) ;
    if (!list.length && c) list = extractEmails(c.legacyEmail);
  }
  return list;
}

async function doSend(caseId: number, to: string, cc: string, bcc: string, subject: string, body: string, by: string): Promise<R> {
  const c = await prisma.case.findUnique({ where: { id: caseId }, select: { id: true } });
  if (!c) return { ok: false, error: "Bad case" };
  const toList = await recipients(caseId, to);
  if (!toList.length) return { ok: false, error: "Recipient is required" };
  const ctx = await buildContext(caseId);
  const subj = merge(subject, ctx, false);
  let html = cleanEmailHtml(merge(body, ctx, true));
  const hasSigToken = /\{\{\s*signature_html\s*\}\}/i.test(body);
  if (!html.replace(/<[^>]*>/g, "").trim() && !/<img/i.test(html)) html = "<div>&nbsp;</div>";
  const r = await sendCaseEmail({
    caseId,
    to: toList,
    cc: extractEmails(cc.replace(/;/g, ",")),
    bcc: extractEmails(bcc.replace(/;/g, ",")),
    subject: subj,
    html,
    noWrap: true,
    noSignature: hasSigToken,
    sentBy: by,
  });
  revalidatePath(`/admin/cases/${caseId}`);
  return r.ok ? { ok: true } : { ok: false, error: r.error };
}

export async function emailSend(caseId: number, f: { to: string; cc: string; bcc: string; subject: string; body: string }): Promise<R> {
  const s = await requireStaff();
  return doSend(caseId, f.to, f.cc, f.bcc, f.subject.trim() || "📄 Update from Mustang Mortgage", f.body, s.name);
}

const PENDING_BODY = `<p>Hi {{applicant_first_name}},</p>
<p>I hope you're doing well!</p>
<p>Just a gentle reminder — we’re almost there, but we’re still waiting on the following documents for the application::</p>
{{checklist_pending_list}}
<p>{{portal_button}}</p>
<p style="color:#666;font-size:12px">This secure link is unique to you 🔐.</p>`;

export async function emailSendPending(caseId: number, f: { to: string; cc: string; bcc: string; subject: string }): Promise<R> {
  const s = await requireStaff();
  const subject = f.subject.trim() && f.subject.trim() !== "Update from Mustang Mortgage" ? f.subject : "Documents needed for {{applicant_full_name}}";
  return doSend(caseId, f.to, f.cc, f.bcc, subject, PENDING_BODY, s.name);
}

export async function emailTemplate(templateId: number, caseId: number): Promise<{ ok: boolean; subject?: string; body?: string; error?: string }> {
  await requireStaff();
  if (!templateId) return { ok: false, error: "Bad id" };
  const t = await getTemplate(templateId);
  if (!t) return { ok: false, error: "Not found" };
  const ctx = caseId ? await buildContext(caseId) : {};
  return { ok: true, subject: merge(t.subject || t.title, ctx), body: cleanEmailHtml(merge(t.body, ctx, true)) };
}

export async function trailList(caseId: number, cursor: Cursor) {
  await requireStaff();
  try {
    return { ok: true as const, ...(await fetchTrail(caseId, cursor)) };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed to build trail" };
  }
}
export async function trailGetBody(folderId: string, messageId: string) {
  await requireStaff();
  return trailBody(folderId, messageId);
}
export async function trailGetAtts(folderId: string, messageId: string) {
  await requireStaff();
  return trailAttachments(folderId, messageId);
}
