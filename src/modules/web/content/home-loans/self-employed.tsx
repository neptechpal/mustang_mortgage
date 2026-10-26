import Link from "next/link";
import { PointGrid } from "../../components/content/PointGrid";
import { WorkedExampleTable } from "../../components/content/WorkedExampleTable";
import { PATHS } from "../../config";
import { formatAud } from "../../format";
import type { ServicePageContent } from "./ServicePage";
import { HL_SOURCES as S } from "./sources";

export const selfEmployed: ServicePageContent = {
  path: PATHS.selfEmployed,
  crumbs: [
    { name: "Home loans", path: PATHS.homeLoans },
    { name: "Self-employed", path: PATHS.selfEmployed },
  ],
  metaTitle: "Home loans for self-employed borrowers",
  metaDescription:
    "How lenders assess self-employed income: two years of tax returns, add-backs, ABN history, and alt-doc loans with higher pricing and lower LVR limits.",
  eyebrow: "Home loans · Self-employed",
  h1: "Home loans when you are self-employed",
  lede: "If you work for yourself, as a sole trader, partner, company director or contractor with an ABN, lenders verify your income from your tax records instead of payslips. How they read those records varies a lot from one lender to the next.",
  serviceName: "Home loans for self-employed borrowers",
  summary: (
    <p>
      Most lenders want two years of personal and business tax returns with the matching ATO notices of assessment, and an ABN registered for about two years. Some accept one
      year. If your returns aren&rsquo;t lodged yet or don&rsquo;t reflect what you earn now, alternative-documentation (alt-doc) loans use BAS statements, business bank
      statements or an accountant&rsquo;s declaration instead, usually at higher pricing and with lower maximum LVRs.
    </p>
  ),
  sections: [
    {
      id: "fit",
      label: "Who this covers",
      title: "Who this covers, and what makes it harder",
      body: (
        <>
          <p>
            Lenders treat you as self-employed if you are a sole trader, in a partnership, a director who owns a meaningful share of the company that pays you, or paid through
            a family trust. Contractors on an ABN fall in between: some lenders assess a contractor working for one client much like an employee, using the contract and recent
            invoices.
          </p>
          <h3>Things that make an application harder</h3>
          <ul>
            <li>Less than a year trading, especially in a new industry.</li>
            <li>A tax return showing a loss, or income much lower than the year before.</li>
            <li>An ATO debt with no payment arrangement, or BAS lodgements that are behind.</li>
            <li>Taxable income kept low through deductions you would now like lenders to ignore.</li>
          </ul>
        </>
      ),
    },
    {
      id: "lenders",
      label: "What lenders look at",
      title: "What lenders look at in self-employed income",
      body: (
        <p>
          Lenders have to take reasonable steps to verify your income, which is why tax records carry so much weight. Beyond the headline figure, these are the points that
          change the result.
        </p>
      ),
      block: (
        <PointGrid
          items={[
            {
              title: "Taxable income, plus add-backs",
              body: "Lenders start from taxable income and may add back items that aren’t real cash costs or won’t recur: depreciation, interest on debts being paid out, one-off expenses, and super above the compulsory amount. Each lender has its own list.",
            },
            {
              title: "The trend between years",
              body: "If income is rising, some lenders use the latest year and others average the two. If it is falling, most use the lower year, and a short letter explaining why helps.",
            },
            {
              title: "Time in business",
              body: "Lenders check your ABN and GST registration dates. Some accept a shorter trading history if you worked in the same industry before going out on your own.",
            },
            {
              title: "Your ATO position",
              body: "An ATO debt is not an automatic no, but lenders want to see a payment arrangement that is up to date and BAS lodgements that are current.",
            },
            {
              title: "Company and trust income",
              body: "For a company, lenders look at your wages and, at some lenders, your share of the company’s profit. That needs the company’s own tax returns and financial statements.",
            },
            {
              title: "How your accounts are run",
              body: "Clean separation between business and personal accounts makes your statements easier to read. Mixed accounts lead to more questions.",
            },
          ]}
        />
      ),
    },
    {
      id: "example",
      label: "Worked example",
      title: "Worked example: two years of returns, read three ways",
      body: (
        <p>
          A sole trader&rsquo;s taxable income rose from {formatAud(96000)} to {formatAud(124000)}. Their accountant has claimed depreciation on equipment each year, and they
          are paying {formatAud(2000)} a year in interest on a car loan that the new home loan will pay out.
        </p>
      ),
      block: (
        <WorkedExampleTable
          caption="From taxable income to the income a lender assesses"
          rowHeader="Item"
          columns={[
            { key: "y1", label: "Earlier year", numeric: true },
            { key: "y2", label: "Latest year", numeric: true },
          ]}
          rows={[
            { label: "Taxable income", cells: { y1: formatAud(96000), y2: formatAud(124000) } },
            { label: "Add back depreciation", cells: { y1: formatAud(6000), y2: formatAud(8000) } },
            { label: "Add back interest on the car loan being paid out", cells: { y1: formatAud(2000), y2: formatAud(2000) } },
            { label: "Income after add-backs", cells: { y1: formatAud(104000), y2: formatAud(134000) }, total: true },
          ]}
          assumptions={[
            "Add-backs must appear in the tax return or financial statements. Which ones a lender accepts is its own policy.",
            "Income is before any shading a lender applies to particular items.",
          ]}
        />
      ),
      after: (
        <>
          <p>The same two returns can produce three different income figures, depending on the lender&rsquo;s method:</p>
          <ul>
            <li>
              <strong>Latest year only:</strong> {formatAud(134000)}
            </li>
            <li>
              <strong>Average of the two years:</strong> {formatAud(119000)}
            </li>
            <li>
              <strong>Lower of the two years:</strong> {formatAud(104000)}
            </li>
          </ul>
          <p>
            A {formatAud(30000)} difference in assessed income can change your borrowing range considerably. That is why choosing the lender comes before choosing the loan.
            The <Link href={PATHS.borrowingPower}>borrowing power calculator</Link> shows the effect of each figure.
          </p>
        </>
      ),
    },
    {
      id: "alt-doc",
      label: "Alt-doc loans",
      title: "Alt-doc loans: when the tax returns don’t tell the story",
      body: (
        <>
          <p>
            Alternative-documentation loans, sometimes called low-doc loans, are for self-employed borrowers whose recent income isn&rsquo;t yet in a lodged tax return, for
            example after a strong year or a recent change in business. Instead of returns and notices of assessment, the lender relies on some combination of BAS statements,
            business bank statements and a declaration of income signed by your accountant.
          </p>
          <p>
            They are mostly offered by non-bank lenders. Expect higher pricing and fees, and lower maximum LVRs than a full-documentation loan. The lender still has to be
            satisfied you can afford the repayments, so &lsquo;low doc&rsquo; does not mean &lsquo;no checks&rsquo;. Once your returns are lodged and show the income, it is
            often worth reviewing whether a full-doc loan would cost less.
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
          <h3>For a full-documentation loan</h3>
          <ul>
            <li>Personal tax returns for the last two years, with the ATO notices of assessment for both years.</li>
            <li>Business tax returns for the same years if you trade through a company, trust or partnership, with the profit and loss statement and balance sheet.</li>
            <li>Your ABN and GST registration details.</li>
            <li>An ATO statement showing your tax account balance, and the payment arrangement if there is one.</li>
            <li>Recent business and personal bank statements.</li>
          </ul>
          <h3>For an alt-doc loan</h3>
          <ul>
            <li>BAS statements for recent quarters.</li>
            <li>Business bank statements, often for six to twelve months depending on the lender.</li>
            <li>A letter or declaration from your accountant confirming your income.</li>
          </ul>
          <h3>For either</h3>
          <ul>
            <li>Photo ID, plus your visa grant notice or VEVO check if you are not an Australian citizen.</li>
            <li>Statements for any home loan, car loan, credit card or equipment finance you hold.</li>
          </ul>
        </>
      ),
    },
    {
      id: "mistakes",
      label: "Common mistakes",
      title: "Common self-employed mistakes",
      body: (
        <ol>
          <li>
            <strong>Lodging late.</strong> A lender can&rsquo;t use a year that hasn&rsquo;t been lodged and assessed. If you plan to borrow, ask your accountant to prioritise
            your return.
          </li>
          <li>
            <strong>Planning tax without planning the loan.</strong> Reducing taxable income in the year before you apply also reduces what lenders will lend. Talk to your
            accountant about both before the end of the financial year.
          </li>
          <li>
            <strong>Leaving an ATO debt unmanaged.</strong> A debt under an arrangement that you are keeping to is very different, to a lender, from one that isn&rsquo;t.
          </li>
          <li>
            <strong>Switching to an ABN just before applying.</strong> Moving from a salary to contracting can reset how lenders see your income history.
          </li>
          <li>
            <strong>Going straight to alt-doc.</strong> If a full-doc lender can use your returns, it is usually the cheaper option.
          </li>
        </ol>
      ),
    },
  ],
  faqTitle: "Questions from self-employed borrowers",
  faq: [
    {
      question: "Can I get a home loan with only one year of tax returns?",
      answer:
        "Some lenders accept one year, usually with conditions such as previous experience in the same industry or a lower maximum LVR. It depends on the lender, so we check before you apply.",
    },
    {
      question: "I’m a contractor with an ABN and one client. Am I self-employed?",
      answer:
        "To some lenders, yes. Others assess a contractor with one client much like an employee, using the current contract, recent invoices and bank statements. Which approach suits you depends on how long you have been contracting.",
    },
    {
      question: "How is income from my company counted?",
      answer:
        "Lenders start with the wages or director’s fees the company pays you. Some also count your share of the company’s net profit. Either way they need the company’s tax returns and financial statements, as well as your personal return.",
    },
    {
      question: "What does an alt-doc loan cost compared with a standard loan?",
      answer:
        "Usually more: higher interest rates and fees, and lower maximum LVRs, so you may need a bigger deposit or pay LMI at a lower LVR. It can still make sense if timing matters. Plan to review it once your tax returns show your income.",
    },
    {
      question: "Will an ATO debt stop me getting a home loan?",
      answer:
        "Not automatically. Lenders look at how large it is, whether there is a payment arrangement, and whether you are keeping to it. Some lenders can pay out an ATO debt as part of the loan.",
    },
    {
      question: "Should my accountant be involved?",
      answer:
        "It helps. Your accountant can confirm add-backs, explain a change in income between years, and provide the declaration that alt-doc lenders need. We can talk to them directly with your permission.",
    },
  ],
  cta: {
    title: "Get your income read the way a lender will",
    body: "Send your last two tax returns and notices of assessment before the consultation. Sulav works out which lender methods suit your figures.",
  },
  related: [
    { href: PATHS.borrowingPower, title: "Borrowing power calculator", description: "Try the different income figures from the worked example." },
    { href: PATHS.homeLoansFirstHomeBuyers, title: "First home buyers", description: "The steps from pre-approval to settlement." },
    { href: PATHS.investmentLoans, title: "Investment loans", description: "How lenders count rent and your total debt." },
  ],
  sources: [S.asicRg209, S.apraBuffer, S.lmi],
};
