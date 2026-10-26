import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffSessionOrNull } from "@/lib/session";
import { getSsaSettings } from "@/modules/tools/appointments/settings";
import { computeSlots } from "@/modules/tools/appointments/slots";
import { hmInTz, isYmd } from "@/modules/tools/tz";

export const dynamic = "force-dynamic";

/** Staff slot lookup for one business day (min notice ignored). ?type=slug&from=YYYY-MM-DD[&token=] */
export async function GET(req: Request) {
  if (!(await staffSessionOrNull())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams;
  const day = q.get("from");
  if (!isYmd(day)) return NextResponse.json({ error: "from required" }, { status: 400 });
  const type = await prisma.appointmentType.findUnique({ where: { slug: q.get("type") ?? "" } });
  if (!type) return NextResponse.json({ error: "Unknown type" }, { status: 404 });
  const token = q.get("token");
  const exclude = token ? await prisma.appointment.findUnique({ where: { token }, select: { id: true } }) : null;
  const s = await getSsaSettings();
  const slots = await computeSlots(type, day, day, { ignoreNotice: true, excludeAppointmentId: exclude?.id });
  return NextResponse.json({ times: (slots[day] ?? []).map((iso) => hmInTz(new Date(iso), s.timezone)) });
}
