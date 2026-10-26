"use server";
import { requireAdmin } from '@/lib/session';
import { setSetting } from '@/lib/settings';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { INCOME_DEFAULTS, normIncomePct, normAggregatorPct } from '../lib/income';
export async function saveIncomeSettings(fd: FormData) {
  await requireAdmin();
  for (const [key, fallback] of Object.entries(INCOME_DEFAULTS)) {
    const raw = String(fd.get(key) ?? '');
    let value = raw === '' ? fallback : Number(raw.replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(value)) value = fallback;
    if (key === 'paydown') value = fd.has(key) ? 1 : 0;
    else if (key === 'bank_pct' || key === 'trail_pct') value = normIncomePct(value);
    else if (key === 'agg_pct') value = normAggregatorPct(value);
    await setSetting(`crmx.income.${key}`, Math.max(0, value));
  }
  for (const path of ['/admin/income', '/admin', '/admin/commissions', '/admin/cases', '/admin/kanban']) revalidatePath(path);
  redirect('/admin/income?saved=1');
}
