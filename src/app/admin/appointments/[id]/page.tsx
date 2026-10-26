import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowLeftRight, CalendarCheck2, CalendarClock, CalendarPlus, CalendarX2, Clock, Download, ExternalLink, Globe, MapPin, Send, Video } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { Alert, Badge, Card, PageHeader, buttonStyles, cn, textareaStyles } from "@/components/admin/ui";
import { staffCancel, staffReschedule, staffResend, staffSaveNotes } from "@/modules/tools/appointments/actions";
import ActionForm from "@/modules/tools/appointments/admin/ActionForm";
import SlotPicker from "@/modules/tools/appointments/admin/SlotPicker";
import SubNav from "@/modules/tools/appointments/admin/SubNav";
import { manageUrl } from "@/modules/tools/appointments/service";
import { getSsaSettings } from "@/modules/tools/appointments/settings";
import { formatWpDateTime, tzAbbr } from "@/modules/tools/tz";

export const dynamic = "force-dynamic";

type Ev = { at: number; icon: ReactNode; tone: string; title: ReactNode; body?: ReactNode };

export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const appt = await prisma.appointment.findUnique({ where: { id }, include: { appointmentType: true } });
  if (!appt) notFound();
  const s = await getSsaSettings();
  const tz = s.timezone;
  const info = (appt.customerInfo ?? {}) as Record<string, unknown>;
  const [from, to] = await Promise.all([
    appt.rescheduledFromId ? prisma.appointment.findUnique({ where: { id: appt.rescheduledFromId }, select: { id: true, startAt: true } }) : null,
    appt.rescheduledToId ? prisma.appointment.findUnique({ where: { id: appt.rescheduledToId }, select: { id: true, startAt: true } }) : null,
  ]);
  const upcoming = appt.status === "booked" && appt.endAt > new Date();
  const fmt = (d: Date) => `${formatWpDateTime(d, tz)} (${tzAbbr(d, tz)})`;
  const canceled = appt.status === "canceled";
  const statusLabel = canceled ? "Canceled" : upcoming ? "Booked" : "Completed";
  const statusTone = canceled ? "danger" : upcoming ? "success" : "neutral";
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-AU", { timeZone: tz, ...o }).format(appt.startAt);

  /* Timeline (chronological) */
  const events: Ev[] = [
    {
      at: appt.createdAt.getTime(),
      icon: <CalendarPlus />,
      tone: "bg-sky-50 text-sky-600 ring-sky-200",
      title: "Booked",
      body: (
        <>
          {fmt(appt.createdAt)} via {appt.source}
          {appt.userId ? ` · member #${appt.userId}` : ""}
        </>
      ),
    },
  ];
  if (from)
    events.push({
      at: appt.createdAt.getTime() + 1,
      icon: <ArrowLeftRight />,
      tone: "bg-violet-50 text-violet-600 ring-violet-200",
      title: "Rescheduled from",
      body: (
        <Link className="font-medium text-brand-700 hover:underline" href={`/admin/appointments/${from.id}`}>
          #{from.id} ({formatWpDateTime(from.startAt, tz)})
        </Link>
      ),
    });
  if (canceled)
    events.push({
      at: (appt.canceledAt ?? appt.updatedAt).getTime(),
      icon: <CalendarX2 />,
      tone: "bg-red-50 text-red-600 ring-red-200",
      title: "Canceled",
      body: (
        <>
          {appt.canceledAt ? fmt(appt.canceledAt) : ""} by {appt.canceledBy || "—"}
          {appt.cancelNote ? <span className="mt-1 block rounded-md bg-slate-50 px-2 py-1 italic text-slate-600">“{appt.cancelNote}”</span> : null}
        </>
      ),
    });
  if (to)
    events.push({
      at: (appt.canceledAt ?? appt.createdAt).getTime() + 1,
      icon: <ArrowLeftRight />,
      tone: "bg-violet-50 text-violet-600 ring-violet-200",
      title: "Rescheduled to",
      body: (
        <Link className="font-medium text-brand-700 hover:underline" href={`/admin/appointments/${to.id}`}>
          #{to.id} ({formatWpDateTime(to.startAt, tz)})
        </Link>
      ),
    });
  events.push({
    at: appt.startAt.getTime(),
    icon: canceled ? <CalendarClock /> : <CalendarCheck2 />,
    tone: canceled ? "bg-slate-50 text-slate-400 ring-slate-200" : upcoming ? "bg-brand-50 text-brand-700 ring-brand-200" : "bg-emerald-50 text-emerald-600 ring-emerald-200",
    title: canceled ? "Was scheduled" : upcoming ? "Scheduled" : "Took place",
    body: <span className={cn(canceled && "line-through")}>{fmt(appt.startAt)}</span>,
  });
  events.sort((a, b) => a.at - b.at);

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Appointments", href: "/admin/appointments" }, { label: `#${appt.id}` }]}
        icon={<CalendarClock />}
        title={
          <span className="flex flex-wrap items-center gap-3">
            Appointment #{appt.id}
            <Badge tone={statusTone} dot>
              {statusLabel}
            </Badge>
          </span>
        }
        description={`${appt.customerName || "Customer"} · ${appt.appointmentType.title}`}
        actions={
          <>
            <a className={buttonStyles({ variant: "secondary" })} href={`/api/admin/appointments/${appt.id}/ics`}>
              <Download /> Download .ics
            </a>
            <a className={buttonStyles({ variant: "secondary" })} href={manageUrl(appt.token)} target="_blank" rel="noopener">
              <ExternalLink /> Customer manage link
            </a>
          </>
        }
      />
      <SubNav active="Appointments" />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <div className="flex items-start gap-4 sm:gap-5">
              <div className={cn("flex w-16 shrink-0 sm:w-20 flex-col items-center overflow-hidden rounded-xl border text-center", canceled ? "border-slate-200" : "border-brand-200")}>
                <span className={cn("w-full py-1 text-[11px] font-semibold uppercase tracking-wider", canceled ? "bg-slate-100 text-slate-500" : "bg-brand-600 text-white")}>{part({ month: "short" })}</span>
                <span className={cn("pt-1.5 text-3xl font-semibold leading-none tabular-nums", canceled ? "text-slate-400" : "text-slate-900")}>{part({ day: "numeric" })}</span>
                <span className="pb-2 pt-1 text-[11px] font-medium text-slate-500">{part({ weekday: "short" })}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold text-slate-900">{appt.appointmentType.title}</p>
                <p className={cn("mt-0.5 text-slate-700", canceled && "line-through decoration-slate-400")}>{fmt(appt.startAt)}</p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-4 text-slate-400" />
                    {appt.appointmentType.durationMin} minutes · ends {formatWpDateTime(appt.endAt, tz)}
                  </span>
                  {appt.customerTimezone !== tz && (
                    <span className="inline-flex items-center gap-1.5">
                      <Globe className="size-4 text-slate-400" /> Customer timezone: {appt.customerTimezone}
                    </span>
                  )}
                  {appt.appointmentType.location && (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-4 text-slate-400" /> {appt.appointmentType.location}
                    </span>
                  )}
                  {appt.appointmentType.webMeetingUrl && (
                    <a href={appt.appointmentType.webMeetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-brand-700 hover:underline">
                      <Video className="size-4" /> Web meeting
                    </a>
                  )}
                </div>
              </div>
            </div>
            {canceled && (
              <Alert tone="danger" className="mt-5">
                Canceled {appt.canceledAt ? fmt(appt.canceledAt) : ""} by {appt.canceledBy || "—"}
                {appt.cancelNote ? ` — “${appt.cancelNote}”` : ""}
              </Alert>
            )}
            {(from || to) && (
              <div className="mt-4 space-y-1.5 text-sm text-slate-600">
                {from && (
                  <p className="flex items-center gap-2">
                    <ArrowLeftRight className="size-4 text-violet-500" /> Rescheduled from{" "}
                    <Link className="font-medium text-brand-700 hover:underline" href={`/admin/appointments/${from.id}`}>
                      #{from.id} ({formatWpDateTime(from.startAt, tz)})
                    </Link>
                  </p>
                )}
                {to && (
                  <p className="flex items-center gap-2">
                    <ArrowLeftRight className="size-4 text-violet-500" /> Rescheduled to{" "}
                    <Link className="font-medium text-brand-700 hover:underline" href={`/admin/appointments/${to.id}`}>
                      #{to.id} ({formatWpDateTime(to.startAt, tz)})
                    </Link>
                  </p>
                )}
              </div>
            )}
          </Card>

          <Card title="Customer details" description={`Booked ${fmt(appt.createdAt)} via ${appt.source}${appt.userId ? ` · member #${appt.userId}` : ""}`}>
            {Object.keys(info).length ? (
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {Object.entries(info).map(([k, v]) => {
                  const val = String(v);
                  return (
                    <div key={k} className={cn("min-w-0", (val.length > 60 || val.includes("\n")) && "sm:col-span-2")}>
                      <dt className="text-xs font-medium text-slate-500">{k}</dt>
                      <dd className="mt-0.5 whitespace-pre-line break-words text-sm text-slate-900">
                        {k === "Email" ? (
                          <a className="text-brand-700 hover:underline" href={`mailto:${v}`}>
                            {val}
                          </a>
                        ) : k === "Phone" ? (
                          <a className="text-brand-700 hover:underline" href={`tel:${v}`}>
                            {val}
                          </a>
                        ) : (
                          val || <span className="text-slate-400">—</span>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            ) : (
              <p className="text-sm text-slate-500">No customer information recorded.</p>
            )}
          </Card>

          <Card title="Staff notes" description="Internal — never shown to the customer.">
            <ActionForm action={staffSaveNotes} submitLabel="Save notes">
              <input type="hidden" name="id" value={appt.id} />
              <textarea name="staffNotes" rows={4} defaultValue={appt.staffNotes} aria-label="Staff notes" placeholder="Add a note for the team…" className={textareaStyles} />
            </ActionForm>
          </Card>

          {upcoming && (
            <Card title="Reschedule" description="Pick a new date and time; availability is checked against this appointment type.">
              <ActionForm action={staffReschedule} submitLabel="Move appointment" submitIcon={<ArrowLeftRight />}>
                <input type="hidden" name="id" value={appt.id} />
                <SlotPicker typeSlug={appt.appointmentType.slug} token={appt.token} />
                <p className="mt-3 text-xs text-slate-500">The customer receives a new confirmation email with an updated calendar invite.</p>
              </ActionForm>
            </Card>
          )}
        </div>

        <aside className="min-w-0 space-y-6">
          <Card title="Notify customer">
            <p className="mb-1 text-sm text-slate-500">
              {appt.status === "booked" ? "Send the booking confirmation email again, with the calendar invite." : "Send the cancellation email again."}
            </p>
            <ActionForm action={staffResend} submitLabel={appt.status === "booked" ? "Resend confirmation" : "Resend cancellation"} okMessage="Sent." submitIcon={<Send />} secondary block>
              <input type="hidden" name="id" value={appt.id} />
            </ActionForm>
          </Card>

          <Card title="Timeline">
            <ol className="relative space-y-5">
              {events.map((e, i) => (
                <li key={i} className="relative flex gap-3">
                  {i < events.length - 1 && <span aria-hidden className="absolute left-[15px] top-8 -bottom-5 w-px bg-slate-200" />}
                  <span className={cn("relative flex size-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset [&_svg]:size-4", e.tone)}>{e.icon}</span>
                  <div className="min-w-0 pt-1 text-sm">
                    <p className="font-medium text-slate-900">{e.title}</p>
                    {e.body && <div className="mt-0.5 text-xs leading-relaxed text-slate-500">{e.body}</div>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          {appt.status === "booked" && (
            <section className="rounded-xl border border-red-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <header className="border-b border-red-100 bg-red-50/50 px-5 py-3.5">
                <h2 className="text-[15px] font-semibold text-red-700">Cancel appointment</h2>
                <p className="mt-0.5 text-xs text-red-600/80">The customer is notified by email.</p>
              </header>
              <div className="p-5">
                <ActionForm action={staffCancel} submitLabel="Cancel appointment" danger confirm="Cancel this appointment and notify the customer?" okMessage="Canceled." submitIcon={<CalendarX2 />} block>
                  <input type="hidden" name="id" value={appt.id} />
                  <textarea name="note" rows={2} placeholder="Note to customer (optional)" aria-label="Note to customer" className={cn(textareaStyles, "min-h-[72px]")} />
                </ActionForm>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
