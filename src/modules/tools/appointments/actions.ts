"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin, requireStaff } from "@/lib/session";
import { isValidTz, isYmd, WEEKDAYS, zonedToUtc } from "../tz";
import { BookingError, bookAppointment, cancelAppointment, notify, validateFields } from "./service";
import { getSsaSettings, saveSsaSettings, type SsaNotification } from "./settings";
import { STANDARD_FIELDS, type CustomerField, type TimeBlock } from "./types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const int = (fd: FormData, k: string, d = 0) => {
  const n = parseInt(str(fd, k), 10);
  return Number.isFinite(n) ? n : d;
};

export type ActionState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string> } | undefined;

/* --------------------------- appointments --------------------------- */

export async function staffCancel(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await requireStaff();
  const appt = await prisma.appointment.findUnique({ where: { id: int(fd, "id") }, include: { appointmentType: true } });
  if (!appt) return { error: "Appointment not found" };
  try {
    await cancelAppointment(appt, { note: str(fd, "note"), byName: s.name, byStaff: true });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not cancel" };
  }
  revalidatePath(`/admin/appointments/${appt.id}`);
  return { ok: true };
}

export async function staffReschedule(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await requireStaff();
  const appt = await prisma.appointment.findUnique({ where: { id: int(fd, "id") }, include: { appointmentType: true } });
  if (!appt) return { error: "Appointment not found" };
  if (appt.status !== "booked") return { error: "Only booked appointments can be rescheduled" };
  const settings = await getSsaSettings();
  const date = str(fd, "date");
  const time = str(fd, "time");
  if (!isYmd(date) || !/^\d{2}:\d{2}$/.test(time)) return { error: "Choose a date and time" };
  let nextId = 0;
  try {
    const next = await bookAppointment({
      type: appt.appointmentType,
      start: zonedToUtc(date, time, settings.timezone),
      fields: (appt.customerInfo ?? {}) as Record<string, string>,
      timezone: appt.customerTimezone,
      reschedule: appt,
      source: appt.source,
      ignoreNotice: true,
      actorName: s.name,
    });
    nextId = next.id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not reschedule" };
  }
  redirect(`/admin/appointments/${nextId}`);
}

export async function staffSaveNotes(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff();
  const id = int(fd, "id");
  await prisma.appointment.update({ where: { id }, data: { staffNotes: str(fd, "staffNotes").slice(0, 10000) } });
  revalidatePath(`/admin/appointments/${id}`);
  return { ok: true };
}

export async function staffResend(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff();
  const appt = await prisma.appointment.findUnique({ where: { id: int(fd, "id") }, include: { appointmentType: true } });
  if (!appt) return { error: "Appointment not found" };
  await notify(appt, appt.status === "booked" ? "appointment_booked" : "appointment_canceled");
  return { ok: true };
}

export async function staffBook(_: ActionState, fd: FormData): Promise<ActionState> {
  const s = await requireStaff();
  const type = await prisma.appointmentType.findUnique({ where: { id: int(fd, "typeId") } });
  if (!type) return { error: "Choose an appointment type" };
  const settings = await getSsaSettings();
  const date = str(fd, "date");
  const time = str(fd, "time");
  if (!isYmd(date) || !/^\d{2}:\d{2}$/.test(time)) return { error: "Choose a date and time" };
  const raw: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (k.startsWith("f_")) raw[k.slice(2)] = String(v);
  let id = 0;
  try {
    const fields = validateFields(type, raw);
    const appt = await bookAppointment({
      type,
      start: zonedToUtc(date, time, settings.timezone),
      fields,
      timezone: settings.timezone,
      source: "admin",
      ignoreNotice: fd.get("ignoreNotice") === "1",
      actorName: s.name,
    });
    id = appt.id;
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message, fieldErrors: e.fieldErrors };
    return { error: e instanceof Error ? e.message : "Could not book" };
  }
  redirect(`/admin/appointments/${id}`);
}

/* ------------------------------ types ------------------------------ */

function parseAvailability(fd: FormData) {
  const out: Record<string, TimeBlock[]> = {};
  for (const d of WEEKDAYS) {
    const starts = fd.getAll(`av_${d}_start`).map(String);
    const ends = fd.getAll(`av_${d}_end`).map(String);
    out[d] = starts
      .map((st, i) => ({ start: st.slice(0, 5), end: String(ends[i] ?? "").slice(0, 5) }))
      .filter((b) => /^\d{2}:\d{2}$/.test(b.start) && (/^\d{2}:\d{2}$/.test(b.end) ? b.end > b.start : false))
      .sort((a, b) => a.start.localeCompare(b.start));
  }
  return out;
}

export async function saveAppointmentType(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = int(fd, "id");
  const title = str(fd, "title");
  const slug = (str(fd, "slug") || title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (!title || !slug) return { error: "Title is required" };
  const dupe = await prisma.appointmentType.findFirst({ where: { slug, NOT: id ? { id } : undefined } });
  if (dupe) return { error: `Slug "${slug}" is already used` };

  const fields: CustomerField[] = STANDARD_FIELDS.map((f) => ({
    ...f,
    display: fd.get(`field_${f.field}_display`) === "1" || f.field === "Name" || f.field === "Email",
    required: fd.get(`field_${f.field}_required`) === "1" || f.field === "Name" || f.field === "Email",
  }));
  const custom: CustomerField[] = fd
    .getAll("custom_field")
    .map(String)
    .map((label, i) => ({
      field: label.trim(),
      display: true,
      required: fd.getAll("custom_required").map(String).includes(String(i)),
      icon: "assignment",
      type: String(fd.getAll("custom_type")[i] ?? "text"),
    }))
    .filter((f) => f.field && !STANDARD_FIELDS.some((s) => s.field === f.field));

  const optDate = (k: string) => (isYmd(str(fd, k)) ? zonedToUtc(str(fd, k), "00:00") : null);
  const data = {
    title,
    slug,
    description: str(fd, "description"),
    instructions: str(fd, "instructions"),
    durationMin: Math.max(5, int(fd, "durationMin", 60)),
    bufferBeforeMin: Math.max(0, int(fd, "bufferBeforeMin")),
    bufferAfterMin: Math.max(0, int(fd, "bufferAfterMin")),
    minNoticeMin: Math.max(0, int(fd, "minNoticeValue") * int(fd, "minNoticeUnit", 60)),
    maxNoticeMin: Math.max(60, int(fd, "maxNoticeValue", 365) * int(fd, "maxNoticeUnit", 1440)),
    incrementMin: Math.max(5, int(fd, "incrementMin", 30)),
    capacity: Math.max(1, int(fd, "capacity", 1)),
    maxPerDay: Math.max(0, int(fd, "maxPerDay")),
    availabilityType: str(fd, "availabilityType") === "start_times" ? "start_times" : "available_blocks",
    availability: parseAvailability(fd) as Prisma.InputJsonValue,
    availabilityStart: optDate("availabilityStart"),
    availabilityEnd: optDate("availabilityEnd"),
    customerFields: fields as unknown as Prisma.InputJsonValue,
    customFields: custom as unknown as Prisma.InputJsonValue,
    notifyAdmin: fd.get("notifyAdmin") === "1",
    notifyCustomer: fd.get("notifyCustomer") === "1",
    webMeetingUrl: str(fd, "webMeetingUrl"),
    location: str(fd, "location"),
    status: ["publish", "draft"].includes(str(fd, "status")) ? str(fd, "status") : "publish",
    displayOrder: int(fd, "displayOrder"),
  };
  const saved = id ? await prisma.appointmentType.update({ where: { id }, data }) : await prisma.appointmentType.create({ data });
  revalidatePath("/admin/appointments/types");
  if (!id) redirect(`/admin/appointments/types/${saved.id}?saved=1`);
  return { ok: true };
}

export async function deleteAppointmentType(fd: FormData) {
  await requireAdmin();
  const id = int(fd, "id");
  const used = await prisma.appointment.count({ where: { appointmentTypeId: id } });
  if (used) await prisma.appointmentType.update({ where: { id }, data: { status: "delete" } });
  else await prisma.appointmentType.delete({ where: { id } });
  redirect("/admin/appointments/types");
}

/* ----------------------------- settings ----------------------------- */

export async function saveBookingSettings(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const cur = await getSsaSettings();
  const tz = str(fd, "timezone");
  if (!isValidTz(tz)) return { error: "Invalid timezone" };
  const notifications: SsaNotification[] = cur.notifications.map((n) => ({
    ...n,
    enabled: fd.get(`n_${n.id}_enabled`) === "1",
    subject: str(fd, `n_${n.id}_subject`) || n.subject,
    message: String(fd.get(`n_${n.id}_message`) ?? n.message),
    sentTo: str(fd, `n_${n.id}_sentTo`)
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean),
  }));
  await saveSsaSettings({
    timezone: tz,
    adminEmail: str(fd, "adminEmail") || cur.adminEmail,
    staffName: str(fd, "staffName"),
    companyName: str(fd, "companyName") || cur.companyName,
    startOfWeek: int(fd, "startOfWeek", 1) === 0 ? 0 : 1,
    accentColor: /^#[0-9a-f]{6}$/i.test(str(fd, "accentColor")) ? str(fd, "accentColor") : cur.accentColor,
    notificationsEnabled: fd.get("notificationsEnabled") === "1",
    blackoutEnabled: fd.get("blackoutEnabled") === "1",
    notifications,
  });
  revalidatePath("/admin/appointments/settings");
  return { ok: true };
}

export async function addBlackout(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireStaff();
  const startDate = str(fd, "startDate");
  const endDate = str(fd, "endDate") || startDate;
  if (!isYmd(startDate) || !isYmd(endDate) || endDate < startDate) return { error: "Enter a valid date range" };
  await prisma.appointmentBlackout.create({ data: { startDate, endDate, note: str(fd, "note") } });
  revalidatePath("/admin/appointments/settings");
  return { ok: true };
}

export async function deleteBlackout(fd: FormData) {
  await requireStaff();
  await prisma.appointmentBlackout.delete({ where: { id: int(fd, "id") } }).catch(() => undefined);
  revalidatePath("/admin/appointments/settings");
}
