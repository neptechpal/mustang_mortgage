// Structured policy checks. Each lender rule picks one `check` and stores typed `params`.
// The server evaluates every applicable rule against the scenario facts; the AI only explains.
// PARAM_SPECS drives the admin rule form, SCHEMAS validates params on save.
import { z } from "zod";
import { annualise, applicantIds, bool, income, monthsBetween, num, str, type Facts } from "../facts";
import type { ScenarioCalc } from "../calc";

export type RuleStatus = "pass" | "conditional" | "fail" | "unknown" | "info" | "n/a";
export type Outcome = "accept" | "conditional" | "decline";

export const CATEGORIES: [string, string][] = [
  ["visa_residency", "Visa / residency"],
  ["borrower_combination", "Borrower combinations"],
  ["employment", "Employment tenure & probation"],
  ["income", "Income treatment"],
  ["genuine_savings", "Genuine savings & gifts"],
  ["max_lvr", "Maximum LVR"],
  ["property", "Property restrictions"],
  ["scheme", "Scheme participation"],
  ["other", "Other / general"],
];

type ParamSpec = { key: string; label: string; type: "number" | "bool" | "enum" | "multi" | "list"; options?: [string, string][]; hint?: string };

const OUTCOME_OPTS: [string, string][] = [["accept", "Accept"], ["conditional", "Conditional / exception"], ["decline", "Decline"]];
const RES_OPTS: [string, string][] = [["citizen", "Citizen"], ["permanent_resident", "Permanent resident"], ["nz_citizen", "NZ citizen"], ["temporary_visa", "Temporary visa"], ["foreign_non_resident", "Foreign non-resident"]];
const EMP_OPTS: [string, string][] = [["payg_full_time", "PAYG full-time"], ["payg_part_time", "PAYG part-time"], ["casual", "Casual"], ["contract", "Contractor"], ["self_employed", "Self-employed"], ["director", "Director"]];
const INC_OPTS: [string, string][] = [["base", "Base"], ["overtime", "Overtime"], ["penalties", "Penalties / shift"], ["commission", "Commission"], ["bonus", "Bonus"], ["allowances", "Allowances"], ["self_employed", "Self-employed"], ["director", "Director"], ["rental", "Rental"], ["other", "Other"]];
const PROP_OPTS: [string, string][] = [["house", "House"], ["townhouse", "Townhouse"], ["unit", "Unit"], ["high_density", "High-density"], ["land", "Land"], ["construction", "Construction"], ["off_the_plan", "Off-the-plan"], ["rural", "Rural"]];
const SCHEME_OPTS: [string, string][] = [["fhbg", "First Home Guarantee"], ["regional_fhbg", "Regional FHBG"], ["family_home_guarantee", "Family Home Guarantee"], ["help_to_buy", "Help to Buy"], ["state_scheme", "State scheme"]];

export const CHECKS: Record<string, { label: string; category: string; params: ParamSpec[]; help: string }> = {
  residency: {
    label: "Residency / visa acceptance (per applicant)",
    category: "visa_residency",
    help: "Evaluated for each applicant whose residency is listed in Accepted or Conditional. Unlisted residency = outside policy.",
    params: [
      { key: "accepted", label: "Accepted residency", type: "multi", options: RES_OPTS },
      { key: "conditional", label: "Accepted with conditions", type: "multi", options: RES_OPTS },
      { key: "subclassesAllowed", label: "Visa subclasses accepted (blank = any)", type: "list", hint: "comma separated, e.g. 482, 186, 491" },
      { key: "subclassesExcluded", label: "Visa subclasses excluded", type: "list" },
      { key: "minVisaMonths", label: "Min. months remaining on visa", type: "number" },
      { key: "maxLvrPct", label: "Max LVR for temporary visa holders (%)", type: "number" },
    ],
  },
  combination: {
    label: "Borrower combination (joint cases)",
    category: "borrower_combination",
    help: "Applies only when there are 2+ applicants. Describes temp-visa + resident combinations and whose income counts.",
    params: [
      { key: "tempWithResident", label: "Temp visa + citizen/PR", type: "enum", options: OUTCOME_OPTS },
      { key: "allTemp", label: "All applicants on temporary visas", type: "enum", options: OUTCOME_OPTS },
      { key: "residentIncomeOnly", label: "Only citizen/PR income counted", type: "bool" },
    ],
  },
  employment: {
    label: "Employment tenure / probation / leave (per applicant)",
    category: "employment",
    help: "Applies to applicants whose employment type is listed. Tenure below the minimum is accepted conditionally when prior same-industry history meets the industry minimum.",
    params: [
      { key: "employmentTypes", label: "Employment types", type: "multi", options: EMP_OPTS },
      { key: "minTenureMonths", label: "Min. months in current job", type: "number" },
      { key: "minIndustryMonths", label: "Min. months in industry (current + prior)", type: "number" },
      { key: "probation", label: "On probation", type: "enum", options: OUTCOME_OPTS },
      { key: "returnFromLeave", label: "Returned from / on parental leave", type: "enum", options: OUTCOME_OPTS },
      { key: "minPayslips", label: "Payslips required", type: "number" },
    ],
  },
  income: {
    label: "Income component treatment (per applicant)",
    category: "income",
    help: "How one pay component is treated. Shading % = share counted. Requires confirmation = BDM must confirm in writing before quoting.",
    params: [
      { key: "component", label: "Income component", type: "enum", options: INC_OPTS },
      { key: "employmentTypes", label: "Only for employment types (blank = all)", type: "multi", options: EMP_OPTS },
      { key: "treatment", label: "Treatment", type: "enum", options: [["accept", "Accept 100%"], ["shade", "Accept shaded"], ["conditional", "Case by case"], ["exclude", "Not counted"]] },
      { key: "shadingPct", label: "Share counted (%)", type: "number" },
      { key: "minHistoryMonths", label: "Min. history / evidence period (months)", type: "number" },
      { key: "requiresConfirmation", label: "Needs written lender confirmation", type: "bool" },
    ],
  },
  max_lvr: {
    label: "Maximum LVR",
    category: "max_lvr",
    help: "Applies when every filter matches (blank filter = any). Uses LVR incl. capitalised LMI when 'Includes LMI' is ticked.",
    params: [
      { key: "maxLvrPct", label: "Maximum LVR (%)", type: "number" },
      { key: "includesLmi", label: "Includes capitalised LMI", type: "bool" },
      { key: "occupancy", label: "Occupancy filter", type: "multi", options: [["owner_occupied", "Owner-occupied"], ["investment", "Investment"]] },
      { key: "purpose", label: "Purpose filter", type: "multi", options: [["purchase", "Purchase"], ["refinance", "Refinance"]] },
      { key: "residency", label: "Applies if any applicant is", type: "multi", options: RES_OPTS },
      { key: "propertyTypes", label: "Property type filter", type: "multi", options: PROP_OPTS },
    ],
  },
  genuine_savings: {
    label: "Genuine savings & gifts",
    category: "genuine_savings",
    help: "Applies when LVR exceeds the threshold. Gift handling is checked whenever gifted funds are present.",
    params: [
      { key: "appliesAboveLvrPct", label: "Applies above LVR (%)", type: "number" },
      { key: "minPct", label: "Min. genuine savings (% of price)", type: "number" },
      { key: "minHeldMonths", label: "Min. months held", type: "number" },
      { key: "giftAccepted", label: "Gifts accepted", type: "bool" },
      { key: "giftCountsAsGenuine", label: "Gift counts as genuine savings", type: "bool" },
    ],
  },
  property: {
    label: "Property restrictions",
    category: "property",
    help: "Excluded types are outside policy; conditional types need checking.",
    params: [
      { key: "excludedTypes", label: "Excluded property types", type: "multi", options: PROP_OPTS },
      { key: "conditionalTypes", label: "Conditional property types", type: "multi", options: PROP_OPTS },
      { key: "excludedPostcodes", label: "Excluded postcodes", type: "list" },
    ],
  },
  scheme: {
    label: "Scheme participation",
    category: "scheme",
    help: "Schemes this lender participates in (as a panel lender).",
    params: [{ key: "schemes", label: "Participates in", type: "multi", options: SCHEME_OPTS }],
  },
  note: {
    label: "General policy note (evidence only)",
    category: "other",
    help: "No automatic test. Retrieved as evidence for the AI explanation and shown to the broker.",
    params: [{ key: "appliesTo", label: "Relevant when (any)", type: "multi", options: [["temporary_visa", "Temp visa applicant"], ["casual", "Casual / contract"], ["self_employed", "Self-employed / director"], ["low_deposit", "Deposit < 20%"], ["gift", "Gifted funds"], ["refinance", "Refinance"], ["always", "Always"]] }],
  },
};

const outcome = z.enum(["accept", "conditional", "decline"]);
const strList = z.array(z.string()).default([]);
const optNum = z.number().finite().nonnegative().optional();
export const SCHEMAS: Record<string, z.ZodType> = {
  residency: z.object({ accepted: strList, conditional: strList, subclassesAllowed: strList, subclassesExcluded: strList, minVisaMonths: optNum, maxLvrPct: optNum }),
  combination: z.object({ tempWithResident: outcome.default("conditional"), allTemp: outcome.default("decline"), residentIncomeOnly: z.boolean().default(false) }),
  employment: z.object({ employmentTypes: strList, minTenureMonths: optNum, minIndustryMonths: optNum, probation: outcome.optional(), returnFromLeave: outcome.optional(), minPayslips: optNum }),
  income: z.object({ component: z.string(), employmentTypes: strList, treatment: z.enum(["accept", "shade", "conditional", "exclude"]).default("accept"), shadingPct: optNum, minHistoryMonths: optNum, requiresConfirmation: z.boolean().default(false) }),
  max_lvr: z.object({ maxLvrPct: z.number().finite().positive(), includesLmi: z.boolean().default(false), occupancy: strList, purpose: strList, residency: strList, propertyTypes: strList }),
  genuine_savings: z.object({ appliesAboveLvrPct: z.number().finite().nonnegative().default(80), minPct: optNum, minHeldMonths: optNum, giftAccepted: z.boolean().default(true), giftCountsAsGenuine: z.boolean().default(false) }),
  property: z.object({ excludedTypes: strList, conditionalTypes: strList, excludedPostcodes: strList }),
  scheme: z.object({ schemes: strList }),
  note: z.object({ appliesTo: strList }),
};

export function parseParams(check: string, raw: unknown): { ok: true; params: Record<string, unknown> } | { ok: false; error: string } {
  const s = SCHEMAS[check];
  if (!s) return { ok: false, error: `Unknown check "${check}"` };
  const r = s.safeParse(raw ?? {});
  if (!r.success) return { ok: false, error: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  return { ok: true, params: r.data as Record<string, unknown> };
}

/* ------------------------------------------------------------------ evaluation */

export type RuleLike = {
  id: number; ruleKey: string; version: number; lenderId: number; productId: number | null; category: string; check: string;
  params: unknown; statement: string; caseId: number | null; segment: string;
};

export type RuleEval = {
  ruleId: number; ruleKey: string; version: number; check: string; category: string; applicant?: string; component?: string;
  status: RuleStatus; reason: string; missing: string[]; requiresConfirmation?: boolean; evidence?: string[];
};

type Ctx = { f: Facts; calc: ScenarioCalc; now: Date };
const OUT_STATUS: Record<Outcome, RuleStatus> = { accept: "pass", conditional: "conditional", decline: "fail" };
const lbl = (a: string) => `Applicant ${a.slice(1)}`;
const RES_LABEL = Object.fromEntries(RES_OPTS);

type P = Record<string, unknown>;
const arr = (p: P, k: string) => (Array.isArray(p[k]) ? (p[k] as string[]) : []);
const n = (p: P, k: string) => (typeof p[k] === "number" ? (p[k] as number) : undefined);

function evalResidency(r: RuleLike, p: P, c: Ctx): Omit<RuleEval, "ruleId" | "ruleKey" | "version" | "check" | "category">[] {
  const out: Omit<RuleEval, "ruleId" | "ruleKey" | "version" | "check" | "category">[] = [];
  for (const a of applicantIds(c.f)) {
    const res = str(c.f, `${a}.residency`);
    if (!res) {
      out.push({ applicant: a, status: "unknown", reason: `${lbl(a)} residency unknown`, missing: [`${a}.residency`] });
      continue;
    }
    const accepted = arr(p, "accepted");
    const conditional = arr(p, "conditional");
    if (!accepted.includes(res) && !conditional.includes(res)) {
      out.push({ applicant: a, status: "fail", reason: `${lbl(a)}: ${RES_LABEL[res] ?? res} not accepted`, missing: [] });
      continue;
    }
    let status: RuleStatus = accepted.includes(res) ? "pass" : "conditional";
    const reasons: string[] = [`${lbl(a)}: ${RES_LABEL[res] ?? res} ${status === "pass" ? "accepted" : "accepted with conditions"}`];
    const missing: string[] = [];
    if (res === "temporary_visa") {
      const sub = str(c.f, `${a}.visaSubclass`)?.replace(/\D/g, "") ?? null;
      const allowed = arr(p, "subclassesAllowed").map((s) => s.replace(/\D/g, ""));
      const excluded = arr(p, "subclassesExcluded").map((s) => s.replace(/\D/g, ""));
      if (!sub && (allowed.length || excluded.length)) {
        status = "unknown";
        missing.push(`${a}.visaSubclass`);
        reasons.push("visa subclass needed");
      } else if (sub && excluded.includes(sub)) {
        status = "fail";
        reasons.push(`subclass ${sub} excluded`);
      } else if (sub && allowed.length && !allowed.includes(sub)) {
        status = "fail";
        reasons.push(`subclass ${sub} not in accepted list`);
      }
      const minM = n(p, "minVisaMonths");
      if (minM !== undefined && status !== "fail") {
        const exp = str(c.f, `${a}.visaExpiry`);
        const left = exp ? -1 * (monthsBetween(exp, c.now) ?? 0) : null;
        if (left === null) {
          if (status === "pass" || status === "conditional") status = "unknown";
          missing.push(`${a}.visaExpiry`);
          reasons.push(`visa expiry needed (min ${minM} months remaining)`);
        } else if (left < minM) {
          status = "fail";
          reasons.push(`${left} months left on visa, policy minimum ${minM}`);
        }
      }
      const maxLvr = n(p, "maxLvrPct");
      if (maxLvr !== undefined && status !== "fail") {
        if (c.calc.lvrPct === null) {
          status = "unknown";
          reasons.push(`LVR needed (temp visa max ${maxLvr}%)`);
        } else if (c.calc.lvrPct > maxLvr) {
          status = "fail";
          reasons.push(`LVR ${c.calc.lvrPct}% above temp-visa max ${maxLvr}%`);
        }
      }
    }
    out.push({ applicant: a, status, reason: reasons.join("; "), missing });
  }
  return out;
}

function evalCombination(_r: RuleLike, p: P, c: Ctx) {
  const ids = applicantIds(c.f);
  if (ids.length < 2) return [{ status: "n/a" as RuleStatus, reason: "Single applicant", missing: [] }];
  const res = ids.map((a) => str(c.f, `${a}.residency`));
  if (res.some((x) => !x)) return [{ status: "unknown" as RuleStatus, reason: "Residency of every applicant needed", missing: ids.filter((_, i) => !res[i]).map((a) => `${a}.residency`) }];
  const temp = res.filter((x) => x === "temporary_visa" || x === "foreign_non_resident").length;
  const resident = res.length - temp;
  const income = p.residentIncomeOnly ? " Only citizen/PR applicants' income is counted." : "";
  if (temp === 0) return [{ status: "pass" as RuleStatus, reason: "All applicants citizens / PR / NZ", missing: [] }];
  if (resident === 0) {
    const o = (p.allTemp as Outcome) ?? "decline";
    return [{ status: OUT_STATUS[o], reason: `All applicants on temporary visas: ${o}.${income}`, missing: [] }];
  }
  const o = (p.tempWithResident as Outcome) ?? "conditional";
  return [{ status: OUT_STATUS[o], reason: `Temporary visa holder with citizen/PR co-borrower: ${o}.${income}`, missing: [] }];
}

function evalEmployment(_r: RuleLike, p: P, c: Ctx) {
  const types = arr(p, "employmentTypes");
  const out: Omit<RuleEval, "ruleId" | "ruleKey" | "version" | "check" | "category">[] = [];
  for (const a of applicantIds(c.f)) {
    const emp = str(c.f, `${a}.employment`);
    if (!emp) {
      out.push({ applicant: a, status: "unknown", reason: `${lbl(a)} employment type unknown`, missing: [`${a}.employment`] });
      continue;
    }
    if (emp === "not_employed" || (types.length && !types.includes(emp))) continue;
    let status: RuleStatus = "pass";
    const reasons: string[] = [];
    const missing: string[] = [];
    const evidence: string[] = [];
    const worse = (s: RuleStatus) => {
      const order: RuleStatus[] = ["pass", "conditional", "unknown", "fail"];
      if (order.indexOf(s) > order.indexOf(status)) status = s;
    };
    const minT = n(p, "minTenureMonths");
    if (minT !== undefined) {
      const start = str(c.f, `${a}.startDate`);
      const t = start ? monthsBetween(start, c.now) : null;
      if (t === null) {
        worse("unknown");
        missing.push(`${a}.startDate`);
        reasons.push(`start date needed (min ${minT} months)`);
      } else if (t < minT) {
        const prior = num(c.f, `${a}.priorMonths`);
        const minI = n(p, "minIndustryMonths");
        if (minI !== undefined && prior !== null && t + prior >= minI) {
          worse("conditional");
          reasons.push(`${t} months in job (< ${minT}) but ${t + prior} months in industry (≥ ${minI})`);
        } else if (minI !== undefined && prior === null) {
          worse("unknown");
          missing.push(`${a}.priorMonths`);
          reasons.push(`${t} months in job (< ${minT}); prior industry history needed`);
        } else {
          worse("fail");
          reasons.push(`${t} months in job, policy minimum ${minT}`);
        }
      } else reasons.push(`${t} months in job (≥ ${minT})`);
    }
    const prob = bool(c.f, `${a}.probation`);
    if (p.probation) {
      if (prob === null) {
        worse("unknown");
        missing.push(`${a}.probation`);
        reasons.push("probation status needed");
      } else if (prob) {
        worse(OUT_STATUS[p.probation as Outcome]);
        reasons.push(`on probation: ${p.probation}`);
      }
    }
    const leave = str(c.f, `${a}.leave`);
    if (p.returnFromLeave && leave && leave !== "none") {
      worse(OUT_STATUS[p.returnFromLeave as Outcome]);
      reasons.push(`${leave.replace(/_/g, " ")}: ${p.returnFromLeave}`);
      if (!str(c.f, `${a}.returnDate`)) {
        missing.push(`${a}.returnDate`);
        worse("unknown");
      }
      evidence.push("employment letter confirming return date, hours and income");
    }
    const minP = n(p, "minPayslips");
    if (minP !== undefined) {
      const ps = num(c.f, `${a}.payslips`);
      if (ps === null || ps < minP) {
        evidence.push(`${minP} recent payslips (${ps ?? "unknown"} held)`);
        if (ps === null) missing.push(`${a}.payslips`);
        worse("conditional");
        reasons.push(`payslips: ${ps ?? "unknown"} of ${minP}`);
      }
    }
    out.push({ applicant: a, status, reason: `${lbl(a)}: ${reasons.join("; ") || "meets employment policy"}`, missing, evidence });
  }
  return out;
}

function evalIncome(_r: RuleLike, p: P, c: Ctx) {
  const comp = String(p.component ?? "");
  const types = arr(p, "employmentTypes");
  const out: Omit<RuleEval, "ruleId" | "ruleKey" | "version" | "check" | "category">[] = [];
  for (const a of applicantIds(c.f)) {
    const inc = income(c.f, `${a}.inc.${comp}`);
    if (!inc || inc.amount <= 0) continue;
    const emp = str(c.f, `${a}.employment`);
    if (types.length && emp && !types.includes(emp)) continue;
    const yearly = annualise(inc);
    let status: RuleStatus = "pass";
    const reasons = [`${lbl(a)} ${comp} ≈ $${(yearly ?? 0).toLocaleString("en-AU")}/yr (${inc.basis})`];
    const missing: string[] = [];
    const t = p.treatment as string;
    if (t === "exclude") {
      status = "conditional";
      reasons.push("not counted by this lender");
    } else if (t === "shade") {
      status = "pass";
      reasons.push(`counted at ${n(p, "shadingPct") ?? "?"}%`);
    } else if (t === "conditional") {
      status = "conditional";
      reasons.push("assessed case by case");
    }
    const minH = n(p, "minHistoryMonths");
    if (minH !== undefined) {
      if (inc.months === null) {
        status = "unknown";
        missing.push(`${a}.inc.${comp}`);
        reasons.push(`evidence period needed (min ${minH} months)`);
      } else if (inc.months < minH) {
        status = status === "pass" ? "conditional" : status;
        reasons.push(`${inc.months} months evidence < ${minH} required — may not be counted`);
      }
    }
    if (inc.basis === "net") reasons.push("figure entered as net — gross needed for lender calculators");
    if (emp === null) missing.push(`${a}.employment`);
    out.push({ applicant: a, component: comp, status, reason: reasons.join("; "), missing, requiresConfirmation: Boolean(p.requiresConfirmation) });
  }
  return out;
}

function evalMaxLvr(_r: RuleLike, p: P, c: Ctx) {
  const occ = str(c.f, "loan.occupancy");
  const purpose = c.calc.purpose;
  const ptype = str(c.f, "prop.type");
  const missing: string[] = [];
  const filt = (vals: string[], v: string | null, key: string) => {
    if (!vals.length) return true;
    if (v === null) {
      missing.push(key);
      return null;
    }
    return vals.includes(v);
  };
  const m = [filt(arr(p, "occupancy"), occ, "loan.occupancy"), filt(arr(p, "purpose"), purpose, "loan.purpose"), filt(arr(p, "propertyTypes"), ptype, "prop.type")];
  const resF = arr(p, "residency");
  if (resF.length) {
    const rs = applicantIds(c.f).map((a) => str(c.f, `${a}.residency`));
    if (rs.some((r) => r && resF.includes(r))) m.push(true);
    else if (rs.some((r) => r === null)) {
      m.push(null);
      applicantIds(c.f).forEach((a, i) => rs[i] === null && missing.push(`${a}.residency`));
    } else m.push(false);
  }
  if (m.includes(false)) return [{ status: "n/a" as RuleStatus, reason: "Filters do not match this scenario", missing: [] }];
  const max = n(p, "maxLvrPct")!;
  const lvr = p.includesLmi ? c.calc.lvrInclLmiPct : c.calc.lvrPct;
  if (m.includes(null)) return [{ status: "unknown" as RuleStatus, reason: `Max LVR ${max}% may apply — facts needed`, missing }];
  if (lvr === null) return [{ status: "unknown" as RuleStatus, reason: `LVR unknown (max ${max}%)`, missing: ["prop.price", "loan.amount"] }];
  return [{ status: (lvr <= max ? "pass" : "fail") as RuleStatus, reason: `LVR ${lvr}%${p.includesLmi ? " incl. LMI" : ""} vs max ${max}%`, missing: [] }];
}

function evalSavings(_r: RuleLike, p: P, c: Ctx) {
  const out: Omit<RuleEval, "ruleId" | "ruleKey" | "version" | "check" | "category">[] = [];
  const gift = num(c.f, "con.gift");
  if (gift !== null && gift > 0) {
    if (p.giftAccepted === false) out.push({ status: "fail", reason: `Gifted funds ($${gift.toLocaleString("en-AU")}) not accepted`, missing: [] });
    else out.push({ status: "conditional", reason: `Gift of $${gift.toLocaleString("en-AU")} accepted subject to gift letter / statutory declaration and donor funds evidence`, missing: [], evidence: ["gift letter / statutory declaration", "evidence of donor funds and transfer"] });
  }
  if (c.calc.purpose === "refinance") return out.length ? out : [{ status: "n/a" as RuleStatus, reason: "Refinance", missing: [] }];
  const above = n(p, "appliesAboveLvrPct") ?? 80;
  if (c.calc.lvrPct === null) return [...out, { status: "unknown" as RuleStatus, reason: `LVR unknown (genuine savings apply above ${above}%)`, missing: ["prop.price", "loan.amount"] }];
  if (c.calc.lvrPct <= above) return out.length ? out : [{ status: "n/a" as RuleStatus, reason: `LVR ${c.calc.lvrPct}% ≤ ${above}%`, missing: [] }];
  const price = num(c.f, "prop.price");
  const savings = num(c.f, "con.savings");
  const minPct = n(p, "minPct");
  const minHeld = n(p, "minHeldMonths");
  const reasons: string[] = [];
  let status: RuleStatus = "pass";
  const missing: string[] = [];
  if (minPct !== undefined) {
    if (savings === null || !price) {
      status = "unknown";
      missing.push("con.savings");
    } else {
      const genuine = savings + (p.giftCountsAsGenuine && gift ? gift : 0);
      const g = Math.round((genuine / price) * 10000) / 100;
      if (g < minPct) {
        status = "fail";
        reasons.push(`genuine savings ${g}% < ${minPct}%`);
      } else reasons.push(`genuine savings ${g}% ≥ ${minPct}%`);
    }
  }
  if (minHeld !== undefined && status !== "fail") {
    const held = num(c.f, "con.savingsHeldMonths");
    if (held === null) {
      status = "unknown";
      missing.push("con.savingsHeldMonths");
      reasons.push(`savings history needed (${minHeld} months)`);
    } else if (held < minHeld) {
      status = "fail";
      reasons.push(`savings held ${held} months < ${minHeld}`);
    }
  }
  out.push({ status, reason: `LVR ${c.calc.lvrPct}% > ${above}%: ${reasons.join("; ") || "genuine savings required"}`, missing, evidence: ["savings statements covering the required period"] });
  return out;
}

function evalProperty(_r: RuleLike, p: P, c: Ctx) {
  const t = str(c.f, "prop.type");
  const pc = str(c.f, "prop.postcode");
  if (!t) return [{ status: "unknown" as RuleStatus, reason: "Property type unknown", missing: ["prop.type"] }];
  if (arr(p, "excludedTypes").includes(t)) return [{ status: "fail" as RuleStatus, reason: `${t.replace(/_/g, " ")} excluded`, missing: [] }];
  if (pc && arr(p, "excludedPostcodes").includes(pc)) return [{ status: "fail" as RuleStatus, reason: `postcode ${pc} excluded`, missing: [] }];
  if (arr(p, "conditionalTypes").includes(t)) return [{ status: "conditional" as RuleStatus, reason: `${t.replace(/_/g, " ")} accepted with conditions`, missing: [] }];
  if (arr(p, "excludedPostcodes").length && !pc) return [{ status: "unknown" as RuleStatus, reason: "Postcode needed (postcode restrictions apply)", missing: ["prop.postcode"] }];
  return [{ status: "pass" as RuleStatus, reason: "Property type accepted", missing: [] }];
}

function evalScheme(_r: RuleLike, p: P, c: Ctx) {
  const s = str(c.f, "con.scheme");
  if (!s) {
    if (c.calc.depositPct !== null && c.calc.depositPct < 20 && c.calc.purpose !== "refinance")
      return [{ status: "unknown" as RuleStatus, reason: "Deposit below 20% — confirm whether the client wants a guarantee scheme", missing: ["con.scheme"] }];
    return [{ status: "n/a" as RuleStatus, reason: "No scheme interest recorded", missing: [] }];
  }
  if (s === "none") return [{ status: "n/a" as RuleStatus, reason: "No scheme", missing: [] }];
  return arr(p, "schemes").includes(s)
    ? [{ status: "pass" as RuleStatus, reason: `Lender participates in ${s.replace(/_/g, " ")} (participation and place availability must be confirmed separately from client eligibility)`, missing: [] }]
    : [{ status: "fail" as RuleStatus, reason: `Lender does not participate in ${s.replace(/_/g, " ")}`, missing: [] }];
}

function evalNote(_r: RuleLike, p: P, c: Ctx) {
  const tags = arr(p, "appliesTo");
  const ids = applicantIds(c.f);
  const has = (t: string) =>
    t === "always" ||
    (t === "temporary_visa" && ids.some((a) => str(c.f, `${a}.residency`) === "temporary_visa")) ||
    (t === "casual" && ids.some((a) => ["casual", "contract"].includes(str(c.f, `${a}.employment`) ?? ""))) ||
    (t === "self_employed" && ids.some((a) => ["self_employed", "director"].includes(str(c.f, `${a}.employment`) ?? ""))) ||
    (t === "low_deposit" && c.calc.lvrPct !== null && c.calc.lvrPct > 80) ||
    (t === "gift" && (num(c.f, "con.gift") ?? 0) > 0) ||
    (t === "refinance" && c.calc.purpose === "refinance");
  if (!tags.length || tags.some(has)) return [{ status: "info" as RuleStatus, reason: "Policy note relevant to this scenario", missing: [] }];
  return [{ status: "n/a" as RuleStatus, reason: "Not relevant", missing: [] }];
}

const EVAL: Record<string, (r: RuleLike, p: P, c: Ctx) => Omit<RuleEval, "ruleId" | "ruleKey" | "version" | "check" | "category">[]> = {
  residency: evalResidency, combination: evalCombination, employment: evalEmployment, income: evalIncome, max_lvr: evalMaxLvr,
  genuine_savings: evalSavings, property: evalProperty, scheme: evalScheme, note: evalNote,
};

export function evaluateRule(r: RuleLike, c: Ctx): RuleEval[] {
  const parsed = parseParams(r.check, r.params);
  const base = { ruleId: r.id, ruleKey: r.ruleKey, version: r.version, check: r.check, category: r.category };
  if (!parsed.ok) return [{ ...base, status: "unknown", reason: `Rule parameters invalid (${parsed.error}) — needs admin review`, missing: [] }];
  const fn = EVAL[r.check];
  if (!fn) return [{ ...base, status: "unknown", reason: "Unknown check type", missing: [] }];
  return fn(r, parsed.params, c).map((x) => ({ ...base, ...x }));
}

/** Policy categories the scenario needs evidence for (missing evidence → verification). */
export function requiredCategories(f: Facts, calc: ScenarioCalc): { category: string; why: string; component?: string }[] {
  const out: { category: string; why: string; component?: string }[] = [{ category: "max_lvr", why: "every scenario" }];
  const ids = applicantIds(f);
  const res = ids.map((a) => str(f, `${a}.residency`));
  if (res.some((r) => r && r !== "citizen")) out.push({ category: "visa_residency", why: "non-citizen applicant" });
  if (ids.length > 1 && res.some((r) => r === "temporary_visa" || r === "foreign_non_resident")) out.push({ category: "borrower_combination", why: "joint case with temporary visa holder" });
  if (ids.some((a) => ["casual", "contract", "self_employed", "director", "payg_part_time"].includes(str(f, `${a}.employment`) ?? "") || bool(f, `${a}.probation`) || ["parental_returned", "parental_on", "other_leave"].includes(str(f, `${a}.leave`) ?? "")))
    out.push({ category: "employment", why: "variable / recent employment" });
  const comps = new Set<string>();
  for (const a of ids) for (const c of ["overtime", "penalties", "commission", "bonus", "allowances", "self_employed", "director", "rental"]) if ((income(f, `${a}.inc.${c}`)?.amount ?? 0) > 0) comps.add(c);
  for (const c of comps) out.push({ category: "income", why: `${c} income`, component: c });
  if ((calc.lvrPct ?? 0) > 80 || (num(f, "con.gift") ?? 0) > 0) out.push({ category: "genuine_savings", why: (num(f, "con.gift") ?? 0) > 0 ? "gifted funds" : "LVR above 80%" });
  const sc = str(f, "con.scheme");
  if (sc && sc !== "none") out.push({ category: "scheme", why: "scheme interest" });
  if (["high_density", "land", "rural", "off_the_plan", "construction"].includes(str(f, "prop.type") ?? "")) out.push({ category: "property", why: "non-standard property type" });
  return out;
}
