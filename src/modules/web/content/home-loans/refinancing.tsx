import Link from "next/link";
import { PointGrid } from "../../components/content/PointGrid";
import { WorkedExampleTable } from "../../components/content/WorkedExampleTable";
import { Callout } from "../../components/ui/Callout";
import { PATHS } from "../../config";
import { formatAud } from "../../format";
import type { ServicePageContent } from "./ServicePage";
import { HL_SOURCES as S } from "./sources";

export const refinancing: ServicePageContent = {
  path: PATHS.refinancing,
  crumbs: [
    { name: "Home loans", path: PATHS.homeLoans },
    { name: "Refinancing", path: PATHS.refinancing },
  ],
  metaTitle: "Refinancing your home loan in NSW",
  metaDescription:
    "When refinancing a home loan is worth it, the costs to check first (discharge fees, break costs, LMI, valuation) and a worked example in plain numbers.",
  eyebrow: "Home loans · Refinancing",
  h1: "Refinancing your home loan: when the switch is worth it",
  lede: "Refinancing means replacing your home loan with a new one, from another lender or from your current lender on new terms. It can cut your costs or fix a structure that no longer suits you, but switching has costs of its own.",
  serviceName: "Home loan refinancing",
  summary: (
    <p>
      Refinancing is worth checking if your loan is a few years old, your fixed rate is about to end, or you want to change the loan&rsquo;s structure or borrow against your
      equity. Before you switch, add up the discharge fee, any break cost on a fixed loan, the new lender&rsquo;s fees and, if you would owe more than 80% of the property&rsquo;s
      value, a new LMI premium. Ask your current lender for a better rate first. It costs nothing to ask.
    </p>
  ),
  sections: [
    {
      id: "reasons",
      label: "Good and weak reasons",
      title: "Good reasons to refinance, and weak ones",
      body: (
        <>
          <h3>Usually worth looking at</h3>
          <ul>
            <li>Your rate has not been reviewed for two years or more, and lenders are pricing new customers more sharply than existing ones.</li>
            <li>Your fixed term is ending. If you do nothing, the loan moves to the lender&rsquo;s revert rate, which you never chose.</li>
            <li>You want an offset account, a split between fixed and variable, or to stop paying an annual package fee for features you don&rsquo;t use.</li>
            <li>You need money for a renovation or an investment deposit and have equity in the property.</li>
            <li>
              You want to remove a guarantor, or restructure after a separation. Both need the lender&rsquo;s approval and a full reassessment.
            </li>
          </ul>
          <h3>Usually not enough on its own</h3>
          <ul>
            <li>A cash-back offer is the main attraction. It is paid once. The rate applies for years.</li>
            <li>You are in the middle of a fixed term and the break cost is larger than the saving.</li>
            <li>
              Your income has dropped or become irregular since you took the loan. A new lender assesses you from scratch, and you may not qualify for the amount you owe now.
            </li>
            <li>You expect to sell within a year or two, so the setup costs have little time to pay for themselves.</li>
          </ul>
        </>
      ),
    },
    {
      id: "lenders",
      label: "What lenders look at",
      title: "What a new lender looks at",
      body: (
        <p>
          A refinance is a new application. Years of on-time repayments help, but the old approval doesn&rsquo;t carry across.
        </p>
      ),
      block: (
        <PointGrid
          items={[
            {
              title: "Your repayment history",
              body: "Statements for the current loan, usually covering the last six months. Missed or late repayments need an explanation, and recent arrears limit your options.",
            },
            {
              title: "Your income and expenses today",
              body: (
                <p>
                  Banks regulated by APRA must test whether you could still repay if the rate were at least 3 percentage points above the loan&rsquo;s rate. That buffer applies
                  to a refinance too.
                </p>
              ),
            },
            {
              title: "The new valuation",
              body: "The new lender orders its own valuation. It sets your LVR, which affects pricing and whether LMI applies. It may differ from an online estimate or a recent sale nearby.",
            },
            {
              title: "Why you want extra money",
              body: "If you are borrowing more than you owe, expect to explain the purpose. Renovations may need builder’s quotes. Some lenders limit cash-out amounts without evidence.",
            },
            {
              title: "Credit cards and other limits",
              body: "Lenders count the full limit on each card, not the balance. Closing a card you no longer use can improve what a lender will offer.",
            },
            {
              title: "The term you choose",
              body: "Resetting a loan with 24 years left to a new 30-year term lowers repayments but adds years of interest. You can usually choose a term that matches what you have left.",
            },
          ]}
        />
      ),
    },
    {
      id: "example",
      label: "Worked example",
      title: "Worked example: refinancing $620,000 and borrowing $60,000 more",
      body: (
        <p>
          A couple owe {formatAud(620000)} on their home and want {formatAud(60000)} for a kitchen and bathroom. Their plan works neatly or runs into LMI depending on one number
          they don&rsquo;t control: the new lender&rsquo;s valuation.
        </p>
      ),
      block: (
        <WorkedExampleTable
          caption="Same plan, two possible valuations"
          rowHeader="Item"
          columns={[
            { key: "a", label: "Valued at $900,000", numeric: true },
            { key: "b", label: "Valued at $820,000", numeric: true },
          ]}
          rows={[
            { label: "Current loan balance", cells: { a: formatAud(620000), b: formatAud(620000) } },
            { label: "Extra borrowing for the renovation", cells: { a: formatAud(60000), b: formatAud(60000) } },
            { label: "New loan amount", cells: { a: formatAud(680000), b: formatAud(680000) } },
            { label: "Loan-to-value ratio (LVR)", cells: { a: "75.6%", b: "82.9%" } },
            { label: "Most a lender would lend at 80% LVR", cells: { a: formatAud(720000), b: formatAud(656000) } },
            { label: "LMI likely?", cells: { a: "No", b: "Yes, a new premium" }, total: true },
          ]}
          assumptions={[
            "Owner-occupied home in NSW on a variable rate, so no break cost applies.",
            "Lender fees, government registration fees and any LMI premium are not included. The lender and insurer set those.",
            "No interest rates are assumed. To compare repayments, use the refinance savings calculator.",
          ]}
        />
      ),
      after: (
        <p>
          In the second column, borrowing {formatAud(36000)} instead of {formatAud(60000)} keeps the loan at {formatAud(656000)}, which is 80% of the value. The couple could
          also fund part of the renovation from savings, or check whether the lender will review the valuation against recent sales. We look at the likely valuation before
          you apply, not after. To test repayments on either loan amount, use the <Link href={PATHS.refinanceCalculator}>refinance savings calculator</Link>.
        </p>
      ),
    },
    {
      id: "costs",
      label: "Costs of switching",
      title: "The costs of switching, line by line",
      body: <p>Most of these are small on their own. Together, and with LMI or a break cost, they can outweigh a lower rate for several years.</p>,
      block: (
        <WorkedExampleTable
          caption="What you may pay to refinance"
          rowHeader="Cost"
          columns={[
            { key: "who", label: "Charged by" },
            { key: "when", label: "Applies when" },
          ]}
          rows={[
            { label: "Discharge fee", cells: { who: "Your current lender", when: "You close the loan" } },
            { label: "Break cost", cells: { who: "Your current lender", when: "You leave a fixed rate before the term ends" } },
            { label: "Application, valuation and settlement fees", cells: { who: "The new lender", when: "Depends on the lender; some waive them" } },
            { label: "Discharge and new mortgage registration", cells: { who: "NSW Land Registry Services", when: "Every refinance to a new lender" } },
            { label: "Lenders mortgage insurance (LMI)", cells: { who: "The new lender’s insurer", when: "The new loan is above 80% of the value" } },
          ]}
        />
      ),
      aside: (
        <Callout tone="warning" title="Cash-back offers">
          <p>
            A cash-back is a one-off payment. Compare the loans as if neither had one, then treat the cash-back as a bonus. Check the conditions: offers usually have a minimum
            loan size and a deadline for settlement, and may exclude moving between brands owned by the same banking group. If you are likely to refinance again within a year
            or two, the setup costs each time can cancel out the cash.
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
          <li>Statements for your current home loan covering the last six months (some lenders ask for twelve), and for any offset account.</li>
          <li>Your latest council rates notice for the property.</li>
          <li>Your two most recent payslips and your income statement from myGov, or, if you are self-employed, two years of tax returns and ATO notices of assessment.</li>
          <li>Statements for credit cards, car loans and personal loans, including any you plan to pay out.</li>
          <li>Photo ID. If you hold a temporary visa or became a permanent resident recently, your visa grant notice or a current VEVO check.</li>
          <li>Builder&rsquo;s quotes if you are borrowing extra for renovations.</li>
          <li>
            Your current lender&rsquo;s discharge authority form, signed. The lender needs it before it will release the mortgage. We help you complete it at the right time so
            settlement isn&rsquo;t delayed.
          </li>
        </ul>
      ),
    },
    {
      id: "mistakes",
      label: "Common mistakes",
      title: "Common refinancing mistakes",
      body: (
        <ol>
          <li>
            <strong>Restarting the clock without noticing.</strong> A new 30-year term on a loan with 22 years left makes repayments look smaller, but you pay interest for eight
            more years.
          </li>
          <li>
            <strong>Breaking a fixed rate on an old estimate.</strong> Break costs move with market rates. Get the figure in writing close to the date you would switch.
          </li>
          <li>
            <strong>Comparing headline rates only.</strong> Look at the comparison rate, the fees, and what happens when any introductory rate ends.
          </li>
          <li>
            <strong>Forgetting about redraw.</strong> Money sitting in redraw counts as already repaid. If you will need it, draw it out before settlement or include it in the
            new loan amount.
          </li>
          <li>
            <strong>Leaving direct debits behind.</strong> Move salary credits and bills to the new lender; the old account may close at settlement.
          </li>
          <li>
            <strong>Not asking your current lender first.</strong> Retention teams can often match part of a competitor&rsquo;s pricing without any switching costs.
          </li>
        </ol>
      ),
    },
  ],
  faqTitle: "Questions about refinancing",
  faq: [
    {
      question: "How much does it cost to refinance a home loan?",
      answer:
        "It depends on the lenders and your loan. Expect a discharge fee from your current lender, government fees to register the discharge and the new mortgage, and possibly application, valuation or settlement fees from the new lender. Add a break cost if you are leaving a fixed rate early, and LMI if the new loan is above 80% of the value. We list each cost in our written recommendation, so you can see how long the saving takes to cover them.",
    },
    {
      question: "What is a break cost on a fixed loan?",
      answer:
        "It is the amount a lender charges when you end a fixed rate early, to cover its loss. It depends on how much you owe, how long the fixed term has left and how far market rates have moved since you fixed. It tends to be higher when rates have fallen and can be small or nil when they have risen. Ask your lender for a written estimate before deciding.",
    },
    {
      question: "Can my lender charge an exit fee?",
      answer:
        "Not on a home loan taken out on or after 1 July 2011. Early exit fees on those loans are banned. Lenders can still charge a discharge fee to close the loan and a break cost on a fixed rate, and older loans may still carry an exit fee under their original contract.",
    },
    {
      question: "Will I pay LMI again?",
      answer:
        "Possibly. LMI does not move with you to a new lender. If the new loan is above 80% of the property’s value, the new lender will usually charge a new premium. If you paid LMI recently, ask your current insurer whether any partial refund applies.",
    },
    {
      question: "How long does refinancing take?",
      answer:
        "Often several weeks. The new lender’s approval is one part; your current lender processing the discharge is the other, and is often the slower one. Signing the discharge authority early helps.",
    },
    {
      question: "Will refinancing affect my credit score?",
      answer:
        "A new application is recorded on your credit file as an enquiry. One application to a well-chosen lender has a limited effect. Several applications in a short period look worse, which is why we pick the lender before lodging.",
    },
  ],
  cta: {
    title: "Find out whether switching pays",
    body: "Send us your latest loan statement before the consultation. Sulav works out the switching costs and how long a new loan would take to cover them.",
  },
  related: [
    { href: PATHS.refinanceCalculator, title: "Refinance savings calculator", description: "Compare your current loan with a new one, switching costs included." },
    { href: PATHS.fixedVsVariable, title: "Fixed or variable", description: "How each rate type works, break costs and split loans." },
    { href: PATHS.debtConsolidation, title: "Debt consolidation", description: "Rolling other debts into the loan, and what it costs over time." },
  ],
  sources: [S.switching, S.breakFee, S.lmi, S.asicRg220, S.apraBuffer, S.nswlrsFees],
};
