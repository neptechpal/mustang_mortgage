import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import BookingWidget from "@/modules/tools/appointments/BookingWidget";
import ManageActions from "@/modules/tools/appointments/ManageActions";
import { getSsaSettings } from "@/modules/tools/appointments/settings";
import { toPublicType } from "@/modules/tools/appointments/types";
import { formatWpDateTime, tzAbbr } from "@/modules/tools/tz";
import { AppBody, AppHead } from "@/modules/web/account/AppHead";
import { buildMetadata } from "@/modules/web/seo";
import "@/modules/web/styles/booking.css";

export const dynamic = "force-dynamic";
export const metadata = buildMetadata({ title: "Your appointment", description: "View, reschedule or cancel your Mustang Mortgage appointment.", path: "/book-appointment", noindex: true });

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
      <>
        <AppHead eyebrow="Your appointment" title="Choose a new time" lede={`Currently ${when}.`} />
        <AppBody>
          <BookingWidget
            types={[toPublicType(appt.appointmentType)]}
            accent={accent}
            businessTz={s.timezone}
            startOfWeek={s.startOfWeek}
            companyName={s.companyName}
            reschedule={{ token, typeSlug: appt.appointmentType.slug, currentStart: appt.startAt.toISOString() }}
          />
        </AppBody>
      </>
    );
  }

  return (
    <>
      <AppHead eyebrow="Your appointment" title={appt.appointmentType.title} lede={`${when} · ${appt.appointmentType.durationMin} minutes with ${s.companyName}`} />
      <AppBody>
        <div className="mw-bk" style={{ maxWidth: 680 }}>
          <div className="mw-bk__card">
            <div className="mw-bk__body">
              {q.rescheduled && appt.status === "booked" && <div className="mw-bk__success">Your appointment has been rescheduled. A new confirmation email is on its way.</div>}

              {appt.status === "canceled" ? (
                <div className="mw-bk__status" style={{ marginTop: 0 }}>
                  {next ? (
                    <>
                      This appointment was rescheduled.{" "}
                      <a className="mw-link" href={`/book-appointment/manage/${next.token}`}>
                        View the new appointment
                      </a>
                      .
                    </>
                  ) : (
                    <>
                      This appointment has been canceled.{" "}
                      <a className="mw-link" href={`/book-appointment?type=${appt.appointmentType.slug}`}>
                        Book a new time
                      </a>
                      .
                    </>
                  )}
                </div>
              ) : !upcoming ? (
                <p className="mw-bk__muted" style={{ margin: 0 }}>
                  This appointment has already taken place.
                </p>
              ) : (
                <>
                  <p className="mw-bk__type-title" style={{ margin: 0 }}>
                    {when}
                  </p>
                  {appt.appointmentType.instructions && <p className="mw-bk__instructions">{appt.appointmentType.instructions}</p>}
                  <ManageActions token={token} accent={accent} />
                </>
              )}
            </div>
          </div>
        </div>
      </AppBody>
    </>
  );
}
