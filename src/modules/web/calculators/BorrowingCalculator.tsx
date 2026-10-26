"use client";

import { useMemo, useState } from "react";
import { TriangleAlert } from "lucide-react";
import { BORROW_DEFAULTS, estimateBorrowingPower, estimatePurchasePrice, livingBenchmarks, TAX_2026_27, type BorrowAssumptions, type Household } from "@/modules/calc/borrowing";
import { AU_STATES, type AuState } from "@/modules/calc/types";
import { formatDate } from "../format";
import { Assumptions, CalcShell, Check, DecimalField, Empty, Figure, Group, MoneyField, Notes, Rows, Segmented, SelectField, Stat, TalkCta, aud, n0, pct } from "./parts";
import { STATE_NAMES } from "./StampDutyCalculator";

export type BorrowingCalculatorProps = {
  /** Serviceability assumptions (buffer, floor rate, shading, living-cost benchmarks). Defaults to BORROW_DEFAULTS. Never a product rate. */
  assumptions?: Partial<BorrowAssumptions>;
  defaultState?: AuState;
  compact?: boolean;
  title?: React.ReactNode | null;
  className?: string;
};

const floor5k = (n: number) => Math.max(0, Math.floor(n / 5000) * 5000);

function household(applicants: 1 | 2, deps: number): Household {
  if (applicants === 1) return deps > 0 ? "single1" : "single";
  return deps <= 0 ? "couple" : deps === 1 ? "c1" : deps === 2 ? "c2" : "c3";
}

/**
 * Indicative borrowing power: the serviceability maths from the old plugin (`estimateBorrowingPower`), with the
 * 2026-27 resident tax scale and the user's own interest rate. Optional deposit → indicative purchase price after
 * stamp duty and government fees for the chosen state.
 */
export function BorrowingCalculator({ assumptions, defaultState = "NSW", compact, title, className }: BorrowingCalculatorProps) {
  const S: BorrowAssumptions = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { product_rate, ...rest } = assumptions ?? {};
    return { ...BORROW_DEFAULTS, ...rest, fees: { ...BORROW_DEFAULTS.fees, ...(rest.fees ?? {}) } };
  }, [assumptions]);

  const [applicants, setApplicants] = useState<1 | 2>(1);
  const [deps, setDeps] = useState(0);
  const [g1, setG1] = useState<number | null>(null);
  const [o1, setO1] = useState<number | null>(null);
  const [g2, setG2] = useState<number | null>(null);
  const [o2, setO2] = useState<number | null>(null);
  const [rent, setRent] = useState<number | null>(null);
  const [living, setLiving] = useState<number | null>(null);
  const [cards, setCards] = useState<number | null>(null);
  const [loans, setLoans] = useState<number | null>(null);
  const [help, setHelp] = useState<number | null>(null);
  const [otherCommit, setOtherCommit] = useState<number | null>(null);
  const [propLoans, setPropLoans] = useState<number | null>(null);
  const [rate, setRate] = useState<number | null>(null);
  const [term, setTerm] = useState<number | null>(30);
  const [repay, setRepay] = useState<"PI" | "IO">("PI");
  const [deposit, setDeposit] = useState<number | null>(null);
  const [state, setState] = useState<AuState>(defaultState);
  const [fhb, setFhb] = useState(true);
  const [lvr, setLvr] = useState<number | null>(80);

  const hh = household(applicants, deps);
  const income = n0(g1) + n0(o1) + (applicants === 2 ? n0(g2) + n0(o2) : 0);
  const ready = income > 0 && n0(rate) > 0;

  const r = useMemo(() => {
    if (!ready) return null;
    return estimateBorrowingPower(
      {
        applicant1Gross: n0(g1),
        applicant1Other: n0(o1),
        applicant2Gross: applicants === 2 ? n0(g2) : 0,
        applicant2Other: applicants === 2 ? n0(o2) : 0,
        rentalIncomeWeekly: n0(rent),
        household: hh,
        dependants: deps,
        livingExpensesMonthly: n0(living),
        useBenchmark: true,
        creditCardLimits: n0(cards),
        otherLoanRepaymentsMonthly: n0(loans),
        helpRepaymentsMonthly: n0(help),
        otherCommitmentsMonthly: n0(otherCommit),
        existingPropertyLoans: n0(propLoans),
        productRatePct: n0(rate),
        termYears: n0(term) || 30,
        repaymentType: repay,
        state,
      },
      S,
    );
  }, [ready, g1, o1, g2, o2, applicants, rent, hh, deps, living, cards, loans, help, otherCommit, propLoans, rate, term, repay, state, S]);

  const maxLoan = r ? floor5k(r.maxLoan) : 0;
  const purchase = useMemo(() => {
    if (!r || n0(deposit) <= 0) return null;
    return estimatePurchasePrice({ maxLoan: floor5k(r.maxLoan), deposit: n0(deposit), targetLvr: (n0(lvr) || 80) / 100, state, firstHomeBuyer: fhb, otherCosts: n0(S.solicitor_fee) });
  }, [r, deposit, lvr, state, fhb, S.solicitor_fee]);

  const bench = livingBenchmarks(S).find((b) => b.key === hh);
  const dtiCap = Number(S.dti_cap) || 6;

  const form = (
    <>
      <div className="mw-calc__grid mw-calc__grid--2">
        <Segmented<"1" | "2">
          legend="Who is applying?"
          value={String(applicants) as "1" | "2"}
          onChange={(v) => setApplicants(v === "2" ? 2 : 1)}
          options={[
            { value: "1", label: "Just me" },
            { value: "2", label: "Two of us" },
          ]}
          min={100}
        />
        <Segmented<"0" | "1" | "2" | "3">
          legend="Dependent children"
          value={String(Math.min(deps, 3)) as "0" | "1" | "2" | "3"}
          onChange={(v) => setDeps(Number(v))}
          options={[
            { value: "0", label: "0" },
            { value: "1", label: "1" },
            { value: "2", label: "2" },
            { value: "3", label: "3+" },
          ]}
          min={56}
        />
      </div>

      <Group legend="Income before tax">
        <div className="mw-calc__grid mw-calc__grid--2">
          <MoneyField label={applicants === 2 ? "Your salary" : "Salary"} value={g1} onChange={setG1} suffix="per year" placeholder="e.g. 95,000" hint="Base salary before tax, excluding super." />
          <MoneyField label="Overtime or bonus" value={o1} onChange={setO1} optional suffix="per year" />
          {applicants === 2 && (
            <>
              <MoneyField label="Second applicant's salary" value={g2} onChange={setG2} suffix="per year" />
              <MoneyField label="Their overtime, bonus or commission" value={o2} onChange={setO2} optional suffix="per year" />
            </>
          )}
          <MoneyField label="Rent from investment property" value={rent} onChange={setRent} optional suffix="per week" full />
        </div>
      </Group>

      <Group legend="Spending and debts">
        <div className="mw-calc__grid mw-calc__grid--2">
          <MoneyField
            label="Living expenses"
            value={living}
            onChange={setLiving}
            optional
            suffix="per month"
            hint={bench ? `If lower than ${aud(bench.monthly)} a month, we use that indicative benchmark instead.` : undefined}
          />
          <MoneyField label="Credit card limits" value={cards} onChange={setCards} optional placeholder="0" hint="The total limit, even if you pay it off each month." />
          <MoneyField label="Car and personal loan repayments" value={loans} onChange={setLoans} optional suffix="per month" placeholder="0" />
          <MoneyField label="HECS-HELP repayments" value={help} onChange={setHelp} optional suffix="per month" placeholder="0" />
          <MoneyField label="Other commitments" value={otherCommit} onChange={setOtherCommit} optional suffix="per month" placeholder="0" hint="Child support, buy now pay later and similar." />
          <MoneyField label="Other home loan balances" value={propLoans} onChange={setPropLoans} optional placeholder="0" hint="Loans you keep on other properties." />
        </div>
      </Group>

      <Group legend="The loan">
        <div className="mw-calc__grid mw-calc__grid--2">
          <DecimalField label="Interest rate" value={rate} onChange={setRate} suffix="% p.a." placeholder="Your rate" max={30} hint="Enter a rate you have been quoted. Lenders test you at a higher rate." />
          <DecimalField label="Loan term" value={term} onChange={setTerm} suffix="years" integer min={5} max={40} />
        </div>
        <Segmented<"PI" | "IO">
          legend="Repayments"
          value={repay}
          onChange={setRepay}
          options={[
            { value: "PI", label: "Principal and interest" },
            { value: "IO", label: "Interest only" },
          ]}
          min={150}
        />
      </Group>

      {!compact && (
        <Group legend="Deposit (optional)">
          <div className="mw-calc__grid mw-calc__grid--2">
            <MoneyField label="Savings for the purchase" value={deposit} onChange={setDeposit} optional hint="Deposit plus money for stamp duty and fees." />
            <SelectField<AuState> label="Buying in" value={state} onChange={setState} options={AU_STATES.map((s) => ({ value: s, label: STATE_NAMES[s] }))} />
            <DecimalField label="Borrow up to" value={lvr} onChange={setLvr} suffix="% of price" integer min={50} max={95} hint="Above 80% lenders usually charge lenders mortgage insurance (LMI)." />
          </div>
          <Check checked={fhb} onChange={setFhb} label="First home buyer" hint="Applies first home buyer duty concessions for an established home you will live in." />
        </Group>
      )}
    </>
  );

  let out: React.ReactNode;
  if (!r) {
    out = (
      <>
        <Figure label="You may be able to borrow" value="$0" muted sub="Enter your income and the interest rate you have been quoted." />
        <Empty>Your estimated borrowing range, the rate lenders test you at and your monthly repayment appear here.</Empty>
        <TalkCta />
      </>
    );
  } else {
    const usedBenchmark = r.hem > n0(living);
    const overDti = r.gross > 0 && r.dti > dtiCap;
    out = (
      <>
        <Figure
          label="You may be able to borrow"
          value={r.maxLoan > 0 ? `${aud(maxLoan)}` : "$0"}
          muted={r.maxLoan <= 0}
          sub={
            r.maxLoan > 0
              ? `A range of about ${aud(floor5k(r.maxLoan * 0.95))} to ${aud(maxLoan)}. Repayments about ${aud(r.repM)} a month at ${pct(r.prod)}.`
              : "Your commitments use up the income available for a loan at the test rate."
          }
        />
        <hr className="mw-calc__rule" />
        <div className="mw-calc__pair">
          <Stat label="Lenders' test rate" value={pct(r.assess)} />
          <Stat label="Debt to income" value={`${r.dti.toFixed(1)}×`} />
        </div>
        {overDti && (
          <div className="mw-calc__warn" role="note">
            <TriangleAlert size={18} strokeWidth={1.5} aria-hidden="true" />
            <p>
              Your total debt would be more than {dtiCap} times your income. Many lenders limit or decline lending at this level; {dtiCap} times your income less other debts is about{" "}
              {aud(floor5k(r.dtiLoan))}.
            </p>
          </div>
        )}
        <Rows
          rows={[
            { label: "Take-home pay", detail: `After ${TAX_2026_27.incomeYear} tax and Medicare levy`, value: `${aud(r.netPm)}/mth` },
            { label: "Living expenses used", detail: usedBenchmark ? "Indicative benchmark (higher than your figure)" : "Your figure", value: `${aud(r.living)}/mth` },
            { label: "Debts and commitments", detail: r.ccPm ? `Includes ${pct(Number(S.cc_assess_pct) || 3.8, 1)} of card limits` : undefined, value: `${aud(r.commit - r.living)}/mth` },
            { label: "Left for loan repayments", detail: `Tested at ${pct(r.assess)}`, value: `${aud(r.cap)}/mth`, tone: "total" as const },
          ]}
        />
        {purchase && (
          <Rows
            rows={[
              { label: "Price you could look at", detail: `With your savings, in ${STATE_NAMES[state]}`, value: aud(Math.floor(purchase.price / 1000) * 1000), tone: "total" as const },
              { label: "Loan at that price", detail: `${purchase.lvrPct.toFixed(0)}% of the price`, value: aud(purchase.loan) },
              { label: "Stamp duty and government fees", value: aud(purchase.govtCosts) },
              { label: "Conveyancing allowance", detail: "Our assumption", value: aud(purchase.otherCosts) },
            ]}
          />
        )}
        <Notes items={r.notes.slice(1)} />
        <TalkCta note="This is a starting point. At a consultation we check your figures against the policies of the lenders on our panel, including how they treat your visa, overtime or overseas income." />
        <Assumptions
          items={[
            `Tested at your rate plus a ${S.buffer_percent}% buffer, or ${S.floor_rate}% if that is higher, over ${n0(term) || 30} years${repay === "IO" ? ` (interest-only loans are tested as principal and interest over the term less ${S.io_years} years)` : ""}.`,
            `Tax: ${TAX_2026_27.incomeYear} resident income tax rates plus the ${TAX_2026_27.medicareLevyPct}% Medicare levy, without offsets (checked ${formatDate(TAX_2026_27.verifiedAt)}). Non-residents for tax pay different rates.`,
            `Overtime, bonus and commission count at ${S.bonus_shade_pct}%, and rent at ${S.rent_shade_pct}%. Lenders vary.`,
            `Living expenses: the higher of your figure and an indicative benchmark for your household (${bench ? `${aud(bench.monthly)} a month for ${bench.label.toLowerCase()}` : "by household"}). These benchmarks are our own simplified figures, not the Household Expenditure Measure lenders use.`,
            `Credit cards count at ${S.cc_assess_pct}% of the limit each month. Other home loans count as principal and interest over 30 years at the test rate.`,
            "Stamp duty in the purchase price assumes an established home you will live in, bought by Australian citizens or permanent residents.",
          ]}
        />
      </>
    );
  }

  return <CalcShell className={className} compact={compact} label="Borrowing power calculator" title={title === null ? undefined : (title ?? "Borrowing power calculator")} form={form} result={out} />;
}
