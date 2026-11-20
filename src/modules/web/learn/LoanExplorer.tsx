"use client";

import { useId, useMemo, useState } from "react";
import { calcRepayments, type Frequency } from "@/modules/calc/repayments";
import { formatAud } from "../format";
import "../styles/learn.css";

const FREQ_LABEL: Record<Frequency, string> = { weekly: "week", fortnightly: "fortnight", monthly: "month" };
const PERIODS: Record<Frequency, number> = { weekly: 52, fortnightly: 26, monthly: 12 };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const pct = (n: number) => `${Math.round(n)}%`;
const yearsMonths = (periods: number, perYear: number) => {
  const months = Math.round((periods / perYear) * 12);
  const y = Math.floor(months / 12);
  const m = months % 12;
  return `${y} year${y === 1 ? "" : "s"}${m ? ` ${m} month${m === 1 ? "" : "s"}` : ""}`;
};

/**
 * Interactive "see your loan year by year": sliders for amount, rate, term and extra repayments, a bar chart of each year's
 * repayments split into interest and principal, and a year scrubber. Uses the same verified engine as the repayments calculator.
 * The rate shown at first is an example only; people are asked to type their own.
 */
export function LoanExplorer({ compact = false }: { compact?: boolean }) {
  const id = useId();
  const [amount, setAmount] = useState(600_000);
  const [rate, setRate] = useState(6);
  const [term, setTerm] = useState(30);
  const [freq, setFreq] = useState<Frequency>("monthly");
  const [extraMonthly, setExtraMonthly] = useState(0);
  const [year, setYear] = useState(1);

  const valid = amount > 0 && rate > 0 && term >= 1;
  const result = useMemo(() => {
    if (!valid) return null;
    const extraPerPeriod = (extraMonthly * 12) / PERIODS[freq];
    return calcRepayments({ principal: amount, annualRatePct: rate, termYears: term, frequency: freq, extraPerPeriod });
  }, [valid, amount, rate, term, freq, extraMonthly]);

  if (!result) return null;
  const yearly = result.yearly;
  const sel = yearly[clamp(year, 1, yearly.length) - 1];
  const maxYearPay = Math.max(...yearly.map((y) => y.interest + y.principal));
  const first = yearly[0];
  const firstYearInterestShare = (first.interest / (first.interest + first.principal)) * 100;
  const selPaid = sel.interest + sel.principal;
  const repaidShare = ((amount - sel.closingBalance) / amount) * 100;

  const W = 720;
  const H = compact ? 200 : 240;
  const base = H - 26;
  const slot = W / yearly.length;
  const bw = Math.max(3, slot * 0.72);
  const scale = (v: number) => (v / maxYearPay) * (base - 12);

  const saved = result.withExtra;
  const showSaving = extraMonthly > 0 && saved.interestSaved > 0;

  return (
    <div className={`mw-explorer${compact ? " mw-explorer--compact" : ""}`}>
      <div className="mw-explorer__controls">
        <label className="mw-explorer__field">
          <span className="mw-explorer__label">
            Loan amount <strong>{formatAud(amount)}</strong>
          </span>
          <input type="range" min={100_000} max={2_000_000} step={10_000} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
        </label>
        <label className="mw-explorer__field">
          <span className="mw-explorer__label">
            Interest rate <strong>{rate.toFixed(2)}% p.a.</strong>
          </span>
          <input type="range" min={1} max={12} step={0.05} value={rate} onChange={(e) => setRate(Number(e.target.value))} />
          <span className="mw-explorer__hint">An example rate for illustration, not an offer. Slide it to your own.</span>
        </label>
        <label className="mw-explorer__field">
          <span className="mw-explorer__label">
            Loan term <strong>{term} years</strong>
          </span>
          <input
            type="range"
            min={5}
            max={40}
            step={1}
            value={term}
            onChange={(e) => {
              const t = Number(e.target.value);
              setTerm(t);
              setYear((y) => Math.min(y, t));
            }}
          />
        </label>
        <label className="mw-explorer__field">
          <span className="mw-explorer__label">
            Extra each month <strong>{formatAud(extraMonthly)}</strong>
          </span>
          <input type="range" min={0} max={3_000} step={50} value={extraMonthly} onChange={(e) => setExtraMonthly(Number(e.target.value))} />
        </label>
        <fieldset className="mw-explorer__seg">
          <legend>Repayments</legend>
          {(["monthly", "fortnightly"] as const).map((f) => (
            <label key={f}>
              <input type="radio" name={`${id}-freq`} checked={freq === f} onChange={() => setFreq(f)} />
              <span>{f === "monthly" ? "Monthly" : "Fortnightly"}</span>
            </label>
          ))}
        </fieldset>
      </div>

      <div className="mw-explorer__stats" aria-live="polite">
        <div>
          <span>Each {FREQ_LABEL[freq]}</span>
          <strong>{formatAud(result.repayment + (extraMonthly * 12) / PERIODS[freq])}</strong>
          {extraMonthly > 0 && <em>includes your extra</em>}
        </div>
        <div>
          <span>Total interest</span>
          <strong>{formatAud(saved.totalInterest)}</strong>
          <em>{pct((saved.totalInterest / amount) * 100)} of the amount borrowed</em>
        </div>
        <div>
          <span>Paid off in</span>
          <strong>{yearsMonths(saved.periods, result.periodsPerYear)}</strong>
          {showSaving ? <em>{formatAud(saved.interestSaved)} less interest than without the extra</em> : <em>of a {term}-year term</em>}
        </div>
      </div>

      <figure className="mw-explorer__chart">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Bar chart of each year of the loan. In year 1, ${pct(firstYearInterestShare)} of repayments is interest.`}>
          {yearly.map((y, i) => {
            const x = i * slot + (slot - bw) / 2;
            const hi = scale(y.interest);
            const hp = scale(y.principal);
            const on = y.year === sel.year;
            return (
              <g key={y.year} opacity={on ? 1 : 0.55} onClick={() => setYear(y.year)} style={{ cursor: "pointer" }}>
                <rect x={x} y={base - hi - hp} width={bw} height={hp} fill="var(--mw-gold-500)" rx={1.5} />
                <rect x={x} y={base - hi} width={bw} height={hi} fill="var(--mw-ink-2)" rx={1.5} />
                <rect x={i * slot} y={0} width={slot} height={base} fill="transparent" />
              </g>
            );
          })}
          <line x1={0} x2={W} y1={base} y2={base} stroke="var(--mw-line-strong)" />
          {yearly.map((y, i) =>
            y.year === 1 || y.year % 5 === 0 ? (
              <text key={y.year} x={i * slot + slot / 2} y={H - 8} textAnchor="middle" fontSize="12" fill="var(--mw-text-3)">
                {y.year}
              </text>
            ) : null,
          )}
        </svg>
        <figcaption>
          <span className="mw-explorer__key mw-explorer__key--int" /> Interest <span className="mw-explorer__key mw-explorer__key--prin" /> Paid off the loan. Each bar is one year of repayments.
        </figcaption>
      </figure>

      <div className="mw-explorer__scrub">
        <label className="mw-explorer__field">
          <span className="mw-explorer__label">
            Look at year <strong>{sel.year}</strong> of {yearly.length}
          </span>
          <input type="range" min={1} max={yearly.length} step={1} value={sel.year} onChange={(e) => setYear(Number(e.target.value))} aria-valuetext={`Year ${sel.year}`} />
        </label>
        <p className="mw-explorer__year" aria-live="polite">
          In year {sel.year} you pay <strong>{formatAud(selPaid)}</strong>. <strong>{formatAud(sel.interest)}</strong> ({pct((sel.interest / selPaid) * 100)}) is interest and{" "}
          <strong>{formatAud(sel.principal)}</strong> reduces what you owe. At the end of the year you owe <strong>{formatAud(sel.closingBalance)}</strong>, so you have paid off{" "}
          <strong>{pct(repaidShare)}</strong> of the loan.
        </p>
      </div>

      {!compact && (
        <p className="mw-small" style={{ marginTop: 16 }}>
          Method: standard repayment formula on the amount and rate you set, with interest calculated on the balance each period. Lenders calculate interest daily, so real
          repayments differ by a few dollars. It leaves out fees, offset balances, rate changes and interest-only periods. It is an illustration, not a quote or an offer.
        </p>
      )}
    </div>
  );
}
