import { CalendarPlus, Info } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { Card, PageHeader, SectionTitle, checkboxStyles, cn, inputStyles, labelStyles, textareaStyles } from "@/components/admin/ui";
import { staffBook } from "@/modules/tools/appointments/actions";
import ActionForm from "@/modules/tools/appointments/admin/ActionForm";
import SlotPicker from "@/modules/tools/appointments/admin/SlotPicker";
import SubNav from "@/modules/tools/appointments/admin/SubNav";
import { ensureDefaultTypes, readFields } from "@/modules/tools/appointments/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Book appointment" };

export default async function NewAppointmentPage() {
  await requireStaff();
  await ensureDefaultTypes();
  const types = await prisma.appointmentType.findMany({ where: { status: { not: "delete" } }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] });
  const fields = Array.from(new Map(types.flatMap((t) => readFields(t)).map((f) => [f.field, f])).values());

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Appointments", href: "/admin/appointments" }, { label: "Book appointment" }]}
        icon={<CalendarPlus />}
        title="Book appointment"
        description="Book on behalf of a customer — e.g. after a phone call."
      />
      <SubNav active="Book appointment" />
      <Card className="max-w-4xl">
        <ActionForm action={staffBook} submitLabel="Book appointment" submitIcon={<CalendarPlus />}>
          <SectionTitle>When</SectionTitle>
          <SlotPicker typeIdField types={types.map((t) => ({ id: t.id, slug: t.slug, title: t.title }))} />
          <label className="mt-4 inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="ignoreNotice" value="1" defaultChecked className={checkboxStyles} /> Ignore minimum booking notice
          </label>

          <div className="mt-6 border-t border-slate-100 pt-6">
            <SectionTitle>Customer</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((f) => (
                <label key={f.field} className={cn("block", f.field === "Notes" && "sm:col-span-2")}>
                  <span className={labelStyles}>
                    {f.field}
                    {f.required ? <span className="ml-0.5 text-red-500"> *</span> : ""}
                  </span>
                  {f.field === "Notes" || f.type === "textarea" ? (
                    <textarea name={`f_${f.field}`} rows={3} className={textareaStyles} />
                  ) : (
                    <input name={`f_${f.field}`} type={f.field === "Email" ? "email" : "text"} className={inputStyles} />
                  )}
                </label>
              ))}
            </div>
          </div>
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
            <Info className="mt-px size-4 shrink-0 text-slate-400" />
            The customer and admin notifications are sent exactly as for an online booking.
          </p>
        </ActionForm>
      </Card>
    </div>
  );
}
