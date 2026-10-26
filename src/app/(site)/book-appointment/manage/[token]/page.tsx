import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import BookingWidget from "@/modules/tools/appointments/BookingWidget";
import ManageActions from "@/modules/tools/appointments/ManageActions";
import { getSsaSettings } from "@/modules/tools/appointments/settings";
import { toPublicType } from "@/modules/tools/appointments/types";
import { formatWpDateTime, tzAbbr } from "@/modules/tools/tz";
import PageShell from "@/modules/tools/PageShell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your Appointment", robots: { index: false } };

export default async function ManageAppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ reschedule?: string; rescheduled?: string }>;
}) {
  const [{ token }, q, s] = await Promise.all([params, searchParams, getSsaSettings()]);
  if (token.length < 20) notFound();
  const appt = await prisma.appointment.findUnique({ where: { token }, include: { appointmentType: true } });
  if (!appt) notFound();

  const next = appt.rescheduledToId
    ? await prisma.appointment.findUnique({ where: { id: appt.rescheduledToId }, select: { token: true } })
    : null;
  const tz = appt.customerTimezone || s.timezone;
  const when = `${formatWpDateTime(appt.startAt, tz)} (${tzAbbr(appt.startAt, tz)})`;
  const upcoming = appt.status === "booked" && appt.startAt.getTime() > Date.now();
  const accent = s.accentColor;

  if (q.reschedule && upcoming) {
    return (
      <PageShell>
        <BookingWidget
          types={[toPublicType(appt.appointmentType)]}
          accent={accent}
          businessTz={s.timezone}
          startOfWeek={s.startOfWeek}
          companyName={s.companyName}
          reschedule={{ token, typeSlug: appt.appointmentType.slug, currentStart: appt.startAt.toISOString() }}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto max-w-[640px] rounded-md bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,.12),0_1px_2px_rgba(0,0,0,.24)]" style={{ fontFamily: "Roboto, Arial, sans-serif" }}>
        {q.rescheduled && appt.status === "booked" && (
          <div className="mb-4 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            Your appointment has been rescheduled. A new confirmation email is on its way.
          </div>
        )}
        <h1 className="text-2xl font-medium text-[#303030]">{appt.appointmentType.title}</h1>
        <p className="mt-1 text-black/70">{when}</p>
        <p className="text-sm text-black/50">{appt.appointmentType.durationMin} minutes · with {s.companyName}</p>

        {appt.status === "canceled" ? (
          <div className="mt-5 rounded border border-black/10 bg-black/[.03] px-4 py-3 text-sm">
            {next ? (
              <>
                This appointment was rescheduled.{" "}
                <a className="font-medium underline" style={{ color: accent }} href={`/book-appointment/manage/${next.token}`}>
                  View the new appointment
                </a>
                .
              </>
            ) : (
              <>
                This appointment has been canceled.{" "}
                <a className="font-medium underline" style={{ color: accent }} href={`/book-appointment?type=${appt.appointmentType.slug}`}>
                  Book a new time
                </a>
                .
              </>
            )}
          </div>
        ) : !upcoming ? (
          <p className="mt-5 text-sm text-black/60">This appointment has already taken place.</p>
        ) : (
          <>
            {appt.appointmentType.instructions && <p className="mt-4 whitespace-pre-line text-sm text-black/70">{appt.appointmentType.instructions}</p>}
            <ManageActions token={token} accent={accent} />
          </>
        )}
      </div>
    </PageShell>
  );
}
