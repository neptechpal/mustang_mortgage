import Link from "next/link";
import { Callout } from "@/modules/web/components/ui/Callout";
import { WorkedExampleTable } from "@/modules/web/components/content/WorkedExampleTable";
import { PATHS } from "@/modules/web/config";
import { formatAud } from "@/modules/web/format";
import { LearnPage, learnMetadata } from "@/modules/web/learn/LearnPage";

const DESCRIPTION = "How an offset account works, a worked dollar example, how it differs from redraw, and what to check before you choose one.";
export const metadata = learnMetadata({ title: "Offset accounts, simply explained", description: DESCRIPTION, path: PATHS.learnOffset });

export default function OffsetAccountsPage() {
  return (
    <LearnPage
      path={PATHS.learnOffset}
      crumbTitle="Offset accounts"
      h1="Offset accounts, simply explained"
      lede="An offset account is an everyday bank account that is linked to your home loan. The money in it cuts the interest you pay, and it is still your money to spend."
      description={DESCRIPTION}
      summaryTitle="The short version"
      summary={
        <p>
          Every day, the lender takes your offset balance away from your loan balance and charges interest only on what is left. Savings of {formatAud(40000)} against a{" "}
          {formatAud(600000)} loan means you pay interest on {formatAud(560000)}. You do not hand the money over, so you can still use it.
        </p>
      }
      sections={[
        {
          id: "how",
          label: "How it works",
          title: "How an offset account works",
          body: (
            <>
              <p>
                You open the offset account with the same lender as your loan and link the two. Your pay can go in, your bills can come out, and you can use a card on it, just like
                any transaction account.
              </p>
              <p>
                Interest on a home loan is worked out on the balance you owe. With an offset, the lender subtracts the offset balance first. The loan balance itself does not
                change. You just pay interest on less of it, so more of each repayment goes towards the loan itself.
              </p>
            </>
          ),
          block: (
            <WorkedExampleTable
              caption="A $600,000 loan with $40,000 in the offset account"
              rowHeader="Item"
              columns={[
                { key: "no", label: "No offset", numeric: true },
                { key: "yes", label: "With offset", numeric: true },
              ]}
              rows={[
                { label: "Loan balance", cells: { no: formatAud(600000), yes: formatAud(600000) } },
                { label: "Offset balance", cells: { no: "—", yes: formatAud(40000) } },
                { label: "Interest is charged on", cells: { no: formatAud(600000), yes: formatAud(560000) } },
                { label: "Interest for a year at 6%", cells: { no: formatAud(36000), yes: formatAud(33600) } },
                { label: "Interest saved in a year", cells: { no: "—", yes: formatAud(2400) }, total: true },
              ]}
            />
          ),
          after: (
            <p>
              The 6% is only there to show the arithmetic. It is not a current rate. The rule of thumb works at any rate: <strong>interest saved a year is roughly your offset
              balance multiplied by your interest rate</strong>.
            </p>
          ),
        },
        {
          id: "vs-redraw",
          label: "Offset or redraw",
          title: "Offset account or redraw: what is the difference?",
          body: <p>Both help you save interest. They work differently, and the difference matters when you need the money back.</p>,
          block: (
            <WorkedExampleTable
              caption="How an offset account and redraw usually compare"
              rowHeader="Feature"
              columns={[
                { key: "offset", label: "Offset account" },
                { key: "redraw", label: "Redraw" },
              ]}
              rows={[
                { label: "Where your money sits", cells: { offset: "In a separate account linked to the loan", redraw: "Inside the loan, as extra repayments you have made" } },
                { label: "Your loan balance", cells: { offset: "Stays the same", redraw: "Goes down as you pay extra" } },
                { label: "Getting at the money", cells: { offset: "Like any bank account: card, transfer, BPAY", redraw: "You ask the lender to release it; limits or fees may apply" } },
                { label: "Usually offered on", cells: { offset: "Variable rate loans, sometimes with a package fee", redraw: "Most variable loans; often limited on fixed loans" } },
              ]}
            />
          ),
          after: (
            <Callout tone="note" title="If the loan is for an investment property">
              <p>How you use redraw or an offset can change which interest is tax deductible. Check with a tax professional before you move money around.</p>
            </Callout>
          ),
        },
        {
          id: "who",
          label: "Who it suits",
          title: "Who an offset account suits",
          body: (
            <>
              <p>An offset account tends to be worth it when you regularly hold a cash balance, for example:</p>
              <ul>
                <li>savings you want to keep within reach, such as an emergency buffer</li>
                <li>money set aside for tax, renovations or school fees</li>
                <li>your pay, before the bills come out</li>
              </ul>
              <p>
                It does less if your balance is usually close to zero. Compare the cost as well: some loans with an offset carry an annual package fee or a different rate. A saving of{" "}
                {formatAud(2400)} a year is worth less if fees take a large part of it.
              </p>
            </>
          ),
        },
        {
          id: "check",
          label: "What to check",
          title: "What to check before you choose one",
          body: (
            <ul>
              <li>
                <strong>100% or partial.</strong> A 100% offset counts every dollar. A partial offset counts only part of the balance.
              </li>
              <li>
                <strong>Fixed loans.</strong> Many fixed loans do not offer an offset, or offer one with limits. See <Link href={PATHS.fixedVsVariable}>fixed or variable</Link>.
              </li>
              <li>
                <strong>Fees.</strong> Ask about annual or package fees and whether the loan rate is higher than a loan without an offset.
              </li>
              <li>
                <strong>Refinancing.</strong> If you move lenders, the offset account closes with the loan, so you set up a new one.
              </li>
            </ul>
          ),
        },
      ]}
    />
  );
}
