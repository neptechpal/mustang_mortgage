import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { verifyWpPassword } from "@/lib/wp-password";
import { getProfile } from "@/modules/members/profile";
import { hit, isLimited, siteUrl } from "@/modules/members/security";

// Account > Privacy > "Download your data": password-confirmed JSON export of the member's personal data.
export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin && origin !== new URL(siteUrl()).origin) {
    return new NextResponse("Bad origin", { status: 403 });
  }
  const s = await getSession();
  if (!s) return NextResponse.redirect(siteUrl("/login?redirect_to=/account/privacy"), 303);
  const key = `export:${s.uid}`;
  if (isLimited(key, 10, 15 * 60_000)) return new NextResponse("Too many attempts. Please try again later.", { status: 429 });
  hit(key);
  const fd = await req.formData();
  const pw = fd.get("um-export-data");
  const user = await prisma.user.findUnique({ where: { id: s.uid } });
  if (!user || typeof pw !== "string" || !verifyWpPassword(pw, user.passwordHash)) {
    return new NextResponse("The password you entered is incorrect.", { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  const p = getProfile(user);
  const data = {
    exported_at: new Date().toISOString(),
    user: {
      username: user.username,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      display_name: user.displayName,
      registered: user.createdAt.toISOString(),
      account_status: user.status,
    },
    profile: {
      description: p.description ?? "",
      profile_privacy: p.profilePrivacy ?? "Everyone",
      profile_noindex: p.profileNoindex ?? "No",
      hide_in_members: p.hideInMembers ?? "No",
      last_login: p.lastLogin ?? null,
    },
  };
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="personal-data-${user.username.replace(/[^\w.-]/g, "_")}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
