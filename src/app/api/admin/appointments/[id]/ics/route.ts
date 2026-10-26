import { prisma } from "@/lib/db";
import { staffSessionOrNull } from "@/lib/session";
import { appointmentIcs } from "@/modules/tools/appointments/service";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await staffSessionOrNull())) return new Response("Unauthorized", { status: 401 });
  const appt = await prisma.appointment.findUnique({ where: { id: Number((await params).id) || 0 }, include: { appointmentType: true } });
  if (!appt) return new Response("Not found", { status: 404 });
  return new Response(await appointmentIcs(appt, true), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="appointment-${appt.id}.ics"` },
  });
}
