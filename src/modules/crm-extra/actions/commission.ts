"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";

const toFloat = (v: unknown) => {
  const s = String(v ?? "").replace(/[,\s]/g, "");
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
};

/** Deal Value metabox save (_mmc_loan_amount, _mmc_comm_pct, _mmc_comm_mm_pct). */
export async function saveDealValue(caseId: number, loan: string, bank: string, mm: string) {
  await requireStaff();
  await prisma.case.update({ where: { id: caseId }, data: { loanAmount: toFloat(loan), commPct: toFloat(bank), commMmPct: toFloat(mm) } });
  revalidatePath(`/admin/cases/${caseId}`);
  revalidatePath("/admin/commissions");
  return { ok: true };
}
