"use client";
// Borrowing capacity & broker calculators — faithful port of assets/borrow.js.
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Bookmark,
  Briefcase,
  Calculator,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  Copy,
  ExternalLink,
  Home,
  Landmark,
  Mail,
  MessageSquare,
  PiggyBank,
  Printer,
  Repeat,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  Alert,
  Badge,
  Card,
  EmptyState,
  LinkButton,
  PageHeader,
  buttonStyles,
  checkboxStyles,
  cn,
  hintStyles,
  inputStyles,
  labelStyles,
  selectStyles,
  tableCls,
} from "@/components/admin/ui";
import { copyText, useToast } from "../ui/client";
import { borrowSave, borrowDelete } from "../actions/borrow";
import type { BorrowSettings } from "../lib/borrow";

type S = BorrowSettings;
export type HistRow = { id: string; ts: string; label: string; max_loan: number; case: number; data: Record<string, string> };

/* ---------- maths (verbatim) ---------- */
function tax(inc: number) {
  inc = Math.max(0, inc || 0);
  let t = 0;
  if (inc > 190000) t = 51638 + (inc - 190000) * 0.45;
  else if (inc > 135000) t = 31288 + (inc - 135000) * 0.37;
  else if (inc > 45000) t = 4288 + (inc - 45000) * 0.3;
  else if (inc > 18200) t = (inc - 18200) * 0.16;
  return t + inc * 0.02;
}
const netOf = (g: number) => Math.max(0, g - tax(g));
function grossFromNet(n: number) {
  let lo = 0,
    hi = 3000000;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (netOf(mid) < n) lo = mid;
    else hi = mid;
  }
  return hi;
}
function pmt(rate: number, yrs: number, p: number) {
  const r = rate / 100 / 12,
    n = yrs * 12;
  if (p <= 0 || n <= 0) return 0;
  if (!r) return p / n;
  return (p * r) / (1 - Math.pow(1 + r, -n));
}
function pv(rate: number, yrs: number, pay: number) {
  const r = rate / 100 / 12,
    n = yrs * 12;
  if (pay <= 0 || n <= 0) return 0;
  if (!r) return pay * n;
  return (pay * (1 - Math.pow(1 + r, -n))) / r;
}
const money = (n: number) => (isFinite(n) ? "$" + Math.round(n).toLocaleString("en-AU") : "—");
const money2 = (n: number) => (isFinite(n) ? "$" + n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—");
const floor5k = (n: number) => Math.max(0, Math.floor(n / 5000) * 5000);

const FIELDS = [
  "a1Name", "a1Gross", "a1Other", "a2Name", "a2Gross", "a2Other", "rentPw", "household", "dependants", "livingPm", "ccLimit", "otherPm", "helpPm",
  "otherCommit", "propLoans", "prodRate", "buffer", "floorRate", "termYears", "repayType", "state", "desired", "deposit", "targetLvr", "dutyAllow",
] as const;
type V = Record<string, string>;
const n = (v: V, k: string) => {
  const x = parseFloat(v[k]);
  return isFinite(x) ? x : 0;
};

function inputs(v: V, useHem: boolean) {
  return {
    a1Name: (v.a1Name || "").trim(),
    a2Name: (v.a2Name || "").trim(),
    a1Gross: n(v, "a1Gross"),
    a1Other: n(v, "a1Other"),
    a2Gross: n(v, "a2Gross"),
    a2Other: n(v, "a2Other"),
    rentPw: n(v, "rentPw"),
    household: v.household,
    dependants: n(v, "dependants"),
    livingPm: n(v, "livingPm"),
    ccLimit: n(v, "ccLimit"),
    otherPm: n(v, "otherPm"),
    helpPm: n(v, "helpPm"),
    otherCommit: n(v, "otherCommit"),
    propLoans: n(v, "propLoans"),
    useHem,
    prodRate: n(v, "prodRate"),
    buffer: n(v, "buffer"),
    floorRate: n(v, "floorRate"),
    termYears: n(v, "termYears") || 30,
    repayType: v.repayType,
    state: v.state,
    desired: n(v, "desired"),
    deposit: n(v, "deposit"),
    targetLvr: (n(v, "targetLvr") || 80) / 100,
    dutyAllow: n(v, "dutyAllow"),
  };
}
type I = ReturnType<typeof inputs>;

function compute(S: S, i: I, prodOverride?: number) {
  const prod = prodOverride != null ? prodOverride : i.prodRate;
  const assess = Math.max(prod + i.buffer, i.floorRate);
  const bs = (S.bonus_shade_pct || 80) / 100;
  const g1 = i.a1Gross + i.a1Other * bs,
    g2 = i.a2Gross + i.a2Other * bs,
    gross = g1 + g2;
  const netAnnual = netOf(g1) + netOf(g2);
  const rentPm = (i.rentPw * 52 * ((S.rent_shade_pct || 80) / 100)) / 12;
  const netPm = netAnnual / 12 + rentPm;
  const hem = +(S as unknown as Record<string, number>)["hem_" + i.household] || 0;
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
  return { prod, assess, gross, netAnnual, netPm, rentPm, hem, living, ccPm, propPm, commit, cap, io, assessTerm, maxLoan, dtiLoan, dti: gross ? (maxLoan + i.propLoans + i.ccLimit) / gross : 0, repM };
}

const fees = (S: S, i: I) => {
  const f = S.fees[i.state] || { transfer: 0, mortgage: 0 };
  return (+S.solicitor_fee || 0) + (+f.transfer || 0) + (+f.mortgage || 0);
};
const first = (nm: string) => (nm || "").split(" ")[0] || "there";

export default function BorrowCalc({
  S,
  prefill,
  caseId,
  caseName,
  caseHref,
  history: initialHistory,
  groups,
  isAdmin,
  tab: initialTab,
  settingsPane,
  banner,
}: {
  S: S;
  prefill: Record<string, string | number>;
  caseId: number;
  caseName?: string;
  caseHref?: string;
  history: HistRow[];
  groups: Record<string, string>;
  isAdmin: boolean;
  tab: string;
  settingsPane?: React.ReactNode;
  banner: boolean;
}) {
  const { show, node } = useToast();
  const [, start] = useTransition();
  const init: V = {
    prodRate: String(S.product_rate),
    buffer: String(S.buffer_percent),
    floorRate: String(S.floor_rate),
    termYears: String(S.term_years),
    household: "single",
    targetLvr: "80",
    repayType: "PI",
    state: Object.keys(S.fees)[0] ?? "NSW",
    dependants: "0",
  };
  for (const [k, val] of Object.entries(prefill)) if (val !== "" && val !== null && val !== undefined) init[k] = String(val);
  const [v, setV] = useState<V>(init);
  const [useHem, setUseHem] = useState(true);
  const [tab, setTab] = useState(initialTab);
  const [hist, setHist] = useState<HistRow[]>(initialHistory);
  const [need, setNeed] = useState(prefill.desired ? String(prefill.desired) : "");
  const [rp, setRp] = useState({ loan: "", rate: (+S.product_rate || 6).toFixed(2), term: "30" });
  const [eq, setEq] = useState({ value: "", loan: "", price: "", costs: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV((o) => ({ ...o, [k]: e.target.value }));

  const calc = useMemo(() => {
    const i = inputs(v, useHem);
    const r = compute(S, i);
    const names = i.a1Name && i.a2Name ? i.a1Name + " & " + i.a2Name : i.a1Name || i.a2Name || "the applicants";
    let price: number | null = null,
      loan = 0;
    if (i.deposit > 0 && r.gross) {
      const costs = i.dutyAllow + fees(S, i);
      const p1 = r.maxLoan + i.deposit - costs,
        p2 = i.targetLvr < 1 ? (i.deposit - costs) / (1 - i.targetLvr) : p1;
      price = Math.max(0, Math.min(p1, p2));
      loan = Math.max(0, price - (i.deposit - costs));
    }
    let desired: { need: number; spare: number } | null = null;
    if (i.desired > 0 && r.gross) {
      const nd = r.io ? pmt(r.assess, r.assessTerm, i.desired) : pmt(r.assess, i.termYears, i.desired);
      desired = { need: nd, spare: r.cap - nd };
    }
    const sens = [-0.5, 0, 0.5, 1].map((d) => ({ d, rate: i.prodRate + d, rr: compute(S, i, i.prodRate + d) }));
    return { i, r, names, price, loan, desired, sens };
  }, [v, useHem, S]);
  const { i, r, names } = calc;

  const flags: [string, string][] = [];
  if (r.gross && r.dti > (+S.dti_cap || 6)) flags.push(["bad", "Above " + (S.dti_cap || 6) + "× DTI — many lenders will cap this"]);
  if (i.useHem && r.hem > i.livingPm) flags.push(["warn", "Benchmark living costs used"]);
  if (r.io) flags.push(["info", "IO assessed as P&I over " + r.assessTerm + " yrs"]);
  if (i.propLoans) flags.push(["info", "Other property loans included"]);

  const hhLabel = groups[v.household] ?? v.household;
  function summaryText() {
    const L = [S.company + " – Borrowing capacity (indicative)", "", "Applicants: " + names, "Combined gross income: " + money(r.gross) + " p.a. (approx. " + money(r.netAnnual) + " after tax)"];
    if (i.rentPw) L.push("Rental income: " + money(i.rentPw) + " / week (" + (S.rent_shade_pct || 80) + "% counted)");
    L.push("Household: " + hhLabel + " · living costs used " + money(r.living) + " / month");
    if (i.ccLimit) L.push("Credit card limits: " + money(i.ccLimit));
    if (i.otherPm + i.helpPm + i.otherCommit) L.push("Other commitments: " + money(i.otherPm + i.helpPm + i.otherCommit) + " / month");
    if (i.propLoans) L.push("Other property loans: " + money(i.propLoans));
    L.push(
      "",
      "Assessment: " + r.assess.toFixed(2) + "% (product " + r.prod.toFixed(2) + "% + " + i.buffer + "% buffer, floor " + i.floorRate + "%), " + i.termYears + " yrs " + (r.io ? "interest only" : "P&I"),
      "Estimated borrowing capacity: " + money(r.maxLoan) + " (quote " + money(floor5k(r.maxLoan * 0.95)) + " – " + money(floor5k(r.maxLoan)) + ")",
      "Repayment at " + r.prod.toFixed(2) + "%: " + money(r.repM) + " / month",
    );
    if (calc.price != null) L.push("Indicative purchase price with " + money(i.deposit) + " deposit: " + money(calc.price));
    if (i.desired) L.push("Requested loan " + money(i.desired) + ": " + (calc.desired && calc.desired.spare >= 0 ? "looks serviceable" : "may be above capacity"));
    L.push("", "Indicative only. Lender policies differ; this is not an approval or financial advice.", S.broker_name + " · " + S.broker_mobile + " · " + S.broker_email);
    return L.join("\n");
  }
  const smsText = () =>
    "Hi " + first(i.a1Name) + ", based on the details so far your borrowing capacity is roughly " + money(floor5k(r.maxLoan * 0.95)) + " – " + money(floor5k(r.maxLoan)) +
    " (a guide only — it varies by lender). Happy to run through your options. " + S.broker_name + ", " + S.company + " " + S.broker_mobile;
  const emailText = () =>
    "Subject: Your borrowing capacity estimate\n\nHi " + first(i.a1Name) + (i.a2Name ? " & " + first(i.a2Name) : "") +
    ",\n\nThanks for the details. Based on what you've shared, here is a quick estimate:\n\n" +
    "• Estimated borrowing capacity: " + money(floor5k(r.maxLoan * 0.95)) + " – " + money(floor5k(r.maxLoan)) + "\n" +
    "• Estimated repayment at " + r.prod.toFixed(2) + "%: " + money(r.repM) + " per month\n" +
    "• Assessed at " + r.assess.toFixed(2) + "% over " + i.termYears + " years\n\n" +
    "Please note this is a general guide only. Every lender assesses income, expenses and debts differently, so the actual amount could be higher or lower once we run your full position through lender calculators.\n\n" +
    "The next step is to complete your Fact Find so I can confirm accurate figures and recommend the best lender for you.\n\nKind regards,\n" +
    S.broker_name + "\n" + S.company + " | " + S.broker_mobile + " | " + S.broker_email;
  function printIt() {
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
    const body = summaryText()
      .split("\n")
      .map((l) => (l ? "<p>" + esc(l) + "</p>" : "<br>"))
      .join("");
    const w = window.open("", "_blank");
    if (!w) return show("Allow pop-ups to print", true);
    w.document.write(
      "<html><head><title>Borrowing capacity</title><style>body{font-family:Segoe UI,Arial,sans-serif;max-width:720px;margin:40px auto;color:#0f172a}p{margin:5px 0;line-height:1.5}img{max-height:50px;margin-bottom:12px}.big{font-size:30px;font-weight:800;color:#987633;margin:14px 0}</style></head><body>" +
        (S.logo ? '<img src="' + esc(S.logo) + '">' : "") + '<div class="big">' + money(r.maxLoan) + "</div>" + body + "</body></html>",
    );
    w.document.close();
    setTimeout(() => w.print(), 400);
  }
  const save = () =>
    start(async () => {
      const d: Record<string, string> = {};
      FIELDS.forEach((k) => (d[k] = v[k] ?? ""));
      const res = await borrowSave(caseId, names, Math.round(r.maxLoan), summaryText(), d);
      if (res.ok) {
        setHist((h) => [{ id: res.id, ts: new Date().toISOString().slice(0, 16).replace("T", " "), label: names, max_loan: Math.round(r.maxLoan), data: d, case: caseId }, ...h]);
        show("Saved");
      } else show("Could not save", true);
    });

  /* ---------- sub-tabs ---------- */
  const needOut = (() => {
    const L = parseFloat(need) || 0;
    if (!L) return <EmptyState icon={<TrendingUp />} title="Enter a loan amount." description="We’ll work out the gross income needed to service it." />;
    const rep = r.io ? pmt(r.assess, r.assessTerm, L) : pmt(r.assess, i.termYears, L);
    const needNetPm = r.commit + rep - r.rentPm,
      needNetAnnual = Math.max(0, needNetPm * 12);
    const one = grossFromNet(needNetAnnual),
      each = grossFromNet(needNetAnnual / 2);
    const have = i.a1Gross + i.a2Gross;
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Box t="One applicant needs" b={money(one)} s="gross p.a." accent />
          <Box t="Two applicants, equal split" b={money(each) + " each"} s={money(each * 2) + " combined"} />
          <Box t="Repayment at assessment rate" b={money(rep)} s={"per month on " + money(L)} />
        </div>
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            have
              ? have >= one
                ? "border-emerald-200 bg-emerald-50/70 text-emerald-900"
                : "border-amber-200 bg-amber-50/70 text-amber-900"
              : "border-slate-200 bg-white text-slate-600",
          )}
        >
          Based on commitments of {money(r.commit)}/month and assessed at {r.assess.toFixed(2)}%.
          {have ? (
            <>
              {" "}
              Current gross entered: <b>{money(have)}</b> —{" "}
              {have >= one ? (
                "enough on these assumptions."
              ) : (
                <>
                  short by about <b>{money(one - have)}</b>.
                </>
              )}
            </>
          ) : null}
        </div>
      </div>
    );
  })();

  const rpRows = (() => {
    const L = parseFloat(rp.loan) || 0,
      rate = parseFloat(rp.rate) || 0,
      yrs = parseFloat(rp.term) || 30;
    if (!(L > 0 && rate > 0)) return null;
    const rows: { label: string; m: number; interest: number | null }[] = [];
    const pi = pmt(rate, yrs, L);
    rows.push({
      label: "P&I over " + yrs + " yrs",
      m: pi,
      interest: pi * yrs * 12 - L,
    });
    [25, 30].forEach((y) => {
      if (y !== yrs) {
        const p = pmt(rate, y, L);
        rows.push({
          label: "P&I over " + y + " yrs",
          m: p,
          interest: p * y * 12 - L,
        });
      }
    });
    rows.push({ label: "Interest only", m: (L * rate) / 1200, interest: null });
    const up = pmt(rate + 0.5, yrs, L);
    rows.push({
      label: "P&I at " + (rate + 0.5).toFixed(2) + "% (+0.5)",
      m: up,
      interest: up * yrs * 12 - L,
    });
    return rows;
  })();

  const tabs: [string, string][] = [
    ["capacity", "Borrowing capacity"],
    ["income", "Income needed"],
    ["repay", "Repayments"],
    ["equity", "Equity & deposit"],
    ["history", "Saved"],
    ...(isAdmin ? ([["settings", "Assumptions"]] as [string, string][]) : []),
  ];

  const F = ({
    id,
    label,
    type = "number",
    hint,
    prefix,
    suffix,
    ...rest
  }: {
    id: string;
    label: string;
    type?: string;
    hint?: string;
    prefix?: string;
    suffix?: string;
  } & React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label htmlFor={id} className={labelStyles}>
        {label}
      </label>
      <Affix prefix={prefix} suffix={suffix}>
        <input
          id={id}
          type={type}
          className={cn(inputStyles, type === "number" && "tabular-nums", prefix && "pl-7", suffix && "pr-11")}
          value={v[id] ?? ""}
          onChange={set(id)}
          {...rest}
        />
      </Affix>
      {hint && <p className={hintStyles}>{hint}</p>}
    </div>
  );

  const capRange = r.gross ? money(floor5k(r.maxLoan * 0.95)) + " – " + money(floor5k(r.maxLoan)) : "";

  return (
    <div>
      <PageHeader
        icon={<Calculator />}
        title="Borrowing capacity"
        description="Quick, indicative numbers to give clients while you’re on the phone. Lender policies differ — treat as a guide, not an assessment."
        actions={
          caseId > 0 ? (
            <div className="flex max-w-full items-center gap-2 rounded-lg border border-slate-200 bg-white py-1 pr-1 pl-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <Briefcase className="size-4 shrink-0 text-slate-400" />
              <span className="text-xs text-slate-500">Case</span>
              <strong className="min-w-0 truncate text-sm font-semibold text-slate-900 sm:max-w-[260px]">{caseName}</strong>
              {caseHref && (
                <LinkButton size="xs" variant="secondary" href={caseHref}>
                  <ExternalLink />
                  Open
                </LinkButton>
              )}
              <LinkButton size="xs" variant="ghost" href="/admin/borrowing">
                <X />
                Clear
              </LinkButton>
            </div>
          ) : undefined
        }
      />
      {banner && (
        <Alert tone="warning" className="mb-5">
          Pre-filled from this client’s Fact Find — please check the figures before you quote them.
        </Alert>
      )}
      <nav role="tablist" className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map(([k, l]) => {
          const Icon = TAB_ICON[k];
          const on = tab === k;
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setTab(k)}
              className={cn(
                "-mb-px inline-flex cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                on ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
              )}
            >
              {Icon && <Icon className="size-4" />}
              {l}
              {k === "history" && hist.length > 0 && (
                <span
                  className={cn("rounded-full px-1.5 py-0.5 text-[11px] font-semibold", on ? "bg-brand-100 text-brand-800" : "bg-slate-100 text-slate-600")}
                >
                  {hist.length}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {tab === "capacity" && (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 space-y-6">
            <Card
              title={<CardTitle icon={<Users />}>Applicants &amp; income</CardTitle>}
              description="Tax is calculated for each applicant separately (2024-25 resident rates + 2% Medicare)."
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {F({
                  id: "a1Name",
                  label: "Applicant 1",
                  type: "text",
                  placeholder: "Name",
                })}
                {F({
                  id: "a1Gross",
                  label: "Gross salary p.a.",
                  min: 0,
                  step: 1000,
                  placeholder: "e.g. 95000",
                  prefix: "$",
                })}
                {F({
                  id: "a1Other",
                  label: "Bonus / overtime p.a.",
                  min: 0,
                  step: 500,
                  placeholder: "2-yr average",
                  hint: `Shaded to ${Math.round(S.bonus_shade_pct)}%`,
                  prefix: "$",
                })}
              </div>
              <div className="mt-4 grid gap-4 border-t border-dashed border-slate-200 pt-4 sm:grid-cols-2 lg:grid-cols-3">
                {F({
                  id: "a2Name",
                  label: "Applicant 2",
                  type: "text",
                  placeholder: "Optional",
                })}
                {F({
                  id: "a2Gross",
                  label: "Gross salary p.a.",
                  min: 0,
                  step: 1000,
                  prefix: "$",
                })}
                {F({
                  id: "a2Other",
                  label: "Bonus / overtime p.a.",
                  min: 0,
                  step: 500,
                  prefix: "$",
                })}
              </div>
              <div className="mt-4 grid gap-4 border-t border-dashed border-slate-200 pt-4 sm:grid-cols-2 lg:grid-cols-3">
                {F({
                  id: "rentPw",
                  label: "Rental income (per week)",
                  min: 0,
                  step: 10,
                  hint: `Shaded to ${Math.round(S.rent_shade_pct)}% for servicing`,
                  prefix: "$",
                })}
              </div>
            </Card>
            <Card title={<CardTitle icon={<Home />}>Household &amp; commitments</CardTitle>}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelStyles} htmlFor="household">
                    Household
                  </label>
                  <select id="household" className={selectStyles} value={v.household} onChange={set("household")}>
                    {Object.entries(groups).map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                {F({ id: "dependants", label: "Dependants", min: 0 })}
                {F({
                  id: "livingPm",
                  label: "Declared living costs / month",
                  min: 0,
                  step: 50,
                  hint: "Lenders use the higher of this and their benchmark",
                  prefix: "$",
                })}
                {F({
                  id: "ccLimit",
                  label: "Credit card limits (total)",
                  min: 0,
                  step: 500,
                  hint: `Assessed at ${S.cc_assess_pct}% of limit / month`,
                  prefix: "$",
                })}
                {F({
                  id: "otherPm",
                  label: "Other loan repayments / month",
                  min: 0,
                  step: 10,
                  prefix: "$",
                })}
                {F({
                  id: "helpPm",
                  label: "HECS / HELP repayment / month",
                  min: 0,
                  step: 10,
                  prefix: "$",
                })}
                {F({
                  id: "otherCommit",
                  label: "Child support / other / month",
                  min: 0,
                  step: 10,
                  prefix: "$",
                })}
                {F({
                  id: "propLoans",
                  label: "Other property loans (balance)",
                  min: 0,
                  step: 1000,
                  hint: "Assessed at the assessment rate, P&I over 30 yrs",
                  prefix: "$",
                })}
              </div>
              <label className="mt-5 flex cursor-pointer items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm text-slate-700">
                <input type="checkbox" className={checkboxStyles} checked={useHem} onChange={(e) => setUseHem(e.target.checked)} /> Use the benchmark
                (HEM-style) floor for living costs
              </label>
            </Card>
            <Card title={<CardTitle icon={<Landmark />}>Loan &amp; assessment</CardTitle>}>
              <div className="grid gap-4 sm:grid-cols-2">
                {F({
                  id: "prodRate",
                  label: "Product rate % p.a.",
                  step: 0.01,
                  suffix: "%",
                })}
                {F({
                  id: "buffer",
                  label: "Serviceability buffer +%",
                  step: 0.1,
                  suffix: "%",
                })}
                {F({
                  id: "floorRate",
                  label: "Assessment floor % p.a.",
                  step: 0.1,
                  suffix: "%",
                })}
                {F({
                  id: "termYears",
                  label: "Loan term (years)",
                  min: 1,
                  max: 40,
                  suffix: "yrs",
                })}
                <div>
                  <label className={labelStyles} htmlFor="repayType">
                    Repayments
                  </label>
                  <select id="repayType" className={selectStyles} value={v.repayType} onChange={set("repayType")}>
                    <option value="PI">Principal &amp; interest</option>
                    <option value="IO">Interest only ({Math.round(S.io_years)} yrs)</option>
                  </select>
                </div>
                <div>
                  <label className={labelStyles} htmlFor="state">
                    State
                  </label>
                  <select id="state" className={selectStyles} value={v.state} onChange={set("state")}>
                    {Object.keys(S.fees).map((st) => (
                      <option key={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 grid gap-4 border-t border-dashed border-slate-200 pt-4 sm:grid-cols-2">
                {F({
                  id: "desired",
                  label: "Loan the client wants (optional)",
                  min: 0,
                  step: 5000,
                  hint: "Checks serviceability & the income needed",
                  prefix: "$",
                })}
                {F({
                  id: "deposit",
                  label: "Deposit / savings (optional)",
                  min: 0,
                  step: 5000,
                  prefix: "$",
                })}
                {F({
                  id: "targetLvr",
                  label: "Target LVR %",
                  min: 50,
                  max: 97,
                  suffix: "%",
                })}
                {F({
                  id: "dutyAllow",
                  label: "Stamp duty & other costs (optional)",
                  min: 0,
                  step: 1000,
                  hint: "Enter from the state duty calculator",
                  prefix: "$",
                })}
              </div>
            </Card>
            {r.gross > 0 && (
              <a
                href="#bc-results"
                className="sticky bottom-3 z-20 flex items-center justify-between gap-3 rounded-xl bg-ink-900 px-4 py-3 text-white shadow-2xl ring-1 ring-black/10 xl:hidden"
              >
                <span className="text-xs text-slate-300">Estimated capacity</span>
                <span className="flex items-center gap-2 text-lg font-semibold tabular-nums">
                  {money(r.maxLoan)}
                  <ChevronDown className="size-4 text-slate-400" />
                </span>
              </a>
            )}
          </div>
          <aside className="min-w-0 space-y-4 xl:sticky xl:top-20">
            <section
              id="bc-results"
              className="scroll-mt-20 overflow-hidden rounded-xl border border-brand-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              <div className="bg-gradient-to-br from-brand-50 via-brand-50/40 to-white px-5 pt-5 pb-4">
                <p className="flex items-center gap-1.5 text-[13px] font-medium text-slate-600">
                  <Wallet className="size-4 text-brand-600" />
                  Estimated borrowing capacity
                </p>
                <p className="mt-2 text-[42px] leading-none font-semibold tracking-tight text-slate-900 tabular-nums">{r.gross ? money(r.maxLoan) : "—"}</p>
                {capRange && (
                  <p className="mt-2 text-sm text-slate-600">
                    Quote range <span className="font-semibold text-slate-900 tabular-nums">{capRange}</span>
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  {r.gross
                    ? "For " + names + " · " + (r.io ? "IO " : "P&I ") + i.termYears + " yrs · assessed at " + r.assess.toFixed(2) + "%"
                    : "Enter income to begin"}
                </p>
                {flags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {flags.map(([k, t]) => (
                      <Badge key={t} dot tone={k === "bad" ? "danger" : k === "warn" ? "warning" : "info"}>
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="divide-y divide-slate-100 border-t border-slate-100 px-5 text-sm">
                <div className="space-y-2 py-3.5">
                  <KV k="Assessment rate" v={r.assess.toFixed(2) + "% p.a."} />
                  <KV k="Net income / month (after tax)" v={money(r.netPm)} />
                  <KV k="Commitments / month" v={money(r.commit)} />
                  <KV k="Spare capacity / month" v={money(r.cap)} />
                  <KV k="Living costs used" v={money(r.living) + (i.useHem && r.hem > i.livingPm ? " (benchmark)" : "")} />
                </div>
                <div className="space-y-2 py-3.5">
                  <KV k="Repayment @ product rate" v={money(r.repM) + " / month"} />
                  <KV sm k="Fortnightly / weekly" v={money((r.repM * 12) / 26) + " / " + money((r.repM * 12) / 52)} />
                  <KV k="Debt-to-income at max" v={r.gross ? r.dti.toFixed(1) + "×" : "—"} />
                  <KV sm k={`Capped at ${S.dti_cap}× DTI`} v={r.gross ? money(Math.min(r.maxLoan, r.dtiLoan)) : "—"} />
                </div>
                {calc.price != null && (
                  <div className="space-y-2 py-3.5">
                    <KV k="Indicative max purchase price" v={money(calc.price)} />
                    <KV
                      sm
                      k="Loan / LVR at that price"
                      v={
                        money(calc.loan) +
                        " · " +
                        (calc.price ? ((calc.loan / calc.price) * 100).toFixed(1) : 0) +
                        "%" +
                        (calc.price && calc.loan / calc.price > 0.8 ? " (LMI likely)" : "")
                      }
                    />
                  </div>
                )}
                {calc.desired && (
                  <div className="space-y-2 py-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                      <span className="text-slate-600">
                        For <b className="text-slate-900 tabular-nums">{money(i.desired)}</b>
                      </span>
                      {calc.desired.spare >= 0 ? (
                        <Badge tone="success">
                          <CircleCheck className="size-3.5" />
                          Looks serviceable (+{money(calc.desired.spare)}/mth)
                        </Badge>
                      ) : (
                        <Badge tone="danger">
                          <CircleAlert className="size-3.5" />
                          Short {money(-calc.desired.spare)}/mth
                        </Badge>
                      )}
                    </div>
                    <KV sm k="Repayment at assessment rate" v={money(calc.desired.need) + " / month"} />
                  </div>
                )}
              </div>
            </section>

            <div className="grid grid-cols-2 gap-2">
              <button
                className={buttonStyles({
                  variant: "primary",
                  className: "col-span-2",
                })}
                onClick={() => copyText(summaryText()).then(() => show("Summary copied"))}
              >
                <Copy />
                Copy summary
              </button>
              <button className={buttonStyles({ variant: "secondary" })} onClick={() => copyText(smsText()).then(() => show("SMS text copied"))}>
                <MessageSquare />
                Copy SMS
              </button>
              <button className={buttonStyles({ variant: "secondary" })} onClick={() => copyText(emailText()).then(() => show("Email copied"))}>
                <Mail />
                Copy email
              </button>
              <button className={buttonStyles({ variant: "secondary" })} onClick={printIt}>
                <Printer />
                Print / PDF
              </button>
              <button className={buttonStyles({ variant: "secondary" })} onClick={save}>
                <Save />
                Save{caseId ? " to case" : ""}
              </button>
            </div>

            <Card title="If rates move (product rate)" padded={false}>
              <table className={tableCls.table}>
                <thead className={tableCls.thead}>
                  <tr>
                    <th className={tableCls.th}>Rate</th>
                    <th className={tableCls.th}>Assessed at</th>
                    <th className={cn(tableCls.th, "text-right")}>Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {calc.sens.map((s) => (
                    <tr key={s.d} className={cn(tableCls.tr, s.d === 0 && "bg-brand-50/60 font-semibold text-slate-900")}>
                      <td className={cn(tableCls.td, "tabular-nums")}>
                        {s.rate.toFixed(2)}%{s.d === 0 && <span className="ml-1.5 text-[11px] font-medium text-brand-700">current</span>}
                      </td>
                      <td className={cn(tableCls.td, "tabular-nums")}>{s.rr.assess.toFixed(2)}%</td>
                      <td className={cn(tableCls.td, "text-right tabular-nums")}>{money(s.rr.maxLoan)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </aside>
        </div>
      )}

      {tab === "income" && (
        <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <Card
            title="What income does the client need?"
            description={
              <>
                Uses the household, commitments and loan settings from the <em>Borrowing capacity</em> tab.
              </>
            }
          >
            <label className={labelStyles} htmlFor="bc-need">
              Loan required
            </label>
            <Affix prefix="$">
              <input
                id="bc-need"
                type="number"
                min={0}
                step={5000}
                placeholder="e.g. 750000"
                className={cn(inputStyles, "pl-7 tabular-nums")}
                value={need}
                onChange={(e) => setNeed(e.target.value)}
              />
            </Affix>
          </Card>
          <div className="min-w-0">{needOut}</div>
        </div>
      )}

      {tab === "repay" && (
        <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <Card title="Repayment calculator" description="Compare P&I terms, interest only and a +0.5% rate rise.">
            <div className="space-y-4">
              <div>
                <label className={labelStyles} htmlFor="bc-rp-loan">
                  Loan amount
                </label>
                <Affix prefix="$">
                  <input
                    id="bc-rp-loan"
                    type="number"
                    min={0}
                    step={5000}
                    className={cn(inputStyles, "pl-7 tabular-nums")}
                    value={rp.loan}
                    onChange={(e) => setRp({ ...rp, loan: e.target.value })}
                  />
                </Affix>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelStyles} htmlFor="bc-rp-rate">
                    Interest rate % p.a.
                  </label>
                  <Affix suffix="%">
                    <input
                      id="bc-rp-rate"
                      type="number"
                      step={0.01}
                      className={cn(inputStyles, "pr-11 tabular-nums")}
                      value={rp.rate}
                      onChange={(e) => setRp({ ...rp, rate: e.target.value })}
                    />
                  </Affix>
                </div>
                <div>
                  <label className={labelStyles} htmlFor="bc-rp-term">
                    Term (years)
                  </label>
                  <Affix suffix="yrs">
                    <input
                      id="bc-rp-term"
                      type="number"
                      min={1}
                      max={40}
                      className={cn(inputStyles, "pr-11 tabular-nums")}
                      value={rp.term}
                      onChange={(e) => setRp({ ...rp, term: e.target.value })}
                    />
                  </Affix>
                </div>
              </div>
            </div>
          </Card>
          <div className="min-w-0 space-y-4">
            {rpRows ? (
              <div className="grid gap-4 sm:grid-cols-3">
                <Box t="Monthly" b={money2(rpRows[0].m)} s={rpRows[0].label} accent />
                <Box t="Fortnightly" b={money2((rpRows[0].m * 12) / 26)} s="monthly × 12 ÷ 26" />
                <Box t="Weekly" b={money2((rpRows[0].m * 12) / 52)} s="monthly × 12 ÷ 52" />
              </div>
            ) : null}
            <Card
              title="Compare repayments"
              padded={false}
              footer={
                <p className="text-xs text-slate-500">
                  Fortnightly = monthly × 12 ÷ 26, weekly = monthly × 12 ÷ 52. Paying half the monthly amount fortnightly gives roughly one extra monthly
                  repayment a year.
                </p>
              }
            >
              <div className="overflow-x-auto">
                <table className={tableCls.table}>
                  <thead className={tableCls.thead}>
                    <tr>
                      {["", "Monthly", "Fortnightly", "Weekly", "Total interest"].map((h, j) => (
                        <th key={h} className={cn(tableCls.th, j > 0 && "text-right")}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rpRows ? (
                      rpRows.map((x, j) => (
                        <tr key={x.label} className={cn(tableCls.tr, j === 0 && "bg-brand-50/50")}>
                          <td className={cn(tableCls.td, "font-medium whitespace-nowrap text-slate-900")}>{x.label}</td>
                          <td className={cn(tableCls.td, "text-right tabular-nums")}>{money2(x.m)}</td>
                          <td className={cn(tableCls.td, "text-right tabular-nums")}>{money2((x.m * 12) / 26)}</td>
                          <td className={cn(tableCls.td, "text-right tabular-nums")}>{money2((x.m * 12) / 52)}</td>
                          <td className={cn(tableCls.td, "text-right tabular-nums")}>{x.interest == null ? "—" : money(x.interest)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className={cn(tableCls.td, "py-10 text-center text-slate-500")}>
                          Enter a loan and rate.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "equity" && (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card
            title={<CardTitle icon={<PiggyBank />}>Usable equity</CardTitle>}
            padded={false}
            footer={<p className="text-xs text-slate-500">Lenders above 80% LVR usually charge LMI and tighten policy — equity above 80% is rarely “free”.</p>}
          >
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div>
                <label className={labelStyles} htmlFor="bc-eq-value">
                  Property value
                </label>
                <Affix prefix="$">
                  <input
                    id="bc-eq-value"
                    type="number"
                    min={0}
                    step={10000}
                    className={cn(inputStyles, "pl-7 tabular-nums")}
                    value={eq.value}
                    onChange={(e) => setEq({ ...eq, value: e.target.value })}
                  />
                </Affix>
              </div>
              <div>
                <label className={labelStyles} htmlFor="bc-eq-loan">
                  Current loan balance
                </label>
                <Affix prefix="$">
                  <input
                    id="bc-eq-loan"
                    type="number"
                    min={0}
                    step={5000}
                    className={cn(inputStyles, "pl-7 tabular-nums")}
                    value={eq.loan}
                    onChange={(e) => setEq({ ...eq, loan: e.target.value })}
                  />
                </Affix>
              </div>
            </div>
            <div className="overflow-x-auto border-t border-slate-100">
              <table className={tableCls.table}>
                <thead className={tableCls.thead}>
                  <tr>
                    <th className={tableCls.th}>LVR</th>
                    <th className={cn(tableCls.th, "text-right")}>Max loan</th>
                    <th className={cn(tableCls.th, "text-right")}>Usable equity</th>
                  </tr>
                </thead>
                <tbody>
                  {(parseFloat(eq.value) || 0) > 0 ? (
                    [70, 80, 90, 95].map((l) => {
                      const m = ((parseFloat(eq.value) || 0) * l) / 100,
                        u = m - (parseFloat(eq.loan) || 0);
                      return (
                        <tr key={l} className={cn(tableCls.tr, l === 80 && "bg-slate-50/80")}>
                          <td className={cn(tableCls.td, "font-medium text-slate-900")}>{l}%</td>
                          <td className={cn(tableCls.td, "text-right tabular-nums")}>{money(m)}</td>
                          <td className={cn(tableCls.td, "text-right font-semibold tabular-nums", u >= 0 ? "text-emerald-700" : "text-red-700")}>{money(u)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={3} className={cn(tableCls.td, "py-8 text-center text-slate-500")}>
                        Enter the property value.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
          <Card title={<CardTitle icon={<Home />}>Deposit needed</CardTitle>} padded={false}>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div>
                <label className={labelStyles} htmlFor="bc-eq-price">
                  Purchase price
                </label>
                <Affix prefix="$">
                  <input
                    id="bc-eq-price"
                    type="number"
                    min={0}
                    step={10000}
                    className={cn(inputStyles, "pl-7 tabular-nums")}
                    value={eq.price}
                    onChange={(e) => setEq({ ...eq, price: e.target.value })}
                  />
                </Affix>
              </div>
              <div>
                <label className={labelStyles} htmlFor="bc-eq-costs">
                  Stamp duty &amp; costs
                </label>
                <Affix prefix="$">
                  <input
                    id="bc-eq-costs"
                    type="number"
                    min={0}
                    step={1000}
                    className={cn(inputStyles, "pl-7 tabular-nums")}
                    value={eq.costs}
                    onChange={(e) => setEq({ ...eq, costs: e.target.value })}
                  />
                </Affix>
              </div>
            </div>
            <div className="overflow-x-auto border-t border-slate-100">
              <table className={tableCls.table}>
                <thead className={tableCls.thead}>
                  <tr>
                    {["LVR", "Loan", "Deposit", "Deposit + costs"].map((h, j) => (
                      <th key={h} className={cn(tableCls.th, j > 0 && "text-right")}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(parseFloat(eq.price) || 0) > 0 ? (
                    [95, 90, 85, 80, 70].map((l) => {
                      const P = parseFloat(eq.price) || 0,
                        loan = (P * l) / 100,
                        dep = P - loan;
                      return (
                        <tr key={l} className={cn(tableCls.tr, l === 80 && "bg-slate-50/80")}>
                          <td className={cn(tableCls.td, "font-medium text-slate-900")}>{l}%</td>
                          <td className={cn(tableCls.td, "text-right tabular-nums")}>{money(loan)}</td>
                          <td className={cn(tableCls.td, "text-right tabular-nums")}>{money(dep)}</td>
                          <td className={cn(tableCls.td, "text-right font-semibold tabular-nums text-slate-900")}>
                            {money(dep + (parseFloat(eq.costs) || 0))}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className={cn(tableCls.td, "py-8 text-center text-slate-500")}>
                        Enter a purchase price.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === "history" &&
        (hist.length === 0 ? (
          <EmptyState
            icon={<Bookmark />}
            title="Nothing saved yet"
            description={
              <>
                Use <b>Save</b> on the capacity tab.
              </>
            }
          />
        ) : (
          <Card title="Saved calculations" description={`${hist.length} saved`} padded={false}>
            <div className="overflow-x-auto">
              <table className={tableCls.table}>
                <thead className={tableCls.thead}>
                  <tr>
                    <th className={tableCls.th}>When</th>
                    <th className={tableCls.th}>Client</th>
                    <th className={cn(tableCls.th, "text-right")}>Capacity</th>
                    <th className={tableCls.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {hist.map((h, idx) => (
                    <tr key={h.id} className={tableCls.tr}>
                      <td className={cn(tableCls.td, "whitespace-nowrap text-slate-500 tabular-nums")}>{h.ts}</td>
                      <td className={tableCls.td}>
                        <span className="font-medium text-slate-900">{h.label || "—"}</span>{" "}
                        {h.case ? (
                          <Link className="ml-1 text-xs font-medium text-brand-700 hover:underline" href={`/admin/cases/${h.case}`}>
                            case
                          </Link>
                        ) : null}
                      </td>
                      <td className={cn(tableCls.td, "text-right font-semibold whitespace-nowrap text-slate-900 tabular-nums")}>{money(h.max_loan)}</td>
                      <td className={cn(tableCls.td, "text-right whitespace-nowrap")}>
                        <span className="inline-flex gap-1.5">
                          <button
                            className={buttonStyles({
                              variant: "secondary",
                              size: "xs",
                            })}
                            onClick={() => {
                              setV((o) => ({ ...o, ...h.data }));
                              setTab("capacity");
                              show("Loaded");
                            }}
                          >
                            <RotateCcw />
                            Load
                          </button>
                          <button
                            className={buttonStyles({
                              variant: "danger",
                              size: "xs",
                            })}
                            onClick={async () => {
                              await borrowDelete(h.id);
                              setHist((x) => x.filter((_, j) => j !== idx));
                            }}
                          >
                            <Trash2 />
                            Delete
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}

      {tab === "settings" && isAdmin && settingsPane}
      {node}
    </div>
  );
}

const TAB_ICON: Record<string, LucideIcon> = {
  capacity: Wallet,
  income: TrendingUp,
  repay: Repeat,
  equity: PiggyBank,
  history: Bookmark,
  settings: SlidersHorizontal,
};

function CardTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex size-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100 [&_svg]:size-4">{icon}</span>
      {children}
    </span>
  );
}

function Affix({ prefix, suffix, children }: { prefix?: string; suffix?: string; children: React.ReactNode }) {
  if (!prefix && !suffix) return <>{children}</>;
  return (
    <div className="relative">
      {prefix && <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-slate-400">{prefix}</span>}
      {children}
      {suffix && <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs font-medium text-slate-400">{suffix}</span>}
    </div>
  );
}

function KV({ k, v, sm }: { k: string; v: string; sm?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3", sm ? "-mt-1 text-xs text-slate-500" : "text-slate-600")}>
      <span>{k}</span>
      <span className={cn("text-right tabular-nums", sm ? "font-medium" : "font-semibold text-slate-900")}>{v}</span>
    </div>
  );
}
function Box({ t, b, s, accent }: { t: string; b: string; s: string; accent?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        accent ? "border-brand-200 bg-gradient-to-br from-brand-50/80 to-white" : "border-slate-200/80",
      )}
    >
      <span className="block text-[13px] font-medium text-slate-500">{t}</span>
      <b className="mt-1.5 block text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{b}</b>
      <small className="mt-1 block text-xs text-slate-500">{s}</small>
    </div>
  );
}
