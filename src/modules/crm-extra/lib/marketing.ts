// Marketing (port of includes/marketing.php, build marketing-2025-09-07-final).
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { getSetting, setSetting } from "@/lib/settings";
import { getCrmOptions, getZoho, zohoConnected, fromAddress, SITE_URL, SITE_NAME } from "./opts";
import { zohoSend } from "./zoho";
import { buildContext, merge } from "./merge";
import { getTemplate } from "./templates";
import { cleanEmailHtml, esc } from "./html";
import { sydParts, ymdHi } from "./cases";

const AUD_KEY = "crmx.mkt.audiences";
const BDAY_KEY = "crmx.mkt.bday";
const BDAY_LAST = "crmx.mkt.bdayLastRun";
const DEFAULT_AUDIENCES = ["General", "Subscribed", "Potential", "Lead", "Past Client", "VIP"];
export const STATUSES = ["Active", "Trashed", "Unsubscribed"] as const;

const isEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const sanitizeAudience = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 180);
export const splitName = (full: string) => {
  const p = full.trim().split(/\s+/).filter(Boolean);
  return { first: p[0] ?? "", last: p.slice(1).join(" ") };
};

export async function mktLog(type: string, note: string, payload: unknown, userId = 0) {
  await prisma.mktLog.create({ data: { type, note, payload: (payload ?? {}) as object, userId } });
}

/* ---------- audiences ---------- */
export async function audiences(): Promise<string[]> {
  let a = await getSetting<string[] | null>(AUD_KEY, null);
  if (!Array.isArray(a)) {
    a = DEFAULT_AUDIENCES;
    await setSetting(AUD_KEY, a);
  }
  return Array.from(new Set(a.map(sanitizeAudience).filter(Boolean))).sort((x, y) => x.localeCompare(y, undefined, { numeric: true, sensitivity: "base" }));
}
export async function ensureAudience(name: string) {
  const n = sanitizeAudience(name);
  if (!n) return;
  const a = await audiences();
  if (!a.includes(n)) await setSetting(AUD_KEY, [...a, n]);
}

/* ---------- contacts ---------- */
export async function upsertContactRow(d: { email: string; first?: string; last?: string; caseId?: number | null; status?: string; audience?: string; source?: "case" | "manual"; birthday?: string }) {
  const email = d.email.trim().toLowerCase();
  if (!isEmail(email)) return false;
  const ex = await prisma.mktContact.findUnique({ where: { email } });
  const first = (d.first ?? "").trim(),
    last = (d.last ?? "").trim();
  if (ex) {
    const data: Record<string, unknown> = {};
    if (first) data.firstName = first;
    if (last) data.lastName = last;
    if (first || last) data.fullName = `${first || ex.firstName} ${last || ex.lastName}`.trim();
    if (d.caseId) data.caseId = d.caseId;
    if (d.status) data.status = d.status;
    if (d.audience) data.audience = sanitizeAudience(d.audience);
    if (d.birthday && /^\d{4}-\d{2}-\d{2}$/.test(d.birthday)) data.birthday = d.birthday;
    if (d.source && ex.source !== "manual") data.source = d.source;
    await prisma.mktContact.update({ where: { id: ex.id }, data });
  } else {
    await prisma.mktContact.create({
      data: {
        email,
        firstName: first,
        lastName: last,
        fullName: `${first} ${last}`.trim(),
        caseId: d.caseId ?? null,
        status: d.status || "Active",
        audience: sanitizeAudience(d.audience ?? ""),
        source: d.source ?? "manual",
        birthday: d.birthday && /^\d{4}-\d{2}-\d{2}$/.test(d.birthday) ? d.birthday : "",
      },
    });
  }
  if (d.audience) await ensureAudience(d.audience);
  return true;
}

/** Sync all four applicants (name, email, dob) into contacts on case save. */
export async function syncCaseContacts(caseId: number, opts: { withDob?: boolean } = { withDob: true }) {
  const c = await prisma.case.findUnique({ where: { id: caseId } });
  if (!c) return 0;
  const status = c.status === "trash" ? "Trashed" : "Active";
  let n = 0;
  for (const [name, email, dob] of [
    [c.app1Name, c.app1Email, c.app1Dob],
    [c.app2Name, c.app2Email, c.app2Dob],
    [c.app3Name, c.app3Email, c.app3Dob],
    [c.app4Name, c.app4Email, c.app4Dob],
  ]) {
    if (!email) continue;
    const { first, last } = splitName(name);
    if (await upsertContactRow({ email, first, last, caseId: c.id, status, source: "case", birthday: opts.withDob ? dob : undefined })) n++;
  }
  return n;
}

export async function syncAllCases() {
  const ids = await prisma.case.findMany({ select: { id: true } });
  let n = 0;
  for (const { id } of ids) n += await syncCaseContacts(id, { withDob: false });
  return n;
}

export type ContactFilter = { q?: string; source?: string; status?: string; audience?: string; audiences?: string[] };
export function contactWhere(f: ContactFilter) {
  return {
    ...(f.q ? { OR: [{ email: { contains: f.q, mode: "insensitive" as const } }, { fullName: { contains: f.q, mode: "insensitive" as const } }] } : {}),
    ...(f.source ? { source: f.source } : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(f.audiences?.length ? { audience: { in: f.audiences } } : f.audience ? { audience: f.audience } : {}),
  };
}

/* ---------- unsubscribe (signed link) ---------- */
const secret = () => process.env.SESSION_SECRET || "mm-unsub";
export const unsubToken = (id: number, email: string) => crypto.createHmac("sha256", secret()).update(`unsub:${id}:${email.toLowerCase()}`).digest("base64url").slice(0, 32);
export const unsubUrl = (id: number, email: string) => `${SITE_URL}/api/unsubscribe?c=${id}&t=${unsubToken(id, email)}`;
export function verifyUnsub(id: number, email: string, t: string) {
  const a = Buffer.from(unsubToken(id, email));
  const b = Buffer.from(t || "");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const unsubFooter = (id: number, email: string) =>
  `<p style="margin-top:24px;color:#94a3b8;font-size:12px">Don’t want these emails? <a href="${esc(unsubUrl(id, email))}" style="color:#94a3b8">Unsubscribe</a></p>`;

/* ---------- send ---------- */
async function transport(caseId: number | null, to: string, subject: string, html: string) {
  const z = await getZoho();
  if (zohoConnected(z)) {
    const r = await zohoSend(caseId ?? 0, to, subject, html);
    return r.ok ? { ok: true } : { ok: false, error: r.error };
  }
  const o = await getCrmOptions();
  const r = await sendMail({ to, subject, html, fromEmail: await fromAddress(), fromName: o.fromName, context: "marketing" });
  return r.ok ? { ok: true } : { ok: false, error: r.error || "send failed" };
}

function caseTag(subject: string, caseId: number | null) {
  if (caseId) return /\[MM#\s*\d+\]/i.test(subject) ? subject : `${subject} [MM#${caseId}]`;
  return subject.replace(/\[MM#\s*(?:\d+|\{\{.*?\}\})\s*\]/gi, "").trim();
}

export async function signatureHtml() {
  return cleanEmailHtml((await getCrmOptions()).signatureHtml || "");
}

type Contact = Awaited<ReturnType<typeof prisma.mktContact.findFirst>> & {};

async function personalise(c: NonNullable<Contact>, subject: string, body: string, sig: string, sigWrap: (s: string) => string, unsub: boolean) {
  const basic = { first_name: c.firstName || c.fullName || "there", full_name: c.fullName || c.firstName || "there", site_name: SITE_NAME };
  let s = merge(subject, basic);
  let b = merge(body, basic);
  if (c.caseId) {
    const ctx = await buildContext(c.caseId);
    s = merge(s, ctx, false);
    b = merge(b, ctx, true);
  }
  s = caseTag(s, c.caseId);
  if (sig) {
    if (/\{\{\s*signature_html\s*\}\}/i.test(b)) b = b.replace(/\{\{\s*signature_html\s*\}\}/gi, sig);
    else if (!b.includes('data-mm-signature="1"')) b += sigWrap(sig);
  } else b = b.replace(/\{\{\s*signature_html\s*\}\}/gi, "");
  if (unsub) b += unsubFooter(c.id, c.email);
  if (!b.replace(/<[^>]*>/g, "").trim()) b = "<div>&nbsp;</div>";
  return { subject: s, body: cleanEmailHtml(b) };
}

export async function sendCampaign(input: { ids: number[]; templateId?: number; subject?: string; body?: string; includeSig: boolean; includeUnsub?: boolean; userId: number }) {
  if (!input.ids.length) throw new Error("No contacts selected");
  const tpl = input.templateId ? await getTemplate(input.templateId) : null;
  const subject = (input.subject || "").trim() || tpl?.subject || tpl?.title || "";
  const body = (input.body || "").trim() || tpl?.body || "";
  const autoSig = (await getCrmOptions()).autoAppendSignature;
  const sig = input.includeSig || autoSig ? await signatureHtml() : "";
  const contacts = await prisma.mktContact.findMany({ where: { id: { in: input.ids } } });
  const errors: string[] = [];
  let sent = 0;
  for (const c of contacts) {
    if (!isEmail(c.email)) {
      errors.push(`Invalid contact #${c.id}`);
      continue;
    }
    if (c.status === "Unsubscribed") continue;
    const p = await personalise(c, subject, body, sig, (s) => `<div data-mm-signature="1"><br>${s}</div>`, !!input.includeUnsub);
    const r = await transport(c.caseId, c.email, p.subject, p.body);
    if (r.ok) sent++;
    else errors.push(`${c.email}: ${r.error}`);
  }
  const recipients = contacts.map((c) => c.email);
  await mktLog(
    "email.send",
    "Marketing email sent",
    {
      count: sent,
      template_id: input.templateId ?? 0,
      subject: (input.subject || "").trim() || "(from template)",
      recipients: recipients.slice(0, 300),
      truncated: input.ids.length > 300,
      content_snapshot: { subject, body: sig && !/\{\{\s*signature_html\s*\}\}/i.test(body) ? `${body}<div><br></div>${sig}` : body },
    },
    input.userId,
  );
  return { sent, errors };
}

export async function sendTest(input: { to: string; templateId?: number; subject?: string; body?: string; includeSig: boolean; userId: number }) {
  if (!isEmail(input.to)) throw new Error("No user email found");
  let subject = (input.subject || "").trim();
  let body = (input.body || "").trim();
  if (!subject || !body) {
    const tpl = input.templateId ? await getTemplate(input.templateId) : null;
    subject = subject || tpl?.subject || tpl?.title || "(test)";
    body = body || tpl?.body || "";
  }
  const autoSig = (await getCrmOptions()).autoAppendSignature;
  const sig = input.includeSig || autoSig ? await signatureHtml() : "";
  const basic = { first_name: "there", full_name: "there", site_name: SITE_NAME };
  let b = merge(body, basic);
  if (sig) b = /\{\{\s*signature_html\s*\}\}/i.test(b) ? b.replace(/\{\{\s*signature_html\s*\}\}/gi, sig) : b + `<div data-mm-signature="1"><br>${sig}</div>`;
  const r = await transport(null, input.to, caseTag(merge(subject, basic), null), cleanEmailHtml(b || "<div>&nbsp;</div>"));
  if (!r.ok) throw new Error(r.error || "Test failed");
  await mktLog("email.test", "Test email sent", { to: input.to, subject }, input.userId);
}

/* ---------- birthday automation ---------- */
export type BdaySettings = { enabled: 0 | 1; template_id: number; hour: number };
export async function getBday(): Promise<BdaySettings> {
  return getSetting<BdaySettings>(BDAY_KEY, { enabled: 0, template_id: 0, hour: 9 });
}
export async function saveBday(b: BdaySettings) {
  await setSetting(BDAY_KEY, { enabled: b.enabled ? 1 : 0, template_id: Math.max(0, b.template_id | 0), hour: Math.min(23, Math.max(0, b.hour | 0)) });
}

function adminBdayHtml(c: { firstName: string; lastName: string; fullName: string; email: string }, tplSubject: string, logo: string) {
  const now = ymdHi(new Date());
  return `<div style="font-family:system-ui,Segoe UI,Arial,sans-serif;color:#111827;max-width:560px">${logo ? `<img src="${esc(logo)}" height="28" alt="">` : ""}
<h2 style="margin:12px 0 6px">Birthday alert 🎂</h2><p>A scheduled birthday email was sent.</p>
<table style="font-size:14px"><tr><td><b>Contact</b></td><td>${esc(c.fullName || `${c.firstName} ${c.lastName}`.trim())} &lt;${esc(c.email)}&gt;</td></tr>
<tr><td><b>Template subject</b></td><td>${esc(tplSubject)}</td></tr><tr><td><b>Sent at</b></td><td>${esc(now)} (Australia/Sydney)</td></tr></table>
<p style="color:#64748b;font-size:12px">This is an automated notice from ${esc(SITE_NAME)}.</p></div>`;
}

/** Send today's birthday emails. Returns {sent,total,notified,sample}. */
export async function runBirthdays(templateId: number, manual = false) {
  const p = sydParts();
  const mmdd = `-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
  const tpl = await getTemplate(templateId);
  if (!tpl) throw new Error("Pick a birthday template first");
  const list = await prisma.mktContact.findMany({ where: { status: "Active", birthday: { endsWith: mmdd }, email: { not: "" } } });
  const o = await getCrmOptions();
  const sig = o.autoAppendSignature ? await signatureHtml() : "";
  const adminTo = o.notifyEmail || process.env.ADMIN_NOTIFY_EMAIL || (await fromAddress());
  let sent = 0,
    notified = 0;
  const sample: string[] = [];
  for (const c of list) {
    const pz = await personalise(c, tpl.subject || tpl.title, tpl.body, sig, (s) => `<div><br>${s}</div>`, false);
    const r = await transport(c.caseId, c.email, pz.subject, pz.body);
    if (!r.ok) continue;
    sent++;
    if (sample.length < 5) sample.push(c.email);
    if (adminTo) {
      const a = await sendMail({ to: adminTo, subject: `Birthday notice: ${c.firstName} ${c.lastName}`.trim(), html: adminBdayHtml(c, tpl.subject || tpl.title, o.brandLogo), context: "mkt:bday" });
      if (a.ok) notified++;
    }
  }
  if (list.length) {
    const recipients = list.map((c) => c.email);
    if (manual)
      await mktLog("email.birthday_manual", "Birthday run (manual now)", { date: `${p.y}${mmdd}`, template_id: templateId, count: sent, recipients: recipients.slice(0, 300), truncated: list.length > 300 });
    else
      await mktLog("email.birthday", "Birthday automation sent", {
        count: sent,
        template_id: templateId,
        recipients: recipients.slice(0, 300),
        truncated: list.length > 300,
        content_snapshot: { subject: tpl.subject || tpl.title, body: tpl.body },
      });
  }
  return { sent, total: list.length, notified, sample };
}

/** Cron entry: once per Sydney day, at/after the configured hour. Safe to call hourly. */
export async function birthdayCron() {
  const b = await getBday();
  if (!b.enabled || !b.template_id) return { skipped: "disabled" };
  const p = sydParts();
  const today = `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
  if (p.h < b.hour) return { skipped: `before ${b.hour}:00` };
  if ((await getSetting<string>(BDAY_LAST, "")) === today) return { skipped: "already ran today" };
  await setSetting(BDAY_LAST, today);
  return runBirthdays(b.template_id, false);
}
