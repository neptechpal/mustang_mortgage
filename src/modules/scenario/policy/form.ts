// FormData parsing helpers for the lender policy / scenario settings server actions.
import { fromDateInput } from "./meta";

export class FormError extends Error {}
export function fail(msg: string): never {
  throw new FormError(msg);
}

export function text(fd: FormData, k: string, max = 500): string {
  const v = fd.get(k);
  const s = typeof v === "string" ? v.replace(/\r\n/g, "\n").trim() : "";
  if (s.length > max) fail(`${k}: too long (max ${max} characters)`);
  return s;
}
export const bool = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return v === "1" || v === "on" || v === "true";
};
export function optInt(fd: FormData, k: string, label = k): number | null {
  const s = text(fd, k, 20);
  if (!s) return null;
  const n = Number(s);
  if (!Number.isInteger(n) || n < 0) fail(`${label}: must be a whole number`);
  return n;
}
export function optNum(fd: FormData, k: string, label: string, min = 0, max = Number.MAX_SAFE_INTEGER): number | null {
  const s = text(fd, k, 30).replace(/[$,\s%]/g, "");
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) fail(`${label}: not a number`);
  if (n < min || n > max) fail(`${label}: must be between ${min} and ${max}`);
  return n;
}
export function reqNum(fd: FormData, k: string, label: string, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const n = optNum(fd, k, label, min, max);
  if (n === null) fail(`${label} is required`);
  return n as number;
}
export function optDate(fd: FormData, k: string, label: string): Date | null {
  const s = text(fd, k, 20);
  if (!s) return null;
  const d = fromDateInput(s);
  if (!d) fail(`${label}: invalid date`);
  return d;
}
export function oneOf<T extends string>(fd: FormData, k: string, opts: [T, string][] | readonly T[], label: string, fallback?: T): T {
  const s = text(fd, k, 60);
  const keys = (opts as readonly unknown[]).map((o) => (Array.isArray(o) ? o[0] : o)) as T[];
  if (!s && fallback !== undefined) return fallback;
  if (!keys.includes(s as T)) fail(`${label}: choose a valid option`);
  return s as T;
}
export function many(fd: FormData, k: string, opts: [string, string][]): string[] {
  const allowed = new Set(opts.map(([v]) => v));
  return [...new Set(fd.getAll(k).map(String).filter((v) => allowed.has(v)))];
}
export function errMessage(e: unknown): string {
  if (e instanceof FormError) return e.message;
  const m = e instanceof Error ? e.message : String(e);
  if (/Unique constraint/i.test(m)) return "That code is already in use.";
  console.error("[lender-policy]", e);
  return "Something went wrong — nothing was saved.";
}
