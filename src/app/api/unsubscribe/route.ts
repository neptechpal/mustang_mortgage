// Public unsubscribe link (signed per-contact token) appended to marketing emails.
import { prisma } from "@/lib/db";
import { verifyUnsub, mktLog } from "@/modules/crm-extra/lib/marketing";

export const dynamic = "force-dynamic";

const page = (title: string, msg: string, status = 200) =>
  new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{font-family:system-ui,Segoe UI,Arial,sans-serif;background:#f8fafc;color:#0f172a;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}
.c{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:28px 32px;max-width:440px;text-align:center}h1{color:#987633;font-size:22px;margin:0 0 10px}a{color:#987633}</style></head>
<body><div class="c"><h1>${title}</h1><p>${msg}</p><p><a href="/">Return to Mustang Mortgage</a></p></div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

async function handle(req: Request) {
  const u = new URL(req.url);
  const id = Number(u.searchParams.get("c") || 0);
  const t = u.searchParams.get("t") || "";
  const c = id ? await prisma.mktContact.findUnique({ where: { id } }) : null;
  if (!c || !verifyUnsub(c.id, c.email, t)) return page("Link not valid", "This unsubscribe link is invalid or has expired.", 400);
  if (c.status !== "Unsubscribed") {
    await prisma.mktContact.update({ where: { id: c.id }, data: { status: "Unsubscribed" } });
    await mktLog("contact.unsubscribe", "Contact unsubscribed via email link", { id: c.id, email: c.email });
  }
  return page("You’re unsubscribed", `${c.email} will no longer receive marketing emails from Mustang Mortgage.`);
}

export const GET = handle;
// One-click unsubscribe (RFC 8058) clients POST to the same URL.
export const POST = handle;
