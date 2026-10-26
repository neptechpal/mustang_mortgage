import { ArrowLeftRight, Calculator, Landmark, Percent, RefreshCw } from "lucide-react";
import { CtaBand } from "@/modules/web/components/content/CtaBand";
import { Disclaimer } from "@/modules/web/components/content/Disclaimer";
import { PageIntro } from "@/modules/web/components/content/PageIntro";
import { Steps } from "@/modules/web/components/content/Steps";
import { IndexList } from "@/modules/web/components/ui/IndexList";
import { Section } from "@/modules/web/components/ui/Section";
import { PATHS, SITE } from "@/modules/web/config";
import { StatePicker } from "@/modules/web/duty/StatePicker";
import { JsonLd, absoluteUrl, buildMetadata, webPageJsonLd } from "@/modules/web/seo";

const TITLE = "Home loan calculators";
const DESCRIPTION =
  "Calculators for borrowing power, repayments, refinancing and stamp duty in every state, plus an NPR to AUD and lakh to crore converter. You enter your own interest rate.";

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATHS.calculators });

const icon = { size: 22, strokeWidth: 1.5 } as const;

const TOOLS = [
  { href: PATHS.borrowingPower, title: "Borrowing power", description: "An estimate of what lenders may lend you, from your income, living costs and debts, tested at a higher rate the way lenders do.", mark: <Calculator {...icon} /> },
  { href: PATHS.repayments, title: "Repayments", description: "Weekly, fortnightly or monthly repayments, interest-only periods, and what extra repayments save.", mark: <Percent {...icon} /> },
  { href: PATHS.refinanceCalculator, title: "Refinance savings", description: "Your loan against a new one: the monthly difference, when switching costs are paid back, and the total over the loan.", mark: <RefreshCw {...icon} /> },
  { href: PATHS.stampDuty, title: "Stamp duty", description: "Transfer duty, first home buyer concessions, foreign purchaser surcharges and land titles fees for every state.", mark: <Landmark {...icon} /> },
  {
    href: PATHS.nprConverter,
    title: "NPR and AUD converter",
    description: "Nepalese rupees to Australian dollars, lakh and crore to millions, and ropani or bigha to square metres.",
    meta: "1 lakh = 100,000 · 1 crore = 10,000,000",
    mark: <ArrowLeftRight {...icon} />,
  },
];

export default function CalculatorsPage() {
  return (
    <>
      <JsonLd
        data={webPageJsonLd({
          path: PATHS.calculators,
          name: TITLE,
          description: DESCRIPTION,
          type: "CollectionPage",
          mainEntity: {
            "@type": "ItemList",
            itemListElement: TOOLS.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.title, url: absoluteUrl(t.href) })),
          },
        })}
      />
      <PageIntro
        crumbs={[{ name: "Calculators", path: PATHS.calculators }]}
        eyebrow="Calculators"
        title="Home loan calculators"
        lede="Run the numbers before we talk: what you could borrow, what repayments look like, the stamp duty on a purchase and whether refinancing pays. You enter your own interest rate. We don't publish rates."
      />

      <Section id="tools" size="tight" aria-label="All calculators">
        <IndexList columns={2} items={TOOLS} titleAs="h3" />
      </Section>

      <Section
        id="order"
        tone="white"
        layout="split"
        index="01"
        eyebrow="Where to start"
        title="Use them in this order"
        lede="Each answer feeds the next. Bring the numbers to your consultation and we check them against real lender policy."
      >
        <Steps
          items={[
            { title: "Start with what you could borrow", body: "Start with borrowing power. Lenders test your repayments at a higher rate than you will pay, so the limit is usually lower than people expect.", meta: ["Borrowing power"] },
            { title: "Add the cost of buying", body: "Add stamp duty and land titles fees for the state you are buying in. Over 80% of the price, lenders usually charge lenders mortgage insurance (LMI).", meta: ["Stamp duty"] },
            { title: "Check the repayments", body: "Use a rate you have actually been quoted. Try fortnightly repayments and a small extra amount to see the effect over the loan.", meta: ["Repayments"] },
            { title: "Comparing your current loan", body: "Compare it with an offer, including discharge, break and new loan costs, before you switch.", meta: ["Refinance savings"] },
          ]}
        />
      </Section>

      <Section id="states" index="02" eyebrow="Stamp duty" title="Stamp duty by state" lede="Each state page has its current rates, concessions, surcharge, fees and three worked examples.">
        <StatePicker />
      </Section>

      <Section id="note" size="tight" aria-label="Important information">
        <Disclaimer variant="calculator" />
      </Section>

      <CtaBand title={`Talk the numbers through with ${SITE.broker.givenName}`} />
    </>
  );
}
