import { notFound } from "next/navigation";
import type { AppointmentType } from "@prisma/client";
import { Bell, CalendarRange, Clock, Layers, Lock, Save, Trash2, UserRound } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { Alert, Button, Card, PageHeader, checkboxStyles, cn, hintStyles, inputStyles, labelStyles, selectStyles, textareaStyles } from "@/components/admin/ui";
import { deleteAppointmentType, saveAppointmentType } from "@/modules/tools/appointments/actions";
import ActionForm from "@/modules/tools/appointments/admin/ActionForm";
import AvailabilityEditor from "@/modules/tools/appointments/admin/AvailabilityEditor";
import CustomFieldsEditor from "@/modules/tools/appointments/admin/CustomFieldsEditor";
import SubNav from "@/modules/tools/appointments/admin/SubNav";
import { readAvailability, STANDARD_FIELDS, WP_MORTGAGE_CONSULTATION, type CustomerField } from "@/modules/tools/appointments/types";
import { ymdInTz } from "@/modules/tools/tz";

export const dynamic = "force-dynamic";

function splitNotice(min: number) {
  if (min > 0 && min % 1440 === 0) return { value: min / 1440, unit: 1440 };
  if (min > 0 && min % 60 === 0) return { value: min / 60, unit: 60 };
  return { value: min, unit: 1 };
}

function NoticeField({ name, label, minutes }: { name: string; label: string; minutes: number }) {
  const n = splitNotice(minutes);
  return (
    <label className="block">
      <span className={labelStyles}>{label}</span>
      <div className="flex gap-2">
        <input type="number" min={0} name={`${name}Value`} defaultValue={n.value} className={cn(inputStyles, "min-w-0 tabular-nums")} />
        <select name={`${name}Unit`} defaultValue={n.unit} className={cn(selectStyles, "!w-auto")}>
          <option value={1}>minutes</option>
          <option value={60}>hours</option>
          <option value={1440}>days</option>
        </select>
      </div>
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

export default async function EditTypePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const s = await requireStaff();
  const { id } = await params;
  const saved = (await searchParams).saved;
  let t: AppointmentType | null = null;
  if (id !== "new") {
    t = await prisma.appointmentType.findUnique({ where: { id: Number(id) || 0 } });
    if (!t) notFound();
  }
  const isAdmin = s.role === "ADMIN";
  const d = t ?? ({ ...WP_MORTGAGE_CONSULTATION, id: 0, title: "", slug: "", instructions: "", availabilityStart: null, availabilityEnd: null, webMeetingUrl: "", location: "", customFields: [] } as unknown as AppointmentType);
  const std = (Array.isArray(d.customerFields) ? (d.customerFields as unknown as CustomerField[]) : STANDARD_FIELDS);
  const stdMap = new Map(std.map((f) => [f.field, f]));
  const custom = Array.isArray(d.customFields) ? (d.customFields as unknown as CustomerField[]) : [];
  const num = (name: string, label: string, value: number, extra?: string) => (
    <label className="block">
      <span className={labelStyles}>{label}</span>
      <input type="number" min={0} name={name} defaultValue={value} className={cn(inputStyles, "tabular-nums")} />
      {extra && <span className={cn(hintStyles, "block")}>{extra}</span>}
    </label>
  );
  const text = (name: string, label: string, value: string, extra?: { required?: boolean; className?: string; placeholder?: string }) => (
    <label className={cn("block", extra?.className)}>
      <span className={labelStyles}>
        {label}
        {extra?.required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      <input name={name} required={extra?.required} defaultValue={value} placeholder={extra?.placeholder} className={inputStyles} />
    </label>
  );

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: "Appointments", href: "/admin/appointments" },
          { label: "Appointment types", href: "/admin/appointments/types" },
          { label: t ? t.title : "New" },
        ]}
        icon={<Layers />}
        title={t ? `Edit: ${t.title}` : "New appointment type"}
        description={t ? <code className="font-mono text-xs">/book-appointment?type={t.slug}</code> : "Defaults are copied from the WordPress “Mortgage Consultation” type."}
      />
      <SubNav active="Appointment types" />
      <div className="max-w-5xl">
        {saved && (
          <Alert tone="success" className="mb-5">
            Saved.
          </Alert>
        )}
        {!isAdmin && (
          <Alert tone="warning" className="mb-5">
            Only administrators can change appointment types.
          </Alert>
        )}
        <ActionForm action={saveAppointmentType} submitLabel={t ? "Save changes" : "Create type"} submitIcon={<Save />} className="space-y-6" sticky>
          <input type="hidden" name="id" value={t?.id ?? 0} />
          <Card title={<CardTitle icon={<Layers />}>Details</CardTitle>}>
            <div className="grid gap-4 sm:grid-cols-2">
              {text("title", "Title", d.title, { required: true })}
              {text("slug", "Slug", d.slug)}
              <label className="block sm:col-span-2">
                <span className={labelStyles}>Description</span>
                <textarea name="description" rows={2} defaultValue={d.description} className={cn(textareaStyles, "min-h-0")} />
              </label>
              <label className="block sm:col-span-2">
                <span className={labelStyles}>Instructions (shown after booking and in emails)</span>
                <textarea name="instructions" rows={3} defaultValue={d.instructions} className={textareaStyles} />
              </label>
              {text("location", "Location", d.location)}
              {text("webMeetingUrl", "Web meeting URL", d.webMeetingUrl, { placeholder: "https://" })}
              <label className="block">
                <span className={labelStyles}>Status</span>
                <select name="status" defaultValue={d.status} className={selectStyles}>
                  <option value="publish">Published</option>
                  <option value="draft">Draft (hidden)</option>
                </select>
              </label>
              {num("displayOrder", "Display order", d.displayOrder)}
            </div>
          </Card>

          <Card title={<CardTitle icon={<Clock />}>Duration, buffers &amp; booking window</CardTitle>}>
            <div className="grid gap-4 sm:grid-cols-3">
              {num("durationMin", "Duration (minutes)", d.durationMin)}
              {num("bufferBeforeMin", "Buffer before (minutes)", d.bufferBeforeMin)}
              {num("bufferAfterMin", "Buffer after (minutes)", d.bufferAfterMin)}
              <NoticeField name="minNotice" label="Minimum booking notice" minutes={d.minNoticeMin} />
              <NoticeField name="maxNotice" label="Book up to (in advance)" minutes={d.maxNoticeMin} />
              {num("capacity", "Capacity per slot", d.capacity)}
              {num("maxPerDay", "Max appointments per day", d.maxPerDay, "0 = unlimited")}
              <label className="block">
                <span className={labelStyles}>Bookable from (optional)</span>
                <input type="date" name="availabilityStart" defaultValue={d.availabilityStart ? ymdInTz(d.availabilityStart) : ""} className={inputStyles} />
              </label>
              <label className="block">
                <span className={labelStyles}>Bookable until (optional)</span>
                <input type="date" name="availabilityEnd" defaultValue={d.availabilityEnd ? ymdInTz(d.availabilityEnd) : ""} className={inputStyles} />
              </label>
            </div>
          </Card>

          <Card title={<CardTitle icon={<CalendarRange />}>Availability</CardTitle>} description="Weekly hours in the business timezone.">
            <div className="mb-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelStyles}>Availability type</span>
                <select name="availabilityType" defaultValue={d.availabilityType} className={selectStyles}>
                  <option value="available_blocks">Available blocks (start every increment within each block)</option>
                  <option value="start_times">Start times (only the block start times)</option>
                </select>
              </label>
              {num("incrementMin", "Start-time increment (minutes)", d.incrementMin)}
            </div>
            <AvailabilityEditor initial={readAvailability(d) as Record<string, { start: string; end: string }[]>} />
          </Card>

          <Card title={<CardTitle icon={<UserRound />}>Customer information</CardTitle>} description="Fields collected on the booking form.">
            <div className="mb-5 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Field</th>
                    <th className="w-24 px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Show</th>
                    <th className="w-24 px-4 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">Required</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {STANDARD_FIELDS.map((f) => {
                    const cur = stdMap.get(f.field) ?? f;
                    const locked = f.field === "Name" || f.field === "Email";
                    return (
                      <tr key={f.field}>
                        <td className="px-4 py-2.5 font-medium text-slate-800">
                          <span className="inline-flex items-center gap-1.5">
                            {f.field}
                            {locked && <Lock className="size-3 text-slate-400" aria-label="Always collected" />}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <input type="checkbox" name={`field_${f.field}_display`} value="1" defaultChecked={cur.display || locked} disabled={locked} aria-label={`Show ${f.field}`} className={checkboxStyles} />
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <input type="checkbox" name={`field_${f.field}_required`} value="1" defaultChecked={cur.required || locked} disabled={locked} aria-label={`${f.field} required`} className={checkboxStyles} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mb-2 text-[13px] font-medium text-slate-700">Custom fields</p>
            <CustomFieldsEditor initial={custom.map((c) => ({ field: c.field, required: c.required, type: c.type }))} />
          </Card>

          <Card title={<CardTitle icon={<Bell />}>Notifications</CardTitle>}>
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-1 basis-56 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-800 hover:bg-slate-50">
                <input type="checkbox" name="notifyAdmin" value="1" defaultChecked={d.notifyAdmin} className={checkboxStyles} /> Email admin
              </label>
              <label className="flex flex-1 basis-56 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-800 hover:bg-slate-50">
                <input type="checkbox" name="notifyCustomer" value="1" defaultChecked={d.notifyCustomer} className={checkboxStyles} /> Email customer
              </label>
            </div>
            <p className="mt-3 text-xs text-slate-500">Templates are edited under Appointments → Settings.</p>
          </Card>
        </ActionForm>

        {t && isAdmin && (
          <form action={deleteAppointmentType} className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50/40 px-5 py-4">
            <input type="hidden" name="id" value={t.id} />
            <div>
              <p className="text-sm font-semibold text-red-700">Delete this appointment type</p>
              <p className="text-xs text-red-600/80">Removes it from booking. Existing appointments of this type are kept.</p>
            </div>
            <Button variant="danger" size="sm">
              <Trash2 /> Delete this appointment type
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
