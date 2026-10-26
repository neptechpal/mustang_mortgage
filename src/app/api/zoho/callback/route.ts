import { publicUrl } from "@/lib/url";
// Zoho Mail OAuth callback (admin-post mm_zoho_oauth_callback): exchange code, store tokens, discover accountId.
import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { exchangeCode } from "@/modules/crm-extra/lib/zoho";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const s = await getSession();
  if (!s || s.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const code = req.nextUrl.searchParams.get("code") ?? "";
  const state = req.nextUrl.searchParams.get("state") ?? "";
  if (!code) return new NextResponse("No code", { status: 400 });
  const expected = req.cookies.get("mm_zoho_state")?.value;
  if (!expected || expected !== state) return new NextResponse("Invalid OAuth state", { status: 400 });
  const r = await exchangeCode(code);
  const res = NextResponse.redirect(publicUrl(req, r.ok ? "/admin/zoho?connected=1" : "/admin/zoho?err=oauth"));
  res.cookies.delete({ name: "mm_zoho_state", path: "/api/zoho" });
  return res;
}
