import { PointGrid } from "../../components/content/PointGrid";
import { WorkedExampleTable } from "../../components/content/WorkedExampleTable";
import { Callout } from "../../components/ui/Callout";
import { PATHS } from "../../config";
import { formatAud } from "../../format";
import type { ServicePageContent } from "./ServicePage";
import { HL_SOURCES as S } from "./sources";

const STAGES: [string, number][] = [
  ["Deposit", 0.05],
  ["Base (slab)", 0.15],
  ["Frame", 0.2],
  ["Lock-up (enclosed)", 0.25],
  ["Fixing", 0.2],
  ["Practical completion", 0.15],
];
const CONTRACT = 550000;
const LAND_LOAN = 218000;

function stageRows() {
  let owed = LAND_LOAN;
  const rows = [{ label: "Land settlement (loan share)", cells: { share: "—", pay: formatAud(LAND_LOAN), owed: formatAud(LAND_LOAN) } }];
  for (const [name, pct] of STAGES) {
    const pay = Math.round(CONTRACT * pct);
    owed += pay;
    rows.push({ label: name, cells: { share: `${Math.round(pct * 100)}%`, pay: formatAud(pay), owed: formatAud(owed) } });
  }
  return rows.map((r, i) => (i === rows.length - 1 ? { ...r, total: true } : r));
}

export const constructionLoans: ServicePageContent = {
  path: PATHS.constructionLoans,
  crumbs: [
    { name: "Home loans", path: PATHS.homeLoans },
    { name: "Construction loans", path: PATHS.constructionLoans },
  ],
  metaTitle: "Construction loans in NSW explained",
  metaDescription:
    "How construction loans work: progress payments, fixed-price building contracts, interest-only during the build and the ‘as if complete’ valuation.",
  eyebrow: "Home loans · Construction loans",
  h1: "Construction loans: how building a home is financed",
  lede: "A construction loan pays your builder in stages as the work is done, instead of as one lump sum at the start. You pay interest only on the money drawn so far, so the cost grows as the house does.",
  serviceName: "Construction loans",
  summary: (
    <p>
      A construction loan is approved for the full amount but paid out in progress payments that follow the stages in your building contract. Most lenders want a fixed-price
      contract with a licensed builder, value the home &lsquo;as if complete&rsquo;, and charge interest only while it is being built. In NSW, a contract over $20,000 must
      include a progress payment schedule, and the builder must give you a home building compensation insurance certificate before taking a deposit.
    </p>
  ),
  sections: [
    {
      id: "how",
      label: "How the money moves",
      title: "How the money moves during a build",
      body: (
        <>
          <p>
            Your own contribution usually goes in first. Most lenders ask you to spend your share of the cost, on the land or the early stages, before they release any loan
            money.
          </p>
          <p>
            After that, each time the builder finishes a stage they send a progress claim. You sign it off, the lender may send a valuer to confirm the work is done, and the
            lender pays the builder directly. The last payment is made at practical completion, once the lender has the final inspection and, usually, the occupation
            certificate.
          </p>
          <p>
            Interest is charged only on what has been drawn, and most lenders set the loan to interest-only during construction. Repayments start small and rise with each
            stage. When the build is finished, the loan usually switches to principal and interest.
          </p>
        </>
      ),
    },
    {
      id: "example",
      label: "Worked example",
      title: "Worked example: $450,000 of land and a $550,000 build",
      body: (
        <p>
          A couple buy a block for {formatAud(450000)} and sign a fixed-price contract for {formatAud(550000)}. The total cost is {formatAud(1000000)}, but the lender lends
          against its own &lsquo;as if complete&rsquo; valuation, which comes in lower.
        </p>
      ),
      block: (
        <WorkedExampleTable
          caption="How the loan amount is set"
          rowHeader="Item"
          columns={[{ key: "amount", label: "Amount", numeric: true }]}
          rows={[
            { label: "Land price", cells: { amount: formatAud(450000) } },
            { label: "Fixed-price building contract", cells: { amount: formatAud(550000) } },
            { label: "Total cost", cells: { amount: formatAud(1000000) } },
            { label: "Lender’s ‘as if complete’ valuation (assumed)", cells: { amount: formatAud(960000) } },
            { label: "Loan at 80% of the valuation", cells: { amount: formatAud(768000) } },
            { label: "Your contribution (plus purchase costs)", cells: { amount: formatAud(232000) }, total: true },
          ]}
          assumptions={[
            "The valuation is an assumption. Custom features and site costs often add more to the price than to the valuation.",
            "Borrowing at 80% of the valuation means LMI would not usually apply.",
            "Transfer duty on the land, legal fees and loan fees are extra. No interest rates are assumed.",
          ]}
        />
      ),
      after: (
        <p>
          Their {formatAud(232000)} goes towards the land. The lender funds the other {formatAud(LAND_LOAN)} of the land at settlement, then the build in stages. The schedule
          below is an example; your contract sets the real stages and percentages.
        </p>
      ),
      aside: (
        <WorkedExampleTable
          caption="Progress payments on a $550,000 contract"
          rowHeader="Stage"
          columns={[
            { key: "share", label: "Share", numeric: true },
            { key: "pay", label: "Payment", numeric: true },
            { key: "owed", label: "Loan balance", numeric: true },
          ]}
          rows={stageRows()}
          assumptions={[
            "Example stages only. In NSW, contracts over $20,000 must have a progress payment schedule, payments must match the work done, and the deposit can’t be more than 10%.",
            "Interest is charged on the loan balance column, not the full $768,000, until the final payment.",
          ]}
        />
      ),
    },
    {
      id: "fit",
      label: "Who it suits",
      title: "Who a construction loan suits, and what is harder",
      body: (
        <>
          <h3>Straightforward for most lenders</h3>
          <ul>
            <li>Building a house with a licensed builder on a fixed-price contract.</li>
            <li>A knockdown and rebuild on land you already own.</li>
            <li>A house-and-land package with separate land and building contracts.</li>
          </ul>
          <h3>Harder, or a different loan</h3>
          <ul>
            <li>Owner-builder projects. Few lenders will fund them.</li>
            <li>Cost-plus contracts, where the final price isn&rsquo;t set. Many lenders decline them or want a larger buffer.</li>
            <li>A budget with no room for variations or cost increases.</li>
            <li>
              Buying an apartment off the plan. That is not a construction loan: you settle with a standard loan when the building is finished, and the lender values it then.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "lenders",
      label: "What lenders look at",
      title: "What lenders look at before approving a build",
      block: (
        <PointGrid
          items={[
            {
              title: "A fixed-price contract",
              body: "Lenders want the price set. Large provisional sums or prime cost allowances may be questioned, because they are estimates that can grow.",
            },
            {
              title: "The builder",
              body: "A licensed builder with home building compensation insurance in place for the job. Lenders may check the builder’s details before approving.",
            },
            {
              title: "Plans and approvals",
              body: "Council-approved plans, or a complying development certificate, and the full specifications. The valuer works from these.",
            },
            {
              title: "The ‘as if complete’ valuation",
              body: "The valuer estimates what the finished home will be worth. That figure, not your total cost, sets the maximum loan.",
            },
            {
              title: "Two costs at once",
              body: "If you are renting or paying another mortgage during the build, lenders count that alongside the construction loan. Plan for both.",
            },
            {
              title: "The timeline",
              body: "Lenders set deadlines for starting and finishing construction. Long delays may need the lender’s approval to extend.",
            },
          ]}
        />
      ),
      aside: (
        <Callout tone="note" title="APRA’s debt-to-income limit">
          <p>
            APRA&rsquo;s limit on high debt-to-income lending, in force since 1 February 2026, excludes loans to buy or build new dwellings. Each lender&rsquo;s own
            assessment, including the serviceability buffer, still applies.
          </p>
        </Callout>
      ),
    },
    {
      id: "documents",
      label: "Documents",
      title: "Documents to have ready",
      body: (
        <ul>
          <li>The signed fixed-price building contract, including the progress payment schedule.</li>
          <li>Council-approved plans and specifications (development approval or complying development certificate).</li>
          <li>The builder&rsquo;s licence number and the home building compensation insurance certificate for your job.</li>
          <li>The contract for the land, or the title details and loan statement if you already own it.</li>
          <li>Quotes for anything outside the contract: driveway, fencing, landscaping, window coverings.</li>
          <li>Your income documents, statements for any existing loans, photo ID and, if relevant, your visa grant notice or VEVO check.</li>
        </ul>
      ),
    },
    {
      id: "mistakes",
      label: "Common mistakes",
      title: "Common construction loan mistakes",
      body: (
        <ol>
          <li>
            <strong>Signing the building contract before finance is approved.</strong> Or signing without a finance clause that lets you withdraw if the loan falls through.
          </li>
          <li>
            <strong>Paying a deposit before seeing the insurance certificate.</strong> In NSW the builder must provide it before taking any payment on a contract over $20,000.
          </li>
          <li>
            <strong>Leaving out site and external costs.</strong> Excavation, retaining walls, driveways and connections can add a lot, and lenders won&rsquo;t fund what
            isn&rsquo;t quoted.
          </li>
          <li>
            <strong>Changing the plans mid-build.</strong> Variations after approval usually come from your own savings, and large ones may need the lender to reassess.
          </li>
          <li>
            <strong>Assuming the valuation will match the cost.</strong> If it comes in lower, your contribution has to cover the gap.
          </li>
          <li>
            <strong>Forgetting rent during the build.</strong> A 12-month build with rent and rising interest payments needs a cash buffer.
          </li>
        </ol>
      ),
    },
  ],
  faqTitle: "Questions about construction loans",
  faq: [
    {
      question: "Do I pay interest on the whole loan from the start?",
      answer:
        "No. Interest is charged only on the amount drawn so far. In the example above, interest is charged on $218,000 after the land settles and on the full $768,000 only after the final progress payment.",
    },
    {
      question: "Are there extra fees on a construction loan?",
      answer:
        "Often. Some lenders charge a fee for each progress payment or each valuer’s inspection, and establishment fees can be higher than on a standard loan. We include them when comparing lenders.",
    },
    {
      question: "What if the build runs late or over budget?",
      answer:
        "Lenders set a deadline to finish, and an extension needs their approval. Cost increases outside a fixed-price contract, and variations you request, usually come from your own funds. Keep a buffer, and check the delay provisions in your building contract.",
    },
    {
      question: "Can I use a construction loan for a knockdown and rebuild?",
      answer:
        "Yes. The lender values the finished home on your land. Demolition is usually part of the building contract or a separate quote, and you will need somewhere to live during the build.",
    },
    {
      question: "Is a house-and-land package a construction loan?",
      answer:
        "Usually, when there are separate contracts for the land and the build: the land settles first, then the house is funded in stages. If you buy a finished home on a single contract, it is normally a standard home loan that settles on completion.",
    },
    {
      question: "Can I make the loan principal and interest during the build?",
      answer:
        "Some lenders allow it, which reduces the balance slightly as you go. Most borrowers choose interest-only during construction to keep repayments manageable while paying rent or another loan.",
    },
  ],
  cta: {
    title: "Check a build budget with Sulav",
    body: "Bring your land contract, building quote or plans. We check how a lender is likely to value it and what you need to contribute.",
  },
  related: [
    { href: PATHS.borrowingPower, title: "Borrowing power calculator", description: "An estimate of what lenders may lend you." },
    { href: PATHS.homeLoansFirstHomeBuyers, title: "First home buyers", description: "The steps, documents and checks for your first purchase." },
    { href: PATHS.stampDutyNsw, title: "NSW stamp duty calculator", description: "Transfer duty on the land purchase." },
  ],
  sources: [S.nswBuildingContracts, S.apraDti, S.apraBuffer, S.interestOnly, S.lmi],
};
