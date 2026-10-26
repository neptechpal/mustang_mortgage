import { NextResponse } from "next/server";
import { staffSessionOrNull } from "@/lib/session";
import { readStoredFile } from "@/lib/storage";
import { docFiles, loadCase } from "@/modules/crm/cases";
import { applicantSlug, buildZip, prettyFilename } from "@/modules/crm/zip";

// Download all checklist files as a ZIP (?item=<docId> for a single row).
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await staffSessionOrNull())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const c = await loadCase(Number(id));
  if (!c) return new NextResponse("Not found", { status: 404 });
  const item = new URL(req.url).searchParams.get("item");
  const people = applicantSlug(c.app1Name, c.app2Name, c.app3Name, c.app4Name);
  const out: { name: string; data: Buffer }[] = [];
  for (const d of c.documents) {
    if (item && String(d.id) !== item) continue;
    let n = 0;
    for (const f of docFiles(d)) {
      n++;
      if (!f.fileId) continue;
      const r = await readStoredFile(f.fileId);
      if (r) out.push({ name: prettyFilename(people, d.label, r.rec.originalName, n), data: r.data });
    }
  }
  if (!out.length) return new NextResponse("No local files found to download.", { status: 404 });
  const zipName = item ? `${people} - ${c.documents.find((d) => String(d.id) === item)?.label ?? "Documents"}.zip` : `${people} - All Documents.zip`;
  return new NextResponse(new Uint8Array(buildZip(out)), {
    headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(zipName)}`, "Cache-Control": "private, no-store" },
  });
}
