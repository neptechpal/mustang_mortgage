"use server";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/session";
import { addItem, toggleItem, deleteItem, quickEdit, updateReminder } from "../lib/reminders";
import { fromSydLocal } from "../lib/cases";

type R = { ok: boolean; error?: string };
const wrap = async (fn: () => Promise<unknown>): Promise<R> => {
  try {
    await fn();
    revalidatePath("/admin/reminders");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed" };
  }
};

export type ReminderForm = {
  caseId: number;
  type: "Note" | "Reminder";
  note?: string;
  what?: string;
  due?: string; // datetime-local (Sydney)
  email?: string;
  priority?: string;
  repeatDays?: number | string;
};

export async function nrAdd(f: ReminderForm): Promise<R> {
  const s = await requireStaff();
  if (!f.caseId) return { ok: false, error: "Pick a case." };
  return wrap(() =>
    addItem(
      Number(f.caseId),
      { type: f.type, note: f.note, what: f.what, due: f.due ? fromSydLocal(f.due) : null, email: f.email, priority: f.priority, repeatDays: Number(f.repeatDays) || 0 },
      s.name,
    ),
  );
}
export async function nrToggle(id: number, done: boolean): Promise<R> {
  const s = await requireStaff();
  return wrap(() => toggleItem(id, done, s.name));
}
export async function nrDelete(id: number): Promise<R> {
  const s = await requireStaff();
  return wrap(() => deleteItem(id, s.name));
}
export async function nrEdit(id: number, text: string): Promise<R> {
  const s = await requireStaff();
  return wrap(() => quickEdit(id, text, s.name));
}
export async function nrUpdate(id: number, f: Omit<ReminderForm, "caseId" | "type">): Promise<R> {
  const s = await requireStaff();
  return wrap(() =>
    updateReminder(
      id,
      { type: "Reminder", what: f.what, due: f.due ? fromSydLocal(f.due) : null, email: f.email, priority: f.priority, repeatDays: Number(f.repeatDays) || 0 },
      s.name,
    ),
  );
}
