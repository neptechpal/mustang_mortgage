// Bridge to crm-extra's Notes & Reminders store (CaseReminder, _mmcrm_notes_rems)
// and Flex state (FlexState). Automation adds "auto" reminders; the dashboard
// lists today's tasks and the case header shows Flex progress.
import { prisma } from "@/lib/db";

/** MMCRM_Automation::add_reminder — no duplicate of an open reminder with the same text. */
export async function addAutoReminder(caseId: number, what: string, due: Date, priority = "Normal") {
  try {
    const dup = await prisma.caseReminder.findFirst({ where: { caseId, type: "Reminder", title: what, done: false } });
    if (dup) return;
    await prisma.caseReminder.create({ data: { caseId, type: "Reminder", title: what, priority, dueAt: due, auto: true, createdBy: "system" } });
  } catch (e) {
    console.error("[crm] addAutoReminder failed", e);
  }
}

export type TaskRow = { id: number; caseId: number; what: string; priority: string; dueAt: Date };

/** Open reminders due within the window (dashboard "Today's tasks"). */
export async function dueTasks(until: Date, caseIds?: number[]): Promise<TaskRow[]> {
  const rows = await prisma.caseReminder.findMany({
    where: { type: "Reminder", done: false, dueAt: { not: null, lte: until }, ...(caseIds ? { caseId: { in: caseIds } } : {}) },
    orderBy: { dueAt: "asc" },
    take: 200,
  });
  return rows.map((r) => ({ id: r.id, caseId: r.caseId, what: r.title.replace(/<[^>]*>/g, ""), priority: r.priority, dueAt: r.dueAt! }));
}

/** Toggle done (repeating reminders roll forward instead, like mmcrm_nr_toggle). */
export async function setTaskDone(id: number, done: boolean, by = "") {
  const r = await prisma.caseReminder.findUnique({ where: { id } });
  if (!r) return false;
  if (done && r.repeatDays > 0 && r.dueAt) {
    await prisma.caseReminder.update({ where: { id }, data: { dueAt: new Date(r.dueAt.getTime() + r.repeatDays * 86400_000) } });
    return true;
  }
  await prisma.caseReminder.update({ where: { id }, data: { done, doneBy: done ? by : "", doneAt: done ? new Date() : null } });
  return true;
}

/** Number of Flex sections ticked as entered. */
export async function flexDoneCount(caseId: number): Promise<number> {
  const f = await prisma.flexState.findUnique({ where: { caseId } });
  const d = f?.done;
  if (Array.isArray(d)) return d.length;
  if (d && typeof d === "object") return Object.values(d as Record<string, unknown>).filter(Boolean).length;
  return 0;
}
