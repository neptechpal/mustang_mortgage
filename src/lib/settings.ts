import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) return fallback;
  if (fallback && typeof fallback === "object" && !Array.isArray(fallback) && row.value && typeof row.value === "object") {
    return { ...fallback, ...(row.value as object) } as T;
  }
  return row.value as T;
}

export async function setSetting(key: string, value: unknown) {
  const v = value as Prisma.InputJsonValue;
  await prisma.setting.upsert({ where: { key }, create: { key, value: v }, update: { value: v } });
}
