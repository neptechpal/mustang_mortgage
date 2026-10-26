import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { staffSessionOrNull } from "@/lib/session";
import { readStoredFile } from "@/lib/storage";
import { applicantSlug, prettyFilename } from "@/modules/crm/zip";
import { docFiles } from "@/modules/crm/cases";

// Staff view/download of a private CRM file. ?dl=1 forces download with the
// pretty "J Smith - Payslips.pdf" name when the file belongs to a checklist row.
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await staffSessionOrNull())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const f = await readStoredFile(id);
  if (!f) return new NextResponse("Not found", { status: 404 });
  const dl = new URL(req.url).searchParams.get("dl") === "1";
  let name = f.rec.originalName;
  const m = /^case:(\d+)$/.exec(f.rec.owner);
  if (dl && m) {
    const c = await prisma.case.findUnique({ where: { id: Number(m[1]) }, include: { documents: true } });
    const doc = c?.documents.find((d) => docFiles(d).some((x) => x.fileId === id));
    if (c && doc) {
      const idx = docFiles(doc).findIndex((x) => x.fileId === id) + 1;
      name = prettyFilename(applicantSlug(c.app1Name, c.app2Name), doc.label, f.rec.originalName, idx);
    }
  }
  const inlineSafe = /^(application\/pdf|image\/(png|jpe?g|gif|webp))$/.test(f.rec.mimeType);
  const isHtmlSnapshot = f.rec.mimeType === "text/html" && f.rec.path.includes("/factfind/");
  const disp = dl || (!inlineSafe && !isHtmlSnapshot) ? "attachment" : "inline";
  const headers: Record<string, string> = {
    "Content-Type": f.rec.mimeType || "application/octet-stream",
    "Content-Disposition": `${disp}; filename*=UTF-8''${encodeURIComponent(name)}`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
  if (isHtmlSnapshot) headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; img-src * data:";
  return new NextResponse(new Uint8Array(f.data), { headers });
}
