// Notes & Reminders (port of includes/reminders.php v1.0.1).
import { prisma } from "@/lib/db";
import { logActivity } from "@/modules/crm/activity";
import { getCrmOptions, SITE_URL, SITE_NAME } from "./opts";
import { sendPlainEmail } from "../send";
import { esc } from "./html";
import { ymdHi, caseEditUrl } from "./cases";

export const PRIORITIES = ["Low", "Normal", "High"] as const;

export type ReminderInput = {
  type: "Note" | "Reminder";
  note?: string;
  what?: string;
  due?: Date | null;
  email?: string;
  priority?: string;
  repeatDays?: number;
};

const cleanEmail = (e?: string) => {
  const s = (e || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : "";
};

export async function addItem(caseId: number, i: ReminderInput, by: string) {
  const type = String(i.type || "Reminder").toLowerCase() === "note" ? "Note" : "Reminder";
  if (type === "Note") {
    const text = (i.note || "").trim();
    if (!text) throw new Error("Note is required.");
    await prisma.caseReminder.create({ data: { caseId, type, note: text, createdBy: by } });
    await audit(caseId, "add", "Note added.", by);
    return;
  }
  const what = (i.what || "").trim();
  if (!what) throw new Error("What is required.");
  const priority = (PRIORITIES as readonly string[]).includes(i.priority || "") ? i.priority! : "Normal";
  await prisma.caseReminder.create({
    data: {
      caseId,
      type,
      title: what,
      note: (i.note || "").trim(),
      priority,
      email: cleanEmail(i.email),
      dueAt: i.due ?? null,
      repeatDays: Math.max(0, Math.floor(i.repeatDays || 0)),
      createdBy: by,
    },
  });
  await audit(caseId, "add", `Reminder added: "${what}"`, by);
}

/** Shared duplicate-safe add used by automation (skip when an open reminder with the same text exists). */
export async function addAutoReminder(caseId: number, what: string, dueAt: Date, priority = "Normal") {
  const dup = await prisma.caseReminder.findFirst({
    where: { caseId, type: "Reminder", done: false, title: { equals: what, mode: "insensitive" } },
  });
  if (dup) return false;
  await prisma.caseReminder.create({ data: { caseId, type: "Reminder", title: what, priority, dueAt, auto: true, createdBy: "automation" } });
  return true;
}

export async function toggleItem(id: number, done: boolean, by: string) {
  const r = await prisma.caseReminder.findUnique({ where: { id } });
  if (!r) throw new Error("Not found");
  await prisma.caseReminder.update({ where: { id }, data: { done, doneBy: done ? by : "", doneAt: done ? new Date() : null } });
  await audit(r.caseId, done ? "complete" : "reopen", `${r.type} updated.`, by);
  return r.caseId;
}

export async function deleteItem(id: number, by: string) {
  const r = await prisma.caseReminder.findUnique({ where: { id } });
  if (!r) throw new Error("Not found");
  await prisma.caseReminder.delete({ where: { id } });
  await audit(r.caseId, "remove", "Item removed", by);
  return r.caseId;
}

/** Quick text edit: Note → text, Reminder → what. Empty = no-op. */
export async function quickEdit(id: number, text: string, by: string) {
  const r = await prisma.caseReminder.findUnique({ where: { id } });
  if (!r) throw new Error("Not found");
  const t = text.trim();
  if (!t) return r.caseId;
  await prisma.caseReminder.update({ where: { id }, data: r.type === "Note" ? { note: t } : { title: t } });
  await audit(r.caseId, "edit", "Item edited.", by);
  return r.caseId;
}

export async function updateReminder(id: number, i: ReminderInput, by: string) {
  const r = await prisma.caseReminder.findUnique({ where: { id } });
  if (!r || r.type !== "Reminder") throw new Error("Not found");
  const what = (i.what || "").trim();
  if (!what) throw new Error("What is required.");
  const priority = (PRIORITIES as readonly string[]).includes(i.priority || "") ? i.priority! : "Normal";
  await prisma.caseReminder.update({
    where: { id },
    data: { title: what, priority, email: cleanEmail(i.email), dueAt: i.due ?? null, repeatDays: Math.max(0, Math.floor(i.repeatDays || 0)) },
  });
  await audit(r.caseId, "edit", `Reminder updated: "${what}"`, by);
  return r.caseId;
}

async function audit(caseId: number, act: string, msg: string, by: string) {
  await logActivity(caseId, "audit", `[${act}] ${msg}`, by).catch(() => undefined);
}

/** Reminder email body (R:584-620). */
function emailHtml(c: { id: number; title: string }, it: { title: string; dueAt: Date | null; priority: string; repeatDays: number }, logo: string) {
  const link = `${SITE_URL}${caseEditUrl(c.id)}#mmcrm_notes_reminders`;
  const head = logo ? `<img src="${esc(logo)}" alt="" style="height:32px">` : `<strong>${esc(SITE_NAME)}</strong>`;
  const due = it.dueAt ? `<p style="margin:4px 0"><b>Due:</b> <u>${esc(ymdHi(it.dueAt))}</u></p>` : "";
  const rep = it.repeatDays > 0 ? ` • Repeats: every ${it.repeatDays} day(s)` : "";
  return (
    `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827;max-width:600px">` +
    `<div style="margin-bottom:12px">${head}</div>` +
    `<h2 style="margin:0 0 10px">⏰ Reminder</h2>` +
    `<p style="margin:4px 0"><b>Case:</b> #${c.id} — ${esc(c.title)}</p>` +
    `<p style="margin:4px 0"><b>What:</b> ${esc(it.title)}</p>` +
    due +
    `<p style="margin:4px 0"><b>Priority:</b> ${esc(it.priority)}${rep}</p>` +
    `<p style="margin:18px 0"><a href="${esc(link)}" style="background:#184a7d;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;display:inline-block">View Case</a></p>` +
    `<p style="color:#64748b;font-size:12px">Sent from Mustang Mortgage CRM.<br>${esc(SITE_NAME)}</p></div>`
  );
}

/**
 * Hourly cron (mmcrm_nr_cron): email every due, not-done reminder.
 * Repeat > 0 → re-send every N days after the last send; one-off → send once.
 */
export async function sendDueReminders(caseId?: number) {
  const o = await getCrmOptions();
  const now = new Date();
  const rows = await prisma.caseReminder.findMany({
    where: { type: "Reminder", done: false, dueAt: { not: null, lte: now }, ...(caseId ? { caseId } : {}) },
  });
  let sent = 0;
  for (const it of rows) {
    const last = it.lastSentAt?.getTime() ?? 0;
    const send = it.repeatDays > 0 ? !last || now.getTime() - last >= it.repeatDays * 86400000 : !last;
    if (!send) continue;
    const to = cleanEmail(it.email || o.fromEmail);
    if (!to) continue;
    const c = await prisma.case.findUnique({ where: { id: it.caseId }, select: { id: true, title: true } });
    if (!c) continue;
    const r = await sendPlainEmail(to, `[MM#${c.id}] Reminder — ${it.title}`, emailHtml(c, it, o.brandLogo), `reminder:${it.id}`);
    if (r.ok) {
      sent++;
      await prisma.caseReminder.update({ where: { id: it.id }, data: { lastSentAt: now } });
      await audit(c.id, "reminder", `Reminder emailed to ${to}`, "system");
    }
  }
  return { sent, checked: rows.length };
}

/** Timeline rows for the case box (newest first). */
export async function loadItems(caseId: number) {
  const rows = await prisma.caseReminder.findMany({ where: { caseId }, orderBy: { createdAt: "desc" } });
  const now = Date.now();
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    title: r.title,
    note: r.note,
    priority: r.priority,
    email: r.email,
    due: r.dueAt ? ymdHi(r.dueAt) : "",
    dueLocal: r.dueAt ? ymdHi(r.dueAt).replace(" ", "T") : "",
    overdue: !!r.dueAt && r.dueAt.getTime() < now,
    repeatDays: r.repeatDays,
    done: r.done,
    sent: !!r.lastSentAt,
  }));
}
