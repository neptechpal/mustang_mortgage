import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "./db";

export const SESSION_COOKIE = "mm_session";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days ("remember me" length in WP)

export type SessionPayload = { uid: number; role: Role; name: string };

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("SESSION_SECRET must be at least 32 chars");
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(key());
}

export async function verifySession(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(user: { id: number; role: Role; displayName: string; username: string }) {
  const token = await signSession({ uid: user.id, role: user.role, name: user.displayName || user.username });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
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
