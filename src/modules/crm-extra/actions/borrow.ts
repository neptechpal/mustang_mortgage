"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff, requireAdmin } from "@/lib/session";
import { logActivity } from "@/modules/crm/activity";
import { saveBorrowRun, saveBorrowSettings } from "../lib/borrow";
import { money } from "../lib/cases";

export async function borrowSave(caseId: number, label: string, maxLoan: number, summary: string, data: Record<string, string>) {
  const s = await requireStaff();
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(data || {})) clean[k.replace(/[^a-zA-Z0-9_]/g, "")] = String(v ?? "").slice(0, 200);
  const cid = caseId && (await prisma.case.count({ where: { id: caseId } })) ? caseId : 0;
  const id = await saveBorrowRun({ caseId: cid, userId: s.uid, label: label.slice(0, 200), maxLoan: Number(maxLoan) || 0, summary: summary.slice(0, 5000), data: clean });
  if (cid) {
    await logActivity(cid, "borrowing", `Borrowing capacity saved: ~${money(maxLoan)}`, "admin");
    revalidatePath(`/admin/cases/${cid}`);
  }
  return { ok: true, id };
}

export async function borrowDelete(id: string) {
  await requireStaff();
  await prisma.borrowCalc.delete({ where: { id } }).catch(() => undefined);
  return { ok: true };
}

export async function borrowSettingsSave(fd: FormData) {
  await requireAdmin();
  await saveBorrowSettings(fd);
  revalidatePath("/admin/borrowing");
  redirect("/admin/borrowing?tab=settings&saved=1");
}
