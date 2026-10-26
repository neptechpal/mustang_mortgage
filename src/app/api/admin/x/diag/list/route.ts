import { staffSessionOrNull } from "@/lib/session";
import { rawListProbe } from "@/modules/crm-extra/lib/diag";
import { zohoToken } from "@/modules/crm-extra/lib/zoho";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await staffSessionOrNull();
  if (!s || s.role !== "ADMIN") return new Response("Unauthorized", { status: 401 });
  if (!(await zohoToken())) return new Response("No Zoho token", { status: 400, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  return new Response(await rawListProbe(), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
