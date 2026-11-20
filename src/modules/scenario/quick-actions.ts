"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { prisma } from "@/lib/db";
import { requireArea, readJwt, signJwt } from "@/lib/session";
import { addBrokerNote } from "@/modules/crm-extra/lib/notes";
import { QuickInputSchema } from "./quick-input";
import { quickNote } from "./quick-core";
import { runQuickScenario, type QuickResult } from "./quick";

export async function quickScenarioAction(raw: unknown) {
  const staff = await requireArea("/admin/quick-scenario");
  const parsed = QuickInputSchema.safeParse(raw);
  if (!parsed.success) return { error: "Check the amounts and selections. Notes must be no more than 500 characters." };
  const result = await runQuickScenario(parsed.data);
  // Save only server-produced results, bound to the staff member; the browser cannot edit a saved assessment.
  const saveToken = await signJwt({ purpose: "quick-scenario", uid: staff.uid, result }, 8 * 60 * 60);
  return { result, saveToken };
}

export async function searchQuickCasesAction(raw: unknown) {
  await requireArea("/admin/quick-scenario");
  const query = z.string().trim().max(100).parse(raw);
  const id = /^\d+$/.test(query) ? Number(query) : undefined;
  const rows = await prisma.case.findMany({
    where: { status: "active", ...(query ? { OR: [
      ...(id && Number.isSafeInteger(id) ? [{ id }] : []),
      { title: { contains: query, mode: "insensitive" as const } },
      { app1Name: { contains: query, mode: "insensitive" as const } },
      { legacyName: { contains: query, mode: "insensitive" as const } },
    ] } : {}) },
    select: { id: true, title: true, app1Name: true, legacyName: true },
    orderBy: { updatedAt: "desc" }, take: 12,
  });
  return rows.map((c) => ({ id: c.id, label: `#${c.id} · ${c.title || c.app1Name || c.legacyName || "Untitled case"}` }));
}

export async function saveQuickScenarioAction(caseId: unknown, token: unknown) {
  const staff = await requireArea("/admin/quick-scenario");
  const id = z.number().int().positive().parse(caseId);
  const signed = await readJwt<{ purpose: string; uid: number; result: QuickResult }>(z.string().max(250_000).parse(token));
  if (!signed || signed.purpose !== "quick-scenario" || signed.uid !== staff.uid) return { error: "This saved session has expired. Run the scenario again before saving it." };
  const c = await prisma.case.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!c || c.status !== "active") return { error: "Choose an active case that still exists." };
  const note = quickNote(signed.result);
  await addBrokerNote(id, note.title, note.body, staff.name, staff.uid);
  revalidatePath(`/admin/cases/${id}`);
  return { ok: true };
}
