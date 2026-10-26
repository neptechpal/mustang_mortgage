import type { AppointmentType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { WEEKDAYS, type Weekday } from "../tz";

export type TimeBlock = { start: string; end: string }; // "HH:MM"
export type WeeklyAvailability = Partial<Record<Weekday, TimeBlock[]>>;
export type CustomerField = { field: string; display: boolean; required: boolean; icon?: string; type?: string };

// Built-in SSA booking fields (order as in SSA).
export const STANDARD_FIELDS: CustomerField[] = [
  { field: "Name", display: true, required: true, icon: "face" },
  { field: "Email", display: true, required: true, icon: "email" },
  { field: "Phone", display: true, required: true, icon: "phone" },
  { field: "Address", display: false, required: false, icon: "place" },
  { field: "City", display: false, required: false, icon: "place" },
  { field: "State", display: true, required: true, icon: "place" },
  { field: "Zip", display: false, required: false, icon: "place" },
  { field: "Notes", display: true, required: false, icon: "assignment" },
];

const BLOCKS: TimeBlock[] = [
  { start: "08:00", end: "11:00" },
  { start: "13:00", end: "14:00" },
  { start: "15:30", end: "19:00" },
];

// Exact copy of DHi_ssa_appointment_types id=1 on the live site.
export const WP_MORTGAGE_CONSULTATION = {
  wpId: 1,
  slug: "mortgage-consultation",
  title: "Mortgage Consultation",
  description: "",
  instructions: "Thank you for your interest in Mustang Mortgage. We look forward to assisting you with your home loan journey. ",
  durationMin: 60,
  bufferBeforeMin: 0,
  bufferAfterMin: 0,
  minNoticeMin: 1440,
  maxNoticeMin: 525600,
  incrementMin: 30,
  capacity: 1,
  maxPerDay: 0,
  availabilityType: "available_blocks",
  availability: Object.fromEntries(WEEKDAYS.map((d) => [d, BLOCKS])) as WeeklyAvailability,
  customerFields: STANDARD_FIELDS,
  notifyAdmin: true,
  notifyCustomer: true,
  status: "publish",
  displayOrder: 1,
};

/** Seeds the live site's appointment type when the table is empty. */
export async function ensureDefaultTypes() {
  const n = await prisma.appointmentType.count();
  if (n > 0) return;
  await prisma.appointmentType
    .create({
      data: {
        ...WP_MORTGAGE_CONSULTATION,
        availability: WP_MORTGAGE_CONSULTATION.availability as Prisma.InputJsonValue,
        customerFields: WP_MORTGAGE_CONSULTATION.customerFields as unknown as Prisma.InputJsonValue,
      },
    })
    .catch(() => undefined); // concurrent seed
}

export function readAvailability(t: Pick<AppointmentType, "availability">): WeeklyAvailability {
  const raw = (t.availability ?? {}) as Record<string, unknown>;
  const out: WeeklyAvailability = {};
  for (const d of WEEKDAYS) {
    const arr = Array.isArray(raw[d]) ? (raw[d] as Record<string, string>[]) : [];
    out[d] = arr
      .map((b) => ({ start: String(b.start ?? b.time_start ?? "").slice(0, 5), end: String(b.end ?? b.time_end ?? "").slice(0, 5) }))
      .filter((b) => /^\d{2}:\d{2}$/.test(b.start) && (/^\d{2}:\d{2}$/.test(b.end) || b.end === ""));
  }
  return out;
}

export function readFields(t: Pick<AppointmentType, "customerFields" | "customFields">): CustomerField[] {
  const std = Array.isArray(t.customerFields) ? (t.customerFields as unknown as CustomerField[]) : STANDARD_FIELDS;
  const custom = Array.isArray(t.customFields) ? (t.customFields as unknown as CustomerField[]) : [];
  return [...std, ...custom].filter((f) => f && f.field && f.display);
}

export type PublicType = {
  id: number;
  slug: string;
  title: string;
  description: string;
  instructions: string;
  durationMin: number;
  fields: CustomerField[];
};

export function toPublicType(t: AppointmentType): PublicType {
  return {
    id: t.id,
    slug: t.slug,
    title: t.title,
    description: t.description,
    instructions: t.instructions,
    durationMin: t.durationMin,
    fields: readFields(t),
  };
}

export async function publishedTypes() {
  await ensureDefaultTypes();
  return prisma.appointmentType.findMany({ where: { status: "publish" }, orderBy: [{ displayOrder: "asc" }, { id: "asc" }] });
}

export const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];
