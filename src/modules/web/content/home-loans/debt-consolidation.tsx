import Link from "next/link";
import { PointGrid } from "../../components/content/PointGrid";
import { WorkedExampleTable } from "../../components/content/WorkedExampleTable";
import { TextLink } from "../../components/ui/Button";
import { Callout } from "../../components/ui/Callout";
import { PATHS } from "../../config";
import { formatAud } from "../../format";
import type { ServicePageContent } from "./ServicePage";
import { HL_SOURCES as S } from "./sources";

export const debtConsolidation: ServicePageContent = {
  path: PATHS.debtConsolidation,
  crumbs: [
    { name: "Home loans", path: PATHS.homeLoans },
    { name: "Debt consolidation", path: PATHS.debtConsolidation },
  ],
  metaTitle: "Debt consolidation into your home loan",
  metaDescription:
    "Rolling credit cards and personal loans into your home loan can lower repayments but cost more overall. How it works, when it helps and when it doesn’t.",
  eyebrow: "Home loans · Debt consolidation",
  h1: "Debt consolidation: rolling other debts into your home loan",
  lede: "Debt consolidation means using your home loan to pay out debts such as credit cards, personal loans and car loans, so you make one repayment instead of several. It often makes the monthly budget easier. It can also turn a four-year debt into a thirty-year one.",
  serviceName: "Debt consolidation home loans",
  summary: (
    <p>
      Consolidating usually lowers your total repayments each month, because home loans generally carry lower rates and run for much longer. But spreading a short-term debt
      over 25 or 30 years can mean paying more interest overall, even at a lower rate. It tends to work when you keep paying close to your old repayment amount, close the cards
      you paid off, and have equity below 80% of the property&rsquo;s value.
    </p>
  ),
  sections: [
    {
      id: "trade-off",
      label: "The trade-off",
      title: "The honest trade-off",
      body: (
        <>
          <p>
            Moneysmart, the government&rsquo;s money guidance service, makes the point plainly: moving a credit card or personal loan onto a long home loan means you can still pay
            more in interest and fees over time, even at a lower rate. The saving is real each month. Whether it is real overall depends on how quickly you pay the money back.
          </p>
          <p>
            Here is what changes for a household with {formatAud(52000)} of other debts and a home valued at {formatAud(800000)}.
          </p>
        </>
      ),
      block: (
        <WorkedExampleTable
          caption="Before and after consolidating $52,000"
          rowHeader="Item"
          columns={[
            { key: "before", label: "Before", numeric: true },
            { key: "after", label: "After", numeric: true },
          ]}
          rows={[
            { label: "Home loan balance", cells: { before: formatAud(560000), after: formatAud(612000) } },
            { label: "Credit card", cells: { before: formatAud(12000), after: formatAud(0) } },
            { label: "Personal loan (3 years left)", cells: { before: formatAud(18000), after: formatAud(0) } },
            { label: "Car loan (4 years left)", cells: { before: formatAud(22000), after: formatAud(0) } },
            { label: "Total owed", cells: { before: formatAud(612000), after: formatAud(612000) } },
            { label: "LVR on an $800,000 home", cells: { before: "70.0%", after: "76.5%" } },
            { label: "Separate repayments", cells: { before: "4", after: "1" } },
            { label: "Time to clear the $52,000", cells: { before: "3–4 years*", after: "Up to 30 years" }, total: true },
          ]}
          assumptions={[
            "* The credit card has no fixed end date; the loans have three and four years left.",
            "The home loan is variable, so there is no break cost. Refinance fees are not included.",
            "The new LVR stays under 80%, so LMI would not usually apply.",
            "No interest rates are assumed. To compare repayments, use the repayments calculator.",
          ]}
        />
      ),
      after: (
        <p>
          On day one the total debt is the same. What changes is how long you take to repay it. If you keep paying the difference between your old repayments and your new one
          into the home loan, the {formatAud(52000)} is cleared on a timeline close to the original debts, and at a lower rate. If you drop to the new, lower repayment and leave it
          there, those debts stay in your mortgage for as long as the mortgage does. Test both with the <Link href={PATHS.repayments}>repayments calculator</Link>.
        </p>
      ),
    },
    {
      id: "fit",
      label: "When it helps",
      title: "When consolidating helps, and when it doesn’t",
      body: (
        <>
          <h3>Can help when</h3>
          <ul>
            <li>Your income is steady and you are up to date on all repayments.</li>
            <li>The debts carry much higher rates than your home loan.</li>
            <li>The new loan stays under 80% of the property&rsquo;s value.</li>
            <li>You will close the paid-off cards and keep making extra repayments.</li>
          </ul>
          <h3>Usually the wrong tool when</h3>
          <ul>
            <li>You are already behind on repayments. Ask your lenders about a hardship arrangement first (see below).</li>
            <li>The spending that created the debt hasn&rsquo;t changed. The cards fill up again, on top of a bigger mortgage.</li>
            <li>The extra borrowing would push you over 80% and add LMI to a small debt.</li>
            <li>The debts are nearly paid off. Consolidating a loan with six months left mostly adds cost.</li>
            <li>Your home loan is fixed and the break cost outweighs the benefit.</li>
          </ul>
        </>
      ),
      aside: (
        <Callout tone="warning" title="Behind on repayments now?">
          <p>
            Talk to your lenders before consolidating. You can ask for a hardship variation, such as a change to your repayments or loan term, and the lender must respond. A
            financial counsellor from the National Debt Helpline on <TextLink href="tel:1800007007">1800 007 007</TextLink> can help you work out the options; they don&rsquo;t charge and
            don&rsquo;t sell loans. Our <TextLink href={PATHS.hardship}>financial hardship</TextLink> page has more.
          </p>
        </Callout>
      ),
    },
    {
      id: "lenders",
      label: "What lenders look at",
      title: "What lenders look at on a consolidation",
      block: (
        <PointGrid
          items={[
            {
              title: "How the debts built up",
              body: "Lenders must check your financial situation, and they read your bank statements. Repeated late payments, short-term loans or gambling transactions lead to questions.",
            },
            {
              title: "Proof of each debt",
              body: "A recent statement or payout letter for every debt. The lender usually pays them out directly at settlement, rather than giving you the cash.",
            },
            {
              title: "Closing the accounts",
              body: "Most lenders require the cards and loans being paid out to be closed, and some ask for confirmation once they are.",
            },
            {
              title: "The new LVR",
              body: "Adding debt to the home loan raises the LVR. Above 80%, LMI usually applies, and some lenders limit how much they will lend to pay out other debts.",
            },
            {
              title: "Repayments on the new loan",
              body: "The lender assesses the new, larger loan in full, using APRA’s buffer of at least 3 percentage points above the loan’s rate.",
            },
            {
              title: "Your credit file",
              body: "Defaults and arrears count against you. A file with several recent credit applications also suggests pressure on your budget.",
            },
          ]}
        />
      ),
    },
    {
      id: "documents",
      label: "Documents",
      title: "Documents to have ready",
      body: (
        <ul>
          <li>The latest statement for each debt you want to consolidate: credit cards, personal loans, car loans, buy now pay later. It should show the account number and balance.</li>
          <li>A payout letter for any fixed-term loan, which shows the payout figure and any early repayment fee.</li>
          <li>For a car loan with a balloon payment: the contract, so the balloon amount is included in the payout.</li>
          <li>Home loan statements for the last six months.</li>
          <li>Your two most recent payslips and your myGov income statement, or tax returns and notices of assessment if self-employed.</li>
          <li>Statements for your everyday accounts. Lenders look at spending as well as income.</li>
        </ul>
      ),
    },
    {
      id: "mistakes",
      label: "Common mistakes",
      title: "Common consolidation mistakes",
      body: (
        <ol>
          <li>
            <strong>Keeping the cards open &lsquo;just in case&rsquo;.</strong> An open card with a full limit makes it easy to end up with the bigger mortgage and new card debt.
          </li>
          <li>
            <strong>Dropping to the new, lower repayment.</strong> Set the home loan repayment close to what you were paying in total before.
          </li>
          <li>
            <strong>Ignoring early repayment fees.</strong> Some personal and car loans charge to pay out early. Get the payout letter before deciding.
          </li>
          <li>
            <strong>Forgetting a balloon.</strong> A car loan with a balloon payment can owe much more than the regular repayments suggest.
          </li>
          <li>
            <strong>Consolidating instead of asking for hardship help.</strong> If you are already behind, more borrowing can make things worse.
          </li>
        </ol>
      ),
    },
  ],
  faqTitle: "Questions about debt consolidation",
  faq: [
    {
      question: "Will consolidating my debts save me money?",
      answer:
        "It usually lowers your total repayments each month. Whether it saves money overall depends on how fast you repay the consolidated amount. Spread over 30 years it can cost more in interest than the original debts, even at a lower rate. Paying extra into the home loan each month is what makes the saving real.",
    },
    {
      question: "What does it cost to consolidate debts into my home loan?",
      answer:
        "If you stay with your current lender, a top-up may involve a variation or valuation fee. If you refinance to a new lender, the usual switching costs apply: discharge fee, government registration fees and the new lender’s fees. Add LMI if the new loan is above 80% of the property’s value, and any early repayment fees on the debts being paid out.",
    },
    {
      question: "Can I consolidate if my home loan is fixed?",
      answer:
        "Breaking the fixed rate may trigger a break cost. Sometimes the extra amount can be added as a separate variable split with your current lender, leaving the fixed part untouched. We check both options.",
    },
    {
      question: "I’m already behind on my repayments. Should I consolidate?",
      answer:
        "Talk to your lenders first. You can ask for a hardship variation to change your repayments or loan term, and the lender must assess the request. A financial counsellor from the National Debt Helpline (1800 007 007) can help you weigh up the options.",
    },
    {
      question: "Can I include a tax debt?",
      answer:
        "Some lenders will pay out an ATO debt as part of a consolidation, and others won’t. Most want to see the ATO statement and any payment arrangement, and that it is up to date.",
    },
    {
      question: "Will consolidating affect my credit file?",
      answer:
        "The new application appears as an enquiry. Closing the paid-off cards and loans reduces your total credit limits, which can help future applications.",
    },
  ],
  cta: {
    title: "Run the numbers with Sulav before you decide",
    body: "Bring the latest statement for each debt. We show you both versions: the lower repayment, and what it costs if you don’t pay extra.",
  },
  related: [
    { href: PATHS.repayments, title: "Repayments calculator", description: "Compare repayments and total interest over different terms." },
    { href: PATHS.refinancing, title: "Refinancing", description: "Switching lenders, and the costs of switching." },
    { href: PATHS.hardship, title: "Financial hardship", description: "What to do if you are struggling with repayments." },
  ],
  sources: [S.debtConsolidation, S.hardship, S.ndh, S.asicRg209, S.apraBuffer, S.lmi],
};
