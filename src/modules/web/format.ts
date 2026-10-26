import { SITE } from "./config";

/** "15:30" → { h: "3:30", ap: "pm" } */
function parts(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { text: `${h12}:${String(m).padStart(2, "0")}`, ap };
}

/** "08:00","11:00" → "8:00–11:00 am"; "11:00","13:00" → "11:00 am–1:00 pm" */
export function formatTimeRange(start: string, end: string) {
  const a = parts(start);
  const b = parts(end);
  return a.ap === b.ap ? `${a.text}–${b.text} ${b.ap}` : `${a.text} ${a.ap}–${b.text} ${b.ap}`;
}

/** Consultation hours as display rows. */
export function consultationHours() {
  return SITE.hours.blocks.map((b) => ({ label: b.label, range: formatTimeRange(b.start, b.end) }));
}

/** "8:00–11:00 am, 1:00–2:00 pm and 3:30–7:00 pm" */
export function consultationHoursSentence() {
  const r = consultationHours().map((h) => h.range);
  return r.length > 1 ? `${r.slice(0, -1).join(", ")} and ${r[r.length - 1]}` : r[0] ?? "";
}

/** "phone or video" from SITE.consultation.modes */
export function consultationModes(joiner = "or") {
  const m = SITE.consultation.modes;
  return m.length > 1 ? `${m.slice(0, -1).join(", ")} ${joiner} ${m[m.length - 1]}` : m[0] ?? "";
}

/** ISO date → "26 October 2026" (Australian format). */
export function formatDate(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(`${iso.length === 10 ? `${iso}T00:00:00` : iso}`) : iso;
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Sydney" }).format(d);
}

/** 650000 → "$650,000" */
export function formatAud(n: number, opts: { cents?: boolean } = {}) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: opts.cents ? 2 : 0, maximumFractionDigits: opts.cents ? 2 : 0 }).format(n);
}
