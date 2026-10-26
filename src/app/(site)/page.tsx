import { ArrowLeftRight, Calculator, Clock, Landmark, MapPin, Percent, ShieldCheck } from "lucide-react";
import { BrokerCard } from "@/modules/web/components/content/BrokerCard";
import { ConsultationCard } from "@/modules/web/components/content/ConsultationCard";
import { CtaBand } from "@/modules/web/components/content/CtaBand";
import { Faq, type FaqEntry } from "@/modules/web/components/content/Faq";
import { KeyFacts } from "@/modules/web/components/content/KeyFacts";
import { ReviewBadge } from "@/modules/web/components/content/ReviewBadge";
import { SituationSelector } from "@/modules/web/components/content/SituationSelector";
import { Steps } from "@/modules/web/components/content/Steps";
import { TrustRow } from "@/modules/web/components/content/TrustRow";
import { VisaIndex } from "@/modules/web/components/content/VisaIndex";
import { LinkButton, TextLink } from "@/modules/web/components/ui/Button";
import { Container } from "@/modules/web/components/ui/Container";
import { Eyebrow } from "@/modules/web/components/ui/Eyebrow";
import { Fact } from "@/modules/web/components/ui/Fact";
import { IndexList } from "@/modules/web/components/ui/IndexList";
import { Seal } from "@/modules/web/components/ui/Seal";
import { Section } from "@/modules/web/components/ui/Section";
import { PATHS, SITE } from "@/modules/web/config";
import { consultationModes } from "@/modules/web/format";
import { JsonLd, buildMetadata, webPageJsonLd } from "@/modules/web/seo";

const TITLE = "Sydney mortgage broker for first home buyers and visa holders";
const DESCRIPTION =
  "Sulav Adhikari helps first home buyers, new permanent residents and skilled visa holders in Sydney and across NSW get a home loan. Book a 60-minute consultation.";

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: "/" });

const icon = { size: 20, strokeWidth: 1.5, "aria-hidden": true } as const;

const FAQ: FaqEntry[] = [
  {
    question: "How much does it cost to use a mortgage broker?",
    answer:
      "Most of our work is paid for by the lender, through commission when your loan settles. Before you apply, we tell you in writing what we will be paid and about any fee you would pay. Our Credit Guide sets this out in full.",
  },
  {
    question: "Can I get a home loan on a temporary visa?",
    answer: (
      <>
        <p>
          Often, yes, but fewer lenders will consider it. Lenders look at your visa subclass, how long it has left to run, your income and your deposit. Temporary residents
          usually need approval from the Foreign Investment Review Board (FIRB) before buying, and in NSW may pay surcharge purchaser duty on top of transfer duty.
        </p>
        <p>
          <TextLink href={PATHS.visaHomeLoans} arrow>
            Visa and PR home loans
          </TextLink>
        </p>
      </>
    ),
    answerText:
      "Often, yes, but fewer lenders will consider it. Lenders look at your visa subclass, how long it has left to run, your income and your deposit. Temporary residents usually need approval from the Foreign Investment Review Board (FIRB) before buying, and in NSW may pay surcharge purchaser duty on top of transfer duty.",
  },
  {
    question: "Do you only work with clients in Sydney?",
    answer: SITE.serviceArea.long.replace("We are", "No. We're"),
  },
  {
    question: "What happens at the first consultation?",
    answer: `We spend ${SITE.consultation.minutes} minutes on your situation: income, savings, debts, visa status and what you want to buy. You leave with an estimated borrowing range, a list of the documents you'll need and the next steps. You don't need to prepare anything formal for this first conversation.`,
  },
  {
    question: "Can I use money from family overseas for my deposit?",
    answer:
      "Many lenders accept a gift from a parent or close family member, including money sent from overseas, if it is properly documented. That usually means a signed gift letter and records showing where the money came from and how it reached Australia. Policies differ between lenders, so talk to us before the money is transferred.",
  },
  {
    question: "How long does a home loan approval take?",
    answer:
      "It depends on the lender and on how complete your documents are when we lodge. We tell you the current turnaround for the lenders we recommend, and the secure client portal helps us collect everything in one go.",
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd data={webPageJsonLd({ path: "/", name: TITLE, description: DESCRIPTION })} />

      {/* Hero */}
      <section className="mw-hero" aria-labelledby="hero-title">
        <div className="mw-hero__mark" aria-hidden="true">
          <Seal center="none" text="Mustang Mortgage · Home loans · Sydney · New South Wales · " />
        </div>
        <Container>
          <div className="mw-hero__grid">
            <div className="mw-hero__copy">
              <Eyebrow>Mortgage broker · Sydney and NSW</Eyebrow>
              <h1 id="hero-title" className="mw-display">
                Home loans for first home buyers, new&nbsp;Australians and <em>visa holders</em> in Sydney
              </h1>
              <p className="mw-lede">
                {SITE.broker.name} is a mortgage broker for people buying their first Australian home, including skilled visa holders and new permanent residents. Sulav works out
                which lenders will accept your situation, shows you the costs in plain numbers and manages the application through to settlement.
              </p>
              <div className="mw-intents mw-hero__cta">
                <LinkButton href={PATHS.homeLoans} variant="secondary" size="lg" arrow>
                  I&rsquo;m buying
                </LinkButton>
                <LinkButton href={PATHS.refinancing} variant="secondary" size="lg" arrow>
                  I&rsquo;m refinancing
                </LinkButton>
              </div>
              <div className="mw-hero__aux">
                <TextLink href={PATHS.borrowingPower} arrow>
                  Check what I can borrow
                </TextLink>
                {SITE.reviews && <ReviewBadge review={SITE.reviews} />}
              </div>
            </div>
            <ConsultationCard />
          </div>

          <TrustRow
            items={[
              {
                icon: <ShieldCheck {...icon} />,
                children: (
                  <>
                    <strong>Credit Representative</strong> <Fact path="licence.creditRepresentativeNumber" /> of <Fact path="licence.licenseeName" />, Australian Credit
                    Licence <Fact path="licence.licenseeAcl" />
                  </>
                ),
              },
              {
                icon: <Clock {...icon} />,
                children: (
                  <>
                    <strong>We reply {SITE.responsePromise}</strong> to every enquiry
                  </>
                ),
              },
              {
                icon: <MapPin {...icon} />,
                children: (
                  <>
                    <strong>Based in NSW.</strong> Australia-wide by {consultationModes()}
                  </>
                ),
              },
            ]}
          />
        </Container>
      </section>

      {/* 01 Situation selector */}
      <Section
        id="situations"
        tone="white"
        index="01"
        eyebrow="Start here"
        title="Start with your situation"
        lede="Pick the one closest to yours. Each page covers what lenders look at, the costs involved and what to prepare."
      >
        <SituationSelector />
      </Section>

      {/* 02 Visa and PR specialism */}
      <Section
        id="visa"
        tone="ink"
        layout="split"
        index="02"
        eyebrow="Visa and PR home loans"
        title="Buying on a visa changes the questions lenders ask"
        lede={
          <div className="mw-stack">
            <p className="mw-lede">
              Your visa subclass decides more than most people expect: which lenders will consider you, how much deposit they want, whether you need FIRB approval, and whether
              NSW surcharge purchaser duty applies on top of transfer duty.
            </p>
            <p className="mw-body">Many of our clients hold skilled visas or have just become permanent residents. We work through these questions at your first consultation.</p>
          </div>
        }
        action={
          <TextLink href={PATHS.visaHomeLoans} arrow>
            Visa and PR home loans overview
          </TextLink>
        }
      >
        <VisaIndex />
        <p className="mw-small" style={{ marginTop: 20, maxWidth: "60ch" }}>
          Rules for temporary residents change. Each guide shows the date we last checked it against official sources such as the{" "}
          <a className="mw-link" href="https://foreigninvestment.gov.au/" target="_blank" rel="noopener noreferrer">
            Foreign Investment Review Board
          </a>{" "}
          and{" "}
          <a className="mw-link" href="https://www.revenue.nsw.gov.au/" target="_blank" rel="noopener noreferrer">
            Revenue NSW
          </a>
          .
        </p>
      </Section>

      {/* 03 How it works */}
      <Section
        id="how-it-works"
        layout="split"
        index="03"
        eyebrow="How it works"
        title="From first call to settlement"
        lede="Four stages. You always know which one you are in, and what we need from you next."
        action={
          <LinkButton href={PATHS.book} arrow>
            Book a consultation
          </LinkButton>
        }
      >
        <Steps
          items={[
            {
              title: `A ${SITE.consultation.minutes}-minute consultation`,
              body: `By ${consultationModes()}, at a time that suits you, 7 days a week. We talk through your income, savings, debts, visa status and the kind of property you want. Rough figures are fine at this stage.`,
              meta: [`${SITE.consultation.minutes} minutes`, "Phone or video"],
            },
            {
              title: "Documents through the secure portal",
              body: "We send you a checklist and a private link to upload payslips, bank statements, ID and visa documents. No email attachments, and you can see what is still outstanding.",
              meta: ["Client portal", "Online fact find"],
            },
            {
              title: "Options and a recommendation",
              body: "We compare loans from the lenders on our panel and recommend one in writing, with the reasons, the costs and the alternatives we considered. Nothing is lodged until you agree.",
              meta: ["In writing"],
            },
            {
              title: "Approval, settlement and after",
              body: "We lodge the application, answer the lender's questions and work with your conveyancer or solicitor through to settlement. After that, call us whenever your rate, income or plans change.",
              meta: ["Through to settlement"],
            },
          ]}
        />
        <KeyFacts
          className="mw-home-facts"
          items={[
            { value: SITE.consultation.minutes, unit: "min", label: "First consultation, by phone or video" },
            { value: 7, unit: "days", label: "Consultation times every day of the week, Sydney time" },
            { value: 1, unit: "business day", label: "Our reply time for every enquiry" },
          ]}
        />
      </Section>

      {/* 04 Broker */}
      <Section id="broker" tone="sand" aria-label={`Your broker, ${SITE.broker.name}`}>
        <BrokerCard />
      </Section>

      {/* 05 Calculators */}
      <Section
        id="calculators"
        index="04"
        eyebrow="Calculators"
        title="Run the numbers before we talk"
        lede="Estimates help you decide what to ask. At your consultation we check them against real lender policy."
        action={
          <TextLink href={PATHS.calculators} arrow>
            All calculators
          </TextLink>
        }
      >
        <IndexList
          columns={2}
          items={[
            { href: PATHS.borrowingPower, title: "Borrowing power", description: "An estimate of what lenders may lend you, from your income, expenses and debts.", mark: <Calculator size={22} strokeWidth={1.5} /> },
            { href: PATHS.repayments, title: "Repayments", description: "Weekly, fortnightly and monthly repayments for a loan amount and term.", mark: <Percent size={22} strokeWidth={1.5} /> },
            { href: PATHS.stampDuty, title: "Stamp duty", description: "Transfer duty for each state, including first home buyer concessions.", mark: <Landmark size={22} strokeWidth={1.5} /> },
            {
              href: PATHS.nprConverter,
              title: "NPR and AUD converter",
              description: "Convert lakh and crore to Australian dollars and back.",
              meta: "1 lakh = 100,000 · 1 crore = 10,000,000",
              mark: <ArrowLeftRight size={22} strokeWidth={1.5} />,
            },
          ]}
        />
      </Section>

      {/* 06 How we are paid */}
      <Section id="paid" tone="white" layout="split-even" index="05" eyebrow="How we are paid" title="How we are paid, in plain terms">
        <div className="mw-stack" style={{ ["--mw-stack" as string]: "18px" }}>
          <p className="mw-body">
            When your loan settles, the lender pays us an upfront commission, and usually a smaller ongoing commission (called trail) while the loan is active. The amounts depend
            on the lender and the loan size. We tell you what they are before you apply.
          </p>
          <p className="mw-body">
            The law requires us to act in your best interests and to put your interests first if they conflict with ours. That means recommending the loan that suits you, not the
            one that pays us more.
          </p>
          <p className="mw-body">
            Fees to you: <Fact path="fees.clientFeeStatement" />. We compare loans from <Fact path="lenderPanel.count" /> lenders on our panel. Not every lender in Australia is on
            our panel.
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

      {/* 07 FAQ */}
      <Section id="faq" layout="split" index="06" eyebrow="Questions" title="What people ask us first" lede="Straight answers to the questions that come up in most first consultations.">
        <Faq items={FAQ} />
      </Section>

      <CtaBand />
    </>
  );
}
