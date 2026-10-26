import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { staffSessionOrNull } from "@/lib/session";
import { getSsaSettings } from "@/modules/tools/appointments/settings";
import { formatWpDateTime } from "@/modules/tools/tz";

export const dynamic = "force-dynamic";

const csvCell = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) ? "'" : "") + s.replace(/"/g, '""')}"` : s;
};

/** GET ?status=booked|canceled|all&from=ISO&to=ISO&q=&format=json|csv */
export async function GET(req: Request) {
  if (!(await staffSessionOrNull())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const p = new URL(req.url).searchParams;
  const where: Prisma.AppointmentWhereInput = {};
  const status = p.get("status") ?? "all";
  if (status !== "all") where.status = status;
  const from = p.get("from");
  const to = p.get("to");
  if (from || to) where.startAt = { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lt: new Date(to) } : {}) };
  const q = p.get("q")?.trim();
  if (q) where.OR = [{ customerName: { contains: q, mode: "insensitive" } }, { customerEmail: { contains: q, mode: "insensitive" } }, { customerPhone: { contains: q } }];

  const rows = await prisma.appointment.findMany({ where, include: { appointmentType: { select: { title: true, slug: true } } }, orderBy: { startAt: "asc" }, take: 5000 });

  if (p.get("format") === "csv") {
    const s = await getSsaSettings();
    const fieldKeys = Array.from(new Set(rows.flatMap((r) => Object.keys((r.customerInfo ?? {}) as object))));
    const header = ["ID", "Type", "Status", "Start", "End", ...fieldKeys, "Booked at", "Staff notes"];
    const lines = rows.map((r) => {
      const info = (r.customerInfo ?? {}) as Record<string, unknown>;
      return [r.id, r.appointmentType.title, r.status, formatWpDateTime(r.startAt, s.timezone), formatWpDateTime(r.endAt, s.timezone), ...fieldKeys.map((k) => info[k]), formatWpDateTime(r.createdAt, s.timezone), r.staffNotes]
        .map(csvCell)
        .join(",");
    });
    return new Response([header.map(csvCell).join(","), ...lines].join("\r\n"), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="appointments.csv"` },
    });
  }
  return NextResponse.json({
    appointments: rows.map((r) => ({
      id: r.id,
      type: r.appointmentType,
      status: r.status,
      start: r.startAt,
      end: r.endAt,
      customerName: r.customerName,
      customerEmail: r.customerEmail,
      customerPhone: r.customerPhone,
      customerInfo: r.customerInfo,
    })),
  });
}
