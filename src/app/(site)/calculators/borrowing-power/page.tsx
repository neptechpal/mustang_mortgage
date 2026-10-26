import { getSetting } from "@/lib/settings";
import { BORROW_DEFAULTS, TAX_2026_27, livingBenchmarks, type BorrowAssumptions } from "@/modules/calc/borrowing";
import { BorrowingCalculator } from "@/modules/web/calculators";
import { CtaBand } from "@/modules/web/components/content/CtaBand";
import { Disclaimer } from "@/modules/web/components/content/Disclaimer";
import { Faq, type FaqEntry } from "@/modules/web/components/content/Faq";
import { PageIntro } from "@/modules/web/components/content/PageIntro";
import { PointGrid } from "@/modules/web/components/content/PointGrid";
import { Sources } from "@/modules/web/components/content/Sources";
import { WorkedExampleTable } from "@/modules/web/components/content/WorkedExampleTable";
import { TextLink } from "@/modules/web/components/ui/Button";
import { Section } from "@/modules/web/components/ui/Section";
import { PATHS } from "@/modules/web/config";
import { formatAud, formatDate } from "@/modules/web/format";
import { JsonLd, buildMetadata, webAppJsonLd } from "@/modules/web/seo";

const TITLE = "Borrowing power calculator";
const DESCRIPTION =
  "Estimate how much you could borrow for a home loan from your income, living costs and debts, tested the way lenders test it. Uses 2026-27 tax rates and your own interest rate.";

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATHS.borrowingPower });
// Assumptions are shared with the staff borrowing tool (crm-extra settings key below). Refresh every 10 minutes.
export const revalidate = 600;

const BORROW_SETTINGS_KEY = "crmx.borrow.settings";

async function assumptions(): Promise<Partial<BorrowAssumptions>> {
  const saved = await getSetting<Partial<BorrowAssumptions> | null>(BORROW_SETTINGS_KEY, null).catch(() => null);
  // Never pass a product rate to the public calculator.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { product_rate, ...rest } = saved ?? {};
  return rest;
}

const faq = (S: BorrowAssumptions): FaqEntry[] => [
  {
    question: "Why is my borrowing power lower than I expected?",
    answer: `Lenders don't test your repayments at the rate you will pay. They add a buffer (the calculator uses ${S.buffer_percent} percentage points) or use a minimum test rate, whichever is higher. They also count credit card limits rather than balances, and use a living-expense benchmark if your own figure is lower.`,
  },
  {
    question: "Do credit cards reduce how much I can borrow?",
    answer:
      "Yes, even if you pay them off every month. Lenders count a monthly repayment on the full limit, so reducing or closing cards you don't use can lift your borrowing power.",
  },
  {
    question: "Does my visa change what I can borrow?",
    answer:
      "It can change which lenders will consider you, how much deposit they want and how they treat your income, rather than the maths here. Temporary residents also need FIRB approval and pay stamp duty surcharges in most states.",
  },
  {
    question: "Can overtime, bonuses or rental income count?",
    answer: `Usually in part. Lenders often count only some of your overtime, bonus or commission, and only part of rental income, and they may want a history of it. The calculator counts ${S.bonus_shade_pct}% of overtime and bonuses and ${S.rent_shade_pct}% of rent.`,
  },
  {
    question: "How accurate is this estimate?",
    answer:
      "It is a starting point. Each lender has its own income rules, living-expense measures and limits on debt-to-income, so two lenders can give quite different answers for the same person. At a consultation we compare the lenders on our panel for your situation.",
  },
];

export default async function BorrowingPowerPage() {
  const S = { ...BORROW_DEFAULTS, ...(await assumptions()) };
  const bench = livingBenchmarks(S);
  return (
    <>
      <JsonLd data={webAppJsonLd({ path: PATHS.borrowingPower, name: TITLE, description: DESCRIPTION })} />
      <PageIntro
        crumbs={[
          { name: "Calculators", path: PATHS.calculators },
          { name: "Borrowing power", path: PATHS.borrowingPower },
        ]}
        eyebrow="Calculator"
        title={TITLE}
        lede="An estimate of how much a lender may lend you, from your income, living costs and debts. Enter a rate you have been quoted; the calculator tests it the way lenders do."
      />

      <Section id="calculator" size="tight" className="mw-calcsection" aria-label={TITLE}>
        <BorrowingCalculator assumptions={S} title={null} />
      </Section>

      <Section
        id="how"
        tone="white"
        layout="split"
        index="01"
        eyebrow="How it works"
        title="How lenders work out what you can borrow"
        lede="Every lender asks the same question: after tax, living costs and your other debts, could you still make the repayments if rates rose?"
      >
        <PointGrid
          items={[
            { title: "Income after tax", body: `Salary at full value; overtime, bonus and commission at ${S.bonus_shade_pct}%; rent at ${S.rent_shade_pct}%. Tax uses the ${TAX_2026_27.incomeYear} resident rates and the ${TAX_2026_27.medicareLevyPct}% Medicare levy.` },
            { title: "Living costs", body: "The higher of what you spend and a benchmark for your household. Lenders use their own measures, often the Household Expenditure Measure (HEM)." },
            { title: "Other debts", body: `Card limits at ${S.cc_assess_pct}% a month, car and personal loan repayments, HECS-HELP, child support and any other home loans.` },
            { title: "A higher test rate", body: `Your rate plus ${S.buffer_percent} percentage points, or ${S.floor_rate}% if that is higher. What is left each month sets the loan size.` },
          ]}
        />
      </Section>

      <Section id="benchmarks" layout="split" index="02" eyebrow="Assumptions" title="The living-cost benchmarks we use" lede="Indicative figures only. They are our own simplified benchmarks, not the Household Expenditure Measure that lenders licence, and lenders' figures can be higher.">
        <WorkedExampleTable
          caption="Indicative monthly living costs by household"
          rowHeader="Household"
          columns={[{ key: "m", label: "Per month", numeric: true }]}
          rows={bench.map((b) => ({ label: b.label, cells: { m: formatAud(b.monthly) } }))}
          assumptions={[
            "Used only when your own living-expense figure is lower.",
            "Repayments on debts are not part of the benchmark; they are entered separately.",
            `Income tax: ${TAX_2026_27.incomeYear} resident rates (${TAX_2026_27.brackets
              .filter((b) => b.ratePct > 0)
              .map((b) => `${b.ratePct}% from ${formatAud(b.over + 1)}`)
              .join(", ")}) plus the ${TAX_2026_27.medicareLevyPct}% Medicare levy, no offsets. Checked ${formatDate(TAX_2026_27.verifiedAt)}.`,
          ]}
        />
        <p className="mw-small" style={{ marginTop: 20 }}>
          <TextLink href={PATHS.visaHomeLoans} arrow>
            How lenders look at visa holders
          </TextLink>
        </p>
      </Section>

      <Section id="faq" tone="white" layout="split" index="03" eyebrow="Questions" title="Borrowing power questions">
        <Faq items={faq(S)} />
      </Section>

      <Section id="sources-section" size="tight" aria-label="Sources and disclaimer">
        <div className="mw-flow" style={{ maxWidth: 860 }}>
          <Sources
            items={[
              { title: "Treasury Laws Amendment (More Cost of Living Relief) Act 2025, Schedule 1 (2026-27 resident tax rates)", publisher: "Federal Register of Legislation", url: TAX_2026_27.sourceUrls[0], checkedAt: TAX_2026_27.verifiedAt },
              { title: "Tax rates: Australian residents", publisher: "Australian Taxation Office", url: TAX_2026_27.sourceUrls[1], checkedAt: TAX_2026_27.verifiedAt },
            ]}
          />
          <Disclaimer variant="calculator" />
        </div>
      </Section>

      <CtaBand title="Get a borrowing range checked against real lenders" />
    </>
  );
}
