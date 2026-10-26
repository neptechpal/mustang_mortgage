import type { Cf7Definition, Cf7Tag } from "./types";

// Form-tag scanner + renderer replicating Contact Form 7 6.2 markup
// (plus drag-and-drop-multiple-file-upload "mfile" and
// digital-signature-for-contact-form-7 "signature" tags).

const TAG_TYPES = [
  "text", "email", "tel", "url", "number", "range", "date", "textarea", "select", "checkbox", "radio",
  "acceptance", "file", "mfile", "signature", "submit", "hidden",
];
const TAG_RE = new RegExp(
  String.raw`(\[?)\[(` + TAG_TYPES.map((t) => `${t}\\*?`).join("|") + String.raw`)(?:\s+(.*?))?(?:\s+(\/))?\](\]?)`,
  "gs",
);

export function parseTag(raw: string, type: string, attr = ""): Cf7Tag {
  const tokens = attr.match(/"[^"]*"|'[^']*'|\S+/g) ?? [];
  const basetype = type.replace(/\*$/, "");
  const opts: string[] = [];
  const values: string[] = [];
  let name = "";
  for (const t of tokens) {
    if (/^["']/.test(t)) values.push(t.slice(1, -1));
    else if (!name && basetype !== "submit") name = t;
    else opts.push(t);
  }
  return { raw, type, basetype, required: type.endsWith("*"), name, options: opts, values };
}

export function scanTags(template: string): Cf7Tag[] {
  const out: Cf7Tag[] = [];
  for (const m of template.matchAll(TAG_RE)) {
    if (m[1] === "[" && m[5] === "]") continue;
    out.push(parseTag(m[0], m[2], m[3] ?? ""));
  }
  return out;
}

export const opt = (tag: Cf7Tag, key: string) => {
  const o = tag.options.find((x) => x.startsWith(key + ":"));
  return o ? o.slice(key.length + 1) : undefined;
};
export const hasOpt = (tag: Cf7Tag, key: string) => tag.options.some((x) => x === key || x.startsWith(key + ":"));

/** Option values of select/checkbox/radio (supports "label|value" pipes). */
export const choiceValues = (tag: Cf7Tag) => tag.values.map((v) => (v.includes("|") ? v.split("|").slice(1).join("|") : v));
const choiceLabels = (tag: Cf7Tag) => tag.values.map((v) => (v.includes("|") ? v.split("|")[0] : v));

/** dnd upload settings */
export function mfileRules(tag: Cf7Tag) {
  const types = (opt(tag, "filetypes") || "").split("|").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const limit = Number(opt(tag, "limit") || 10485760);
  const max = Number(opt(tag, "max-file") || opt(tag, "maxfile") || 10);
  const min = Number(opt(tag, "min-file") || opt(tag, "minfile") || 0);
  return { types, limit, max, min };
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function attrs(a: Record<string, string | number | boolean | undefined>) {
  return Object.entries(a)
    .filter(([, v]) => v !== undefined && v !== false && v !== "")
    .map(([k, v]) => (v === true ? `${k}="${k}"` : `${k}="${esc(String(v))}"`))
    .join(" ");
}

function controlClass(tag: Cf7Tag, base: string, extra: string[] = []) {
  const c = ["wpcf7-form-control", base];
  if (tag.required) c.push("wpcf7-validates-as-required");
  c.push(...extra);
  for (const o of tag.options) if (o.startsWith("class:")) c.push(o.slice(6));
  return c.join(" ");
}

const placeholderOf = (tag: Cf7Tag) =>
  hasOpt(tag, "placeholder") || hasOpt(tag, "watermark") ? tag.values[0] ?? "" : undefined;
const defaultValue = (tag: Cf7Tag) => (hasOpt(tag, "placeholder") || hasOpt(tag, "watermark") ? "" : tag.values[0] ?? "");

const wrap = (tag: Cf7Tag, inner: string) =>
  `<span class="wpcf7-form-control-wrap" data-name="${esc(tag.name)}">${inner}</span>`;

export function renderTag(tag: Cf7Tag, formId: number): string {
  const id = opt(tag, "id");
  const req = tag.required ? "true" : undefined;
  switch (tag.basetype) {
    case "text":
    case "email":
    case "tel":
    case "url": {
      const extra = tag.basetype === "text" ? [] : ["wpcf7-text", `wpcf7-validates-as-${tag.basetype}`];
      const cls = controlClass(tag, `wpcf7-${tag.basetype}`, extra);
      return wrap(
        tag,
        `<input ${attrs({
          size: 40,
          maxlength: opt(tag, "maxlength") ?? 400,
          minlength: opt(tag, "minlength"),
          class: cls,
          id,
          "aria-required": req,
          "aria-invalid": "false",
          placeholder: placeholderOf(tag),
        })} value="${esc(defaultValue(tag))}" type="${tag.basetype}" name="${esc(tag.name)}" />`,
      );
    }
    case "number":
    case "range":
    case "date": {
      const cls = controlClass(tag, `wpcf7-${tag.basetype}`, [`wpcf7-validates-as-${tag.basetype === "date" ? "date" : "number"}`]);
      return wrap(
        tag,
        `<input ${attrs({
          class: cls,
          id,
          min: opt(tag, "min"),
          max: opt(tag, "max"),
          step: opt(tag, "step"),
          "aria-required": req,
          "aria-invalid": "false",
          placeholder: placeholderOf(tag),
        })} value="${esc(defaultValue(tag))}" type="${tag.basetype}" name="${esc(tag.name)}" />`,
      );
    }
    case "textarea": {
      const cls = controlClass(tag, "wpcf7-textarea");
      return wrap(
        tag,
        `<textarea ${attrs({
          cols: 40,
          rows: 10,
          maxlength: opt(tag, "maxlength") ?? 2000,
          class: cls,
          id,
          "aria-required": req,
          "aria-invalid": "false",
          placeholder: placeholderOf(tag),
        })} name="${esc(tag.name)}">${esc(defaultValue(tag))}</textarea>`,
      );
    }
    case "select": {
      const cls = controlClass(tag, "wpcf7-select");
      const vals = choiceValues(tag);
      const labels = choiceLabels(tag);
      let options = vals.map((v, i) => `<option value="${esc(v)}">${esc(labels[i])}</option>`).join("");
      if (hasOpt(tag, "include_blank") || vals.length === 0)
        options = `<option value="">&#8212;Please choose an option&#8212;</option>` + options;
      const multiple = hasOpt(tag, "multiple");
      return wrap(
        tag,
        `<select ${attrs({ class: cls, id, "aria-required": req, "aria-invalid": "false", multiple })} name="${esc(tag.name)}${
          multiple ? "[]" : ""
        }">${options}</select>`,
      );
    }
    case "checkbox":
    case "radio": {
      const cls = controlClass(tag, `wpcf7-${tag.basetype}`);
      const vals = choiceValues(tag);
      const labels = choiceLabels(tag);
      const useLabel = hasOpt(tag, "use_label_element");
      const type = tag.basetype;
      const nm = type === "checkbox" && !hasOpt(tag, "exclusive") ? `${tag.name}[]` : tag.name;
      const items = vals
        .map((v, i) => {
          const pos = [i === 0 ? "first" : "", i === vals.length - 1 ? "last" : ""].filter(Boolean).join(" ");
          const input = `<input type="${type}" name="${esc(nm)}" value="${esc(v)}" />`;
          const label = `<span class="wpcf7-list-item-label">${esc(labels[i])}</span>`;
          return `<span class="wpcf7-list-item${pos ? " " + pos : ""}">${useLabel ? `<label>${input}${label}</label>` : input + label}</span>`;
        })
        .join("");
      return wrap(tag, `<span ${attrs({ class: cls, id })}>${items}</span>`);
    }
    case "mfile":
    case "file": {
      const r = mfileRules(tag);
      const accept = r.types.length ? r.types.map((t) => "." + t).join(", ") : undefined;
      const input = `<input ${attrs({
        size: 40,
        class: "wpcf7-form-control wpcf7-drag-n-drop-file d-none",
        "aria-required": req,
        "aria-invalid": "false",
        type: "file",
        multiple: "multiple",
        "data-name": tag.name,
        "data-type": r.types.join("|"),
        "data-limit": r.limit,
        "data-max": r.max,
        "data-min": r.min || undefined,
        "data-id": formId,
        "data-version": "free version 1.4.0",
        accept,
      })} name="${esc(tag.name)}[]" />`;
      const dz =
        `<div class="codedropz-upload-handler"><div class="codedropz-upload-container"><div class="codedropz-upload-inner">` +
        `<h3>Drag &amp; Drop Files Here</h3><span>or</span><div class="codedropz-btn-wrap"><a class="cd-upload-btn" href="#">Browse Files</a></div>` +
        `</div></div><span class="dnd-upload-counter"><span>0</span> of ${r.max}</span></div>`;
      return wrap(tag, `<div class="codedropz-upload-wrapper">${input}${dz}</div>`);
    }
    case "signature": {
      const n = tag.name.replace(/[^A-Za-z0-9_-]/g, "");
      const color = opt(tag, "color") || "#000000";
      const back = opt(tag, "backcolor") || "#dddddd";
      return (
        `<div class="dscf7_signature"><div class="dscf7_signature_inner">` +
        `<canvas id="digital_signature-pad_${n}" name="${n}" class="digital_signature-pad" color="${esc(color)}" backcolor="${esc(back)}" width="300" height="200"></canvas>` +
        `<input class="clearButton" type="button" value="+"></div>` +
        `<span class="wpcf7-form-control-wrap ${n}" data-name="${esc(tag.name)}">` +
        `<input class="${["dscf7-signature", ...tag.options.filter((o) => o.startsWith("class:")).map((o) => o.slice(6))].join(" ")}" value="" type="hidden" name="${esc(tag.name)}" ${tag.required ? 'aria-required="true"' : ""}/>` +
        `</span></div>`
      );
    }
    case "hidden":
      return `<input type="hidden" name="${esc(tag.name)}" value="${esc(tag.values[0] ?? "")}" />`;
    case "submit":
      return `<input class="wpcf7-form-control wpcf7-submit has-spinner" type="submit" value="${esc(tag.values[0] ?? "Send")}" /><span class="wpcf7-spinner"></span>`;
    case "acceptance": {
      const cls = controlClass(tag, "wpcf7-acceptance");
      return wrap(tag, `<span class="${cls}"><span class="wpcf7-list-item"><label><input type="checkbox" name="${esc(tag.name)}" value="1" aria-invalid="false" /></label></span></span>`);
    }
    default:
      return tag.raw;
  }
}

/** Replaces every [form-tag] in the autop'd template with its control markup. */
export function renderFormBody(def: Cf7Definition): { html: string; scripts: string[] } {
  const scripts: string[] = [];
  let html = def.html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (_, code: string) => {
    scripts.push(code);
    return "";
  });
  html = html.replace(TAG_RE, (raw, open: string, type: string, attr: string | undefined, _s, close: string) => {
    if (open === "[" && close === "]") return raw.slice(1, -1);
    return renderTag(parseTag(raw, type, attr ?? ""), def.id);
  });
  html +=
    `<input type="text" class="wpcf7_hp_field" name="wpcf7_hp_field" value="" tabindex="-1" autocomplete="off" aria-hidden="true" />` +
    `<div class="wpcf7-response-output" aria-hidden="true"></div>`;
  return { html, scripts };
}
