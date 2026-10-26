import { getSetting } from '@/lib/settings';
import { borrowSettings } from './borrow';
import { INCOME_DEFAULTS, type IncomeSettings } from './income';

export async function getIncomeSettings(): Promise<IncomeSettings> {
  const entries = await Promise.all(Object.entries(INCOME_DEFAULTS).map(async ([k, fallback]) => [k, await getSetting<number>(`crmx.income.${k}`, fallback)]));
  return Object.fromEntries(entries) as IncomeSettings;
}
export async function getIncomeContext() {
  const [settings, borrow] = await Promise.all([getIncomeSettings(), borrowSettings()]);
  return { settings, projection: { rate: borrow.product_rate, term: borrow.term_years, paydown: !!settings.paydown } };
}
