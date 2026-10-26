// Borrowing capacity maths — verbatim port of mustang-mini-crm/assets/borrow.js (indicative only).

export type BorrowAssumptions = {
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
  fees: Record<string, { transfer: number; mortgage: number }>;
};

// mmcrm-borrow.php defaults()
export const BORROW_DEFAULTS: BorrowAssumptions = {
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
};

export const GROUPS: Record<string, string> = {
  single: "Single",
  single1: "Single + 1 dep",
  couple: "Couple",
  c1: "Couple + 1 dep",
  c2: "Couple + 2 dep",
  c3: "Couple + 3 dep",
};

export function tax(inc: number) {
  // 2024-25 resident rates + 2% Medicare (no low-income reductions)
  inc = Math.max(0, inc || 0);
  let t = 0;
  if (inc > 190000) t = 51638 + (inc - 190000) * 0.45;
  else if (inc > 135000) t = 31288 + (inc - 135000) * 0.37;
  else if (inc > 45000) t = 4288 + (inc - 45000) * 0.3;
  else if (inc > 18200) t = (inc - 18200) * 0.16;
  return t + inc * 0.02;
}
export const netOf = (g: number) => Math.max(0, g - tax(g));
export function grossFromNet(n: number) {
  let lo = 0,
    hi = 3000000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (netOf(mid) < n) lo = mid;
    else hi = mid;
  }
  return hi;
}
export function pmt(rate: number, yrs: number, p: number) {
  const r = rate / 100 / 12,
    n = yrs * 12;
  if (p <= 0 || n <= 0) return 0;
  if (!r) return p / n;
  return (p * r) / (1 - Math.pow(1 + r, -n));
}
export function pv(rate: number, yrs: number, pay: number) {
  const r = rate / 100 / 12,
    n = yrs * 12;
  if (pay <= 0 || n <= 0) return 0;
  if (!r) return pay * n;
  return (pay * (1 - Math.pow(1 + r, -n))) / r;
}

export type BorrowInputs = {
  a1Name: string;
  a2Name: string;
  a1Gross: number;
  a1Other: number;
  a2Gross: number;
  a2Other: number;
  rentPw: number;
  household: string;
  dependants: number;
  livingPm: number;
  ccLimit: number;
  otherPm: number;
  helpPm: number;
  otherCommit: number;
  propLoans: number;
  useHem: boolean;
  prodRate: number;
  buffer: number;
  floorRate: number;
  termYears: number;
  repayType: "PI" | "IO";
  state: string;
  desired: number;
  deposit: number;
  targetLvr: number; // fraction
  dutyAllow: number;
};

export function compute(S: BorrowAssumptions, i: BorrowInputs, prodOverride?: number) {
  const prod = prodOverride != null ? prodOverride : i.prodRate;
  const assess = Math.max(prod + i.buffer, i.floorRate);
  const bs = (S.bonus_shade_pct || 80) / 100;
  const g1 = i.a1Gross + i.a1Other * bs,
    g2 = i.a2Gross + i.a2Other * bs,
    gross = g1 + g2;
  const netAnnual = netOf(g1) + netOf(g2);
  const rentPm = (i.rentPw * 52 * ((S.rent_shade_pct || 80) / 100)) / 12;
  const netPm = netAnnual / 12 + rentPm;
  const hem = +((S as unknown as Record<string, number>)["hem_" + i.household] ?? 0) || 0;
  const living = i.useHem ? Math.max(i.livingPm, hem) : i.livingPm;
  const ccPm = i.ccLimit * ((S.cc_assess_pct || 3.8) / 100);
  const propPm = i.propLoans ? pmt(assess, 30, i.propLoans) : 0;
  const commit = living + ccPm + i.otherPm + i.helpPm + i.otherCommit + propPm;
  const cap = Math.max(0, netPm - commit);
  const io = i.repayType === "IO",
    ioYrs = io ? +S.io_years || 5 : 0;
  const assessTerm = Math.max(1, i.termYears - ioYrs);
  const maxLoan = pv(assess, assessTerm, cap);
  const dtiLoan = Math.max(0, (+S.dti_cap || 6) * gross - i.propLoans - i.ccLimit);
  const repM = io ? (maxLoan * prod) / 1200 : pmt(prod, i.termYears, maxLoan);
  return {
    prod,
    assess,
    gross,
    netAnnual,
    netPm,
    rentPm,
    hem,
    living,
    ccPm,
    propPm,
    commit,
    cap,
    io,
    assessTerm,
    maxLoan,
    dtiLoan,
    dti: gross ? (maxLoan + i.propLoans + i.ccLimit) / gross : 0,
    repM,
  };
}

export function fees(S: BorrowAssumptions, state: string) {
  const f = S.fees[state] || { transfer: 0, mortgage: 0 };
  return (+S.solicitor_fee || 0) + (+f.transfer || 0) + (+f.mortgage || 0);
}

export const money = (n: number) => (isFinite(n) ? "$" + Math.round(n).toLocaleString("en-AU") : "—");
export const money2 = (n: number) => (isFinite(n) ? "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—");
export const floor5k = (n: number) => Math.max(0, Math.floor(n / 5000) * 5000);
