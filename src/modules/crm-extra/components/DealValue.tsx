"use client";
import { useState, useTransition } from 'react';
import { Check, Save, Wallet } from 'lucide-react';
import { Alert, Badge, Button, Field, Input, LinkButton } from '@/components/admin/ui';
import { saveDealValue } from '../actions/commission';
import { dealAmounts, normIncomePct, normAggregatorPct, type Deal, type ProjectionSettings } from '../lib/income';

const money = (n: number) => '$' + Math.round(n).toLocaleString('en-AU');
export default function DealValue({ caseId, deal, projection }: { caseId: number; deal: Deal; projection: ProjectionSettings }) {
  const [f, setF] = useState({ loan: String(deal.loan || ''), bank: String(deal.bankPct), agg: String(deal.aggPct), trail: String(deal.trailPct), settle: deal.settleDate });
  const [pending, start] = useTransition(), [saved, setSaved] = useState(false), [error, setError] = useState('');
  const update = (key: keyof typeof f, value: string) => { setF(f => ({ ...f, [key]: value })); setSaved(false); };
  const d = dealAmounts(Math.max(0, Number(f.loan) || 0), normIncomePct(f.bank), normAggregatorPct(f.agg), normIncomePct(f.trail), projection);
  const field = (key: 'bank' | 'agg' | 'trail', label: string, chips: number[], hint: React.ReactNode) => <Field label={label} htmlFor={`deal-${key}`} hint={hint}>
    <Input id={`deal-${key}`} type="number" min={0} max={key === 'agg' ? 100 : undefined} step={key === 'agg' ? .5 : .01} value={f[key]} onChange={e => update(key, e.target.value)} />
    <div className="mt-2 flex flex-wrap gap-1">{chips.map(v => <Button key={v} type="button" size="xs" variant={Number(f[key]) === v ? 'primary' : 'secondary'} onClick={() => update(key, String(v))}>{v}%</Button>)}</div>
  </Field>;
  return <form className="space-y-4" onSubmit={e => { e.preventDefault(); start(async () => { try { setError(''); await saveDealValue(caseId, f.loan, f.bank, f.agg, f.trail, f.settle); setSaved(true); } catch { setError('Could not save. Please try again.'); } }); }}>
    <Field label="Loan amount" htmlFor="deal-loan"><Input id="deal-loan" type="number" min={0} step="any" placeholder="e.g. 650000" value={f.loan} onChange={e => update('loan', e.target.value)} /></Field>
    {field('bank', 'Bank pays you upfront', [.6,.65,.7,.75,.8], <>Of the loan amount. Usually <b>0.6 – 0.8%</b>. Type it as a normal percentage, e.g. 0.7.</>)}
    {field('agg', 'Aggregator keeps', [10,15,20,25], <>Taken from the bank commission and the trail. You keep <b>{d.keepPct}%</b>.</>)}
    {field('trail', 'Trail commission (per year)', [.15,.2,.25], <>Usually <b>0.15 – 0.25%</b> a year, paid to you monthly for as long as the loan stays.</>)}
    <Field label="Settlement date" htmlFor="deal-settle" hint="Expected or actual. Once the date passes, this deal counts as earned on the Income dashboard and trail begins the following month."><Input id="deal-settle" type="date" value={f.settle} onChange={e => update('settle', e.target.value)} /></Field>
    <div aria-live="polite" className="divide-y divide-ink-700 rounded-xl bg-ink-900 text-white tabular-nums">
      <div className="p-4"><p className="text-xs text-slate-300">Upfront — you receive</p><p className="my-1 text-3xl font-semibold text-brand-300">{money(d.upfrontYou)}</p><div className="flex justify-between text-sm"><span>Bank pays</span><b>{money(d.upfrontGross)}</b></div><div className="mt-1 flex justify-between text-sm"><span>Aggregator keeps</span><b>−{money(d.aggregatorUpfront)}</b></div></div>
      <div className="p-4"><p className="text-xs text-slate-300">Trail — you receive</p><p className="my-1 text-2xl font-semibold text-brand-300">{money(d.trailMonthYou)} <span className="text-sm text-white">/month</span></p><p className="text-xs leading-relaxed text-slate-300">{money(d.trailYearYou)} a year · first 5 years {money(d.trail5Years)} {projection.paydown ? '(as the loan pays down)' : '(paydown switched off)'}</p></div>
    </div>
    {deal.assumed && deal.loan > 0 && !saved && <Badge tone="warning">Using your default percentages — save to lock them in</Badge>}
    {error && <Alert tone="danger">{error}</Alert>}
    <Button className="w-full" disabled={pending}>{saved ? <Check /> : <Save />}{pending ? 'Saving…' : saved ? 'Saved' : 'Save deal value'}</Button>
    <LinkButton href="/admin/income" variant="ghost" className="w-full"><Wallet />See your income dashboard</LinkButton>
  </form>;
}
