// Email HTML helpers.

/** sync.php sanitize_email_html: strip <script> blocks and on* handlers. */
export function stripScripts(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

/**
 * mmcrm_clean_email_html equivalent: allow-list style cleaning for outgoing /
 * stored email HTML — removes scripts, styles blocks, iframes, forms, objects,
 * event handlers and javascript: URLs while keeping inline styles & tables.
 */
export function cleanEmailHtml(html: string) {
  if (!html.trim()) return "";
  return stripScripts(html)
    .replace(/<(iframe|object|embed|form|frameset|frame|applet|meta|link|base)\b[\s\S]*?(<\/\1>|\/?>)/gi, "")
    .replace(/<\/?(input|button|select|textarea|option)\b[^>]*>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*(javascript|vbscript|data:text\/html)[^"']*\2/gi, '$1="#"')
    .replace(/\son\w+=\S+/gi, "");
}

export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export const pre = (txt: string) => `<pre style="white-space:pre-wrap;margin:0">${esc(txt)}</pre>`;

/** mmcrm_button_html */
export const buttonHtml = (url: string, label: string) =>
  `<p style="margin:22px 0"><a href="${esc(url)}" style="background:#987633;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;display:inline-block;font-weight:600">${esc(label)}</a></p>`;

/** mmcrm_wrap_email */
export function wrapEmail(inner: string, logo: string) {
  const img = logo ? `<img src="${esc(logo)}" alt="" style="max-height:42px;margin-bottom:14px">` : "";
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827;line-height:1.55;font-size:15px;max-width:620px">${img}${inner}</div>`;
}

/** Plain text → simple HTML paragraphs (used for textarea bodies). */
export function nl2p(text: string) {
  if (/<\w+[^>]*>/.test(text)) return text; // already HTML
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function quotedPrintable(s: string) {
  return s.replace(/=\r?\n/g, "").replace(/=([A-Fa-f0-9]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

/** sync.php mime_extract_html_from_raw */
export function mimeExtractHtml(raw: string): string {
  if (!raw) return "";
  const m = raw.match(/boundary="([^"]+)"/i) || raw.match(/boundary=([^;\r\n]+)/i);
  if (!m) return "";
  const boundary = m[1].replace(/^["']|["']$/g, "").trim();
  const q = boundary.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
  const chunks = raw.split(new RegExp(`\\r?\\n--${q}(?=--|\\r?\\n)`));
  const decode = (hdr: string, body: string) => {
    if (/base64/i.test(hdr)) return Buffer.from(body.replace(/\s+/g, ""), "base64").toString("utf8");
    if (/quoted-printable/i.test(hdr)) return quotedPrintable(body);
    return body;
  };
  for (const type of ["text/html", "text/plain"]) {
    for (let seg of chunks) {
      seg = seg.replace(/^[\r\n-]+/, "");
      if (!seg) continue;
      const idx = seg.search(/\r?\n\r?\n/);
      if (idx < 0) continue;
      const hdr = seg.slice(0, idx);
      const body = seg.slice(idx).replace(/^\r?\n\r?\n/, "");
      if (new RegExp(`Content-Type:\\s*${type}`, "i").test(hdr)) {
        const out = decode(hdr, body);
        return type === "text/html" ? stripScripts(out) : pre(out);
      }
    }
  }
  return "";
}
