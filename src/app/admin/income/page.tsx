import { Save, Settings, Wallet } from 'lucide-react';
import { prisma } from '@/lib/db';
import { requireStaff } from '@/lib/session';
import { Alert, Button, Card, Field, Input, LinkButton, PageHeader, checkboxStyles } from '@/components/admin/ui';
import { applicantNames } from '@/modules/crm/applicants';
import { computeIncome } from '@/modules/crm-extra/lib/income';
import { getIncomeContext } from '@/modules/crm-extra/lib/income-settings';
import { saveIncomeSettings } from '@/modules/crm-extra/actions/income';
import IncomeDashboard from '@/modules/crm-extra/components/IncomeDashboard';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Income' };
export default async function IncomePage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const me = await requireStaff();
  const [{ settings, projection }, cases, sp] = await Promise.all([getIncomeContext(), prisma.case.findMany({ orderBy: { createdAt: 'desc' } }), searchParams]);
  const data = computeIncome(cases.map(c => ({ ...c, name: applicantNames(c) || c.title })), settings, projection);
  const headline = data.runRate > 0 ? `Your trail book pays you $${Math.round(data.runRate).toLocaleString('en-AU')} every month — whether you work or not.` : data.pipeTrail > 0 ? `Settle what’s in your pipeline and your trail book starts paying $${Math.round(data.pipeTrail).toLocaleString('en-AU')} a month.` : 'Add a loan amount to a case and watch your future income build here.';
  return <div className="space-y-6"><PageHeader title={`Your income, ${me.name.split(' ')[0]}`} icon={<Wallet />} description={headline} actions={me.role === 'ADMIN' ? <LinkButton href="#income-settings" variant="secondary"><Settings />Goals &amp; defaults</LinkButton> : undefined} />
    {sp.saved && <Alert tone="success">Income settings saved.</Alert>}
    <IncomeDashboard data={data} settings={settings} projection={projection} />
    {me.role === 'ADMIN' && <Card id="income-settings" title="Goals & default percentages" description="Defaults pre-fill new deals and fill in any case that has no percentages saved. Paydown uses your Borrowing Capacity rate and term."><form action={saveIncomeSettings} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{([['goal_trail_month','Monthly trail goal ($)',100],['goal_fy_upfront','Upfront goal this financial year ($)',5000],['bank_pct','Default bank upfront %',.01],['agg_pct','Default aggregator keeps %',.5],['trail_pct','Default trail % p.a.',.01]] as const).map(([key,label,step]) => <Field key={key} htmlFor={key} label={label}><Input id={key} name={key} type="number" min={0} step={step} defaultValue={settings[key]} /></Field>)}</div><label className="flex items-center gap-2 text-sm"><input className={checkboxStyles} type="checkbox" name="paydown" defaultChecked={!!settings.paydown} />Allow for loans paying down in projections</label><Button><Save />Save</Button></form></Card>}
  </div>;
}
