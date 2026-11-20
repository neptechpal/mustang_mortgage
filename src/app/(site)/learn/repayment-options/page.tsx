import Link from "next/link";
import { Callout } from "@/modules/web/components/ui/Callout";
import { WorkedExampleTable } from "@/modules/web/components/content/WorkedExampleTable";
import { PATHS } from "@/modules/web/config";
import { LearnPage, learnMetadata } from "@/modules/web/learn/LearnPage";

const DESCRIPTION = "Principal and interest or interest-only, monthly or fortnightly, extra repayments and loan term: how each choice changes what you pay.";
export const metadata = learnMetadata({ title: "Ways to repay your home loan", description: DESCRIPTION, path: PATHS.learnRepayments });

export default function RepaymentOptionsPage() {
  return (
    <LearnPage
      path={PATHS.learnRepayments}
      crumbTitle="Ways to repay"
      h1="Ways to repay your home loan"
      lede="Four choices shape how fast your loan shrinks and how much interest you pay: the repayment type, how often you pay, whether you pay extra, and the length of the loan."
      description={DESCRIPTION}
      summaryTitle="The short version"
      summary={
        <p>
          Most borrowers pay principal and interest, so the loan shrinks with every repayment. Paying a little extra, or paying fortnightly at half the monthly amount, shortens the
          loan and cuts the interest. A longer term lowers each repayment but costs more in interest overall.
        </p>
      }
      sections={[
        {
          id: "pi",
          label: "Principal and interest",
          title: "Principal and interest (P&I)",
          body: (
            <>
              <p>
                Each repayment covers the interest for the period and the rest reduces the loan. Early on, interest is the larger part because the balance is highest. Over the years the
                balance falls, interest shrinks, and more of each repayment goes to the loan.
              </p>
              <p>
                You can watch this happen in the <Link href={PATHS.loanExplorer}>loan explorer</Link>: drag the year slider and see the split change.
              </p>
            </>
          ),
        },
        {
          id: "io",
          label: "Interest-only",
          title: "Interest-only",
          body: (
            <>
              <p>
                With an interest-only period you pay just the interest, usually for a few years, commonly up to five. Repayments are lower during that time, but the loan balance does
                not fall.
              </p>
              <p>
                When the period ends, the same balance has to be repaid over the years that remain, so repayments step up. Over the whole loan you usually pay more interest. Some
                investors choose interest-only for cash flow and tax reasons, so check the tax side with a tax professional.
              </p>
            </>
          ),
          block: (
            <WorkedExampleTable
              caption="Principal and interest compared with interest-only"
              rowHeader="Feature"
              columns={[
                { key: "pi", label: "Principal and interest" },
                { key: "io", label: "Interest-only" },
              ]}
              rows={[
                { label: "Repayments at the start", cells: { pi: "Higher", io: "Lower" } },
                { label: "Loan balance during the period", cells: { pi: "Falls every repayment", io: "Stays the same" } },
                { label: "When the period ends", cells: { pi: "No change", io: "Repayments rise" } },
                { label: "Total interest over the loan", cells: { pi: "Lower", io: "Usually higher" } },
              ]}
            />
          ),
        },
        {
          id: "frequency",
          label: "How often you pay",
          title: "Monthly, fortnightly or weekly",
          body: (
            <>
              <p>
                Interest is normally worked out daily, so paying a little more often makes only a small difference by itself. The real gain comes from the calendar: there are 12 months
                in a year but 26 fortnights.
              </p>
              <p>
                If you pay half the monthly amount every fortnight, you make 26 half-payments, which equals <strong>13 monthly payments</strong> a year instead of 12. That one extra
                month of repayments each year shortens the loan.
              </p>
            </>
          ),
          after: (
            <p>
              Not every lender sets fortnightly repayments this way, so ask how yours are calculated. The{" "}
              <Link href={PATHS.repayments}>repayments calculator</Link> can compare the options.
            </p>
          ),
        },
        {
          id: "extra",
          label: "Extra repayments",
          title: "Paying extra",
          body: (
            <>
              <p>
                Extra money goes straight off the balance, so you stop paying interest on it for the rest of the loan. Small amounts add up over a long loan. In the{" "}
                <Link href={PATHS.loanExplorer}>loan explorer</Link>, try moving the &ldquo;extra each month&rdquo; slider and watch the payoff time and total interest change.
              </p>
              <ul>
                <li>Round your repayment up to the next hundred.</li>
                <li>Keep paying the old amount if your lender lowers your repayment after a rate cut.</li>
                <li>Add a lump sum when you receive a bonus or tax refund.</li>
              </ul>
            </>
          ),
          after: (
            <Callout tone="note" title="Check your loan first">
              <p>
                Many fixed rate loans cap extra repayments each year. Variable loans usually allow them. See <Link href={PATHS.fixedVsVariable}>fixed or variable</Link> and{" "}
                <Link href={PATHS.learnOffset}>offset accounts</Link> for other ways to cut interest.
              </p>
            </Callout>
          ),
        },
        {
          id: "term",
          label: "Loan term",
          title: "The length of the loan",
          body: (
            <p>
              A 30-year loan has lower repayments than a 25-year loan on the same amount, but you pay interest for five more years, so the total interest is higher. Some people take the
              longer term for flexibility, then pay extra when they can. Slide the term in the <Link href={PATHS.loanExplorer}>loan explorer</Link> to see the effect.
            </p>
          ),
        },
        {
          id: "hard",
          label: "If repayments get hard",
          title: "If repayments become hard to meet",
          body: (
            <p>
              Tell your lender early. They have options for people in difficulty. See <Link href={PATHS.hardship}>financial hardship</Link> for what you can ask for and where to get
              free help.
            </p>
          ),
        },
      ]}
    />
  );
}
