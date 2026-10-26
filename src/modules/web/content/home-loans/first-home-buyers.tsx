import Link from "next/link";
import { PointGrid } from "../../components/content/PointGrid";
import { Steps } from "../../components/content/Steps";
import { WorkedExampleTable } from "../../components/content/WorkedExampleTable";
import { LinkButton, TextLink } from "../../components/ui/Button";
import { Callout } from "../../components/ui/Callout";
import { PATHS } from "../../config";
import { formatAud } from "../../format";
import type { ServicePageContent } from "./ServicePage";
import { HL_SOURCES as S } from "./sources";

/**
 * Process explainer for first home buyers. Grant, duty and scheme FIGURES live on
 * /first-home-buyers/nsw (rules data with sources); this page deliberately states none of them.
 */
export const firstHomeBuyers: ServicePageContent = {
  path: PATHS.homeLoansFirstHomeBuyers,
  crumbs: [
    { name: "Home loans", path: PATHS.homeLoans },
    { name: "First home buyers", path: PATHS.homeLoansFirstHomeBuyers },
  ],
  metaTitle: "First home buyer loans, step by step",
  metaDescription:
    "How a first home loan works in NSW: budget, pre-approval, exchange, formal approval and settlement, what lenders check and the documents to prepare.",
  eyebrow: "Home loans · First home buyers",
  h1: "Buying your first home: how the loan side works",
  lede: "The loan process from working out a budget to collecting the keys: what happens at each step, what lenders check and what to have ready.",
  serviceName: "First home buyer home loans",
  notice: (
    <Callout tone="note" title="Looking for NSW grants, duty concessions or price caps?">
      <p>
        Thresholds and amounts change, so we keep them on one page with the official source and the date we last checked each rule. This page doesn&rsquo;t repeat them.
      </p>
      <div className="mt-4">
        <LinkButton href={PATHS.firstHomeBuyersNsw} variant="secondary" arrow>
          First home buyers in NSW
        </LinkButton>
      </div>
    </Callout>
  ),
  summary: (
    <p>
      Most first home buyers get pre-approval before making offers, pay a deposit when contracts are exchanged, and receive formal approval once the lender has valued the
      property. With less than 20% of the price saved you will usually pay lenders mortgage insurance (LMI), unless you qualify for the Australian Government&rsquo;s 5% Deposit
      Scheme. Whether you pay transfer duty or receive a grant depends on the price and the type of home.
    </p>
  ),
  sections: [
    {
      id: "steps",
      label: "The steps, in order",
      title: "From savings to settlement in six steps",
      body: <p>The order matters more than the speed. Exchanging contracts (step four) before you have pre-approval (step two) can leave you committed to a property without the finance to buy it.</p>,
      block: (
        <Steps
          items={[
            {
              title: "Work out a budget",
              body: (
                <p>
                  Your budget is the lower of what a lender will lend and what you are comfortable repaying. Add your deposit and subtract the upfront costs. The{" "}
                  <TextLink href={PATHS.borrowingPower}>borrowing power calculator</TextLink>{" "}
                  gives a rough range to start from.
                </p>
              ),
              meta: ["Before you look"],
            },
            {
              title: "Get pre-approval",
              body: "A lender reviews your income, savings and debts and agrees in principle to lend up to an amount. It lasts a limited time and comes with conditions. It is not a final yes, but it tells you your price range is realistic.",
              meta: ["Before you make offers"],
            },
            {
              title: "Choose and check the property",
              body: "Get a building and pest inspection, and a strata report for an apartment or townhouse. Have your conveyancer or solicitor review the contract before you sign. Some lenders restrict lending on very small apartments or certain locations, so check before you commit.",
              meta: ["Before exchange"],
            },
            {
              title: "Exchange contracts",
              body: (
                <p>
                  You sign the contract and pay the deposit. After a private sale in NSW you usually have a 5 business day cooling-off period (10 for off the plan);
                  withdrawing in that time costs 0.25% of the price. There is no cooling-off period at auction.
                </p>
              ),
              meta: ["Exchange day"],
            },
            {
              title: "Formal approval",
              body: "The lender values the property, rechecks your documents and issues unconditional approval. You sign the loan documents, and we confirm the funds needed for settlement with your conveyancer or solicitor.",
              meta: ["Between exchange and settlement"],
            },
            {
              title: "Settlement",
              body: "On the date set in the contract, the lender pays the seller, the mortgage is registered and you collect the keys. Your first repayment is usually due about a month later.",
              meta: ["Settlement day"],
            },
          ]}
        />
      ),
    },
    {
      id: "fit",
      label: "Who this page suits",
      title: "Who this page suits, and who should read something else",
      body: (
        <>
          <p>
            This page is for people buying their first home in Australia to live in. The loan process is much the same everywhere; the concessions are not. In NSW, first home
            buyer concessions come with conditions, including living in the home, so read{" "}
            <Link href={PATHS.firstHomeBuyersNsw}>first home buyers in NSW</Link> before you set a price range.
          </p>
          <ul>
            <li>
              <strong>On a temporary visa?</strong> Different lenders, deposit expectations and FIRB rules apply. Start with{" "}
              <Link href={PATHS.visaHomeLoans}>visa and PR home loans</Link>.
            </li>
            <li>
              <strong>Buying to rent out first?</strong> Lenders treat it as an investment loan, and most first home buyer concessions won&rsquo;t apply. See{" "}
              <Link href={PATHS.investmentLoans}>investment loans</Link>.
            </li>
            <li>
              <strong>Building rather than buying?</strong> The money is paid in stages. See <Link href={PATHS.constructionLoans}>construction loans</Link>.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "lenders",
      label: "What lenders look at",
      title: "What lenders check on a first home loan",
      block: (
        <PointGrid
          items={[
            {
              title: "Genuine savings",
              body: "Many lenders want to see part of the deposit saved by you over several months, not only received as a lump sum. Some accept a record of rent paid on time, or a documented gift, instead.",
            },
            {
              title: "Stable income",
              body: "A year or more in the same job is simplest. Probation periods, casual work and recent job changes are often fine with the right lender, but need more evidence.",
            },
            {
              title: "Spending and debts",
              body: "Lenders read your bank statements. Card limits, buy now pay later accounts, car loans and HECS-HELP repayments all reduce what they will lend.",
            },
            {
              title: "The valuation",
              body: "Lenders generally lend against the lower of the price and their own valuation. If the valuation comes in under the price, you make up the gap.",
            },
            {
              title: "Your residency",
              body: "Citizens and permanent residents have the widest choice. Temporary visa holders face fewer lenders and are not eligible for the 5% Deposit Scheme.",
            },
            {
              title: "Your credit file",
              body: "Defaults, late repayments and a cluster of recent credit applications all show up. Check your file before you apply so nothing surprises you.",
            },
          ]}
        />
      ),
    },
    {
      id: "example",
      label: "Worked example",
      title: "Worked example: a $700,000 apartment with three deposit sizes",
      body: <p>The same apartment, bought with a 5%, 10% or 20% deposit. The deposit changes the loan size, the LVR and whether LMI applies.</p>,
      block: (
        <WorkedExampleTable
          caption="Deposit, loan and LVR on a $700,000 purchase"
          rowHeader="Item"
          columns={[
            { key: "five", label: "5% deposit", numeric: true },
            { key: "ten", label: "10% deposit", numeric: true },
            { key: "twenty", label: "20% deposit", numeric: true },
          ]}
          rows={[
            { label: "Purchase price", cells: { five: formatAud(700000), ten: formatAud(700000), twenty: formatAud(700000) } },
            { label: "Deposit", cells: { five: formatAud(35000), ten: formatAud(70000), twenty: formatAud(140000) } },
            { label: "Loan amount", cells: { five: formatAud(665000), ten: formatAud(630000), twenty: formatAud(560000) } },
            { label: "Loan-to-value ratio (LVR)", cells: { five: "95%", ten: "90%", twenty: "80%" } },
            { label: "LMI likely?", cells: { five: "Yes*", ten: "Yes", twenty: "No" }, total: true },
          ]}
          assumptions={[
            "Owner-occupier buying an established apartment in NSW; the lender’s valuation equals the price.",
            "* Not if you are eligible for, and buy under, the Australian Government 5% Deposit Scheme.",
            "LMI premiums are not shown. The insurer sets them, and they rise as the LVR rises.",
            "Duty and grants are not shown because they depend on the price, the property and your eligibility. Our NSW first home buyer guide has the current rules.",
            "No interest rates are assumed.",
          ]}
        />
      ),
      after: (
        <>
          <p>
            Two things stand out. Moving from a 10% to a 20% deposit removes LMI, but needs another {formatAud(70000)} in savings. And at 95% the loan is {formatAud(105000)}{" "}
            larger than at 80%, which you pay interest on for as long as it is owed.
          </p>
          <p>
            Neither is automatically the wrong choice. Some people are better off buying sooner with a smaller deposit; others are better off waiting. We run both versions
            with you so the trade-off is visible, and get an actual LMI quote rather than guessing.
          </p>
        </>
      ),
    },
    {
      id: "documents",
      label: "Documents",
      title: "Documents to have ready",
      body: (
        <>
          <h3>Identity and residency</h3>
          <ul>
            <li>Passport and driver licence (or another photo ID).</li>
            <li>If you are not an Australian citizen: your visa grant notice and a current VEVO check.</li>
          </ul>
          <h3>Income</h3>
          <ul>
            <li>Your two most recent payslips.</li>
            <li>Your latest PAYG payment summary, or the income statement from your myGov account.</li>
            <li>An employment letter if you are on probation, recently started or paid by contract.</li>
          </ul>
          <h3>Savings and debts</h3>
          <ul>
            <li>Statements for every account holding your deposit, usually covering the last three months.</li>
            <li>A signed gift letter, plus the transfer record, if family is contributing.</li>
            <li>Statements for credit cards, buy now pay later accounts and any car or personal loan, and your HECS-HELP balance from myGov.</li>
          </ul>
          <h3>Once you have a property</h3>
          <ul>
            <li>The signed contract of sale and the receipt for your deposit.</li>
            <li>Any grant or concession forms that apply to you (listed on the NSW guide).</li>
          </ul>
        </>
      ),
    },
    {
      id: "mistakes",
      label: "Common mistakes",
      title: "Mistakes that cost first home buyers time or money",
      body: (
        <ol>
          <li>
            <strong>Treating pre-approval as final approval.</strong> The lender still has to value the property and recheck your documents.
          </li>
          <li>
            <strong>Bidding at auction without finance lined up.</strong> An auction contract has no cooling-off period and no finance condition.
          </li>
          <li>
            <strong>Changing jobs or taking on new credit before settlement.</strong> A new card, a car loan or even a phone plan on credit can change the lender&rsquo;s
            assessment.
          </li>
          <li>
            <strong>Budgeting for the deposit only.</strong> Conveyancing, inspections, any duty, moving costs, strata levies and council rates all arrive around settlement.
          </li>
          <li>
            <strong>Moving family money without a paper trail.</strong> Keep the gift letter and every transfer record, especially for money sent from overseas.
          </li>
          <li>
            <strong>Applying to several lenders at once.</strong> Each application is recorded on your credit file.
          </li>
        </ol>
      ),
    },
  ],
  faqTitle: "Questions first home buyers ask",
  faq: [
    {
      question: "How much deposit do I need for my first home?",
      answer:
        "With 20% of the price, most lenders won’t charge LMI. Many lenders will lend with 5% to 10% if you pay LMI. The Australian Government 5% Deposit Scheme lets eligible first home buyers buy with a 5% deposit without LMI, within property price caps. Remember to keep money aside for upfront costs as well.",
    },
    {
      question: "What is LMI, and can I avoid it?",
      answer:
        "Lenders mortgage insurance is a one-off premium charged when you borrow more than 80% of the property’s value. It protects the lender, not you, and can usually be added to the loan. You avoid it with a 20% deposit, by qualifying for the 5% Deposit Scheme, or with a lender that waives it for certain professions.",
    },
    {
      question: "How long does pre-approval last?",
      answer:
        "It depends on the lender, and is often around three months. If it lapses before you buy, the lender reassesses you with updated payslips and statements, so keep your finances steady while you search.",
    },
    {
      question: "Do I need a conveyancer or a solicitor?",
      answer:
        "In NSW either can do the legal work. They review the contract before you exchange, handle searches and certificates, and arrange settlement with the lender. Get a quote at the start so the fee is in your budget.",
    },
    {
      question: "What happens if the valuation is lower than the price?",
      answer:
        "The lender lends against its valuation, so you cover the difference. You can add more savings, renegotiate the price if the contract allows, or accept a higher LVR, which may bring in LMI. Some lenders will value a property before you exchange, which reduces the risk.",
    },
    {
      question: "Can my parents help without giving me money?",
      answer:
        "Some lenders accept a family guarantee, where a parent offers part of their own property’s equity as extra security. It can remove the need for LMI, but it puts their property at risk if you can’t repay. Your parents should get their own legal advice before agreeing.",
    },
  ],
  cta: {
    title: "Plan your first purchase with Sulav",
    body: "Bring rough figures for your income, savings and debts. You leave with a borrowing range, a documents list and the next step.",
  },
  related: [
    { href: PATHS.firstHomeBuyersNsw, title: "First home buyers in NSW", description: "Grants, transfer duty concessions and the 5% Deposit Scheme, with sources and check dates." },
    { href: PATHS.borrowingPower, title: "Borrowing power calculator", description: "An estimate of what lenders may lend you." },
    { href: PATHS.stampDutyNsw, title: "NSW stamp duty calculator", description: "Transfer duty, including first home buyer concessions." },
  ],
  sources: [S.nswCoolingOff, S.scheme5pc, S.lmi],
};
