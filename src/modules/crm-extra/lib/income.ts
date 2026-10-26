/** Pure port of mmcrm-lib.php / mmcrm-income.php / income.js (2026-10-26).
 * Percentages here are plain percentages, never fractions, after normalisation. */
export const INCOME_DEFAULTS = {
  bank_pct: 0.7, agg_pct: 20, trail_pct: 0.2,
  goal_trail_month: 3000, goal_fy_upfront: 150000, paydown: 1,
};
export type IncomeSettings = typeof INCOME_DEFAULTS;
export type ProjectionSettings = { rate: number; term: number; paydown: boolean };
export const PROJECTION_DEFAULTS: ProjectionSettings = { rate: 6.2, term: 30, paydown: true };
export const STAGE_PROB: Record<string, number> = { new: .1, 'awaiting-docs': .25, submitted: .45, 'pre-approved': .6, 'full-approval': .85, settlement: .95 };
export const STAGE_LEAD_DAYS: Record<string, number> = { new: 100, 'awaiting-docs': 80, submitted: 55, 'pre-approved': 45, 'full-approval': 21, settlement: 7 };
export const TRAIL_MILESTONES = [500, 1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 30000];
const number = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
export function normIncomePct(v: unknown) { const n = number(v); return n <= 0 ? 0 : n < .05 ? n * 100 : n; }
export function normAggregatorPct(v: unknown) { const n = number(v); return Math.max(0, Math.min(100, n > 0 && n < 1 ? n * 100 : n)); }
export function balanceFactor(months: number, rate = 6.2, years = 30) {
  const r = rate / 1200, N = Math.max(1, Math.round(years * 12));
  if (months <= 0) return 1;
  if (months >= N) return 0;
  if (r <= 0) return 1 - months / N;
  return (Math.pow(1 + r, N) - Math.pow(1 + r, months)) / (Math.pow(1 + r, N) - 1);
}
export function dealAmounts(loan: number, bank: number, agg: number, trail: number, p = PROJECTION_DEFAULTS) {
  const keep = 1 - agg / 100;
  const upfrontGross = loan * bank / 100, upfrontYou = upfrontGross * keep;
  const trailYearGross = loan * trail / 100, trailYearYou = trailYearGross * keep, trailMonthYou = trailYearYou / 12;
  let trail5Years = 0;
  for (let m = 1; m <= 60; m++) trail5Years += trailMonthYou * (p.paydown ? balanceFactor(m, p.rate, p.term) : 1);
  return { upfrontGross, upfrontYou, aggregatorUpfront: upfrontGross - upfrontYou, trailYearGross, trailYearYou, trailMonthYou, trail5Years, keepPct: 100 - agg };
}
export function sydneyDate(date: Date | string = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(date));
  const get = (type: string) => parts.find(p => p.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
export function validSettlementDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : '';
}
export type DealCase = {
  loanAmount?: number | null; commPct?: number | null; commMmPct?: number | null;
  dealV2?: boolean; bankPct?: number | null; aggregatorPct?: number | null; trailPct?: number | null;
  settlementDate?: string; status?: string; updatedAt?: Date | string; meta?: unknown;
};
/** Legacy conversion is read-through, as in PHP: defaults remain live until saved. */
export function readDeal(c: DealCase, settings = INCOME_DEFAULTS, today = sydneyDate(), projection = PROJECTION_DEFAULTS) {
  let loan = number(c.loanAmount), bank: number, agg: number, trail: number;
  const assumed = !c.dealV2;
  if (c.dealV2) {
    bank = number(c.bankPct); agg = number(c.aggregatorPct); trail = number(c.trailPct);
  } else {
    let cp = number(c.commPct), mm = number(c.commMmPct);
    const meta = (c.meta && typeof c.meta === 'object' ? c.meta : {}) as Record<string, unknown>;
    if (loan <= 0 && cp <= 0 && mm <= 0) {
      loan = number(meta.mm_loan_amount); cp = number(meta.mm_commission_pct); mm = number(meta.mm_commission_to_mm_pct);
    }
    bank = cp > 0 ? normIncomePct(cp) : settings.bank_pct;
    if (mm > 0 && mm < 1) mm *= 100;
    agg = mm > 0 ? Math.max(0, Math.min(100, 100 - mm)) : settings.agg_pct;
    trail = settings.trail_pct;
  }
  let settleDate = validSettlementDate(c.settlementDate || '');
  const status = c.status || 'active';
  let state: 'pipeline' | 'settled' | 'lost' | 'archived' = 'pipeline';
  if (status === 'unsuccessful') state = 'lost';
  else if (settleDate && settleDate <= today) state = 'settled';
  else if (status === 'completed') { state = 'settled'; if (!settleDate) settleDate = sydneyDate(c.updatedAt || new Date()); }
  else if (status === 'archive' && !settleDate) state = 'archived';
  return { loan, bankPct: bank, aggPct: agg, trailPct: trail, settleDate, state, status, assumed, hasDeal: loan > 0 && bank > 0, ...dealAmounts(loan, bank, agg, trail, projection) };
}
export type Deal = ReturnType<typeof readDeal>;
/** Writes both v2 and legacy values, so existing integrations retain their inputs. */
export function dealSaveData(loan: number, bank: number, agg: number, trail: number, settle?: string) {
  bank = Math.max(0, number(bank)); agg = Math.max(0, Math.min(100, number(agg))); trail = Math.max(0, number(trail));
  return { loanAmount: Math.max(0, number(loan)), bankPct: bank, aggregatorPct: agg, trailPct: trail, dealV2: true,
    commPct: bank / 100, commMmPct: 100 - agg, ...(settle === undefined ? {} : { settlementDate: validSettlementDate(settle) }) };
}
export const yearMonth = (date: string) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;
const monthLabel = (ym: number) => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][ym % 12];
const addDays = (date: string, days: number) => new Date(new Date(date + 'T12:00:00Z').getTime() + days * 86400000).toISOString().slice(0, 10);
export function financialYear(today: string) {
  const y = Number(today.slice(0, 4)) - (Number(today.slice(5, 7)) < 7 ? 1 : 0);
  return { start: y * 12 + 6, label: `${y}–${String(y + 1).slice(2)}`, startDate: `${y}-07-01`, endDate: `${y + 1}-06-30` };
}
export type IncomeCase = DealCase & { id: number; name: string; stage: string; createdAt: Date | string };
export function computeIncome(cases: IncomeCase[], settings = INCOME_DEFAULTS, projection = PROJECTION_DEFAULTS, today = sydneyDate()) {
  const nowYm = yearMonth(today), fy = financialYear(today);
  const deals = cases.map(c => {
    const d = readDeal(c, settings, today, projection);
    let when = d.settleDate, estDate = false;
    if (d.state === 'pipeline' && (!when || when < today)) {
      when = addDays(sydneyDate(c.createdAt), STAGE_LEAD_DAYS[c.stage] ?? 60);
      if (when < today) when = addDays(today, 14);
      estDate = true;
    }
    return { ...d, id: c.id, name: c.name, stage: c.stage, when, estDate, ym: yearMonth(when), prob: d.state === 'settled' ? 1 : STAGE_PROB[c.stage] ?? .2 };
  }).filter(d => d.hasDeal && (d.state === 'settled' || d.state === 'pipeline'));
  const out = { runRate: 0, upfrontMonth: 0, upfrontLast: 0, upfrontFy: 0, upfrontAll: 0, settledN: 0, settledLoan: 0,
    pipeN: 0, pipeUpfront: 0, pipeUpfrontWeighted: 0, pipeTrail: 0, pipeTrailWeighted: 0, pipeLoan: 0 };
  const bars = Array<number>(12).fill(0), settledProj = Array<number>(12).fill(0), pipeProj = Array<number>(12).fill(0);
  const trailAt = (d: typeof deals[number], ym: number) => {
    const m = ym - d.ym;
    return m < 1 ? 0 : d.trailMonthYou * (projection.paydown ? balanceFactor(m, projection.rate, projection.term) : 1);
  };
  for (const d of deals) {
    if (d.state === 'settled') {
      out.settledN++; out.settledLoan += d.loan; out.upfrontAll += d.upfrontYou;
      // PHP's locked-in book run rate includes settlement month; the cashflow chart does not.
      out.runRate += d.trailMonthYou * (projection.paydown ? balanceFactor(Math.max(0, nowYm - d.ym), projection.rate, projection.term) : 1);
      if (d.ym === nowYm) out.upfrontMonth += d.upfrontYou;
      if (d.ym === nowYm - 1) out.upfrontLast += d.upfrontYou;
      if (d.ym >= fy.start && d.ym <= nowYm) out.upfrontFy += d.upfrontYou;
      const i = d.ym - (nowYm - 11); if (i >= 0 && i < 12) bars[i] += d.upfrontYou;
      for (let i = 0; i < 12; i++) settledProj[i] += trailAt(d, nowYm + i);
    } else {
      out.pipeN++; out.pipeLoan += d.loan; out.pipeUpfront += d.upfrontYou; out.pipeUpfrontWeighted += d.upfrontYou * d.prob;
      out.pipeTrail += d.trailMonthYou; out.pipeTrailWeighted += d.trailMonthYou * d.prob;
      for (let i = 0; i < 12; i++) pipeProj[i] += trailAt(d, nowYm + i) * d.prob;
    }
  }
  const settled = deals.filter(d => d.state === 'settled'), base = settled.length ? settled : deals;
  const average = (key: 'loan' | 'upfrontYou' | 'trailMonthYou') => base.reduce((n, d) => n + d[key], 0) / Math.max(1, base.length);
  return { ...out, fyLabel: fy.label, avgLoan: average('loan'), avgUpfront: average('upfrontYou'), avgTrail: average('trailMonthYou'),
    bars, settledProj, pipeProj, deals, today, barLabels: bars.map((_, i) => monthLabel(nowYm - 11 + i)), projLabels: bars.map((_, i) => monthLabel(nowYm + i)) };
}
export type IncomeData = ReturnType<typeof computeIncome>;
export function planIncome(loan: number, bank: number, agg: number, trail: number, dealsPerMonth: number, currentTrail = 0, projection = PROJECTION_DEFAULTS) {
  const d = dealAmounts(Math.max(0, loan), normIncomePct(bank), normAggregatorPct(agg), normIncomePct(trail), projection);
  const deals12 = Math.max(0, dealsPerMonth) * 12;
  const book3 = Math.max(0, dealsPerMonth) * 36 * d.trailMonthYou * (projection.paydown ? .93 : 1) + currentTrail;
  return { ...d, deals12, yearUpfront: deals12 * d.upfrontYou, trailAdded: deals12 * d.trailMonthYou, book3, book3Year: book3 * 12 };
}
