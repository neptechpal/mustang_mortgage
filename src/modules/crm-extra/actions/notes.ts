"use server";
// Broker notes + Learning Vault (port of mmcrm-broker-notes.php v2.0.0).
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";

type R = { ok: boolean; message?: string };
const stripTags = (s: string) => s.replace(/<[^>]*>/g, "").trim();
/** wp_kses_post-ish: drop scripts/handlers but keep basic formatting. */
const kses = (s: string) =>
  s
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<(iframe|object|embed|form|style)\b[\s\S]*?<\/\1>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|\S+)/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1="#"');

function refresh(caseId?: number) {
  revalidatePath("/admin/notes");
  if (caseId) revalidatePath(`/admin/cases/${caseId}`);
}

/** mmcrm_bn_save — case_id 0 = general note. */
export async function bnSave(caseId: number, title: string, body: string): Promise<R> {
  const s = await requireStaff();
  if (!stripTags(body || "")) return { ok: false, message: "Please enter a note." };
  await prisma.brokerNote.create({
    data: { caseId: caseId > 0 ? caseId : 0, title: (title || "").trim().slice(0, 300), body: kses(body), author: s.name, authorId: s.uid },
  });
  refresh(caseId);
  return { ok: true, message: "Saved" };
}

/** mmcrm_bn_update — general note + assignCaseId > 0 moves it to that case (new id/author/date). */
export async function bnUpdate(noteId: number, title: string, body: string, assignCaseId = 0): Promise<R> {
  const s = await requireStaff();
  if (!noteId) return { ok: false, message: "Missing note id." };
  if (!stripTags(body || "")) return { ok: false, message: "Please enter a note." };
  const n = await prisma.brokerNote.findUnique({ where: { id: noteId } });
  if (!n) return { ok: false, message: "Invalid request." };
  if (n.caseId === 0 && assignCaseId > 0) {
    await prisma.$transaction([
      prisma.brokerNote.delete({ where: { id: noteId } }),
      prisma.brokerNote.create({ data: { caseId: assignCaseId, title: title.trim(), body: kses(body), author: s.name, authorId: s.uid } }),
    ]);
    refresh(assignCaseId);
  } else {
    await prisma.brokerNote.update({ where: { id: noteId }, data: { title: title.trim(), body: kses(body), createdAt: new Date() } });
    refresh(n.caseId);
  }
  return { ok: true, message: "Updated" };
}

export async function bnDelete(noteId: number): Promise<R> {
  await requireStaff();
  if (!noteId) return { ok: false, message: "Missing note id." };
  const n = await prisma.brokerNote.findUnique({ where: { id: noteId } });
  if (!n) return { ok: false, message: "Invalid request." };
  await prisma.brokerNote.delete({ where: { id: noteId } });
  refresh(n.caseId);
  return { ok: true, message: "Deleted" };
}

const parseTags = (s: string) =>
  Array.from(
    new Set(
      (s || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ).join(", ");

export async function learningSave(fd: FormData): Promise<R> {
  const s = await requireStaff();
  const id = Number(fd.get("learning_id") || 0);
  const title = String(fd.get("learning_title") || "").trim();
  if (!title) return { ok: false, message: "Title is required." };
  const url = String(fd.get("learning_url") || "").trim();
  const data = {
    title,
    url: /^https?:\/\//i.test(url) ? url : url ? `https://${url}` : "",
    summary: kses(String(fd.get("learning_summary") || "")),
    tags: parseTags(String(fd.get("learning_tags") || "")),
    pinned: fd.get("learning_pinned") === "1",
  };
  if (id) await prisma.learningItem.update({ where: { id }, data });
  else await prisma.learningItem.create({ data: { ...data, author: s.name } });
  revalidatePath("/admin/notes/learning");
  return { ok: true, message: "Saved." };
}

export async function learningDelete(id: number): Promise<R> {
  await requireStaff();
  await prisma.learningItem.delete({ where: { id } }).catch(() => undefined);
  revalidatePath("/admin/notes/learning");
  return { ok: true, message: "Deleted." };
}
