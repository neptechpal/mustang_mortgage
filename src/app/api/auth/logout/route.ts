import { NextResponse } from "next/server";
import { destroySession } from "@/lib/session";
import { siteUrl } from "@/modules/members/security";

// POST-only logout endpoint (for forms / fetch). GET /logout/ is the UM page.
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin && origin !== new URL(siteUrl()).origin) {
    return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  }
  await destroySession();
  const wantsJson = (req.headers.get("accept") || "").includes("application/json");
  return wantsJson ? NextResponse.json({ ok: true }) : NextResponse.redirect(siteUrl("/"), 303);
}
