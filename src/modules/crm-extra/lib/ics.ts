// ICS calendar feed (port of includes/mmcrm-ics.php).
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getSetting, setSetting } from "@/lib/settings";
import { SITE_URL } from "./opts";
import { signalsFeed } from "./signals";
import { ymdHi, sydParts } from "./cases";

const TOKEN_KEY = "crmx.ics.token";
const ALNUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const randomToken = (n = 24) => Array.from(crypto.randomBytes(n), (b) => ALNUM[b % ALNUM.length]).join("");

export async function getIcsToken() {
  let t = await getSetting<string>(TOKEN_KEY, "");
  if (!t) {
    t = randomToken();
    await setSetting(TOKEN_KEY, t);
  }
  return t;
}
export async function rotateIcsToken() {
  const t = randomToken();
  await setSetting(TOKEN_KEY, t);
  return t;
}
export const icsUrl = (token: string, status: string) => `${SITE_URL}/api/ics?key=${token}&status=${status}&roll=1`;

export function tokenOk(given: string, expected: string) {
  const a = Buffer.from(given || "");
  const b = Buffer.from(expected || "");
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

type Ev = { uid: string; caseId: number; start: Date; end: Date; allday: boolean; summary: string; description: string };

const host = () => {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return "localhost";
  }
};

/** Next quarter-hour bump for overdue items when roll=1. */
function rollStart(now: Date) {
  const mins = now.getMinutes();
  let bump = 15 - (mins % 15);
  if (bump === 15) bump = 0;
  const d = new Date(now.getTime() + bump * 60000);
  d.setSeconds(0, 0);
  return d;
}

const cleanText = (s: string) =>
  s
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .trim();

function sydYmd(d: Date) {
  const p = sydParts(d);
  return `${p.y}${String(p.m).padStart(2, "0")}${String(p.d).padStart(2, "0")}`;
}

export async function buildEvents(status: "active" | "completed" | "all", range: string, from?: string, to?: string, show = false, roll = false) {
  const h = host();
  const now = new Date();
  const cases = await prisma.case.findMany({ where: status === "all" ? {} : { status }, select: { id: true, title: true } });
  const titles = new Map(cases.map((c) => [c.id, c.title || `Case #${c.id}`]));
  const items = await prisma.caseReminder.findMany({ where: { done: false, caseId: { in: cases.map((c) => c.id) } }, orderBy: { id: "asc" } });
  const events: Ev[] = [];
  const todayStart = (() => {
    const p = sydParts(now);
    return new Date(Date.UTC(p.y, p.m - 1, p.d));
  })();
  for (const it of items) {
    const caseT = titles.get(it.caseId)!;
    const link = `${SITE_URL}/admin/cases/${it.caseId}#mmcrm_notes_reminders`;
    if (it.type === "Note") {
      const text = cleanText(it.note);
      if (!text) continue;
      events.push({
        uid: `mmcrm-note-${it.caseId}-${it.id}@${h}`,
        caseId: it.caseId,
        start: todayStart,
        end: new Date(todayStart.getTime() + 86400000),
        allday: true,
        summary: `${caseT} — Note`,
        description: `${text}\nCase: ${caseT}\nEdit: ${link}`,
      });
      continue;
    }
    const what = cleanText(it.title);
    if (!what || /^\s*reminder(s)?\s*$/i.test(what) || what.length < 3) continue;
    let start = it.dueAt ?? now;
    if (roll && start < now) start = rollStart(now);
    events.push({
      uid: `mmcrm-rem-${it.caseId}-${it.id}@${h}`,
      caseId: it.caseId,
      start,
      end: new Date(start.getTime() + 30 * 60000),
      allday: false,
      summary: `${caseT} — Reminder — ${what}`,
      description: `Priority: ${it.priority}\n${it.email ? `Email: ${it.email}\n` : ""}Case: ${caseT}\nEdit: ${link}`,
    });
  }
  const sig = await signalsFeed(status, range, from, to, show);
  sig.forEach((s, i) => {
    let start = s.when;
    if (roll && start < now) start = rollStart(now);
    events.push({
      uid: `mmcrm-signal-${s.caseId}-${i}@${h}`,
      caseId: s.caseId,
      start,
      end: new Date(start.getTime() + 30 * 60000),
      allday: false,
      summary: `${s.caseTitle} — ${s.title || "Update"}`,
      description: `${s.notes ? s.notes + "\n" : ""}${s.priority ? `Priority: ${s.priority}\n` : ""}Case: ${s.caseTitle}\nEdit: ${SITE_URL}/admin/cases/${s.caseId}#mmcrm_signals`,
    });
  });
  return dedupe(events);
}

/** Group by case + local day; collapse identical fingerprints; drop generic "reminder/todo" when specific ones exist. */
function dedupe(events: Ev[]) {
  const groups = new Map<string, Ev[]>();
  for (const e of events) {
    const k = `${e.caseId}|${e.allday ? e.start.toISOString().slice(0, 10).replace(/-/g, "") : sydYmd(e.start)}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(e);
  }
  const out: Ev[] = [];
  for (const list of groups.values()) {
    const seen = new Set<string>();
    let keep = list.filter((e) => {
      const fp = e.summary.toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "");
      if (seen.has(fp)) return false;
      seen.add(fp);
      return true;
    });
    if (keep.length > 1) {
      const generic = keep.filter((e) => /\b(reminder|todo)\b/i.test(e.summary));
      if (generic.length && generic.length < keep.length) keep = keep.filter((e) => !generic.includes(e));
    }
    out.push(...keep);
  }
  return out.sort((a, b) => a.start.getTime() - b.start.getTime());
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
function fold(line: string) {
  if (line.length <= 70) return line;
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 70) parts.push(line.slice(i, i + 70));
  return parts.join("\r\n ");
}
const utc = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const dateOnly = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

export function renderIcs(events: Ev[], status: string) {
  const h = host();
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  const L = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${h}//MMCRM ICS//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${esc(`MMCRM — ${label} (Reminders, Notes & Signals)`)}`),
    "X-WR-TIMEZONE:Australia/Sydney",
    "REFRESH-INTERVAL;VALUE=DURATION:PT30M",
    "X-PUBLISHED-TTL:PT30M",
  ];
  const stamp = utc(new Date());
  for (const e of events) {
    L.push("BEGIN:VEVENT", `UID:${e.uid}`, `DTSTAMP:${stamp}`);
    if (e.allday) L.push(`DTSTART;VALUE=DATE:${dateOnly(e.start)}`, `DTEND;VALUE=DATE:${dateOnly(e.end)}`);
    else L.push(`DTSTART:${utc(e.start)}`, `DTEND:${utc(e.end)}`);
    L.push(fold(`SUMMARY:${esc(e.summary)}`));
    if (e.description) L.push(fold(`DESCRIPTION:${esc(e.description)}`));
    L.push("END:VEVENT");
  }
  L.push("END:VCALENDAR");
  return L.join("\r\n") + "\r\n";
}

export function debugJson(events: Ev[]) {
  return events.map((e) => ({ summary: e.summary, starts: ymdHi(e.start), ends: ymdHi(e.end), allday: e.allday, case_id: e.caseId, uid: e.uid }));
}
