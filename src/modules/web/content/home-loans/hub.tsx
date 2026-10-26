import { Car } from "lucide-react";
import { ConsultationCard } from "../../components/content/ConsultationCard";
import { CtaBand } from "../../components/content/CtaBand";
import { Disclaimer } from "../../components/content/Disclaimer";
import { Faq, type FaqEntry } from "../../components/content/Faq";
import { PageIntro } from "../../components/content/PageIntro";
import { PointGrid } from "../../components/content/PointGrid";
import { SituationSelector, type Situation } from "../../components/content/SituationSelector";
import { Sources } from "../../components/content/Sources";
import { WorkedExampleTable } from "../../components/content/WorkedExampleTable";
import { LinkButton, TextLink } from "../../components/ui/Button";
import { Container } from "../../components/ui/Container";
import { Fact } from "../../components/ui/Fact";
import { IndexList } from "../../components/ui/IndexList";
import { Section } from "../../components/ui/Section";
import { PATHS } from "../../config";
import { JsonLd, webPageJsonLd } from "../../seo";
import { HL_SOURCES as S } from "./sources";

export const HUB_TITLE = "Home loans in Sydney and across NSW";
export const HUB_DESCRIPTION =
  "First home, refinancing, investment, construction, self-employed and debt consolidation loans: how each works, what lenders check and how a broker is paid.";

/** Situation routing for the hub (wider than the home page’s default SITUATIONS). */
const HUB_SITUATIONS: Situation[] = [
  {
    label: "Buying your first home",
    href: PATHS.homeLoansFirstHomeBuyers,
    description: "The steps from pre-approval to settlement, what lenders check, and where NSW concessions fit in.",
  },
  {
    label: "Buying on a visa or as a new PR",
    href: PATHS.visaHomeLoans,
    description: "What changes for 189, 190, 491, 191 and 482 holders, and for new permanent residents.",
  },
  { label: "Refinancing your loan", href: PATHS.refinancing, description: "When switching pays, and the discharge fees, break costs and LMI to check first." },
  { label: "Buying an investment property", href: PATHS.investmentLoans, description: "How lenders count rent, use your equity and test your total debt." },
  { label: "Building a home", href: PATHS.constructionLoans, description: "Progress payments, fixed-price contracts and the ‘as if complete’ valuation." },
  { label: "Working for yourself", href: PATHS.selfEmployed, description: "Two years of tax returns, add-backs, and alt-doc loans when the returns aren’t lodged yet." },
  { label: "Consolidating debts", href: PATHS.debtConsolidation, description: "One repayment instead of several, and what it can cost over 30 years." },
  { label: "Choosing fixed or variable", href: PATHS.fixedVsVariable, description: "Certainty against flexibility, break costs, and how a split loan works." },
];

const FAQ: FaqEntry[] = [
  {
    question: "Do I need a 20% deposit to buy?",
    answer:
      "No, but it changes the cost. With 20% of the value, most lenders won’t charge lenders mortgage insurance (LMI). Many lenders will lend with a smaller deposit if you pay LMI, and eligible first home buyers may be able to buy with 5% and no LMI under the Australian Government 5% Deposit Scheme.",
  },
  {
    question: "My bank has said no. Can you still help?",
    answer:
      "Often. Lenders assess the same application differently, especially for visa holders, self-employed income, casual work and recent job changes. We start by finding out why the application was declined, then look for lenders whose policy fits. Sometimes the answer is to wait, and we will say so.",
  },
  {
    question: "Will talking to you show up on my credit file?",
    answer:
      "A consultation doesn’t. A lender checks your credit file when you apply, and that enquiry is recorded. That is one reason we choose the lender before lodging, instead of applying to several at once.",
  },
  {
    question: "How do you choose a lender for me?",
    answer:
      "We compare the lenders on our panel against your situation: whether their policy accepts your income type, visa and deposit, the total cost including fees, and the features you need. You get our recommendation in writing, with the reasons and the alternatives we considered.",
  },
  {
    question: "Why don’t you publish interest rates?",
    answer:
      "Rates change often and depend on your LVR, loan type and lender, so a published rate is rarely the one you would get. At your consultation we show current rates for your situation, with their comparison rates.",
  },
];

const icon = { size: 22, strokeWidth: 1.5, "aria-hidden": true } as const;

export function HomeLoansHub() {
  return (
    <>
      <JsonLd data={webPageJsonLd({ path: PATHS.homeLoans, name: HUB_TITLE, description: HUB_DESCRIPTION, type: "CollectionPage" })} />
      <PageIntro
        crumbs={[{ name: "Home loans", path: PATHS.homeLoans }]}
        eyebrow="Home loans"
        title="Home loans for buying, refinancing, building and investing"
        lede="We arrange home loans for people in Sydney, across NSW and, by phone and video, anywhere in Australia. Start with the situation closest to yours. Each page explains what lenders look at, what it costs and what to prepare."
        actions={
          <>
            <LinkButton href={PATHS.borrowingPower} variant="secondary" arrow>
              Check what I can borrow
            </LinkButton>
            <TextLink href={PATHS.howWeArePaid} arrow>
              How we are paid
            </TextLink>
          </>
        }
        aside={<ConsultationCard />}
      />

      <Section
        id="situations"
        tone="white"
        index="01"
        eyebrow="Start here"
        title="What we help with"
        lede="Pick the situation closest to yours. If two apply, such as a first home on a 491 visa, start with the one that feels less certain."
      >
        <SituationSelector items={HUB_SITUATIONS} label="Home loan situations" />
      </Section>

      <Section
        id="basics"
        layout="split"
        index="02"
        eyebrow="The basics"
        title="Four things decide most applications"
        lede="Lenders word their policies differently, but nearly every home loan comes down to these. Knowing where you stand on each tells you which lenders to approach."
      >
        <PointGrid
          items={[
            {
              title: "Your deposit and the LVR",
              body: "The loan-to-value ratio is the loan divided by the property’s value. Above 80%, most lenders add lenders mortgage insurance, a one-off cost that protects the lender, not you.",
            },
            {
              title: "Income a lender can count",
              body: "A base salary is simple. Overtime, bonuses, casual hours, rent and self-employed income are each treated differently, and often only part of them counts.",
            },
            {
              title: "What you owe and spend",
              body: "Card limits count even with a zero balance. Car loans, buy now pay later, HECS-HELP repayments and your actual living costs all reduce what lenders offer.",
            },
            {
              title: "The property",
              body: "Lenders have rules on size, type and location, and every lender relies on its own valuation rather than the price you agreed.",
            },
          ]}
        />
        <p className="mw-small" style={{ marginTop: 24, maxWidth: "62ch" }}>
          On top of these, banks regulated by APRA must test whether you could still make your repayments if the interest rate were at least 3 percentage points above the
          loan&rsquo;s rate. Your residency status matters too: see{" "}
          <TextLink href={PATHS.visaHomeLoans}>visa and PR home loans</TextLink>.
        </p>
      </Section>

      <Section
        id="costs"
        tone="white"
        layout="split"
        index="03"
        eyebrow="Costs"
        title="Costs beyond the deposit"
        lede="Buying a home costs more than the deposit. These are the usual items, who sets each one, and what to watch for."
        action={
          <TextLink href={PATHS.stampDutyNsw} arrow>
            NSW stamp duty calculator
          </TextLink>
        }
      >
        <WorkedExampleTable
          caption="Upfront costs when you buy with a home loan"
          rowHeader="Cost"
          columns={[
            { key: "who", label: "Set by" },
            { key: "note", label: "What to know" },
          ]}
          rows={[
            { label: "Transfer (stamp) duty", cells: { who: "State government (Revenue NSW in NSW)", note: "First home buyer concessions may reduce or remove it" } },
            { label: "Lenders mortgage insurance", cells: { who: "The lender’s insurer", note: "Usually applies above 80% LVR; can often be added to the loan" } },
            { label: "Lender fees", cells: { who: "The lender", note: "Application, valuation, settlement or ongoing fees, depending on the loan" } },
            { label: "Mortgage and transfer registration", cells: { who: "NSW Land Registry Services", note: "Fixed government fees, paid at settlement" } },
            { label: "Conveyancer or solicitor", cells: { who: "Whoever you engage", note: "Get a written quote before you exchange" } },
            { label: "Building, pest and strata reports", cells: { who: "Your inspector", note: "Before you exchange, or during the cooling-off period" } },
          ]}
        />
      </Section>

      <Section id="paid" tone="sand" layout="split-even" index="04" eyebrow="How we are paid" title="Who pays a broker, and why it matters to you">
        <div className="mw-stack" style={{ ["--mw-stack" as string]: "18px" }}>
          <p className="mw-body">
            In most cases the lender pays us, not you. When your loan settles, the lender pays an upfront commission, and most also pay a smaller trail commission each month
            while the loan stays open. Both are worked out from the loan amount, and neither is added to what you owe.
          </p>
          <p className="mw-body">
            Because lenders pay different amounts, the law requires us to act in your best interests and to put your interests ahead of ours where they conflict. Before you
            apply, we tell you in writing what we expect to be paid. Fees to you: <Fact path="fees.clientFeeStatement" />.
          </p>
          <div className="mw-btnrow" style={{ marginTop: 28 }}>
            <TextLink href={PATHS.howWeArePaid} arrow>
              How we are paid
            </TextLink>
            <TextLink href={PATHS.creditGuide} arrow>
              Credit Guide
            </TextLink>
          </div>
        </div>
      </Section>

      <Section id="questions" layout="split" index="05" eyebrow="Questions" title="Before you start" lede="Answers to what people ask before their first consultation.">
        <Faq items={FAQ} />
      </Section>

      <Section id="other" tone="white" size="tight" eyebrow="Other finance" title="Beyond home loans">
        <IndexList
          items={[
            {
              href: PATHS.carLoans,
              title: "Car loans",
              description: "Secured and unsecured car finance, balloon payments, and how a car loan affects your home loan borrowing.",
              mark: <Car {...icon} />,
            },
          ]}
        />
        <p className="mw-small" style={{ marginTop: 20, maxWidth: "70ch" }}>
          We arrange credit. We don&rsquo;t give tax, financial product or migration advice. Where you need it, we suggest you speak to a registered tax agent, a licensed
          financial adviser or a registered migration agent.
        </p>
      </Section>

      <section className="mw-section mw-section--tight" aria-label="Sources and important information">
        <Container>
          <div style={{ maxWidth: 800 }}>
            <Sources items={[S.lmi, S.apraBuffer, S.scheme5pc, S.nswlrsFees]} />
            <div style={{ marginTop: 32 }}>
              <Disclaimer />
            </div>
          </div>
        </Container>
      </section>

      <CtaBand title="Talk your situation through with Sulav" />
    </>
  );
}
