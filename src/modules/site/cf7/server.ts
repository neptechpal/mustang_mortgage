import { prisma } from "@/lib/db";
import { escapeHtml, sendMail, type MailAttachment } from "@/lib/mail";
import { saveFile } from "@/lib/storage";
import { choiceValues, hasOpt, mfileRules, opt, scanTags } from "./tags";
import type { Cf7Definition, Cf7Mail, Cf7Response, Cf7Tag } from "./types";
import { siteInfo, wpDate, wpTime } from "../forms/site-info";

// Server side of the Contact Form 7 replica: validation identical to CF7's
// validation filters, uploads + signature stored privately (StoredFile),
// FormSubmission row, then Mail (1) and Mail (2) with mail-tag substitution.

type Posted = Record<string, string | string[]>;
type FileEntry = { field: string; name: string; size: number; mimeType: string; data: Buffer; kind: "upload" | "signature"; fileId?: string };

const MAX_ATTACH_BYTES = 20 * 1024 * 1024;
const TEL_RE = /^[+]?(?:\([0-9]+\)|[0-9]+)(?:[/ -]*(?:\([0-9]+\)|[0-9]+))*$/;
const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

const msg = (def: Cf7Definition, key: string, fallback: string) => def.messages[key] || fallback;

export async function handleCf7Submission(
  def: Cf7Definition,
  fd: FormData,
  ctx: { ip: string; userAgent: string; url: string },
): Promise<Cf7Response> {
  const tags = scanTags(def.template).filter((t) => t.name && t.basetype !== "submit");
  const posted: Posted = {};
  const files: FileEntry[] = [];
  const invalid: { field: string; message: string }[] = [];
  const fail = (t: Cf7Tag, m: string) => {
    if (!invalid.some((i) => i.field === t.name)) invalid.push({ field: t.name, message: m });
  };
  const required = msg(def, "invalid_required", "Please fill out this field.");

  for (const tag of tags) {
    const bt = tag.basetype;
    if (bt === "mfile" || bt === "file") {
      const r = mfileRules(tag);
      const list = fd.getAll(`${tag.name}[]`).concat(fd.getAll(tag.name)).filter((f): f is File => typeof f !== "string" && f.size > 0);
      if (tag.required && list.length === 0) fail(tag, "This field is required.");
      if (list.length > r.max) fail(tag, `Note : Some of the files are not uploaded ( Only ${r.max} files allowed )`);
      for (const f of list) {
        const ext = (f.name.split(".").pop() || "").toLowerCase();
        if (r.types.length && !r.types.includes(ext)) fail(tag, msg(def, "upload_file_type_invalid", "You are not allowed to upload files of this type."));
        else if (f.size > r.limit) fail(tag, msg(def, "upload_file_too_large", "The uploaded file is too large."));
        else files.push({ field: tag.name, name: f.name, size: f.size, mimeType: f.type || "application/octet-stream", data: Buffer.from(await f.arrayBuffer()), kind: "upload" });
      }
      posted[tag.name] = list.map((f) => f.name);
      continue;
    }
    if (bt === "signature") {
      const v = String(fd.get(tag.name) ?? "").trim();
      if (tag.required && !v) fail(tag, required);
      if (v) {
        const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(v);
        const data = m ? Buffer.from(m[1], "base64") : null;
        if (!data || data.length > 2 * 1024 * 1024 || data.subarray(1, 4).toString() !== "PNG") fail(tag, required);
        else files.push({ field: tag.name, name: `${tag.name}-${Date.now()}.png`, size: data.length, mimeType: "image/png", data, kind: "signature" });
      }
      posted[tag.name] = v ? "(signature)" : "";
      continue;
    }
    if (bt === "checkbox" || (bt === "select" && hasOpt(tag, "multiple"))) {
      const allowed = choiceValues(tag);
      const vals = fd
        .getAll(`${tag.name}[]`)
        .concat(fd.getAll(tag.name))
        .map(String)
        .filter((v) => allowed.includes(v));
      if (tag.required && vals.length === 0) fail(tag, required);
      posted[tag.name] = vals;
      continue;
    }
    if (bt === "acceptance") {
      const v = String(fd.get(tag.name) ?? "");
      if (!v && !hasOpt(tag, "optional")) fail(tag, msg(def, "accept_terms", "You must accept the terms and conditions before sending your message."));
      posted[tag.name] = v ? "1" : "";
      continue;
    }

    let v = String(fd.get(tag.name) ?? "").replace(/\r\n?/g, "\n");
    v = bt === "textarea" ? v.trim() : v.replace(/\n/g, " ").trim();
    posted[tag.name] = v;
    if (bt === "radio" || bt === "select") {
      const allowed = choiceValues(tag);
      if (v && !allowed.includes(v)) {
        fail(tag, required);
        posted[tag.name] = "";
        continue;
      }
      if (tag.required && !v) fail(tag, required);
      continue;
    }
    if (tag.required && v === "") {
      fail(tag, required);
      continue;
    }
    if (v === "") continue;
    const maxlength = Number(opt(tag, "maxlength") ?? (bt === "textarea" ? 2000 : ["text", "email", "tel", "url"].includes(bt) ? 400 : 0));
    const minlength = Number(opt(tag, "minlength") ?? 0);
    if (maxlength && [...v].length > maxlength) fail(tag, msg(def, "invalid_too_long", "This field has a too long input."));
    else if (minlength && [...v].length < minlength) fail(tag, msg(def, "invalid_too_short", "This field has a too short input."));
    else if (bt === "email" && !EMAIL_RE.test(v)) fail(tag, msg(def, "invalid_email", "Please enter an email address."));
    else if (bt === "tel" && !TEL_RE.test(v)) fail(tag, msg(def, "invalid_tel", "Please enter a telephone number."));
    else if (bt === "url" && !/^[a-z][a-z0-9+.-]*:\/\/\S+$/i.test(v)) fail(tag, msg(def, "invalid_url", "Please enter a URL."));
    else if (bt === "number" || bt === "range") {
      const n = Number(v);
      const min = opt(tag, "min");
      const max = opt(tag, "max");
      if (!/^[-]?\d*(?:\.\d+)?$/.test(v) || Number.isNaN(n)) fail(tag, msg(def, "invalid_number", "Please enter a number."));
      else if (min !== undefined && n < Number(min)) fail(tag, msg(def, "number_too_small", "This field has a too small number."));
      else if (max !== undefined && n > Number(max)) fail(tag, msg(def, "number_too_large", "This field has a too large number."));
    } else if (bt === "date") {
      const min = opt(tag, "min");
      const max = opt(tag, "max");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) fail(tag, msg(def, "invalid_date", "Please enter a date in YYYY-MM-DD format."));
      else if (min && v < min) fail(tag, msg(def, "date_too_early", "This field has a too early date."));
      else if (max && v > max) fail(tag, msg(def, "date_too_late", "This field has a too late date."));
    }
  }

  if (invalid.length) {
    return { status: "validation_failed", message: msg(def, "validation_error", "One or more fields have an error. Please check and try again."), invalid_fields: invalid };
  }

  // Persist uploads + submission
  for (const f of files) {
    const rec = await saveFile({ data: f.data, originalName: f.name, mimeType: f.mimeType, folder: `forms/cf7-${def.id}`, owner: `cf7:${def.id}` });
    f.fileId = rec.id;
  }
  const emailTag = tags.find((t) => t.basetype === "email" && posted[t.name]);
  const nameTag = tags.find((t) => t.basetype === "text" && /name/i.test(t.name) && posted[t.name]);
  const sub = await prisma.formSubmission.create({
    data: {
      formKey: `cf7:${def.id}`,
      formTitle: def.title,
      name: nameTag ? String(posted[nameTag.name]) : "",
      email: emailTag ? String(posted[emailTag.name]) : "",
      data: posted,
      files: files.map((f) => ({ field: f.field, fileId: f.fileId, name: f.name, size: f.size, mimeType: f.mimeType, kind: f.kind })),
      meta: { ip: ctx.ip, userAgent: ctx.userAgent, url: ctx.url },
    },
  });

  const info = await siteInfo();
  const adminUrl = `${info.url}/admin/submissions/${sub.id}`;
  const special: Record<string, string> = {
    _site_title: info.title,
    _site_description: "",
    _site_url: info.url,
    _site_admin_email: info.adminEmail,
    _date: wpDate(sub.createdAt),
    _time: wpTime(sub.createdAt),
    _remote_ip: ctx.ip,
    _user_agent: ctx.userAgent,
    _url: ctx.url,
    _serial_number: String(sub.id),
    _post_title: "",
    _post_url: ctx.url,
    _contact_form_title: def.title,
  };

  const resolve = (name: string, html: boolean): string | undefined => {
    if (name in special) return html ? escapeHtml(special[name]) : special[name];
    const tag = tags.find((t) => t.name === name);
    if (!tag) return undefined;
    if (tag.basetype === "signature") return files.some((f) => f.field === name) ? (html ? `<a href="${adminUrl}">View signature</a>` : `Signature: ${adminUrl}`) : "";
    if (tag.basetype === "mfile" || tag.basetype === "file") {
      const names = files.filter((f) => f.field === name).map((f) => f.name);
      return html ? names.map(escapeHtml).join("<br />") : names.join("\n");
    }
    const v = posted[name];
    const s = Array.isArray(v) ? v.join(", ") : v ?? "";
    return html ? escapeHtml(s).replace(/\n/g, "<br />\n") : s;
  };

  const fill = (tpl: string, html: boolean, excludeBlank = false) => {
    const lines = tpl.split("\n").map((line) => {
      let blank = false;
      const out = line.replace(/\[\s*([a-zA-Z_][0-9a-zA-Z:._-]*)\s*\]/g, (m, n: string) => {
        const r = resolve(n, html);
        if (r === undefined) return m;
        if (r === "") blank = true;
        return r;
      });
      return excludeBlank && blank ? null : out;
    });
    return lines.filter((l) => l !== null).join("\n");
  };

  const compose = async (mail: Cf7Mail, which: "mail" | "mail_2") => {
    if (!mail?.active) return { ok: true, skipped: true as const };
    const recipient = fill(mail.recipient, false).trim();
    if (!recipient) return { ok: false, error: "no recipient" };
    const subject = fill(mail.subject, false).replace(/\s*\n\s*/g, " ").trim();
    const sender = fill(mail.sender, false).trim();
    const sm = /^(.*?)\s*<([^>]+)>$/.exec(sender);
    const headers: Record<string, string> = {};
    for (const line of fill(mail.additional_headers || "", false).split("\n")) {
      const m = /^([\w-]+):\s*(.+)$/.exec(line.trim());
      if (m) headers[m[1].toLowerCase()] = m[2].trim();
    }
    const bodyHtml = mail.use_html ? fill(mail.body, true, mail.exclude_blank) : `<pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(fill(mail.body, false, mail.exclude_blank))}</pre>`;
    const bodyText = mail.use_html ? undefined : fill(mail.body, false, mail.exclude_blank);
    const attachments: MailAttachment[] = [];
    let total = 0;
    for (const m of (mail.attachments || "").matchAll(/\[\s*([a-zA-Z_][0-9a-zA-Z:._-]*)\s*\]/g)) {
      for (const f of files.filter((x) => x.field === m[1])) {
        if (total + f.size > MAX_ATTACH_BYTES) continue;
        total += f.size;
        attachments.push({ filename: f.name, content: f.data, contentType: f.mimeType });
      }
    }
    return sendMail({
      to: recipient,
      subject,
      html: bodyHtml,
      text: bodyText,
      fromName: sm ? sm[1].replace(/^"|"$/g, "") || undefined : undefined,
      fromEmail: sm ? sm[2] : /@/.test(sender) ? sender : undefined,
      replyTo: headers["reply-to"],
      cc: headers["cc"],
      bcc: headers["bcc"],
      attachments,
      context: `cf7:${def.id}:${which}:${sub.id}`,
    });
  };

  const r1 = await compose(def.mail, "mail");
  const r2 = r1.ok ? await compose(def.mail2, "mail_2") : { ok: false, error: "skipped (mail 1 failed)" };
  await prisma.formSubmission.update({
    where: { id: sub.id },
    data: { meta: { ip: ctx.ip, userAgent: ctx.userAgent, url: ctx.url, mail: { mail1: r1, mail2: r2 } } },
  });

  if (!r1.ok) return { status: "mail_failed", message: msg(def, "mail_sent_ng", "There was an error trying to send your message. Please try again later."), submissionId: sub.id };
  return { status: "mail_sent", message: msg(def, "mail_sent_ok", "Thank you for your message. It has been sent."), submissionId: sub.id };
}
