import Link from "next/link";
import { BrokerCard } from "@/modules/web/components/content/BrokerCard";
import { CtaBand } from "@/modules/web/components/content/CtaBand";
import { LicenceStatement } from "@/modules/web/components/content/LicenceStatement";
import { PageIntro } from "@/modules/web/components/content/PageIntro";
import { PointGrid } from "@/modules/web/components/content/PointGrid";
import { LinkButton, TextLink } from "@/modules/web/components/ui/Button";
import { IndexList } from "@/modules/web/components/ui/IndexList";
import { Section } from "@/modules/web/components/ui/Section";
import { LEGAL_LINKS, PATHS, SITE } from "@/modules/web/config";
import { JsonLd, buildMetadata, webPageJsonLd } from "@/modules/web/seo";

const TITLE = "About Mustang Mortgage";
const DESCRIPTION =
  "Mustang Mortgage is a NSW mortgage broking business run by Sulav Adhikari, helping first home buyers, refinancers, investors, skilled visa holders and new permanent residents.";

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATHS.about });

export default function AboutPage() {
  return (
    <>
      <JsonLd data={webPageJsonLd({ path: PATHS.about, name: TITLE, description: DESCRIPTION, type: "AboutPage" })} />
      <PageIntro
        crumbs={[{ name: "About", path: PATHS.about }]}
        eyebrow="About us"
        title="A small brokerage, run by the broker you meet"
        lede={`Mustang Mortgage is a mortgage broking business based in New South Wales and run by ${SITE.broker.name}. We help people buy their first home, refinance, invest and build, and we take particular care with applications from skilled visa holders and new permanent residents.`}
        actions={
          <>
            <LinkButton href={PATHS.book} arrow>
              Book a consultation
            </LinkButton>
            <TextLink href={PATHS.broker} arrow>
              Meet Sulav
            </TextLink>
          </>
        }
      />

      <Section
        id="what-we-do"
        layout="split"
        eyebrow="What a broker does"
        title="We do the comparing, the paperwork and the chasing"
        lede="A mortgage broker arranges a home loan with a lender on your behalf. Here is what that means at Mustang Mortgage."
      >
        <PointGrid
          items={[
            { title: "Work out what you can borrow", body: "We look at your income, savings, debts and visa status the way a lender will, before anything is lodged." },
            { title: "Compare lenders on our panel", body: "Lenders differ on deposits, visas, overseas income and self-employment. We match your situation to the lenders whose policy fits." },
            { title: "Recommend a loan in writing", body: "You get our recommendation with the reasons, the costs and the other options we considered. You decide." },
            { title: "Manage the application", body: "We lodge it, answer the lender's questions and keep you, your conveyancer or solicitor and the lender in step until settlement." },
          ]}
        />
      </Section>

      <Section id="help-with" tone="white" eyebrow="What we help with" title="Home loans, and the situations around them">
        <IndexList
          columns={2}
          items={[
            { href: PATHS.firstHomeBuyers, title: "First home buyers", description: "Deposits, LMI and NSW first home buyer concessions." },
            { href: PATHS.visaHomeLoans, title: "Visa and PR home loans", description: "Skilled visas, regional visas and new permanent residents." },
            { href: PATHS.refinancing, title: "Refinancing", description: "Reviewing your rate, lender and loan structure." },
            { href: PATHS.investmentLoans, title: "Investment loans", description: "Buying a property to rent out." },
            { href: PATHS.constructionLoans, title: "Construction loans", description: "Building a home, with the loan paid in stages." },
            { href: PATHS.debtConsolidation, title: "Debt consolidation", description: "Rolling other debts into your home loan." },
            { href: PATHS.fixedVsVariable, title: "Fixed and variable rates", description: "How each works, and splitting a loan between them." },
            { href: PATHS.carLoans, title: "Car loans", description: "Finance for a new or used vehicle." },
          ]}
        />
        <p className="mw-small" style={{ marginTop: 24, maxWidth: "70ch" }}>
          We arrange credit. We don&rsquo;t give financial product, tax or migration advice. Where you need it, we suggest you speak to a licensed financial adviser, a tax agent
          or a registered migration agent.
        </p>
      </Section>

      <Section
        id="principles"
        layout="split"
        eyebrow="How we work"
        title="What you can expect from us"
        lede="These are commitments we can keep, not slogans."
      >
        <PointGrid
          items={[
            { title: "You deal with the broker", body: `${SITE.broker.name} runs your consultation and manages your application. You have the broker's direct number.` },
            {
              title: "Open about how we are paid",
              body: (
                <p>
                  Lenders pay us commission. We tell you the amounts before you apply.{" "}
                  <TextLink href={PATHS.howWeArePaid}>How we are paid</TextLink>
                </p>
              ),
            },
            { title: "Documents stay out of email", body: "You upload documents through a secure client portal, and you can see what is still needed." },
            { title: "Dated, sourced information", body: "Our guides show when they were last checked and link to the official sources: FIRB, Home Affairs, Revenue NSW and the ATO." },
          ]}
        />
      </Section>

      <Section id="broker" tone="sand" aria-label={`Your broker, ${SITE.broker.name}`}>
        <BrokerCard />
      </Section>

      <Section id="licence" tone="white" layout="split-even" eyebrow="Licence and disclosure" title="Licensed to arrange credit">
        <div className="mw-stack" style={{ ["--mw-stack" as string]: "18px" }}>
          <LicenceStatement className="mw-body" />
          <p className="mw-body">Our Credit Guide explains our licence, how we are paid, the lenders we use most often and how to make a complaint.</p>
          <ul className="mw-chips" style={{ marginTop: 24 }}>
            {LEGAL_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="mw-chip">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
