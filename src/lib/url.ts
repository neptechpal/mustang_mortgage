// Behind nginx the app listens on 127.0.0.1:3010, so `req.url` / `req.nextUrl`
// carry that internal origin. Redirects must use the public origin instead.

type ReqLike = { url: string; headers: Headers };

/** Public origin of the incoming request (proxy headers first, then Host). */
export function requestOrigin(req: ReqLike): string {
  const h = req.headers;
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim();
  const proto = (h.get("x-forwarded-proto") ?? "").split(",")[0].trim() || new URL(req.url).protocol.replace(":", "");
  if (host && /^[a-z0-9.\-]+(:\d+)?$/i.test(host)) return `${proto}://${host}`;
  return process.env.SITE_URL?.replace(/\/$/, "") || new URL(req.url).origin;
}

/** Absolute URL on the public origin for a same-site path. */
export function publicUrl(req: ReqLike, path: string): URL {
  return new URL(path, requestOrigin(req));
}
