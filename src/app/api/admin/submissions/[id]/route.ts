import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffSessionOrNull } from "@/lib/session";
import { deleteSubmission, submissionFiles } from "@/modules/site/forms/admin";

export const runtime = "nodejs";

/** Staff JSON access to one submission (GET) and deletion incl. stored files (DELETE). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await staffSessionOrNull())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sub = await prisma.formSubmission.findUnique({ where: { id: Number((await params).id) || 0 } });
  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ...sub, files: submissionFiles(sub.files) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await staffSessionOrNull())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await deleteSubmission(Number((await params).id) || 0);
  return NextResponse.json({ ok: true });
}
