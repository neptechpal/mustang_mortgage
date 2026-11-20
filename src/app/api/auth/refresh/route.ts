import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { destroySession, getSession, isStaff, refreshSession } from "@/lib/session";
import { publicUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

const ABSOLUTE_LIFETIME = 60 * 60 * 24 * 14;

// Staff sessions are re-checked against the database here (the edge middleware cannot query it).
// Deactivated users, users without 2FA and expired logins are signed out; everyone else gets fresh access areas.
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("next") ?? "/admin";
  const next = raw.startsWith("/admin") && !raw.startsWith("//") && !raw.includes("\\") ? raw : "/admin";
  const toLogin = async () => {
    await destroySession();
    return NextResponse.redirect(publicUrl(req, `/login?redirect_to=${encodeURIComponent(next)}`));
  };

  const s = await getSession();
  if (!s || !isStaff(s.role) || !s.mfa) return toLogin();
  if (s.ses && Date.now() / 1000 - s.ses > ABSOLUTE_LIFETIME) return toLogin();

  const user = await prisma.user.findUnique({ where: { id: s.uid } });
  if (!user || user.status !== "approved" || !isStaff(user.role) || !user.twoFactorEnabled) return toLogin();

  await refreshSession(user, s);
  return NextResponse.redirect(publicUrl(req, next));
}
