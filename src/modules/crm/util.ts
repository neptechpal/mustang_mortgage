import crypto from "crypto";
import { TZ } from "./constants";

export function money(n: number | null | undefined, dec = 0) {
  const v = Number(n || 0);
  return "$" + v.toLocaleString("en-AU", { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

export function num(v: unknown): number {
  const s = String(v ?? "").replace(/[^0-9.\-]/g, "");
  if (s === "" || s === "-") return 0;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/** Parts of a date in Sydney time. */
export function sydParts(d = new Date()) {
  const p = new Intl.DateTimeFormat("en-AU", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", weekday: "short", hourCycle: "h23",
  }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(g("weekday")) + 1; // ISO 1..7
  return { y: g("year"), m: g("month"), d: g("day"), H: Number(g("hour")), i: g("minute"), s: g("second"), dow };
}

/** "Y-m-d H:i:s" in Sydney time (WP current_time('mysql')). */
export function mysqlNow(d = new Date()) {
  const p = sydParts(d);
  return `${p.y}-${p.m}-${p.d} ${String(p.H).padStart(2, "0")}:${p.i}:${p.s}`;
}

export function fmtDate(d: Date | string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return String(d);
  return new Intl.DateTimeFormat("en-AU", { timeZone: TZ, ...opts }).format(dt);
}
export const fmtDateTime = (d: Date | string | null | undefined) =>
  fmtDate(d, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
export const fmtLong = (d: Date | string | null | undefined) =>
  fmtDate(d, { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" });

/** WP human_time_diff */
export function timeDiff(from: Date | number, to: Date | number = Date.now()) {
  const a = typeof from === "number" ? from : from.getTime();
  const b = typeof to === "number" ? to : to.getTime();
  const s = Math.abs(b - a) / 1000;
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  if (s < 3600) return plural(Math.max(1, Math.round(s / 60)), "min");
  if (s < 86400) return plural(Math.max(1, Math.round(s / 3600)), "hour");
  if (s < 7 * 86400) return plural(Math.max(1, Math.round(s / 86400)), "day");
  if (s < 30 * 86400) return plural(Math.max(1, Math.round(s / (7 * 86400))), "week");
  if (s < 365 * 86400) return plural(Math.max(1, Math.round(s / (30 * 86400))), "month");
  return plural(Math.max(1, Math.round(s / (365 * 86400))), "year");
}
export const timeAgo = (d: Date | null | undefined) => (d ? timeDiff(d) + " ago" : "");

/** Constant-time string compare (hash_equals). */
export function safeEqual(a: string, b: string) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb) && String(a).length === String(b).length;
}

/** 32-char alphanumeric token (wp_generate_password(32,false,false)). */
export function newToken() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.randomBytes(32);
  let s = "";
  for (let i = 0; i < 32; i++) s += chars[bytes[i] % chars.length];
  return s;
}

export function extractEmails(str: string): string[] {
  const out = new Set<string>();
  for (const m of String(str || "").matchAll(/[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}/gi)) out.add(m[0].toLowerCase());
  return [...out];
}

export const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(s || "").trim());

export function firstWord(name: string) {
  const n = String(name || "").trim().replace(/\s+/g, " ");
  return n ? n.split(" ")[0] : "";
}
export function joinIfBoth(a: string, b: string, sep = " & ") {
  a = (a || "").trim();
  b = (b || "").trim();
  if (a && b) return a + sep + b;
  return a || b;
}

/** Minimal wpautop: wraps blank-line separated blocks in <p> and single newlines in <br>. */
export function autop(text: string) {
  const t = String(text || "").replace(/\r\n/g, "\n").trim();
  if (!t) return "";
  const block = /^\s*<(p|div|ul|ol|table|h[1-6]|blockquote|section|pre|hr)[\s>]/i;
  return t
    .split(/\n{2,}/)
    .map((chunk) => (block.test(chunk) ? chunk : `<p>${chunk.replace(/\n/g, "<br>\n")}</p>`))
    .join("\n");
}

export const stripTags = (s: string) => String(s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

export function siteUrl() {
  return (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://www.mustangmortgage.com.au").replace(/\/$/, "");
}

/** Remove scripts/iframes/event handlers etc. from staff-authored HTML before emailing (mmcrm_clean_email_html). */
export function cleanEmailHtml(html: string) {
  return String(html || "")
    .replace(/<(script|style|iframe|object|embed|form)[\s\S]*?<\/\1>/gi, "")
    .replace(/<(script|iframe|object|embed|form|input|button)[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');
}
