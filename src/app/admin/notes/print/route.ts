// Standalone printable "Broker Notes" document (admin-post mmcrm_bn_print).
import { prisma } from "@/lib/db";
import { staffSessionOrNull } from "@/lib/session";
import { esc } from "@/modules/crm-extra/lib/html";
import { fmtDate } from "@/modules/crm-extra/lib/cases";
import { SITE_NAME } from "@/modules/crm-extra/lib/opts";

export const dynamic = "force-dynamic";

const autop = (b: string) => (/<\w+[^>]*>/.test(b) ? b : b.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join(""));
const html = (s: string, status = 200) => new Response(s, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });

export async function GET(req: Request) {
  if (!(await staffSessionOrNull())) return html("No permission", 403);
  const u = new URL(req.url);
  const general = u.searchParams.get("scope") === "general";
  const caseId = Number(u.searchParams.get("case_id") || 0);
  if (!general && !caseId) return html("No case ID provided", 400);
  const c = general ? null : await prisma.case.findUnique({ where: { id: caseId } });
  if (!general && !c) return html("Invalid case", 404);
  const notes = await prisma.brokerNote.findMany({ where: { caseId: general ? 0 : caseId }, orderBy: { createdAt: "asc" } });
  const company = SITE_NAME;
  const now = new Date();
  const longDate = (d: Date) => fmtDate(d, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) + " @ " + fmtDate(d, { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
  const applicants = c ? [c.app1Name, c.app2Name].filter((x) => x.trim()).join(" & ") || c.legacyName || "Client" : "";
  const email = c ? c.app1Email || c.legacyEmail : "";
  const row = (k: string, v: string) => `<div class="row"><span class="k">${k}</span><span>${esc(v)}</span></div>`;
  const info = [
    c ? row("Case Reference:", c.title) : "",
    c ? row("Applicant(s):", applicants) : "",
    c && email ? row("Email:", email) : "",
    row("Document Date:", fmtDate(now, { month: "long", day: "numeric", year: "numeric" }) + " " + fmtDate(now, { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase()),
    row("Total Notes:", `${notes.length} ${notes.length === 1 ? "note" : "notes"}`),
  ].join("");
  const body = notes.length
    ? `<div class="nh">Notes</div>` +
      notes
        .map(
          (n, i) =>
            `<div class="note"><div class="meta"><span>${esc(longDate(n.createdAt))}</span><span>Note #${i + 1}</span></div>${n.title ? `<h3>${esc(n.title)}</h3>` : ""}<div class="body">${autop(n.body)}</div></div>`,
        )
        .join("")
    : `<div class="empty"><h3>No broker notes recorded</h3><p>No notes have been added to this case yet.</p></div>`;
  const title = `Broker Notes - ${general ? "General Notes" : c!.title} - ${company}`;
  return html(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
:root{--brand:#a06200;--ink:#0f172a;--muted:#64748b;--line:#e2e8f0}
*{box-sizing:border-box}
body{font-family:Inter,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:var(--ink);max-width:820px;margin:32px auto;padding:0 24px;line-height:1.6;font-size:14px}
.hdr{border-bottom:2px solid var(--brand);padding-bottom:16px;margin-bottom:20px}.co{color:var(--brand);font-weight:700;font-size:13px;letter-spacing:.08em;text-transform:uppercase}
h1{margin:6px 0 2px;font-size:26px;letter-spacing:-.01em}.sub{color:var(--muted);font-size:13px}
.info{background:#f8fafc;border:1px solid var(--line);border-radius:10px;padding:12px 16px;margin-bottom:22px}
.row{display:flex;gap:12px;padding:3px 0}.k{font-weight:600;color:#334155;min-width:140px}
.nh{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);border-bottom:1px solid var(--line);padding-bottom:6px;margin-bottom:12px}
.note{border:1px solid var(--line);border-left:3px solid var(--brand);border-radius:8px;padding:12px 16px;margin-bottom:12px;page-break-inside:avoid;break-inside:avoid}
.meta{display:flex;justify-content:space-between;gap:12px;color:var(--muted);font-size:12px}
.note h3{margin:6px 0 4px;font-size:15px}.body p{margin:0 0 8px}.body p:last-child{margin:0}
.empty{text-align:center;color:var(--muted);padding:30px;border:1px dashed var(--line);border-radius:10px}
.ft{border-top:1px solid var(--line);margin-top:28px;padding-top:12px;color:var(--muted);font-size:12px;text-align:center}
.pb{position:fixed;top:16px;right:16px;background:var(--brand);color:#fff;border:0;border-radius:8px;padding:9px 16px;font:600 13px Inter,-apple-system,"Segoe UI",sans-serif;cursor:pointer;box-shadow:0 1px 2px rgba(15,23,42,.1)}
.pb:hover{background:#7e4f05}
@media print{.pb{display:none}body{margin:0;max-width:none}}
</style></head><body>
<button class="pb" onclick="window.print()">Print / Save as PDF</button>
<div class="hdr"><div class="co">${esc(company)}</div><h1>Broker Notes</h1><div class="sub">Confidential Document for Lender Submission</div></div>
<div class="info">${info}</div>${body}
<div class="ft"><strong>End of Broker Notes Document</strong><br>This document is confidential and intended for professional lender review only.<br>Generated by ${esc(company)} on ${esc(fmtDate(now, { month: "long", day: "numeric", year: "numeric" }))}</div>
</body></html>`);
}
