// Scenario fact sheet: a flat map of typed facts keyed by path ("loan.amount", "a1.residency",
// "a1.inc.overtime"). Every fact records its value (null = unknown), where it came from and
// whether the broker verified it. Pure module (no DB) so the engine and tests can use it.
import { createHash } from "node:crypto";

export type Src = "enquiry" | "case" | "broker";
export type IncomeValue = { amount: number; freq: Freq; basis: "gross" | "net"; months: number | null };
export type FactValue = string | number | boolean | string[] | IncomeValue;
export type Fact = { v: FactValue | null; src?: Src; ok?: boolean; note?: string };
export type Facts = Record<string, Fact>;

export type Freq = "weekly" | "fortnightly" | "monthly" | "annual";
export const FREQ_PER_YEAR: Record<Freq, number> = { weekly: 52, fortnightly: 26, monthly: 12, annual: 1 };

export type FieldType = "money" | "number" | "select" | "multi" | "bool" | "date" | "text" | "income";
export type FieldDef = {
  key: string;
  label: string;
  group: string;
  type: FieldType;
  unit?: string;
  options?: [string, string][];
  min?: number;
  max?: number;
  hint?: string;
  /** Sent to the AI provider (after transformation). Free text is redacted first. */
  ai?: boolean;
  /** Part of the serviceability input hash (calculator results go stale when these change). */
  svc?: boolean;
  /** Only relevant when another fact has a value. */
  showIf?: { key: string; in: string[] };
};

export const MAX_APPLICANTS = 4;

export const RESIDENCY: [string, string][] = [
  ["citizen", "Australian citizen"],
  ["permanent_resident", "Permanent resident"],
  ["nz_citizen", "NZ citizen (SCV 444)"],
  ["temporary_visa", "Temporary visa holder"],
  ["foreign_non_resident", "Foreign non-resident"],
];
export const EMPLOYMENT: [string, string][] = [
  ["payg_full_time", "PAYG full-time"],
  ["payg_part_time", "PAYG part-time"],
  ["casual", "PAYG casual"],
  ["contract", "Contractor"],
  ["self_employed", "Self-employed / sole trader"],
  ["director", "Company director (own company)"],
  ["not_employed", "Not employed"],
];
export const INCOME_COMPONENTS: [string, string][] = [
  ["base", "Base pay"],
  ["overtime", "Overtime"],
  ["penalties", "Penalty rates / shift / weekend"],
  ["commission", "Commission"],
  ["bonus", "Bonus"],
  ["allowances", "Allowances"],
  ["self_employed", "Self-employed income"],
  ["director", "Director wages / company income"],
  ["rental", "Rental income"],
  ["other", "Other income"],
];
export const FEATURES: [string, string][] = [
  ["offset", "Offset account"],
  ["redraw", "Redraw"],
  ["extra_repayments", "Unlimited extra repayments"],
  ["split", "Split loan"],
  ["fixed_option", "Fixed-rate option"],
  ["no_annual_fee", "No annual fee"],
  ["package", "Package / bundled"],
  ["cashback", "Cashback"],
];
export const PROPERTY_TYPES: [string, string][] = [
  ["house", "House"],
  ["townhouse", "Townhouse / villa"],
  ["unit", "Unit / apartment"],
  ["high_density", "High-density apartment"],
  ["land", "Vacant land"],
  ["construction", "House & land / construction"],
  ["off_the_plan", "Off-the-plan"],
  ["rural", "Rural / acreage"],
];
export const SCHEMES: [string, string][] = [
  ["none", "None"],
  ["fhbg", "First Home Guarantee (5% deposit)"],
  ["regional_fhbg", "Regional First Home Buyer Guarantee"],
  ["family_home_guarantee", "Family Home Guarantee"],
  ["help_to_buy", "Help to Buy (shared equity)"],
  ["state_scheme", "State scheme / grant"],
];
const STATES: [string, string][] = ["NSW", "VIC", "QLD", "WA", "SA", "ACT", "TAS", "NT"].map((s) => [s, s]);

const base: FieldDef[] = [
  { key: "loan.purpose", label: "Purpose", group: "Loan and goals", type: "select", options: [["purchase", "Purchase"], ["refinance", "Refinance"]], ai: true },
  { key: "loan.occupancy", label: "Occupancy", group: "Loan and goals", type: "select", options: [["owner_occupied", "Owner-occupied"], ["investment", "Investment"]], ai: true },
  { key: "loan.amount", label: "Requested loan amount", group: "Loan and goals", type: "money", unit: "AUD", max: 20_000_000, ai: true, svc: true },
  { key: "loan.termYears", label: "Loan term", group: "Loan and goals", type: "number", unit: "years", min: 1, max: 40, ai: true, svc: true },
  { key: "loan.repayment", label: "Repayment preference", group: "Loan and goals", type: "select", options: [["PI", "Principal & interest"], ["IO", "Interest only"]], ai: true, svc: true },
  { key: "loan.ioYears", label: "Interest-only period", group: "Loan and goals", type: "number", unit: "years", min: 1, max: 10, ai: true, svc: true, showIf: { key: "loan.repayment", in: ["IO"] } },
  { key: "loan.timeframe", label: "Time frame", group: "Loan and goals", type: "text", ai: true },
  { key: "loan.objectives", label: "Client objectives", group: "Loan and goals", type: "text", ai: true, hint: "Sent to the AI after automatic redaction — don't type names, addresses or account numbers." },
  { key: "loan.features", label: "Must-have features", group: "Loan and goals", type: "multi", options: FEATURES, ai: true },

  { key: "prop.state", label: "State", group: "Property", type: "select", options: STATES, ai: true },
  { key: "prop.suburb", label: "Suburb", group: "Property", type: "text" },
  { key: "prop.postcode", label: "Postcode", group: "Property", type: "text" },
  { key: "prop.type", label: "Property type", group: "Property", type: "select", options: PROPERTY_TYPES, ai: true },
  { key: "prop.newBuild", label: "New / never lived in", group: "Property", type: "bool", ai: true },
  { key: "prop.firstHome", label: "First home buyer", group: "Property", type: "bool", ai: true },
  { key: "prop.price", label: "Purchase price", group: "Property", type: "money", unit: "AUD", max: 50_000_000, ai: true, showIf: { key: "loan.purpose", in: ["purchase"] } },
  { key: "prop.valuation", label: "Valuation / estimated value", group: "Property", type: "money", unit: "AUD", max: 50_000_000, ai: true },
  { key: "prop.existingBalance", label: "Existing loan balance", group: "Property", type: "money", unit: "AUD", max: 50_000_000, ai: true, showIf: { key: "loan.purpose", in: ["refinance"] } },
  { key: "prop.exchangeDate", label: "Exchange date", group: "Property", type: "date" },
  { key: "prop.financeDate", label: "Finance clause date", group: "Property", type: "date" },
  { key: "prop.settlementDate", label: "Settlement date", group: "Property", type: "date" },

  { key: "app.count", label: "Number of applicants", group: "Applicants", type: "number", min: 1, max: MAX_APPLICANTS, ai: true, svc: true },

  { key: "com.livingMonthly", label: "Living expenses", group: "Commitments", type: "money", unit: "AUD / month", max: 100_000, ai: true, svc: true },
  { key: "com.dependants", label: "Dependants", group: "Commitments", type: "number", min: 0, max: 15, ai: true, svc: true },
  { key: "com.loansMonthly", label: "Other loan repayments", group: "Commitments", type: "money", unit: "AUD / month", max: 200_000, ai: true, svc: true },
  { key: "com.loansBalance", label: "Other loan balances", group: "Commitments", type: "money", unit: "AUD", max: 50_000_000, ai: true, svc: true },
  { key: "com.cardLimits", label: "Credit card limits (total)", group: "Commitments", type: "money", unit: "AUD", max: 1_000_000, ai: true, svc: true },
  { key: "com.help", label: "HELP / HECS balance", group: "Commitments", type: "money", unit: "AUD", max: 500_000, ai: true, svc: true },
  { key: "com.otherMonthly", label: "Other liabilities", group: "Commitments", type: "money", unit: "AUD / month", max: 100_000, ai: true, svc: true },

  { key: "con.savings", label: "Savings available", group: "Contribution", type: "money", unit: "AUD", max: 50_000_000, ai: true },
  { key: "con.savingsHeldMonths", label: "Savings held for", group: "Contribution", type: "number", unit: "months", min: 0, max: 600, ai: true },
  { key: "con.savingsSource", label: "Source of savings", group: "Contribution", type: "text", ai: true },
  { key: "con.gift", label: "Gifted funds", group: "Contribution", type: "money", unit: "AUD", max: 50_000_000, ai: true },
  { key: "con.giftFrom", label: "Gift from (relationship)", group: "Contribution", type: "select", options: [["parent", "Parent"], ["family", "Other immediate family"], ["other", "Other"]], ai: true },
  { key: "con.equity", label: "Equity contribution", group: "Contribution", type: "money", unit: "AUD", max: 50_000_000, ai: true },
  { key: "con.scheme", label: "Scheme interest", group: "Contribution", type: "select", options: SCHEMES, ai: true },
  { key: "con.duty", label: "Stamp duty (broker figure)", group: "Contribution", type: "money", unit: "AUD", max: 5_000_000, ai: true, hint: "Leave unknown to use the state duty estimate." },
  { key: "con.dutySource", label: "Duty figure source", group: "Contribution", type: "text" },
  { key: "con.govtFees", label: "Government fees (registration / transfer)", group: "Contribution", type: "money", unit: "AUD", max: 100_000, ai: true },
  { key: "con.legal", label: "Legal / conveyancing", group: "Contribution", type: "money", unit: "AUD", max: 100_000, ai: true },
  { key: "con.lmi", label: "LMI premium (quoted)", group: "Contribution", type: "money", unit: "AUD", max: 500_000, ai: true },
  { key: "con.lmiCapitalised", label: "LMI capitalised", group: "Contribution", type: "bool", ai: true },
  { key: "con.lmiSource", label: "LMI figure source", group: "Contribution", type: "text" },
  { key: "con.otherCosts", label: "Other costs", group: "Contribution", type: "money", unit: "AUD", max: 1_000_000, ai: true },
];

export function applicantFields(n: number): FieldDef[] {
  const g = `Applicant ${n}`;
  const p = `a${n}`;
  const f: FieldDef[] = [
    { key: `${p}.residency`, label: "Citizenship / residency", group: g, type: "select", options: RESIDENCY, ai: true },
    { key: `${p}.visaSubclass`, label: "Visa subclass", group: g, type: "text", ai: true, hint: "e.g. 482, 491, 500", showIf: { key: `${p}.residency`, in: ["temporary_visa"] } },
    { key: `${p}.visaExpiry`, label: "Visa expiry", group: g, type: "date", ai: true, showIf: { key: `${p}.residency`, in: ["temporary_visa"] } },
    { key: `${p}.employment`, label: "Employment type", group: g, type: "select", options: EMPLOYMENT, ai: true, svc: true },
    { key: `${p}.startDate`, label: "Current job start date", group: g, type: "date", ai: true, svc: true },
    { key: `${p}.probation`, label: "On probation", group: g, type: "bool", ai: true },
    { key: `${p}.leave`, label: "Leave status", group: g, type: "select", options: [["none", "Not on leave"], ["parental_returned", "Returned from parental leave"], ["parental_on", "Currently on parental leave"], ["other_leave", "Other extended leave"]], ai: true },
    { key: `${p}.returnDate`, label: "Return-to-work date", group: g, type: "date", ai: true, showIf: { key: `${p}.leave`, in: ["parental_returned", "parental_on", "other_leave"] } },
    { key: `${p}.priorMonths`, label: "Prior employment (same industry)", group: g, type: "number", unit: "months", min: 0, max: 600, ai: true },
    { key: `${p}.payslips`, label: "Payslips held", group: g, type: "number", min: 0, max: 52, ai: true },
  ];
  for (const [k, l] of INCOME_COMPONENTS) f.push({ key: `${p}.inc.${k}`, label: l, group: g, type: "income", ai: true, svc: true });
  return f;
}

export const FIELD_DEFS: FieldDef[] = [...base, ...[1, 2, 3, 4].flatMap(applicantFields)];
export const FIELD_MAP = new Map(FIELD_DEFS.map((d) => [d.key, d]));

/* ------------------------------------------------------------------ accessors */

export const val = (f: Facts, k: string) => (f[k]?.v ?? null) as FactValue | null;
export const num = (f: Facts, k: string): number | null => {
  const v = f[k]?.v;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};
export const str = (f: Facts, k: string): string | null => {
  const v = f[k]?.v;
  return typeof v === "string" && v !== "" ? v : null;
};
export const bool = (f: Facts, k: string): boolean | null => {
  const v = f[k]?.v;
  return typeof v === "boolean" ? v : null;
};
export const list = (f: Facts, k: string): string[] | null => {
  const v = f[k]?.v;
  return Array.isArray(v) ? v : null;
};
export const income = (f: Facts, k: string): IncomeValue | null => {
  const v = f[k]?.v;
  return v && typeof v === "object" && !Array.isArray(v) ? (v as IncomeValue) : null;
};
export const applicantCount = (f: Facts) => Math.min(MAX_APPLICANTS, Math.max(1, num(f, "app.count") ?? 1));
export const applicantIds = (f: Facts) => Array.from({ length: applicantCount(f) }, (_, i) => `a${i + 1}`);

/** Annualised gross-equivalent amount for an income component (net is reported as-is and flagged). */
export function annualise(i: IncomeValue | null): number | null {
  if (!i || !Number.isFinite(i.amount)) return null;
  return Math.round(i.amount * FREQ_PER_YEAR[i.freq]);
}

/** Whole months between two YYYY-MM-DD dates (floor). */
export function monthsBetween(from: string, to: Date): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(from);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]) - 1, d = Number(m[3]);
  let months = (to.getUTCFullYear() - y) * 12 + (to.getUTCMonth() - mo);
  if (to.getUTCDate() < d) months -= 1;
  return months;
}

/* ------------------------------------------------------------------ validation */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate and normalise one raw value for a field. Returns [value, error]. Empty → null (unknown). */
export function coerce(def: FieldDef, raw: unknown): [FactValue | null, string | null] {
  if (raw === null || raw === undefined || raw === "") return [null, null];
  switch (def.type) {
    case "money":
    case "number": {
      const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[$,\s]/g, ""));
      if (!Number.isFinite(n)) return [null, `${def.label}: enter a number`];
      if (n < (def.min ?? 0)) return [null, `${def.label}: must be at least ${def.min ?? 0}`];
      if (def.max !== undefined && n > def.max) return [null, `${def.label}: must be at most ${def.max.toLocaleString("en-AU")}`];
      return [def.type === "money" ? Math.round(n * 100) / 100 : n, null];
    }
    case "select": {
      const s = String(raw);
      return def.options!.some(([k]) => k === s) ? [s, null] : [null, `${def.label}: invalid option`];
    }
    case "multi": {
      const arr = Array.isArray(raw) ? raw.map(String) : String(raw).split(",").filter(Boolean);
      const ok = arr.filter((x) => def.options!.some(([k]) => k === x));
      return [Array.from(new Set(ok)), null];
    }
    case "bool": {
      if (raw === true || raw === "true" || raw === "yes") return [true, null];
      if (raw === false || raw === "false" || raw === "no") return [false, null];
      return [null, null];
    }
    case "date": {
      const s = String(raw);
      if (!DATE_RE.test(s) || Number.isNaN(Date.parse(s))) return [null, `${def.label}: use YYYY-MM-DD`];
      return [s, null];
    }
    case "text":
      return [String(raw).slice(0, 1000).trim() || null, null];
    case "income": {
      const o = (typeof raw === "string" ? JSON.parse(raw) : raw) as Partial<IncomeValue>;
      if (o.amount === undefined || o.amount === null || (o.amount as unknown) === "") return [null, null];
      const amount = Number(o.amount);
      if (!Number.isFinite(amount) || amount < 0 || amount > 10_000_000) return [null, `${def.label}: invalid amount`];
      const freq = (["weekly", "fortnightly", "monthly", "annual"] as Freq[]).includes(o.freq as Freq) ? (o.freq as Freq) : null;
      if (!freq) return [null, `${def.label}: choose a pay frequency`];
      const basis = o.basis === "net" ? "net" : "gross";
      const months = o.months === null || o.months === undefined || (o.months as unknown) === "" ? null : Number(o.months);
      if (months !== null && (!Number.isFinite(months) || months < 0 || months > 240)) return [null, `${def.label}: invalid evidence period`];
      return [{ amount, freq, basis, months }, null];
    }
  }
}

export type FactInput = { v: unknown; ok?: boolean };

/**
 * Merge broker edits into the stored sheet. A changed value becomes src "broker"; the verified
 * flag is the broker's explicit tick. Unchanged values keep their original provenance.
 */
export function applyEdits(current: Facts, edits: Record<string, FactInput>): { facts: Facts; errors: string[] } {
  const next: Facts = { ...current };
  const errors: string[] = [];
  for (const [key, input] of Object.entries(edits)) {
    const def = FIELD_MAP.get(key);
    if (!def) continue;
    const [v, err] = coerce(def, input.v);
    if (err) {
      errors.push(err);
      continue;
    }
    const prev = current[key];
    const changed = canonical(prev?.v ?? null) !== canonical(v);
    next[key] = {
      v,
      src: v === null ? undefined : changed ? "broker" : prev?.src ?? "broker",
      ok: v === null ? false : Boolean(input.ok),
    };
  }
  return { facts: next, errors };
}

/** JSON with sorted object keys — Postgres jsonb does not preserve key order. */
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(v ?? null);
}

/** Stable hash of every value (not provenance) — a change means earlier analyses are superseded. */
export function factsHash(f: Facts): string {
  const keys = Object.keys(f).filter((k) => f[k]?.v !== null && f[k]?.v !== undefined).sort();
  return createHash("sha256").update(canonical(keys.map((k) => [k, f[k].v]))).digest("hex").slice(0, 16);
}

/** Hash of serviceability inputs only (applicants' income/employment, commitments, loan terms). */
export function serviceabilityHash(f: Facts): string {
  const ids = new Set(applicantIds(f));
  const keys = Object.keys(f)
    .filter((k) => FIELD_MAP.get(k)?.svc && f[k]?.v !== null && f[k]?.v !== undefined)
    .filter((k) => !/^a\d\./.test(k) || ids.has(k.split(".")[0]))
    .sort();
  return createHash("sha256").update(canonical(keys.map((k) => [k, f[k].v]))).digest("hex").slice(0, 16);
}

export function fieldsFor(f: Facts): FieldDef[] {
  const ids = new Set(applicantIds(f));
  return FIELD_DEFS.filter((d) => !/^a\d\./.test(d.key) || ids.has(d.key.split(".")[0]));
}

export function isVisible(d: FieldDef, f: Facts) {
  if (!d.showIf) return true;
  const v = val(f, d.showIf.key);
  return v === null || d.showIf.in.includes(String(v));
}

export type ProvenanceSummary = { enquiry: number; case: number; broker: number; verified: number; missing: string[] };
export function provenance(f: Facts): ProvenanceSummary {
  const out: ProvenanceSummary = { enquiry: 0, case: 0, broker: 0, verified: 0, missing: [] };
  for (const d of fieldsFor(f)) {
    if (!isVisible(d, f)) continue;
    const x = f[d.key];
    if (!x || x.v === null || x.v === undefined) {
      if (!/\.inc\.(?!base)/.test(d.key) && !/Source$|suburb|postcode|Date$|giftFrom|ioYears|returnDate|visa/.test(d.key)) out.missing.push(d.key);
      continue;
    }
    if (x.src) out[x.src] += 1;
    if (x.ok) out.verified += 1;
  }
  return out;
}

export const labelOf = (key: string) => {
  const d = FIELD_MAP.get(key);
  if (!d) return key;
  return d.group.startsWith("Applicant") ? `${d.group}: ${d.label}` : d.label;
};
export const optionLabel = (key: string, v: string) => FIELD_MAP.get(key)?.options?.find(([k]) => k === v)?.[1] ?? v;

/* ------------------------------------------------------------------ prefill from the enquiry */

export type EnquirySeed = {
  loanType?: string; // case.loanType
  loanAmount?: number | null; // case.loanAmount
  applicantCount?: number;
  settlementDate?: string;
  submission?: Record<string, unknown> | null; // FormSubmission.data of the website lead form
};

/** Pre-fill unknown facts only; never overwrite a broker value. */
export function prefill(current: Facts, seed: EnquirySeed): Facts {
  const next: Facts = { ...current };
  const put = (k: string, v: FactValue | null, src: Src) => {
    if (v === null || v === undefined || v === "") return;
    if (next[k]?.v !== null && next[k]?.v !== undefined) return;
    next[k] = { v, src, ok: false };
  };
  const sub = seed.submission ?? {};
  const purposes = Array.isArray(sub.purpose) ? (sub.purpose as string[]) : [];
  if (purposes.includes("Refinance")) put("loan.purpose", "refinance", "enquiry");
  else if (purposes.includes("Buy a home") || purposes.includes("Invest") || purposes.includes("Build")) put("loan.purpose", "purchase", "enquiry");
  if (purposes.includes("Invest")) put("loan.occupancy", "investment", "enquiry");
  else if (purposes.includes("Buy a home")) put("loan.occupancy", "owner_occupied", "enquiry");
  const amt = Number(String(sub.loan_amount ?? "").replace(/[^0-9.]/g, ""));
  if (amt > 0) put("loan.amount", amt, "enquiry");
  if (typeof sub.timeframe === "string") put("loan.timeframe", sub.timeframe, "enquiry");
  const cnt = Number(sub.applicant_count);
  if (cnt >= 1 && cnt <= MAX_APPLICANTS) put("app.count", cnt, "enquiry");

  if (seed.loanType === "purchase" || seed.loanType === "refinance") put("loan.purpose", seed.loanType, "case");
  if (seed.loanType === "investment") {
    put("loan.purpose", "purchase", "case");
    put("loan.occupancy", "investment", "case");
  }
  if (seed.loanAmount && seed.loanAmount > 0) put("loan.amount", seed.loanAmount, "case");
  if (seed.applicantCount && seed.applicantCount >= 1) put("app.count", Math.min(MAX_APPLICANTS, seed.applicantCount), "case");
  if (seed.settlementDate && DATE_RE.test(seed.settlementDate)) put("prop.settlementDate", seed.settlementDate, "case");
  return next;
}
