import { publicUrl } from "@/lib/url";
// Start Zoho Mail OAuth (admin-post mm_zoho_oauth_start). Admin only.
import crypto from "crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { authorizeUrl } from "@/modules/crm-extra/lib/zoho";
import { getZoho } from "@/modules/crm-extra/lib/opts";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await getSession();
  if (!s || s.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const z = await getZoho();
  if (!z.clientId || !z.clientSecret) return NextResponse.redirect(publicUrl(req, "/admin/zoho?err=creds"));
  const state = crypto.randomBytes(16).toString("hex");
  const res = NextResponse.redirect(await authorizeUrl(state));
  res.cookies.set("mm_zoho_state", state, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/zoho", maxAge: 600 });
  return res;
}
