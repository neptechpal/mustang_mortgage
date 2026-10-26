// Email preview page for an Email Log entry (admin-post mm_view_email).
import { prisma } from "@/lib/db";
import { staffSessionOrNull } from "@/lib/session";
import { esc, stripScripts } from "@/modules/crm-extra/lib/html";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await staffSessionOrNull())) return new Response("Unauthorized", { status: 401 });
  const id = Number(new URL(req.url).searchParams.get("id") || 0);
  const e = id ? await prisma.caseEmail.findUnique({ where: { id } }) : null;
  if (!e) return new Response("Not found", { status: 404 });
  const body = e.html ? stripScripts(e.html) : "<p><em>No body captured for this message.</em></p>";
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>Email preview — ${esc(e.subject)}</title>
<meta http-equiv="Content-Security-Policy" content="script-src 'none'">
<style>body{font-family:system-ui,Segoe UI,Arial,sans-serif;max-width:860px;margin:24px auto;padding:0 16px;color:#111827}.h{border-bottom:1px solid #e5e7eb;padding-bottom:10px;margin-bottom:14px;font-size:14px;color:#374151}</style></head>
<body><div class="h"><h2 style="margin:0 0 6px">${esc(e.subject)}</h2><div><b>${e.direction === "in" ? "From" : "To"}:</b> ${esc(e.direction === "in" ? e.fromAddr : e.toAddrs)}</div>${e.ccAddrs ? `<div><b>Cc:</b> ${esc(e.ccAddrs)}</div>` : ""}<div><b>Date:</b> ${esc(e.sentAt.toISOString())}</div></div>${body}</body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "script-src 'none'" } },
  );
}
