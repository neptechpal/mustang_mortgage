import Link from "next/link";
import { PointGrid } from "../../components/content/PointGrid";
import { WorkedExampleTable } from "../../components/content/WorkedExampleTable";
import { Callout } from "../../components/ui/Callout";
import { PATHS } from "../../config";
import { formatAud } from "../../format";
import type { ServicePageContent } from "./ServicePage";
import { HL_SOURCES as S } from "./sources";

export const investmentLoans: ServicePageContent = {
  path: PATHS.investmentLoans,
  crumbs: [
    { name: "Home loans", path: PATHS.homeLoans },
    { name: "Investment loans", path: PATHS.investmentLoans },
  ],
  metaTitle: "Investment property loans in NSW",
  metaDescription:
    "How lenders assess an investment property loan: rental income, deposit or equity, interest-only and loan structure, with a worked example in plain numbers.",
  eyebrow: "Home loans · Investment loans",
  h1: "Investment property loans: how lenders assess them",
  lede: "An investment loan is a home loan for a property you will rent out. Lenders treat it differently from a home you live in: they count the rent cautiously, look harder at your total debt, and usually price it differently.",
  serviceName: "Investment property loans",
  summary: (
    <p>
      Lenders count only part of the expected rent as income, test your repayments against a buffer set by APRA, and usually price investment loans differently from loans for
      a home you live in. Many investors use equity in their own home instead of cash for the deposit. Whether the interest is tax deductible, and whether negative gearing
      suits you, are questions for your tax adviser.
    </p>
  ),
  sections: [
    {
      id: "fit",
      label: "Who it suits",
      title: "When an investment loan makes sense, and when to wait",
      body: (
        <>
          <h3>Usually a sound position to borrow from</h3>
          <ul>
            <li>You could keep paying the loan if the property sat empty for a month or two, or the rent dropped.</li>
            <li>You have a deposit or usable equity, plus savings left over for repairs and holding costs.</li>
            <li>Your own home loan, if you have one, is comfortably under control.</li>
          </ul>
          <h3>Worth pausing on</h3>
          <ul>
            <li>The plan only works if the rent covers every cost and prices keep rising.</li>
            <li>You would need to borrow the lender&rsquo;s maximum to make it happen.</li>
            <li>The main reason is a tax outcome you haven&rsquo;t checked with a tax adviser.</li>
            <li>You may move into the property later. That changes the loan, the tax position and any concessions, so plan it before you buy.</li>
            <li>
              You hold a temporary visa. Foreign investment rules limit what temporary residents can buy; see <Link href={PATHS.visaHomeLoans}>visa and PR home loans</Link>.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "lenders",
      label: "What lenders look at",
      title: "What lenders look at on an investment loan",
      block: (
        <PointGrid
          items={[
            {
              title: "Rent, at a discount",
              body: "Lenders count only part of the rent, to allow for vacancies, agent’s fees and maintenance. The share differs between lenders. Expect to provide a rental appraisal or the current lease.",
            },
            {
              title: "Your total debt",
              body: (
                <p>
                  Every loan and card limit counts, including other investment loans. Since 1 February 2026, APRA has capped the share of each bank&rsquo;s new loans going
                  to borrowers with debt of six times their income or more at 20%, with investor lending counted separately.
                </p>
              ),
            },
            {
              title: "The serviceability buffer",
              body: "Banks regulated by APRA test whether you could still repay if the rate were at least 3 percentage points higher than the loan’s rate. This applies to every loan you hold, not just the new one.",
            },
            {
              title: "Deposit or equity",
              body: "Twenty per cent of the price plus purchase costs avoids LMI with most lenders. Equity in your home can stand in for cash, and some lenders will go above 80% with LMI.",
            },
            {
              title: "Interest-only or principal and interest",
              body: "Interest-only repayments are lower for a set period, then rise when the period ends. Lenders assess whether you can afford the higher repayments that follow.",
            },
            {
              title: "The property type",
              body: "Some lenders limit lending, or require a bigger deposit, for very small apartments, student accommodation, serviced apartments and some regional towns.",
            },
          ]}
        />
      ),
    },
    {
      id: "example",
      label: "Worked example",
      title: "Worked example: using equity to buy a $650,000 investment unit",
      body: (
        <p>
          An owner-occupier has a home valued at {formatAud(1000000)} with {formatAud(500000)} owing. They want to buy a {formatAud(650000)} unit to rent out, without using
          their cash savings for the deposit.
        </p>
      ),
      block: (
        <WorkedExampleTable
          caption="Equity release plus an investment loan"
          rowHeader="Step"
          columns={[{ key: "amount", label: "Amount", numeric: true }]}
          rows={[
            { label: "Home’s value (lender’s valuation)", cells: { amount: formatAud(1000000) } },
            { label: "80% of the home’s value", cells: { amount: formatAud(800000) } },
            { label: "Less the current home loan", cells: { amount: `−${formatAud(500000)}` } },
            { label: "Usable equity at 80%", cells: { amount: formatAud(300000) }, total: true },
            { label: "Deposit on the unit (20% of $650,000)", cells: { amount: formatAud(130000) } },
            { label: "Allowance for duty and purchase costs (assumed)", cells: { amount: formatAud(30000) } },
            { label: "Equity loan, secured by the home", cells: { amount: formatAud(160000) } },
            { label: "Investment loan, secured by the unit (80%)", cells: { amount: formatAud(520000) } },
            { label: "Total new borrowing", cells: { amount: formatAud(680000) }, total: true },
          ]}
          assumptions={[
            "The $30,000 purchase-cost allowance is for illustration only. Check transfer duty with the NSW stamp duty calculator and get a conveyancing quote.",
            "Both loans stay at or under 80% of each property’s value, so LMI would not usually apply.",
            "Equity is only part of the test: the lender must also be satisfied you can repay all your debts, including the new loans.",
            "No interest rates or rent figures are assumed.",
          ]}
        />
      ),
      after: (
        <>
          <p>
            After settlement, the home carries {formatAud(660000)} of debt (66% of its value) and the unit carries {formatAud(520000)} (80%). Across both properties, that is{" "}
            {formatAud(1180000)} owed on {formatAud(1650000)} of property, or about 71.5%.
          </p>
          <p>
            Keeping the equity loan as its own split, separate from the home loan, makes it easier to show which borrowing was for the investment. Some lenders offer to secure
            both loans against both properties, known as cross-collateralisation. It can look simpler at the start but makes it harder to sell one property or move one loan
            later. We explain the trade-off before you choose.
          </p>
        </>
      ),
    },
    {
      id: "tax",
      label: "Tax is separate",
      title: "Tax is a separate conversation",
      body: (
        <>
          <p>
            Negative gearing, depreciation and which loan to pay down first are tax questions. A broker can arrange the loan; a registered tax agent or accountant should advise
            on the tax. Speak to them before you buy, because the way the loans are set up at the start is hard to undo.
          </p>
          <p>
            The general rules are on the{" "}
            <a href={S.atoInterest.url} target="_blank" rel="noopener noreferrer">
              ATO&rsquo;s website
            </a>
            . Interest on a loan used to buy a rental property can generally be claimed while the property is rented or genuinely
            available for rent. Interest on the loan for a home you live in can&rsquo;t. Where one loan is used for both private and investment purposes, the interest has to be
            split between the two.
          </p>
        </>
      ),
      aside: (
        <Callout tone="note" title="Holding costs to budget for">
          <p>
            Beyond the loan: landlord insurance, strata levies, council and water rates, repairs, agent&rsquo;s fees and periods with no tenant. In NSW, land tax can apply once
            the combined land value of everything you own, other than your home, passes the threshold set by Revenue NSW.
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
          <li>A rental appraisal from a local agent for the property you are buying, or the current lease if it is already tenanted.</li>
          <li>For properties you already rent out: the leases, recent rental statements and the loan statements.</li>
          <li>Your two most recent payslips and your myGov income statement, or two years of tax returns and notices of assessment if you are self-employed.</li>
          <li>Your latest tax return if you already own an investment. Lenders often use it to confirm existing rental income.</li>
          <li>Statements for your home loan, credit cards and any other loans.</li>
          <li>Your passport or driver licence, and your visa grant notice or a VEVO check if you aren&rsquo;t a citizen.</li>
          <li>The contract of sale once you have one. For off-the-plan, the contract and the expected completion date.</li>
        </ul>
      ),
    },
    {
      id: "mistakes",
      label: "Common mistakes",
      title: "Common investment loan mistakes",
      body: (
        <ol>
          <li>
            <strong>Mixing the deposit into your home loan.</strong> Redrawing from the home loan for an investment deposit can blur which interest relates to what. Ask your tax
            adviser how to set it up first.
          </li>
          <li>
            <strong>Counting the full rent in your own budget.</strong> Lenders don&rsquo;t, and you shouldn&rsquo;t either. Allow for vacancies and costs.
          </li>
          <li>
            <strong>Choosing interest-only without an end plan.</strong> Know what the repayment becomes when the interest-only period finishes, and whether you can afford it.
          </li>
          <li>
            <strong>Cross-collateralising by default.</strong> It is easier to keep each property&rsquo;s loan separate from the start than to untangle them later.
          </li>
          <li>
            <strong>Forgetting the effect on your next loan.</strong> An investment loan reduces what you can borrow for your own home later. Plan the order of purchases.
          </li>
        </ol>
      ),
    },
  ],
  faqTitle: "Questions about investment loans",
  faq: [
    {
      question: "How much deposit do I need for an investment property?",
      answer:
        "Twenty per cent of the price plus purchase costs avoids LMI with most lenders. Some lenders will lend more with LMI. Equity in a property you already own can replace some or all of the cash, as long as you can afford the repayments on the combined debt.",
    },
    {
      question: "Can rent help me qualify for the loan?",
      answer:
        "Yes. Lenders add part of the expected rent to your income when they assess the loan. They use only part of it, and the share varies between lenders, so the same property can produce different borrowing amounts.",
    },
    {
      question: "Should I choose interest-only repayments?",
      answer:
        "Interest-only keeps repayments lower for a set period, but the loan balance doesn’t fall during that time, and repayments rise when it ends. Lenders assess you on the higher repayments that follow. Whether interest-only suits your tax position is a question for your tax adviser.",
    },
    {
      question: "Is the interest on an investment loan tax deductible?",
      answer:
        "The ATO says interest on a loan used to buy a rental property can generally be claimed while the property is rented or genuinely available for rent. How that applies to you, including negative gearing, is a question for a registered tax agent.",
    },
    {
      question: "Can I keep my current home as an investment and buy a new home?",
      answer:
        "Often, yes. Lenders assess both loans and count part of the rent from the old home. On tax, the ATO says interest on the old home’s loan may become deductible once it is rented, while interest on the loan for the new home you live in is not. Talk to your tax adviser before restructuring either loan.",
    },
    {
      question: "Are investment loans more expensive?",
      answer:
        "Lenders often charge investors a different, usually higher, rate than owner-occupiers, and interest-only loans can be priced higher again. We compare the full cost, including fees, across the lenders on our panel.",
    },
  ],
  cta: {
    title: "Test an investment plan with Sulav",
    body: "We work through your equity, your total debt and how lenders would count the rent, before you start looking at properties.",
  },
  related: [
    { href: PATHS.borrowingPower, title: "Borrowing power calculator", description: "An estimate of what lenders may lend you across your debts." },
    { href: PATHS.stampDutyNsw, title: "NSW stamp duty calculator", description: "Transfer duty on an investment purchase." },
    { href: PATHS.fixedVsVariable, title: "Fixed or variable", description: "Rate types, offset accounts and splitting a loan." },
  ],
  sources: [S.apraBuffer, S.apraDti, S.atoInterest, S.interestOnly, S.nswLandTax, S.lmi],
};
