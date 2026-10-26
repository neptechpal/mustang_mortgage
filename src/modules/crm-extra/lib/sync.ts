// Zoho Mail incremental sync (port of includes/sync.php,
// build sync-AU-incremental+convindex-2025-08-13). Runs every 10 minutes.
import { prisma } from "@/lib/db";
import { getSetting, setSetting } from "@/lib/settings";
import { getZoho, getCrmOptions, zohoConnected } from "./opts";
import { zohoApi, zohoAccounts, listMessages, msgId, type ListAttempt } from "./zoho";
import { indexAdd, indexGet } from "./threading";
import { guessCaseByEmail } from "./cases";
import { stripScripts, mimeExtractHtml, pre } from "./html";

const LOCK_KEY = "crmx.sync.lock";
const CURSORS_KEY = "crmx.sync.cursors";
export const ATTEMPTS_KEY = "crmx.sync.lastListAttempts";

type Msg = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export function addrOnly(s: string) {
  const t = (s || "").trim();
  if (!t) return "";
  const m = t.match(/<([^>]+)>/);
  return (m ? m[1] : t).trim().toLowerCase();
}

export function addrList(v: unknown): string[] {
  const out = new Set<string>();
  const add = (one: string) => one.split(/\s*,\s*/).forEach((p) => { const e = addrOnly(p); if (e) out.add(e); });
  if (Array.isArray(v)) for (const one of v) add(typeof one === "object" && one && "address" in one ? String((one as Msg).address) : typeof one === "string" ? one : "");
  else if (typeof v === "string") add(v);
  return Array.from(out);
}

export function subjectCaseTag(subject: string): number {
  let s = subject.replace(/&amp;/g, "&").replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"');
  let prev = "";
  while (prev !== s) { prev = s; s = s.replace(/^\s*(re|fwd?|fw)\s*:\s*/i, ""); }
  const m = s.match(/\[\s*MM\s*#\s*(\d+)\s*\]/i);
  return m ? parseInt(m[1], 10) : 0;
}

async function ourAddresses(): Promise<string[]> {
  const z = await getZoho();
  const o = await getCrmOptions();
  const set = new Set<string>();
  for (const v of [z.fromEmail || o.fromEmail, z.alias1, z.alias2]) { const a = addrOnly(v || ""); if (a) set.add(a); }
  const acc = await zohoAccounts();
  const a = acc.body?.data?.[0];
  if (a) {
    for (const x of [a.primaryEmailAddress, a.mailboxAddress]) { const e = addrOnly(String(x ?? "")); if (e) set.add(e); }
    for (const x of Array.isArray(a.emailAlias) ? a.emailAlias : []) { const e = addrOnly(String(x)); if (e) set.add(e); }
    for (const ea of Array.isArray(a.emailAddress) ? a.emailAddress : []) { const e = addrOnly(String(ea?.mailId ?? "")); if (e) set.add(e); }
  }
  set.add("info@mustangmortgage.com.au");
  return Array.from(set);
}

async function resolveCase(m: Msg, ours: string[]): Promise<number> {
  const tag = subjectCaseTag(String(m.subject ?? ""));
  if (tag && (await prisma.case.count({ where: { id: tag } }))) return tag;
  if (m.conversationId) { const c = await indexGet("conv", String(m.conversationId)); if (c) return c; }
  const mid = msgId(m);
  if (mid) { const c = await indexGet("msg", mid); if (c) return c; }
  const from = addrOnly(String(m.fromAddress ?? m.from ?? ""));
  if (from && !ours.includes(from)) { const c = await guessCaseByEmail(from); if (c) return c; }
  for (const k of ["toAddress", "to", "ccAddress", "cc"]) {
    for (const addr of addrList(m[k])) {
      if (ours.includes(addr)) continue;
      const c = await guessCaseByEmail(addr);
      if (c) return c;
    }
  }
  return 0;
}

export async function fetchBodyHtml(mid: string, folderId?: string): Promise<string> {
  const q = folderId ? `/folders/${folderId}/messages/${mid}` : `/messages/${mid}`;
  const d = await zohoApi(`/messages/${mid}?includeContent=true&includeHeaders=false`);
  const data = d.body?.data;
  if (data) {
    const html = String(data.content ?? "");
    if (html) return stripScripts(html);
    if (data.plainTextContent) return pre(String(data.plainTextContent));
  }
  if (folderId) {
    const c = await zohoApi(`${q}/content`);
    const html = String(c.body?.data?.content ?? "");
    if (html) return stripScripts(html);
  }
  const orig = await zohoApi(`/messages/${mid}/original`);
  if (orig.raw && !orig.body) {
    const h = mimeExtractHtml(orig.raw);
    if (h) return h;
  }
  const raw = await zohoApi(`/messages/${mid}/content`);
  if (raw.raw) {
    const j = raw.body;
    if (j && typeof j === "object" && (j.status || j.data?.errorCode)) return "";
    return stripScripts(raw.raw);
  }
  return "";
}

function determineTargets(folders: Msg[], inboxOverride: string, sentOverride: string) {
  let inbox = inboxOverride, sent = sentOverride;
  if (!inbox || !sent) {
    for (const f of folders) {
      const name = String(f.folderName ?? f.displayName ?? "").toLowerCase();
      const type = String(f.folderType ?? f.systemName ?? "").toLowerCase();
      if (!inbox && (type === "inbox" || name === "inbox")) inbox = String(f.folderId);
      if (!sent && (type === "sent" || name.includes("sent"))) sent = String(f.folderId);
    }
  }
  const mm: string[] = [];
  for (const f of folders) {
    const type = String(f.folderType ?? f.systemName ?? "").toLowerCase();
    const path = String(f.path ?? f.folderPath ?? "").toLowerCase();
    if (type === "inbox" && path && path.includes("/mm clients")) mm.push(String(f.folderId));
  }
  return { inbox, sent, mm: Array.from(new Set(mm)).slice(0, 30) };
}

export type SyncResult = { ok: boolean; message: string; added: number; scanned: number; folders: number };

export async function runSync(manual = false): Promise<SyncResult> {
  const lock = await getSetting<number>(LOCK_KEY, 0);
  if (lock && Date.now() - lock < 5 * 60 * 1000) return { ok: false, message: "Sync already running (locked).", added: 0, scanned: 0, folders: 0 };
  await setSetting(LOCK_KEY, Date.now());
  let added = 0, scanned = 0;
  try {
    const z = await getZoho();
    if (!zohoConnected(z)) return { ok: false, message: "Zoho not connected.", added, scanned, folders: 0 };
    const fold = await zohoApi("/folders");
    const folders: Msg[] = Array.isArray(fold.body?.data) ? fold.body.data : [];
    if (!folders.length) return { ok: false, message: `Could not list folders (HTTP ${fold.code}).`, added, scanned, folders: 0 };
    const t = determineTargets(folders, z.inboxFolder, z.sentFolder);
    const targets = [t.inbox, t.sent, ...t.mm].filter(Boolean);
    const cursors = await getSetting<Record<string, string>>(CURSORS_KEY, {});
    const ours = await ourAddresses();
    const attemptsLog: Record<string, ListAttempt[]> = {};

    for (const fid of targets) {
      const since = cursors[fid];
      const r = await listMessages(fid, 200, [1, 2, 4]);
      attemptsLog[fid] = r.attempts;
      let items = r.list;
      if (since) {
        const sinceTs = Math.floor(Date.parse(since) / 1000) || 0;
        items = items.filter((m) => Math.floor(Number(m.receivedTime ?? m.sentTime ?? 0) / 1000) >= sinceTs - 60);
      }
      items.sort((a, b) => Number(b.receivedTime ?? b.sentTime ?? 0) - Number(a.receivedTime ?? a.sentTime ?? 0));
      let newLatest = since ? Math.floor(Date.parse(since) / 1000) : 0;
      for (const m of items) {
        scanned++;
        const mid = msgId(m);
        if (!mid) continue;
        const epoch = m.receivedTime ?? m.sentTime ?? m.sentDateInGMT ?? null;
        const when = epoch ? new Date(Number(epoch)) : new Date();
        const from = addrOnly(String(m.fromAddress ?? m.from ?? ""));
        const dir = ours.includes(from) ? "out" : "in";
        const caseId = await resolveCase(m, ours);
        if (epoch) newLatest = Math.max(newLatest, Math.floor(Number(epoch) / 1000));
        if (!caseId) continue;
        const exists = await prisma.caseEmail.findUnique({ where: { zohoId: mid }, select: { id: true } });
        if (!exists) {
          let html = await fetchBodyHtml(mid, fid);
          if (!html) html = '<div style="padding:18px;color:#666">No body content.</div>';
          const atts = Array.isArray(m.attachments)
            ? m.attachments.map((a: Msg) => ({ name: String(a.name ?? ""), size: Number(a.size ?? 0), type: String(a.mimeType ?? "") }))
            : [];
          await prisma.caseEmail.create({
            data: {
              caseId,
              zohoId: mid,
              conversationId: String(m.conversationId ?? ""),
              folderId: fid,
              direction: dir,
              source: "sync",
              fromAddr: from,
              toAddrs: addrList(m.toAddress ?? m.to).join(", "),
              ccAddrs: addrList(m.ccAddress ?? m.cc).join(", "),
              bccAddrs: addrList(m.bccAddress ?? m.bcc).join(", "),
              subject: String(m.subject ?? ""),
              html,
              attachments: atts,
              sentAt: isNaN(when.getTime()) ? new Date() : when,
            },
          });
          added++;
        }
        if (m.conversationId) await indexAdd("conv", String(m.conversationId), caseId);
      }
      if (newLatest) cursors[fid] = new Date(newLatest * 1000).toISOString();
    }
    await setSetting(CURSORS_KEY, cursors);
    await setSetting(ATTEMPTS_KEY, { at: new Date().toISOString(), manual, attempts: attemptsLog });
    return { ok: true, message: `Synced ${targets.length} folder(s): ${added} new message(s) of ${scanned} scanned.`, added, scanned, folders: targets.length };
  } finally {
    await setSetting(LOCK_KEY, 0);
  }
}
