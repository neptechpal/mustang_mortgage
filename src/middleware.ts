import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { canAccessPath } from "@/lib/access";
import { publicUrl } from "@/lib/url";

const SESSION_COOKIE = "mm_session";
const REFRESH_AFTER_SECONDS = 300; // re-read access areas / account status from the database this often

type Claims = { role?: string; areas?: string[]; pat?: number; mfa?: number };

// Gate for staff areas. Pages/handlers still check roles themselves.
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  let c: Claims = {};
  if (token && process.env.SESSION_SECRET) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET));
      c = payload as unknown as Claims;
    } catch {
      c = {};
    }
  }
  const staff = c.role === "ADMIN" || c.role === "STAFF";
  const { pathname, search } = req.nextUrl;
  const isApi = pathname.startsWith("/api/admin");

  if (!staff) {
    if (isApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(publicUrl(req, `/login?redirect_to=${encodeURIComponent(pathname + search)}`));
  }

  // Sessions without a completed second factor (older sessions) or with stale access data are re-checked
  // against the database on the next page load. The refresh route signs the user out if they no longer qualify.
  const prefetch = req.headers.has("next-router-prefetch") || req.headers.get("purpose") === "prefetch";
  const stale = !c.mfa || !c.pat || Date.now() / 1000 - c.pat > REFRESH_AFTER_SECONDS;
  if (stale && req.method === "GET" && !isApi && !prefetch) {
    return NextResponse.redirect(publicUrl(req, `/api/auth/refresh?next=${encodeURIComponent(pathname + search)}`));
  }
  if (!c.mfa) {
    if (isApi) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.redirect(publicUrl(req, "/login"));
  }

  if (pathname !== "/admin/no-access" && !canAccessPath(c.role as string, c.areas, pathname)) {
    if (isApi) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    return NextResponse.redirect(publicUrl(req, "/admin/no-access"));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
