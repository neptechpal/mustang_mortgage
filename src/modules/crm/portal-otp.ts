import { cookies } from "next/headers";
import { keyedHash } from "@/lib/crypto-box";
import { readJwt, signJwt, staffSessionOrNull } from "@/lib/session";

// Client portal links (?mm_case=&mm_key=) also need a one-time code emailed to an address on the case.
// Once verified, a signed cookie unlocks that case's portal in this browser for UNLOCK_HOURS.
// Set PORTAL_OTP=off to switch the extra step off (for example if email delivery is down).

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_SENDS = 3; // per case per 15 minutes
export const UNLOCK_HOURS = 12;

export const portalOtpRequired = () => process.env.PORTAL_OTP !== "off";

type CaseLike = { id: number; portalToken: string };

export const unlockCookieName = (caseId: number) => `mm_po_${caseId}`;
const tokenFingerprint = (c: CaseLike) => keyedHash(c.portalToken, "portal-link").slice(0, 16);
export const hashPortalCode = (caseId: number, code: string) => keyedHash(`${caseId}:${code}`, "portal-otp");

/** True when this browser may open the case's portal: code already verified, staff preview, or the step is switched off. */
export async function portalUnlocked(c: CaseLike): Promise<boolean> {
  if (!portalOtpRequired()) return true;
  if (await staffSessionOrNull()) return true;
  const t = await readJwt<{ cid: number; fp: string }>((await cookies()).get(unlockCookieName(c.id))?.value);
  return !!t && t.cid === c.id && t.fp === tokenFingerprint(c);
}

export async function setPortalUnlocked(c: CaseLike) {
  (await cookies()).set(unlockCookieName(c.id), await signJwt({ cid: c.id, fp: tokenFingerprint(c) }, UNLOCK_HOURS * 3600), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: UNLOCK_HOURS * 3600,
  });
}

export const maskEmail = (e: string) => {
  const [u, d] = e.split("@");
  return `${u.slice(0, 1)}${"*".repeat(Math.max(2, Math.min(5, u.length - 1)))}@${d}`;
};

/** Valid addresses on the case. The code can only ever go to one of these, never to an address typed by the visitor. */
export const validEmails = (list: string[]) => list.filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
