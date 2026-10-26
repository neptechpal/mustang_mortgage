// Small, dependency-free timezone helpers (business timezone = Australia/Sydney).
export const BUSINESS_TZ = "Australia/Sydney";

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

function parts(date: Date, tz: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const x of dtf.formatToParts(date)) p[x.type] = x.value;
  return p;
}

/** Offset (ms) of `tz` relative to UTC at the given instant. */
export function tzOffsetMs(date: Date, tz: string) {
  const p = parts(date, tz);
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Wall-clock date (YYYY-MM-DD) + time (HH:MM[:SS]) in `tz` → UTC Date. */
export function zonedToUtc(ymd: string, hm: string, tz = BUSINESS_TZ): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const [h, mi] = hm.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const off1 = tzOffsetMs(new Date(guess), tz);
  let t = guess - off1;
  const off2 = tzOffsetMs(new Date(t), tz);
  if (off2 !== off1) t = guess - off2;
  return new Date(t);
}

/** YYYY-MM-DD of an instant in `tz`. */
export function ymdInTz(date: Date, tz = BUSINESS_TZ) {
  const p = parts(date, tz);
  return `${p.year}-${p.month}-${p.day}`;
}

/** HH:MM of an instant in `tz`. */
export function hmInTz(date: Date, tz = BUSINESS_TZ) {
  const p = parts(date, tz);
  return `${String(+p.hour % 24).padStart(2, "0")}:${p.minute}`;
}

export function addDaysYmd(ymd: string, n: number) {
  const [y, m, d] = ymd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

export function weekdayOf(ymd: string): Weekday {
  const [y, m, d] = ymd.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export const isYmd = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

export function isValidTz(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Short timezone name, e.g. "AEST" / "AEDT". */
export function tzAbbr(date: Date, tz = BUSINESS_TZ) {
  const p = new Intl.DateTimeFormat("en-AU", { timeZone: tz, timeZoneName: "short" }).formatToParts(date);
  return p.find((x) => x.type === "timeZoneName")?.value ?? tz;
}

/** WordPress "F j, Y g:i a" style, e.g. "June 17, 2025 3:30 pm". */
export function formatWpDateTime(date: Date, tz = BUSINESS_TZ) {
  const d = new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "long", day: "numeric", year: "numeric" }).format(date);
  const t = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true })
    .format(date)
    .replace(/\s?AM$/i, " am")
    .replace(/\s?PM$/i, " pm");
  return `${d} ${t}`;
}
