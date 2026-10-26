import Link from "next/link";
import { CalendarClock, ChevronRight, Clock, Info, Layers, Link2, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { Badge, EmptyState, LinkButton, PageHeader } from "@/components/admin/ui";
import SubNav from "@/modules/tools/appointments/admin/SubNav";
import { ensureDefaultTypes } from "@/modules/tools/appointments/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Appointment types" };

export default async function AppointmentTypesPage() {
  const s = await requireStaff();
  await ensureDefaultTypes();
  const types = await prisma.appointmentType.findMany({
    where: { status: { not: "delete" } },
    orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    include: { _count: { select: { appointments: { where: { status: "booked", endAt: { gte: new Date() } } } } } },
  });
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Appointments", href: "/admin/appointments" }, { label: "Appointment types" }]}
        icon={<Layers />}
        title="Appointment types"
        description="What customers can book, how long it takes and when it is available."
        actions={
          s.role === "ADMIN" ? (
            <LinkButton href="/admin/appointments/types/new" variant="primary">
              <Plus /> Add type
            </LinkButton>
          ) : undefined
        }
      />
      <SubNav active="Appointment types" />
      {types.length === 0 ? (
        <EmptyState icon={<Layers />} title="No appointment types" description="Create a type to start taking bookings." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {types.map((t) => (
            <Link
              key={t.id}
              href={`/admin/appointments/types/${t.id}`}
              className="group relative flex items-start gap-4 overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-brand-300 hover:shadow-md"
            >
              <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-brand-500" />
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100">
                <CalendarClock className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-slate-900 group-hover:text-brand-800">{t.title}</span>
                  {t.status === "draft" && <Badge>Draft</Badge>}
                  <span className="sm:hidden">
                    <Badge tone={t._count.appointments ? "success" : "neutral"}>{t._count.appointments} upcoming</Badge>
                  </span>
                </span>
                <span className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5 text-slate-400" /> {t.durationMin} min
                  </span>
                  <span className="inline-flex min-w-0 items-center gap-1.5">
                    <Link2 className="size-3.5 shrink-0 text-slate-400" />
                    <code className="break-all font-mono text-xs text-slate-600">/book-appointment?type={t.slug}</code>
                  </span>
                </span>
              </span>
              <span className="hidden shrink-0 items-center gap-2 self-center sm:flex">
                <Badge tone={t._count.appointments ? "success" : "neutral"}>{t._count.appointments} upcoming</Badge>
                <ChevronRight className="size-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
              </span>
            </Link>
          ))}
        </div>
      )}
      <p className="mt-5 flex items-start gap-2 text-xs text-slate-500">
        <Info className="mt-px size-3.5 shrink-0" />
        <span>
          The public page /book-appointment pre-selects “mortgage-consultation” (WP shortcode [ssa_booking type=mortgage-consultation]).
        </span>
      </p>
    </div>
  );
}
