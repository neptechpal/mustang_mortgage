import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { escapeHtml, sendMail } from "@/lib/mail";
import { saveFile, saveFormFile } from "@/lib/storage";
import { cf7FactFind, CF7_FILE_LIMIT, CF7_FILE_TYPES, CF7_MAX_FILES } from "@/modules/crm/forms/cf7-factfind";
import { sanitizeValues, stripHidden, summaryHtml, validate, type Values } from "@/modules/crm/forms/engine";
import { getCrmOptions } from "@/modules/crm/options";
import { mysqlNow, siteUrl } from "@/modules/crm/util";

// Public /factfind (CF7 form 2651) submission → email + fact_find history entry (wpcode 2771).
const hits = new Map<string, { n: number; t: number }>();
const err = (errors: string[], fields: Record<string, string> = {}) => NextResponse.json({ success: false, data: { errors, fields } });

export async function POST(req: Request) {
  const fd = await req.formData().catch(() => null);
  if (!fd) return err(["There was an error trying to send your message. Please try again later."]);
  let payload: { values?: Values; mmf_website?: string } = {};
  try { payload = JSON.parse(String(fd.get("payload") ?? "{}")); } catch { /* */ }
  if (payload.mmf_website) return NextResponse.json({ success: true, data: { done: true } });
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "x";
  const h = hits.get(ip);
  if (h && Date.now() - h.t < 3600_000) { if (h.n >= 8) return err(["Too many submissions. Please try again later."]); h.n++; } else hits.set(ip, { n: 1, t: Date.now() });

  const schema = cf7FactFind();
  let values = sanitizeValues(schema, payload.values ?? {});
  const errors = validate(schema, values);
  const sig = String(fd.get("signature-337") ?? "");
  if (!/^data:image\/png;base64,/.test(sig)) errors["signature-337"] = "Signature is required.";
  const files = fd.getAll("mfile-938").filter((f): f is File => typeof f === "object" && f !== null && (f as File).size > 0);
  if (files.length > CF7_MAX_FILES) errors["mfile-938"] = `You can upload at most ${CF7_MAX_FILES} files.`;
  for (const f of files) {
    if (!CF7_FILE_TYPES.test(f.name)) errors["mfile-938"] = "You are not allowed to upload files of this type.";
    else if (f.size > CF7_FILE_LIMIT) errors["mfile-938"] = "The uploaded file is too large.";
  }
  if (Object.keys(errors).length) return err(Object.values(errors), errors);
  values = stripHidden(schema, values);

  const stored: { fileId: string; name: string }[] = [];
  for (const f of files) {
    const r = await saveFormFile(f, "factfind-cf7", "factfind");
    stored.push({ fileId: r.id, name: r.originalName });
  }
  const sigBuf = Buffer.from(sig.split(",")[1] ?? "", "base64");
  const sigRec = await saveFile({ data: sigBuf, originalName: "signature-337.png", mimeType: "image/png", folder: "factfind-cf7", owner: "factfind" });
  const a1 = String(values.applicant1_fullname ?? "").trim();
  const a2 = String(values.applicant2_fullname ?? "").trim();
  const title = `${a1 || a2 || "Fact Find"} – ${mysqlNow()}`;
  const entry = await prisma.factFindEntry.create({
    data: { title, data: { ...values, "signature-337": `file:${sigRec.id}` } as Prisma.InputJsonValue, files: stored as unknown as Prisma.InputJsonValue },
  });

  const o = await getCrmOptions();
  const link = `${siteUrl()}/admin/factfinds?view=legacy&fact_find_id=${entry.id}`;
  const mail = await sendMail({
    to: "info@mustangmortgage.com.au",
    fromName: "Mustang Mortgage",
    fromEmail: "info@mustangmortgage.com.au",
    replyTo: String(values.applicant1_email ?? "") || undefined,
    subject: `${a1} ${a2}- MM Fact Finder`,
    html: `<div style="font-family:Arial,sans-serif;max-width:680px"><h2 style="color:#0073AA">MM Fact Finder</h2>${summaryHtml(schema, values)}<p><strong>Attachments:</strong> ${stored.length ? stored.map((s) => escapeHtml(s.name)).join(", ") : "none"}</p><p><a href="${escapeHtml(link)}">View this submission in the CRM</a></p></div>`,
    attachments: [{ filename: "signature.png", content: sigBuf, contentType: "image/png" }],
    context: "cf7:2651",
  });
  void o;
  if (!mail.ok && mail.error !== "mail not configured") {
    // CF7 only stored the entry on mail_sent; keep the entry (data must not be lost) but report like CF7.
    return err(["There was an error trying to send your message. Please try again later."]);
  }
  return NextResponse.json({ success: true, data: { done: true } });
}
