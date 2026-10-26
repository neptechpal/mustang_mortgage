import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { BookingError, bookAppointment, cancelAppointment } from "@/modules/tools/appointments/service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

async function load(token: string) {
  if (!token || token.length < 20) return null;
  return prisma.appointment.findUnique({ where: { token }, include: { appointmentType: true } });
}

export async function GET(_req: Request, { params }: Ctx) {
  const appt = await load((await params).token);
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    status: appt.status,
    start: appt.startAt,
    end: appt.endAt,
    type: { slug: appt.appointmentType.slug, title: appt.appointmentType.title },
    customerName: appt.customerName,
    rescheduledToId: appt.rescheduledToId,
  });
}

/** { action: "cancel", note? } | { action: "reschedule", start, timezone? } */
export async function POST(req: Request, { params }: Ctx) {
  const appt = await load((await params).token);
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    if (body.action === "cancel") {
      await cancelAppointment(appt, { note: typeof body.note === "string" ? body.note : "", byName: appt.customerName || "Customer" });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "reschedule") {
      if (appt.status !== "booked") throw new BookingError("This appointment has been canceled.", 409);
      if (appt.startAt.getTime() < Date.now()) throw new BookingError("This appointment has already taken place.", 409);
      const next = await bookAppointment({
        type: appt.appointmentType,
        start: new Date(String(body.start ?? "")),
        fields: (appt.customerInfo ?? {}) as Record<string, string>,
        timezone: typeof body.timezone === "string" ? body.timezone : appt.customerTimezone,
        reschedule: appt,
        source: appt.source,
        actorName: appt.customerName || "customer",
      });
      return NextResponse.json({ ok: true, token: next.token });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[appointments] update failed", e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
