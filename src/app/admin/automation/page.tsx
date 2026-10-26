import { Bell, Info, ListChecks, Save, Send, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/session";
import { saveAutomationAction } from "@/modules/crm/actions";
import { getAutoOptions, getFormEmailTpl, getPresets } from "@/modules/crm/options";
import PresetsEditor from "@/modules/crm/components/PresetsEditor";
import { Alert, Button, Field, PageHeader, cn, inputStyles, textareaStyles } from "@/components/admin/ui";
import { MergeTags, SaveBar, SettingsGroup, Toggle, ToggleRow } from "@/modules/crm/components/admin-kit";

export const dynamic = "force-dynamic";
const num = cn(inputStyles, "!w-16 !px-2 text-center tabular-nums");

/** Small number input with a unit suffix, e.g. [ 3 | days ]. */
function NumUnit({ unit, ...p }: React.ComponentProps<"input"> & { unit: ReactNode }) {
  return (
    <span className="inline-flex items-stretch">
      <input type="number" {...p} className={cn(num, "!rounded-r-none")} />
      <span className="inline-flex items-center rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 px-2.5 text-xs text-slate-500">{unit}</span>
    </span>
  );
}

export default async function AutomationPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const [o, presets, tpl] = await Promise.all([getAutoOptions(), getPresets(), getFormEmailTpl()]);
  const C = (k: keyof typeof o) => !!o[k];
  return (
    <div className="max-w-5xl">
      <PageHeader icon={<Zap />} title="Automation" description="Let the CRM do the repetitive work. Everything here can be switched off." />
      {sp.saved && <Alert tone="success" className="mb-6">Saved.</Alert>}
      <form action={saveAutomationAction}>
        <div className="space-y-8">
          <SettingsGroup icon={<Zap />} title="When things happen" description="Stage moves, tasks and portal access that happen on their own when clients act." bodyClassName="!py-2">
            <div className="divide-y divide-slate-100">
              <ToggleRow input={<Toggle name="stage_on_docs" value="1" defaultChecked={C("stage_on_docs")} />} title={<>Move a case to <strong>Docs Received</strong> automatically</>} description="Once every requested document is in." />
              <ToggleRow input={<Toggle name="task_on_ff" value="1" defaultChecked={C("task_on_ff")} />} title="Create a task when a Fact Find is submitted" description="“Review & enter in Flex”" />
              <ToggleRow input={<Toggle name="task_on_form" value="1" defaultChecked={C("task_on_form")} />} title="Create a task when any other form is submitted" />
              <ToggleRow
                input={<Toggle name="task_on_create" value="1" defaultChecked={C("task_on_create")} />}
                title="Create a follow-up task after a new case is created"
              >
                <span className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-slate-600">
                  Due <NumUnit unit="days" name="followup_days" min={1} max={30} defaultValue={o.followup_days} /> after the case is created
                </span>
              </ToggleRow>
              <ToggleRow input={<Toggle name="welcome_public" value="1" defaultChecked={C("welcome_public")} />} title="Email the Fact Find link automatically" description={<>After someone submits a <strong className="font-medium text-slate-700">website enquiry form</strong>.</>} />
              <ToggleRow input={<Toggle name="portal_off_on_flex" value="1" defaultChecked={C("portal_off_on_flex")} />} title={<><strong>Close the client portal</strong> once entered in Flex</>} description="Once every section is ticked as entered in Flex." />
              <ToggleRow input={<Toggle name="portal_off_on_close" value="1" defaultChecked={C("portal_off_on_close")} />} title={<><strong>Close the client portal</strong> when a case is closed</>} description="When a case is marked Completed, Archive or Unsuccessful." />
            </div>
            <p className="flex items-start gap-1.5 border-t border-slate-100 py-3 text-xs text-slate-500"><Info className="mt-px size-3.5 shrink-0 text-slate-400" />Closed portals show clients a polite message asking them to contact you.</p>
          </SettingsGroup>

          <SettingsGroup
            icon={<Bell />}
            title="Automatic reminders to clients"
            description={<>Only active cases in <em>New</em> or <em>Docs Received</em> are chased, and never within a day of the client’s last activity. You can pause chasing on any case from its header. When the limit is reached you get a task to call them.</>}
          >
            <ToggleRow
              className="-mt-3 border-b border-slate-100 pb-4"
              input={<Toggle name="chase_enabled" value="1" defaultChecked={C("chase_enabled")} />}
              title={<strong>Chase clients automatically</strong>}
              description="When documents or the Fact Find are still outstanding."
            />
            <div className="grid gap-4 border-b border-slate-100 py-5 sm:grid-cols-3">
              <Field label="Start after"><NumUnit unit="days" name="chase_after_days" min={1} max={30} defaultValue={o.chase_after_days} /></Field>
              <Field label="Then every"><NumUnit unit="days" name="chase_every_days" min={1} max={30} defaultValue={o.chase_every_days} /></Field>
              <Field label="Up to"><NumUnit unit="reminders" name="chase_max" min={1} max={10} defaultValue={o.chase_max} /></Field>
              <Field label="Only send between" className="sm:col-span-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-3 text-[13px] text-slate-600">
                  <span className="inline-flex items-center gap-2">
                    <NumUnit unit=":00" name="chase_hour_from" min={0} max={23} defaultValue={o.chase_hour_from} />
                    and
                    <NumUnit unit=":00" name="chase_hour_to" min={1} max={24} defaultValue={o.chase_hour_to} />
                  </span>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-1 text-[13px] font-medium text-slate-700 sm:ml-3">
                    <Toggle size="sm" name="chase_weekends" value="1" defaultChecked={C("chase_weekends")} /> include weekends
                  </label>
                </div>
              </Field>
            </div>
            <div className="space-y-4 pt-5">
              <Field label="Email subject" htmlFor="chase_subject">
                <input id="chase_subject" name="chase_subject" defaultValue={o.chase_subject} className={inputStyles} />
              </Field>
              <Field label="Email message" htmlFor="chase_body">
                <textarea id="chase_body" name="chase_body" rows={9} defaultValue={o.chase_body} className={cn(textareaStyles, "leading-relaxed")} />
                <MergeTags tags={["greeting_names", "outstanding", "portal_button", "portal_url"]} />
              </Field>
            </div>
          </SettingsGroup>

          <SettingsGroup icon={<Send />} title="“Please complete this form” email" description="Sent when you send a form to a client from the case screen.">
            <div className="space-y-4">
              <Field label="Subject" htmlFor="form_subject">
                <input id="form_subject" name="form_subject" defaultValue={tpl.subject} className={inputStyles} />
              </Field>
              <Field label="Message" htmlFor="form_body">
                <textarea id="form_body" name="form_body" rows={6} defaultValue={tpl.body} className={cn(textareaStyles, "leading-relaxed")} />
                <MergeTags tags={["greeting_names", "form_name", "form_button", "form_url"]} />
              </Field>
            </div>
          </SettingsGroup>

          <SettingsGroup
            icon={<ListChecks />}
            title="Checklist presets"
            description={<>Reusable document lists. One document per line. “Tags” decide which presets are pre-ticked in the New Client screen (purchase, refinance, investment, construction, payg, self, all).</>}
          >
            <PresetsEditor initial={presets} />
          </SettingsGroup>
        </div>
        <SaveBar>
          <Button variant="primary"><Save />Save automation settings</Button>
        </SaveBar>
      </form>
    </div>
  );
}
