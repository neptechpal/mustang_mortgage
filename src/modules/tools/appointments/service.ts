import { randomBytes } from "crypto";
import type { Appointment, AppointmentType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { escapeHtml, sendMail } from "@/lib/mail";
import { BUSINESS_TZ, formatWpDateTime, isValidTz, tzAbbr } from "../tz";
import { buildIcs } from "./ics";
import { getSsaSettings, siteUrl, type SsaNotification } from "./settings";
import { isSlotAvailable } from "./slots";
import { renderTemplate } from "./template";
import { readFields } from "./types";

const LOCK_KEY = 7_742_001; // pg advisory lock serialising bookings

export class BookingError extends Error {
  constructor(
    message: string,
    public status = 400,
    public fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

export type AppointmentWithType = Appointment & { appointmentType: AppointmentType };

export const manageUrl = (token: string) => `${siteUrl()}/book-appointment/manage/${token}`;
export const newToken = () => randomBytes(24).toString("base64url");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validates submitted booking fields against the type's configured customer information. */
export function validateFields(type: AppointmentType, input: Record<string, unknown>) {
  const fields = readFields(type);
  const clean: Record<string, string> = {};
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const v = String(input[f.field] ?? "").trim().slice(0, f.field === "Notes" ? 5000 : 500);
    if (f.required && !v) errors[f.field] = `${f.field} is required`;
    if (v && f.field === "Email" && !EMAIL_RE.test(v)) errors[f.field] = "Please enter a valid email address";
    if (v && f.field === "Phone" && v.replace(/\D/g, "").length < 6) errors[f.field] = "Please enter a valid phone number";
    if (v) clean[f.field] = v;
  }
  if (Object.keys(errors).length) throw new BookingError("Please check the highlighted fields", 422, errors);
  return clean;
}

type BookInput = {
  type: AppointmentType;
  start: Date;
  fields: Record<string, string>;
  timezone?: string;
  userId?: number | null;
  source?: string;
  ignoreNotice?: boolean;
  reschedule?: Appointment | null;
  actorName?: string;
};

/** Creates an appointment (or reschedules one) after re-checking availability under a lock. */
export async function bookAppointment(input: BookInput): Promise<AppointmentWithType> {
  const { type, start } = input;
  if (Number.isNaN(start.getTime())) throw new BookingError("Invalid time");
  const end = new Date(start.getTime() + type.durationMin * 60_000);
  const tz = input.timezone && isValidTz(input.timezone) ? input.timezone : BUSINESS_TZ;

  const created = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_KEY})`;
      const ok = await isSlotAvailable(type, start, {
        excludeAppointmentId: input.reschedule?.id,
        ignoreNotice: input.ignoreNotice,
      });
      if (!ok) throw new BookingError("Sorry, that time is no longer available. Please choose another time.", 409);
      const f = input.fields;
      const appt = await tx.appointment.create({
        data: {
          appointmentTypeId: type.id,
          startAt: start,
          endAt: end,
          status: "booked",
          customerName: f.Name ?? input.reschedule?.customerName ?? "",
          customerEmail: f.Email ?? input.reschedule?.customerEmail ?? "",
          customerPhone: f.Phone ?? input.reschedule?.customerPhone ?? "",
          customerInfo: f as Prisma.InputJsonValue,
          customerTimezone: tz,
          userId: input.userId ?? input.reschedule?.userId ?? null,
          token: newToken(),
          rescheduledFromId: input.reschedule?.id ?? null,
          source: input.source ?? "web",
          staffNotes: input.reschedule?.staffNotes ?? "",
        },
        include: { appointmentType: true },
      });
      if (input.reschedule) {
        await tx.appointment.update({
          where: { id: input.reschedule.id },
          data: {
            status: "canceled",
            rescheduledToId: appt.id,
            canceledAt: new Date(),
            canceledBy: input.actorName ?? "customer",
            cancelNote: "Rescheduled",
          },
        });
      }
      return appt;
    },
    { timeout: 15_000 },
  );

  await notify(created, input.reschedule ? "appointment_rescheduled" : "appointment_booked").catch((e) =>
    console.error("[appointments] notify failed", e),
  );
  return created;
}

export async function cancelAppointment(appt: AppointmentWithType, opts: { note?: string; byName?: string; byStaff?: boolean } = {}) {
  if (appt.status !== "booked") throw new BookingError("This appointment has already been canceled.", 409);
  const updated = await prisma.appointment.update({
    where: { id: appt.id },
    data: {
      status: "canceled",
      canceledAt: new Date(),
      cancelNote: (opts.note ?? "").slice(0, 2000),
      canceledBy: opts.byName ?? (opts.byStaff ? "staff" : "customer"),
    },
    include: { appointmentType: true },
  });
  await notify(updated, "appointment_canceled", { note: opts.note, byName: opts.byName }).catch((e) =>
    console.error("[appointments] notify failed", e),
  );
  return updated;
}

/* ---------------------------- notifications ---------------------------- */

function summaryHtml(info: Record<string, unknown>) {
  return Object.entries(info)
    .filter(([, v]) => String(v ?? "").trim())
    .map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(String(v)).replace(/\n/g, "<br />")}`)
    .join("<br />\n");
}

export async function templateContext(appt: AppointmentWithType, extra: { note?: string; byName?: string } = {}) {
  const s = await getSsaSettings();
  const tz = s.timezone || BUSINESS_TZ;
  const info = (appt.customerInfo ?? {}) as Record<string, unknown>;
  const safeInfo = Object.fromEntries(Object.entries(info).map(([k, v]) => [k, escapeHtml(String(v ?? ""))]));
  const ctz = appt.customerTimezone && isValidTz(appt.customerTimezone) ? appt.customerTimezone : tz;
  const t = appt.appointmentType;
  return {
    Appointment: {
      customer_information: safeInfo,
      business_start_date: `${formatWpDateTime(appt.startAt, tz)} (${tzAbbr(appt.startAt, tz)})`,
      customer_start_date: `${formatWpDateTime(appt.startAt, ctz)} (${tzAbbr(appt.startAt, ctz)})`,
      AppointmentType: { title: escapeHtml(t.title), description: escapeHtml(t.description) },
      web_meeting_url: escapeHtml(t.webMeetingUrl),
      customer_information_summary: summaryHtml(info),
      public_edit_url: manageUrl(appt.token),
    },
    Global: { home_url: siteUrl(), site_url: siteUrl(), company_name: escapeHtml(s.companyName) },
    instructions: t.instructions ? escapeHtml(t.instructions).replace(/\n/g, "<br />") : "",
    location: escapeHtml(t.location),
    cancelation_note: extra.note ? escapeHtml(extra.note) : "",
    canceled_by_name: extra.byName ? escapeHtml(extra.byName) : "",
    customer_name: safeInfo.Name ?? escapeHtml(appt.customerName),
    customer_email: appt.customerEmail,
    admin_email: s.adminEmail,
    settings: s,
  };
}

export async function appointmentIcs(appt: AppointmentWithType, forAdmin = false) {
  const s = await getSsaSettings();
  const t = appt.appointmentType;
  const name = appt.customerName || "Customer";
  return buildIcs({
    uid: `ssa-appointment-${appt.id}@mustangmortgage.com.au`,
    start: appt.startAt,
    end: appt.endAt,
    title: forAdmin ? `${name} - ${t.title}` : `${t.title} (${s.companyName})`,
    description: [
      t.webMeetingUrl ? `This event has a web meeting: ${t.webMeetingUrl}` : "",
      t.instructions ? `Instructions: ${t.instructions}` : "",
      forAdmin ? `Customer details:\n${Object.entries((appt.customerInfo ?? {}) as Record<string, unknown>).map(([k, v]) => `${k}: ${v}`).join("\n")}` : "",
      `Need to make changes to this event?\n${manageUrl(appt.token)}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
    location: t.location || undefined,
    url: manageUrl(appt.token),
    organizerName: s.companyName,
    organizerEmail: s.adminEmail,
    attendeeName: name,
    attendeeEmail: appt.customerEmail || undefined,
    canceled: appt.status === "canceled",
    sequence: appt.status === "canceled" ? 1 : 0,
  });
}

function wrapHtml(body: string) {
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#222">${body}</div>`;
}

export async function notify(
  appt: AppointmentWithType,
  trigger: SsaNotification["trigger"],
  extra: { note?: string; byName?: string } = {},
) {
  const s = await getSsaSettings();
  if (!s.notificationsEnabled) return;
  // SSA had no dedicated "rescheduled" templates; fall back to the booked ones for the new slot.
  let list = s.notifications.filter((n) => n.enabled && n.trigger === trigger);
  if (!list.length && trigger === "appointment_rescheduled")
    list = s.notifications.filter((n) => n.enabled && n.trigger === "appointment_booked");
  const ctx = await templateContext(appt, extra);
  const t = appt.appointmentType;

  for (const n of list) {
    if (n.appointmentTypes?.length && !n.appointmentTypes.includes(t.slug)) continue;
    const toAdmin = n.sentTo.some((x) => x.includes("admin_email"));
    const toCustomer = n.sentTo.some((x) => x.includes("customer_email"));
    if (toAdmin && !t.notifyAdmin) continue;
    if (toCustomer && !t.notifyCustomer) continue;
    const to = n.sentTo
      .map((x) => (x.includes("admin_email") ? s.adminEmail : x.includes("customer_email") ? appt.customerEmail : x.trim()))
      .filter((x) => x && EMAIL_RE.test(x));
    if (!to.length) continue;
    const subject = renderTemplate(n.subject, ctx).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim();
    const html = wrapHtml(renderTemplate(n.message, ctx));
    const ics = await appointmentIcs(appt, toAdmin && !toCustomer);
    await sendMail({
      to,
      subject: trigger === "appointment_rescheduled" && !/resched/i.test(subject) ? `${subject} (rescheduled)` : subject,
      html,
      replyTo: toAdmin ? appt.customerEmail || undefined : s.adminEmail,
      attachments: [
        {
          filename: appt.status === "canceled" ? "canceled-appointment.ics" : "appointment.ics",
          content: Buffer.from(ics, "utf8"),
          contentType: `text/calendar; charset=utf-8; method=${appt.status === "canceled" ? "CANCEL" : "PUBLISH"}`,
        },
      ],
      context: `ssa:${trigger}:${appt.id}`,
    });
  }
}
