import Link from "next/link";
import { PointGrid } from "../../components/content/PointGrid";
import { WorkedExampleTable } from "../../components/content/WorkedExampleTable";
import { PATHS } from "../../config";
import { formatAud } from "../../format";
import type { ServicePageContent } from "./ServicePage";
import { HL_SOURCES as S } from "./sources";

/** Secondary service: kept short, linked from the footer and the home-loans hub only. */
export const carLoans: ServicePageContent = {
  path: PATHS.carLoans,
  crumbs: [{ name: "Car loans", path: PATHS.carLoans }],
  metaTitle: "Car loans for new and used cars",
  metaDescription:
    "How car loans work: secured or unsecured, balloon payments and the comparison rate, what lenders check, and how a car loan affects your home loan.",
  eyebrow: "Car loans",
  h1: "Car loans for new and used vehicles",
  lede: "As well as home loans, we arrange finance for new and used cars. This is a short guide to the choices worth understanding before you sign anything at a dealership.",
  serviceName: "Car loans",
  summary: (
    <p>
      Most car loans are secured by the car, which usually means a lower rate than an unsecured personal loan, but the lender can repossess the car if you fall seriously
      behind. A balloon payment lowers your regular repayments but leaves a lump sum owing at the end, and generally increases the total cost. Compare loans by their comparison
      rate, for the same amount and term.
    </p>
  ),
  sections: [
    {
      id: "choices",
      label: "The main choices",
      title: "Secured, unsecured and balloon payments",
      body: (
        <>
          <p>
            <strong>Secured car loan.</strong> The car is the security. Lenders usually price these below unsecured loans, and many limit them to cars under a certain age. If
            the car is sold or written off while money is owing, the sale price or insurance payout may not cover the full debt.
          </p>
          <p>
            <strong>Unsecured personal loan.</strong> No security, so the car can be any age and you own it outright from day one. Pricing is usually higher and loan amounts
            can be lower.
          </p>
          <p>
            <strong>Balloon or residual payment.</strong> A lump sum due at the end of the term. It reduces the regular repayments because you are not paying the whole loan
            down, but you pay interest on that amount for the full term.
          </p>
        </>
      ),
    },
    {
      id: "example",
      label: "Worked example",
      title: "Worked example: a $38,000 car with a $9,000 balloon",
      block: (
        <WorkedExampleTable
          caption="Where the money goes over a five-year loan"
          rowHeader="Item"
          columns={[{ key: "amount", label: "Amount", numeric: true }]}
          rows={[
            { label: "Drive-away price", cells: { amount: formatAud(38000) } },
            { label: "Deposit or trade-in", cells: { amount: `−${formatAud(8000)}` } },
            { label: "Amount borrowed", cells: { amount: formatAud(30000) } },
            { label: "Paid down through regular repayments", cells: { amount: formatAud(21000) } },
            { label: "Balloon still owing after five years", cells: { amount: formatAud(9000) }, total: true },
          ]}
          assumptions={["Five-year term; fees and interest are not shown.", "No interest rates are assumed."]}
        />
      ),
      after: (
        <p>
          At the end of the five years you still owe {formatAud(9000)}. You pay it from savings, refinance it, or sell or trade in the car. If the car is worth less than{" "}
          {formatAud(9000)} by then, you cover the difference. A smaller balloon, or none, means higher repayments now and less risk later.
        </p>
      ),
    },
    {
      id: "lenders",
      label: "What lenders look at",
      title: "What lenders look at",
      block: (
        <PointGrid
          items={[
            { title: "Income and employment", body: "Payslips or, if you are self-employed, tax returns or BAS. Time in your current job matters." },
            { title: "Existing debts and spending", body: "Other loans, card limits and your bank statements, the same way a home lender reads them." },
            { title: "The car", body: "Age, value and whether it comes from a dealer or a private seller. Older cars may only suit an unsecured loan." },
            { title: "Your credit file", body: "Defaults and late payments, and how many credit applications you have made recently." },
          ]}
        />
      ),
      after: (
        <p>
          <strong>Buying a home soon?</strong> A car loan&rsquo;s repayments reduce what a home lender will lend you, and a new application appears on your credit file. If a
          home purchase is close, talk to us before you buy the car. See <Link href={PATHS.borrowingPower}>borrowing power</Link> for a rough idea of the effect.
        </p>
      ),
    },
    {
      id: "documents",
      label: "Documents",
      title: "Documents to have ready",
      body: (
        <ul>
          <li>Your two most recent payslips, or tax returns and notices of assessment if you are self-employed.</li>
          <li>Driver licence and one other form of ID, plus your visa grant notice or VEVO check if you are not an Australian citizen.</li>
          <li>Recent bank statements, and statements for any other loans or cards.</li>
          <li>From a dealer: the contract or tax invoice. From a private seller: the VIN, registration details, the seller&rsquo;s details and a PPSR search.</li>
        </ul>
      ),
    },
    {
      id: "mistakes",
      label: "Common mistakes",
      title: "Common car loan mistakes",
      body: (
        <ol>
          <li>
            <strong>Signing dealer finance on the spot.</strong> It may be fine, but compare it first. You don&rsquo;t have to finance through the dealer to buy the car.
          </li>
          <li>
            <strong>Choosing a large balloon to get a low repayment.</strong> The lump sum at the end can be more than the car is worth.
          </li>
          <li>
            <strong>Adding extras to the loan without checking them.</strong> Warranties and insurance added to the loan are financed for the full term.
          </li>
          <li>
            <strong>Buying privately without a PPSR search.</strong> It shows whether money is owing on the car, or if it is recorded as stolen or written off.
          </li>
        </ol>
      ),
    },
  ],
  faqTitle: "Questions about car loans",
  faq: [
    {
      question: "Will a car loan affect my chances of getting a home loan?",
      answer:
        "Yes. Home lenders count the car loan’s repayments as a commitment, which reduces what they will lend. A new application is also recorded on your credit file. If you plan to buy a home soon, talk to us before taking out a car loan.",
    },
    {
      question: "Can I get a car loan to buy from a private seller?",
      answer:
        "Many lenders lend on private sales. Expect to provide the VIN, registration and seller’s details. Run a PPSR search first: it shows whether there is finance owing on the car and whether it is recorded as stolen or written off.",
    },
    {
      question: "What is a comparison rate?",
      answer:
        "A single percentage that combines the interest rate and most fees, so loans can be compared more fairly. Lenders must show it on car loans. It only compares properly between loans with the same amount and term.",
    },
    {
      question: "How much can I borrow for a car?",
      answer:
        "It depends on your income, your other debts and, for a secured loan, the car itself: lenders limit the loan relative to the car’s value and age. If you are also planning a home loan, the car loan’s repayments reduce what you can borrow for the home.",
    },
    {
      question: "Can I pay a car loan off early?",
      answer:
        "Often, but some car loans charge an early repayment or termination fee. Check the contract, or ask us to, before you sign.",
    },
  ],
  cta: {
    title: "Ask Sulav about car finance",
    body: "Tell us the car, the price and when you want to buy. If a home purchase is coming up too, we plan the order with you.",
  },
  related: [
    { href: PATHS.borrowingPower, title: "Borrowing power calculator", description: "See how a car loan changes your home loan borrowing range." },
    { href: PATHS.homeLoans, title: "Home loans", description: "Buying, refinancing, investing and building." },
  ],
  sources: [S.carLoans, S.comparisonRate, S.ppsr],
};
