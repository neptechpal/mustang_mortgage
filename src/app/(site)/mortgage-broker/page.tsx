import { ConsultationCard } from "@/modules/web/components/content/ConsultationCard";
import { CtaBand } from "@/modules/web/components/content/CtaBand";
import { Disclaimer } from "@/modules/web/components/content/Disclaimer";
import { Faq, type FaqEntry } from "@/modules/web/components/content/Faq";
import { PageIntro } from "@/modules/web/components/content/PageIntro";
import { PointGrid } from "@/modules/web/components/content/PointGrid";
import { TextLink } from "@/modules/web/components/ui/Button";
import { Container } from "@/modules/web/components/ui/Container";
import { Fact } from "@/modules/web/components/ui/Fact";
import { IndexList } from "@/modules/web/components/ui/IndexList";
import { Section } from "@/modules/web/components/ui/Section";
import { PATHS, SITE } from "@/modules/web/config";
import { consultationModes } from "@/modules/web/format";
import { JsonLd, buildMetadata, webPageJsonLd } from "@/modules/web/seo";
import { NSW_LGA_GROUPS } from "@/modules/seo-data/lgas";
import { suburbDataset } from "@/modules/seo-data/suburbs";
import { PUBLISHED_SUBURBS } from "@/modules/web/suburbs/model";
import { period } from "@/modules/web/suburbs/copy";

const TITLE = "Where we work: a NSW mortgage broker by phone and video";
const DESCRIPTION =
  "Mustang Mortgage is based in NSW and works with home buyers by phone and video, with no branch offices. Suburb guides for Sydney and NSW with ABS and DCJ data.";

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATHS.mortgageBroker });

export default function MortgageBrokerHub() {
  const modes = consultationModes();
  const lgaCount = NSW_LGA_GROUPS.length;
  const salesPeriod = period(suburbDataset.sources.dcjSales?.period ?? "");
  const faq: FaqEntry[] = [
    {
      question: "Do you have an office near me?",
      answer: `No. We are based in New South Wales and don't run branch offices or shopfronts. Every consultation is by ${modes}, and documents go through our secure client portal, so where you live doesn't change how we work with you.`,
    },
    {
      question: "Can you help if I'm buying outside NSW?",
      answer:
        "Yes. Most of our clients buy in Sydney and across NSW, but we work with buyers anywhere in Australia. Stamp duty, first home concessions and grants differ by state, and the stamp duty calculator covers every state and territory.",
    },
    {
      question: "Where do the figures in your suburb guides come from?",
      answer: `People and housing figures come from the ABS 2021 Census. Sale prices and rents come from the NSW Department of Communities and Justice Rent and Sales Report (sales for ${salesPeriod}). Duty and fees are worked out with our calculator from the Revenue NSW rules, and each guide lists its sources and the date the data was last updated.`,
    },
  ];
  return (
    <>
      <JsonLd data={webPageJsonLd({ path: PATHS.mortgageBroker, name: TITLE, description: DESCRIPTION, type: "CollectionPage" })} />
      <PageIntro
        crumbs={[{ name: "Mortgage broker", path: PATHS.mortgageBroker }]}
        eyebrow="Where we work"
        title={
          <>
            A NSW mortgage broker, working with you by <em>phone and video</em>
          </>
        }
        lede={`${SITE.serviceArea.long} We don't have branch offices: our suburb guides are information pages, not local offices.`}
        aside={<ConsultationCard />}
      />

      <Section
        id="how"
        tone="white"
        layout="split"
        index="01"
        eyebrow="How it works"
        title="What working with us looks like when we're not around the corner"
        lede="The whole process runs remotely, from the first call to settlement."
      >
        <PointGrid
          items={[
            { title: `${SITE.consultation.minutes} minutes by ${modes}`, body: `${SITE.hours.days}, at morning, midday and evening times, Sydney time. Rough figures are fine for the first call.` },
            { title: "Documents through a secure portal", body: "Payslips, bank statements, ID and visa documents go through a private upload link, not email attachments." },
            {
              title: "Lenders on our panel",
              body: (
                <>
                  We compare loans from <Fact path="lenderPanel.count" /> lenders on our panel, and lenders lend across Australia, so your suburb doesn&rsquo;t limit your options.
                </>
              ),
            },
            { title: "Settlement with your conveyancer", body: "We work with your conveyancer or solicitor, wherever they are, through to settlement." },
          ]}
        />
      </Section>

      <Section
        id="guides"
        layout="split"
        index="02"
        eyebrow="Suburb guides"
        title="Home-buying guides for NSW suburbs"
        lede={`${PUBLISHED_SUBURBS.length} suburbs across ${lgaCount} council areas, chosen where many of the people we help live. Each guide has the suburb's own prices, rents, duty and deposit figures, with sources.`}
      >
        <IndexList
          items={[
            {
              href: PATHS.mortgageBrokerNsw,
              title: "NSW suburb guides by council area",
              description: "Sydney suburbs from Hornsby to Edmondson Park, plus Dubbo for regional visa holders.",
              meta: `${PUBLISHED_SUBURBS.length} suburbs · ${lgaCount} council areas · DCJ sales ${salesPeriod}`,
            },
            { href: PATHS.stampDutyNsw, title: "NSW stamp duty calculator", description: "Transfer duty, the first home buyer concession and surcharge purchaser duty for any price." },
            { href: PATHS.firstHomeBuyersNsw, title: "First home buyers in NSW", description: "The First Home Buyers Assistance Scheme, the First Home Owner Grant and the 5% Deposit Scheme." },
          ]}
        />
      </Section>

      <Section id="outside-nsw" tone="sand" layout="split-even" index="03" eyebrow="Outside NSW" title="Buying in another state">
        <div className="mw-stack" style={{ ["--mw-stack" as string]: "18px" }}>
          <p className="mw-body">
            Our suburb guides cover NSW for now. If you are buying in Victoria, Queensland, the ACT or anywhere else, we work the same way: by {modes}, with documents through the
            portal. The main differences between states are stamp duty, first home concessions and grants.
          </p>
          <p>
            <TextLink href={PATHS.stampDuty} arrow>
              Stamp duty in every state
            </TextLink>
          </p>
        </div>
      </Section>

      <Section id="faq" layout="split" index="04" eyebrow="Questions" title="About where we work">
        <Faq items={faq} />
      </Section>

      <CtaBand />
      <Container>
        <div style={{ paddingBottom: 64 }}>
          <Disclaimer />
        </div>
      </Container>
    </>
  );
}
