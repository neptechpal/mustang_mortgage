"use client";
import Link from 'next/link';
import { useState } from 'react';
import { Check, Coins, Landmark, Target, TrendingUp, Wallet } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Field, Input, StatCard, TableWrap, Table, THead, TBody, TR, TH, TD } from '@/components/admin/ui';
import { STAGES } from '@/modules/crm/constants';
import { planIncome, TRAIL_MILESTONES, type IncomeData, type IncomeSettings, type ProjectionSettings } from '../lib/income';
const money = (n: number) => '$' + Math.round(n).toLocaleString('en-AU');

function Chart({ title, labels, values, extra, current }: { title: string; labels: string[]; values: number[]; extra?: number[]; current: number }) {
  const max = Math.max(1, ...values.map((v, i) => v + (extra?.[i] || 0)));
  return <Card title={title} description={extra ? 'Settled · likely from pipeline' : 'Last 12 months'}>
    <div className="flex h-52 items-end gap-1.5" role="img" aria-label={labels.map((l, i) => `${l}: ${money(values[i])}${extra ? ` settled, ${money(extra[i])} likely` : ''}`).join('; ')}>
      {labels.map((l, i) => <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" title={`${l}: ${money(values[i])}${extra ? ` settled + ${money(extra[i])} likely` : ''}`}>
        <div className={`flex w-full flex-1 flex-col justify-end overflow-hidden rounded-t-md ${i === current ? 'bg-brand-50' : 'bg-slate-50'}`}>
          {extra && <div className="bg-amber-300" style={{ height: `${extra[i] / max * 100}%` }} />}
          <div className="bg-brand-600" style={{ height: `${values[i] / max * 100}%` }} />
        </div><span className="text-[10px] text-slate-500">{l}</span>
      </div>)}
    </div>
    {extra && <p className="mt-4 text-xs text-slate-500">Trail starts the month after settlement. Gold: settled; amber: pipeline weighted by stage.</p>}
  </Card>;
}
export default function IncomeDashboard({ data: c, settings: s, projection }: { data: IncomeData; settings: IncomeSettings; projection: ProjectionSettings }) {
  const [filter, setFilter] = useState('all');
  const [plan, setPlan] = useState({ loan: Math.round((c.avgLoan || 650000) / 1000) * 1000, bank: s.bank_pct, agg: s.agg_pct, trail: s.trail_pct, n: 2 });
  const p = planIncome(plan.loan, plan.bank, plan.agg, plan.trail, plan.n, c.runRate, projection);
  const goal = Math.max(1, s.goal_trail_month), fyGoal = Math.max(1, s.goal_fy_upfront);
  const pct = Math.min(100, Math.round(c.runRate / goal * 100)), fyPct = Math.min(100, Math.round(c.upfrontFy / fyGoal * 100));
  const next = TRAIL_MILESTONES.find(m => m > c.runRate), reached = TRAIL_MILESTONES.filter(m => m <= c.runRate).length;
  const need = c.avgTrail > 0 && goal > c.runRate ? Math.ceil((goal - c.runRate) / c.avgTrail) : 0;
  const rows = c.deals.filter(d => filter === 'all' || d.state === filter).sort((a, b) => a.state !== b.state ? a.state === 'settled' ? -1 : 1 : a.state === 'settled' ? b.when.localeCompare(a.when) : a.when.localeCompare(b.when));
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={<Wallet />} tone="brand" label="Monthly trail — locked in" value={`${money(c.runRate)}/mo`} hint={<>{money(c.runRate * 12)} a year · {c.settledN} settled loans<br />+ {money(c.pipeTrailWeighted)}/mo likely from your pipeline</>} />
      <StatCard icon={<Coins />} tone="success" label="Upfront this month" value={money(c.upfrontMonth)} hint={<>Last month {money(c.upfrontLast)}<br />FY {c.fyLabel} so far {money(c.upfrontFy)}</>} />
      <StatCard icon={<TrendingUp />} tone="info" label="In the pipeline" value={money(c.pipeUpfront)} hint={<>{c.pipeN} deals · {money(c.pipeLoan)} of loans<br />Likely {money(c.pipeUpfrontWeighted)} upfront · {money(c.pipeTrail)}/mo trail if all settle</>} />
      <StatCard icon={<Landmark />} tone="violet" label="Total earned upfront" value={money(c.upfrontAll)} hint={<>On {money(c.settledLoan)} settled<br />Average deal: {money(c.avgUpfront)} + {money(c.avgTrail)}/mo</>} />
    </div>
    <Card>
      <div className="grid items-center gap-6 lg:grid-cols-[124px_minmax(0,1fr)_260px]">
        <div className="relative size-[124px]" role="img" aria-label={`${pct}% of monthly trail goal`}>
          <svg width="124" height="124" viewBox="0 0 124 124"><circle cx="62" cy="62" r="52" fill="none" className="stroke-slate-100" strokeWidth="11" /><circle cx="62" cy="62" r="52" fill="none" className={pct >= 100 ? 'stroke-emerald-600' : 'stroke-brand-600'} strokeWidth="11" strokeLinecap="round" strokeDasharray={2 * Math.PI * 52} strokeDashoffset={2 * Math.PI * 52 * (1 - pct / 100)} transform="rotate(-90 62 62)" /></svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center"><b className="text-2xl tabular-nums">{pct}%</b><span className="text-xs text-slate-500">of goal</span></div>
        </div>
        <div><h2 className="flex items-center gap-2 font-semibold"><Target className="size-4" />Trail goal: {money(goal)} / month</h2><p className="mt-2 text-sm text-slate-600">{goal <= c.runRate ? 'Goal reached! Time to set a bigger one.' : need ? `You need ${money(goal - c.runRate)} more per month — about ${need} more deals like your average (${money(c.avgLoan)}).` : 'Settle your first deals to start building your trail book.'}</p>
          <div className="my-3 flex flex-wrap gap-3">{TRAIL_MILESTONES.map(m => <span key={m} className="flex flex-col items-center gap-1 text-[10px] text-slate-500"><span className={`flex size-6 items-center justify-center rounded-full border-2 ${c.runRate >= m ? 'border-brand-600 bg-brand-600 text-white' : m === next ? 'border-brand-600 ring-4 ring-brand-100' : 'border-slate-200'}`}>{c.runRate >= m && <Check className="size-3.5" />}</span>{m >= 1000 ? `$${m / 1000}k` : money(m)}</span>)}</div>
          <p className="text-xs text-slate-500">{reached} of {TRAIL_MILESTONES.length} trail milestones reached{next ? ` · next: ${money(next)}/mo (${money(next - c.runRate)} to go)` : ''}</p>
        </div>
        <div><h3 className="text-xs font-semibold text-slate-500">Upfront target — FY {c.fyLabel}</h3><div className="my-3 h-3 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-600" style={{ width: `${fyPct}%` }} /></div><p className="text-sm tabular-nums"><b>{money(c.upfrontFy)}</b> of {money(fyGoal)} ({fyPct}%)</p></div>
      </div>
    </Card>
    <div className="grid gap-6 xl:grid-cols-2"><Chart title="Upfront commission received" labels={c.barLabels} values={c.bars} current={11} /><Chart title="Trail income — next 12 months" labels={c.projLabels} values={c.settledProj} extra={c.pipeProj} current={0} /></div>
    <p className="text-xs text-slate-500">{projection.paydown ? 'Projections allow for loans paying down using your Borrowing Capacity rate and term.' : 'Paydown is switched off.'}</p>
    <Card title="What is one more deal worth?" description="Play with the numbers — then go and get it.">
      <div className="grid gap-6 lg:grid-cols-[minmax(240px,1fr)_2fr]">
        <div className="grid grid-cols-2 gap-3">{([['loan','Loan amount',10000],['bank','Bank upfront %',.05],['agg','Aggregator keeps %',1],['trail','Trail p.a. %',.01],['n','Deals per month',1]] as const).map(([key,label,step]) => <Field key={key} label={label} htmlFor={`planner-${key}`} className={key === 'loan' ? 'col-span-2' : ''}><Input id={`planner-${key}`} type="number" min={0} step={step} value={plan[key]} onChange={e => setPlan({ ...plan, [key]: Number(e.target.value) })} /></Field>)}</div>
        <div className="grid gap-4 sm:grid-cols-2" aria-live="polite"><StatCard label="This one deal — upfront" value={money(p.upfrontYou)} tone="brand" /><StatCard label="This one deal — trail" value={`${money(p.trailMonthYou)}/mo`} hint={`Worth ${money(p.trail5Years)} over the first 5 years`} tone="brand" /><StatCard label="Keep that pace for 12 months" value={money(p.yearUpfront)} hint={`${p.deals12} deals · plus ${money(p.trailAdded)}/mo trail added`} tone="success" /><StatCard label="…and in 3 years your trail book pays" value={`${money(p.book3)}/mo`} hint={`≈ ${money(p.book3Year)} a year`} tone="success" /></div>
      </div>
    </Card>
    <Card title="Every deal" padded={false} actions={<div className="flex gap-1">{['all','settled','pipeline'].map(f => <Button key={f} size="sm" variant={filter === f ? 'primary' : 'ghost'} onClick={() => setFilter(f)}>{f[0].toUpperCase() + f.slice(1)}</Button>)}</div>}>
      {!rows.length ? <EmptyState icon={<Wallet />} title="No deals in this view" description="Open a case and fill in Deal value & income — your numbers appear here instantly." /> : <TableWrap className="border-0 shadow-none"><Table><THead><TR>{['Client','Status','Loan','Upfront (you)','Trail / month','Settlement'].map(t => <TH key={t}>{t}</TH>)}</TR></THead><TBody>{rows.map(d => <TR key={d.id}><TD><Link href={`/admin/cases/${d.id}`} className="font-medium hover:underline">{d.name}</Link>{d.assumed && <Badge tone="warning" className="ml-2">est.</Badge>}</TD><TD><Badge tone={d.state === 'settled' ? 'success' : 'info'}>{d.state === 'settled' ? 'Settled' : STAGES[d.stage] || d.stage}</Badge></TD><TD className="tabular-nums">{money(d.loan)}</TD><TD className="tabular-nums"><b>{money(d.upfrontYou)}</b><small className="block text-slate-500">{d.bankPct}% − {d.aggPct}%</small></TD><TD className="tabular-nums"><b>{money(d.trailMonthYou)}</b><small className="block text-slate-500">{d.trailPct}% p.a.</small></TD><TD className="whitespace-nowrap">{new Date(d.when + 'T12:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}{d.estDate && ' (est.)'}</TD></TR>)}</TBody></Table></TableWrap>}
    </Card>
  </div>;
}
