import { RepaymentsCalculator } from "@/modules/web/calculators";
import { CtaBand } from "@/modules/web/components/content/CtaBand";
import { Disclaimer } from "@/modules/web/components/content/Disclaimer";
import { Faq, type FaqEntry } from "@/modules/web/components/content/Faq";
import { PageIntro } from "@/modules/web/components/content/PageIntro";
import { PointGrid } from "@/modules/web/components/content/PointGrid";
import { TextLink } from "@/modules/web/components/ui/Button";
import { Section } from "@/modules/web/components/ui/Section";
import { PATHS } from "@/modules/web/config";
import { JsonLd, buildMetadata, webAppJsonLd } from "@/modules/web/seo";

const TITLE = "Home loan repayments calculator";
const DESCRIPTION =
  "Work out weekly, fortnightly or monthly home loan repayments, interest-only periods and how much extra repayments save. Enter your own interest rate.";

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATHS.repayments });

const FAQ: FaqEntry[] = [
  {
    question: "Do fortnightly repayments save money?",
    answer:
      "Paying the same amount per year split into 26 fortnights saves only a little, because interest is charged on a slightly lower balance. The bigger saving comes when you pay half the monthly repayment every fortnight: that adds up to 13 monthly repayments a year instead of 12, so the loan is repaid years sooner. Ask your lender which method it uses.",
  },
  {
    question: "What is the difference between principal and interest and interest-only?",
    answer:
      "Principal and interest repayments pay off the loan as well as the interest, so the balance falls every period. Interest-only repayments are lower for a set period (often up to 5 years for a home you live in), but the balance doesn't fall, and repayments rise when the period ends because the loan is repaid over fewer years.",
  },
  {
    question: "Why don't my lender's figures match exactly?",
    answer:
      "Lenders calculate interest daily on the balance and charge it monthly, and many round repayments up. Fees, a change in rate or the exact settlement date also make a difference. The calculator should be within a few dollars for the same rate and term.",
  },
  {
    question: "How does an offset account change my repayments?",
    answer:
      "Money in an offset account linked to your loan reduces the balance interest is charged on. Your scheduled repayment usually stays the same, so more of it goes to the principal and the loan is repaid sooner, much like making extra repayments. Enter an extra repayment above to get a feel for the effect.",
  },
  {
    question: "Which rate should I enter?",
    answer:
      "The interest rate you have been offered or are paying now. To compare loans on cost, look at each loan's comparison rate, which includes most fees. We don't publish rates because they change often and depend on your situation.",
  },
];

export default function RepaymentsPage() {
  return (
    <>
      <JsonLd data={webAppJsonLd({ path: PATHS.repayments, name: TITLE, description: DESCRIPTION })} />
      <PageIntro
        crumbs={[
          { name: "Calculators", path: PATHS.calculators },
          { name: "Repayments", path: PATHS.repayments },
        ]}
        eyebrow="Calculator"
        title={TITLE}
        lede="Repayments for any loan amount, rate and term: weekly, fortnightly or monthly, principal and interest or interest-only, and what an extra repayment does over the life of the loan."
      />

      <Section id="calculator" size="tight" className="mw-calcsection" aria-label={TITLE}>
        <RepaymentsCalculator defaultAmount={600_000} title={null} />
      </Section>

      <Section
        id="levers"
        tone="white"
        layout="split"
        index="01"
        eyebrow="What changes the number"
        title="Four things that move your repayments"
        lede="Small changes compound over 25 or 30 years. Try each one in the calculator."
      >
        <PointGrid
          items={[
            { title: "The interest rate", body: "On a $600,000 loan over 30 years, each 0.25 percentage point changes the monthly repayment by roughly $90 to $100. Check it above with your own rate." },
            { title: "The loan term", body: "A longer term lowers each repayment but adds years of interest. A shorter term does the opposite." },
            { title: "How often you pay", body: "Weekly or fortnightly repayments line up with pay cycles. Paying half the monthly amount each fortnight repays the loan sooner." },
            { title: "Extra repayments", body: "Even a small extra amount every period goes straight to the principal. Fixed-rate loans often cap extra repayments, so check your loan's terms." },
          ]}
        />
        <p className="mw-small" style={{ marginTop: 28 }}>
          <TextLink href={PATHS.fixedVsVariable} arrow>
            Fixed or variable: how each rate type works
          </TextLink>
        </p>
      </Section>

      <Section id="faq" layout="split" index="02" eyebrow="Questions" title="Repayment questions">
        <Faq items={FAQ} />
      </Section>

      <Section id="note" size="tight" aria-label="Important information">
        <Disclaimer variant="calculator" />
      </Section>

      <CtaBand title="Find a loan with repayments that fit" />
    </>
  );
}
