"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createSession, destroySession, isStaff, isTrustedDevice, startPendingLogin } from "@/lib/session";
import { verifyWpPassword, hashPassword } from "@/lib/wp-password";
import { getMembersSettings } from "./settings";
import { clientIp, clearHits, hit, isLimited, safeRedirect } from "./security";
import { getProfile } from "./profile";
import { str, validatePassword, type FieldErrors } from "./validation";
import { sendUmEmail } from "./emails";
import { createResetLink, lookupResetToken, setUserPassword, updateProfile } from "./service";

export type FormState = {
  error?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
  message?: string;
};

const LOGIN_FAIL = "Password is incorrect. Please try again.";
const STATUS_MESSAGES: Record<string, string> = {
  inactive: "Your account has been disabled.",
  pending: "Your account has not been approved yet.",
  checkmail: "Your account is awaiting email verification.",
  rejected: "Your membership request has been rejected.",
};
// bcrypt hash of a random string: used to equalise timing when the user does not exist.
let dummyHash: string | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword(crypto.randomBytes(16).toString("hex")));

const MAX_FAILS_PER_ID = 5;
const MAX_FAILS_PER_IP = 20;
const FAIL_WINDOW = 15 * 60_000;

async function findByLogin(ident: string): Promise<User | null> {
  const v = ident.trim();
  if (!v) return null;
  if (v.includes("@")) {
    const byEmail = await prisma.user.findFirst({ where: { email: { equals: v, mode: "insensitive" } } });
    if (byEmail) return byEmail;
  }
  return prisma.user.findFirst({ where: { username: { equals: v, mode: "insensitive" } } });
}

function defaultRedirect(user: Pick<User, "role">) {
  return isStaff(user.role) ? "/admin" : "/account";
}

async function startSession(user: User, remember: boolean) {
  await createSession(user, remember);
}

/** Staff must pass a second factor (or be on a device trusted for 30 days) before a session exists. */
async function finishPasswordLogin(user: User, remember: boolean, next: string): Promise<never> {
  if (!isStaff(user.role)) {
    await startSession(user, remember);
    redirect(next);
  }
  if (user.twoFactorEnabled && user.twoFactorSecret) {
    if (await isTrustedDevice(user)) {
      await startSession(user, remember);
      redirect(next);
    }
    await startPendingLogin({ uid: user.id, purpose: "verify", rem: remember ? 1 : 0, next });
    redirect("/login/verify");
  }
  await startPendingLogin({ uid: user.id, purpose: "setup", rem: remember ? 1 : 0, next });
  redirect("/login/setup-2fa");
}

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const username = str(fd, "username").trim();
  const password = str(fd, "user_password");
  const remember = str(fd, "rememberme") === "1";
  const redirectTo = str(fd, "redirect_to");
  const values = { username };

  // honeypot ("Only fill in if you are not human")
  if (str(fd, "um_request")) return { error: LOGIN_FAIL, values };

  const fieldErrors: FieldErrors = {};
  if (!username) fieldErrors.username = "Please enter your username or email";
  if (!password) fieldErrors.user_password = "Please enter your password";
  if (Object.keys(fieldErrors).length) return { fieldErrors, values };

  const ip = await clientIp();
  const idKey = `login:id:${username.toLowerCase()}`;
  const ipKey = `login:ip:${ip}`;
  if (isLimited(idKey, MAX_FAILS_PER_ID, FAIL_WINDOW) || isLimited(ipKey, MAX_FAILS_PER_IP, FAIL_WINDOW)) {
    return { error: "Too many failed login attempts. Please try again in 15 minutes.", values };
  }

  const user = await findByLogin(username);
  const ok = user ? verifyWpPassword(password, user.passwordHash) : (verifyWpPassword(password, getDummyHash()), false);
  if (!user || !ok) {
    hit(idKey);
    hit(ipKey);
    return { fieldErrors: { user_password: LOGIN_FAIL }, values };
  }

  if (user.status !== "approved") {
    return { error: STATUS_MESSAGES[user.status] ?? STATUS_MESSAGES.inactive, values };
  }

  clearHits(idKey);
  // Upgrade legacy WordPress hashes ($wp$, phpass, md5) to bcrypt on successful login.
  const legacy = !/^\$2[aby]\$/.test(user.passwordHash);
  const profile = getProfile(user);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(legacy ? { passwordHash: hashPassword(password) } : {}),
      profile: { ...profile, lastLogin: new Date().toISOString(), pwResetAttempts: 0 },
    },
  });

  return finishPasswordLogin(user, remember, safeRedirect(redirectTo, defaultRedirect(user)));
}

// Public sign-up is off: staff accounts are created by an admin, and clients use their emailed secure link.
export async function registerAction(): Promise<FormState> {
  return { error: "Registration is not available." };
}

export async function requestResetAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const ident = str(fd, "username_b").trim();
  if (str(fd, "um_request")) redirect("/password-reset?updated=checkemail");
  if (!ident) return { fieldErrors: { username_b: "Please provide your username or email" } };

  const ip = await clientIp();
  const ipKey = `reset:ip:${ip}`;
  if (isLimited(ipKey, 5, 60 * 60_000)) return { error: "Too many password reset requests. Please try again later.", values: { username_b: ident } };
  hit(ipKey);

  const s = await getMembersSettings();
  const user = await findByLogin(ident);
  if (user && user.status === "approved") {
    const profile = getProfile(user);
    const attempts = Number(profile.pwResetAttempts || 0);
    const userKey = `reset:user:${user.id}`;
    const limited = (s.resetPasswordLimit > 0 && attempts >= s.resetPasswordLimit) || isLimited(userKey, 3, 60 * 60_000);
    // Silently skip when over the limit so the response never reveals whether an account exists.
    if (!limited) {
      hit(userKey);
      await updateProfile(user.id, { pwResetAttempts: attempts + 1 }, user.profile);
      const link = await createResetLink(user.id);
      await sendUmEmail("resetpw_email", user, { password_reset_link: link }, { ...s, emails: { ...s.emails, resetpw_email: { ...s.emails.resetpw_email, on: true } } });
    }
  }
  redirect("/password-reset?updated=checkemail");
}

export async function setNewPasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const key = str(fd, "rp_key");
  const pw = str(fd, "user_password");
  const confirm = str(fd, "confirm_user_password");
  const found = await lookupResetToken(key);
  if (!found.ok) redirect(`/password-reset?updated=${found.reason}`);
  const s = await getMembersSettings();
  const fe: FieldErrors = {};
  const p = validatePassword(pw, s, { username: found.user.username, email: found.user.email });
  if (p) fe.user_password = p;
  if (!confirm) fe.confirm_user_password = "You must confirm your new password";
  else if (pw && confirm !== pw) fe.confirm_user_password = "Your passwords do not match";
  if (Object.keys(fe).length) return { fieldErrors: fe };

  await setUserPassword(found.user.id, pw);
  await updateProfile(found.user.id, { pwResetAttempts: 0 });
  await sendUmEmail("changedpw_email", found.user, {}, s);
  redirect("/password-reset?updated=password_changed");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}
