import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeSlots } from "@/modules/tools/appointments/slots";
import { publishedTypes } from "@/modules/tools/appointments/types";
import { addDaysYmd, isYmd } from "@/modules/tools/tz";

export const dynamic = "force-dynamic";

/** GET ?type=slug&from=YYYY-MM-DD&to=YYYY-MM-DD[&token=<appointment being rescheduled>] */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const from = q.get("from");
  let to = q.get("to");
  if (!isYmd(from)) return NextResponse.json({ error: "from required" }, { status: 400 });
  if (!isYmd(to) || to < from) to = addDaysYmd(from, 6);
  if (to > addDaysYmd(from, 62)) to = addDaysYmd(from, 62);

  await publishedTypes();
  const type = await prisma.appointmentType.findFirst({ where: { slug: q.get("type") ?? "", status: "publish" } });
  if (!type) return NextResponse.json({ error: "Unknown appointment type" }, { status: 404 });

  let excludeAppointmentId: number | undefined;
  const token = q.get("token");
  if (token) {
    const a = await prisma.appointment.findUnique({ where: { token }, select: { id: true, status: true } });
    if (a?.status === "booked") excludeAppointmentId = a.id;
  }
  const slots = await computeSlots(type, from, to, { excludeAppointmentId });
  return NextResponse.json({ slots }, { headers: { "Cache-Control": "no-store" } });
}
