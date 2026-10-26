"use client";

import { useMemo, useState } from "react";
import { calcRefinance, type RefinanceResult } from "@/modules/calc/refinance";
import { Assumptions, CalcShell, Check, DecimalField, Empty, Figure, Group, MoneyField, Notes, Rows, Stat, TalkCta, aud, n0, yearsMonths } from "./parts";

export type RefinanceCalculatorProps = {
  defaultBalance?: number;
  defaultYearsLeft?: number;
  compact?: boolean;
  title?: React.ReactNode | null;
  className?: string;
};

/**
 * Current loan vs a new loan, with the user's own rates and fees (`calcRefinance`): monthly saving,
 * break-even on switching costs and the difference over the life of the loan.
 */
export function RefinanceCalculator({ defaultBalance, defaultYearsLeft = 25, compact, title, className }: RefinanceCalculatorProps) {
  const [balance, setBalance] = useState<number | null>(defaultBalance ?? null);
  const [yearsLeft, setYearsLeft] = useState<number | null>(defaultYearsLeft);
  const [curRate, setCurRate] = useState<number | null>(null);
  const [newRate, setNewRate] = useState<number | null>(null);
  const [newTerm, setNewTerm] = useState<number | null>(null);
  const [costs, setCosts] = useState<number | null>(null);
  const [curFees, setCurFees] = useState<number | null>(null);
  const [newFees, setNewFees] = useState<number | null>(null);
  const [capitalise, setCapitalise] = useState(false);

  const ready = n0(balance) > 0 && n0(yearsLeft) >= 1 && n0(curRate) > 0 && n0(newRate) > 0;
  const r = useMemo<RefinanceResult | null>(() => {
    if (!ready) return null;
    return calcRefinance({
      balance: n0(balance),
      remainingYears: n0(yearsLeft),
      currentRatePct: n0(curRate),
      newRatePct: n0(newRate),
      newTermYears: n0(newTerm) >= 1 ? n0(newTerm) : undefined,
      switchingCosts: n0(costs),
      currentAnnualFee: n0(curFees),
      newAnnualFee: n0(newFees),
      capitaliseCosts: capitalise,
    });
  }, [ready, balance, yearsLeft, curRate, newRate, newTerm, costs, curFees, newFees, capitalise]);

  const form = (
    <>
      <Group legend="Your current loan">
        <div className="mw-calc__grid mw-calc__grid--2">
          <MoneyField label="Loan balance" value={balance} onChange={setBalance} placeholder="e.g. 520,000" />
          <DecimalField label="Years left" value={yearsLeft} onChange={setYearsLeft} suffix="years" integer min={1} max={40} />
          <DecimalField label="Current interest rate" value={curRate} onChange={setCurRate} suffix="% p.a." placeholder="Your rate" max={30} hint="From your latest statement or app." />
          <MoneyField label="Ongoing fees" value={curFees} onChange={setCurFees} optional suffix="per year" placeholder="0" hint="Annual package fee plus 12 × any monthly fee." />
        </div>
      </Group>
      <Group legend="The new loan">
        <div className="mw-calc__grid mw-calc__grid--2">
          <DecimalField label="New interest rate" value={newRate} onChange={setNewRate} suffix="% p.a." placeholder="Rate offered" max={30} hint="Enter the rate you have been offered. We don't publish rates." />
          <DecimalField label="New loan term" value={newTerm} onChange={setNewTerm} suffix="years" integer min={1} max={40} optional placeholder={n0(yearsLeft) ? String(n0(yearsLeft)) : ""} hint="Leave blank to keep the years you have left." />
          <MoneyField label="Ongoing fees" value={newFees} onChange={setNewFees} optional suffix="per year" placeholder="0" />
          <MoneyField label="Switching costs" value={costs} onChange={setCosts} optional placeholder="0" hint="Discharge fee, any break cost on a fixed loan, new loan fees and government registration fees." />
        </div>
        <Check checked={capitalise} onChange={setCapitalise} label="Add the switching costs to the new loan" hint="Instead of paying them in cash. You then pay interest on them." />
      </Group>
    </>
  );

  let out: React.ReactNode;
  if (!r) {
    out = (
      <>
        <Figure label="Monthly saving" value="$0" muted sub="Enter your balance, the years left and both interest rates." />
        <Empty>Your monthly saving, when switching costs are paid back and the difference over the life of the loan appear here.</Empty>
        <TalkCta />
      </>
    );
  } else {
    const saves = r.monthlySaving > 0;
    out = (
      <>
        <Figure
          label={saves ? "Estimated saving per month" : "Extra cost per month"}
          value={aud(Math.abs(r.monthlySaving))}
          muted={!saves}
          sub={
            saves
              ? r.breakEvenMonths === 0
                ? "No cash costs to pay back."
                : r.breakEvenMonths != null
                  ? `Switching costs paid back after ${yearsMonths(r.breakEvenMonths)}.`
                  : "The saving doesn't cover the switching costs within the new loan term."
              : "At these rates and fees the new loan costs more each month."
          }
        />
        <hr className="mw-calc__rule" />
        <div className="mw-calc__pair">
          <Stat label="Current repayment" value={`${aud(r.currentMonthlyRepayment)}/mth`} />
          <Stat label="New repayment" value={`${aud(r.newMonthlyRepayment)}/mth`} />
        </div>
        <Rows
          rows={[
            { label: "Switching costs", detail: capitalise && r.upfrontCosts > 0 ? "Added to the new loan" : undefined, value: aud(r.upfrontCosts) },
            ...(capitalise && r.upfrontCosts > 0 ? [{ label: "New loan amount", value: aud(r.newLoanAmount) }] : []),
            { label: "Interest over the current loan", value: aud(r.currentTotalInterest) },
            { label: "Interest over the new loan", value: aud(r.newTotalInterest) },
            {
              label: r.lifetimeSaving >= 0 ? "Saving over the life of the loan" : "Extra cost over the life of the loan",
              detail: "Repayments, ongoing fees and cash switching costs",
              value: aud(Math.abs(r.lifetimeSaving)),
              tone: "total" as const,
            },
          ]}
        />
        <Notes items={r.notes.filter((x) => !x.startsWith("Estimate only"))} />
        <TalkCta note="Refinancing is more than the rate. We look at your fixed-rate break costs, features such as an offset account, and whether the new loan suits you, before recommending anything." />
        <Assumptions
          items={[
            "Both loans are principal and interest, with repayments worked out monthly at the rate you enter for the whole term.",
            "Totals are in today's dollars, without allowing for rate changes, inflation or the value of money over time.",
            "Break-even is when the monthly savings add up to the cash switching costs.",
            "The new lender assesses your income, expenses and the property again. Approval is not guaranteed.",
          ]}
        />
      </>
    );
  }

  return <CalcShell className={className} compact={compact} label="Refinance savings calculator" title={title === null ? undefined : (title ?? "Refinance calculator")} form={form} result={out} />;
}
