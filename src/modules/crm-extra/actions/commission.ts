"use server";
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireStaff } from '@/lib/session';
import { dealSaveData, normIncomePct, normAggregatorPct } from '../lib/income';

export async function saveDealValue(caseId: number, loan: string, bank: string, aggregator: string, trail: string, settlement: string) {
  await requireStaff();
  const n = (v: string) => Number(v.replace(/[,\s]/g, '')) || 0;
  await prisma.case.update({ where: { id: caseId }, data: dealSaveData(n(loan), normIncomePct(n(bank)), normAggregatorPct(n(aggregator)), normIncomePct(n(trail)), settlement) });
  for (const path of [`/admin/cases/${caseId}`, '/admin/cases', '/admin/kanban', '/admin', '/admin/commissions', '/admin/income']) revalidatePath(path);
  return { ok: true };
}
