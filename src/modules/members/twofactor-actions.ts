"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { openText } from "@/lib/crypto-box";
import { clearPendingLogin, createSession, isStaff, readPendingLogin, startPendingLogin, trustThisDevice } from "@/lib/session";
import { consumeBackupCode, generateBackupCodes, hashBackupCodes, verifyTotp } from "@/lib/totp";
import { clearHits, hit, isLimited } from "./security";
import { twoFactorAad } from "./twofactor";
import { str } from "./validation";

export type TwoFactorState = { error?: string; codes?: string[]; next?: string };

const MAX_FAILS = 5;
const WINDOW = 15 * 60_000;

async function pendingUser(purpose: "verify" | "setup") {
  const p = await readPendingLogin();
  if (!p || p.purpose !== purpose) redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: p.uid } });
  if (!user || user.status !== "approved" || !isStaff(user.role)) {
    await clearPendingLogin();
    redirect("/login");
  }
  return { p, user };
}

/** Second step of every staff login: authenticator code or one-time backup code. */
export async function verifyLoginAction(_prev: TwoFactorState, fd: FormData): Promise<TwoFactorState> {
  const { p, user } = await pendingUser("verify");
  if (!user.twoFactorEnabled || !user.twoFactorSecret) redirect("/login/setup-2fa");

  const key = `tfa:${user.id}`;
  if (isLimited(key, MAX_FAILS, WINDOW)) return { error: "Too many incorrect codes. Please wait 15 minutes and log in again." };

  const code = str(fd, "code").trim();
  const trust = str(fd, "trust") === "1";
  let ok = false;

  const step = verifyTotp(openText(user.twoFactorSecret, twoFactorAad(user.id)), code, user.twoFactorLastStep);
  if (step !== null) {
    // The step must move forward atomically so the same code cannot be used twice, even concurrently.
    const r = await prisma.user.updateMany({
      where: { id: user.id, OR: [{ twoFactorLastStep: null }, { twoFactorLastStep: { lt: step } }] },
      data: { twoFactorLastStep: step },
    });
    ok = r.count === 1;
  } else {
    const remaining = consumeBackupCode(user.twoFactorBackupCodes, code);
    if (remaining !== null) {
      const r = await prisma.user.updateMany({ where: { id: user.id, twoFactorBackupCodes: user.twoFactorBackupCodes }, data: { twoFactorBackupCodes: remaining } });
      ok = r.count === 1;
    }
  }
  if (!ok) {
    hit(key);
    return { error: "That code is incorrect or has already been used." };
  }

  clearHits(key);
  await clearPendingLogin();
  await createSession(user, p.rem === 1);
  if (trust) await trustThisDevice(user);
  redirect(p.next);
}

/** Confirms the first code from the authenticator app, turns 2FA on and shows the backup codes once. */
export async function confirmSetupAction(_prev: TwoFactorState, fd: FormData): Promise<TwoFactorState> {
  const { p, user } = await pendingUser("setup");
  if (user.twoFactorEnabled || !user.twoFactorSecret) redirect("/login");

  const key = `tfa-setup:${user.id}`;
  if (isLimited(key, MAX_FAILS, WINDOW)) return { error: "Too many incorrect codes. Please wait 15 minutes and log in again." };

  const step = verifyTotp(openText(user.twoFactorSecret, twoFactorAad(user.id)), str(fd, "code").trim());
  if (step === null) {
    hit(key);
    return { error: "That code is incorrect. Check the time on your phone and try the newest code." };
  }

  const codes = generateBackupCodes(10);
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true, twoFactorBackupCodes: hashBackupCodes(codes), twoFactorLastStep: step } });
  clearHits(key);
  // The session is only created in finishSetupAction, after the backup codes have been shown.
  await startPendingLogin({ ...p, ok: 1, td: str(fd, "trust") === "1" ? 1 : 0 });
  return { codes, next: p.next };
}

/** Last step of first-time setup: opens the session once the user has seen their backup codes. */
export async function finishSetupAction() {
  const { p, user } = await pendingUser("setup");
  if (p.ok !== 1 || !user.twoFactorEnabled) redirect("/login");
  await clearPendingLogin();
  await createSession(user, p.rem === 1);
  if (p.td === 1) await trustThisDevice(user);
  redirect(p.next);
}

export async function cancelLoginAction() {
  await clearPendingLogin();
  redirect("/login");
}
