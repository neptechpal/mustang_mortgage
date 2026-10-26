import crypto from "crypto";
import { headers } from "next/headers";

/**
 * Only same-site relative paths are accepted for ?redirect_to= (no open redirects).
 * Absolute URLs pointing at SITE_URL are converted to their path.
 */
export function safeRedirect(raw: unknown, fallback: string): string {
  if (typeof raw !== "string" || !raw) return fallback;
  let p = raw.trim();
  const site = process.env.SITE_URL?.replace(/\/+$/, "");
  if (site && p.toLowerCase().startsWith(site.toLowerCase() + "/")) p = p.slice(site.length);
  if (!p.startsWith("/") || p.startsWith("//") || p.startsWith("/\\") || /[\u0000-\u001f\\]/.test(p)) return fallback;
  try {
    const u = new URL(p, "http://local.invalid");
    if (u.origin !== "http://local.invalid") return fallback;
    const out = u.pathname + u.search + u.hash;
    if (!out.startsWith("/") || out.startsWith("//") || out.startsWith("/\\")) return fallback;
    if (out.startsWith("/logout") || out.startsWith("/api/")) return fallback;
    return out;
  } catch {
    return fallback;
  }
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown").slice(0, 64);
}

// ---------------------------------------------------------------------------
// Simple in-memory sliding-window rate limiter (single-process deployment).
type Bucket = { hits: number[] };
const g = globalThis as unknown as { __mmRate?: Map<string, Bucket> };
const store = (g.__mmRate ??= new Map<string, Bucket>());

function prune(now: number) {
  if (store.size < 5000) return;
  for (const [k, b] of store) if (!b.hits.length || now - b.hits[b.hits.length - 1] > 24 * 3600_000) store.delete(k);
}

/** Returns true when `key` already has >= limit hits within windowMs. */
export function isLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const b = store.get(key);
  if (!b) return false;
  b.hits = b.hits.filter((t) => now - t < windowMs);
  return b.hits.length >= limit;
}

export function hit(key: string) {
  const now = Date.now();
  prune(now);
  const b = store.get(key) ?? { hits: [] };
  b.hits.push(now);
  if (b.hits.length > 200) b.hits = b.hits.slice(-200);
  store.set(key, b);
}

export function clearHits(key: string) {
  store.delete(key);
}

// ---------------------------------------------------------------------------
export function newToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export function siteUrl(path = "") {
  return (process.env.SITE_URL || "https://www.mustangmortgage.com.au").replace(/\/+$/, "") + path;
}
