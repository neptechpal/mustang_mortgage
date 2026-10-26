import { APPLICANT_NUMBERS, applicantCount, applicants } from "@/modules/crm/applicants";
// Flex Entry (port of includes/mmcrm-flex.php) + Flex helper prefill (mmcrm-flex-helper.php).
import { prisma } from "@/lib/db";
import { getSetting, setSetting } from "@/lib/settings";
import { logActivity } from "@/modules/crm/activity";
import { caseFacts, money, STAGES } from "./cases";
import { borrowPrefill, borrowSettings, GROUPS, CATEGORIES } from "./borrow";

export type FlexRow = { id: string; label: string; value: string; kind: string; orig?: string; ov?: boolean; annualbase?: string; calc?: boolean };
export type FlexGroup = { title: string; tone?: string; rows: FlexRow[]; total?: boolean };
export type FlexSection = { id: string; title: string; icon: string; note?: string; freq?: boolean; groups: FlexGroup[]; special?: "text" | "helper" | "living" | "all" };

export const COUNTED = ["applicants", "addresses", "employment", "income", "expenses", "assets", "liabilities", "loan", "text"];
const SNIP_KEY = "crmx.flex.snippets";
export const DEFAULT_SNIPPETS = [
  { t: "Rate reduction refinance", x: "The client wishes to refinance to access a more competitive interest rate and reduce their ongoing repayments." },
  { t: "Debt consolidation", x: "The client wishes to consolidate their existing debts into a single facility to simplify repayments and improve monthly cash flow." },
  {
    t: "First home buyer",
    x: "The client is a first home buyer seeking finance to purchase a home to live in, and wishes to take advantage of available government concessions where eligible.",
  },
  { t: "Offset account", x: "The client has requested an offset account so that savings can reduce the interest charged while keeping funds accessible." },
  { t: "Disclosure note", x: "Client has been provided with the credit guide and our privacy and disclosure documents and understands how we are remunerated." },
];

const str = (v: unknown) => (v === null || v === undefined ? "" : Array.isArray(v) ? v.join(", ") : typeof v === "object" ? "" : String(v));
const fmtDate = (v: string) => {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
};
const plainNum = (v: unknown) => {
  const s = str(v).replace(/[^0-9.\-]/g, "");
  return s === "" || s === "-" ? "" : String(parseFloat(s) || 0);
};
function yearsToDate(v: unknown) {
  const s = str(v);
  const y = parseFloat(s) || parseFloat(s.replace(/[^0-9.]/g, "")) || 0;
  if (y <= 0) return "";
  const d = new Date();
  d.setMonth(d.getMonth() - Math.round(y * 12));
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}
function splitName(full: string) {
  const p = full.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return { first: "", middle: "", last: "" };
  if (p.length === 1) return { first: p[0], middle: "", last: "" };
  return { first: p[0], middle: p.slice(1, -1).join(" "), last: p[p.length - 1] };
}
const ST_TYPES: Record<string, string> = {
  st: "Street", street: "Street", rd: "Road", road: "Road", ave: "Avenue", av: "Avenue", avenue: "Avenue", dr: "Drive", drive: "Drive", ct: "Court", court: "Court",
  pl: "Place", place: "Place", cres: "Crescent", crescent: "Crescent", blvd: "Boulevard", boulevard: "Boulevard", way: "Way", ln: "Lane", lane: "Lane", hwy: "Highway",
  highway: "Highway", pde: "Parade", parade: "Parade", tce: "Terrace", terrace: "Terrace", cl: "Close", close: "Close", cct: "Circuit", circuit: "Circuit", esp: "Esplanade", esplanade: "Esplanade",
};
const title = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export function parseAddress(raw: string) {
  const out = { unit: "", number: "", street: "", type: "", suburb: "", state: "", postcode: "" };
  let s = raw.replace(/\s+/g, " ").trim();
  if (!s) return out;
  let m = s.match(/[\s,]+(\d{4})\s*$/);
  if (m) {
    out.postcode = m[1];
    s = s.slice(0, m.index).trim();
  }
  m = s.match(/[\s,]+(NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\s*$/i);
  if (m) {
    out.state = m[1].toUpperCase();
    s = s.slice(0, m.index).trim();
  }
  let parts = s.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length > 2 && /^(unit|apt|apartment|shop|suite|u)\s*\d/i.test(parts[0])) {
    out.unit = parts[0].replace(/^(unit|apt|apartment|shop|suite|u)\s*/i, "");
    parts = parts.slice(1);
  }
  let streetPart = parts[0] ?? "";
  if (parts.length > 1) out.suburb = title(parts[parts.length - 1]);
  // number: "3/12" or leading "12" / "12A" / "12-14"
  m = streetPart.match(/^(\w+)\s*\/\s*(\d+[A-Za-z]?(?:-\d+[A-Za-z]?)?)\s+(.*)$/);
  if (m) {
    out.unit = out.unit || m[1];
    out.number = m[2];
    streetPart = m[3];
  } else {
    m = streetPart.match(/^(\d+[A-Za-z]?(?:-\d+[A-Za-z]?)?)\s+(.*)$/);
    if (m) {
      out.number = m[1];
      streetPart = m[2];
    }
  }
  const words = streetPart.split(" ");
  if (parts.length <= 1) {
    // no comma: suburb is text after the street-type word
    const idx = words.findIndex((w, i) => i > 0 && ST_TYPES[w.toLowerCase().replace(/\.$/, "")]);
    if (idx > 0) {
      out.type = ST_TYPES[words[idx].toLowerCase().replace(/\.$/, "")];
      out.street = words.slice(0, idx).join(" ");
      out.suburb = title(words.slice(idx + 1).join(" "));
      return out;
    }
  }
  const last = (words[words.length - 1] ?? "").toLowerCase().replace(/\.$/, "");
  if (words.length > 1 && ST_TYPES[last]) {
    out.type = ST_TYPES[last];
    words.pop();
  }
  out.street = words.join(" ");
  return out;
}

const R = (id: string, label: string, value: unknown, kind = "text", extra: Partial<FlexRow> = {}): FlexRow => ({ id, label, value: str(value), kind, ...extra });

export async function buildFlex(caseId: number) {
  const f = await caseFacts(caseId);
  if (!f) return null;
  const a = f.ff;
  const c = f.c;
  const st = await prisma.flexState.findUnique({ where: { caseId } });
  const ov = (st?.overrides ?? {}) as Record<string, string>;
  const done = (st?.done ?? {}) as Record<string, boolean>;
  const texts = (st?.texts ?? {}) as Record<string, string>;
  const count = Math.max(applicantCount(c), Math.min(4, Number(a.applicant_count) || 1));
  const ns = APPLICANT_NUMBERS.filter(n => n <= count);
  const meta = (n: number, k: "name" | "dob" | "mobile" | "email") => applicants(c).find(a => a.n === n)?.[k] || '';
  const sections: FlexSection[] = [];

  // Applicants
  sections.push({
    id: "applicants",
    title: "Applicants",
    icon: "👥",
    groups: ns.map((n) => {
      const full = str(a[`applicant${n}_fullname`]) || meta(n, "name");
      const sn = splitName(full);
      const rows = [
        R(`a${n}.first`, "First name", sn.first),
        R(`a${n}.middle`, "Middle name(s)", sn.middle),
        R(`a${n}.last`, "Last name", sn.last),
        R(`a${n}.full`, "Full name", full),
        R(`a${n}.dob`, "Date of birth", fmtDate(str(a[`applicant${n}_dob`]) || meta(n, "dob")), "date"),
        R(`a${n}.mobile`, "Mobile", str(a[`applicant${n}_mobile`]) || meta(n, "mobile")),
        R(`a${n}.email`, "Email", str(a[`applicant${n}_email`]) || meta(n, "email")),
        R(`a${n}.citizen`, "Citizenship / visa", a[`applicant${n}_citizenship`]),
      ];
      if (n === 1) rows.push(R("a1.deps", "Number of dependants", a.applicant1_dependants, "num"), R("a1.depdet", "Dependant ages / childcare", a.applicant1_dependant_details));
      return { title: `Applicant ${n} — ${full}`, tone: `a${n}`, rows };
    }),
  });

  // Addresses
  sections.push({
    id: "addresses",
    title: "Addresses",
    icon: "🏠",
    note: "Addresses are split automatically — double-check unit, street type and suburb before pasting.",
    groups: ns.map((n) => {
      const full = str(a[`applicant${n}_current_address`]);
      const p = parseAddress(full);
      const years = a[`applicant${n}_time_current_address`];
      const rows = [
        R(`ad${n}.full`, "Current address (full)", full, "long"),
        R(`ad${n}.unit`, "Unit / apartment", p.unit),
        R(`ad${n}.number`, "Street number", p.number),
        R(`ad${n}.street`, "Street name", p.street),
        R(`ad${n}.type`, "Street type", p.type),
        R(`ad${n}.suburb`, "Suburb", p.suburb),
        R(`ad${n}.state`, "State", p.state),
        R(`ad${n}.postcode`, "Postcode", p.postcode),
        R(`ad${n}.status`, "Residential status", a[`applicant${n}_residential_status`]),
        R(`ad${n}.years`, "Time at address (years)", years, "num"),
        R(`ad${n}.since`, "Living here since (approx.)", yearsToDate(years)),
      ];
      const prev = str(a[`applicant${n}_previous_address`]);
      if (prev) {
        const q = parseAddress(prev);
        rows.push(
          R(`ad${n}.pfull`, "Previous address (full)", prev, "long"),
          R(`ad${n}.pnumber`, "Prev. street number", (q.unit ? q.unit + "/" : "") + q.number),
          R(`ad${n}.pstreet`, "Prev. street name & type", `${q.street} ${q.type}`.trim()),
          R(`ad${n}.psuburb`, "Prev. suburb", q.suburb),
          R(`ad${n}.pstate`, "Prev. state", q.state),
          R(`ad${n}.ppost`, "Prev. postcode", q.postcode),
          R(`ad${n}.ptime`, "Time at previous address", a[`applicant${n}_time_previous_address`]),
        );
      }
      return { title: `Applicant ${n}`, rows };
    }),
  });

  // Employment
  sections.push({
    id: "employment",
    title: "Employment",
    icon: "💼",
    groups: ns.map((n) => {
      const years = a[`applicant${n}_length_current_employer`];
      const rows = [
        R(`e${n}.type`, "Employment type", a[`applicant${n}_employment_type`]),
        R(`e${n}.employer`, "Employer / business", a[`applicant${n}_employer_name`]),
        R(`e${n}.occ`, "Occupation / role", a[`applicant${n}_occupation`]),
        R(`e${n}.years`, "Length of employment (years)", years, "num"),
        R(`e${n}.start`, "Start date (approx. mm/yyyy)", yearsToDate(years)),
      ];
      if (str(a[`applicant${n}_previous_employer`]))
        rows.push(
          R(`e${n}.pemp`, "Previous employer", a[`applicant${n}_previous_employer`]),
          R(`e${n}.pocc`, "Previous occupation", a[`applicant${n}_previous_occupation`]),
          R(`e${n}.plen`, "Length of previous employment", a[`applicant${n}_length_previous_employment`]),
        );
      return { title: `Applicant ${n}`, rows };
    }),
  });

  // Income
  const mult: Record<string, number> = { weekly: 52, fortnightly: 26, monthly: 12, annually: 1, yearly: 1, annual: 1 };
  sections.push({
    id: "income",
    title: "Income",
    icon: "💰",
    freq: true,
    groups: ns.map((n) => {
      const fq = str(a[`applicant${n}_income_frequency`]);
      const amt = plainNum(a[`applicant${n}_income_amount`]);
      const m = mult[fq.toLowerCase()];
      const annual = amt !== "" && m ? String(Math.round(parseFloat(amt) * m * 100) / 100) : "";
      return {
        title: `Applicant ${n}`,
        rows: [
          R(`i${n}.freq`, "Income frequency (as given)", fq),
          R(`i${n}.amount`, "Gross income (as given)", amt, "money"),
          R(`i${n}.annual`, "Gross income — annual", annual, "money", { calc: true }),
          R(`i${n}.rent`, "Rental income (as given)", plainNum(a[`applicant${n}_rental_income`]), "money"),
          R(`i${n}.sel`, "Gross income — at chosen frequency", "", "sel", { annualbase: annual }),
        ],
      };
    }),
  });

  // Living expenses
  const STD: [string, string][] = [
    ["expenses_food", "Food & groceries"],
    ["expenses_utilities_owner", "Utilities (gas, electricity, water, rates)"],
    ["expenses_telecom", "Phone, internet & pay TV"],
    ["expenses_clothing", "Clothing & personal care"],
    ["expenses_medical", "Medical, health & fitness"],
    ["expenses_recreation", "Recreation & entertainment"],
    ["expenses_transport", "Transport"],
    ["expenses_education", "Education"],
    ["expenses_childcare", "Childcare & child support"],
    ["expenses_insurance", "Insurance"],
    ["expenses_other", "Other"],
  ];
  const expRows = STD.map(([k, l]) => R(`x.${k}`, l, plainNum(a[k]), "expense"));
  for (const k of Object.keys(a))
    if ((k.startsWith("exp_") || k.startsWith("expenses_")) && !STD.some(([s]) => s === k) && typeof a[k] !== "object")
      expRows.push(R(`x.${k}`, title(k.replace(/^(exp_|expenses_)/, "").replace(/_/g, " ")), plainNum(a[k]), "expense"));
  sections.push({
    id: "expenses",
    title: "Living expenses",
    icon: "🧾",
    freq: true,
    note: "Client answers are monthly. Switch the frequency to match the Flex field you are filling in.",
    groups: [{ title: "Household", rows: expRows, total: true }],
  });

  // Assets
  const assetGroups: FlexGroup[] = [
    {
      title: "General",
      rows: [
        R("as.savings", "Savings / cash", plainNum(a.asset_savings), "money"),
        R("as.super", "Superannuation", plainNum(a.asset_superfund ?? a.asset_super), "money"),
        R("as.vehicle", "Vehicle (make / model)", a.asset_vehicle_make_model ?? a.asset_vehicle),
        R("as.vehval", "Vehicle value", plainNum(a.asset_vehicle_value), "money"),
        R("as.contents", "Home contents", plainNum(a.asset_home_contents), "money"),
      ],
    },
  ];
  if (str(a.realestate_address) || str(a.realestate_value))
    assetGroups.push({
      title: "Property",
      rows: [R("re.type", "Type", a.realestate_type), R("re.addr", "Address", a.realestate_address, "long"), R("re.val", "Estimated value", plainNum(a.realestate_value), "money")],
    });
  for (const rk of ["additional_properties", "properties"]) {
    const list = Array.isArray(a[rk]) ? (a[rk] as Record<string, unknown>[]) : [];
    list.forEach((r, i) => {
      if (!r || typeof r !== "object") return;
      assetGroups.push({
        title: `Property (extra) ${i + 1}`,
        rows: [
          R(`rp.${rk}.${i}.addr`, "Address", r.address, "long"),
          R(`rp.${rk}.${i}.val`, "Estimated value", plainNum(r.value), "money"),
          R(`rp.${rk}.${i}.bal`, "Loan balance", plainNum(r.loan_balance), "money"),
          R(`rp.${rk}.${i}.rent`, "Monthly rent", plainNum(r.rental_income), "money"),
        ],
      });
    });
  }
  sections.push({ id: "assets", title: "Assets", icon: "🏦", groups: assetGroups });

  // Liabilities
  const liab: FlexGroup[] = [
    {
      title: "Home loan",
      rows: [
        R("li.mort_bal", "Mortgage — remaining balance", plainNum(a.liability_mortgage_loan_repayment), "money"),
        R("li.mort_rate", "Mortgage — interest rate (%)", a.liability_mortgage_loan_rate, "num"),
        R("li.mort_lender", "Mortgage — lender", a.liability_mortgage_loan_lender),
      ],
    },
    {
      title: "Vehicle loan",
      rows: [
        R("li.veh_bal", "Vehicle loan — balance", plainNum(a.liability_vehicle_loan_balance), "money"),
        R("li.veh_rep", "Vehicle loan — repayment", plainNum(a.liability_vehicle_loan_repayment), "money"),
        R("li.veh_rate", "Vehicle loan — rate (%)", a.liability_vehicle_loan_rate, "num"),
      ],
    },
    {
      title: "Credit cards",
      rows: [R("li.cc_limit", "Credit cards — total limit", plainNum(a.liability_cc_limit), "money"), R("li.cc_bal", "Credit cards — total balance", plainNum(a.liability_cc_balance), "money")],
    },
  ];
  for (const rk of ["other_liabilities", "liabilities"]) {
    const list = Array.isArray(a[rk]) ? (a[rk] as Record<string, unknown>[]) : [];
    list.forEach((r, i) => {
      if (!r || typeof r !== "object") return;
      liab.push({
        title: `${str(r.type) || "Debt"} ${i + 1}`,
        rows: [
          R(`lr.${rk}.${i}.type`, "Type", r.type),
          R(`lr.${rk}.${i}.lender`, "Lender", r.lender),
          R(`lr.${rk}.${i}.limit`, "Limit", plainNum(r.limit), "money"),
          R(`lr.${rk}.${i}.bal`, "Balance", plainNum(r.balance), "money"),
          R(`lr.${rk}.${i}.rep`, "Monthly repayment", plainNum(r.repayment), "money"),
        ],
      });
    });
  }
  sections.push({ id: "liabilities", title: "Liabilities", icon: "💳", groups: liab });

  // Loan & objectives
  const purposes = a.purpose_of_lending ?? a.purpose;
  const features = a.desired_loan_features ?? a.features;
  sections.push({
    id: "loan",
    title: "Loan & objectives",
    icon: "🎯",
    groups: [
      {
        title: "From the Fact Find",
        rows: [
          R("ln.purpose", "Purpose of loan", purposes),
          R("ln.amount", "Loan amount", f.loan ? String(f.loan) : "", "money"),
          R("ln.features", "Desired features", features),
          R("ln.objective", "Client objective (their words)", a.compliance_objective ?? a.objective, "long"),
          R("ln.comments", "Additional comments", a.additional_comments, "long"),
        ],
      },
    ],
  });
  sections.push({ id: "text", title: "Objectives & requirements text", icon: "✍", groups: [], special: "text" });
  sections.push({ id: "helper", title: "Flex text helper", icon: "🧠", groups: [], special: "helper" });
  sections.push({ id: "living", title: "Living cost guide", icon: "📊", groups: [], special: "living" });
  sections.push({ id: "all", title: "All Fact Find answers", icon: "🔎", groups: [], special: "all" });

  // apply overrides
  for (const s of sections)
    for (const g of s.groups)
      for (const r of g.rows)
        if (ov[r.id] !== undefined) {
          r.orig = r.value;
          r.value = ov[r.id];
          r.ov = true;
        }

  // generated text boxes
  const purposeList = (Array.isArray(purposes) ? purposes : str(purposes) ? str(purposes).split(",") : []).map((p) => String(p).trim()).filter(Boolean);
  const PMAP: Record<string, string> = {
    buy: "purchase a property",
    refinance: "refinance their existing loan",
    construction: "finance a construction",
    investment: "purchase an investment property",
    other: "",
  };
  const firsts = [f.a1, f.a2].map((n) => n.split(/\s+/)[0]).filter(Boolean);
  const who = firsts.length ? firsts.join(" and ") : "The client";
  const plural = firsts.length === 2;
  const ps = purposeList.map((p) => (p.toLowerCase() in PMAP ? PMAP[p.toLowerCase()] : p.toLowerCase())).filter(Boolean);
  const want = ps.length ? " looking to " + (ps.length > 1 ? ps.slice(0, -1).join(", ") + " and " + ps[ps.length - 1] : ps[0]) : " seeking finance";
  const amt = f.loan ? ` The loan amount sought is approximately ${money(f.loan)}.` : "";
  const obj = str(a.compliance_objective ?? a.objective).replace(/[.\s]+$/, "");
  const objectiveGen = `${who} ${plural ? "are" : "is"}${want}.${amt}${obj ? ` In their words: "${obj}."` : ""}`;
  const featList = (Array.isArray(features) ? features : str(features) ? str(features).split(",") : []).map((x) => String(x).trim()).filter(Boolean);
  const reqGen = featList.length
    ? `${who} ${plural ? "have" : "has"} requested the following features: ${featList.join(", ").toLowerCase()}.`
    : `${who} ${plural ? "have" : "has"} not requested any specific loan features.`;
  const textBoxes = [
    { id: "objective", title: "Objectives of the loan", gen: objectiveGen, text: texts.objective ?? objectiveGen },
    { id: "requirements", title: "Requirements & preferences", gen: reqGen, text: texts.requirements ?? reqGen },
    { id: "reason", title: "Reason for recommendation", gen: "", text: texts.reason ?? "" },
    { id: "notes", title: "Broker notes for the file", gen: "", text: texts.notes ?? "" },
  ];

  // helper prefill
  const pj = purposeList.join(" ").toLowerCase();
  const prefill: Record<string, string> = {};
  if (pj.includes("refinance")) Object.assign(prefill, { prodType: "refinance home loan", prodPurpose: "the refinance of an existing home loan", reqPurpose: "refinance their existing home loan to achieve a better overall position" });
  else if (pj.includes("construction")) Object.assign(prefill, { prodType: "construction home loan", prodPurpose: "the construction of a new dwelling", reqPurpose: "construct a new dwelling on owned or to-be-purchased land" });
  else if (pj.includes("invest"))
    Object.assign(prefill, { prodType: "investment property loan", prodPurpose: "the purchase of a residential property", reqPurpose: "purchase a residential investment property", occ: "investment" });
  else if (pj.includes("buy")) Object.assign(prefill, { prodType: "new purchase home loan", prodPurpose: "the purchase of a residential property", reqPurpose: "purchase an owner-occupied home" });
  if (f.loan) prefill.amount = Math.round(f.loan).toLocaleString("en-AU");
  const special = str(a.compliance_objective ?? a.objective);
  if (special) prefill.special = special;
  const fj = featList.join(" ").toLowerCase();
  if (featList.length) {
    prefill.offset = fj.includes("offset") ? "yes" : "no";
    prefill.redraw = fj.includes("redraw") ? "yes" : "no";
    const fixed = fj.includes("fixed"),
      variable = fj.includes("variable");
    if (fixed && variable) Object.assign(prefill, { prodRate: "a split between fixed and variable", featRate: "a split between fixed and variable", reqRate: "a split loan (part fixed, part variable) to balance certainty and flexibility" });
    else if (fixed) Object.assign(prefill, { prodRate: "fixed", featRate: "fixed", reqRate: "fixed rate home loan to provide certainty of repayments for a set period" });
    else if (variable) Object.assign(prefill, { prodRate: "variable", featRate: "variable", reqRate: "variable home loan with the flexibility to make additional repayments" });
  }

  // living guide
  const bs = await borrowSettings();
  const household = String((await borrowPrefill(caseId)).household ?? "couple");

  // all answers
  const all = Object.entries(a)
    .filter(([, v]) => v !== null && v !== "" && typeof v !== "object")
    .map(([k, v]) => ({ label: title(k.replace(/_/g, " ")), value: String(v) }));

  const snippets = await getSnippets();
  return {
    caseId,
    name: f.name,
    stage: STAGES[c.stage] ?? c.stage,
    ffDone: c.ffDone,
    portalClosed: c.portalClosed,
    sections,
    done,
    textBoxes,
    prefill,
    living: { groups: GROUPS, categories: CATEGORIES, table: bs.living_table, household },
    all,
    snippets,
  };
}

export async function getSnippets(): Promise<{ t: string; x: string }[]> {
  const s = await getSetting<{ t: string; x: string }[] | null>(SNIP_KEY, null);
  return Array.isArray(s) ? s : DEFAULT_SNIPPETS;
}
export async function saveSnippets(items: { t: string; x: string }[]) {
  const clean = items.map((i) => ({ t: String(i.t ?? "").trim().slice(0, 200), x: String(i.x ?? "").trim().slice(0, 5000) })).filter((i) => i.t && i.x).slice(0, 60);
  await setSetting(SNIP_KEY, clean);
}

export async function setPortal(caseId: number, open: boolean, why = "") {
  await prisma.case.update({ where: { id: caseId }, data: { portalClosed: !open } });
  await logActivity(caseId, open ? "portal_enabled" : "portal_disabled", (open ? "Client portal re-opened" : "Client portal closed") + (why ? ` — ${why}` : ""), "admin");
}

/** Automation option portal_off_on_flex (crm-core "crm.automation" setting; default on). */
export async function portalOffOnFlex() {
  const o = await getSetting<Record<string, unknown>>("crm.automation", {});
  const v = o.portal_off_on_flex ?? o.portalOffOnFlex ?? 1;
  return v === true || v === 1 || v === "1";
}
