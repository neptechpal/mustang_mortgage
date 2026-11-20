"use server";

import { randomInt, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { escapeHtml, sendMail } from "@/lib/mail";
import { clientIp, clearHits, hit, isLimited } from "@/modules/members/security";
import { applicantEmails } from "./applicants";
import { authPortalToken, logEvent } from "./cases";
import { OTP_MAX_ATTEMPTS, OTP_MAX_SENDS, OTP_TTL_MINUTES, hashPortalCode, maskEmail, setPortalUnlocked, validEmails } from "./portal-otp";

export type PortalOtpState = { error?: string; sentTo?: string };

const field = (fd: FormData, k: string) => String(fd.get(k) ?? "");

async function caseFromForm(fd: FormData) {
  const c = await authPortalToken(field(fd, "mm_case"), field(fd, "mm_key"));
  return c;
}

/** Emails a 6-digit code to one of the addresses already on the case. */
export async function sendPortalCodeAction(_prev: PortalOtpState, fd: FormData): Promise<PortalOtpState> {
  const c = await caseFromForm(fd);
  if (!c) return { error: "This link is not valid or the portal is closed." };
  const emails = validEmails(applicantEmails(c));
  if (!emails.length) return { error: "We do not have an email address on file for this link. Please contact us and we will help you in." };
  const to = emails[Math.min(emails.length - 1, Math.max(0, parseInt(field(fd, "emailIx"), 10) || 0))];

  const ip = await clientIp();
  const ipKey = `portal-otp:ip:${ip}`;
  const since = new Date(Date.now() - 15 * 60_000);
  const recent = await prisma.portalOtp.count({ where: { caseId: c.id, createdAt: { gte: since } } });
  if (recent >= OTP_MAX_SENDS || isLimited(ipKey, 10, 15 * 60_000)) return { error: "We have already sent several codes. Please wait 15 minutes, then try again." };
  hit(ipKey);

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.portalOtp.updateMany({ where: { caseId: c.id, consumedAt: null }, data: { consumedAt: new Date() } });
  await prisma.portalOtp.create({ data: { caseId: c.id, codeHash: hashPortalCode(c.id, code), sentTo: maskEmail(to), expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000), ip } });

  const r = await sendMail({
    to,
    subject: `Your Mustang Mortgage secure code: ${code}`,
    html:
      `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1b1712">` +
      `<p>Use this code to open your secure portal:</p>` +
      `<p style="font-size:32px;letter-spacing:6px;font-weight:700;margin:16px 0">${escapeHtml(code)}</p>` +
      `<p>It works for ${OTP_TTL_MINUTES} minutes. If you did not ask for it, you can ignore this email and nobody will be able to open your portal.</p>` +
      `<p style="color:#6b6155;font-size:13px">Mustang Mortgage will never ask you to read this code out over the phone.</p></div>`,
    context: `case:${c.id}:otp`,
  });
  if (!r.ok && process.env.NODE_ENV !== "production") console.log(`[dev] portal code for case ${c.id} (${to}): ${code}  (email not sent: ${r.error})`);
  if (!r.ok && process.env.NODE_ENV === "production") return { error: "We could not send the email just now. Please try again in a minute or contact us." };
  return { sentTo: maskEmail(to) };
}

/** Checks the code; on success unlocks this case's portal in this browser. */
export async function verifyPortalCodeAction(_prev: PortalOtpState, fd: FormData): Promise<PortalOtpState> {
  const c = await caseFromForm(fd);
  if (!c) return { error: "This link is not valid or the portal is closed." };
  const code = field(fd, "code").replace(/\D/g, "");
  if (code.length !== 6) return { error: "Enter the 6-digit code from the email." };

  const ipKey = `portal-otp-verify:ip:${await clientIp()}`;
  if (isLimited(ipKey, 30, 15 * 60_000)) return { error: "Too many attempts. Please wait 15 minutes and try again." };

  const row = await prisma.portalOtp.findFirst({ where: { caseId: c.id, consumedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  if (!row) return { error: "That code has expired. Send a new one." };
  const bumped = await prisma.portalOtp.updateMany({ where: { id: row.id, attempts: { lt: OTP_MAX_ATTEMPTS } }, data: { attempts: { increment: 1 } } });
  if (bumped.count === 0) return { error: "Too many incorrect tries for that code. Send a new one." };

  const want = Buffer.from(row.codeHash);
  const got = Buffer.from(hashPortalCode(c.id, code));
  if (want.length !== got.length || !timingSafeEqual(want, got)) {
    hit(ipKey);
    const left = OTP_MAX_ATTEMPTS - (row.attempts + 1);
    return { error: left > 0 ? `That code is not right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many incorrect tries for that code. Send a new one." };
  }
  const used = await prisma.portalOtp.updateMany({ where: { id: row.id, consumedAt: null }, data: { consumedAt: new Date() } });
  if (used.count !== 1) return { error: "That code has already been used. Send a new one." };

  clearHits(ipKey);
  await setPortalUnlocked(c);
  await logEvent(c.id, "otp", "Client unlocked the portal with an emailed code", "client");
  const step = field(fd, "step");
  const q = new URLSearchParams({ mm_case: String(c.id), mm_key: c.portalToken, ...(/^[a-z0-9-]{1,30}$/.test(step) ? { step } : {}) });
  redirect(`/portal?${q.toString()}`);
}
