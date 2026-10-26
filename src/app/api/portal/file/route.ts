import { NextResponse } from "next/server";
import { readStoredFile } from "@/lib/storage";
import { authPortal, docFiles } from "@/modules/crm/cases";

// Client download of a file already uploaded to their own checklist.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const c = await authPortal(u.searchParams.get("mm_case"), u.searchParams.get("mm_key"));
  const id = u.searchParams.get("id") || "";
  if (!c || !id) return new NextResponse("Not found", { status: 404 });
  const owned = c.documents.some((d) => docFiles(d).some((f) => f.fileId === id));
  if (!owned) return new NextResponse("Not found", { status: 404 });
  const f = await readStoredFile(id);
  if (!f) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(f.data), {
    headers: {
      "Content-Type": f.rec.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(f.rec.originalName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
