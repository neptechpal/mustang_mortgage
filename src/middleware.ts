import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { publicUrl } from "@/lib/url";

const SESSION_COOKIE = "mm_session";

// Coarse gate for staff areas; pages/handlers still check roles themselves.
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  let role: string | undefined;
  if (token && process.env.SESSION_SECRET) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET));
      role = payload.role as string;
    } catch {
      role = undefined;
    }
  }
  const staff = role === "ADMIN" || role === "STAFF";
  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith("/api/admin")) {
    if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.next();
  }
  if (!staff) {
    return NextResponse.redirect(publicUrl(req, `/login?redirect_to=${encodeURIComponent(pathname + search)}`));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
