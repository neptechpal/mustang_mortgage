// Spam protection replacing reCAPTCHA v3 on the public forms: honeypot field
// + a small in-memory sliding-window rate limit per IP and form.

const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 6;

export function clientIp(req: Request) {
  const h = req.headers;
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "").trim() || "unknown";
}

/** Returns true when the caller is over the limit (and records the hit otherwise). */
export function rateLimited(key: string, max = MAX_PER_WINDOW, windowMs = WINDOW_MS) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    hits.set(key, list);
    return true;
  }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  }
  return false;
}

/** Any of the known honeypot inputs filled in => bot. */
export function honeypotTripped(fd: FormData) {
  return ["wpcf7_hp_field", "mmf_website", "website_url"].some((k) => {
    const v = fd.get(k);
    return typeof v === "string" && v.trim() !== "";
  });
}
