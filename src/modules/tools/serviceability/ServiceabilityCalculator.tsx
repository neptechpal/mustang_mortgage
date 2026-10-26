"use client";

import { useMemo, useState } from "react";
import { compute, fees, floor5k, grossFromNet, GROUPS, money, money2, pmt, type BorrowAssumptions, type BorrowInputs } from "./math";

type Tab = "capacity" | "income" | "repay" | "equity";
const TABS: [Tab, string][] = [
  ["capacity", "Borrowing capacity"],
  ["income", "Income needed"],
  ["repay", "Repayments"],
  ["equity", "Equity & deposit"],
];

const card = "rounded-[14px] border border-[#e5e7eb] bg-white px-[18px] py-4 mb-3";
const h3 = "mb-3 text-[15px] font-bold text-[#0f172a]";
const lbl = "mb-1 block text-[11.5px] font-bold uppercase tracking-[.04em] text-[#475569]";
const inp = "w-full rounded-[9px] border border-[#cbd5e1] bg-white px-3 py-2 text-[14px] text-[#0f172a] outline-none focus:border-[#987633] focus:ring-2 focus:ring-[#987633]/20";
const small = "mt-1 block text-[11.5px] text-[#64748b]";
const kv = "flex justify-between gap-3 py-[5px] text-[13.5px]";
const th = "border-b border-[#e5e7eb] px-2 py-1.5 text-left text-[11px] font-semibold uppercase tracking-[.05em] text-[#64748b]";
const td = "border-b border-[#f1f5f9] px-2 py-[7px]";

type V = Record<string, string>;

function F({ id, label, v, set, type = "number", hint, ...rest }: { id: string; label: string; v: V; set: (k: string, x: string) => void; type?: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="mb-[11px]">
      <label htmlFor={`mmb-${id}`} className={lbl}>
        {label}
      </label>
      <input id={`mmb-${id}`} type={type} value={v[id] ?? ""} onChange={(e) => set(id, e.target.value)} className={inp} {...rest} />
      {hint && <small className={small}>{hint}</small>}
    </div>
  );
}

export default function ServiceabilityCalculator({ S, company = "Mustang Mortgage" }: { S: BorrowAssumptions; company?: string }) {
  const [tab, setTab] = useState<Tab>("capacity");
  const [v, setV] = useState<V>({
    prodRate: String(S.product_rate),
    buffer: String(S.buffer_percent),
    floorRate: String(S.floor_rate),
    termYears: String(S.term_years),
    household: "single",
    dependants: "0",
    targetLvr: "80",
    repayType: "PI",
    state: Object.keys(S.fees)[0] ?? "NSW",
    rpRate: (+S.product_rate || 6).toFixed(2),
    rpTerm: "30",
  });
  const [useHem, setUseHem] = useState(true);
  const [copied, setCopied] = useState(false);
  const set = (k: string, x: string) => setV((o) => ({ ...o, [k]: x }));
  const n = (k: string) => {
    const x = parseFloat(v[k] ?? "");
    return isFinite(x) ? x : 0;
  };

  const i: BorrowInputs = {
    a1Name: (v.a1Name ?? "").trim(),
    a2Name: (v.a2Name ?? "").trim(),
    a1Gross: n("a1Gross"),
    a1Other: n("a1Other"),
    a2Gross: n("a2Gross"),
    a2Other: n("a2Other"),
    rentPw: n("rentPw"),
    household: v.household,
    dependants: n("dependants"),
    livingPm: n("livingPm"),
    ccLimit: n("ccLimit"),
    otherPm: n("otherPm"),
    helpPm: n("helpPm"),
    otherCommit: n("otherCommit"),
    propLoans: n("propLoans"),
    useHem,
    prodRate: n("prodRate"),
    buffer: n("buffer"),
    floorRate: n("floorRate"),
    termYears: n("termYears") || 30,
    repayType: v.repayType === "IO" ? "IO" : "PI",
    state: v.state,
    desired: n("desired"),
    deposit: n("deposit"),
    targetLvr: (n("targetLvr") || 80) / 100,
    dutyAllow: n("dutyAllow"),
  };
  const r = compute(S, i);
  const names = i.a1Name && i.a2Name ? `${i.a1Name} & ${i.a2Name}` : i.a1Name || i.a2Name || "the applicants";
  const dtiCap = +S.dti_cap || 6;

  const flags: [string, string][] = [];
  if (r.gross && r.dti > dtiCap) flags.push(["bad", `Above ${dtiCap}× DTI — many lenders will cap this`]);
  if (i.useHem && r.hem > i.livingPm) flags.push(["warn", "Benchmark living costs used"]);
  if (r.io) flags.push(["info", `IO assessed as P&I over ${r.assessTerm} yrs`]);
  if (i.propLoans) flags.push(["info", "Other property loans included"]);

  // purchase price
  const costs = i.dutyAllow + fees(S, i.state);
  let price: number | null = null,
    loanAtPrice = 0;
  if (i.deposit > 0 && r.gross) {
    const p1 = r.maxLoan + i.deposit - costs,
      p2 = i.targetLvr < 1 ? (i.deposit - costs) / (1 - i.targetLvr) : p1;
    price = Math.max(0, Math.min(p1, p2));
    loanAtPrice = Math.max(0, price - (i.deposit - costs));
  }
  // desired loan
  let desired: { need: number; spare: number } | null = null;
  if (i.desired > 0 && r.gross) {
    const need = r.io ? pmt(r.assess, r.assessTerm, i.desired) : pmt(r.assess, i.termYears, i.desired);
    desired = { need, spare: r.cap - need };
  }
  const sens = [-0.5, 0, 0.5, 1].map((d) => ({ d, rr: compute(S, i, i.prodRate + d) }));

  // income needed
  const L = n("needLoan");
  const need = useMemo(() => {
    if (!L) return null;
    const rep = r.io ? pmt(r.assess, r.assessTerm, L) : pmt(r.assess, i.termYears, L);
    const needNetPm = r.commit + rep - r.rentPm,
      needNetAnnual = Math.max(0, needNetPm * 12);
    return { rep, one: grossFromNet(needNetAnnual), each: grossFromNet(needNetAnnual / 2) };
  }, [L, r.io, r.assess, r.assessTerm, r.commit, r.rentPm, i.termYears]);
  const have = i.a1Gross + i.a2Gross;

  // repayments
  const rpL = n("rpLoan"),
    rpRate = n("rpRate"),
    rpYrs = n("rpTerm") || 30;
  const rpRows: [string, number, number | null][] = [];
  if (rpL > 0 && rpRate > 0) {
    const pi = pmt(rpRate, rpYrs, rpL);
    rpRows.push([`P&I over ${rpYrs} yrs`, pi, pi * rpYrs * 12 - rpL]);
    [25, 30].forEach((y) => {
      if (y !== rpYrs) {
        const p = pmt(rpRate, y, rpL);
        rpRows.push([`P&I over ${y} yrs`, p, p * y * 12 - rpL]);
      }
    });
    rpRows.push(["Interest only", (rpL * rpRate) / 1200, null]);
    const up = pmt(rpRate + 0.5, rpYrs, rpL);
    rpRows.push([`P&I at ${(rpRate + 0.5).toFixed(2)}% (+0.5)`, up, up * rpYrs * 12 - rpL]);
  }

  function summaryText() {
    const L2 = [
      `${company} – Borrowing capacity (indicative)`,
      "",
      `Applicants: ${names}`,
      `Combined gross income: ${money(r.gross)} p.a. (approx. ${money(r.netAnnual)} after tax)`,
    ];
    if (i.rentPw) L2.push(`Rental income: ${money(i.rentPw)} / week (${S.rent_shade_pct || 80}% counted)`);
    L2.push(`Household: ${GROUPS[i.household]} · living costs used ${money(r.living)} / month`);
    if (i.ccLimit) L2.push(`Credit card limits: ${money(i.ccLimit)}`);
    if (i.otherPm + i.helpPm + i.otherCommit) L2.push(`Other commitments: ${money(i.otherPm + i.helpPm + i.otherCommit)} / month`);
    if (i.propLoans) L2.push(`Other property loans: ${money(i.propLoans)}`);
    L2.push(
      "",
      `Assessment: ${r.assess.toFixed(2)}% (product ${r.prod.toFixed(2)}% + ${i.buffer}% buffer, floor ${i.floorRate}%), ${i.termYears} yrs ${r.io ? "interest only" : "P&I"}`,
      `Estimated borrowing capacity: ${money(r.maxLoan)} (quote ${money(floor5k(r.maxLoan * 0.95))} – ${money(floor5k(r.maxLoan))})`,
      `Repayment at ${r.prod.toFixed(2)}%: ${money(r.repM)} / month`,
    );
    if (price != null) L2.push(`Indicative purchase price with ${money(i.deposit)} deposit: ${money(price)}`);
    if (i.desired && desired) L2.push(`Requested loan ${money(i.desired)}: ${desired.spare >= 0 ? "looks serviceable" : "may be above capacity"}`);
    L2.push("", "Indicative only. Lender policies differ; this is not an approval or financial advice.");
    return L2.join("\n");
  }
  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summaryText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }
  function printIt() {
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
    const body = summaryText()
      .split("\n")
      .map((l) => (l ? `<p>${esc(l)}</p>` : "<br>"))
      .join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      `<html><head><title>Borrowing capacity</title><style>body{font-family:Segoe UI,Arial,sans-serif;max-width:720px;margin:40px auto;color:#0f172a}p{margin:5px 0;line-height:1.5}.big{font-size:30px;font-weight:800;color:#987633;margin:14px 0}</style></head><body><div class="big">${money(r.maxLoan)}</div>${body}</body></html>`,
    );
    w.document.close();
    setTimeout(() => w.print(), 400);
  }

  const chip = (k: string) =>
    k === "bad" ? "bg-red-50 text-red-700 border-red-200" : k === "warn" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-blue-50 text-blue-800 border-blue-200";
  const btn = "rounded-[9px] border border-[#e5e7eb] bg-white px-3 py-2 text-[13px] font-semibold text-[#0f172a] hover:bg-[#f8fafc]";

  return (
    <div className="mmb mx-auto max-w-[1280px] font-[system-ui,-apple-system,'Segoe_UI',Roboto,Arial,sans-serif] text-[#0f172a]">
      <div className="mb-2.5">
        <h1 className="mb-0.5 text-[26px] font-extrabold">Borrowing capacity</h1>
        <p className="text-[13px] text-[#64748b]">Quick, indicative numbers. Lender policies differ — treat as a guide, not an assessment.</p>
      </div>

      <nav className="mb-3.5 flex gap-1 overflow-x-auto rounded-[14px] border border-[#e5e7eb] bg-white p-[5px]">
        {TABS.map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`whitespace-nowrap rounded-[10px] px-4 py-[9px] text-[13.5px] font-semibold ${tab === k ? "bg-[#987633] text-white" : "text-[#64748b] hover:bg-[#f8fafc]"}`}
          >
            {l}
          </button>
        ))}
      </nav>

      {tab === "capacity" && (
        <div className="grid items-start gap-3.5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
          <div>
            <div className={card}>
              <h3 className={h3}>Applicants &amp; income</h3>
              <div className="grid gap-x-3.5 md:grid-cols-3">
                <F id="a1Name" label="Applicant 1" type="text" placeholder="Name" v={v} set={set} />
                <F id="a1Gross" label="Gross salary p.a." min={0} step={1000} placeholder="e.g. 95000" v={v} set={set} />
                <F id="a1Other" label="Bonus / overtime p.a." min={0} step={500} placeholder="2-yr average" hint={`Shaded to ${S.bonus_shade_pct}%`} v={v} set={set} />
                <F id="a2Name" label="Applicant 2" type="text" placeholder="Optional" v={v} set={set} />
                <F id="a2Gross" label="Gross salary p.a." min={0} step={1000} v={v} set={set} />
                <F id="a2Other" label="Bonus / overtime p.a." min={0} step={500} v={v} set={set} />
              </div>
              <F id="rentPw" label="Rental income (per week)" min={0} step={10} hint={`Shaded to ${S.rent_shade_pct}% for servicing`} v={v} set={set} />
              <p className="mt-1.5 text-xs text-[#64748b]">Tax is calculated for each applicant separately (2024-25 resident rates + 2% Medicare).</p>
            </div>

            <div className={card}>
              <h3 className={h3}>Household &amp; commitments</h3>
              <div className="grid gap-x-3.5 md:grid-cols-2">
                <div className="mb-[11px]">
                  <label htmlFor="mmb-household" className={lbl}>
                    Household
                  </label>
                  <select id="mmb-household" value={v.household} onChange={(e) => set("household", e.target.value)} className={inp}>
                    {Object.entries(GROUPS).map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>
                <F id="dependants" label="Dependants" min={0} v={v} set={set} />
                <F id="livingPm" label="Declared living costs / month" min={0} step={50} hint="Lenders use the higher of this and their benchmark" v={v} set={set} />
                <F id="ccLimit" label="Credit card limits (total)" min={0} step={500} hint={`Assessed at ${S.cc_assess_pct}% of limit / month`} v={v} set={set} />
                <F id="otherPm" label="Other loan repayments / month" min={0} step={10} v={v} set={set} />
                <F id="helpPm" label="HECS / HELP repayment / month" min={0} step={10} v={v} set={set} />
                <F id="otherCommit" label="Child support / other / month" min={0} step={10} v={v} set={set} />
                <F id="propLoans" label="Other property loans (balance)" min={0} step={1000} hint="Assessed at the assessment rate, P&I over 30 yrs" v={v} set={set} />
              </div>
              <label className="mt-0.5 flex items-center gap-2 text-[13px]">
                <input type="checkbox" checked={useHem} onChange={(e) => setUseHem(e.target.checked)} /> Use the benchmark (HEM-style) floor for living costs
              </label>
            </div>

            <div className={card}>
              <h3 className={h3}>Loan &amp; assessment</h3>
              <div className="grid gap-x-3.5 md:grid-cols-2">
                <F id="prodRate" label="Product rate % p.a." step={0.01} v={v} set={set} />
                <F id="buffer" label="Serviceability buffer +%" step={0.1} v={v} set={set} />
                <F id="floorRate" label="Assessment floor % p.a." step={0.1} v={v} set={set} />
                <F id="termYears" label="Loan term (years)" min={1} max={40} v={v} set={set} />
                <div className="mb-[11px]">
                  <label htmlFor="mmb-repayType" className={lbl}>
                    Repayments
                  </label>
                  <select id="mmb-repayType" value={v.repayType} onChange={(e) => set("repayType", e.target.value)} className={inp}>
                    <option value="PI">Principal &amp; interest</option>
                    <option value="IO">Interest only ({S.io_years} yrs)</option>
                  </select>
                </div>
                <div className="mb-[11px]">
                  <label htmlFor="mmb-state" className={lbl}>
                    State
                  </label>
                  <select id="mmb-state" value={v.state} onChange={(e) => set("state", e.target.value)} className={inp}>
                    {Object.keys(S.fees).map((st) => (
                      <option key={st}>{st}</option>
                    ))}
                  </select>
                </div>
                <F id="desired" label="Loan you want (optional)" min={0} step={5000} hint="Checks serviceability & the income needed" v={v} set={set} />
                <F id="deposit" label="Deposit / savings (optional)" min={0} step={5000} v={v} set={set} />
                <F id="targetLvr" label="Target LVR %" min={50} max={97} v={v} set={set} />
                <F id="dutyAllow" label="Stamp duty & other costs (optional)" min={0} step={1000} hint="Enter from the stamp duty calculator" v={v} set={set} />
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-3 xl:sticky xl:top-11">
            <div className="rounded-[14px] border border-[#f1e6ce] bg-gradient-to-br from-[#fffaf0] to-white px-[22px] py-5">
              <div className="text-[11.5px] font-bold uppercase tracking-[.06em] text-[#64748b]">Estimated borrowing capacity</div>
              <div className="my-1 text-[40px] font-extrabold leading-[1.15] tracking-[-.02em] text-[#7a5f28]">{r.gross ? money(r.maxLoan) : "—"}</div>
              <div className="text-[13px] text-[#475569]">
                {r.gross ? `For ${names} · ${r.io ? "IO " : "P&I "}${i.termYears} yrs · assessed at ${r.assess.toFixed(2)}%` : "Enter income to begin"}
              </div>
              {flags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {flags.map(([k, t]) => (
                    <span key={t} className={`rounded-full border px-2 py-0.5 text-[11.5px] ${chip(k)}`}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className={card + " !mb-0"}>
              <div className={kv}>
                <span className="text-[#475569]">Assessment rate</span>
                <b>{r.assess.toFixed(2)}% p.a.</b>
              </div>
              <div className={kv}>
                <span className="text-[#475569]">Net income / month (after tax)</span>
                <b>{money(r.netPm)}</b>
              </div>
              <div className={kv}>
                <span className="text-[#475569]">Commitments / month</span>
                <b>{money(r.commit)}</b>
              </div>
              <div className={kv}>
                <span className="text-[#475569]">Spare capacity / month</span>
                <b>{money(r.cap)}</b>
              </div>
              <div className={kv}>
                <span className="text-[#475569]">Living costs used</span>
                <b>
                  {money(r.living)}
                  {i.useHem && r.hem > i.livingPm ? " (benchmark)" : ""}
                </b>
              </div>
              <hr className="my-2 border-[#f1f5f9]" />
              <div className={kv}>
                <span className="text-[#475569]">Repayment @ product rate</span>
                <b>{money(r.repM)} / month</b>
              </div>
              <div className={kv + " !text-[12.5px]"}>
                <span className="text-[#64748b]">Fortnightly / weekly</span>
                <b>
                  {money((r.repM * 12) / 26)} / {money((r.repM * 12) / 52)}
                </b>
              </div>
              <div className={kv}>
                <span className="text-[#475569]">Debt-to-income at max</span>
                <b>{r.gross ? r.dti.toFixed(1) + "×" : "—"}</b>
              </div>
              <div className={kv + " !text-[12.5px]"}>
                <span className="text-[#64748b]">Capped at {dtiCap}× DTI</span>
                <b>{r.gross ? money(Math.min(r.maxLoan, r.dtiLoan)) : "—"}</b>
              </div>
              {price != null && (
                <>
                  <hr className="my-2 border-[#f1f5f9]" />
                  <div className={kv}>
                    <span className="text-[#475569]">Indicative max purchase price</span>
                    <b>{money(price)}</b>
                  </div>
                  <div className={kv + " !text-[12.5px]"}>
                    <span className="text-[#64748b]">Loan / LVR at that price</span>
                    <b>
                      {money(loanAtPrice)} · {price ? ((loanAtPrice / price) * 100).toFixed(1) : 0}%{price && loanAtPrice / price > 0.8 ? " (LMI likely)" : ""}
                    </b>
                  </div>
                </>
              )}
              {desired && (
                <>
                  <hr className="my-2 border-[#f1f5f9]" />
                  <div className={kv}>
                    <span className="text-[#475569]">
                      For <b>{money(i.desired)}</b>
                    </span>
                    <b>
                      {desired.spare >= 0 ? (
                        <span className="text-[#15803d]">Looks serviceable (+{money(desired.spare)}/mth)</span>
                      ) : (
                        <span className="text-[#b91c1c]">Short {money(-desired.spare)}/mth</span>
                      )}
                    </b>
                  </div>
                  <div className={kv + " !text-[12.5px]"}>
                    <span className="text-[#64748b]">Repayment at assessment rate</span>
                    <b>{money(desired.need)} / month</b>
                  </div>
                </>
              )}
            </div>
            <div className={card + " !mb-0"}>
              <h4 className="mb-2 text-[13px] font-bold">If rates move (product rate)</h4>
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className={th}>Rate</th>
                    <th className={th}>Assessed at</th>
                    <th className={th}>Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {sens.map(({ d, rr }) => (
                    <tr key={d} className={d === 0 ? "bg-[#fffaf0] font-bold" : ""}>
                      <td className={td}>{(i.prodRate + d).toFixed(2)}%</td>
                      <td className={td}>{rr.assess.toFixed(2)}%</td>
                      <td className={td}>{money(rr.maxLoan)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={copySummary} className="rounded-[9px] bg-[#987633] px-3 py-2 text-[13px] font-semibold text-white hover:bg-[#86642a]">
                {copied ? "Copied!" : "Copy summary"}
              </button>
              <button type="button" onClick={printIt} className={btn}>
                Print / PDF
              </button>
              <a href="/book-appointment" className={btn}>
                Book a consultation
              </a>
            </div>
          </aside>
        </div>
      )}

      {tab === "income" && (
        <div className={card + " max-w-[900px]"}>
          <h3 className={h3}>What income do you need?</h3>
          <p className="text-[13px] text-[#64748b]">
            Uses the household, commitments and loan settings from the <em>Borrowing capacity</em> tab.
          </p>
          <div className="mt-3 max-w-[320px]">
            <F id="needLoan" label="Loan required" min={0} step={5000} placeholder="e.g. 750000" v={v} set={set} />
          </div>
          {!need ? (
            <p className="text-[13px] text-[#64748b]">Enter a loan amount.</p>
          ) : (
            <>
              <div className="mt-1.5 grid gap-2.5 md:grid-cols-3">
                {[
                  ["One applicant needs", money(need.one), "gross p.a."],
                  ["Two applicants, equal split", `${money(need.each)} each`, `${money(need.each * 2)} combined`],
                  ["Repayment at assessment rate", money(need.rep), `per month on ${money(L)}`],
                ].map(([a, b, c]) => (
                  <div key={a} className="rounded-xl border border-[#e5e7eb] bg-[#fafbfc] p-3.5">
                    <span className="block text-[11.5px] uppercase tracking-[.05em] text-[#64748b]">{a}</span>
                    <b className="my-1 block text-2xl text-[#7a5f28]">{b}</b>
                    <small className="text-[#64748b]">{c}</small>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[13px] text-[#64748b]">
                Based on commitments of {money(r.commit)}/month and assessed at {r.assess.toFixed(2)}%.
                {have ? (
                  <>
                    {" "}
                    Current gross entered: <b>{money(have)}</b> —{" "}
                    {have >= need.one ? (
                      "enough on these assumptions."
                    ) : (
                      <>
                        short by about <b>{money(need.one - have)}</b>.
                      </>
                    )}
                  </>
                ) : null}
              </p>
            </>
          )}
        </div>
      )}

      {tab === "repay" && (
        <div className={card + " max-w-[900px]"}>
          <h3 className={h3}>Repayment calculator</h3>
          <div className="grid max-w-[760px] gap-x-3.5 md:grid-cols-2">
            <F id="rpLoan" label="Loan amount" min={0} step={5000} v={v} set={set} />
            <F id="rpRate" label="Interest rate % p.a." step={0.01} v={v} set={set} />
            <F id="rpTerm" label="Term (years)" min={1} max={40} v={v} set={set} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className={th}></th>
                  <th className={th}>Monthly</th>
                  <th className={th}>Fortnightly</th>
                  <th className={th}>Weekly</th>
                  <th className={th}>Total interest</th>
                </tr>
              </thead>
              <tbody>
                {rpRows.length ? (
                  rpRows.map(([label, m, interest]) => (
                    <tr key={label}>
                      <td className={td}>{label}</td>
                      <td className={td}>{money2(m)}</td>
                      <td className={td}>{money2((m * 12) / 26)}</td>
                      <td className={td}>{money2((m * 12) / 52)}</td>
                      <td className={td}>{interest == null ? "—" : money(interest)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className={td + " text-[#64748b]"}>
                      Enter a loan and rate.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-[#64748b]">
            Fortnightly = monthly × 12 ÷ 26, weekly = monthly × 12 ÷ 52. Paying half the monthly amount fortnightly gives roughly one extra monthly repayment a year.
          </p>
        </div>
      )}

      {tab === "equity" && (
        <div className="grid gap-3.5 md:grid-cols-2">
          <div className={card}>
            <h3 className={h3}>Usable equity</h3>
            <div className="grid gap-x-3.5 md:grid-cols-2">
              <F id="eqValue" label="Property value" min={0} step={10000} v={v} set={set} />
              <F id="eqLoan" label="Current loan balance" min={0} step={5000} v={v} set={set} />
            </div>
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className={th}>LVR</th>
                  <th className={th}>Max loan</th>
                  <th className={th}>Usable equity</th>
                </tr>
              </thead>
              <tbody>
                {n("eqValue") > 0 ? (
                  [70, 80, 90, 95].map((l) => {
                    const m = (n("eqValue") * l) / 100,
                      u = m - n("eqLoan");
                    return (
                      <tr key={l}>
                        <td className={td}>{l}%</td>
                        <td className={td}>{money(m)}</td>
                        <td className={`${td} ${u >= 0 ? "text-[#15803d]" : "text-[#b91c1c]"}`}>{money(u)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className={td + " text-[#64748b]"}>
                      Enter the property value.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-[#64748b]">Lenders above 80% LVR usually charge LMI and tighten policy — equity above 80% is rarely “free”.</p>
          </div>
          <div className={card}>
            <h3 className={h3}>Deposit needed</h3>
            <div className="grid gap-x-3.5 md:grid-cols-2">
              <F id="dpPrice" label="Purchase price" min={0} step={10000} v={v} set={set} />
              <F id="dpCosts" label="Stamp duty & costs" min={0} step={1000} v={v} set={set} />
            </div>
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className={th}>LVR</th>
                  <th className={th}>Loan</th>
                  <th className={th}>Deposit</th>
                  <th className={th}>Deposit + costs</th>
                </tr>
              </thead>
              <tbody>
                {n("dpPrice") > 0 ? (
                  [95, 90, 85, 80, 70].map((l) => {
                    const P = n("dpPrice"),
                      loan = (P * l) / 100,
                      dep = P - loan;
                    return (
                      <tr key={l}>
                        <td className={td}>{l}%</td>
                        <td className={td}>{money(loan)}</td>
                        <td className={td}>{money(dep)}</td>
                        <td className={td}>{money(dep + n("dpCosts"))}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className={td + " text-[#64748b]"}>
                      Enter a purchase price.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
