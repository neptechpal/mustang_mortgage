"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createSession, destroySession, signSession, SESSION_COOKIE, isStaff } from "@/lib/session";
import { verifyWpPassword, hashPassword } from "@/lib/wp-password";
import { getMembersSettings } from "./settings";
import { clientIp, clearHits, hit, isLimited, safeRedirect } from "./security";
import { fullName, getProfile, profileUrl } from "./profile";
import { str, validateEmail, validatePassword, validateUsername, type FieldErrors } from "./validation";
import { sendUmEmail, submittedRegistration } from "./emails";
import { createActivationLink, createResetLink, lookupResetToken, setUserPassword, updateProfile } from "./service";

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
  if (remember) {
    await createSession(user);
    return;
  }
  // "Keep me signed in" unchecked: browser-session cookie (JWT itself still expires).
  const token = await signSession({ uid: user.id, role: user.role, name: user.displayName || user.username });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
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

  await startSession(user, remember);
  redirect(safeRedirect(redirectTo, defaultRedirect(user)));
}

export async function registerAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const s = await getMembersSettings();
  const values = {
    user_login: str(fd, "user_login").trim(),
    first_name: str(fd, "first_name").trim(),
    last_name: str(fd, "last_name").trim(),
    user_email: str(fd, "user_email").trim(),
  };
  if (!s.registrationEnabled) return { error: "Registration is currently disabled.", values };
  if (str(fd, "um_request")) return { error: "Registration failed.", values };

  const ip = await clientIp();
  const ipKey = `register:ip:${ip}`;
  if (isLimited(ipKey, 5, 60 * 60_000)) return { error: "Too many registrations from your network. Please try again later.", values };

  const password = str(fd, "user_password");
  const confirm = str(fd, "confirm_user_password");
  const fe: FieldErrors = {};
  const u = await validateUsername(values.user_login, s);
  if (u) fe.user_login = u;
  if (values.first_name.length > 100) fe.first_name = "This field must contain less than 100 characters";
  if (values.last_name.length > 100) fe.last_name = "This field must contain less than 100 characters";
  const e = await validateEmail(values.user_email, s);
  if (e) fe.user_email = e;
  const p = password
    ? validatePassword(password, s, { username: values.user_login, email: values.user_email })
    : "Password is required";
  if (p) fe.user_password = p;
  if (!confirm && password) fe.confirm_user_password = "Please confirm your password";
  else if (password && confirm !== password) fe.confirm_user_password = "Your passwords do not match";
  if (Object.keys(fe).length) return { fieldErrors: fe, values };

  hit(ipKey);
  const status = s.registerStatus;
  const user = await prisma.user.create({
    data: {
      username: values.user_login,
      email: values.user_email.toLowerCase(),
      firstName: values.first_name,
      lastName: values.last_name,
      displayName: fullName(values.first_name, values.last_name, values.user_login),
      passwordHash: hashPassword(password),
      role: "MEMBER",
      status,
      profile: { registeredVia: "register_form", hideInMembers: "No", profilePrivacy: "Everyone" },
    },
  });

  const submitted = submittedRegistration({
    Username: user.username,
    "First Name": user.firstName,
    "Last Name": user.lastName,
    "E-mail Address": user.email,
  });

  if (status === "approved") {
    await sendUmEmail("welcome_email", user, {}, s);
    await sendUmEmail("notification_new_user", user, { submitted_registration: submitted }, s);
    if (s.afterRegister === "redirect_url" && s.afterRegisterUrl) {
      await createSession(user);
      redirect(safeRedirect(s.afterRegisterUrl, profileUrl(user.username)));
    }
    await createSession(user);
    redirect(profileUrl(user.username));
  }

  if (status === "checkmail") {
    const link = await createActivationLink(user, s);
    // Activation e-mail is mandatory for this status regardless of the toggle.
    await sendUmEmail("checkmail_email", user, { account_activation_link: link }, { ...s, emails: { ...s.emails, checkmail_email: { ...s.emails.checkmail_email, on: true } } });
    await sendUmEmail("notification_new_user", user, { submitted_registration: submitted }, s);
    return { message: s.checkmailMessage };
  }

  await sendUmEmail("pending_email", user, {}, s);
  await sendUmEmail("notification_review", user, { submitted_registration: submitted }, s);
  return { message: s.pendingMessage };
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
