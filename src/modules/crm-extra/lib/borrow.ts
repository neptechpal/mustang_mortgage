// Borrowing capacity settings, prefill & history (port of mmcrm-borrow.php).
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { getSetting, setSetting } from "@/lib/settings";
import { getCrmOptions } from "./opts";
import { caseFacts, num } from "./cases";

export const GROUPS: Record<string, string> = {
  single: "Single",
  single1: "Single + 1 dep",
  couple: "Couple",
  c1: "Couple + 1 dep",
  c2: "Couple + 2 dep",
  c3: "Couple + 3 dep",
};
export const CATEGORIES: Record<string, string> = {
  utilities_oo: "Utilities & Rates – Owner Occupied",
  utilities_ip: "Utilities & Rates – Investment Property",
  phone: "Telephone, Internet, Pay TV & Streaming",
  groceries: "Groceries",
  recreation: "Recreation & Entertainment",
  clothing: "Clothing & Personal Care",
  medical: "Medical & Health (excluding Health Insurance)",
  transport: "Transport",
  education: "Education",
  childcare: "Childcare",
  insurance: "Insurance (non-health)",
  other: "Other",
};

export type Fees = Record<string, { transfer: number; mortgage: number }>;
export type BorrowSettings = {
  product_rate: number;
  buffer_percent: number;
  floor_rate: number;
  term_years: number;
  io_years: number;
  rent_shade_pct: number;
  bonus_shade_pct: number;
  cc_assess_pct: number;
  dti_cap: number;
  hem_single: number;
  hem_single1: number;
  hem_couple: number;
  hem_c1: number;
  hem_c2: number;
  hem_c3: number;
  solicitor_fee: number;
  fees: Fees;
  living_table: Record<string, Record<string, number>>;
  broker_name: string;
  broker_email: string;
  broker_mobile: string;
  company: string;
  logo: string;
};

const row = (o: number[]) => {
  const keys = ["utilities_oo", "utilities_ip", "phone", "groceries", "recreation", "clothing", "medical", "transport", "education", "childcare", "insurance", "other"];
  return Object.fromEntries(keys.map((k, i) => [k, o[i]]));
};

export async function borrowDefaults(): Promise<BorrowSettings> {
  const o = await getCrmOptions();
  return {
    product_rate: 6.19,
    buffer_percent: 3.0,
    floor_rate: 7.5,
    term_years: 30,
    io_years: 5,
    rent_shade_pct: 80,
    bonus_shade_pct: 80,
    cc_assess_pct: 3.8,
    dti_cap: 6,
    hem_single: 2400,
    hem_single1: 3000,
    hem_couple: 3200,
    hem_c1: 3800,
    hem_c2: 4400,
    hem_c3: 5000,
    solicitor_fee: 1500,
    fees: {
      NSW: { transfer: 230, mortgage: 165 },
      VIC: { transfer: 200, mortgage: 119 },
      QLD: { transfer: 220, mortgage: 219 },
      SA: { transfer: 190, mortgage: 187 },
      WA: { transfer: 190, mortgage: 203 },
      TAS: { transfer: 190, mortgage: 149 },
      ACT: { transfer: 220, mortgage: 160 },
      NT: { transfer: 150, mortgage: 155 },
    },
    living_table: {
      single: row([250, 0, 120, 550, 220, 150, 100, 330, 0, 0, 230, 250]),
      single1: row([250, 0, 120, 720, 260, 190, 130, 380, 50, 0, 240, 260]),
      couple: row([300, 0, 150, 850, 350, 220, 140, 420, 0, 0, 260, 260]),
      c1: row([300, 0, 150, 1020, 390, 260, 170, 470, 50, 0, 270, 270]),
      c2: row([300, 0, 150, 1190, 430, 300, 200, 520, 100, 0, 280, 280]),
      c3: row([300, 0, 150, 1360, 470, 340, 230, 570, 150, 0, 290, 290]),
    },
    broker_name: "Sulav Adhikari",
    broker_email: "sulav.adhikari@mustangmortgage.com.au",
    broker_mobile: "0416 066 954",
    company: "Mustang Mortgage",
    logo: o.brandLogo,
  };
}

const KEY = "crmx.borrow.settings";

export async function borrowSettings(): Promise<BorrowSettings> {
  const d = await borrowDefaults();
  const saved = await getSetting<Partial<BorrowSettings> | null>(KEY, null);
  const s = { ...d, ...(saved ?? {}) } as BorrowSettings;
  s.fees = Object.fromEntries(Object.entries(d.fees).map(([st, v]) => [st, { ...v, ...(saved?.fees?.[st] ?? {}) }]));
  s.living_table = Object.fromEntries(Object.entries(d.living_table).map(([g, c]) => [g, { ...c, ...(saved?.living_table?.[g] ?? {}) }]));
  return s;
}

export const SCALARS = [
  "product_rate",
  "buffer_percent",
  "floor_rate",
  "term_years",
  "io_years",
  "rent_shade_pct",
  "bonus_shade_pct",
  "cc_assess_pct",
  "dti_cap",
  "hem_single",
  "hem_single1",
  "hem_couple",
  "hem_c1",
  "hem_c2",
  "hem_c3",
  "solicitor_fee",
] as const;

export async function saveBorrowSettings(fd: FormData) {
  const d = await borrowDefaults();
  const s: BorrowSettings = JSON.parse(JSON.stringify(d));
  for (const k of SCALARS) {
    const v = fd.get(`s[${k}]`);
    if (v !== null && v !== "") (s as unknown as Record<string, number>)[k] = parseFloat(String(v)) || 0;
  }
  for (const st of Object.keys(d.fees))
    for (const k of ["transfer", "mortgage"] as const) {
      const v = fd.get(`s[fees][${st}][${k}]`);
      s.fees[st][k] = v === null ? d.fees[st][k] : parseFloat(String(v)) || 0;
    }
  for (const g of Object.keys(d.living_table))
    for (const c of Object.keys(d.living_table[g])) s.living_table[g][c] = parseFloat(String(fd.get(`s[living_table][${g}][${c}]`) ?? "0")) || 0;
  for (const k of ["broker_name", "broker_email", "broker_mobile", "company"] as const) s[k] = String(fd.get(`s[${k}]`) ?? d[k]).trim();
  const logo = String(fd.get("s[logo]") ?? "").trim();
  s.logo = /^https?:\/\//i.test(logo) ? logo : "";
  await setSetting(KEY, s);
}

/** prefill(): map fact-find draft → calculator inputs. */
export async function borrowPrefill(caseId: number): Promise<Record<string, string | number>> {
  if (!caseId) return {};
  const f = await caseFacts(caseId);
  if (!f) return {};
  const a = f.ff;
  const mult: Record<string, number> = { weekly: 52, fortnightly: 26, monthly: 12, annually: 1, annual: 1, yearly: 1 };
  const out: Record<string, string | number> = { a1Name: f.a1, a2Name: f.a2, caseName: f.name };
  const two = String(a.applicant_count ?? "") === "2" || f.a2 !== "";
  for (const n of [1, 2]) {
    const p = `applicant${n}_`;
    const fq = String(a[`${p}income_frequency`] ?? "").toLowerCase();
    const amt = num(a[`${p}income_amount`]);
    if (amt) out[`a${n}Gross`] = Math.round(amt * (mult[fq] ?? 1));
    if (n === 1 || two) {
      const rent = num(a[`${p}rental_income`]);
      if (rent) out.rentPw = Math.round((Number(out.rentPw) || 0) + (rent * (mult[fq] ?? 12)) / 52);
    }
  }
  let living = 0;
  for (const [k, v] of Object.entries(a)) if (!Array.isArray(v) && typeof v !== "object" && (k.startsWith("expenses_") || k.startsWith("exp_"))) living += num(v);
  if (living) out.livingPm = Math.round(living);
  let cc = num(a.liability_cc_limit);
  let other = num(a.liability_vehicle_loan_repayment);
  let help = 0;
  for (const r of Array.isArray(a.other_liabilities) ? (a.other_liabilities as Record<string, unknown>[]) : []) {
    if (!r || typeof r !== "object") continue;
    const t = String(r.type ?? "").toLowerCase();
    if (t.includes("credit")) cc += num(r.limit);
    else if (t.includes("hecs")) help += num(r.repayment);
    else other += num(r.repayment);
  }
  if (help) out.helpPm = help;
  if (cc) out.ccLimit = Math.round(cc);
  if (other) out.otherPm = Math.round(other);
  const deps = Math.floor(num(a.applicant1_dependants));
  out.dependants = deps;
  out.household = two ? (deps >= 3 ? "c3" : deps === 2 ? "c2" : deps === 1 ? "c1" : "couple") : deps >= 1 ? "single1" : "single";
  if (f.loan) out.desired = Math.round(f.loan);
  return out;
}

export async function borrowHistory(caseId?: number) {
  const rows = await prisma.borrowCalc.findMany({
    where: caseId ? { caseId } : {},
    orderBy: { createdAt: "desc" },
    take: caseId ? 10 : 150,
  });
  return rows;
}

export async function saveBorrowRun(input: { caseId: number; userId: number; label: string; maxLoan: number; summary: string; data: Record<string, string> }) {
  const id = crypto.randomBytes(6).toString("base64url").slice(0, 8);
  await prisma.borrowCalc.create({ data: { id, ...input } });
  // keep global newest 150 and per-case newest 10
  const keepGlobal = (await prisma.borrowCalc.findMany({ orderBy: { createdAt: "desc" }, take: 150, select: { id: true } })).map((r) => r.id);
  const keepCase = input.caseId
    ? (await prisma.borrowCalc.findMany({ where: { caseId: input.caseId }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true } })).map((r) => r.id)
    : [];
  await prisma.borrowCalc.deleteMany({
    where: {
      id: { notIn: keepGlobal },
      OR: [{ caseId: 0 }, ...(input.caseId ? [{ caseId: input.caseId, id: { notIn: keepCase } }] : [])],
    },
  });
  return id;
}
