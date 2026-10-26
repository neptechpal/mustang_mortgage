// RFC 5545 calendar file for an appointment.
const pad = (n: number) => String(n).padStart(2, "0");
const stamp = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

function fold(line: string) {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = " " + rest.slice(74);
  }
  out.push(rest);
  return out.join("\r\n");
}

export type IcsInput = {
  uid: string;
  start: Date;
  end: Date;
  title: string;
  description?: string;
  location?: string;
  url?: string;
  organizerName?: string;
  organizerEmail?: string;
  attendeeName?: string;
  attendeeEmail?: string;
  canceled?: boolean;
  sequence?: number;
};

export function buildIcs(e: IcsInput) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mustang Mortgage//Appointments//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${e.canceled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(e.end)}`,
    `SEQUENCE:${e.sequence ?? 0}`,
    `SUMMARY:${esc(e.title)}`,
    e.description ? `DESCRIPTION:${esc(e.description)}` : "",
    e.location ? `LOCATION:${esc(e.location)}` : "",
    e.url ? `URL:${e.url}` : "",
    e.organizerEmail ? `ORGANIZER;CN=${esc(e.organizerName || e.organizerEmail)}:mailto:${e.organizerEmail}` : "",
    e.attendeeEmail ? `ATTENDEE;CN=${esc(e.attendeeName || e.attendeeEmail)};ROLE=REQ-PARTICIPANT:mailto:${e.attendeeEmail}` : "",
    `STATUS:${e.canceled ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Google Calendar "add event" link. */
export function googleCalendarUrl(e: { start: Date; end: Date; title: string; details?: string; location?: string }) {
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: e.title,
    dates: `${stamp(e.start)}/${stamp(e.end)}`,
    details: e.details ?? "",
    location: e.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}
