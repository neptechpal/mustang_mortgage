import Link from "next/link";
import { PointGrid } from "../../components/content/PointGrid";
import { WorkedExampleTable } from "../../components/content/WorkedExampleTable";
import { PATHS } from "../../config";
import { formatAud } from "../../format";
import type { ServicePageContent } from "./ServicePage";
import { HL_SOURCES as S } from "./sources";

export const fixedVsVariable: ServicePageContent = {
  path: PATHS.fixedVsVariable,
  crumbs: [
    { name: "Home loans", path: PATHS.homeLoans },
    { name: "Fixed or variable", path: PATHS.fixedVsVariable },
  ],
  metaTitle: "Fixed or variable home loan rate",
  metaDescription:
    "How fixed and variable home loans differ on repayments, offset accounts, extra repayments and break costs, and how splitting a loan between them works.",
  eyebrow: "Home loans · Explainer",
  h1: "Fixed or variable: choosing how your rate works",
  lede: "With a variable rate, the lender can change your rate, and your repayments, at any time. With a fixed rate, both are locked for a set period, usually one to five years. Many borrowers split the loan and have some of each.",
  serviceName: "Fixed and variable rate home loans",
  summary: (
    <p>
      A fixed rate gives you certainty about repayments for the fixed term, but usually limits extra repayments and offset accounts, and you may pay a break cost to leave
      early. A variable rate moves with the lender&rsquo;s pricing and is usually more flexible. Nobody can reliably predict where rates will go, so the choice is mostly about
      how much certainty and how much flexibility you need over the next few years.
    </p>
  ),
  sections: [
    {
      id: "compare",
      label: "Side by side",
      title: "Fixed and variable, side by side",
      body: <p>These are the usual differences. Individual loans vary, so check the specific loan&rsquo;s terms before you choose.</p>,
      block: (
        <WorkedExampleTable
          caption="How the two rate types usually compare"
          rowHeader="Feature"
          columns={[
            { key: "fixed", label: "Fixed" },
            { key: "variable", label: "Variable" },
          ]}
          rows={[
            { label: "Repayments", cells: { fixed: "Set for the fixed term", variable: "Change when the lender changes the rate" } },
            { label: "If rates fall", cells: { fixed: "You keep paying the fixed rate", variable: "Repayments usually fall" } },
            { label: "If rates rise", cells: { fixed: "You are protected until the term ends", variable: "Repayments usually rise" } },
            { label: "Extra repayments", cells: { fixed: "Often capped each year", variable: "Usually allowed" } },
            { label: "Offset account", cells: { fixed: "Often not available", variable: "Often available" } },
            { label: "Redraw", cells: { fixed: "Often limited or unavailable", variable: "Usually available" } },
            { label: "Leaving early", cells: { fixed: "Break cost may apply", variable: "Discharge fee only, if refinancing" } },
            { label: "End of the term", cells: { fixed: "Moves to the lender’s revert rate unless you act", variable: "Nothing changes" } },
          ]}
        />
      ),
    },
    {
      id: "split",
      label: "Split loans",
      title: "How a split loan works",
      body: (
        <p>
          A split loan divides one loan into parts, each with its own rate type. You choose the proportions. Here is a {formatAud(600000)} loan split evenly, with{" "}
          {formatAud(40000)} of savings sitting in an offset account linked to the variable part.
        </p>
      ),
      block: (
        <WorkedExampleTable
          caption="A $600,000 loan split 50/50"
          rowHeader="Item"
          columns={[
            { key: "fixed", label: "Fixed part", numeric: true },
            { key: "variable", label: "Variable part", numeric: true },
          ]}
          rows={[
            { label: "Loan amount", cells: { fixed: formatAud(300000), variable: formatAud(300000) } },
            { label: "Offset balance", cells: { fixed: "—", variable: formatAud(40000) } },
            { label: "Balance interest is charged on", cells: { fixed: formatAud(300000), variable: formatAud(260000) }, total: true },
            { label: "Extra repayments", cells: { fixed: "Up to the lender’s cap", variable: "Allowed" } },
            { label: "Break cost if you refinance in year 2", cells: { fixed: "Possible", variable: "No" } },
          ]}
          assumptions={[
            "Three-year fixed term on the fixed part. The lender allows an offset account on the variable part only.",
            "No interest rates are assumed. To see repayments on each part, use the repayments calculator.",
          ]}
        />
      ),
      after: (
        <p>
          Half the repayments are certain for three years. The other half can be paid down as fast as you like, and the {formatAud(40000)} in the offset reduces interest on the
          variable part as if you owed {formatAud(260000)}. If you sell or refinance before the fixed term ends, only the fixed {formatAud(300000)} can attract a break cost. Try
          each part in the <Link href={PATHS.repayments}>repayments calculator</Link>.
        </p>
      ),
    },
    {
      id: "fit",
      label: "Who each suits",
      title: "Who each option tends to suit",
      body: (
        <>
          <h3>Fixing more of the loan can suit you if</h3>
          <ul>
            <li>Your budget is tight and you need to know the repayment for the next few years.</li>
            <li>You have just bought and expect costs to be high for a while.</li>
            <li>You don&rsquo;t expect to sell, refinance or pay down a large lump sum during the fixed term.</li>
          </ul>
          <h3>Keeping more variable can suit you if</h3>
          <ul>
            <li>You plan to make extra repayments, or expect a bonus, inheritance or sale proceeds.</li>
            <li>You keep meaningful savings and want them in an offset account.</li>
            <li>You might sell, move or refinance in the next few years.</li>
          </ul>
          <p>A split suits people who want some of both. It is common to fix the part you need certainty on and keep the rest variable.</p>
        </>
      ),
    },
    {
      id: "check",
      label: "What to check",
      title: "What to check in the loan terms",
      block: (
        <PointGrid
          items={[
            {
              title: "Rate lock",
              body: "Without a rate lock, a fixed loan takes the lender’s fixed rate on the day it settles, not the day you applied. A lock holds the rate for a set period, usually for a fee.",
            },
            {
              title: "Extra repayment cap",
              body: "Many lenders allow a limited amount of extra repayments on a fixed loan each year. Going over the cap can trigger break costs.",
            },
            {
              title: "Offset and redraw",
              body: "Check whether either works with the fixed part. If not, keep savings linked to a variable split.",
            },
            {
              title: "What happens at the end",
              body: "When the fixed term ends, the loan moves to the lender’s revert rate. Diarise the date and review the loan a couple of months before.",
            },
            {
              title: "How break costs are worked out",
              body: "The loan contract explains the method. Ask how a break cost would be estimated if you needed to sell.",
            },
            {
              title: "Fees for splitting",
              body: "Most lenders don’t charge to split, but some package fees or split limits apply. Check before you set up several parts.",
            },
          ]}
        />
      ),
    },
    {
      id: "break-costs",
      label: "Break costs",
      title: "Break costs, explained",
      body: (
        <>
          <p>
            A lender arranges its own funding for the length of your fixed term. If you end the fixed rate early and market rates have fallen since you fixed, the lender loses
            money on that funding, and the break cost passes the loss to you. The more rates have fallen, and the longer the term has left to run, the larger it is. If rates have
            risen since you fixed, the break cost may be small or nil.
          </p>
          <p>
            A break cost can be triggered by selling the property, refinancing to another lender, switching to variable, or paying more than the extra repayment cap. Break costs
            change daily, so ask the lender for a written estimate close to the date you would act.
          </p>
        </>
      ),
    },
    {
      id: "before",
      label: "Before you decide",
      title: "What to have in front of you before you decide",
      body: (
        <ul>
          <li>Your current loan statement, showing the balance, the rate type and, if fixed, the date the term ends.</li>
          <li>A written break cost estimate, if you are thinking of leaving a fixed rate early.</li>
          <li>Your offset or savings balance over the last few months, to see how much an offset would actually hold.</li>
          <li>Any plans for the next three to five years: selling, moving, renovating, a change in income or a new child.</li>
        </ul>
      ),
    },
    {
      id: "mistakes",
      label: "Common mistakes",
      title: "Common mistakes with fixed and variable rates",
      body: (
        <ol>
          <li>
            <strong>Fixing everything, then selling.</strong> A sale or refinance inside the fixed term can bring a large break cost.
          </li>
          <li>
            <strong>Not locking the rate.</strong> The fixed rate you were quoted can change before settlement.
          </li>
          <li>
            <strong>Letting the fixed term roll over.</strong> Revert rates are often higher than the rates lenders offer new customers.
          </li>
          <li>
            <strong>Keeping savings where they don&rsquo;t reduce interest.</strong> If the fixed part can&rsquo;t have an offset, link your savings to a variable split
            instead.
          </li>
          <li>
            <strong>Trying to time the market.</strong> Choose a structure you can live with whichever way rates move.
          </li>
        </ol>
      ),
    },
  ],
  faqTitle: "Questions about fixed and variable rates",
  faq: [
    {
      question: "Can I switch from fixed to variable during the fixed term?",
      answer:
        "Usually yes, but it ends the fixed rate early, so a break cost may apply. Ask the lender for a written estimate first.",
    },
    {
      question: "What is a rate lock?",
      answer:
        "A rate lock holds a lender’s fixed rate from your application until settlement, for a set period and usually for a fee. Without one, you get the fixed rate the lender is offering on the day the loan settles.",
    },
    {
      question: "What happens when my fixed rate ends?",
      answer:
        "The loan moves to the lender’s revert rate, usually a variable rate. It is often higher than what the lender offers new customers, so review the loan a couple of months before the fixed term ends and compare it with a new fixed term, a variable rate or a refinance.",
    },
    {
      question: "How much extra can I repay on a fixed loan?",
      answer:
        "It depends on the lender. Many set a yearly limit on extra repayments during the fixed term, and paying more than that can trigger break costs. The limit is in your loan contract.",
    },
    {
      question: "Does a split loan cost more?",
      answer:
        "Usually not to set up, but check the package fee and any limit on the number of splits. Each part may also have its own statement and repayment.",
    },
    {
      question: "Should I fix my rate now?",
      answer:
        "We can’t tell you where rates are heading, and nobody reliably can. What we can do is show how your repayments would look under different scenarios, so you can decide how much of the loan you want certainty on.",
    },
  ],
  cta: {
    title: "Talk through your loan structure with Sulav",
    body: "We look at your plans for the next few years and show you how a fixed, variable or split structure would handle them.",
  },
  related: [
    { href: PATHS.repayments, title: "Repayments calculator", description: "Weekly, fortnightly and monthly repayments for each part of a split." },
    { href: PATHS.refinancing, title: "Refinancing", description: "Your fixed term is ending: what to compare." },
    { href: PATHS.refinanceCalculator, title: "Refinance savings calculator", description: "Compare your loan with a new one, costs included." },
  ],
  sources: [S.fixedVariable, S.breakFee],
};
