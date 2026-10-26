import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { BookingError, bookAppointment, validateFields } from "@/modules/tools/appointments/service";
import { publishedTypes, toPublicType } from "@/modules/tools/appointments/types";

export const dynamic = "force-dynamic";

/** Public list of bookable appointment types. */
export async function GET() {
  const types = await publishedTypes();
  return NextResponse.json({ types: types.map(toPublicType) });
}

/** Book an appointment: { type, start (ISO), fields: {Name, Email, ...}, timezone, website (honeypot) } */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (typeof body.website === "string" && body.website.trim()) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  await publishedTypes();
  const type = await prisma.appointmentType.findFirst({ where: { slug: String(body.type ?? ""), status: "publish" } });
  if (!type) return NextResponse.json({ error: "Unknown appointment type" }, { status: 404 });

  try {
    const fields = validateFields(type, (body.fields ?? {}) as Record<string, unknown>);
    const session = await getSession();
    const appt = await bookAppointment({
      type,
      start: new Date(String(body.start ?? "")),
      fields,
      timezone: typeof body.timezone === "string" ? body.timezone : undefined,
      userId: session?.uid ?? null,
      source: "web",
    });
    return NextResponse.json({ ok: true, token: appt.token, id: appt.id, start: appt.startAt, end: appt.endAt });
  } catch (e) {
    if (e instanceof BookingError) return NextResponse.json({ error: e.message, fieldErrors: e.fieldErrors }, { status: e.status });
    console.error("[appointments] booking failed", e);
    return NextResponse.json({ error: "Could not book the appointment. Please try again." }, { status: 500 });
  }
}
