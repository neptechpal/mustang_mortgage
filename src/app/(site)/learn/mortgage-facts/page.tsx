import Link from "next/link";
import { PATHS } from "@/modules/web/config";
import { LearnPage, learnMetadata } from "@/modules/web/learn/LearnPage";

const DESCRIPTION = "Nine plain facts about home loans that most people only discover later: interest, comparison rates, pre-approval, credit cards and more.";
export const metadata = learnMetadata({ title: "Nine things most people find out later about home loans", description: DESCRIPTION, path: PATHS.learnFacts });

const FACTS: { title: string; body: React.ReactNode }[] = [
  {
    title: "Early repayments are mostly interest",
    body: (
      <>
        On a long loan, the first years of repayments are mostly interest, because the balance is at its highest. Open the <Link href={PATHS.loanExplorer}>loan explorer</Link> and
        drag the year slider to see how the split changes.
      </>
    ),
  },
  {
    title: "A 30-year loan does not have to take 30 years",
    body: "The term is the longest the loan can run. Extra repayments, an offset account or paying fortnightly at half the monthly amount can finish it years sooner.",
  },
  {
    title: "Interest is usually worked out daily",
    body: "Most lenders calculate interest on the balance each day and charge it monthly. That is why a lump sum paid today starts saving interest straight away.",
  },
  {
    title: "The comparison rate tells you more than the headline rate",
    body: "A comparison rate bundles the interest rate with most fees and charges into one figure, so two loans can be compared on a like-for-like basis. It is based on a standard example loan, so your own cost can differ.",
  },
  {
    title: "Credit card limits count, even if you never use them",
    body: "When a lender checks what you can afford, it usually counts the card limit, not the balance. Closing a card you do not use, or lowering its limit, can lift how much you can borrow.",
  },
  {
    title: "Lenders test you at a higher rate than you will pay",
    body: (
      <>
        To check you could cope if rates rose, lenders assess your repayments at a rate above the actual one. That is why borrowing power is often lower than people expect. Try the{" "}
        <Link href={PATHS.borrowingPower}>borrowing power calculator</Link>.
      </>
    ),
  },
  {
    title: "Pre-approval is not a guarantee",
    body: "Pre-approval shows roughly how much a lender may lend, subject to conditions such as the property valuation. It usually lasts for a limited time, often around three months, and the lender can change its mind if your circumstances change.",
  },
  {
    title: "Transfer duty is separate from your deposit",
    body: (
      <>
        Stamp duty (transfer duty) and other buying costs are on top of the deposit. Concessions for first home buyers can reduce or remove it. The{" "}
        <Link href={PATHS.stampDuty}>stamp duty calculator</Link> shows the figure for each state.
      </>
    ),
  },
  {
    title: "Your rate is worth asking about",
    body: "Lenders can offer different rates to different customers, and what you pay is not fixed for the life of the loan. It is reasonable to review your loan every year or two, and to ask whether a better rate or loan is available.",
  },
];

export default function MortgageFactsPage() {
  return (
    <LearnPage
      path={PATHS.learnFacts}
      crumbTitle="Mortgage facts"
      h1="Nine things most people find out later about home loans"
      lede="Short, plain facts that make a home loan easier to understand. Each one is general information that explains how loans usually work, not a prediction or a recommendation."
      description={DESCRIPTION}
      sections={[
        {
          id: "facts",
          label: "The nine facts",
          title: "The nine facts",
          body: (
            <ol className="mw-learn-facts" style={{ listStyle: "none", padding: 0 }}>
              {FACTS.map((f) => (
                <li key={f.title}>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </li>
              ))}
            </ol>
          ),
        },
      ]}
    />
  );
}
