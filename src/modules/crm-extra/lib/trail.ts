// Email Trail (port of includes/trail.php, build trail-manualload+fullname-pairs-2025-08-25b):
// live Zoho Inbox+Sent paging (50+50), case matching by TAG / CLIENT / APP1 / APP2 / NAME.
import { prisma } from "@/lib/db";
import { getZoho, SITE_URL, dcBase } from "./opts";
import { zohoApi, resolveFolders, toUnix } from "./zoho";
import { subjectCaseTag, addrOnly } from "./sync";
import { stripScripts, esc } from "./html";

export const INBOX_LIMIT = 50;
export const SENT_LIMIT = 50;

export type TrailItem = {
  ts: number;
  iso: string;
  subject: string;
  subjectRaw: string;
  from: string;
  to: string;
  direction: "in" | "out";
  why: string;
  id: string;
  folderId: string;
  preview: string;
  conv: string;
  zohoLink: string;
};
export type Cursor = { start_inbox: number; start_sent: number };

const EMAIL_RE = /[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/gi;

function collectAllEmails(row: Record<string, unknown>): string[] {
  const keys = ["fromAddress", "from", "sender", "senderAddress", "toAddress", "toAddr", "to", "ccAddress", "cc", "bccAddress", "bcc", "replyToAddress", "replyTo"];
  const out = new Set<string>();
  const walk = (v: unknown) => {
    if (typeof v === "string") (v.match(EMAIL_RE) || []).forEach((e) => out.add(e.toLowerCase()));
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") for (const k of ["email", "mailId", "address", "emailAddress"]) walk((v as Record<string, unknown>)[k]);
  };
  for (const k of keys) walk(row[k]);
  if (!out.size) (JSON.stringify(row).match(EMAIL_RE) || []).forEach((e) => out.add(e.toLowerCase()));
  return Array.from(out);
}

const TITLES = /^(mr|mrs|ms|miss|mx|dr|prof|sir|madam)\.?\s+/i;
function namePair(full: string): [string, string] | null {
  const parts = full.replace(TITLES, "").trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  return [parts[0], parts[parts.length - 1]];
}
const reEsc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function nameRegexes(names: string[]): RegExp[] {
  const out: RegExp[] = [];
  const B = "(?<![\\p{L}\\p{N}])",
    A = "(?![\\p{L}\\p{N}])",
    SEP = "(?:[,\\/\\-]|\\s+|)\\s*";
  for (const n of names) {
    const p = namePair(n);
    if (!p) continue;
    const [f, l] = p.map(reEsc);
    out.push(new RegExp(`${B}${f}${SEP}${l}${A}`, "iu"), new RegExp(`${B}${l}${SEP}${f}${A}`, "iu"), new RegExp(`${B}${l},\\s*${f}${A}`, "iu"));
  }
  return out;
}

function subjectClean(s: string) {
  let x = s;
  let prev = "";
  while (prev !== x) {
    prev = x;
    x = x.replace(/^\s*(re|fwd?|fw)\s*:\s*/i, "");
  }
  return x.replace(/\[\s*MM\s*#\s*\d+[^\]]*\]/gi, "").replace(/\s+/g, " ").trim();
}

function cleanPreview(raw: string) {
  const txt = raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .split(/\r?\n/)
    .filter((l) => !/^\s*>/.test(l) && !/Original Message|^On .*wrote:|Sent from my|Get Outlook|View this email in your browser/i.test(l))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return txt.length > 240 ? txt.slice(0, 240) + "…" : txt;
}

export async function fetchTrail(caseId: number, cursor: Cursor) {
  const c = await prisma.case.findUnique({ where: { id: caseId } });
  if (!c) throw new Error("Invalid case");
  const z = await getZoho();
  const f = await resolveFolders();
  const rows: Record<string, unknown>[] = [];
  let gotIn = 0,
    gotSent = 0;
  const si = Math.max(0, cursor.start_inbox || 0),
    ss = Math.max(0, cursor.start_sent || 0);
  for (const [fid, origin, start, lim] of [
    [f.inbox, "inbox", si, INBOX_LIMIT],
    [f.sent, "sent", ss, SENT_LIMIT],
  ] as const) {
    if (!fid) continue;
    const r = await zohoApi(`/messages/view?folderId=${encodeURIComponent(fid)}&start=${start}&limit=${lim}`);
    const list: Record<string, unknown>[] = Array.isArray(r.body?.data) ? r.body.data : [];
    for (const m of list) rows.push({ ...m, folderId: m.folderId || fid, mmOrigin: origin });
    if (origin === "inbox") gotIn = list.length;
    else gotSent = list.length;
  }
  const primary = c.legacyEmail.trim().toLowerCase(),
    a1 = c.app1Email.trim().toLowerCase(),
    a2 = c.app2Email.trim().toLowerCase();
  const res = nameRegexes([c.app1Name, c.app2Name, c.legacyName].filter(Boolean));
  const [, mail] = dcBase(z.dc);
  const items: TrailItem[] = [];
  for (const row of rows) {
    const subjectRaw = String(row.subject ?? "");
    let why = subjectCaseTag(subjectRaw) === caseId ? "TAG" : "";
    if (!why) {
      const hay = collectAllEmails(row);
      if (primary && hay.includes(primary)) why = "CLIENT";
      else if (a1 && hay.includes(a1)) why = "APP1";
      else if (a2 && hay.includes(a2)) why = "APP2";
    }
    if (!why && res.some((re) => re.test(subjectRaw))) why = "NAME";
    if (!why) continue;
    const fromFull = String(row.fromAddress ?? row.from ?? "");
    const toFull = String(row.toAddress ?? row.toAddr ?? row.to ?? "");
    const ts = toUnix(row.receivedTime ?? row.sentTime ?? row.sentDateInGMT);
    const id = String(row.messageId ?? row.id ?? "");
    const folderId = String(row.folderId ?? "");
    items.push({
      ts,
      iso: ts ? new Date(ts * 1000).toISOString() : "",
      subject: subjectClean(subjectRaw) || "(no subject)",
      subjectRaw,
      from: addrOnly(fromFull) || fromFull,
      to: addrOnly(toFull) || toFull,
      direction: row.mmOrigin === "sent" ? "out" : "in",
      why,
      id,
      folderId,
      preview: cleanPreview(String(row.summary ?? row.content ?? "")),
      conv: String(row.conversationId ?? row.threadId ?? ""),
      zohoLink: `${mail}/zm/#mail/folder/${folderId}/message/${id}`,
    });
  }
  items.sort((a, b) => b.ts - a.ts);
  const seen = new Set<string>();
  const out = items.filter((i) => {
    const k = `${i.id}|${i.ts}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return {
    items: out,
    cursor: { start_inbox: si + gotIn, start_sent: ss + gotSent },
    hasMore: gotIn >= INBOX_LIMIT || gotSent >= SENT_LIMIT,
  };
}

/** Trail sanitiser: strip scripts/handlers, force links to new tab. */
function trailSanitize(html: string) {
  return stripScripts(html)
    .replace(/<(iframe|object|embed|form|style)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/<a\s/gi, '<a target="_blank" rel="noreferrer noopener" ');
}

function maybeDecode(content: string, enc = "") {
  if (/base64/i.test(enc) || (/^[A-Za-z0-9+/=\s]{40,}$/.test(content) && !content.includes("<"))) {
    try {
      return Buffer.from(content.replace(/\s+/g, ""), "base64").toString("utf8");
    } catch {}
  }
  if (/quoted-printable/i.test(enc)) return content.replace(/=\r?\n/g, "").replace(/=([A-Fa-f0-9]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  return content;
}

export async function trailBody(folderId: string, messageId: string): Promise<string> {
  try {
    const d = await zohoApi(`/folders/${encodeURIComponent(folderId)}/messages/${encodeURIComponent(messageId)}/details`);
    const data = d.body?.data;
    const slot = (x: Record<string, unknown> | undefined) => (x ? String(x.content ?? x.html ?? x.messageBody ?? x.body ?? "") : "");
    let html = slot(Array.isArray(data) ? data[0] : undefined) || slot(data);
    const enc = String((Array.isArray(data) ? data[0] : data)?.contentTransferEncoding ?? "");
    if (html) return trailSanitize(maybeDecode(html, enc));
    for (const ep of ["content", "raw"]) {
      const r = await zohoApi(`/folders/${encodeURIComponent(folderId)}/messages/${encodeURIComponent(messageId)}/${ep}`);
      html = String(r.body?.data?.content ?? r.body?.data?.html ?? "");
      if (html) return trailSanitize(html);
      if (!r.body && r.raw.includes("<")) return trailSanitize(r.raw);
    }
    const c = await zohoApi(`/messages/${encodeURIComponent(messageId)}?includeContent=true`);
    const x = c.body?.data;
    if (x?.content) return trailSanitize(String(x.content));
    if (x?.plainTextContent) return `<p>${esc(String(x.plainTextContent)).replace(/\n/g, "<br>")}</p>`;
    return "<p>(no content)</p>";
  } catch {
    return "<p>(content unavailable)</p>";
  }
}

export async function trailAttachments(folderId: string, messageId: string) {
  const z = await getZoho();
  const [, mail] = dcBase(z.dc);
  const out: { name: string; url: string }[] = [];
  const add = (a: Record<string, unknown>) => {
    const name = String(a.fileName ?? a.name ?? a.attachmentName ?? "");
    let url = String(a.attachmentUrl ?? a.downloadUrl ?? a.fileUrl ?? a.url ?? "");
    const aid = String(a.attachmentId ?? a.id ?? "");
    if (!url && aid) url = `${SITE_URL}/api/admin/x/email/attachment?fid=${encodeURIComponent(folderId)}&mid=${encodeURIComponent(messageId)}&aid=${encodeURIComponent(aid)}&name=${encodeURIComponent(name)}`;
    if (url) out.push({ name: name || url.split("/").pop() || "attachment", url });
  };
  const r = await zohoApi(`/folders/${encodeURIComponent(folderId)}/messages/${encodeURIComponent(messageId)}/attachmentinfo`);
  const d = r.body?.data;
  for (const k of ["attachments", "attachmentInfos", "attachmentInfo", "inline"]) if (Array.isArray(d?.[k])) d[k].forEach(add);
  if (!out.length) {
    const det = await zohoApi(`/folders/${encodeURIComponent(folderId)}/messages/${encodeURIComponent(messageId)}/details`);
    const x = Array.isArray(det.body?.data) ? det.body.data[0] : det.body?.data;
    for (const k of ["attachments", "attachmentInfos", "attachmentInfo", "inlineAttachments", "inline"]) if (Array.isArray(x?.[k])) x[k].forEach(add);
  }
  return { items: out, zohoLink: `${mail}/zm/#mail/folder/${folderId}/message/${messageId}` };
}

/** Proxy an attachment download with our token (so staff need no Zoho login). */
export async function downloadAttachment(folderId: string, messageId: string, attachmentId: string) {
  const z = await getZoho();
  const { zohoToken } = await import("./zoho");
  const token = await zohoToken();
  if (!token) return null;
  const [, mail] = dcBase(z.dc);
  const res = await fetch(`${mail}/api/accounts/${z.accountId}/folders/${folderId}/messages/${messageId}/attachments/${attachmentId}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
    cache: "no-store",
  });
  return res.ok ? res : null;
}
