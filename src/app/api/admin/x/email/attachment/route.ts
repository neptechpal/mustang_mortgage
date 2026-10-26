import { staffSessionOrNull } from "@/lib/session";
import { downloadAttachment } from "@/modules/crm-extra/lib/trail";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await staffSessionOrNull())) return new Response("Unauthorized", { status: 401 });
  const u = new URL(req.url).searchParams;
  const res = await downloadAttachment(u.get("fid") ?? "", u.get("mid") ?? "", u.get("aid") ?? "");
  if (!res) return new Response("Attachment unavailable", { status: 404 });
  const name = (u.get("name") || "attachment").replace(/["\r\n]/g, "");
  return new Response(res.body, {
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${name}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
