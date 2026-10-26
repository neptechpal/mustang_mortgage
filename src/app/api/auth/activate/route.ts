import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getProfile } from "@/modules/members/profile";
import { hashToken, safeEqual, siteUrl } from "@/modules/members/security";
import { sendUmEmail } from "@/modules/members/emails";

// E-mail activation link for the UM "checkmail" registration status.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const uid = parseInt(url.searchParams.get("uid") || "", 10);
  const key = url.searchParams.get("key") || "";
  const fail = NextResponse.redirect(siteUrl("/login?activation=invalid"));
  if (!Number.isFinite(uid) || !key || key.length > 200) return fail;
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user || user.status !== "checkmail") return fail;
  const p = getProfile(user);
  if (!p.activationHash || !safeEqual(p.activationHash, hashToken(key))) return fail;
  if (p.activationExpires && new Date(p.activationExpires).getTime() < Date.now()) return fail;
  const next = { ...p, statusChangedAt: new Date().toISOString(), statusChangedBy: "email-activation" } as Record<string, unknown>;
  delete next.activationHash;
  delete next.activationExpires;
  await prisma.user.update({ where: { id: user.id }, data: { status: "approved", profile: next as Prisma.InputJsonValue } });
  await sendUmEmail("welcome_email", user);
  return NextResponse.redirect(siteUrl("/login?activated=1"));
}
