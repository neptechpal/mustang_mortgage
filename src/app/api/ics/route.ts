// Public, token-protected ICS feed (replaces ?mmcrm_ics=1&key=… on the WP site).
import { getIcsToken, tokenOk, buildEvents, renderIcs, debugJson } from "@/modules/crm-extra/lib/ics";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const key = u.searchParams.get("key") ?? "";
  if (!tokenOk(key, await getIcsToken())) return new Response("Forbidden", { status: 403 });
  const st = u.searchParams.get("status") ?? "active";
  const status = (["active", "completed", "all"].includes(st) ? st : "active") as "active" | "completed" | "all";
  const rg = u.searchParams.get("range") ?? "7d";
  const range = ["7d", "30d", "90d", "1y", "custom"].includes(rg) ? rg : "7d";
  const flag = (k: string) => u.searchParams.get(k) === "1";
  const events = await buildEvents(status, range, u.searchParams.get("from") ?? undefined, u.searchParams.get("to") ?? undefined, flag("show"), flag("roll"));
  const noCache = { "Cache-Control": "no-cache, must-revalidate, max-age=0", Pragma: "no-cache", Expires: "0" };
  if (flag("debug")) return Response.json(debugJson(events), { headers: noCache });
  return new Response(renderIcs(events, status), {
    headers: { ...noCache, "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `inline; filename="mmcrm-${status}.ics"` },
  });
}
