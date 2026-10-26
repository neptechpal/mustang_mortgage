import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { saveFormFile } from "@/lib/storage";
import { authPortal, docFiles, logEvent } from "@/modules/crm/cases";
import { evaluateDocs } from "@/modules/crm/automation";
import { UPLOAD_EXT, UPLOAD_MAX_BYTES, UPLOAD_MAX_FILES } from "@/modules/crm/constants";

// mm_upload (nopriv): token-authenticated checklist upload.
export async function POST(req: Request) {
  const fd = await req.formData().catch(() => null);
  if (!fd) return NextResponse.json({ success: false, data: { message: "Upload failed" } }, { status: 400 });
  const c = await authPortal(fd.get("case_id"), fd.get("mm_key"));
  if (!c) return NextResponse.json({ success: false, data: { message: "Invalid link" } }, { status: 403 });
  if (!c.showDocuments) return NextResponse.json({ success: false, data: { message: "Invalid item" } }, { status: 400 });
  const itemId = parseInt(String(fd.get("item_id") ?? ""), 10);
  const doc = c.documents.find((d) => d.id === itemId);
  if (!doc) return NextResponse.json({ success: false, data: { message: "Invalid item" } }, { status: 400 });
  const files = fd.getAll("files[]").concat(fd.getAll("files")).filter((f): f is File => typeof f === "object" && f !== null && "arrayBuffer" in f && (f as File).size > 0);
  if (!files.length) return NextResponse.json({ success: false, data: { message: "No files" } }, { status: 400 });
  if (files.length > UPLOAD_MAX_FILES) return NextResponse.json({ success: false, data: { message: `Please upload at most ${UPLOAD_MAX_FILES} files at a time.` } }, { status: 400 });
  for (const f of files) {
    if (!UPLOAD_EXT.test(f.name)) return NextResponse.json({ success: false, data: { message: `${f.name}: file type not allowed (PDF, JPG, PNG, DOC, DOCX).` } }, { status: 400 });
    if (f.size > UPLOAD_MAX_BYTES) return NextResponse.json({ success: false, data: { message: `${f.name} is too large (max ${UPLOAD_MAX_BYTES / 1024 / 1024} MB).` } }, { status: 400 });
  }
  const added = [];
  for (const f of files) {
    const rec = await saveFormFile(f, `cases/${c.id}/docs`, `case:${c.id}`);
    added.push({ fileId: rec.id, name: rec.originalName, uploadedAt: new Date().toISOString(), by: "client" });
  }
  const prev = docFiles(doc);
  const status = doc.status === "Pending" || doc.status === "Rejected" ? "Received" : doc.status;
  await prisma.caseDocument.update({ where: { id: doc.id }, data: { files: [...prev, ...added] as unknown as Prisma.InputJsonValue, status } });
  for (const a of added) await logEvent(c.id, "docs_upload", "Client uploaded: " + a.name, "client");
  await evaluateDocs(c.id);
  const key = String(fd.get("mm_key"));
  return NextResponse.json({
    success: true,
    data: { files: added.map((a) => ({ name: a.name, url: `/api/portal/file?mm_case=${c.id}&mm_key=${encodeURIComponent(key)}&id=${a.fileId}` })) },
  });
}
