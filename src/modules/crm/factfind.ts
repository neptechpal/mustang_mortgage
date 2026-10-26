// Fact Find (MMCRM_FactFind_Pro): draft/submit pipeline, snapshots, portal messages.
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { escapeHtml } from "@/lib/mail";
import { saveFile } from "@/lib/storage";
import { logEvent, portalUrl } from "./cases";
import { notifyBroker, sendToCaseClients } from "./email";
import { onFfSubmitted } from "./automation";
import { factFindSchema, syncToCase } from "./forms/service";
import { fieldIndex, sanitizeValues, stampSignatures, stripHidden, summary, validate, type Values } from "./forms/engine";
import { mysqlNow, siteUrl } from "./util";

export type FfResult = { ok: true } | { ok: false; errors: string[]; fields?: Record<string, string> };

/** engine_handle(): shared by portal + AJAX. action = save | submit. */
export async function ffHandle(caseId: number, raw: Values, action: "save" | "submit", silent: boolean, meta: { ip: string; ua: string }): Promise<FfResult> {
  const { schema } = await factFindSchema();
  const c = await prisma.case.findUnique({ where: { id: caseId } });
  if (!c) return { ok: false, errors: ["This link is not valid."] };
  const old = (c.ffDraft && typeof c.ffDraft === "object" ? c.ffDraft : {}) as Values;
  let payload = sanitizeValues(schema, raw);
  payload = stampSignatures(schema, payload, old, mysqlNow());
  // keep answers from an older form version this form no longer asks
  const index = fieldIndex(schema);
  for (const [k, v] of Object.entries(old)) if (!index[k] && !k.endsWith("__ts") && !(k in payload)) payload[k] = v;
  if (action === "submit") {
    const errors = validate(schema, payload);
    if (Object.keys(errors).length) return { ok: false, errors: Object.values(errors), fields: errors };
    payload = stripHidden(schema, payload);
  }
  let sigTs = c.ffSignatureTs;
  for (const [k, f] of Object.entries(index)) {
    if (f.type === "signature" && payload[k + "__ts"]) { sigTs = String(payload[k + "__ts"]); break; }
  }
  if (sigTs !== c.ffSignatureTs) await prisma.case.update({ where: { id: caseId }, data: { ffSignatureTs: sigTs } });
  await syncToCase(schema, caseId, payload);
  if (action === "submit") await commitSubmit(caseId, payload, meta);
  else await commitDraft(caseId, payload, silent);
  return { ok: true };
}

async function commitDraft(caseId: number, payload: Values, silent: boolean) {
  await prisma.case.update({ where: { id: caseId }, data: { ffDraft: payload as Prisma.InputJsonValue } });
  if (silent) return;
  await logEvent(caseId, "save", "Client saved a draft", "client");
}

async function commitSubmit(caseId: number, payload: Values, meta: { ip: string; ua: string }) {
  const html = await snapshotHtml(caseId, payload);
  const file = await saveFile({ data: Buffer.from(html, "utf8"), originalName: `factfind-case-${caseId}-${Math.floor(Date.now() / 1000)}.html`, mimeType: "text/html", folder: `cases/${caseId}/factfind`, owner: `case:${caseId}` });
  await prisma.factFindSubmission.create({ data: { caseId, data: payload as Prisma.InputJsonValue, ip: meta.ip, ua: meta.ua.slice(0, 500), htmlFileId: file.id } });
  const now = new Date();
  await prisma.case.update({ where: { id: caseId }, data: { ffDraft: payload as Prisma.InputJsonValue, ffDone: true, ffDoneAt: now } });
  const link = `${siteUrl()}/api/admin/crm/files/${file.id}`;
  await notifyBroker(
    caseId,
    `Fact Find submitted`,
    `<p>A Fact Find was submitted.</p><ul><li><strong>Case:</strong> ${caseId}</li><li><strong>Time:</strong> ${mysqlNow(now)}</li><li><strong>Snapshot:</strong> <a href="${escapeHtml(link)}">${escapeHtml(link)}</a></li></ul>`,
  ).catch(() => undefined);
  await logEvent(caseId, "submit", "Client submitted Fact Find", "client");
  await onFfSubmitted(caseId);
}

/** snapshot_html() — standalone HTML document. */
export async function snapshotHtml(caseId: number, data: Values) {
  const c = await prisma.case.findUnique({ where: { id: caseId } });
  const { schema } = await factFindSchema();
  const esc = escapeHtml;
  let h = `<html><head><meta charset="utf-8"><style>
:root{--ink:#0f172a;--muted:#64748b;--brand:#6e56cf;--bg:#f8fafc;--line:#e2e8f0}
body{font-family:Inter,Arial,Helvetica,sans-serif;color:var(--ink);margin:26px;background:#fff}
h1{font-size:24px;margin:0 0 6px}.muted{color:var(--muted)}
.header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid var(--brand);padding-bottom:8px;margin-bottom:14px}
.badge{display:inline-block;background:var(--bg);border:1px solid var(--line);padding:2px 8px;border-radius:999px;font-size:12px;color:var(--muted)}
.section{margin:20px 0 10px;font-size:14px;color:var(--brand);font-weight:700}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.tile{border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:#fff}
.t-label{font-size:12px;color:var(--muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.02em}
.t-value{font-size:13px}.sig{margin-top:16px;border-top:1px dashed var(--line);padding-top:10px}
.hand{font-family:"Brush Script MT","Segoe Script","Snell Roundhand",cursive;font-size:26px;font-style:italic}
</style></head><body>`;
  h += `<div class="header"><div><h1>Fact Find — Case #${caseId}</h1><div class="muted">Submitted ${esc(mysqlNow())}</div></div><div class="badge">Mustang Mortgage</div></div>`;
  for (const g of summary(schema, data)) {
    h += `<div class="section">${esc(g.title)}</div><div class="grid">`;
    for (const r of g.rows) {
      if (r.table) {
        h += `<div class="tile" style="grid-column:1/-1"><div class="t-label">${esc(r.label)}</div><table style="width:100%;border-collapse:collapse;font-size:12px"><tr>${(r.cols || []).map((x) => `<th style="text-align:left;border-bottom:1px solid #e2e8f0;padding:3px 6px">${esc(x)}</th>`).join("")}</tr>${r.table.map((l) => `<tr>${l.map((x) => `<td style="padding:3px 6px">${esc(x)}</td>`).join("")}</tr>`).join("")}</table></div>`;
      } else h += `<div class="tile"><div class="t-label">${esc(r.label)}</div><div class="t-value">${esc(r.value)}</div></div>`;
    }
    h += `</div>`;
  }
  if (data.signature_name) {
    h += `<div class="sig"><div class="t-label">Signed by</div><div class="hand">${esc(String(data.signature_name))}</div>`;
    if (c?.ffSignatureTs) h += `<div class="muted" style="margin-top:4px">Signed on ${esc(c.ffSignatureTs)}</div>`;
    h += `</div>`;
  }
  return h + `</body></html>`;
}

/* ---------------- portal messages ---------------- */
export async function clientMessage(caseId: number, text: string) {
  const msg = text.trim().slice(0, 5000);
  if (!msg) return false;
  await prisma.caseMessage.create({ data: { caseId, by: "client", text: msg } });
  await logEvent(caseId, "message_client", "Client sent a message", "client");
  const c = await prisma.case.findUnique({ where: { id: caseId } });
  if (c) {
    const link = c.portalClosed ? "" : await portalUrl(c);
    await notifyBroker(
      caseId,
      "New client message",
      `<p>A new message has been received in the secure portal.</p><blockquote style="border-left:3px solid #eee;margin:10px 0;padding:6px 10px;color:#333">${escapeHtml(msg).replace(/\n/g, "<br>")}</blockquote>${link ? `<p><a href="${escapeHtml(link)}">Open client portal</a></p>` : ""}`,
    ).catch(() => undefined);
  }
  return true;
}

export async function adminReply(caseId: number, text: string, user: { id: number; name: string }) {
  const msg = text.trim();
  if (!msg) return null;
  const row = await prisma.caseMessage.create({ data: { caseId, by: "admin", text: msg, userId: user.id, name: user.name } });
  const c = await prisma.case.findUnique({ where: { id: caseId } });
  if (c) {
    const to = c.app1Email || c.legacyEmail;
    if (to) {
      let body = `<p>We replied to your message:</p><blockquote style="border-left:3px solid #eee;margin:10px 0;padding:6px 10px;color:#333">${escapeHtml(msg).replace(/\n/g, "<br>")}</blockquote><p>You can continue the conversation in your secure portal.</p>`;
      if (!c.portalClosed) body += `<p><a href="${escapeHtml(await portalUrl(c))}">Open your portal</a></p>`;
      await sendToCaseClients(caseId, [to], `[MM#${caseId}] Reply from Mustang Mortgage`, body, { noWrap: true });
    }
  }
  await logEvent(caseId, "message_admin", "Admin replied", "admin");
  return row;
}
