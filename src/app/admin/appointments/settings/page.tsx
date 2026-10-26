import { CalendarOff, Mail, Plus, Save, Settings2, SlidersHorizontal, X } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { Alert, Button, Card, PageHeader, checkboxStyles, cn, inputStyles, labelStyles, selectStyles, textareaStyles } from "@/components/admin/ui";
import { addBlackout, deleteBlackout, saveBookingSettings } from "@/modules/tools/appointments/actions";
import ActionForm from "@/modules/tools/appointments/admin/ActionForm";
import SubNav from "@/modules/tools/appointments/admin/SubNav";
import { getSsaSettings } from "@/modules/tools/appointments/settings";
import { ymdInTz } from "@/modules/tools/tz";

export const dynamic = "force-dynamic";
export const metadata = { title: "Booking settings" };

const TRIGGERS: Record<string, string> = {
  appointment_booked: "Appointment booked",
  appointment_canceled: "Appointment canceled",
  appointment_rescheduled: "Appointment rescheduled",
};
const VARS = [
  "{{ Appointment.customer_information.Name }}",
  "{{ Appointment.business_start_date }}",
  "{{ Appointment.customer_start_date }}",
  "{{ Appointment.AppointmentType.title }}",
  "{{ Appointment.customer_information_summary }}",
  "{{ Appointment.public_edit_url }}",
  "{{ Global.home_url }}",
  "{{ instructions }}",
  "{{ cancelation_note }}",
];

function CardTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <span className="text-slate-400 [&_svg]:size-4">{icon}</span>
      {children}
    </span>
  );
}

export default async function BookingSettingsPage() {
  const sess = await requireStaff();
  const s = await getSsaSettings();
  const blackouts = await prisma.appointmentBlackout.findMany({ where: { endDate: { gte: ymdInTz(new Date(), s.timezone) } }, orderBy: { startDate: "asc" } });
  const isAdmin = sess.role === "ADMIN";

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Appointments", href: "/admin/appointments" }, { label: "Settings" }]}
        icon={<Settings2 />}
        title="Booking settings"
        description="Blackout dates, business details and the emails sent for each booking."
      />
      <SubNav active="Settings" />

      <div className="max-w-5xl space-y-6">
        <Card title={<CardTitle icon={<CalendarOff />}>Blackout dates</CardTitle>} description="No appointments can be booked on these days (holidays, leave).">
          {blackouts.length ? (
            <ul className="mb-5 divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
              {blackouts.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <CalendarOff className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-900 tabular-nums">
                        {b.startDate}
                        {b.endDate !== b.startDate ? ` → ${b.endDate}` : ""}
                      </span>
                      {b.note && <span className="block truncate text-xs text-slate-500">{b.note}</span>}
                    </span>
                  </span>
                  <form action={deleteBlackout}>
                    <input type="hidden" name="id" value={b.id} />
                    <Button variant="ghost" size="xs" className="text-slate-500 hover:bg-red-50 hover:text-red-600">
                      <X /> Remove
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-5 rounded-lg border border-dashed border-slate-300 px-4 py-4 text-center text-sm text-slate-500">No upcoming blackout dates.</p>
          )}
          <ActionForm action={addBlackout} submitLabel="Add blackout" okMessage="Added." submitIcon={<Plus />} secondary>
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_2fr]">
              <label className="block">
                <span className={labelStyles}>From</span>
                <input type="date" name="startDate" required className={inputStyles} />
              </label>
              <label className="block">
                <span className={labelStyles}>To (inclusive)</span>
                <input type="date" name="endDate" className={inputStyles} />
              </label>
              <label className="block">
                <span className={labelStyles}>Note</span>
                <input name="note" placeholder="e.g. Christmas break" className={inputStyles} />
              </label>
            </div>
          </ActionForm>
        </Card>

        {isAdmin ? (
          <ActionForm action={saveBookingSettings} submitLabel="Save settings" submitIcon={<Save />} className="space-y-6" sticky>
            <Card title={<CardTitle icon={<SlidersHorizontal />}>General</CardTitle>}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={labelStyles}>Business timezone</span>
                  <input name="timezone" defaultValue={s.timezone} className={inputStyles} />
                </label>
                <label className="block">
                  <span className={labelStyles}>Admin email (receives booking notifications)</span>
                  <input name="adminEmail" type="email" defaultValue={s.adminEmail} className={inputStyles} />
                </label>
                <label className="block">
                  <span className={labelStyles}>Company name</span>
                  <input name="companyName" defaultValue={s.companyName} className={inputStyles} />
                </label>
                <label className="block">
                  <span className={labelStyles}>Staff name</span>
                  <input name="staffName" defaultValue={s.staffName} className={inputStyles} />
                </label>
                <label className="block">
                  <span className={labelStyles}>Week starts on</span>
                  <select name="startOfWeek" defaultValue={s.startOfWeek} className={selectStyles}>
                    <option value={1}>Monday</option>
                    <option value={0}>Sunday</option>
                  </select>
                </label>
                <label className="block">
                  <span className={labelStyles}>Accent colour</span>
                  <input name="accentColor" type="color" defaultValue={s.accentColor} className="h-9 w-20 cursor-pointer rounded-lg border border-slate-300 bg-white p-1" />
                </label>
              </div>
              <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-800 hover:bg-slate-50">
                  <input type="checkbox" name="blackoutEnabled" value="1" defaultChecked={s.blackoutEnabled} className={checkboxStyles} /> Enforce blackout dates
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-800 hover:bg-slate-50">
                  <input type="checkbox" name="notificationsEnabled" value="1" defaultChecked={s.notificationsEnabled} className={checkboxStyles} /> Send email notifications
                </label>
              </div>
            </Card>

            <Card title={<CardTitle icon={<Mail />}>Email notifications</CardTitle>} description="A calendar (.ics) file is attached to every email.">
              <div className="mb-5 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">
                <p className="mb-2 font-medium text-slate-700">Variables</p>
                <div className="flex flex-wrap gap-1.5">
                  {VARS.map((v) => (
                    <code key={v} className="rounded-md bg-white px-1.5 py-0.5 font-mono text-[11px] text-slate-700 ring-1 ring-inset ring-slate-200">
                      {v}
                    </code>
                  ))}
                </div>
                <p className="mt-2">
                  Conditionals <code className="rounded bg-white px-1 font-mono text-[11px] ring-1 ring-inset ring-slate-200">{"{% if x %}…{% else %}…{% endif %}"}</code>.
                </p>
              </div>
              <div className="space-y-4">
                {s.notifications.map((n) => (
                  <div key={n.id} className="rounded-lg border border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{n.title}</p>
                        <p className="text-xs text-slate-500">{TRIGGERS[n.trigger] ?? n.trigger}</p>
                      </div>
                      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input type="checkbox" name={`n_${n.id}_enabled`} value="1" defaultChecked={n.enabled} className={checkboxStyles} /> Enabled
                      </label>
                    </div>
                    <div className="grid gap-4 p-4 sm:grid-cols-2">
                      <label className="block">
                        <span className={labelStyles}>Send to (comma separated)</span>
                        <input name={`n_${n.id}_sentTo`} defaultValue={n.sentTo.join(", ")} className={inputStyles} />
                      </label>
                      <label className="block">
                        <span className={labelStyles}>Subject</span>
                        <input name={`n_${n.id}_subject`} defaultValue={n.subject} className={inputStyles} />
                      </label>
                      <label className="block sm:col-span-2">
                        <span className={labelStyles}>Message (HTML)</span>
                        <textarea name={`n_${n.id}_message`} rows={8} defaultValue={n.message} className={cn(textareaStyles, "font-mono text-xs leading-relaxed")} />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </ActionForm>
        ) : (
          <Alert tone="info">General settings and email templates can only be changed by an administrator.</Alert>
        )}
      </div>
    </div>
  );
}
