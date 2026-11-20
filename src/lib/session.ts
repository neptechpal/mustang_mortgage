import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { areasFor, canAccessPath } from "./access";
import { prisma } from "./db";

export const SESSION_COOKIE = "mm_session";
export const PENDING_COOKIE = "mm_2fa"; // password accepted, second factor still outstanding
export const TRUST_COOKIE = "mm_td"; // "remember this device" marker
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days ("remember me" length in WP)
const PENDING_TTL = 60 * 10;
export const TRUST_DAYS = 30;
const TRUST_TTL = 60 * 60 * 24 * TRUST_DAYS;

export type SessionPayload = {
  uid: number;
  role: Role;
  name: string;
  /** Access areas ("*" = everything). Refreshed from the database every few minutes by the middleware. */
  areas?: string[];
  /** Epoch seconds the areas/status were last read from the database. */
  pat?: number;
  /** 1 once the second factor was completed (always set for staff sessions). */
  mfa?: 1;
  /** Epoch seconds the login happened (absolute lifetime cap across refreshes). */
  ses?: number;
  /** 1 = persistent cookie ("keep me signed in"), 0 = browser-session cookie. */
  rem?: 0 | 1;
};

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 chars");
  return new TextEncoder().encode(secret);
}

const nowSec = () => Math.floor(Date.now() / 1000);

export async function signJwt(payload: Record<string, unknown>, ttlSeconds: number) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${ttlSeconds}s`).sign(key());
}

export async function readJwt<T>(token?: string): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload as unknown as T;
  } catch {
    return null;
  }
}

export async function signSession(payload: SessionPayload) {
  return signJwt(payload, MAX_AGE);
}

export async function verifySession(token?: string): Promise<SessionPayload | null> {
  return readJwt<SessionPayload>(token);
}

type SessionUser = { id: number; role: Role; displayName: string; username: string; permissions?: unknown };

async function setSessionCookie(user: SessionUser, opts: { remember: boolean; ses?: number }) {
  const staff = user.role === "ADMIN" || user.role === "STAFF";
  const token = await signSession({
    uid: user.id,
    role: user.role,
    name: user.displayName || user.username,
    areas: staff ? areasFor(user.role, user.permissions) : undefined,
    pat: nowSec(),
    ses: opts.ses ?? nowSec(),
    rem: opts.remember ? 1 : 0,
    ...(staff ? { mfa: 1 as const } : {}),
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(opts.remember ? { maxAge: MAX_AGE } : {}),
  });
}

/** Full login. For staff this must only be called once the second factor has been completed. */
export async function createSession(user: SessionUser, remember = true) {
  await setSessionCookie(user, { remember });
}

/** Re-issues the session with fresh access areas (keeps the original login time and cookie persistence). */
export async function refreshSession(user: SessionUser, prev: SessionPayload) {
  await setSessionCookie(user, { remember: prev.rem !== 0, ses: prev.ses });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession() {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function getCurrentUser() {
  const s = await getSession();
  if (!s) return null;
  return prisma.user.findUnique({ where: { id: s.uid } });
}

export const isStaff = (role?: Role | null) => role === "ADMIN" || role === "STAFF";

/** For server components / actions under /admin. Redirects to login when not staff. */
export async function requireStaff() {
  const s = await getSession();
  if (!s || !isStaff(s.role)) redirect("/login?redirect_to=/admin");
  return s;
}

/** Staff who may use the admin area that owns `path` (e.g. "/admin/testimonials"); others go to the no-access page. */
export async function requireArea(path: string) {
  const s = await requireStaff();
  if (!canAccessPath(s.role, s.areas, path)) redirect("/admin/no-access");
  return s;
}

export async function requireAdmin() {
  const s = await getSession();
  if (!s || s.role !== "ADMIN") redirect("/login?redirect_to=/admin");
  return s;
}

export async function requireUser(redirectTo = "/account") {
  const s = await getSession();
  if (!s) redirect(`/login?redirect_to=${encodeURIComponent(redirectTo)}`);
  return s;
}

/** For route handlers: returns session or null (caller returns 401). */
export async function staffSessionOrNull() {
  const s = await getSession();
  return s && isStaff(s.role) ? s : null;
}

/* ---------------- second-factor step (between password and session) ---------------- */

/** ok/td are set once the first authenticator code has been confirmed during setup (td = remember this device). */
export type PendingLogin = { uid: number; purpose: "verify" | "setup"; rem: 0 | 1; next: string; ok?: 1; td?: 0 | 1 };

export async function startPendingLogin(p: PendingLogin) {
  (await cookies()).set(PENDING_COOKIE, await signJwt(p, PENDING_TTL), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PENDING_TTL,
  });
}

export async function readPendingLogin() {
  return readJwt<PendingLogin>((await cookies()).get(PENDING_COOKIE)?.value);
}

export async function clearPendingLogin() {
  (await cookies()).delete(PENDING_COOKIE);
}

/* ---------------- "remember this device for 30 days" ---------------- */

// The marker is bound to the user's current 2FA secret, so re-enrolling or resetting 2FA
// invalidates every previously trusted device.
const trustFingerprint = (u: { id: number; twoFactorSecret: string | null }) =>
  createHash("sha256").update(`${u.id}:${u.twoFactorSecret ?? ""}`).digest("hex").slice(0, 24);

export async function trustThisDevice(u: { id: number; twoFactorSecret: string | null }) {
  (await cookies()).set(TRUST_COOKIE, await signJwt({ uid: u.id, fp: trustFingerprint(u) }, TRUST_TTL), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TRUST_TTL,
  });
}

export async function isTrustedDevice(u: { id: number; twoFactorSecret: string | null }) {
  const t = await readJwt<{ uid: number; fp: string }>((await cookies()).get(TRUST_COOKIE)?.value);
  return !!t && t.uid === u.id && t.fp === trustFingerprint(u);
}
