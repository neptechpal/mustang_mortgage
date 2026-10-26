"use server";
// mmcrm_flex_save / mmcrm_flex_snippets / mmcrm_portal_toggle
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { COUNTED, saveSnippets, setPortal, portalOffOnFlex } from "../lib/flex";

async function state(caseId: number) {
  const s = await prisma.flexState.findUnique({ where: { caseId } });
  return {
    overrides: { ...((s?.overrides ?? {}) as Record<string, string>) },
    done: { ...((s?.done ?? {}) as Record<string, boolean>) },
    texts: { ...((s?.texts ?? {}) as Record<string, string>) },
  };
}
async function put(caseId: number, d: Awaited<ReturnType<typeof state>>) {
  await prisma.flexState.upsert({ where: { caseId }, create: { caseId, ...d }, update: d });
}

export async function flexOverride(caseId: number, id: string, value: string | null) {
  await requireStaff();
  const key = id.replace(/[^a-zA-Z0-9_.\-]/g, "");
  const d = await state(caseId);
  if (value === null) delete d.overrides[key];
  else d.overrides[key] = value.slice(0, 5000);
  await put(caseId, d);
  return { ok: true };
}

export async function flexText(caseId: number, id: string, value: string) {
  await requireStaff();
  const d = await state(caseId);
  d.texts[id.replace(/[^a-zA-Z0-9_]/g, "")] = value.slice(0, 20000);
  await put(caseId, d);
  return { ok: true };
}

export async function flexDone(caseId: number, section: string, on: boolean) {
  await requireStaff();
  const d = await state(caseId);
  if (on) d.done[section] = true;
  else delete d.done[section];
  await put(caseId, d);
  let closed = false;
  if (COUNTED.every((s) => d.done[s]) && (await portalOffOnFlex())) {
    const c = await prisma.case.findUnique({ where: { id: caseId }, select: { portalClosed: true } });
    if (c && !c.portalClosed) {
      await setPortal(caseId, false, "All sections entered in Flex");
      closed = true;
    }
  }
  revalidatePath(`/admin/cases/${caseId}`);
  return { ok: true, portal_closed: closed };
}

export async function flexFinish(caseId: number) {
  await requireStaff();
  const d = await state(caseId);
  for (const s of COUNTED) d.done[s] = true;
  await put(caseId, d);
  await setPortal(caseId, false, "Finished in Flex");
  revalidatePath(`/admin/cases/${caseId}`);
  return { ok: true, portal_closed: true };
}

export async function flexSnippets(items: { t: string; x: string }[]) {
  await requireStaff();
  await saveSnippets(items);
  return { ok: true };
}

export async function portalToggle(caseId: number, open: boolean) {
  await requireStaff();
  await setPortal(caseId, open, open ? "manually re-opened" : "manually closed");
  revalidatePath(`/admin/cases/${caseId}`);
  return { ok: true };
}
