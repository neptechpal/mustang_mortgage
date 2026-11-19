import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function getSiteSettings(key: string): Promise<Prisma.JsonValue | null> {
  const setting = await prisma.siteSettings.findUnique({
    where: { key },
  });
  return setting?.value || null;
}

export async function setSiteSettings(key: string, value: Prisma.InputJsonValue): Promise<void> {
  await prisma.siteSettings.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function getEnquiryEmailRecipients(): Promise<string[]> {
  const setting = await getSiteSettings("enquiry.recipients");
  if (Array.isArray(setting)) {
    const emails = setting.filter((v): v is string => typeof v === "string" && v.trim() !== "");
    if (emails.length) return emails;
  }
  // Default to general business email
  return ["info@mustangmortgage.com.au"];
}

export async function setEnquiryEmailRecipients(recipients: string[]): Promise<void> {
  await setSiteSettings("enquiry.recipients", recipients);
}
