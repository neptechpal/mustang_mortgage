import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { staffSessionOrNull } from "@/lib/session";
import { saveFormFile } from "@/lib/storage";
import { docFiles } from "@/modules/crm/cases";
import { evaluateDocs } from "@/modules/crm/automation";

// Staff upload into a checklist row (route handler: no server-action body limit).
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await staffSessionOrNull();
  if (!s) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const caseId = Number((await ctx.params).id);
  const fd = await req.formData().catch(() => null);
  const docId = Number(fd?.get("doc_id"));
  const d = await prisma.caseDocument.findFirst({ where: { id: docId, caseId } });
  if (!fd || !d) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  const files = fd.getAll("files").filter((f): f is File => typeof f === "object" && f !== null && (f as File).size > 0);
  const added = [];
  for (const f of files) {
    try {
      const rec = await saveFormFile(f, `cases/${caseId}/docs`, `case:${caseId}`);
      added.push({ fileId: rec.id, name: rec.originalName, uploadedAt: new Date().toISOString(), by: s.name });
    } catch (e) {
      return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
    }
  }
  await prisma.caseDocument.update({ where: { id: d.id }, data: { files: [...docFiles(d), ...added] as unknown as Prisma.InputJsonValue } });
  await evaluateDocs(caseId);
  return NextResponse.json({ ok: true, message: `${added.length} file(s) uploaded` });
}
