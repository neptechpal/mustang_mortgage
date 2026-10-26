import { getSetting, setSetting } from "@/lib/settings";
import { BUSINESS_TZ } from "../tz";

export const SSA_SETTINGS_KEY = "tools.ssa";

export type SsaNotification = {
  id: number;
  title: string;
  trigger: "appointment_booked" | "appointment_canceled" | "appointment_rescheduled";
  sentTo: string[]; // "{{admin_email}}" | "{{customer_email}}" | literal addresses
  subject: string;
  message: string; // SSA/Twig-style template
  enabled: boolean;
  appointmentTypes: string[]; // slugs; empty = all
};

export type SsaSettings = {
  timezone: string;
  adminEmail: string;
  staffName: string;
  companyName: string;
  startOfWeek: number; // 0 = Sunday, 1 = Monday
  accentColor: string;
  background: string;
  font: string;
  notificationsEnabled: boolean;
  notifications: SsaNotification[];
  blackoutEnabled: boolean;
};

// Values copied from the live WP option `ssa_settings_json` (2025-06-15).
export const DEFAULT_SSA_NOTIFICATIONS: SsaNotification[] = [
  {
    id: 1749986874,
    title: "Email (Admin)",
    trigger: "appointment_booked",
    sentTo: ["{{admin_email}}"],
    subject: "{{ Appointment.customer_information.Name }} just booked an appointment",
    message:
      "<p>{{ Appointment.customer_information.Name }} just booked an appointment on {{ Global.home_url }} </p>\n<p>Appointment Details: <br />\nStarting at {{ Appointment.business_start_date }} </p>\n<p>{% if instructions %}<br />\nInstructions: {{ instructions|raw }} <br />\n{% endif %}</p>\n<p>{% if Appointment.web_meeting_url %}<br />\nAt your appointment time, join the meeting using this link: {{ Appointment.web_meeting_url }}{% endif %}</p>\n<p>Type: {{ Appointment.AppointmentType.title|raw }} </p>\n<p>Customer details: <br />\n{{ Appointment.customer_information_summary }}</p>\n",
    enabled: true,
    appointmentTypes: [],
  },
  {
    id: 1749986875,
    title: "Email (Customer)",
    trigger: "appointment_booked",
    sentTo: ["{{customer_email}}"],
    subject: "Your appointment details",
    message:
      "<p>Hi {{ Appointment.customer_information.Name }}, </p>\n<p>This is a confirmation of the appointment you just booked on {{ Global.site_url }} </p>\n<p>Appointment scheduled for {{ Appointment.customer_start_date }} </p>\n<p>{% if instructions %}<br>\nInstructions: {{ instructions|raw }} <br>\n{% endif %}</p>\n<p>{% if Appointment.web_meeting_url %}<br>\nAt your appointment time, join the meeting using this link: {{ Appointment.web_meeting_url }}{% endif %}</p>\n<p>Type: {{ Appointment.AppointmentType.title|raw }} </p>\n<p>Your details: <br>\n{{ Appointment.customer_information_summary }}</p>\n<p>If you need to cancel or change your appointment, you can do so by visiting this link: <br>\n{{ Appointment.public_edit_url }}</p>\n",
    enabled: true,
    appointmentTypes: [],
  },
  {
    id: 1749986876,
    title: "Email (Admin)",
    trigger: "appointment_canceled",
    sentTo: ["{{admin_email}}"],
    subject: "{{ Appointment.customer_information.Name }} just canceled an appointment",
    message:
      '<p>Your appointment "{{ Appointment.AppointmentType.title|raw }}" with {{ Appointment.customer_information.Name }} has been canceled </p>{% if cancelation_note %}<p>{% if canceled_by_name %} {{ canceled_by_name }} left a note: {% else %}Note: {% endif %}{{ cancelation_note }} </p>{% endif %}\n<p>*** Canceled *** <br />\nAppointment Details: <br />\n{{ Appointment.business_start_date }} </p>\n<p>Type: {{ Appointment.AppointmentType.title|raw }} </p>\n<p>Customer details: <br />\n{{ Appointment.customer_information_summary }}</p>\n',
    enabled: true,
    appointmentTypes: [],
  },
  {
    id: 1749986877,
    title: "Email (Customer)",
    trigger: "appointment_canceled",
    sentTo: ["{{customer_email}}"],
    subject: "Your appointment has been canceled",
    message:
      '<p>Hi {{ Appointment.customer_information.Name }},<br />\nYour appointment "{{ Appointment.AppointmentType.title|raw }}" (booked on {{ Global.home_url }}) has been canceled</p>{% if cancelation_note %}<p>{% if canceled_by_name %} {{ canceled_by_name }} left a note: {% else %}Note: {% endif %}{{ cancelation_note }} </p>{% endif %}\n',
    enabled: true,
    appointmentTypes: [],
  },
];

export const DEFAULT_SSA_SETTINGS: SsaSettings = {
  timezone: BUSINESS_TZ,
  adminEmail: "info@mustangmortgage.com.au",
  staffName: "Sulav Adhikari",
  companyName: "Mustang Mortgage",
  startOfWeek: 1,
  accentColor: "#AE7C28", // rgba(174,124,40,1)
  background: "#FFFFFF",
  font: "Roboto",
  notificationsEnabled: true,
  notifications: DEFAULT_SSA_NOTIFICATIONS,
  blackoutEnabled: true,
};

export async function getSsaSettings(): Promise<SsaSettings> {
  const s = await getSetting<SsaSettings>(SSA_SETTINGS_KEY, DEFAULT_SSA_SETTINGS);
  if (!Array.isArray(s.notifications) || !s.notifications.length) s.notifications = DEFAULT_SSA_NOTIFICATIONS;
  return s;
}

export async function saveSsaSettings(patch: Partial<SsaSettings>) {
  const cur = await getSsaSettings();
  await setSetting(SSA_SETTINGS_KEY, { ...cur, ...patch });
}

export function siteUrl() {
  return (process.env.SITE_URL || "https://www.mustangmortgage.com.au").replace(/\/+$/, "");
}
