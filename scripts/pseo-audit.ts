/**
 * Programmatic-SEO quality gates (research/programmatic-seo.md §C6, §C4.1).
 *
 *   npx tsx scripts/pseo-audit.ts --base http://localhost:3005 [--kinds suburb,visa] [--strict] [--out scripts/out/pseo-audit.json]
 *
 * Discovers every programmatic page (suburb, visa, fhb, duty, community) from the route data and the SeoReview table,
 * fetches it, extracts the main content (<main> minus nav/script/style/svg and [data-pseo-exclude]) and checks:
 *   - main-content word count (suburb ≥700, fhb ≥1,200, visa ≥1,500, lender ≥900)
 *   - masked 5-gram uniqueness, pairwise within each page type (lowercase; page's own entity names, LGA and
 *     4-digit numbers masked; shingles of A not in B ÷ shingles of A): per-page min (vs nearest twin) and median;
 *     type min ≥40% (warn), <30% HARD STOP, type median ≥45%
 *   - data completeness (suburb ≥10/14), rules freshness (isStale / auditFreshness on the rules each page uses)
 *   - disclaimer in main, licence block in footer, self-canonical, exactly one H1, unique title / H1 / meta description
 *   - index leak (indexable while not broker-reviewed), sitemap only lists reviewed pages, broker note status
 * Writes scripts/out/pseo-audit.json (read by /admin/seo) and prints a table.
 * Exit 1 on hard stops (<30% uniqueness, missing disclaimer, stale rules, missing licence, bad canonical,
 * duplicate title/H1/meta, index leak, expected page missing). --strict also exits 1 on gate failures (e.g. word count).
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { auditFreshness } from "../src/modules/calc/freshness";
import { RULES, FEDERAL } from "../src/modules/calc/rules";
import type { AuState } from "../src/modules/calc/types";
import { VISA_POLICIES } from "../src/modules/seo-data/visas";
import { STATE_CODES } from "../src/modules/seo-data/types";
import { getSuburbBySlug } from "../src/modules/seo-data/suburbs";
import { PUBLISHED_SUBURBS, suburbKey, suburbPath } from "../src/modules/web/suburbs/model";

/* ------------------------------------------------------------------ CLI */

const argv = process.argv.slice(2);
const arg = (name: string, dflt?: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : dflt;
};
const BASE = (arg("base", "http://localhost:3005") as string).replace(/\/$/, "");
const KINDS = (arg("kinds", "suburb,visa,fhb,duty,community") as string).split(",").map((s) => s.trim());
const STRICT = argv.includes("--strict");
const OUT = path.resolve(arg("out", "scripts/out/pseo-audit.json") as string);
/** --explain /mortgage-broker/nsw/rockdale-2216 prints the text that page shares with its nearest twin. */
const EXPLAIN = arg("explain");
const ORIGIN = "https://www.mustangmortgage.com.au";

const MIN_WORDS: Record<string, number> = { suburb: 700, fhb: 1200, visa: 1500, lender: 900 };
const UNIQ_WARN = 40;
const UNIQ_HARD = 30;
const UNIQ_MEDIAN = 45;
const NOTE_MIN_WORDS = 80;

/* ------------------------------------------------------------------ discovery */

type Target = { kind: string; key: string; path: string; expected: boolean; masks: string[]; rules: unknown; completeness?: { score: number; of: number } };

const STATE_NAMES: Record<string, string> = {
  NSW: "New South Wales", VIC: "Victoria", QLD: "Queensland", WA: "Western Australia", SA: "South Australia", TAS: "Tasmania", ACT: "Australian Capital Territory", NT: "Northern Territory",
};

function routeTargets(): Target[] {
  const t: Target[] = [];
  for (const s of PUBLISHED_SUBURBS)
    t.push({
      kind: "suburb",
      key: suburbKey(s),
      path: suburbPath(s),
      expected: true,
      masks: [s.name, ...s.lgas.map((l) => l.name)],
      rules: { NSW: RULES.NSW, FEDERAL },
      completeness: s.completeness,
    });
  for (const v of VISA_POLICIES)
    t.push({ kind: "visa", key: `visa:${v.slug}`, path: `/visa-home-loans/${v.slug}`, expected: false, masks: [v.name, ...v.subclasses], rules: v });
  for (const st of STATE_CODES) {
    const masks = [STATE_NAMES[st], st];
    t.push({ kind: "fhb", key: `fhb:${st.toLowerCase()}`, path: `/first-home-buyers/${st.toLowerCase()}`, expected: false, masks, rules: { S: RULES[st as AuState], FEDERAL } });
    t.push({ kind: "duty", key: `duty:${st.toLowerCase()}`, path: `/stamp-duty/${st.toLowerCase()}`, expected: false, masks, rules: { S: RULES[st as AuState], FEDERAL } });
  }
  t.push({ kind: "community", key: "community:nepali-sydney", path: "/nepali-mortgage-broker-sydney", expected: false, masks: [], rules: { NSW: RULES.NSW, FEDERAL } });
  return t;
}

type ReviewRow = { key: string; kind: string; path: string; reviewed: boolean; reviewedBy: string; brokerNote: string };

async function reviewRows(): Promise<ReviewRow[] | null> {
  const prisma = new PrismaClient();
  try {
    return await prisma.seoReview.findMany({ select: { key: true, kind: true, path: true, reviewed: true, reviewedBy: true, brokerNote: true } });
  } catch (e) {
    console.warn(`! SeoReview table unavailable (${(e as Error).message.split("\n")[0]}); using route data only`);
    return null;
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

/* ------------------------------------------------------------------ HTML helpers (no dependencies) */

const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", ndash: "–", mdash: "—", hellip: "…", middot: "·", times: "×", divide: "÷", sup2: "²" };
const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, e: string) => {
    if (e[0] === "#") return String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENT[e.toLowerCase()] ?? m;
  });

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const DROP = new Set(["script", "style", "noscript", "svg", "template", "nav", "iframe"]);
const BLOCK = new Set(["p", "div", "section", "article", "aside", "header", "footer", "li", "ul", "ol", "dl", "dt", "dd", "h1", "h2", "h3", "h4", "h5", "h6", "tr", "td", "th", "table", "caption", "figure", "figcaption", "summary", "details", "br", "main", "blockquote"]);

/** Inner HTML of the first <main>…</main> (handles nested tags by depth). */
function mainHtml(html: string): string {
  const start = html.search(/<main[\s>]/i);
  if (start < 0) return "";
  const re = /<(\/?)main\b[^>]*>/gi;
  re.lastIndex = start;
  let depth = 0;
  let m: RegExpExecArray | null;
  let open = -1;
  while ((m = re.exec(html))) {
    if (!m[1]) {
      if (depth === 0) open = re.lastIndex;
      depth++;
    } else if (--depth === 0) return html.slice(open, m.index);
  }
  return html.slice(open);
}

/** Visible text of an HTML fragment, dropping nav/script/style/svg and any element with data-pseo-exclude. */
function visibleText(fragment: string): string {
  const out: string[] = [];
  const tagRe = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*?)(\/?)>/g;
  let last = 0;
  let skip = 0;
  const stack: { tag: string; skipping: boolean }[] = [];
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(fragment))) {
    if (!skip) out.push(fragment.slice(last, m.index));
    last = tagRe.lastIndex;
    if (m[0].startsWith("<!--")) continue;
    const closing = !!m[1];
    const tag = m[2].toLowerCase();
    const attrs = m[3] ?? "";
    const selfClose = !!m[4] || VOID.has(tag);
    if (BLOCK.has(tag) && !skip) out.push(" \n ");
    if (closing) {
      for (let i = stack.length - 1; i >= 0; i--) {
        if (stack[i].tag === tag) {
          const popped = stack.splice(i);
          for (const p of popped) if (p.skipping) skip--;
          break;
        }
      }
      continue;
    }
    if (selfClose) continue;
    const skipping = DROP.has(tag) || /\bdata-pseo-exclude\b/.test(attrs) || /\bhidden\b(?!=)/.test(attrs) && /\shidden(\s|$|=)/.test(attrs);
    if (skipping) skip++;
    stack.push({ tag, skipping });
  }
  if (!skip) out.push(fragment.slice(last));
  return decode(out.join("")).replace(/[ \t\r\f\v]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
}

const attr = (html: string, re: RegExp) => {
  const m = html.match(re);
  return m ? decode(m[1]).trim() : null;
};

const countWords = (t: string) => t.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

/* ------------------------------------------------------------------ uniqueness (§C6) */

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function maskedTokens(text: string, masks: string[]): string[] {
  let t = text.toLowerCase().replace(/[’‘]/g, "'");
  t = t.replace(/(\d),(?=\d{3}\b)/g, "$1"); // 760,000 → 760000 (only 4-digit numbers are masked)
  for (const m of [...masks].filter(Boolean).sort((a, b) => b.length - a.length)) t = t.replace(new RegExp(`\\b${esc(m.toLowerCase())}\\b`, "g"), " __entity__ ");
  return (t.match(/[a-z0-9_]+(?:'[a-z]+)?/g) ?? []).map((w) => (/^\d{4}$/.test(w) ? "__n4__" : w));
}

function shingles(text: string, masks: string[]): Set<string> {
  const toks = maskedTokens(text, masks);
  const set = new Set<string>();
  for (let i = 0; i + 5 <= toks.length; i++) set.add(toks.slice(i, i + 5).join(" "));
  return set;
}

function uniquePct(a: Set<string>, b: Set<string>) {
  if (!a.size) return 0;
  let n = 0;
  for (const s of a) if (!b.has(s)) n++;
  return (n / a.size) * 100;
}

const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const r1 = (n: number) => Math.round(n * 10) / 10;

/* ------------------------------------------------------------------ run */

type PageResult = {
  kind: string;
  key: string;
  path: string;
  url: string;
  status: number;
  title: string | null;
  h1: string | null;
  h1Count: number;
  metaDescription: string | null;
  canonical: string | null;
  robots: string | null;
  words: number;
  minWords: number | null;
  uniqueness: { min: number; median: number; nearest: string | null } | null;
  completeness: { score: number; of: number } | null;
  rules: { stale: string[]; unverified: number; fresh: boolean };
  disclaimer: boolean;
  licence: boolean;
  licencePlaceholder: boolean;
  canonicalOk: boolean;
  review: { reviewed: boolean; reviewedBy: string; brokerNoteWords: number } | null;
  indexable: boolean;
  inSitemap: boolean;
  hard: string[];
  fails: string[];
  warns: string[];
};

async function fetchOnce(url: string): Promise<{ status: number; body: string }> {
  try {
    const res = await fetch(url, { redirect: "manual", headers: { "user-agent": "pseo-audit/1.0" } });
    return { status: res.status, body: res.status === 200 ? await res.text() : "" };
  } catch (e) {
    return { status: 0, body: String(e) };
  }
}

/** Retries non-200s (a dev server mid-rebuild can briefly 404/500 a route that exists). */
async function fetchText(url: string, retries = 2): Promise<{ status: number; body: string }> {
  let r = await fetchOnce(url);
  for (let i = 0; i < retries && r.status !== 200 && r.status !== 404; i++) {
    await new Promise((ok) => setTimeout(ok, 1500));
    r = await fetchOnce(url);
  }
  return r;
}

async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}

async function main() {
  const started = Date.now();
  const rows = await reviewRows();
  const byKey = new Map((rows ?? []).map((r) => [r.key, r]));

  // Merge route data with review rows (rows may add pages we don't know about, or correct paths).
  const targets = new Map<string, Target>();
  for (const t of routeTargets()) targets.set(t.key, t);
  for (const r of rows ?? []) {
    const known = targets.get(r.key);
    if (known) known.path = r.path || known.path;
    else if (r.path) targets.set(r.key, { kind: r.kind, key: r.key, path: r.path, expected: true, masks: [], rules: null });
  }
  const list = [...targets.values()].filter((t) => KINDS.includes(t.kind));

  const sitemap = await fetchText(`${BASE}/sitemap.xml`);
  const sitemapPaths = new Set([...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1]).replace(ORIGIN, "") || "/"));

  console.log(`Auditing ${list.length} candidate URLs on ${BASE} …`);
  const fetched = await pool(list, 4, async (t) => {
    let res = await fetchText(BASE + t.path);
    // An expected page that 404s is re-checked after a pause before it counts as missing.
    for (let i = 0; i < 2 && t.expected && res.status === 404; i++) {
      await new Promise((ok) => setTimeout(ok, 2000));
      res = await fetchText(BASE + t.path);
    }
    return { t, res };
  });

  const pages: (PageResult & { _shingles?: Set<string>; _text?: string })[] = [];
  const skipped: { key: string; path: string; status: number }[] = [];
  for (const { t, res } of fetched) {
    if (res.status !== 200) {
      if (t.expected) {
        pages.push({
          kind: t.kind, key: t.key, path: t.path, url: BASE + t.path, status: res.status, title: null, h1: null, h1Count: 0, metaDescription: null, canonical: null, robots: null,
          words: 0, minWords: MIN_WORDS[t.kind] ?? null, uniqueness: null, completeness: t.completeness ?? null, rules: { stale: [], unverified: 0, fresh: true },
          disclaimer: false, licence: false, licencePlaceholder: false, canonicalOk: false, review: null, indexable: false, inSitemap: false,
          hard: [`HTTP ${res.status || "error"} (expected page)`], fails: [], warns: [],
        });
      } else skipped.push({ key: t.key, path: t.path, status: res.status });
      continue;
    }
    const html = res.body;
    const main = mainHtml(html);
    const text = visibleText(main);
    const h1s = [...main.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => visibleText(m[1]));
    const title = attr(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
    const desc = attr(html, /<meta[^>]+name="description"[^>]+content="([^"]*)"/i) ?? attr(html, /<meta[^>]+content="([^"]*)"[^>]+name="description"/i);
    const canonical = attr(html, /<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i) ?? attr(html, /<link[^>]+href="([^"]*)"[^>]+rel="canonical"/i);
    const robots = attr(html, /<meta[^>]+name="robots"[^>]+content="([^"]*)"/i);
    const footerLicence = html.match(/class="[^"]*mw-footer__licence[^"]*"[\s\S]{0,4000}?<\/div>/i)?.[0] ?? "";
    const licence = !!footerLicence && /Credit Representative/i.test(footerLicence) && /Australian Credit Licence/i.test(footerLicence);
    const disclaimer = /class="[^"]*\bmw-disclaimer\b/.test(main) && /general information only/i.test(text);
    const words = countWords(text);
    const review = byKey.get(t.key);
    const noteWords = review ? countWords(review.brokerNote) : 0;
    const indexable = !!robots && !/noindex/i.test(robots);
    const fr = t.rules ? auditFreshness(t.rules) : [];
    const stale = fr.filter((f) => f.reason !== "unverified").map((f) => `${f.path} (${f.verifiedAt})`);
    const unverified = fr.filter((f) => f.reason === "unverified").length;
    const expectedCanonical = ORIGIN + t.path;

    const p: PageResult & { _shingles?: Set<string>; _text?: string } = {
      kind: t.kind, key: t.key, path: t.path, url: BASE + t.path, status: res.status, title, h1: h1s[0] ?? null, h1Count: h1s.length, metaDescription: desc, canonical, robots,
      words, minWords: MIN_WORDS[t.kind] ?? null, uniqueness: null, completeness: t.completeness ?? (t.kind === "suburb" ? getSuburbBySlug(t.path.split("/").pop() ?? "")?.completeness ?? null : null),
      rules: { stale, unverified, fresh: stale.length === 0 }, disclaimer, licence, licencePlaceholder: /class="mw-ph"/.test(footerLicence), canonicalOk: canonical === expectedCanonical,
      review: review ? { reviewed: review.reviewed, reviewedBy: review.reviewedBy, brokerNoteWords: noteWords } : null, indexable, inSitemap: sitemapPaths.has(t.path),
      hard: [], fails: [], warns: [], _shingles: shingles(text, t.masks), _text: text,
    };
    if (!disclaimer) p.hard.push("missing disclaimer");
    if (!licence) p.hard.push("missing licence block");
    if (stale.length) p.hard.push(`stale rules: ${stale.slice(0, 3).join(", ")}${stale.length > 3 ? ` +${stale.length - 3}` : ""}`);
    if (!p.canonicalOk) p.hard.push(`canonical ${canonical ?? "missing"} ≠ ${expectedCanonical}`);
    if (h1s.length !== 1) p.fails.push(`${h1s.length} H1 elements`);
    if (p.minWords && words < p.minWords) p.fails.push(`${words} words < ${p.minWords}`);
    if (p.completeness && p.completeness.score < 10) p.fails.push(`data completeness ${p.completeness.score}/${p.completeness.of} < 10`);
    if (indexable && !review?.reviewed) p.hard.push("indexable but not broker-reviewed");
    if (p.inSitemap && !review?.reviewed) p.hard.push("in sitemap but not broker-reviewed");
    if (t.kind === "suburb") {
      if (review?.reviewed && noteWords < NOTE_MIN_WORDS) p.fails.push(`reviewed with a ${noteWords}-word broker note (< ${NOTE_MIN_WORDS})`);
      if (!review?.reviewed) p.warns.push(noteWords < NOTE_MIN_WORDS ? `noindex: broker note ${noteWords}/${NOTE_MIN_WORDS} words, not reviewed` : "noindex: awaiting review");
    } else if (!review?.reviewed) p.warns.push("noindex: awaiting review");
    if (unverified) p.warns.push(`${unverified} unverified rule group(s)`);
    if (p.licencePlaceholder) p.warns.push("licence numbers are placeholders");
    pages.push(p);
  }

  // Duplicate title / H1 / meta across every audited page.
  const dupes = (get: (p: PageResult) => string | null, label: string) => {
    const seen = new Map<string, PageResult[]>();
    for (const p of pages) {
      const v = get(p);
      if (!v) continue;
      seen.set(v, [...(seen.get(v) ?? []), p]);
    }
    for (const [, ps] of seen) if (ps.length > 1) for (const p of ps) p.hard.push(`duplicate ${label} (${ps.length} pages)`);
    for (const p of pages) if (p.status === 200 && !get(p)) p.hard.push(`missing ${label}`);
  };
  dupes((p) => p.title, "title");
  dupes((p) => p.h1, "H1");
  dupes((p) => p.metaDescription, "meta description");

  // Uniqueness within each page type.
  const types: Record<string, { pages: number; minUniq: number | null; medianUniq: number | null; medianOfMins: number | null; minWords: number; medianWords: number; maxWords: number; hard: number; fails: number }> = {};
  const byKind = new Map<string, typeof pages>();
  for (const p of pages) if (p.status === 200) byKind.set(p.kind, [...(byKind.get(p.kind) ?? []), p]);
  for (const [kind, ps] of byKind) {
    const all: number[] = [];
    if (ps.length > 1) {
      for (const a of ps) {
        const vals: { v: number; key: string }[] = [];
        for (const b of ps) if (a !== b) vals.push({ v: uniquePct(a._shingles!, b._shingles!), key: b.path });
        vals.sort((x, y) => x.v - y.v);
        a.uniqueness = { min: r1(vals[0].v), median: r1(median(vals.map((x) => x.v))), nearest: vals[0].key };
        all.push(...vals.map((x) => x.v));
        if (a.uniqueness.min < UNIQ_HARD) a.hard.push(`uniqueness ${a.uniqueness.min}% < ${UNIQ_HARD}% vs ${vals[0].key}`);
        else if (a.uniqueness.min < UNIQ_WARN) a.warns.push(`uniqueness ${a.uniqueness.min}% < ${UNIQ_WARN}% vs ${vals[0].key}`);
      }
    }
    const w = ps.map((p) => p.words);
    const mins = ps.map((p) => p.uniqueness?.min).filter((x): x is number => x != null);
    types[kind] = {
      pages: ps.length,
      minUniq: mins.length ? r1(Math.min(...mins)) : null,
      medianUniq: all.length ? r1(median(all)) : null,
      medianOfMins: mins.length ? r1(median(mins)) : null,
      minWords: Math.min(...w),
      medianWords: Math.round(median(w)),
      maxWords: Math.max(...w),
      hard: 0,
      fails: 0,
    };
    if (types[kind].medianUniq != null && types[kind].medianUniq! < UNIQ_MEDIAN) for (const p of ps) p.fails.push(`type median uniqueness ${types[kind].medianUniq}% < ${UNIQ_MEDIAN}%`);
  }
  for (const p of pages) {
    if (types[p.kind]) {
      types[p.kind].hard += p.hard.length ? 1 : 0;
      types[p.kind].fails += p.fails.length ? 1 : 0;
    }
  }

  if (EXPLAIN) {
    const a = pages.find((p) => p.path === EXPLAIN);
    const b = a?.uniqueness?.nearest ? pages.find((p) => p.path === a.uniqueness!.nearest) : undefined;
    const ta = a ? targets.get(a.key) : undefined;
    if (a && b && ta) {
      const toks = maskedTokens(a._text!, ta.masks);
      const shared = new Array(toks.length).fill(false);
      for (let i = 0; i + 5 <= toks.length; i++) if (b._shingles!.has(toks.slice(i, i + 5).join(" "))) for (let j = i; j < i + 5; j++) shared[j] = true;
      const runs: string[] = [];
      let cur: string[] = [];
      toks.forEach((w, i) => {
        if (shared[i]) cur.push(w);
        else if (cur.length) {
          runs.push(cur.join(" "));
          cur = [];
        }
      });
      if (cur.length) runs.push(cur.join(" "));
      console.log(`\nShared with ${b.path} (${a.uniqueness!.min}% unique), ${runs.reduce((n, r) => n + r.split(" ").length, 0)} of ${toks.length} tokens:\n`);
      for (const r of runs.sort((x, y) => y.length - x.length)) console.log(`  [${r.split(" ").length}] ${r}`);
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    base: BASE,
    thresholds: { minWords: MIN_WORDS, uniqWarn: UNIQ_WARN, uniqHard: UNIQ_HARD, uniqMedian: UNIQ_MEDIAN, noteMinWords: NOTE_MIN_WORDS },
    reviewTable: rows ? "ok" : "unavailable",
    types,
    totals: {
      pages: pages.length,
      hardStops: pages.filter((p) => p.hard.length).length,
      gateFailures: pages.filter((p) => p.fails.length).length,
      warnings: pages.filter((p) => p.warns.length).length,
      skippedNotBuilt: skipped.length,
    },
    pages: pages.map(({ _shingles, _text, ...p }) => (void _shingles, void _text, p)),
    skipped,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));

  /* ---------------------------------------------------------------- stdout table */
  const pad = (s: string | number, n: number, right = false) => {
    const str = String(s);
    return str.length >= n ? str.slice(0, n) : right ? str.padStart(n) : str.padEnd(n);
  };
  console.log("");
  console.log(`${pad("Page", 46)} ${pad("Words", 6, true)} ${pad("Uniq min", 9, true)} ${pad("Uniq med", 9, true)} ${pad("Data", 6, true)} ${pad("Note", 5, true)}  Status`);
  console.log("-".repeat(118));
  for (const kind of Object.keys(types)) {
    for (const p of pages.filter((x) => x.kind === kind).sort((a, b) => (a.uniqueness?.min ?? 0) - (b.uniqueness?.min ?? 0))) {
      const status = p.hard.length ? `HARD: ${p.hard.join("; ")}` : p.fails.length ? `FAIL: ${p.fails.join("; ")}` : p.warns.length ? `ok (${p.warns.join("; ")})` : "ok";
      console.log(
        `${pad(p.path, 46)} ${pad(p.words, 6, true)} ${pad(p.uniqueness ? `${p.uniqueness.min}%` : "—", 9, true)} ${pad(p.uniqueness ? `${p.uniqueness.median}%` : "—", 9, true)} ${pad(p.completeness ? `${p.completeness.score}/${p.completeness.of}` : "—", 6, true)} ${pad(p.review ? p.review.brokerNoteWords : "—", 5, true)}  ${status}`,
      );
    }
  }
  console.log("-".repeat(118));
  for (const [kind, t] of Object.entries(types))
    console.log(
      `${pad(kind, 10)} pages ${pad(t.pages, 3, true)} | words min ${t.minWords} / median ${t.medianWords} / max ${t.maxWords} | uniqueness min ${t.minUniq ?? "—"}% / median of page mins ${t.medianOfMins ?? "—"}% / pairwise median ${t.medianUniq ?? "—"}% | hard ${t.hard} | gate fails ${t.fails}`,
    );
  if (skipped.length) console.log(`Not built yet (skipped): ${skipped.map((s) => `${s.path} [${s.status}]`).join(", ")}`);
  console.log(`\nReport: ${path.relative(process.cwd(), OUT)}  (${((Date.now() - started) / 1000).toFixed(1)}s)`);

  const hard = report.totals.hardStops;
  const fails = report.totals.gateFailures;
  if (hard) console.error(`\n✗ ${hard} page(s) hit a hard stop.`);
  else if (fails) console.warn(`\n! ${fails} page(s) fail a gate${STRICT ? "" : " (run with --strict to fail the build on these)"}.`);
  else console.log("\n✓ All audited pages pass the hard stops and gates.");
  process.exit(hard || (STRICT && fails) ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
