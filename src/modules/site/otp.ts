import crypto from "crypto";
import { prisma } from "@/lib/db";
import { sendMail, fillTemplate } from "@/lib/mail";

export function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export function generateLinkToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createOtpToken(email: string): Promise<{ otp: string; linkToken: string }> {
  const otp = generateOTP();
  const linkToken = generateLinkToken();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await prisma.otpToken.deleteMany({
    where: { email, verified: false },
  });

  await prisma.otpToken.create({
    data: {
      token: otp,
      email,
      linkToken,
      expiresAt,
    },
  });

  return { otp, linkToken };
}

export async function sendOtpEmail(email: string, otp: string, linkToken: string): Promise<void> {
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/portal/verify-otp?token=${linkToken}`;

  const html = fillTemplate("otp_email", {
    otp,
    verify_url: verifyUrl,
    otp_expiry: "10 minutes",
  });

  await sendMail({
    to: email,
    subject: "Your secure access code for Mustang Mortgage",
    html,
  });
}

export async function verifyOtp(linkToken: string, otp: string): Promise<boolean> {
  const token = await prisma.otpToken.findUnique({
    where: { linkToken },
  });

  if (!token) return false;
  if (token.verified) return false;
  if (token.expiresAt < new Date()) return false;
  if (token.token !== otp) return false;

  await prisma.otpToken.update({
    where: { id: token.id },
    data: { verified: true },
  });

  return true;
}

export async function getVerifiedEmail(linkToken: string): Promise<string | null> {
  const token = await prisma.otpToken.findUnique({
    where: { linkToken },
  });

  if (!token || !token.verified) return null;
  if (token.expiresAt < new Date()) return null;

  return token.email;
}
