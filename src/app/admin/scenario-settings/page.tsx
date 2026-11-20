import { Bot, CalendarClock, ClipboardCheck, KeyRound, Save, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { Alert, Badge, Button, Field, Input, PageHeader, Select, Textarea, checkboxStyles } from "@/components/admin/ui";
import { SaveBar, SettingsGroup, Toggle, ToggleRow } from "@/modules/crm/components/admin-kit";
import { AI_MODELS, STAGES, getChecklists, getScenarioSettings } from "@/modules/scenario/settings";
import { saveChecklistsAction, saveScenarioSettingsAction } from "@/modules/scenario/settings-admin/actions";
import ChecklistEditor from "@/modules/scenario/settings-admin/ChecklistEditor";
import { fmtDate, fromDateInput } from "@/modules/scenario/policy/meta";

export const dynamic = "force-dynamic";
export const metadata = { title: "Scenario Assistant settings" };

export default async function ScenarioSettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requireAdmin();
  const sp = await searchParams;
  const [cfg, lists] = await Promise.all([getScenarioSettings(), getChecklists()]);
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const unsafe = cfg.aiEnabled && !cfg.privacyConfirmed;

  return (
    <div className="max-w-5xl">
      <PageHeader
        icon={<SlidersHorizontal />}
        title="Scenario Assistant settings"
        description="AI controls, review periods and compliance checklist templates for the AI Scenario Assistant."
        actions={
          <>
            {cfg.aiEnabled ? <Badge tone={unsafe ? "warning" : "success"} dot>AI on</Badge> : <Badge tone="neutral" dot>AI off</Badge>}
            {lists.confirmed ? <Badge tone="success">Checklists confirmed</Badge> : <Badge tone="warning">Checklists unconfirmed</Badge>}
          </>
        }
      />
      {sp.err && <Alert tone="danger" title="Not saved" className="mb-5">{sp.err}</Alert>}
      {sp.msg && <Alert tone="success" className="mb-5">{sp.msg}</Alert>}
      {unsafe && (
        <Alert tone="warning" title="AI is enabled but privacy has not been confirmed" className="mb-6">
          Live client enquiries must not be processed with AI until the business has confirmed the privacy notice, consent, permitted uses, retention and the AI provider assessment. Use synthetic or test data only.
        </Alert>
      )}

      <form action={saveScenarioSettingsAction} id="ai" className="scroll-mt-24">
        <div className="space-y-8">
          <SettingsGroup icon={<Bot />} title="AI kill switch" description="Turns model calls on or off for the whole assistant.">
            <ToggleRow
              className="-mt-3"
              input={<Toggle name="aiEnabled" value="1" defaultChecked={cfg.aiEnabled} />}
              title="AI explanations enabled"
              description="When off, no data is sent to the AI provider. The enquiry form, lead workflow, calculations and the rule-based lender shortlist keep working — only the AI explanation, Q&A and drafts are disabled."
            />
            <div className="mt-2 grid gap-5 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <Field label="Model" htmlFor="model">
                <Select id="model" name="model" defaultValue={cfg.model}>
                  {AI_MODELS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </Field>
              <Field label="Reasoning effort" htmlFor="effort" hint="Higher = slower and more thorough.">
                <Select id="effort" name="effort" defaultValue={cfg.effort}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </Select>
              </Field>
            </div>
            <div className="mt-4 flex items-center gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5 text-sm ring-1 ring-inset ring-slate-200/70">
              <KeyRound className="size-4 shrink-0 text-slate-400" />
              <span className="text-slate-600">API key (<code className="font-mono text-xs">ANTHROPIC_API_KEY</code>)</span>
              <span className="ml-auto">{hasKey ? <Badge tone="success" dot>Set</Badge> : <Badge tone="danger" dot>Not set</Badge>}</span>
            </div>
            {!hasKey && <p className="mt-2 text-xs text-slate-500">Without a key, AI calls report “unavailable” and assessments continue rule-based only.</p>}
          </SettingsGroup>

          <SettingsGroup icon={<ShieldCheck />} title="Privacy confirmation" description="Required before any live client enquiry is processed with AI.">
            <Alert tone="warning" className="mb-4">
              Live enquiries must not be processed with AI until the business confirms the privacy notice, client consent, permitted uses, retention, and the AI provider assessment.
            </Alert>
            <label className="flex items-start gap-2.5 text-sm text-slate-800">
              <input type="checkbox" name="privacyConfirmed" value="1" defaultChecked={cfg.privacyConfirmed} className={`${checkboxStyles} mt-0.5`} />
              <span>
                The business has confirmed privacy notice, consent, permitted uses, retention and the AI provider assessment
                <span className="block text-xs text-slate-500">Record who confirmed it and where the evidence is kept below.</span>
              </span>
            </label>
            <Field label="Privacy note" htmlFor="privacyNote" className="mt-4" hint="e.g. who confirmed, date, document reference.">
              <Textarea id="privacyNote" name="privacyNote" rows={3} maxLength={2000} defaultValue={cfg.privacyNote} />
            </Field>
          </SettingsGroup>

          <SettingsGroup icon={<CalendarClock />} title="Defaults" description="Due dates for generated tasks and how long a verified rule or price stays current.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Follow-up task due (days)" htmlFor="taskDueDays" hint="Generated tasks are due this many days after creation.">
                <Input id="taskDueDays" name="taskDueDays" type="number" min={0} max={60} step={1} required defaultValue={cfg.taskDueDays} className="tabular-nums" />
              </Field>
              <Field label="Policy & pricing review period (days)" htmlFor="reviewDays" hint="Default review due date = verified date + this.">
                <Input id="reviewDays" name="reviewDays" type="number" min={7} max={730} step={1} required defaultValue={cfg.reviewDays} className="tabular-nums" />
              </Field>
            </div>
          </SettingsGroup>
        </div>
        <SaveBar hint={unsafe ? "AI on without privacy confirmation — test data only." : undefined}>
          <Button variant="primary"><Save />Save settings</Button>
        </SaveBar>
      </form>

      <form action={saveChecklistsAction} id="checklists" className="mt-10 scroll-mt-24">
        <SettingsGroup
          icon={<ClipboardCheck />}
          title="Compliance checklist templates"
          description="Items shown on each case per stage. Starter templates only — they are not legal advice."
        >
          <Alert tone="warning" className="mb-5" title={lists.confirmed ? undefined : "Not yet confirmed"}>
            The licensee / aggregator must confirm these templates, their triggers and record-retention requirements before launch.
          </Alert>
          <ChecklistEditor stages={STAGES} initial={lists.stages} />
          <div className="mt-6 space-y-4 border-t border-slate-100 pt-5">
            <label className="flex items-start gap-2.5 text-sm text-slate-800">
              <input type="checkbox" name="confirmed" value="1" defaultChecked={lists.confirmed} className={`${checkboxStyles} mt-0.5`} />
              <span>
                Templates, triggers and retention confirmed by the licensee / aggregator
                {lists.confirmed && lists.confirmedAt && (
                  <span className="block text-xs text-slate-500">Confirmed {fmtDate(fromDateInput(lists.confirmedAt) ?? lists.confirmedAt)}{lists.confirmedBy && ` by ${lists.confirmedBy}`}</span>
                )}
              </span>
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Confirmed by" htmlFor="confirmedBy" hint="Defaults to you when ticked.">
                <Input id="confirmedBy" name="confirmedBy" maxLength={160} defaultValue={lists.confirmedBy} placeholder={s.name} />
              </Field>
              <Field label="Confirmed on" htmlFor="confirmedAt" hint="Defaults to today when ticked.">
                <Input id="confirmedAt" name="confirmedAt" type="date" defaultValue={lists.confirmedAt} />
              </Field>
            </div>
            <Field label="Note" htmlFor="note" hint="Licensee / aggregator reference, retention period, trigger rules.">
              <Textarea id="note" name="note" rows={3} maxLength={4000} defaultValue={lists.note} />
            </Field>
          </div>
          <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
            <Button variant="primary"><Save />Save checklists</Button>
          </div>
        </SettingsGroup>
      </form>
    </div>
  );
}
