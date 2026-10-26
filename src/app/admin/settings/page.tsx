import { ArrowRight, Building2, Globe, Mail, PenLine, PlugZap, Save, Settings } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { saveSettingsAction } from "@/modules/crm/actions";
import { getCrmOptions } from "@/modules/crm/options";
import { getCrmOptions as getMailOptions } from "@/modules/crm-extra/lib/opts";
import { Alert, Button, Field, Input, LinkButton, PageHeader } from "@/components/admin/ui";
import TemplateEditor from "@/modules/crm/components/TemplateEditor";
import { SaveBar, SettingsGroup, Toggle, ToggleRow } from "@/modules/crm/components/admin-kit";

export const dynamic = "force-dynamic";

const code = "rounded bg-slate-100 px-1 py-px font-mono text-[12px] text-slate-700";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const o = await getCrmOptions();
  const mail = await getMailOptions();
  return (
    <div className="max-w-5xl">
      <PageHeader icon={<Settings />} title="MM CRM – Settings" description="Brand, email sender, signature and client portal defaults for the CRM." />
      {sp.saved && <Alert tone="success" className="mb-6">Saved.</Alert>}
      <form action={saveSettingsAction}>
        <div className="space-y-8">
          <SettingsGroup icon={<Building2 />} title="Brand & defaults" description="Your logo appears on client emails and the portal. The commission target drives the Cases Summary progress bar.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Brand Logo" htmlFor="brand_logo" hint="Full image URL (https://…)" className="sm:col-span-2">
                <div className="flex items-center gap-3">
                  {o.brand_logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={o.brand_logo} alt="" className="h-10 w-16 shrink-0 rounded-lg bg-slate-100 object-contain p-1 ring-1 ring-slate-200" />
                  ) : (
                    <span className="flex h-10 w-16 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-300 ring-1 ring-slate-200"><Building2 className="size-4" /></span>
                  )}
                  <Input id="brand_logo" type="url" name="brand_logo" defaultValue={o.brand_logo} />
                </div>
              </Field>
              <Field label="Commission Target (AUD)" htmlFor="commission_target" hint="Used by the Cases Summary progress bar.">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                  <Input id="commission_target" type="number" step="0.01" min="0" name="commission_target" defaultValue={o.commission_target || ""} className="!pl-7 tabular-nums" />
                </div>
              </Field>
            </div>
          </SettingsGroup>

          <SettingsGroup icon={<Mail />} title="Email sender" description="Who client emails come from, and where broker alerts go.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Email From Name" htmlFor="from_name">
                <Input id="from_name" name="from_name" defaultValue={o.from_name} />
              </Field>
              <Field label="Email From Address" htmlFor="from_email">
                <Input id="from_email" type="email" name="from_email" defaultValue={o.from_email} />
              </Field>
              <Field label="Broker notifications to" htmlFor="notify_email" hint="Fact Find submitted, form submitted and client message alerts." className="sm:col-span-2">
                <Input id="notify_email" name="notify_email" defaultValue={o.notify_email} placeholder="blank = From Address" />
              </Field>
            </div>
          </SettingsGroup>

          <SettingsGroup icon={<PenLine />} title="Email signature" description={<>You can also insert the merge tag <code className={code}>{"{{signature_html}}"}</code> directly into templates.</>}>
            <ToggleRow
              className="-mt-3 mb-2 border-b border-slate-100 pb-4"
              input={<Toggle name="auto_append_signature" value="1" defaultChecked={mail.autoAppendSignature} />}
              title="Append the signature to all outgoing emails"
              description={<>Only when <code className={code}>{"{{signature_html}}"}</code> is not already present.</>}
            />
            <div className="pt-2">
              <TemplateEditor name="signature_html" initial={mail.signatureHtml} placeholders={[]} />
            </div>
          </SettingsGroup>

          <SettingsGroup icon={<PlugZap />} title="Zoho Mail" description="Two-way mailbox sync for the CRM.">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">The Zoho Mail connection (data centre, client ID/secret, aliases, folders, sync) is managed on its own screen.</p>
              <LinkButton href="/admin/zoho" variant="secondary" className="shrink-0">Open Zoho Mail settings<ArrowRight /></LinkButton>
            </div>
          </SettingsGroup>

          <SettingsGroup icon={<Globe />} title="Client portal & automation" description="Where clients upload documents and fill in their Fact Find.">
            <div className="space-y-4">
              <div>
                <p className="text-[13px] font-medium text-slate-700">Client portal address</p>
                <p className="mt-1 text-sm text-slate-600">
                  <code className={code}>/portal?mm_case=…&amp;mm_key=…</code> <span className="text-slate-500">(old <code className={code}>/secure-upload-3/</code> links redirect automatically).</span>
                </p>
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-600">Reminders, automatic tasks and checklist presets.</p>
                <LinkButton href="/admin/automation" variant="secondary" className="shrink-0">Automation, reminders &amp; checklist presets<ArrowRight /></LinkButton>
              </div>
            </div>
          </SettingsGroup>
        </div>
        <SaveBar>
          <Button variant="primary"><Save />Save</Button>
        </SaveBar>
      </form>
    </div>
  );
}
