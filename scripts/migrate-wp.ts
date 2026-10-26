/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * WordPress (mustang_wp, prefix DHi_) → Prisma/Postgres data migration.
 *
 *   npx tsx scripts/migrate-wp.ts [--dry-run] [--skip-files] [--files-only]
 *
 * Env:
 *   DATABASE_URL                    target Postgres (read from .env automatically)
 *   WP_DB_HOST (127.0.0.1) WP_DB_PORT (3306) WP_DB_USER WP_DB_PASSWORD WP_DB_NAME (mustang_wp)
 *   WP_TABLE_PREFIX (DHi_)
 *   WP_UPLOADS_DIR                  wp-content/uploads copy; enables phase 2 (private files)
 *   STORAGE_DIR                     private storage root (same as the app, default ./storage/private)
 *
 * Phase 1 (one transaction; --dry-run rolls it back): users, cases + all case meta, CRM forms,
 * templates, fact-find CPT, broker notes, learning vault, marketing tables, settings, Zoho
 * indexes, CF7 (cfdb7) submissions, SSA appointments. WP primary keys are preserved as the new
 * ids for User/Case/CrmForm/EmailTemplate/FactFindEntry/AppointmentType/Appointment/MktLog so
 * portal links (mm_case=ID), "[MM #ID]" subject tags and template/form ids keep working.
 * Idempotent: parents are upserted on wpId; per-case child rows are cleared and reloaded,
 * except Broker Notes, which use stable source keys and preserve Next.js notes.
 *
 * Phase 2 (needs WP_UPLOADS_DIR): copies files referenced by case documents, fact-find
 * snapshots/signatures and CF7 submissions into STORAGE_DIR (StoredFile rows, deterministic
 * paths → re-runs reuse the same rows) and rewrites references to {fileId, name}.
 *
 * Output is counts/ids only — never row contents (client PII).
 */
import { updatedWpCaseFields } from "../src/modules/crm-extra/lib/wp-update";
import { INCOME_DEFAULTS } from "../src/modules/crm-extra/lib/income";
import { normalizeSchema } from "../src/modules/crm/forms/engine";
import { upgradeEnquirySchema } from "../src/modules/crm/forms/defaults";
import { PrismaClient, Prisma } from "@prisma/client";
import mysql from "mysql2/promise";
import crypto from "crypto";
import path from "path";
import { promises as fs, existsSync, readFileSync } from "fs";

// ---------------------------------------------------------------- env / args
function loadDotEnv() {
  const f = path.resolve(process.cwd(), ".env");
  if (!existsSync(f)) return;
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}
loadDotEnv();

const ARGS = new Set(process.argv.slice(2));
const DRY = ARGS.has("--dry-run");
const SKIP_FILES = ARGS.has("--skip-files");
const FILES_ONLY = ARGS.has("--files-only");
const P = process.env.WP_TABLE_PREFIX || "DHi_";
const UPLOADS = process.env.WP_UPLOADS_DIR ? path.resolve(process.env.WP_UPLOADS_DIR) : "";
const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || "./storage/private");
const TZ = "Australia/Sydney";

const prisma = new PrismaClient();
type Tx = Prisma.TransactionClient;
class DryRunRollback extends Error {}

const counts: Record<string, { src: number; dst?: number }> = {};
const notes: string[] = [];
const src = (k: string, n: number) => ((counts[k] ??= { src: 0 }).src += n);
const log = (...a: unknown[]) => console.log(...a);

// ---------------------------------------------------------------- PHP unserialize
export function phpUnserialize(input: string): unknown {
  const buf = Buffer.from(input, "utf8");
  let pos = 0;
  const expect = (ch: string) => {
    if (String.fromCharCode(buf[pos]) !== ch) throw new Error(`unserialize: expected '${ch}' at ${pos}`);
    pos++;
  };
  const until = (ch: string) => {
    const i = buf.indexOf(ch, pos);
    if (i < 0) throw new Error(`unserialize: missing '${ch}'`);
    const s = buf.toString("latin1", pos, i);
    pos = i + 1;
    return s;
  };
  const readEntries = (n: number) => {
    expect("{");
    const keys: (string | number)[] = [];
    const vals: unknown[] = [];
    for (let i = 0; i < n; i++) {
      keys.push(parse() as string | number);
      vals.push(parse());
    }
    expect("}");
    return { keys, vals };
  };
  const parse = (): unknown => {
    const t = String.fromCharCode(buf[pos++]);
    if (t === "N") return expect(";"), null;
    expect(":");
    switch (t) {
      case "b":
        return until(";") === "1";
      case "i":
        return parseInt(until(";"), 10);
      case "d": {
        const v = until(";");
        return v === "INF" ? Infinity : v === "-INF" ? -Infinity : v === "NAN" ? NaN : parseFloat(v);
      }
      case "s": {
        const len = parseInt(until(":"), 10);
        expect('"');
        const s = buf.toString("utf8", pos, pos + len);
        pos += len;
        expect('"');
        expect(";");
        return s;
      }
      case "a": {
        const { keys, vals } = readEntries(parseInt(until(":"), 10));
        if (keys.every((k, i) => k === i)) return vals;
        const o: Record<string, unknown> = {};
        keys.forEach((k, i) => (o[String(k)] = vals[i]));
        return o;
      }
      case "O": {
        const clen = parseInt(until(":"), 10);
        pos += clen + 3; // "Class":
        const { keys, vals } = readEntries(parseInt(until(":"), 10));
        const o: Record<string, unknown> = {};
        keys.forEach((k, i) => (o[String(k).replace(/^\0[^\0]*\0/, "")] = vals[i]));
        return o;
      }
      case "r":
      case "R":
        until(";");
        return null;
      default:
        throw new Error(`unserialize: unknown type '${t}'`);
    }
  };
  const v = parse();
  return v;
}
let badSerial = 0;
function maybe(v: unknown): any {
  if (typeof v !== "string") return v;
  if (!/^(?:[aOsibd]:|N;)/.test(v)) return v;
  try {
    return phpUnserialize(v);
  } catch {
    badSerial++;
    return v;
  }
}
function json(v: unknown, fb: any = null): any {
  if (v && typeof v === "object") return v;
  if (typeof v !== "string" || !v.trim()) return fb;
  try {
    return JSON.parse(v);
  } catch {
    return fb;
  }
}

// ---------------------------------------------------------------- small helpers
const str = (v: unknown) => (v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = parseFloat(String(v).replace(/[^0-9.\-eE]/g, ""));
  return Number.isFinite(n) ? n : null;
};
const int = (v: unknown, d = 0) => {
  const n = num(v);
  return n === null ? d : Math.trunc(n);
};
const truthy = (v: unknown) => !!v && v !== "0" && v !== "false" && v !== "no";
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : []);
const obj = (v: unknown): Record<string, any> => (v && typeof v === "object" && !Array.isArray(v) ? (v as any) : {});
const j = (v: unknown) => (v ?? {}) as Prisma.InputJsonValue;
const md5 = (s: string) => crypto.createHash("md5").update(s, "utf8").digest("hex");
const sha1 = (s: string) => crypto.createHash("sha1").update(s, "utf8").digest("hex");

function tzOffsetMs(at: number) {
  const p: Record<string, string> = {};
  for (const x of new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(new Date(at)))
    p[x.type] = x.value;
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second) - Math.floor(at / 1000) * 1000;
}
const MYSQL_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/;
/** WP local wall-clock ("current_time('mysql')", Australia/Sydney) → Date */
function local(v: unknown): Date | null {
  if (v === null || v === undefined || v === "" || v === 0 || v === "0") return null;
  if (typeof v === "number" || /^\d{9,11}$/.test(String(v))) return unix(v);
  const s = String(v).trim();
  const m = s.match(MYSQL_RE);
  if (!m) {
    const t = Date.parse(s);
    return Number.isFinite(t) ? new Date(t) : null;
  }
  if (m[1] === "0000") return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
  const o1 = tzOffsetMs(guess);
  let t = guess - o1;
  const o2 = tzOffsetMs(t);
  if (o2 !== o1) t = guess - o2;
  return new Date(t);
}
/** MySQL DATETIME stored in UTC (post_date_gmt, user_registered, SSA dates) → Date */
function utc(v: unknown): Date | null {
  const m = String(v ?? "").trim().match(MYSQL_RE);
  if (!m || m[1] === "0000") return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0)));
}
/** real unix seconds → Date */
function unix(v: unknown): Date | null {
  const n = int(v);
  return n > 0 ? new Date(n * 1000) : null;
}
/** WP "local timestamp" (current_time('timestamp') = unix + gmt offset) → Date */
function localTs(v: unknown): Date | null {
  const n = int(v);
  if (n <= 0) return null;
  const d = new Date(n * 1000);
  const p = (x: number) => String(x).padStart(2, "0");
  return local(`${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`);
}
const or = (d: Date | null, fb: Date) => d ?? fb;
/** wp_strip_all_tags($s, true) */
function wpStripAllTags(s: string) {
  return s
    .replace(/<(script|style)[^>]*?>[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\r\n\t ]+/g, " ")
    .trim();
}
/** cfdb7 stores values HTML-entity encoded (e.g. "/" as "&#47;") */
function decodeEntities(s: string) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
function newToken() {
  const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(crypto.randomBytes(32), (b) => A[b % A.length]).join("");
}

// ---------------------------------------------------------------- MySQL
let my: mysql.Connection;
async function q<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await my.query({ sql: sql.replace(/\{p\}/g, P), values: params as any[] });
  return rows as T[];
}
async function tableExists(name: string) {
  return (await q("SHOW TABLES LIKE ?", [P + name])).length > 0;
}

type Post = { ID: number; post_author: number; post_title: string; post_content: string; post_status: string; post_type: string; post_date: string; post_date_gmt: string; post_modified: string; post_modified_gmt: string };
async function posts(type: string, statuses = ["publish", "draft", "pending", "private", "future"]): Promise<Post[]> {
  return q<Post>(
    "SELECT ID, post_author, post_title, post_content, post_status, post_type, post_date, post_date_gmt, post_modified, post_modified_gmt FROM {p}posts WHERE post_type = ? AND post_status IN (?) ORDER BY ID",
    [type, statuses],
  );
}
async function postMeta(ids: number[]): Promise<Map<number, Record<string, any>>> {
  const out = new Map<number, Record<string, any>>();
  if (!ids.length) return out;
  const rows = await q<{ post_id: number; meta_key: string; meta_value: string }>("SELECT post_id, meta_key, meta_value FROM {p}postmeta WHERE post_id IN (?) ORDER BY meta_id", [ids]);
  for (const r of rows) {
    const m = out.get(r.post_id) ?? {};
    if (!(r.meta_key in m)) m[r.meta_key] = maybe(r.meta_value); // get_post_meta(..., true) = first row
    out.set(r.post_id, m);
  }
  return out;
}
async function option(name: string): Promise<any> {
  const r = await q<{ option_value: string }>("SELECT option_value FROM {p}options WHERE option_name = ?", [name]);
  return r.length ? maybe(r[0].option_value) : undefined;
}
const pgDate = (d: Date | null) => d ?? undefined;

// ---------------------------------------------------------------- id helpers
const userMap = new Map<number, number>(); // wp user id → new id
const userName = new Map<number, string>(); // wp user id → display name
const caseIds = new Set<number>(); // migrated case ids (== WP post ids)
const mapUser = (wp: unknown) => (int(wp) > 0 ? userMap.get(int(wp)) ?? 0 : 0);

async function freeId(tx: Tx, table: string, id: number) {
  const r = await tx.$queryRawUnsafe<any[]>(`SELECT 1 FROM "${table}" WHERE id = $1`, id);
  return r.length === 0;
}
async function resetSeq(tx: Tx, table: string) {
  await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM "${table}"), 1))`);
}

// ============================================================== PHASE 1
async function migrateUsers(tx: Tx) {
  const users = await q("SELECT ID, user_login, user_email, user_pass, user_registered, display_name FROM {p}users ORDER BY ID");
  src("User", users.length);
  const metaRows = await q<{ user_id: number; meta_key: string; meta_value: string }>("SELECT user_id, meta_key, meta_value FROM {p}usermeta ORDER BY umeta_id");
  const um = new Map<number, Record<string, any>>();
  for (const r of metaRows) {
    const m = um.get(r.user_id) ?? {};
    if (!(r.meta_key in m)) m[r.meta_key] = maybe(r.meta_value);
    um.set(r.user_id, m);
  }
  const STATUS: Record<string, string> = { approved: "approved", awaiting_admin_review: "pending", awaiting_email_confirmation: "checkmail", rejected: "rejected", inactive: "inactive" };
  for (const u of users) {
    const m = um.get(u.ID) ?? {};
    const caps = obj(m[`${P}capabilities`]);
    const roles = Object.keys(caps).filter((k) => caps[k]);
    const role = roles.includes("administrator")
      ? "ADMIN"
      : roles.some((r) => ["editor", "author", "contributor", "shop_manager"].includes(r) || r.startsWith("shop_")) || caps.edit_posts
        ? "STAFF"
        : "MEMBER";
    const dir = obj(m.um_member_directory_data);
    const profile: Record<string, unknown> = { registeredVia: "wp-import", wpRoles: roles };
    if (str(m.description)) profile.description = str(m.description);
    if (m.profile_privacy) profile.profilePrivacy = str(m.profile_privacy);
    if (m.profile_noindex !== undefined && m.profile_noindex !== "") profile.profileNoindex = truthy(m.profile_noindex) || m.profile_noindex === "Yes" ? "Yes" : "No";
    const hide = m.hide_in_members ?? dir.hide_in_members;
    if (hide !== undefined) profile.hideInMembers = hide === true || hide === "Yes" || hide === "1" ? "Yes" : "No";
    if (m._um_last_login) profile.lastLogin = (local(m._um_last_login) ?? new Date()).toISOString();
    const phone = m.phone_number || m.mobile_number;
    if (phone) profile.phone = str(phone);
    const data = {
      wpId: u.ID,
      username: str(u.user_login),
      email: str(u.user_email).toLowerCase() || `${u.user_login}@users.invalid`,
      displayName: str(u.display_name),
      firstName: str(m.first_name),
      lastName: str(m.last_name),
      role: role as any,
      status: STATUS[str(m.account_status)] ?? "approved",
      createdAt: or(utc(u.user_registered), new Date()),
    };
    let ex = await tx.user.findUnique({ where: { wpId: u.ID } });
    ex ??= await tx.user.findFirst({ where: { OR: [{ username: data.username }, { email: data.email }] } });
    let id: number;
    if (ex) {
      // keep a password the user already changed in the new app (bcrypt $2a/$2b); refresh WP hashes
      const keepPw = ex.passwordHash && !/^(\$P\$|\$H\$|\$wp|\$2y\$)/.test(ex.passwordHash);
      const r = await tx.user.update({ where: { id: ex.id }, data: { ...data, ...(keepPw ? {} : { passwordHash: str(u.user_pass) }), profile: j({ ...obj(ex.profile), ...profile }) } });
      id = r.id;
    } else {
      const r = await tx.user.create({ data: { ...((await freeId(tx, "User", u.ID)) ? { id: u.ID } : {}), ...data, passwordHash: str(u.user_pass), profile: j(profile) } });
      id = r.id;
    }
    userMap.set(u.ID, id);
    userName.set(u.ID, str(u.display_name) || str(u.user_login));
  }
  await resetSeq(tx, "User");
}

async function migrateForms(tx: Tx) {
  const forms = await posts("mm_form", ["publish", "draft", "pending", "private", "trash"]);
  src("CrmForm", forms.length);
  const meta = await postMeta(forms.map((f) => f.ID));
  for (const f of forms) {
    const m = meta.get(f.ID) ?? {};
    const data = { title: f.post_title, status: f.post_status === "trash" ? "trash" : f.post_status === "publish" ? "publish" : "draft", schema: j(upgradeEnquirySchema(normalizeSchema(json(m._mmf_schema, obj(m._mmf_schema))))), createdAt: or(utc(f.post_date_gmt), new Date()), updatedAt: or(utc(f.post_modified_gmt), new Date()) };
    const ex = await tx.crmForm.findUnique({ where: { wpId: f.ID } });
    if (ex) await tx.crmForm.update({ where: { id: ex.id }, data });
    else await tx.crmForm.create({ data: { ...((await freeId(tx, "CrmForm", f.ID)) ? { id: f.ID } : {}), wpId: f.ID, ...data } });
  }
  await resetSeq(tx, "CrmForm");

  const tpls = await posts("mm_template");
  src("EmailTemplate", tpls.length);
  const tm = await postMeta(tpls.map((t) => t.ID));
  for (const t of tpls) {
    const m = tm.get(t.ID) ?? {};
    const data = { title: t.post_title, subject: str(m.mm_subject) || t.post_title, body: t.post_content ?? "", createdAt: or(utc(t.post_date_gmt), new Date()), updatedAt: or(utc(t.post_modified_gmt), new Date()) };
    const ex = await tx.emailTemplate.findUnique({ where: { wpId: t.ID } });
    if (ex) await tx.emailTemplate.update({ where: { id: ex.id }, data });
    else await tx.emailTemplate.create({ data: { ...((await freeId(tx, "EmailTemplate", t.ID)) ? { id: t.ID } : {}), wpId: t.ID, ...data } });
  }
  await resetSeq(tx, "EmailTemplate");
}

const STAGES = new Set(["new", "awaiting-docs", "submitted", "pre-approved", "full-approval", "settlement"]);
const STATUSES = new Set(["active", "archive", "completed", "unsuccessful"]);
const CHASE = new Set(["likely-return", "worth-trying", "keep-following-up", "maybe-later", "low-chance"]);
// meta keys consumed into columns / child tables (everything else lands in Case.meta)
const CASE_MAPPED = new Set([
  "_mmcrm_extra_apps", "mm_applicant_count", "mm_app3_name", "mm_app3_email", "mm_app3_mobile", "mm_app3_dob", "mm_app4_name", "mm_app4_email", "mm_app4_mobile", "mm_app4_dob",
  "_mmcrm_bank_pct", "_mmcrm_agg_pct", "_mmcrm_trail_pct", "_mmcrm_deal_v2", "_mmcrm_settle_date",
  "_edit_lock", "_edit_last", "_mm_name", "_mm_email", "mm_app1_name", "mm_app1_email", "mm_app1_mobile", "mm_app1_dob", "mm_app2_name", "mm_app2_email", "mm_app2_mobile", "mm_app2_dob",
  "_mm_token", "_mm_ff_link_disabled", "mm_show_factfind", "mm_show_documents", "_mm_ff_draft", "_mm_ff_done", "_mm_ff_done_at", "_mmf_ff_sent", "_mm_ff_signature_ts", "_mmf_origin",
  "_mmcrm_loan_type", "_mmc_loan_amount", "_mmc_comm_pct", "_mmc_comm_mm_pct", "_mmcrm_init", "_mmcrm_docs_done_flag", "_mmcrm_last_chase", "_mmcrm_chase_count", "_mmcrm_chase_exhausted",
  "_mmcrm_chase_pause", "_mm_items", "_mmcrm_activity", "_mmcrm_activity_dismissed", "_mm_ff_activity", "_mm_ff_msgs", "_mm_ff_submissions", "_mm_factfind_submissions", "_mmf_forms",
  "_mm_email_log", "_mmcrm_notes_rems", "_mmcrm_broker_notes", "_mmcrm_borrow_hist", "_mmcrm_flex_text", "_mmcrm_flex_ov", "_mmcrm_flex_done", "_mmcrm_last_allup", "_mmcrm_last_pending_alert_ts",
]);

async function migrateCases(tx: Tx) {
  const cases = await posts("mm_case");
  src("Case", cases.length);
  const ids = cases.map((c) => c.ID);
  const meta = await postMeta(ids);
  const terms = new Map<number, Record<string, string>>();
  if (ids.length) {
    const rows = await q<{ object_id: number; taxonomy: string; slug: string }>(
      "SELECT tr.object_id, tt.taxonomy, t.slug FROM {p}term_relationships tr JOIN {p}term_taxonomy tt ON tt.term_taxonomy_id = tr.term_taxonomy_id JOIN {p}terms t ON t.term_id = tt.term_id WHERE tr.object_id IN (?) AND tt.taxonomy IN ('mmcrm_case_status','mmcrm_stage','mmcrm_chase') ORDER BY tr.term_order, t.term_id",
      [ids],
    );
    for (const r of rows) {
      const m = terms.get(r.object_id) ?? {};
      m[r.taxonomy] ??= r.slug;
      terms.set(r.object_id, m);
    }
  }
  const seenZoho = new Set<string>();
  for (const p of cases) {
    const m = meta.get(p.ID) ?? {};
    const t = terms.get(p.ID) ?? {};
    const extraMeta: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(m)) if (!CASE_MAPPED.has(k)) extraMeta[k] = v;
    let stage = t.mmcrm_stage ?? "new";
    if (!STAGES.has(stage)) (extraMeta.legacyStage = stage), (stage = "new");
    let status = t.mmcrm_case_status ?? "active";
    if (!STATUSES.has(status)) (extraMeta.legacyStatus = status), (status = "active");
    const chase = t.mmcrm_chase && CHASE.has(t.mmcrm_chase) ? t.mmcrm_chase : null;
    if (m._mmcrm_activity_dismissed) extraMeta._mmcrm_activity_dismissed = m._mmcrm_activity_dismissed;

    const ex = await tx.case.findUnique({ where: { wpId: p.ID }, select: { id: true, portalToken: true } });
    let token = str(m._mm_token);
    if (token) {
      const clash = await tx.case.findFirst({ where: { portalToken: token, NOT: { wpId: p.ID } }, select: { id: true } });
      if (clash) token = "";
    }
    if (!token) token = ex?.portalToken ?? newToken();
    const data = {
      title: p.post_title || `Case #${p.ID}`,
      status,
      stage,
      chaseBucket: chase,
      legacyName: str(m._mm_name),
      legacyEmail: str(m._mm_email),
      app1Name: str(m.mm_app1_name),
      app1Email: str(m.mm_app1_email),
      app1Mobile: str(m.mm_app1_mobile),
      app1Dob: str(m.mm_app1_dob),
      app2Name: str(m.mm_app2_name),
      app2Email: str(m.mm_app2_email),
      app2Mobile: str(m.mm_app2_mobile),
      app2Dob: str(m.mm_app2_dob),
      ...updatedWpCaseFields(m),
      portalToken: token,
      portalClosed: truthy(m._mm_ff_link_disabled),
      showFactfind: m.mm_show_factfind === undefined || m.mm_show_factfind === "" ? true : truthy(m.mm_show_factfind),
      showDocuments: m.mm_show_documents === undefined || m.mm_show_documents === "" ? true : truthy(m.mm_show_documents),
      ffDraft: j(obj(m._mm_ff_draft)),
      ffDone: truthy(m._mm_ff_done),
      ffDoneAt: local(m._mm_ff_done_at),
      ffSentAt: local(m._mmf_ff_sent),
      ffSignatureTs: str(m._mm_ff_signature_ts),
      originFormId: int(m._mmf_origin) || null,
      loanType: str(m._mmcrm_loan_type),
      loanAmount: num(m._mmc_loan_amount),
      commPct: num(m._mmc_comm_pct),
      commMmPct: num(m._mmc_comm_mm_pct),
      initDone: truthy(m._mmcrm_init),
      docsDoneAt: m._mmcrm_docs_done_flag ? local(m._mmcrm_docs_done_flag) ?? (truthy(m._mmcrm_docs_done_flag) ? utc(p.post_modified_gmt) : null) : null,
      lastChaseAt: localTs(m._mmcrm_last_chase),
      chaseCount: int(m._mmcrm_chase_count),
      chaseExhausted: truthy(m._mmcrm_chase_exhausted),
      chasePaused: truthy(m._mmcrm_chase_pause),
      meta: j(extraMeta),
      createdAt: or(utc(p.post_date_gmt), new Date()),
      updatedAt: or(utc(p.post_modified_gmt), new Date()),
    };
    let id: number;
    if (ex) id = (await tx.case.update({ where: { id: ex.id }, data })).id;
    else id = (await tx.case.create({ data: { ...((await freeId(tx, "Case", p.ID)) ? { id: p.ID } : {}), wpId: p.ID, ...data } })).id;
    if (id !== p.ID) notes.push(`case wp ${p.ID} got id ${id} (id taken)`);
    caseIds.add(id);
    caseIdMap.set(p.ID, id);

    // ---- clear children (reload is idempotent)
    const w = { where: { caseId: id } };
    await tx.caseDocument.deleteMany(w);
    await tx.caseActivity.deleteMany(w);
    await tx.caseEvent.deleteMany(w);
    await tx.caseMessage.deleteMany(w);
    await tx.factFindSubmission.deleteMany(w);
    await tx.caseForm.deleteMany(w);
    await tx.caseEmail.deleteMany(w);
    await tx.caseReminder.deleteMany(w);
    // Broker Notes are append-only imports: preserve notes created in Next.js and their IDs.
    await tx.borrowCalc.deleteMany(w);
    await tx.flexState.deleteMany(w);
    await tx.caseSignalState.deleteMany(w);

    // _mm_items → CaseDocument
    const items = arr(m._mm_items);
    src("CaseDocument", items.length);
    if (items.length)
      await tx.caseDocument.createMany({
        data: items.map((it, i) => ({ caseId: id, label: str(it?.label) || "Document", status: str(it?.status) || "Pending", note: str(it?.note), files: j(arr(it?.files).filter(Boolean).map(String)), sort: i })),
      });

    // _mmcrm_activity → CaseActivity (dismissed via WP row hash)
    const dismissed = new Set(arr(m._mmcrm_activity_dismissed).map(String));
    const act = arr(m._mmcrm_activity);
    src("CaseActivity", act.length);
    if (act.length)
      await tx.caseActivity.createMany({
        data: act.map((r) => ({
          caseId: id,
          type: str(r?.type) || "sys",
          detail: str(r?.msg ?? r?.detail),
          by: str(obj(r?.ctx).who ?? r?.by),
          dismissed: dismissed.has(md5(`${str(r?.type)}|${wpStripAllTags(str(r?.msg))}|${int(r?.ts)}`)),
          createdAt: or(local(r?.time) ?? localTs(r?.ts), new Date()),
        })),
      });

    // _mm_ff_activity → CaseEvent
    const ev = arr(m._mm_ff_activity);
    src("CaseEvent", ev.length);
    if (ev.length)
      await tx.caseEvent.createMany({
        data: ev.map((r) => ({ caseId: id, type: str(r?.type) || "event", detail: str(r?.detail ?? r?.text), by: str(r?.by), extra: j(Array.isArray(r?.extra) ? {} : obj(r?.extra)), createdAt: or(local(r?.ts ?? r?.time), new Date()) })),
      });

    // _mm_ff_msgs → CaseMessage
    const msgs = arr(m._mm_ff_msgs);
    src("CaseMessage", msgs.length);
    if (msgs.length)
      await tx.caseMessage.createMany({
        data: msgs.map((r) => ({ caseId: id, by: str(r?.by) || "client", text: str(r?.text), name: str(r?.name), userId: mapUser(r?.user_id) || null, createdAt: or(local(r?.ts), new Date()) })),
      });

    // _mm_ff_submissions (+ legacy _mm_factfind_submissions) → FactFindSubmission
    const subs = [...arr(m._mm_factfind_submissions), ...arr(m._mm_ff_submissions)];
    const seenTs = new Set<string>();
    const subRows = subs.filter((s) => {
      const k = str(s?.ts) + md5(str(s?.data));
      if (seenTs.has(k)) return false;
      seenTs.add(k);
      return true;
    });
    src("FactFindSubmission", subRows.length);
    if (subRows.length)
      await tx.factFindSubmission.createMany({
        data: subRows.map((s) => {
          const html = obj(s?.html);
          const pdf = obj(s?.pdf);
          return {
            caseId: id,
            data: j(obj(s?.data)),
            ip: str(s?.ip),
            ua: str(s?.ua),
            legacyHtmlUrl: str(html.url ?? (typeof s?.html === "string" && /^https?:/.test(s.html) ? s.html : "")),
            legacyPdfUrl: str(pdf.url ?? ""),
            createdAt: or(local(s?.ts), new Date()),
          };
        }),
      });

    // _mmf_forms → CaseForm
    const forms = obj(m._mmf_forms);
    const fEntries = Object.entries(forms).filter(([fid]) => int(fid) > 0);
    src("CaseForm", fEntries.length);
    for (const [fid, st0] of fEntries) {
      const st = obj(st0);
      const formRow = await tx.crmForm.findUnique({ where: { wpId: int(fid) }, select: { id: true } });
      await tx.caseForm.create({
        data: {
          caseId: id,
          formId: formRow?.id ?? int(fid),
          sentAt: local(st.sent_at),
          openedAt: local(st.opened_at),
          submittedAt: local(st.submitted_at),
          removed: truthy(st.removed),
          draft: j(obj(st.draft)),
          history: j(arr(st.history).slice(-8)),
          createdAt: or(local(st.sent_at ?? st.updated_at), new Date()),
          updatedAt: or(local(st.updated_at ?? st.submitted_at), new Date()),
        },
      });
    }

    // _mm_email_log → CaseEmail
    const mails = arr(m._mm_email_log);
    src("CaseEmail", mails.length);
    if (mails.length)
      await tx.caseEmail.createMany({
        data: mails.map((e) => {
          let zid = str(e?.id).trim() || null;
          if (zid && seenZoho.has(zid)) zid = null;
          if (zid) seenZoho.add(zid);
          const srcTag = str(e?.source).toLowerCase();
          return {
            caseId: id,
            zohoId: zid,
            conversationId: str(e?.conversationId ?? e?.conv),
            folderId: str(e?.folderId),
            rfcId: str(e?.rfcId ?? e?.rfc),
            direction: str(e?.direction) === "in" ? "in" : "out",
            source: srcTag === "smtp" ? "smtp" : zid ? "sync" : "zoho",
            fromAddr: str(e?.from),
            toAddrs: str(e?.to),
            ccAddrs: str(e?.cc),
            bccAddrs: str(e?.bcc),
            subject: str(e?.subject),
            html: str(e?.html),
            attachments: j(arr(e?.attachments).map((a) => ({ name: str(a?.name ?? a?.attachmentName), size: int(a?.size ?? a?.attachmentSize), type: str(a?.type ?? a?.contentType) }))),
            status: str(e?.status) === "failed" ? "failed" : "sent",
            error: str(e?.error),
            sentBy: str(e?.by ?? e?.sent_by),
            sentAt: or(local(e?.time), new Date()),
            createdAt: or(local(e?.time), new Date()),
          };
        }),
      });

    // _mmcrm_notes_rems → CaseReminder
    const rems = arr(m._mmcrm_notes_rems);
    src("CaseReminder", rems.length);
    if (rems.length)
      await tx.caseReminder.createMany({
        data: rems.map((r) => {
          const isNote = str(r?.type) === "Note";
          const created = or(local(r?.created), new Date());
          return {
            caseId: id,
            type: isNote ? "Note" : "Reminder",
            title: isNote ? "" : str(r?.what),
            note: str(r?.text),
            priority: ["Low", "Normal", "High"].includes(str(r?.priority)) ? str(r?.priority) : "Normal",
            email: str(r?.email),
            dueAt: isNote ? null : unix(r?.due_ts) ?? local(r?.due_fmt),
            repeatDays: int(r?.repeat_days),
            done: truthy(r?.done),
            doneBy: str(r?.done_by),
            doneAt: local(r?.done_at) ?? null,
            auto: truthy(r?.auto),
            lastSentAt: unix(r?.last_sent_ts) ?? local(r?.last_sent),
            createdBy: str(r?.by ?? r?.created_by),
            createdAt: created,
            updatedAt: created,
          };
        }),
      });

    // _mmcrm_broker_notes → BrokerNote
    const bn = arr(m._mmcrm_broker_notes);
    src("BrokerNote", bn.length);
    for (const n of bn) {
      const sourceKey = `wp:case:${p.ID}:note:${str(n?.id) || sha1(JSON.stringify(n))}`;
      await importBrokerNote(tx, brokerNoteData(n, id), sourceKey);
    }

    // _mmcrm_borrow_hist → BorrowCalc (global history merged later, de-duped on id)
    const bh = arr(m._mmcrm_borrow_hist);
    src("BorrowCalc", bh.length);
    for (const b of bh) await upsertBorrow(tx, b, id);

    // _mmcrm_flex_* → FlexState
    if (m._mmcrm_flex_text !== undefined || m._mmcrm_flex_ov !== undefined || m._mmcrm_flex_done !== undefined) {
      src("FlexState", 1);
      const done: Record<string, true> = {};
      for (const [k, v] of Object.entries(obj(m._mmcrm_flex_done))) if (truthy(v)) done[k] = true;
      const ov: Record<string, string> = {};
      for (const [k, v] of Object.entries(obj(m._mmcrm_flex_ov))) ov[k] = str(v);
      const tx2: Record<string, string> = {};
      for (const [k, v] of Object.entries(obj(m._mmcrm_flex_text))) tx2[k] = str(v);
      await tx.flexState.create({ data: { caseId: id, overrides: ov, done, texts: tx2 } });
    }

    // signals state
    if (m._mmcrm_last_allup || m._mmcrm_last_pending_alert_ts) {
      src("CaseSignalState", 1);
      await tx.caseSignalState.create({ data: { caseId: id, lastAllUp: unix(m._mmcrm_last_allup), lastPendingAlert: unix(m._mmcrm_last_pending_alert_ts) } });
    }
  }
  await resetSeq(tx, "Case");
}
const caseIdMap = new Map<number, number>();
const mapCase = (wp: unknown) => caseIdMap.get(int(wp)) ?? 0;

async function importBrokerNote(tx: Tx, data: ReturnType<typeof brokerNoteData>, sourceKey: string) {
  // Adopt a row imported by older script versions, which had no stable source key.
  const existing = await tx.brokerNote.findUnique({ where: { sourceKey } });
  if (existing) { await tx.brokerNote.update({ where: { sourceKey }, data }); return; }
  const old = await tx.brokerNote.findFirst({ where: { sourceKey: null, caseId: data.caseId, title: data.title, body: data.body, createdAt: data.createdAt } });
  if (old) await tx.brokerNote.update({ where: { id: old.id }, data: { sourceKey } });
  await tx.brokerNote.upsert({ where: { sourceKey }, create: { ...data, sourceKey }, update: data });
}

function brokerNoteData(n: any, caseId: number) {
  const a = n?.author;
  const authorId = typeof a === "number" || /^\d+$/.test(str(a)) ? int(a) : 0;
  const when = or(unix(n?.date) ?? local(n?.date), new Date());
  return {
    caseId,
    title: str(n?.title),
    body: str(n?.body),
    author: authorId ? userName.get(authorId) ?? "User" : (str(a) && str(a) !== "0" ? str(a) : "System"),
    authorId: mapUser(authorId),
    createdAt: when,
    updatedAt: when,
  };
}

const borrowSeen = new Set<string>();
async function upsertBorrow(tx: Tx, b: any, caseIdOverride?: number) {
  const id = (str(b?.id) || sha1(JSON.stringify(b)).slice(0, 8)).slice(0, 32);
  if (borrowSeen.has(id)) return;
  borrowSeen.add(id);
  const caseId = caseIdOverride ?? mapCase(b?.case);
  const data = {
    caseId,
    userId: typeof b?.user === "number" || /^\d+$/.test(str(b?.user)) ? mapUser(b?.user) : 0,
    label: str(b?.label) || (b?.id ? "" : "legacy calc"),
    maxLoan: num(b?.max_loan ?? obj(b?.data).maxLoan) ?? 0,
    summary: str(b?.summary),
    data: j(obj(b?.data)),
    createdAt: or(local(b?.ts ?? b?.time), new Date()),
  };
  await tx.borrowCalc.upsert({ where: { id }, create: { id, ...data }, update: data });
}

async function migrateFactFindEntries(tx: Tx) {
  const ps = await posts("fact_find");
  src("FactFindEntry", ps.length);
  const meta = await postMeta(ps.map((p) => p.ID));
  for (const p of ps) {
    const m = meta.get(p.ID) ?? {};
    const data: Record<string, unknown> = {};
    const files: string[] = [];
    for (const [k, v] of Object.entries(m)) {
      if (k.startsWith("_") || k === "wpcf7_hp_field") continue;
      if (/^mfile-\d+$/.test(k)) {
        for (const f of Array.isArray(v) ? v : String(v ?? "").split(/\s*[\n,]\s*/)) if (str(f)) files.push(str(f));
        continue;
      }
      data[k] = v;
    }
    const row = { title: p.post_title, data: j(data), files: j(files), createdAt: or(utc(p.post_date_gmt), new Date()) };
    const ex = await tx.factFindEntry.findUnique({ where: { wpId: p.ID }, select: { id: true, files: true, data: true } });
    if (ex) {
      // keep already-imported file refs (phase 2) for unchanged legacy values
      const exData = obj(ex.data);
      for (const k of Object.keys(data)) if (/^signature-\d+$/.test(k) && str(exData[k]).startsWith("file:")) data[k] = exData[k];
      const exFiles = arr(ex.files);
      await tx.factFindEntry.update({ where: { id: ex.id }, data: { ...row, data: j(data), files: j(exFiles.some((f) => typeof f === "object") ? exFiles : files) } });
    } else await tx.factFindEntry.create({ data: { ...((await freeId(tx, "FactFindEntry", p.ID)) ? { id: p.ID } : {}), wpId: p.ID, ...row } });
  }
  await resetSeq(tx, "FactFindEntry");
}

async function exists(tx: Tx, model: "brokerNote" | "learningItem", where: any) {
  return (await (tx as any)[model].count({ where })) > 0;
}

async function migrateGlobalNotes(tx: Tx) {
  // general broker notes (option) → BrokerNote caseId 0 (insert-if-absent)
  const gen = arr(await option("mmcrm_general_broker_notes"));
  // orphan mmcrm_broker_note CPT (older plugin version): attach to its _mmcrm_case_id when that case exists
  const cpt = await posts("mmcrm_broker_note");
  const cm = await postMeta(cpt.map((c) => c.ID));
  src("BrokerNote", gen.length + cpt.length);
  for (const n of gen) {
    const d = brokerNoteData(n, 0);
    await importBrokerNote(tx, d, `wp:general:note:${str(n?.id) || sha1(JSON.stringify(n))}`);
  }
  for (const c of cpt) {
    const caseId = mapCase(cm.get(c.ID)?._mmcrm_case_id);
    const d = { caseId, title: c.post_title, body: c.post_content, author: userName.get(c.post_author) ?? "", authorId: mapUser(c.post_author), createdAt: or(utc(c.post_date_gmt), new Date()), updatedAt: or(utc(c.post_modified_gmt), new Date()) };
    await importBrokerNote(tx, d, `wp:note-post:${c.ID}`);
  }
  if (cpt.length) notes.push(`mmcrm_broker_note CPT (${cpt.length}) attached to its _mmcrm_case_id (0 if case missing)`);

  const li = arr(await option("mmcrm_learning_items"));
  src("LearningItem", li.length);
  for (const it of li) {
    const created = or(unix(it?.date), new Date());
    const data = {
      title: str(it?.title) || "Untitled",
      url: str(it?.url),
      summary: str(it?.summary),
      tags: Array.isArray(it?.tags) ? it.tags.map(str).join(", ") : str(it?.tags),
      pinned: truthy(it?.pinned),
      author: typeof it?.author === "number" || /^\d+$/.test(str(it?.author)) ? userName.get(int(it.author)) ?? "" : str(it?.author),
      createdAt: created,
      updatedAt: or(unix(it?.updated), created),
    };
    const ex = await tx.learningItem.findFirst({ where: { title: data.title, createdAt: created }, select: { id: true } });
    if (ex) await tx.learningItem.update({ where: { id: ex.id }, data });
    else await tx.learningItem.create({ data });
  }

  // global borrowing history (new + pre-2025 format)
  const bh = [...arr(await option("mmcrm_borrow_history")), ...arr(await option("mm_borrow_history"))];
  src("BorrowCalc", bh.length);
  for (const b of bh) await upsertBorrow(tx, b);
}

async function migrateMarketing(tx: Tx) {
  if (await tableExists("mmcrm_contacts")) {
    const rows = await q("SELECT id, email, first_name, last_name, full_name, source, status, audience, DATE_FORMAT(birthday, '%Y-%m-%d') AS birthday, case_id, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at, DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at FROM {p}mmcrm_contacts ORDER BY id");
    src("MktContact", rows.length);
    for (const r of rows) {
      const email = str(r.email).trim().toLowerCase();
      if (!email) continue;
      const data = {
        firstName: str(r.first_name),
        lastName: str(r.last_name),
        fullName: str(r.full_name),
        source: str(r.source) || "manual",
        status: str(r.status) || "Active",
        audience: str(r.audience),
        birthday: r.birthday && r.birthday !== "0000-00-00" ? str(r.birthday) : "",
        caseId: r.case_id ? mapCase(r.case_id) || int(r.case_id) : null,
        createdAt: or(utc(r.created_at), new Date()),
        updatedAt: or(utc(r.updated_at), new Date()),
      };
      const ex = await tx.mktContact.findUnique({ where: { email }, select: { id: true } });
      if (ex) await tx.mktContact.update({ where: { id: ex.id }, data });
      else await tx.mktContact.create({ data: { ...((await freeId(tx, "MktContact", int(r.id))) ? { id: int(r.id) } : {}), email, ...data } });
    }
    await resetSeq(tx, "MktContact");
  }
  if (await tableExists("mmcrm_mkt_log")) {
    const rows = await q("SELECT id, DATE_FORMAT(ts, '%Y-%m-%d %H:%i:%s') AS ts, user_id, type, note, payload FROM {p}mmcrm_mkt_log ORDER BY id");
    src("MktLog", rows.length);
    for (const r of rows) {
      const data = { ts: or(local(r.ts), new Date()), userId: mapUser(r.user_id), type: str(r.type), note: str(r.note), payload: j(json(r.payload, maybe(r.payload) ?? {})) };
      await tx.mktLog.upsert({ where: { id: int(r.id) }, create: { id: int(r.id), ...data }, update: data });
    }
    await resetSeq(tx, "MktLog");
  }
}

async function setSetting(tx: Tx, key: string, value: unknown) {
  if (value === undefined) return;
  src("Setting", 1);
  const v = value as Prisma.InputJsonValue;
  await tx.setting.upsert({ where: { key }, create: { key, value: v }, update: { value: v } });
}

async function migrateSettings(tx: Tx) {
  const income = obj(await option('mmcrm_income'));
  for (const [key, fallback] of Object.entries(INCOME_DEFAULTS)) {
    // WP stores plain percentages already; do not normalise them a second time.
    await setSetting(tx, `crmx.income.${key}`, key === 'paydown' ? (truthy(income[key] ?? fallback) ? 1 : 0) : num(income[key]) ?? fallback);
  }
  if (await option('mmcrm_enquiry_v2')) await setSetting(tx, 'crm.enquiryV2', 1);
  const o = obj(await option("mm_crm_options"));
  if (Object.keys(o).length) {
    const core: Record<string, unknown> = {};
    for (const k of ["brand_logo", "from_name", "from_email", "signature_html", "auto_append_signature", "commission_target", "notify_email"]) if (o[k] !== undefined) core[k] = o[k];
    core.auto_append_signature = int(core.auto_append_signature ?? 1);
    core.commission_target = num(core.commission_target) ?? 0;
    await setSetting(tx, "crm.options", core);
    await setSetting(tx, "crmx.mail", { signatureHtml: str(o.signature_html), autoAppendSignature: truthy(o.auto_append_signature ?? 1) });
    if (o.commission_target !== undefined) await setSetting(tx, "crmx.commissionTarget", num(o.commission_target) ?? 0);
    // Zoho Mail OAuth — tokens kept so the connection keeps working
    await setSetting(tx, "crmx.zoho", {
      dc: str(o.zoho_dc) || "com.au",
      clientId: str(o.zoho_client_id),
      clientSecret: str(o.zoho_client_secret),
      refresh: str(o.zoho_refresh),
      access: str(o.zoho_access),
      accessExp: int(o.zoho_access_exp),
      accountId: str(o.zoho_account_id),
      label: str(o.zoho_label) || "MustangCRM",
      inboxFolder: str(o.zoho_inbox_folder),
      sentFolder: str(o.zoho_sent_folder),
      fromEmail: str(o.zoho_from_email),
      alias1: str(o.alias_1),
      alias2: str(o.alias_2),
    });
  }
  const auto = await option("mmcrm_auto");
  if (auto) {
    await setSetting(tx, "crm.auto", auto);
    await setSetting(tx, "crm.automation", auto); // crm-extra flex.ts reads portal_off_on_flex from here
  }
  const presets = await option("mmcrm_checklist_presets");
  if (Array.isArray(presets)) await setSetting(tx, "crm.presets", presets.map((p) => ({ name: str(p?.name), tags: arr(p?.tags).map(str), items: arr(p?.items).map(str) })));
  const fe = await option("mmcrm_form_email_tpl");
  if (fe) await setSetting(tx, "crm.formEmail", { subject: str(fe.subject), body: str(fe.body) });
  const ff = int(await option("mmcrm_ff_form_id"));
  if (ff) {
    const f = await tx.crmForm.findUnique({ where: { wpId: ff }, select: { id: true } });
    if (f) await setSetting(tx, "crm.ffFormId", f.id);
    else notes.push(`mmcrm_ff_form_id=${ff} has no matching mm_form; crm.ffFormId not set`);
  }
  const links = await option("mmcrm_custom_links");
  if (Array.isArray(links)) {
    const rows = links.map((l, i) => ({ id: str(l?.id) || `l_${i + 1}`, label: str(l?.label), url: str(l?.url), group: str(l?.group), target: truthy(l?.target) ? 1 : 0, modal: truthy(l?.modal) ? 1 : 0, order: int(l?.order, i + 1), notes: str(l?.notes), icon: str(l?.icon) }));
    await setSetting(tx, "crmx.links", rows);
    await setSetting(tx, "crm.customLinks", rows);
  }
  const aud = await option("mmcrm_mkt_audiences");
  if (Array.isArray(aud)) await setSetting(tx, "crmx.mkt.audiences", aud.map(str));
  const bday = await option("mmcrm_mkt_bday");
  if (bday) await setSetting(tx, "crmx.mkt.bday", { enabled: truthy(bday.enabled) ? 1 : 0, template_id: int(bday.template_id), hour: int(bday.hour, 9) });
  const bs = (await option("mmcrm_borrow_settings")) ?? (await option("mm_borrow_settings"));
  if (bs && typeof bs === "object") await setSetting(tx, "crmx.borrow.settings", bs);
  const ics = await option("mmcrm_ics_token");
  if (ics) await setSetting(tx, "crmx.ics.token", str(ics));
  const cur = await option("mmcrm_sync_cursors");
  const curObj = obj(cur);
  await setSetting(tx, "crmx.sync.cursors", Object.fromEntries(Object.entries(curObj).map(([k, v]) => [k, str(v)])));

  // ZohoIndex (threading): WP maps id → case post id (== new case id)
  let idxSkipped = 0;
  const idx: [string, string][] = [["rfc", "mm_crm_rfc_index"], ["msg", "mm_crm_msg_index"], ["conv", "mmcrm_conv_index"], ["contact", "mm_crm_contact_index"]];
  for (const [kind, opt] of idx) {
    const m = obj(await option(opt));
    const entries = Object.entries(m);
    src("ZohoIndex", entries.length);
    let i = 0;
    const base = Date.now() - entries.length * 1000;
    for (const [k, v] of entries) {
      const caseId = mapCase(v);
      const key = kind === "contact" ? k.trim().toLowerCase() : k.trim();
      i++;
      if (!caseId || !key) {
        idxSkipped++;
        continue;
      }
      const updatedAt = new Date(base + i * 1000); // keep WP's newest-last order for cap trimming
      await tx.zohoIndex.upsert({ where: { kind_key: { kind, key } }, create: { kind, key, caseId, updatedAt }, update: { caseId } });
    }
  }
  if (idxSkipped) notes.push(`ZohoIndex: ${idxSkipped} entries point to deleted cases — skipped`);
}

async function migrateCf7(tx: Tx) {
  if (!(await tableExists("db7_forms"))) {
    notes.push("no cfdb7 table — CF7 submissions skipped");
    return;
  }
  if (!("formSubmission" in tx)) {
    notes.push("FormSubmission model missing — CF7 submissions skipped");
    return;
  }
  const titles = new Map<number, string>();
  for (const r of await q<{ ID: number; post_title: string }>("SELECT ID, post_title FROM {p}posts WHERE post_type='wpcf7_contact_form'")) titles.set(r.ID, r.post_title);
  const rows = await q("SELECT form_id, form_post_id, form_value, DATE_FORMAT(form_date, '%Y-%m-%d %H:%i:%s') AS form_date FROM {p}db7_forms ORDER BY form_id");
  src("FormSubmission(cfdb7)", rows.length);
  for (const r of rows) {
    const v = obj(maybe(r.form_value));
    const data: Record<string, unknown> = {};
    const files: any[] = [];
    const legacy: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) {
      if (k === "cfdb7_status") continue;
      if (k.endsWith("cfdb7_file")) {
        const field = k.slice(0, -"cfdb7_file".length);
        for (const f of arr(val).length ? arr(val) : [val]) if (str(f)) files.push({ field, name: path.basename(decodeEntities(str(f))), legacy: str(f), kind: "upload" });
        continue;
      }
      if (/^mfile-\d+$/.test(k)) {
        for (const f of Array.isArray(val) ? val : [val]) if (str(f)) files.push({ field: k, name: path.basename(decodeEntities(str(f))), legacy: str(f), kind: "upload" });
        continue;
      }
      if (/^signature-\d+$/.test(k)) {
        if (str(val)) files.push({ field: k, name: `${k}.png`, legacy: str(val), kind: "signature" });
        continue;
      }
      if (/^signature-\d+-(attachment|inline)$/.test(k)) {
        legacy[k] = val;
        continue;
      }
      data[k] = Array.isArray(val) ? val.map((x) => decodeEntities(str(x))) : decodeEntities(str(val));
    }
    const name = str(v["your-name"] ?? v.applicant1_fullname ?? v["full-name"] ?? "");
    const email = str(v["your-email"] ?? v.applicant1_email ?? v.email ?? "");
    const formKey = `cf7:${r.form_post_id}`;
    const row = {
      formKey,
      formTitle: titles.get(int(r.form_post_id)) ?? `CF7 form ${r.form_post_id}`,
      name,
      email,
      data: j(data),
      status: str(v.cfdb7_status) === "read" ? "read" : "new",
      createdAt: or(local(r.form_date), new Date()),
    };
    const ex = await tx.formSubmission.findFirst({ where: { meta: { path: ["cfdb7Id"], equals: int(r.form_id) } }, select: { id: true, files: true } });
    const meta = j({ source: "cfdb7", cfdb7Id: int(r.form_id), ...(Object.keys(legacy).length ? { legacy } : {}) });
    if (ex) {
      const exFiles = arr(ex.files);
      await tx.formSubmission.update({ where: { id: ex.id }, data: { ...row, meta, files: j(exFiles.some((f) => f?.fileId) ? exFiles : files) } });
    } else await tx.formSubmission.create({ data: { ...row, meta, files: j(files) } });
  }
}

async function migrateSsa(tx: Tx) {
  if (!(await tableExists("ssa_appointment_types"))) return;
  const types = await q("SELECT *, DATE_FORMAT(date_created, '%Y-%m-%d %H:%i:%s') AS dc, DATE_FORMAT(date_modified, '%Y-%m-%d %H:%i:%s') AS dm, DATE_FORMAT(availability_start_date, '%Y-%m-%d %H:%i:%s') AS avs, DATE_FORMAT(availability_end_date, '%Y-%m-%d %H:%i:%s') AS ave FROM {p}ssa_appointment_types ORDER BY id");
  src("AppointmentType", types.length);
  const typeMap = new Map<number, number>();
  for (const t of types) {
    const av = obj(json(t.availability, {}));
    const availability: Record<string, { start: string; end: string }[]> = {};
    for (const [day, blocks] of Object.entries(av)) availability[day] = arr(blocks).map((b) => ({ start: str(b?.start ?? b?.time_start).slice(0, 5), end: str(b?.end ?? b?.time_end).slice(0, 5) }));
    const notif = arr(json(t.notifications, []));
    const data = {
      slug: str(t.slug) || `type-${t.id}`,
      title: str(t.title),
      description: str(t.description),
      instructions: str(t.instructions),
      durationMin: int(t.duration, 60),
      bufferBeforeMin: int(t.buffer_before),
      bufferAfterMin: int(t.buffer_after),
      minNoticeMin: int(t.min_booking_notice, 1440),
      maxNoticeMin: int(t.max_booking_notice, 525600),
      incrementMin: int(t.availability_increment, 30) || 30,
      capacity: int(t.capacity, 1) || 1,
      maxPerDay: int(t.max_event_count),
      availabilityType: str(t.availability_type) || "available_blocks",
      availability: j(availability),
      availabilityStart: utc(t.avs),
      availabilityEnd: utc(t.ave),
      customerFields: j(arr(json(t.customer_information, []))),
      customFields: j(arr(json(t.custom_customer_information, []))),
      notifyAdmin: notif.length ? notif.some((n) => truthy(n?.admin) || /admin/i.test(str(n?.type ?? n?.field))) || true : true,
      notifyCustomer: true,
      webMeetingUrl: str(obj(json(t.web_meetings, {})).url),
      location: "",
      status: str(t.status) || "publish",
      displayOrder: int(t.display_order),
      createdAt: or(utc(t.dc), new Date()),
      updatedAt: or(utc(t.dm), new Date()),
    };
    let ex = await tx.appointmentType.findUnique({ where: { wpId: int(t.id) }, select: { id: true } });
    ex ??= await tx.appointmentType.findUnique({ where: { slug: data.slug }, select: { id: true } });
    const r = ex
      ? await tx.appointmentType.update({ where: { id: ex.id }, data: { wpId: int(t.id), ...data } })
      : await tx.appointmentType.create({ data: { ...((await freeId(tx, "AppointmentType", int(t.id))) ? { id: int(t.id) } : {}), wpId: int(t.id), ...data } });
    typeMap.set(int(t.id), r.id);
  }
  await resetSeq(tx, "AppointmentType");

  const appts = await q(
    "SELECT id, appointment_type_id, rescheduled_from_appointment_id, rescheduled_to_appointment_id, customer_id, customer_information, customer_timezone, status, DATE_FORMAT(start_date, '%Y-%m-%d %H:%i:%s') AS sd, DATE_FORMAT(end_date, '%Y-%m-%d %H:%i:%s') AS ed, DATE_FORMAT(date_created, '%Y-%m-%d %H:%i:%s') AS dc, DATE_FORMAT(date_modified, '%Y-%m-%d %H:%i:%s') AS dm, web_meeting_url FROM {p}ssa_appointments ORDER BY id",
  );
  src("Appointment", appts.length);
  for (const a of appts) {
    const typeId = typeMap.get(int(a.appointment_type_id));
    if (!typeId) {
      notes.push(`appointment ${a.id}: unknown type ${a.appointment_type_id} — skipped`);
      continue;
    }
    const ci = obj(json(a.customer_information, {}));
    const status = str(a.status) === "canceled" ? "canceled" : "booked";
    const data = {
      appointmentTypeId: typeId,
      startAt: or(utc(a.sd), new Date()),
      endAt: or(utc(a.ed), new Date()),
      status,
      customerName: str(ci.Name ?? ci.name),
      customerEmail: str(ci.Email ?? ci.email).toLowerCase(),
      customerPhone: str(ci.Phone ?? ci.phone),
      customerInfo: j(ci),
      customerTimezone: str(a.customer_timezone) || TZ,
      userId: mapUser(a.customer_id) || null,
      rescheduledFromId: int(a.rescheduled_from_appointment_id) || null,
      rescheduledToId: int(a.rescheduled_to_appointment_id) || null,
      canceledAt: status === "canceled" ? utc(a.dm) : null,
      source: "import",
      createdAt: or(utc(a.dc), new Date()),
      updatedAt: or(utc(a.dm), new Date()),
    };
    const ex = await tx.appointment.findUnique({ where: { wpId: int(a.id) }, select: { id: true } });
    if (ex) await tx.appointment.update({ where: { id: ex.id }, data });
    else await tx.appointment.create({ data: { ...((await freeId(tx, "Appointment", int(a.id))) ? { id: int(a.id) } : {}), wpId: int(a.id), token: newToken(), ...data } });
  }
  await resetSeq(tx, "Appointment");
  notes.push("SSA global settings (ssa_settings_json) not migrated — tools.ssa defaults are a copy of the live option");
}

// ============================================================== PHASE 2 (files)
const MIME: Record<string, string> = { pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", heic: "image/heic", html: "text/html", htm: "text/html", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", csv: "text/csv", txt: "text/plain", zip: "application/zip" };
const mimeOf = (name: string) => MIME[path.extname(name).slice(1).toLowerCase()] ?? "application/octet-stream";
const safeName = (name: string) => path.basename(name).replace(/[^\w.\- ]+/g, "_").slice(-120) || "file";
const fstats = { copied: 0, reused: 0, missing: 0, refs: 0 };
const missingSamples: string[] = [];

let baseIndex: Map<string, string[]> | null = null;
async function basenameIndex() {
  if (baseIndex) return baseIndex;
  baseIndex = new Map();
  const walk = async (dir: string) => {
    let ents: import("fs").Dirent[] = [];
    try {
      ents = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.isFile()) baseIndex!.set(e.name, [...(baseIndex!.get(e.name) ?? []), p]);
    }
  };
  for (const d of ["cfdb7_uploads", "wp_dndcf7_uploads", "dscf7_signatures", "wpcf7_uploads"]) await walk(path.join(UPLOADS, d));
  return baseIndex;
}

/** Resolve a legacy reference (uploads URL, bare cfdb7 filename or data: URI) to bytes. */
async function resolveRef(ref: string): Promise<{ data: Buffer; name: string; key: string } | null> {
  const s = decodeEntities(ref.trim());
  const dm = s.match(/^data:([\w/+.-]+);base64,([\s\S]+)$/);
  if (dm) {
    const ext = dm[1].split("/")[1]?.replace("jpeg", "jpg") || "bin";
    return { data: Buffer.from(dm[2], "base64"), name: `signature.${ext}`, key: "data:" + md5(s) };
  }
  let abs = "";
  const um = s.match(/\/wp-content\/uploads\/([^?#]+)/);
  if (um) {
    const rel = decodeURIComponent(um[1]);
    if (rel.includes("..")) return null;
    abs = path.join(UPLOADS, rel);
  } else if (!s.includes("/") && s) {
    const hits = (await basenameIndex()).get(s) ?? [];
    abs = hits[0] ?? "";
  }
  if (!abs || !existsSync(abs)) return null;
  return { data: await fs.readFile(abs), name: path.basename(abs), key: path.relative(UPLOADS, abs) };
}

async function importFile(ref: string, folder: string, owner: string, displayName?: string): Promise<{ fileId: string; name: string } | null> {
  fstats.refs++;
  const r = await resolveRef(ref);
  if (!r) {
    fstats.missing++;
    if (missingSamples.length < 8) missingSamples.push(`${owner}:${ref.startsWith("data:") ? "data-uri" : path.basename(ref.split("?")[0]).slice(0, 4) + "…" + path.extname(ref.split("?")[0])}`);
    return null;
  }
  const name = displayName || r.name;
  const rel = path.posix.join(folder, `wp-${sha1(r.key).slice(0, 12)}-${safeName(name)}`);
  const abs = path.join(STORAGE_DIR, rel);
  if (DRY) return { fileId: "dry-run", name };
  const st = await fs.stat(abs).catch(() => null);
  if (!st || st.size !== r.data.length) {
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, r.data);
    fstats.copied++;
  } else fstats.reused++;
  const rec = await prisma.storedFile.upsert({
    where: { path: rel },
    create: { path: rel, originalName: name, mimeType: mimeOf(name), size: r.data.length, owner },
    update: { originalName: name, mimeType: mimeOf(name), size: r.data.length, owner },
  });
  return { fileId: rec.id, name };
}

async function migrateFiles() {
  if (!UPLOADS || !existsSync(UPLOADS)) {
    notes.push("WP_UPLOADS_DIR not set/found — private files phase skipped (legacy URLs kept)");
    return;
  }
  // case document checklist files
  const docs = await prisma.caseDocument.findMany({ select: { id: true, caseId: true, files: true } });
  for (const d of docs) {
    const files = arr(d.files);
    let changed = false;
    const out: any[] = [];
    for (const f of files) {
      if (typeof f === "string" && f) {
        const name = decodeURIComponent(f.split("?")[0].split("/").pop() || "file");
        const r = await importFile(f, `cases/${d.caseId}/docs`, `case:${d.caseId}`, name);
        if (r) {
          out.push({ fileId: r.fileId, name: r.name });
          changed = true;
        } else out.push(f);
      } else out.push(f);
    }
    if (changed && !DRY) await prisma.caseDocument.update({ where: { id: d.id }, data: { files: j(out) } });
  }
  // fact-find HTML/PDF snapshots
  const subs = await prisma.factFindSubmission.findMany({ where: { OR: [{ legacyHtmlUrl: { not: "" }, htmlFileId: null }, { legacyPdfUrl: { not: "" }, pdfFileId: null }] } });
  for (const s of subs) {
    const upd: { htmlFileId?: string; pdfFileId?: string } = {};
    if (s.legacyHtmlUrl && !s.htmlFileId) upd.htmlFileId = (await importFile(s.legacyHtmlUrl, `cases/${s.caseId}/factfind`, `case:${s.caseId}`))?.fileId;
    if (s.legacyPdfUrl && !s.pdfFileId) upd.pdfFileId = (await importFile(s.legacyPdfUrl, `cases/${s.caseId}/factfind`, `case:${s.caseId}`))?.fileId;
    if (!DRY && (upd.htmlFileId || upd.pdfFileId)) await prisma.factFindSubmission.update({ where: { id: s.id }, data: upd });
  }
  // legacy CF7 fact-find CPT (signature + uploads)
  const ffe = await prisma.factFindEntry.findMany({ where: { wpId: { not: null } } });
  for (const e of ffe) {
    const data = obj(e.data);
    let changed = false;
    for (const [k, v] of Object.entries(data)) {
      if (!/^signature-\d+$/.test(k) || typeof v !== "string" || !v || v.startsWith("file:")) continue;
      const r = await importFile(v, "factfind-cf7", "factfind", `${k}.png`);
      if (r) (data[k] = `file:${r.fileId}`), (changed = true);
    }
    const files: any[] = [];
    for (const f of arr(e.files)) {
      if (typeof f === "string" && f) {
        const r = await importFile(f, "factfind-cf7", "factfind");
        files.push(r ?? f);
        if (r) changed = true;
      } else files.push(f);
    }
    if (changed && !DRY) await prisma.factFindEntry.update({ where: { id: e.id }, data: { data: j(data), files: j(files) } });
  }
  // CF7 (cfdb7) submissions
  const fsubs = await prisma.formSubmission.findMany({ where: { meta: { path: ["source"], equals: "cfdb7" } } });
  for (const s of fsubs) {
    const files = arr(s.files);
    let changed = false;
    const out: any[] = [];
    for (const f of files) {
      if (f && !f.fileId && f.legacy) {
        const formId = s.formKey.replace(/^cf7:/, "");
        const r = await importFile(String(f.legacy), `cf7/${formId}`, `cf7:${formId}`, f.kind === "signature" ? `${f.field}.png` : undefined);
        if (r) {
          const rec = DRY ? null : await prisma.storedFile.findUnique({ where: { id: r.fileId } });
          out.push({ field: f.field, fileId: r.fileId, name: r.name, size: rec?.size ?? 0, mimeType: rec?.mimeType ?? mimeOf(r.name), kind: f.kind });
          changed = true;
          continue;
        }
      }
      out.push(f);
    }
    if (changed && !DRY) await prisma.formSubmission.update({ where: { id: s.id }, data: { files: j(out) } });
  }
}

// ============================================================== verify
async function targetCounts(client: Tx | PrismaClient = prisma) {
  const c = async (m: string, where: any = {}) => (client as any)[m].count({ where });
  const wp = { wpId: { not: null } };
  const set = (k: string, v: number) => counts[k] && (counts[k].dst = v);
  set("User", await c("user", wp));
  set("Case", await c("case", wp));
  set("CrmForm", await c("crmForm", wp));
  set("EmailTemplate", await c("emailTemplate", wp));
  set("FactFindEntry", await c("factFindEntry", wp));
  set("AppointmentType", await c("appointmentType", wp));
  set("Appointment", await c("appointment", wp));
  for (const m of ["CaseDocument", "CaseActivity", "CaseEvent", "CaseMessage", "FactFindSubmission", "CaseForm", "CaseEmail", "CaseReminder", "FlexState", "CaseSignalState"])
    set(m, await c(m[0].toLowerCase() + m.slice(1), { caseId: { in: [...caseIds] } }));
  set("BrokerNote", await c("brokerNote"));
  set("BorrowCalc", await c("borrowCalc"));
  set("LearningItem", await c("learningItem"));
  set("MktContact", await c("mktContact"));
  set("MktLog", await c("mktLog"));
  set("ZohoIndex", await c("zohoIndex"));
  set("Setting", await c("setting"));
  if (counts["FormSubmission(cfdb7)"]) set("FormSubmission(cfdb7)", await c("formSubmission", { meta: { path: ["source"], equals: "cfdb7" } }));
}

// ============================================================== main
async function main() {
  if (!FILES_ONLY) {
    if (!process.env.WP_DB_USER) throw new Error("WP_DB_USER / WP_DB_PASSWORD env required");
    my = await mysql.createConnection({
      host: process.env.WP_DB_HOST || "127.0.0.1",
      port: Number(process.env.WP_DB_PORT || 3306),
      user: process.env.WP_DB_USER,
      password: process.env.WP_DB_PASSWORD,
      database: process.env.WP_DB_NAME || "mustang_wp",
      charset: "utf8mb4",
      dateStrings: true,
      supportBigNumbers: true,
      bigNumberStrings: false,
    });
    log(`Phase 1: WP ${process.env.WP_DB_NAME || "mustang_wp"} → Postgres${DRY ? " (DRY RUN — rolled back)" : ""}`);
    try {
      await prisma.$transaction(
        async (tx) => {
          await migrateUsers(tx);
          await migrateForms(tx);
          await migrateCases(tx);
          await migrateFactFindEntries(tx);
          await migrateGlobalNotes(tx);
          await migrateMarketing(tx);
          await migrateSettings(tx);
          await migrateCf7(tx);
          await migrateSsa(tx);
          if (DRY) {
            await targetCounts(tx); // count inside the tx, then roll back
            throw new DryRunRollback();
          }
        },
        { timeout: 15 * 60_000, maxWait: 30_000 },
      );
    } catch (e) {
      if (!(e instanceof DryRunRollback)) throw e;
    } finally {
      await my.end();
    }
  }
  if (!SKIP_FILES) {
    log(`Phase 2: private files from ${UPLOADS || "(WP_UPLOADS_DIR unset)"} → ${STORAGE_DIR}${DRY ? " (dry run: resolve only)" : ""}`);
    await migrateFiles();
  }
  if (!DRY) await targetCounts();

  log("\nEntity                     source → target");
  for (const [k, v] of Object.entries(counts)) log(`  ${k.padEnd(24)} ${String(v.src).padStart(6)} → ${v.dst === undefined ? "-" : v.dst}`);
  if (!SKIP_FILES && UPLOADS) log(`\nFiles: refs=${fstats.refs} copied=${fstats.copied} reused=${fstats.reused} missing=${fstats.missing}${missingSamples.length ? ` (e.g. ${missingSamples.join(", ")})` : ""}`);
  if (badSerial) notes.push(`${badSerial} serialized values could not be parsed (kept as raw strings)`);
  if (notes.length) log("\nNotes:\n  - " + notes.join("\n  - "));
}

main()
  .catch((e: any) => {
    // never dump Prisma invocation args (they contain row data): code + target / last line only
    const msg = e?.code ? `${e.code} ${JSON.stringify(e.meta?.target ?? e.meta?.modelName ?? "")}` : String(e?.message ?? e).trim().split("\n").pop();
    console.error("Migration failed:", msg);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
