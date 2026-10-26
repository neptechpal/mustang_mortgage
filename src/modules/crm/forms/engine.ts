// Form engine (port of MMCRM_Forms). Pure functions — safe to import from
// client components (condition evaluation must match server-side exactly).

export type Cond = { field: string; op: string; value: string } | null;
export type FieldType =
  | "text" | "textarea" | "email" | "tel" | "number" | "currency" | "date" | "select" | "radio" | "checkbox" | "yesno" | "repeater" | "signature" | "info";

export type Field = {
  key: string;
  type: FieldType;
  label: string;
  required: 0 | 1;
  width: "full" | "half" | "third";
  help: string;
  placeholder: string;
  default: string;
  options: string[];
  show_if: Cond;
  map: string;
  min: number | "";
  max: number | "";
  content?: string;
  add_label?: string;
  max_rows?: number;
  fields?: Field[];
};
export type Section = { id: string; title: string; description: string; show_if: Cond; tone: "" | "a1" | "a2"; fields: Field[] };
export type Settings = {
  accent: string; intro: string; submit_label: string; success_msg: string; notify_email: string;
  steps: 0 | 1; allow_edit: 0 | 1; public: 0 | 1; create_case: 0 | 1;
};
export type Schema = { v: 1; settings: Settings; sections: Section[] };
export type Values = Record<string, unknown>;

export const TYPES: Record<FieldType, [string, string]> = {
  text: ["Short text", "Aa"],
  textarea: ["Long text", "¶"],
  email: ["Email", "@"],
  tel: ["Phone", "☎"],
  number: ["Number", "#"],
  currency: ["Money ($)", "$"],
  date: ["Date", "▦"],
  select: ["Dropdown", "▾"],
  radio: ["Single choice", "◉"],
  checkbox: ["Multi choice", "☑"],
  yesno: ["Yes / No", "⇄"],
  repeater: ["Repeating group (e.g. properties, loans)", "≣"],
  signature: ["Signature", "✍"],
  info: ["Info text / heading", "ℹ"],
};

export const OPERATORS: Record<string, string> = {
  eq: "is", neq: "is not", contains: "includes", gt: "is greater than", lt: "is less than", filled: "is answered", empty: "is blank",
};

export const CASE_MAP_OPTIONS: Record<string, string> = {
  "": "Not linked",
  app1_name: "Case: Applicant 1 name",
  app1_email: "Case: Applicant 1 email",
  app1_dob: "Case: Applicant 1 DOB",
  app1_mobile: "Case: Applicant 1 mobile",
  app2_name: "Case: Applicant 2 name",
  app2_email: "Case: Applicant 2 email",
  app2_dob: "Case: Applicant 2 DOB",
  app2_mobile: "Case: Applicant 2 mobile",
  ...Object.fromEntries([3, 4].flatMap(n => ['name', 'email', 'dob', 'mobile'].map(k => [`app${n}_${k}`, `Case: Applicant ${n} ${k === 'dob' ? 'DOB' : k}`]))),
  applicant_count: "Case: Number of applicants",
  loan_amount: "Case: Loan amount",
  broker_note: "Save answer as a Broker Note",
};

/** map -> Case column */
export function caseMapColumn(map: string): string {
  if (map === "applicant_count") return "applicantCount";
  if (map === "loan_amount") return "loanAmount";
  const m = /^app([1-4])_(name|email|dob|mobile)$/.exec(map);
  if (!m) return "";
  return `app${m[1]}${m[2][0].toUpperCase()}${m[2].slice(1)}`;
}

export const DEFAULT_SETTINGS: Settings = {
  accent: "#987633", intro: "", submit_label: "Submit", success_msg: "Thank you — we have received your answers.",
  notify_email: "", steps: 1, allow_edit: 1, public: 0, create_case: 1,
};
export const blankSchema = (): Schema => ({ v: 1, settings: { ...DEFAULT_SETTINGS }, sections: [] });

const RESERVED = ["action", "mode", "ff", "case_id", "token", "form_id", "silent", "mmf_website", "mmcrm_ff_action", "submit"];
const str = (v: unknown) => (v == null ? "" : String(v));
const sanitizeKey = (s: string) => s.toLowerCase().replace(/[^a-z0-9_\-]/g, "");
const plain = (s: unknown) => str(s).replace(/<[^>]*>/g, "").replace(/[\r\n\t]+/g, " ").trim();

function cleanCond(c: unknown): Cond {
  if (!c || typeof c !== "object") return null;
  const o = c as Record<string, unknown>;
  if (!o.field) return null;
  const op = OPERATORS[str(o.op)] ? str(o.op) : "eq";
  return { field: sanitizeKey(str(o.field)), op, value: plain(o.value) };
}
function cleanOptions(opts: unknown): string[] {
  let arr: unknown[] = [];
  if (typeof opts === "string") arr = opts.split(/\r?\n/);
  else if (Array.isArray(opts)) arr = opts;
  const out: string[] = [];
  for (const o of arr) {
    const s = plain(o);
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}
export function keyFrom(label: string) {
  return sanitizeKey(plain(label).toLowerCase().replace(/[ \-/]/g, "_")).replace(/_+/g, "_").replace(/^_+|_+$/g, "");
}
const rnd = (n: number) => Math.random().toString(16).slice(2, 2 + n);

function cleanField(f: Record<string, unknown>, used: Set<string>, sub = false): Field {
  let type = (TYPES[str(f.type) as FieldType] ? str(f.type) : "text") as FieldType;
  if (sub && ["repeater", "signature", "info"].includes(type)) type = "text";
  const label = plain(f.label);
  let key = sanitizeKey(str(f.key));
  if (!key) key = keyFrom(label);
  if (!key) key = `${type}_${rnd(5)}`;
  if (RESERVED.includes(key)) key += "_field";
  const base = key;
  let n = 2;
  while (used.has(key)) key = `${base}_${n++}`;
  used.add(key);
  const numOrBlank = (v: unknown): number | "" => (v === undefined || v === null || v === "" ? "" : Number.isFinite(parseFloat(str(v))) ? parseFloat(str(v)) : "");
  const out: Field = {
    key, type, label,
    required: f.required && f.required !== "0" ? 1 : 0,
    width: (["full", "half", "third"].includes(str(f.width)) ? str(f.width) : "full") as Field["width"],
    help: plain(f.help),
    placeholder: plain(f.placeholder),
    default: plain(f.default),
    options: ["select", "radio", "checkbox"].includes(type) ? cleanOptions(f.options) : [],
    show_if: sub ? null : cleanCond(f.show_if),
    map: !sub && str(f.map) in CASE_MAP_OPTIONS ? str(f.map) : "",
    min: numOrBlank(f.min),
    max: numOrBlank(f.max),
  };
  if (type === "info") {
    out.content = str(f.content).replace(/<(script|style|iframe)[\s\S]*?<\/\1>/gi, "").replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, "");
    out.required = 0;
  }
  if (type === "repeater") {
    out.add_label = plain(f.add_label) || "Add another";
    out.max_rows = Math.max(1, Math.min(30, parseInt(str(f.max_rows || 10), 10) || 10));
    const subUsed = new Set<string>();
    out.fields = (Array.isArray(f.fields) ? f.fields : []).filter((x) => x && typeof x === "object").map((sf) => cleanField(sf as Record<string, unknown>, subUsed, true));
  }
  return out;
}

export function normalizeSchema(raw: unknown): Schema {
  let r = raw;
  if (typeof r === "string") {
    try { r = JSON.parse(r); } catch { r = null; }
  }
  if (!r || typeof r !== "object") return blankSchema();
  const o = r as Record<string, unknown>;
  const rs = (o.settings && typeof o.settings === "object" ? o.settings : {}) as Record<string, unknown>;
  const s: Settings = { ...DEFAULT_SETTINGS };
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(str(rs.accent))) s.accent = str(rs.accent);
  s.intro = str(rs.intro ?? "");
  s.submit_label = plain(rs.submit_label) || "Submit";
  s.success_msg = plain(rs.success_msg) || s.success_msg;
  s.notify_email = plain(rs.notify_email);
  for (const b of ["steps", "allow_edit", "public", "create_case"] as const) {
    if (b in rs) s[b] = rs[b] && rs[b] !== "0" ? 1 : 0;
  }
  const used = new Set<string>();
  const sids = new Set<string>();
  const sections: Section[] = [];
  for (const sec of Array.isArray(o.sections) ? o.sections : []) {
    if (!sec || typeof sec !== "object") continue;
    const so = sec as Record<string, unknown>;
    let sid = sanitizeKey(str(so.id));
    if (!sid || sids.has(sid)) sid = "s" + rnd(6);
    sids.add(sid);
    sections.push({
      id: sid,
      title: plain(so.title),
      description: plain(so.description),
      show_if: cleanCond(so.show_if),
      tone: (["", "a1", "a2"].includes(str(so.tone)) ? str(so.tone) : "") as Section["tone"],
      fields: (Array.isArray(so.fields) ? so.fields : []).filter((x) => x && typeof x === "object").map((f) => cleanField(f as Record<string, unknown>, used)),
    });
  }
  return { v: 1, settings: s, sections };
}

export function countFields(s: Schema) {
  let n = 0;
  for (const sec of s.sections) for (const f of sec.fields) if (f.type !== "info") n++;
  return n;
}

export function fieldIndex(s: Schema) {
  const idx: Record<string, Field & { _section: number }> = {};
  s.sections.forEach((sec, si) => sec.fields.forEach((f) => (idx[f.key] = { ...f, _section: si })));
  return idx;
}

/* ---------------- conditions & visibility ---------------- */
export function evalCond(c: Cond, values: Values): boolean {
  if (!c) return true;
  const v = values[c.field] ?? "";
  const want = str(c.value);
  const isArr = Array.isArray(v);
  switch (c.op) {
    case "filled": return isArr ? (v as unknown[]).length > 0 : str(v).trim() !== "";
    case "empty": return isArr ? (v as unknown[]).length === 0 : str(v).trim() === "";
    case "eq": return isArr ? (v as string[]).includes(want) : str(v).trim().toLowerCase() === want.trim().toLowerCase();
    case "neq": return isArr ? !(v as string[]).includes(want) : str(v).trim().toLowerCase() !== want.trim().toLowerCase();
    case "contains": return isArr ? (v as string[]).includes(want) : want !== "" && str(v).toLowerCase().includes(want.toLowerCase());
    case "gt":
    case "lt": {
      if (isArr || str(v).trim() === "" || isNaN(Number(v))) return false;
      return c.op === "gt" ? Number(v) > Number(want) : Number(v) < Number(want);
    }
  }
  return true;
}

export function visibility(s: Schema, values: Values) {
  const secs = new Set<number>();
  const fields = new Set<string>();
  const eff: Values = { ...values };
  s.sections.forEach((sec, si) => {
    const sv = evalCond(sec.show_if, eff);
    if (sv) secs.add(si);
    for (const f of sec.fields) {
      const fv = sv && evalCond(f.show_if, eff);
      if (fv) fields.add(f.key);
      else eff[f.key] = "";
    }
  });
  return { sections: secs, fields };
}

/* ---------------- sanitising ---------------- */
function cleanScalar(f: Field, v: unknown): string {
  if (Array.isArray(v) || (v && typeof v === "object")) v = "";
  const s = str(v);
  switch (f.type) {
    case "textarea": return s.replace(/<[^>]*>/g, "").trim();
    case "email": return s.trim().replace(/[^\w.@+\-!#$%&'*/=?^`{|}~]/g, "");
    case "number":
    case "currency": {
      const n = s.replace(/[^0-9.\-]/g, "");
      return n === "" || n === "-" || n === "." ? "" : n;
    }
    case "date": return /^\d{4}-\d{2}-\d{2}$/.test(s.trim()) ? s.trim() : "";
    case "select":
    case "radio": return f.options.includes(s) ? s : "";
    case "yesno": return s === "Yes" || s === "No" ? s : "";
    default: return plain(s);
  }
}

export function sanitizeValues(s: Schema, raw: Values): Values {
  const out: Values = {};
  for (const sec of s.sections) {
    for (const f of sec.fields) {
      if (f.type === "info") continue;
      if (!(f.key in raw)) {
        if (f.type === "checkbox" || f.type === "repeater") out[f.key] = [];
        continue;
      }
      const v = raw[f.key];
      if (f.type === "checkbox") {
        const arr = (Array.isArray(v) ? v : [v]).map(str);
        out[f.key] = f.options.filter((o) => arr.includes(o));
      } else if (f.type === "repeater") {
        const rows: Record<string, string>[] = [];
        const list = Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v as object) : [];
        for (const row of list) {
          if (!row || typeof row !== "object") continue;
          const clean: Record<string, string> = {};
          let any = false;
          for (const sf of f.fields || []) {
            const sv = cleanScalar(sf, (row as Record<string, unknown>)[sf.key]);
            clean[sf.key] = sv;
            if (sv !== "") any = true;
          }
          if (any) rows.push(clean);
          if (rows.length >= (f.max_rows || 10)) break;
        }
        out[f.key] = rows;
      } else {
        out[f.key] = cleanScalar(f, v);
      }
    }
  }
  return out;
}

/* ---------------- validation ---------------- */
export function validate(s: Schema, values: Values): Record<string, string> {
  const errors: Record<string, string> = {};
  const vis = visibility(s, values);
  s.sections.forEach((sec, si) => {
    if (!vis.sections.has(si)) return;
    for (const f of sec.fields) {
      if (f.type === "info" || !vis.fields.has(f.key)) continue;
      const k = f.key;
      const v = values[k] ?? "";
      const label = f.label || k;
      const blank = Array.isArray(v) ? v.length === 0 : str(v).trim() === "";
      if (f.required && blank) { errors[k] = `${label} is required.`; continue; }
      if (blank) continue;
      if (f.type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(str(v))) errors[k] = `${label}: please enter a valid email address.`;
      if ((f.type === "number" || f.type === "currency") && !isNaN(Number(v))) {
        if (f.min !== "" && Number(v) < f.min) errors[k] = `${label} must be at least ${f.min}.`;
        if (f.max !== "" && Number(v) > f.max) errors[k] = `${label} must be at most ${f.max}.`;
      }
      if (f.type === "repeater" && Array.isArray(v)) {
        outer: for (let ri = 0; ri < v.length; ri++) {
          for (const sf of f.fields || []) {
            if (sf.required && str((v[ri] as Record<string, unknown>)[sf.key]).trim() === "") {
              errors[k] = `${label} – row ${ri + 1}: ${sf.label || sf.key} is required.`;
              break outer;
            }
          }
        }
      }
    }
  });
  return errors;
}

export function stripHidden(s: Schema, values: Values): Values {
  const vis = visibility(s, values);
  const out = { ...values };
  s.sections.forEach((sec, si) => {
    for (const f of sec.fields) {
      if (f.type === "info") continue;
      if (!vis.sections.has(si) || !vis.fields.has(f.key)) delete out[f.key];
    }
  });
  return out;
}

export function stampSignatures(s: Schema, values: Values, previous: Values, now: string): Values {
  const out = { ...values };
  for (const sec of s.sections) {
    for (const f of sec.fields) {
      if (f.type !== "signature") continue;
      const tk = f.key + "__ts";
      if (!out[f.key]) { delete out[tk]; continue; }
      const same = previous[f.key] === out[f.key] && !!previous[tk];
      out[tk] = same ? previous[tk] : now;
    }
  }
  return out;
}

/* ---------------- display ---------------- */
export function formatValue(f: Pick<Field, "type">, v: unknown): string {
  if (Array.isArray(v)) {
    if (v.some(x => x === null || typeof x === 'object')) return `${v.length} item${v.length === 1 ? '' : 's'}`;
    return v.map(str).join(", ");
  }
  const s = str(v);
  if (s === "") return "";
  if (f.type === "currency" && !isNaN(Number(s))) {
    const n = Number(s);
    return "$" + n.toLocaleString("en-US", { minimumFractionDigits: n === Math.floor(n) ? 0 : 2, maximumFractionDigits: n === Math.floor(n) ? 0 : 2 });
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (f.type === "date" && m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}

export type SummaryRow = { key: string; label: string; type: string; raw: unknown; value: string; cols?: string[]; table?: string[][]; signed_at?: string };
export type SummaryGroup = { title: string; rows: SummaryRow[]; tone: string };

export function summary(s: Schema, values: Values, skipEmpty = true): SummaryGroup[] {
  const vis = visibility(s, values);
  const out: SummaryGroup[] = [];
  const known = new Set<string>();
  for (const sec of s.sections) {
    const rows: SummaryRow[] = [];
    for (const f of sec.fields) {
      known.add(f.key);
      known.add(f.key + "__ts");
      if (f.type === "info") continue;
      const v = values[f.key] ?? "";
      const blank = Array.isArray(v) ? v.length === 0 : str(v).trim() === "";
      if (skipEmpty && blank) continue;
      if (Object.keys(values).length && !vis.fields.has(f.key) && blank) continue;
      const row: SummaryRow = { key: f.key, label: f.label || f.key, type: f.type, raw: v, value: formatValue(f, v) };
      if (f.type === "repeater") {
        row.cols = (f.fields || []).map((sf) => sf.label || sf.key);
        row.table = (Array.isArray(v) ? v : []).map((r) => (f.fields || []).map((sf) => formatValue(sf, (r as Record<string, unknown>)[sf.key] ?? "")));
      }
      if (f.type === "signature" && values[f.key + "__ts"]) row.signed_at = str(values[f.key + "__ts"]);
      rows.push(row);
    }
    if (rows.length) out.push({ title: sec.title || "Details", rows, tone: sec.tone || "" });
  }
  const extra: SummaryRow[] = [];
  for (const [k, v] of Object.entries(values)) {
    if (known.has(k) || k.endsWith("__ts")) continue;
    if (Array.isArray(v) && v.length && v[0] && typeof v[0] === "object") continue;
    const val = Array.isArray(v) ? v.map(str).join(", ") : str(v);
    if (val === "") continue;
    extra.push({ key: k, label: k.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), type: "text", raw: v, value: val });
  }
  if (extra.length) out.push({ title: "Other answers", rows: extra, tone: "" });
  return out;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** HTML summary used in notification emails and snapshots. */
export function summaryHtml(s: Schema, values: Values) {
  const groups = summary(s, values);
  if (!groups.length) return "<p>No answers yet.</p>";
  let h = "";
  for (const g of groups) {
    h += `<div class="mmf-sum-title" style="font-weight:700;margin:14px 0 6px;color:#987633">${esc(g.title)}</div>`;
    for (const r of g.rows) {
      if (r.table) {
        h += `<div class="mmf-sum-item" style="margin:4px 0"><div class="mmf-sum-label" style="font-size:12px;color:#64748b">${esc(r.label)}</div><table style="border-collapse:collapse;font-size:13px"><tr>${(r.cols || []).map((c) => `<th style="text-align:left;padding:3px 6px;border-bottom:1px solid #e2e8f0">${esc(c)}</th>`).join("")}</tr>${r.table.map((line) => `<tr>${line.map((c) => `<td style="padding:3px 6px">${esc(c)}</td>`).join("")}</tr>`).join("")}</table></div>`;
        continue;
      }
      h += `<div class="mmf-sum-item" style="margin:4px 0"><div class="mmf-sum-label" style="font-size:12px;color:#64748b">${esc(r.label)}</div><div>${esc(r.value).replace(/\n/g, "<br>")}</div>${r.signed_at ? `<div style="font-size:12px;color:#64748b">Signed ${esc(r.signed_at)}</div>` : ""}</div>`;
    }
  }
  return h;
}

/** Parse FormData-style flat entries (key, key[], key[0][col]) into Values. */
export function valuesFromEntries(entries: Iterable<[string, unknown]>): Values {
  const out: Values = {};
  for (const [name, val] of entries) {
    if (typeof val !== "string") continue;
    const rep = /^([^\[]+)\[(\d+)\]\[([^\]]+)\]$/.exec(name);
    if (rep) {
      const [, k, i, col] = rep;
      const arr = (Array.isArray(out[k]) ? out[k] : (out[k] = [])) as Record<string, string>[];
      const idx = parseInt(i, 10);
      arr[idx] = arr[idx] || {};
      arr[idx][col] = val;
      continue;
    }
    if (name.endsWith("[]")) {
      const k = name.slice(0, -2);
      const arr = (Array.isArray(out[k]) ? out[k] : (out[k] = [])) as string[];
      arr.push(val);
      continue;
    }
    out[name] = val;
  }
  for (const k of Object.keys(out)) if (Array.isArray(out[k])) out[k] = (out[k] as unknown[]).filter((x) => x !== undefined);
  return out;
}
