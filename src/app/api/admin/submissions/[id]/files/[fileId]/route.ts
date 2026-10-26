import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffSessionOrNull } from "@/lib/session";
import { readStoredFile } from "@/lib/storage";
import { submissionFiles } from "@/modules/site/forms/admin";

export const runtime = "nodejs";

/** Staff-only download of a form upload / signature PNG belonging to a submission. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; fileId: string }> }) {
  if (!(await staffSessionOrNull())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, fileId } = await params;
  const sub = await prisma.formSubmission.findUnique({ where: { id: Number(id) || 0 } });
  const entry = sub && submissionFiles(sub.files).find((f) => f.fileId === fileId);
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const file = await readStoredFile(fileId);
  if (!file) return NextResponse.json({ error: "File missing" }, { status: 404 });
  const inline = new URL(req.url).searchParams.get("inline") === "1" && /^image\/(png|jpe?g|gif)$/.test(file.rec.mimeType);
  const name = file.rec.originalName.replace(/["\r\n]/g, "_");
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.rec.mimeType || "application/octet-stream",
      "Content-Length": String(file.data.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${name}"; filename*=UTF-8''${encodeURIComponent(file.rec.originalName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
