import type { Prisma, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/wp-password";
import { getProfile, type UmProfile } from "./profile";
import { hashToken, newToken, siteUrl } from "./security";
import { sendUmEmail } from "./emails";
import type { MembersSettings } from "./settings";

export const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Creates a single-use password reset token (stored hashed) and returns the absolute link. */
export async function createResetLink(userId: number, ttlMs = RESET_TTL_MS) {
  const token = newToken();
  await prisma.passwordReset.create({
    data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + ttlMs) },
  });
  return siteUrl(`/password-reset?act=reset_password&key=${encodeURIComponent(token)}`);
}

export type ResetLookup =
  | { ok: true; resetId: number; user: User }
  | { ok: false; reason: "invalidkey" | "expiredkey" };

export async function lookupResetToken(token: string): Promise<ResetLookup> {
  if (!token || token.length > 200) return { ok: false, reason: "invalidkey" };
  const row = await prisma.passwordReset.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!row || row.usedAt) return { ok: false, reason: "invalidkey" };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expiredkey" };
  return { ok: true, resetId: row.id, user: row.user };
}

export async function updateProfile(userId: number, patch: Partial<UmProfile>, current?: Prisma.JsonValue) {
  const base = current !== undefined ? getProfile({ profile: current as Prisma.JsonValue }) : getProfile((await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { profile: true } })));
  const next: Record<string, unknown> = { ...base, ...patch };
  for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k];
  await prisma.user.update({ where: { id: userId }, data: { profile: next as Prisma.InputJsonValue } });
}

/** Sets a new password, invalidates outstanding reset tokens. */
export async function setUserPassword(userId: number, password: string) {
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash: hashPassword(password) } }),
    prisma.passwordReset.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } }),
  ]);
}

/** Activation link for the "checkmail" registration status (stored hashed in profile). */
export async function createActivationLink(user: Pick<User, "id" | "profile">, settings: MembersSettings) {
  void settings;
  const token = newToken();
  await updateProfile(
    user.id,
    { activationHash: hashToken(token), activationExpires: new Date(Date.now() + 7 * 24 * 3600_000).toISOString() },
    user.profile,
  );
  return siteUrl(`/api/auth/activate?uid=${user.id}&key=${encodeURIComponent(token)}`);
}

/**
 * Status transitions as performed by UM admin actions
 * (approve / reject / deactivate / put as pending) including notification e-mails.
 */
export async function changeStatus(user: User, status: "approved" | "rejected" | "inactive" | "pending", by: string, settings: MembersSettings) {
  const prev = user.status;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      status,
      profile: { ...getProfile(user), statusChangedAt: new Date().toISOString(), statusChangedBy: by } as Prisma.InputJsonValue,
    },
  });
  if (status === "approved" && prev !== "approved") {
    // UM sends "approved_email" with a set-password link when an admin approves.
    const link = await createResetLink(user.id, 24 * 3600_000);
    await sendUmEmail("approved_email", user, { password_reset_link: link }, settings);
  } else if (status === "rejected" && prev !== "rejected") {
    await sendUmEmail("rejected_email", user, {}, settings);
  } else if (status === "inactive" && prev !== "inactive") {
    await sendUmEmail("inactive_email", user, {}, settings);
  } else if (status === "pending" && prev !== "pending") {
    await sendUmEmail("pending_email", user, {}, settings);
  }
}
