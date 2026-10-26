import { prisma } from "@/lib/db";
import { fmtDate } from "./cases";
import type { NoteView } from "../components/BrokerNotes";

/** "M j, Y g:i a" (or with " @ " separator). */
export function noteDate(d: Date, sep = " ") {
  const date = fmtDate(d, { month: "short", day: "numeric", year: "numeric" });
  const time = fmtDate(d, { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase().replace(/\s/g, " ");
  return `${date}${sep}${time}`;
}

export async function notesFor(caseId: number, sep = " @ "): Promise<NoteView[]> {
  const rows = await prisma.brokerNote.findMany({ where: { caseId }, orderBy: { createdAt: "desc" } });
  return rows.map((n) => ({ id: n.id, title: n.title, body: n.body, author: n.author, date: noteDate(n.createdAt, sep) }));
}

/** Shared append helper for wizard, form submissions and mobile field notes. */
export async function addBrokerNote(caseId: number, title: string, body: string, author = 'System', authorId = 0, sourceKey?: string) {
  return prisma.brokerNote.create({ data: { caseId, title: title.replace(/<[^>]*>/g, '').slice(0, 300), body, author, authorId, sourceKey } });
}
