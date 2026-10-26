import { staffSessionOrNull } from "@/lib/session";
import { messageProbe } from "@/modules/crm-extra/lib/diag";
import { zohoToken } from "@/modules/crm-extra/lib/zoho";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await staffSessionOrNull();
  if (!s || s.role !== "ADMIN") return new Response("Unauthorized", { status: 401 });
  const mid = new URL(req.url).searchParams.get("mid") ?? "";
  const txt = { "Content-Type": "text/plain; charset=utf-8" };
  if (!(await zohoToken())) return new Response("No Zoho token", { status: 400, headers: txt });
  if (!mid) return new Response("No messageId", { status: 400, headers: txt });
  return new Response(await messageProbe(mid), { headers: txt });
}
