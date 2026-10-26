"use server";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";

/** mmcrm_signals_toggle: dismiss / restore one activity row. */
export async function signalToggle(id: number, on: boolean) {
  await requireStaff();
  if (!id) return { ok: false };
  await prisma.caseActivity.update({ where: { id }, data: { dismissed: on } });
  return { ok: true };
}
