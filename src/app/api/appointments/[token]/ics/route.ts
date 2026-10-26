import { prisma } from "@/lib/db";
import { appointmentIcs } from "@/modules/tools/appointments/service";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const appt = token.length >= 20 ? await prisma.appointment.findUnique({ where: { token }, include: { appointmentType: true } }) : null;
  if (!appt) return new Response("Not found", { status: 404 });
  return new Response(await appointmentIcs(appt), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="appointment-${appt.id}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
