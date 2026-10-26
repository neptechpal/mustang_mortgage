import type { AppointmentType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addDaysYmd, BUSINESS_TZ, weekdayOf, ymdInTz, zonedToUtc } from "../tz";
import { readAvailability } from "./types";
import { getSsaSettings } from "./settings";

const MIN = 60_000;

export type SlotOptions = {
  excludeAppointmentId?: number; // when rescheduling, ignore the appointment being moved
  now?: Date;
  ignoreNotice?: boolean; // staff booking on behalf of a client
};

type Busy = { start: number; end: number; typeId: number; day: string };

/**
 * Available start times per business-timezone day, honouring:
 * weekly availability blocks (available_blocks / start_times), increment, duration,
 * buffers (own + existing appointments'), capacity, max per day, min/max booking notice,
 * availability window and blackout dates. Availability is shared across appointment types
 * (SSA "separate_appointment_type_availability" = false).
 */
export async function computeSlots(
  type: AppointmentType,
  fromYmd: string,
  toYmd: string,
  opts: SlotOptions = {},
): Promise<Record<string, string[]>> {
  const settings = await getSsaSettings();
  const tz = settings.timezone || BUSINESS_TZ;
  const now = (opts.now ?? new Date()).getTime();
  const minStart = opts.ignoreNotice ? now : now + type.minNoticeMin * MIN;
  const maxStart = now + type.maxNoticeMin * MIN;

  const windowStart = zonedToUtc(addDaysYmd(fromYmd, -1), "00:00", tz);
  const windowEnd = zonedToUtc(addDaysYmd(toYmd, 2), "00:00", tz);

  const [appts, blackouts] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        status: "booked",
        startAt: { lt: new Date(windowEnd.getTime() + 24 * 60 * MIN) },
        endAt: { gt: new Date(windowStart.getTime() - 24 * 60 * MIN) },
        ...(opts.excludeAppointmentId ? { id: { not: opts.excludeAppointmentId } } : {}),
      },
      include: { appointmentType: { select: { bufferBeforeMin: true, bufferAfterMin: true } } },
    }),
    settings.blackoutEnabled
      ? prisma.appointmentBlackout.findMany({ where: { endDate: { gte: fromYmd }, startDate: { lte: toYmd } } })
      : Promise.resolve([]),
  ]);

  const busy: Busy[] = appts.map((a) => ({
    start: a.startAt.getTime() - a.appointmentType.bufferBeforeMin * MIN,
    end: a.endAt.getTime() + a.appointmentType.bufferAfterMin * MIN,
    typeId: a.appointmentTypeId,
    day: ymdInTz(a.startAt, tz),
  }));

  const avail = readAvailability(type);
  const dur = type.durationMin * MIN;
  const inc = Math.max(5, type.incrementMin || type.durationMin) * MIN;
  const out: Record<string, string[]> = {};

  for (let day = fromYmd; day <= toYmd; day = addDaysYmd(day, 1)) {
    out[day] = [];
    if (blackouts.some((b) => b.startDate <= day && b.endDate >= day)) continue;
    if (type.maxPerDay > 0 && busy.filter((b) => b.typeId === type.id && b.day === day).length >= type.maxPerDay) continue;

    const blocks = avail[weekdayOf(day)] ?? [];
    const starts: number[] = [];
    for (const b of blocks) {
      const bs = zonedToUtc(day, b.start, tz).getTime();
      if (type.availabilityType === "start_times") {
        starts.push(bs);
        continue;
      }
      const be = b.end === "24:00" || b.end === "" ? zonedToUtc(addDaysYmd(day, 1), "00:00", tz).getTime() : zonedToUtc(day, b.end, tz).getTime();
      for (let t = bs; t + dur <= be; t += inc) starts.push(t);
    }

    const seen = new Set<number>();
    for (const s of starts.sort((a, b) => a - b)) {
      if (seen.has(s)) continue;
      seen.add(s);
      if (s < minStart || s > maxStart) continue;
      if (type.availabilityStart && s < type.availabilityStart.getTime()) continue;
      if (type.availabilityEnd && s + dur > type.availabilityEnd.getTime()) continue;
      const ws = s - type.bufferBeforeMin * MIN;
      const we = s + dur + type.bufferAfterMin * MIN;
      const overlapping = busy.filter((b) => b.start < we && b.end > ws).length;
      if (overlapping >= Math.max(1, type.capacity)) continue;
      out[day].push(new Date(s).toISOString());
    }
  }
  return out;
}

/** True when `start` is currently a bookable slot for `type`. */
export async function isSlotAvailable(type: AppointmentType, start: Date, opts: SlotOptions = {}) {
  const settings = await getSsaSettings();
  const day = ymdInTz(start, settings.timezone || BUSINESS_TZ);
  const slots = await computeSlots(type, day, day, opts);
  return (slots[day] ?? []).includes(start.toISOString());
}
