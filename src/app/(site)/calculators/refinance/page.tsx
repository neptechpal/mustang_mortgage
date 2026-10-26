import { RULES } from "@/modules/calc/rules";
import { RefinanceCalculator } from "@/modules/web/calculators";
import { CtaBand } from "@/modules/web/components/content/CtaBand";
import { Disclaimer } from "@/modules/web/components/content/Disclaimer";
import { Faq, type FaqEntry } from "@/modules/web/components/content/Faq";
import { PageIntro } from "@/modules/web/components/content/PageIntro";
import { PointGrid } from "@/modules/web/components/content/PointGrid";
import { Sources } from "@/modules/web/components/content/Sources";
import { fromSourced, toSourceItems } from "@/modules/web/content/shared/sources";
import { TextLink } from "@/modules/web/components/ui/Button";
import { Section } from "@/modules/web/components/ui/Section";
import { PATHS } from "@/modules/web/config";
import { money } from "@/modules/web/duty/describe";
import { feeFromRule } from "@/modules/calc/stampDuty";
import { formatDate } from "@/modules/web/format";
import { JsonLd, buildMetadata, webAppJsonLd } from "@/modules/web/seo";

const TITLE = "Refinance savings calculator";
const DESCRIPTION =
  "Compare your home loan with a new offer: the monthly saving, when switching costs are paid back and the difference over the life of the loan. Enter your own rates and fees.";

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATHS.refinanceCalculator });

const nswMortgageFee = feeFromRule(RULES.NSW.govtFees.mortgageRegistration, 500_000);

const FAQ: FaqEntry[] = [
  {
    question: "What does it cost to refinance?",
    answer: `Usually a discharge fee from your current lender, any application or settlement fees on the new loan, and government fees to discharge the old mortgage and register the new one (in NSW, registering a mortgage is ${money(nswMortgageFee)} from ${formatDate(RULES.NSW.govtFees.effectiveFrom)}). If your current loan is fixed, a break cost can be the largest item. If you borrow more than 80% of the value, lenders mortgage insurance may apply again.`,
  },
  {
    question: "How long does refinancing take?",
    answer:
      "It depends on the new lender and on how quickly your current lender releases the loan. We tell you the current turnaround for the lenders we recommend, and the secure client portal helps us collect your documents in one go.",
  },
  {
    question: "Is a longer loan term a good idea when refinancing?",
    answer:
      "It lowers each repayment, but you pay interest for longer, so the total cost can go up even at a lower rate. The calculator shows both the monthly difference and the difference over the life of each loan.",
  },
  {
    question: "Can I just ask my current lender for a better rate?",
    answer:
      "Yes, and it is often worth asking first: there are no switching costs if your lender agrees. Knowing what other lenders would offer you helps that conversation.",
  },
];

export default function RefinancePage() {
  return (
    <>
      <JsonLd data={webAppJsonLd({ path: PATHS.refinanceCalculator, name: TITLE, description: DESCRIPTION })} />
      <PageIntro
        crumbs={[
          { name: "Calculators", path: PATHS.calculators },
          { name: "Refinance savings", path: PATHS.refinanceCalculator },
        ]}
        eyebrow="Calculator"
        title={TITLE}
        lede="Put your current loan beside a new offer, with the costs of switching, to see the monthly difference, when those costs are paid back and the total over the loan."
      />

      <Section id="calculator" size="tight" className="mw-calcsection" aria-label={TITLE}>
        <RefinanceCalculator title={null} />
      </Section>

      <Section
        id="check"
        tone="white"
        layout="split"
        index="01"
        eyebrow="Before you switch"
        title="What to check besides the rate"
        lede="A lower rate is the start of the comparison, not the end of it."
      >
        <PointGrid
          items={[
            { title: "Break costs on a fixed loan", body: "Ending a fixed rate early can cost thousands, depending on how rates have moved. Ask your lender for a figure before you decide." },
            { title: "Fees, now and ongoing", body: "Discharge, application, settlement and government registration fees, plus any annual package fee on the new loan." },
            { title: "Features you use", body: "Offset accounts, redraw, extra repayments and splitting between fixed and variable all affect what the loan is worth to you." },
            { title: "The loan term", body: "Resetting to 30 years lowers repayments but can add interest. Keeping your current term usually saves more overall." },
          ]}
        />
        <p className="mw-small" style={{ marginTop: 28 }}>
          <TextLink href={PATHS.refinancing} arrow>
            Refinancing with Mustang Mortgage
          </TextLink>
        </p>
      </Section>

      <Section id="faq" layout="split" index="02" eyebrow="Questions" title="Refinancing questions">
        <Faq items={FAQ} />
      </Section>

      <Section id="note" size="tight" aria-label="Sources and important information">
        <div className="mw-flow" style={{ maxWidth: 860 }}>
          <Sources items={toSourceItems(fromSourced(RULES.NSW.govtFees, () => "NSW Land Registry Services fees 2026-27"))} />
          <Disclaimer variant="calculator" />
        </div>
      </Section>

      <CtaBand title="Check whether refinancing is worth it" body="We compare your loan with the lenders on our panel, including break costs and fees, before recommending anything." />
    </>
  );
}
