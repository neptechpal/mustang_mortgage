"use client";

import { useMemo, useState } from "react";
import { calcRepayments, type Frequency, type RepaymentResult, type YearRow } from "@/modules/calc/repayments";
import { Assumptions, CalcShell, DecimalField, Empty, Figure, Group, MoneyField, Notes, Rows, Segmented, Stat, TalkCta, aud, n0, yearsMonths } from "./parts";

const FREQ_LABEL: Record<Frequency, string> = { weekly: "week", fortnightly: "fortnight", monthly: "month" };

export type RepaymentsCalculatorProps = {
  defaultAmount?: number;
  defaultTermYears?: number;
  defaultFrequency?: Frequency;
  compact?: boolean;
  title?: React.ReactNode | null;
  className?: string;
};

/**
 * Loan repayments (P&I or interest-only, weekly / fortnightly / monthly, extra repayments) from the verified engine
 * `calcRepayments`. The user always enters their own interest rate.
 */
export function RepaymentsCalculator({ defaultAmount, defaultTermYears = 30, defaultFrequency = "monthly", compact, title, className }: RepaymentsCalculatorProps) {
  const [amount, setAmount] = useState<number | null>(defaultAmount ?? null);
  const [rate, setRate] = useState<number | null>(null);
  const [term, setTerm] = useState<number | null>(defaultTermYears);
  const [freq, setFreq] = useState<Frequency>(defaultFrequency);
  const [type, setType] = useState<"PI" | "IO">("PI");
  const [ioYears, setIoYears] = useState<number | null>(5);
  const [extra, setExtra] = useState<number | null>(null);

  const ready = n0(amount) > 0 && n0(rate) > 0 && n0(term) >= 1;
  const r = useMemo<RepaymentResult | null>(() => {
    if (!ready) return null;
    return calcRepayments({
      principal: n0(amount),
      annualRatePct: n0(rate),
      termYears: n0(term),
      frequency: freq,
      repaymentType: type,
      interestOnlyYears: type === "IO" ? n0(ioYears) : undefined,
      extraPerPeriod: n0(extra),
    });
  }, [ready, amount, rate, term, freq, type, ioYears, extra]);
  const sched = useMemo(() => (r && n0(extra) > 0 ? calcRepayments({ principal: n0(amount), annualRatePct: n0(rate), termYears: n0(term), frequency: freq, repaymentType: type, interestOnlyYears: type === "IO" ? n0(ioYears) : undefined }) : r), [r, extra, amount, rate, term, freq, type, ioYears]);

  const form = (
    <>
      <div className="mw-calc__grid mw-calc__grid--2">
        <MoneyField label="Loan amount" value={amount} onChange={setAmount} placeholder="e.g. 600,000" />
        <DecimalField label="Interest rate" value={rate} onChange={setRate} suffix="% p.a." placeholder="Your rate" max={30} hint="Enter the rate you have been offered or are paying. We don't publish rates." />
        <DecimalField label="Loan term" value={term} onChange={setTerm} suffix="years" integer min={1} max={40} />
        <MoneyField label="Extra repayment" value={extra} onChange={setExtra} optional suffix={`per ${FREQ_LABEL[freq]}`} placeholder="0" />
      </div>
      <Segmented<Frequency>
        legend="Repayment frequency"
        value={freq}
        onChange={setFreq}
        options={[
          { value: "weekly", label: "Weekly" },
          { value: "fortnightly", label: "Fortnightly" },
          { value: "monthly", label: "Monthly" },
        ]}
        min={100}
      />
      <Group legend="Repayment type">
        <Segmented<"PI" | "IO">
          legend="How you repay"
          value={type}
          onChange={setType}
          options={[
            { value: "PI", label: "Principal and interest" },
            { value: "IO", label: "Interest only, then P&I" },
          ]}
          min={150}
        />
        {type === "IO" && <DecimalField label="Interest-only period" value={ioYears} onChange={setIoYears} suffix="years" integer min={1} max={Math.max(1, n0(term))} hint="Usually 1 to 5 years for an owner-occupier loan." />}
      </Group>
    </>
  );

  let out: React.ReactNode;
  if (!r) {
    out = (
      <>
        <Figure label={`Repayment per ${FREQ_LABEL[freq]}`} value="$0" muted sub="Enter a loan amount, your interest rate and the term." />
        <Empty>Your repayment, total interest and how much extra repayments could save appear here.</Empty>
        <TalkCta />
      </>
    );
  } else {
    const per = FREQ_LABEL[freq];
    const io = type === "IO" && r.interestOnlyYears > 0;
    const withExtra = n0(extra) > 0;
    const run = r.withExtra;
    out = (
      <>
        <Figure
          label={io ? `Interest-only repayment per ${per}` : `Repayment per ${per}`}
          value={aud(r.repayment, true)}
          sub={
            io
              ? r.interestOnlyYears < n0(term)
                ? `Then ${aud(r.principalAndInterestRepayment, true)} per ${per} after ${r.interestOnlyYears} years.`
                : "The whole loan is still owed at the end of the term."
              : freq !== "monthly"
                ? `About ${aud(r.monthlyEquivalent)} a month.`
                : undefined
          }
        />
        <hr className="mw-calc__rule" />
        <div className="mw-calc__pair">
          <Stat label={withExtra ? "Total interest, with extras" : "Total interest"} value={aud(run.totalInterest)} />
          <Stat label={withExtra ? "Total repaid, with extras" : "Total repaid"} value={aud(run.totalRepaid)} />
        </div>
        <Rows
          rows={[
            { label: "Loan amount", value: aud(n0(amount)) },
            { label: "Paid off in", value: yearsMonths((run.periods / r.periodsPerYear) * 12) },
            ...(withExtra
              ? [
                  { label: "Interest saved with extra repayments", value: aud(run.interestSaved), tone: "neg" as const },
                  { label: "Time saved", value: yearsMonths(run.timeSavedYears * 12), tone: "neg" as const },
                ]
              : []),
          ]}
        />
        {!compact && sched && <BalanceChart scheduled={sched.yearly} withExtra={withExtra ? r.yearly : undefined} principal={n0(amount)} />}
        <Notes items={r.notes.filter((x) => !x.startsWith("Estimate only"))} />
        <TalkCta />
        {!compact && (
          <details className="mw-subdetails">
            <summary>Year-by-year balance</summary>
            <YearTable rows={r.yearly} />
          </details>
        )}
        <Assumptions
          items={[
            "Uses the interest rate you enter for the whole term. Variable rates change, and fixed rates end.",
            `Interest is worked out per repayment period (rate ÷ ${r.periodsPerYear}). Lenders calculate interest daily and charge it monthly, so their figures can differ slightly.`,
            "Fortnightly and weekly repayments are worked out over 26 or 52 periods a year. Paying half the monthly amount every fortnight repays the loan sooner; your lender can tell you which method it uses.",
            "Lender fees and charges are not included. To compare the cost of loans, use each loan's comparison rate.",
          ]}
        />
      </>
    );
  }

  return (
    <CalcShell className={className} compact={compact} label="Home loan repayments calculator" title={title === null ? undefined : (title ?? "Repayments calculator")} form={form} result={out} />
  );
}

function YearTable({ rows }: { rows: YearRow[] }) {
  return (
    <div className="mw-table-wrap" role="region" aria-label="Year-by-year loan balance" tabIndex={0}>
      <table className="mw-table" style={{ minWidth: 0 }}>
        <thead>
          <tr>
            <th scope="col">Year</th>
            <th scope="col" className="mw-num-cell">
              Interest
            </th>
            <th scope="col" className="mw-num-cell">
              Principal
            </th>
            <th scope="col" className="mw-num-cell">
              Balance
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((y) => (
            <tr key={y.year}>
              <th scope="row">{y.year}</th>
              <td className="mw-num-cell">{aud(y.interest)}</td>
              <td className="mw-num-cell">{aud(y.principal)}</td>
              <td className="mw-num-cell">{aud(y.closingBalance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Loan balance over time. Ink line = scheduled; gold line = with extra repayments. */
function BalanceChart({ scheduled, withExtra, principal }: { scheduled: YearRow[]; withExtra?: YearRow[]; principal: number }) {
  const W = 320;
  const H = 132;
  const pad = { l: 4, r: 4, t: 10, b: 20 };
  const years = Math.max(scheduled.length, 1);
  const x = (yr: number) => pad.l + (yr / years) * (W - pad.l - pad.r);
  const y = (bal: number) => pad.t + (1 - bal / Math.max(principal, 1)) * (H - pad.t - pad.b);
  const path = (rows: YearRow[]) => [`M${x(0)},${y(principal)}`, ...rows.map((r) => `L${x(r.year).toFixed(1)},${y(r.closingBalance).toFixed(1)}`)].join(" ");
  const ticks = [0, Math.round(years / 2), years];
  const label = `Loan balance falls from ${aud(principal)} to $0 over ${withExtra ? withExtra.length : scheduled.length} years${withExtra ? `, compared with ${scheduled.length} years without extra repayments` : ""}.`;
  return (
    <figure style={{ margin: 0 }}>
      <svg className="mw-balchart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="var(--mw-line-strong)" strokeWidth="1" />
        <path d={`${path(scheduled)} L${x(scheduled.length)},${H - pad.b} L${x(0)},${H - pad.b} Z`} fill="var(--mw-sand)" />
        <path d={path(scheduled)} fill="none" stroke="var(--mw-ink)" strokeWidth="1.5" />
        {withExtra && <path d={path(withExtra)} fill="none" stroke="var(--mw-gold-500)" strokeWidth="2" />}
        {ticks.map((t) => (
          <text key={t} x={x(t)} y={H - 5} textAnchor={t === 0 ? "start" : t === years ? "end" : "middle"}>
            {t === 0 ? "Today" : `${t} yrs`}
          </text>
        ))}
      </svg>
      <figcaption className="mw-field__hint" style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6 }}>
        <span>
          <span aria-hidden="true" style={{ display: "inline-block", width: 14, height: 2, background: "var(--mw-ink)", verticalAlign: "middle", marginRight: 6 }} />
          Balance as scheduled
        </span>
        {withExtra && (
          <span>
            <span aria-hidden="true" style={{ display: "inline-block", width: 14, height: 2, background: "var(--mw-gold-500)", verticalAlign: "middle", marginRight: 6 }} />
            With extra repayments
          </span>
        )}
      </figcaption>
    </figure>
  );
}
