import { KeyRound, LayoutGrid, Mail, Save, Settings2, UserPlus } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { Card, PageHeader, checkboxStyles } from "@/components/admin/ui";
import { adminSaveSettings } from "@/modules/members/admin-actions";
import { Field, Flash, btnPrimary, inputCls, sp1 } from "@/modules/members/components/AdminUi";
import { EMAIL_LABELS, getMembersSettings, type EmailKey } from "@/modules/members/settings";

export const metadata = { title: "Membership Settings" };
export const dynamic = "force-dynamic";

function Check({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-800 hover:bg-slate-50">
      <input type="checkbox" name={name} value="1" defaultChecked={checked} className={checkboxStyles} /> {label}
    </label>
  );
}

function CardTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <span className="text-slate-400 [&_svg]:size-4">{icon}</span>
      {children}
    </span>
  );
}

export default async function MembersSettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const s = await getMembersSettings();
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Users", href: "/admin/users" }, { label: "Membership Settings" }]}
        icon={<Settings2 />}
        title="Membership Settings"
        description="Registration rules, passwords, the public member directory and account e-mails."
      />
      <div className="max-w-5xl">
        <Flash msg={sp1(sp.msg)} error={sp1(sp.error)} />
        <form action={adminSaveSettings} className="space-y-6">
          <Card title={<CardTitle icon={<UserPlus />}>Registration (default Member role)</CardTitle>}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Check name="registrationEnabled" label="Allow new registrations on /register/" checked={s.registrationEnabled} />
              </div>
              <Field label="Registration status">
                <select name="registerStatus" defaultValue={s.registerStatus} className={inputCls}>
                  <option value="approved">Auto approve</option>
                  <option value="checkmail">Require email activation</option>
                  <option value="pending">Require admin review</option>
                </select>
              </Field>
              <Field label="Action after auto-approved registration">
                <select name="afterRegister" defaultValue={s.afterRegister} className={inputCls}>
                  <option value="redirect_profile">Redirect to profile</option>
                  <option value="redirect_url">Redirect to URL</option>
                </select>
              </Field>
              <Field label="Redirect URL (same site path)">
                <input name="afterRegisterUrl" defaultValue={s.afterRegisterUrl} className={inputCls} placeholder="/account" />
              </Field>
              <div className="hidden sm:block" />
              <div className="sm:col-span-2">
                <Field label="Message after registration (email activation)">
                  <textarea name="checkmailMessage" defaultValue={s.checkmailMessage} rows={2} className={inputCls} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Message after registration (pending review)">
                  <textarea name="pendingMessage" defaultValue={s.pendingMessage} rows={2} className={inputCls} />
                </Field>
              </div>
              <Field label="Blocked usernames" hint="One per line">
                <textarea name="blockedWords" defaultValue={s.blockedWords.join("\n")} rows={5} className={`${inputCls} font-mono text-xs`} />
              </Field>
              <Field label="Blocked e-mails" hint="One per line; *@domain.com blocks a domain">
                <textarea name="blockedEmails" defaultValue={s.blockedEmails.join("\n")} rows={5} className={`${inputCls} font-mono text-xs`} />
              </Field>
            </div>
          </Card>

          <Card title={<CardTitle icon={<KeyRound />}>Passwords &amp; profile</CardTitle>}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Password min chars">
                <input name="passwordMinChars" type="number" defaultValue={s.passwordMinChars} className={`${inputCls} tabular-nums`} />
              </Field>
              <Field label="Password max chars">
                <input name="passwordMaxChars" type="number" defaultValue={s.passwordMaxChars} className={`${inputCls} tabular-nums`} />
              </Field>
              <Field label="Reset requests limit" hint="Per user until next login; 0 = unlimited">
                <input name="resetPasswordLimit" type="number" defaultValue={s.resetPasswordLimit} className={`${inputCls} tabular-nums`} />
              </Field>
              <Field label="Bio max chars">
                <input name="profileBioMaxChars" type="number" defaultValue={s.profileBioMaxChars} className={`${inputCls} tabular-nums`} />
              </Field>
            </div>
          </Card>

          <Card title={<CardTitle icon={<LayoutGrid />}>Member directory (/members/)</CardTitle>}>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-3 sm:col-span-3 sm:grid-cols-2">
                <Check name="dir_enabled" label="Enable the member directory" checked={s.directory.enabled} />
                <Check name="dir_search" label="Show search box" checked={s.directory.search} />
              </div>
              <Field label="Visible to">
                <select name="dir_visibleTo" defaultValue={s.directory.visibleTo} className={inputCls}>
                  <option value="everyone">Everyone</option>
                  <option value="members">Logged-in users</option>
                  <option value="staff">Staff only</option>
                </select>
              </Field>
              <Field label="Profiles per page">
                <input name="dir_perPage" type="number" defaultValue={s.directory.perPage} className={`${inputCls} tabular-nums`} />
              </Field>
              <Field label="Profiles per page (mobile)">
                <input name="dir_perPageMobile" type="number" defaultValue={s.directory.perPageMobile} className={`${inputCls} tabular-nums`} />
              </Field>
              <Field label="Results text">
                <input name="dir_header" defaultValue={s.directory.header} className={inputCls} />
              </Field>
              <Field label="Single result text">
                <input name="dir_headerSingle" defaultValue={s.directory.headerSingle} className={inputCls} />
              </Field>
              <Field label="No results text">
                <input name="dir_noUsers" defaultValue={s.directory.noUsers} className={inputCls} />
              </Field>
            </div>
          </Card>

          <Card title={<CardTitle icon={<Mail />}>E-mails</CardTitle>}>
            <div className="mb-5 grid gap-4 sm:grid-cols-2">
              <Field label="Admin e-mail address" hint="Receives admin notifications (comma-separate for several)">
                <input name="adminEmail" defaultValue={s.adminEmail} className={inputCls} />
              </Field>
              <Field label="Mail appears from (name)">
                <input name="mailFromName" defaultValue={s.mailFromName} className={inputCls} />
              </Field>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="w-14 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">On</th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">E-mail</th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Subject</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(Object.keys(s.emails) as EmailKey[]).map((k) => (
                    <tr key={k} className="align-middle">
                      <td className="px-4 py-2">
                        <input type="checkbox" name={`email_${k}_on`} value="1" defaultChecked={s.emails[k].on} aria-label={`Enable ${EMAIL_LABELS[k]}`} className={checkboxStyles} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 font-medium text-slate-800">{EMAIL_LABELS[k]}</td>
                      <td className="min-w-[260px] px-4 py-2">
                        <input name={`email_${k}_subject`} defaultValue={s.emails[k].subject} aria-label={`${EMAIL_LABELS[k]} subject`} className={inputCls} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Placeholders: <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">{"{site_name}"}</code>,{" "}
              <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">{"{display_name}"}</code>,{" "}
              <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">{"{username}"}</code>. The password reset and account activation e-mails are always sent when requested.
            </p>
          </Card>

          <div className="sticky bottom-4 z-10 flex items-center justify-end gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.18)] backdrop-blur">
            <button className={btnPrimary}>
              <Save /> Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
