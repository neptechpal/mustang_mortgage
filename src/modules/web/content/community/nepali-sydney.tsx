import { SUBURBS, suburbDataset } from "@/modules/seo-data/suburbs";
import { getVisaPolicy } from "@/modules/seo-data/visas";
import { ArticleLayout } from "../../components/content/ArticleLayout";
import { CtaBand } from "../../components/content/CtaBand";
import { Disclaimer } from "../../components/content/Disclaimer";
import { Faq, type FaqEntry } from "../../components/content/Faq";
import { Prose } from "../../components/content/Prose";
import { Sources } from "../../components/content/Sources";
import { WorkedExampleTable } from "../../components/content/WorkedExampleTable";
import { TextLink } from "../../components/ui/Button";
import { Callout } from "../../components/ui/Callout";
import { PATHS, SITE } from "../../config";
import { consultationModes, formatDate } from "../../format";
import { BUSINESS_ID, JsonLd, webPageJsonLd } from "../../seo";
import { ReviewLine, type PageReview } from "../shared/review";
import { fromSourced, toSourceItems } from "../shared/sources";

export const NEPALI_SYDNEY = {
  title: "Mortgage broker for Nepali home buyers in Sydney",
  description: "Practical home loan guidance for Nepali-Australian buyers: family gifts from Nepal, overseas income, visa stages, Sydney suburb data and the NPR–AUD converter.",
  updatedAt: "2026-10-26",
};

const sectionStyle = { marginTop: 72 } as const;
const COMMUNITY_SUBURBS = SUBURBS.filter((s) => ["auburn-2144", "hurstville-2220", "strathfield-2135", "rockdale-2216", "kogarah-2217"].includes(s.slug));
const dataDate = suburbDataset.pulledAt.slice(0, 10);
const regionalCondition = getVisaPolicy("subclass-491")!.regionalCondition;
const SOURCE_FUNDS = {
  url: "https://www.austrac.gov.au/industry-and-business/obligations-and-guidance/your-amlctf-program/customer-due-diligence/source-funds-and-source-wealth",
  title: "Source of funds and source of wealth",
  publisher: "AUSTRAC",
  verifiedAt: "2026-10-26",
};
const TRANSFERS = {
  url: "https://moneysmart.gov.au/banking/sending-money-overseas",
  title: "Sending money overseas: costs and providers",
  publisher: "Moneysmart (ASIC)",
  verifiedAt: "2026-10-26",
};

const sources = toSourceItems([
  SOURCE_FUNDS,
  TRANSFERS,
  ...(regionalCondition ? fromSourced(regionalCondition) : []),
  ...COMMUNITY_SUBURBS.map((s) => ({ url: s.census.sourceRef.sourceUrl, title: `${s.name}: Census ${s.census.sourceRef.year}`, verifiedAt: dataDate })),
]);

const FAQ: FaqEntry[] = [
  {
    question: "Can family in Nepal give me money for a deposit?",
    answer: "A documented gift may be acceptable, depending on the lender and your application. Ask us to check before arranging the transfer. Keep the donor’s evidence, a gift letter or requested declaration, and the records linking the transfer to your Australian account. Transfer permissions need separate confirmation in Nepal.",
  },
  {
    question: "Is a gift from my parents the same as genuine savings?",
    answer: "Not automatically. Genuine savings is a lender policy test about the deposit history. The lender decides whether a gift qualifies, whether it needs to be held for a period and what other evidence is acceptable. There is no single holding period we can promise across lenders.",
  },
  {
    question: "Can income or property in Nepal help my application?",
    answer: "It may be relevant, but it needs evidence and lender assessment. Disclose income, assets and debts together. An overseas property valuation is not cash available for settlement. We check what the lender will accept before including income in your borrowing estimate.",
  },
  {
    question: "Can I plan to buy while a permanent visa application is pending?",
    answer: "You can prepare documents and compare budgets. Tell us your current visa, expiry and expected changes, and obtain migration advice about your conditions. Any loan or purchase assessment needs to use the status and evidence that actually apply, rather than assume a future visa grant.",
  },
  {
    question: "Do I need to live near the broker?",
    answer: `No. Consultations are available by ${consultationModes()}. We are based in ${SITE.serviceArea.base} and work with buyers across Australia. You can discuss family funds, documents and a property shortlist before deciding where to buy.`,
  },
];

export function NepaliSydney({ review }: { review: PageReview }) {
  const nepaliConfirmed = SITE.languages.some((language) => language.label === "Nepali" && language.confirmed);

  return (
    <>
      {/* The shared chrome supplies the Person node and confirmed knowsLanguage values. */}
      <JsonLd data={webPageJsonLd({
        path: PATHS.nepaliCommunity,
        name: NEPALI_SYDNEY.title,
        description: NEPALI_SYDNEY.description,
        about: { "@type": "Thing", name: "Home buying for the Nepali-Australian community in Sydney" },
        mainEntity: {
          "@type": "Service",
          name: "Home loan assistance for Nepali-Australian buyers",
          serviceType: "Mortgage broking",
          provider: { "@id": BUSINESS_ID },
          areaServed: { "@type": "City", name: "Sydney" },
        },
      })} />
      <ArticleLayout
        crumbs={[{ name: "Nepali home buyers in Sydney", path: PATHS.nepaliCommunity }]}
        eyebrow="Nepali-Australian home buyers · Sydney"
        title={NEPALI_SYDNEY.title}
        lede={
          <>
            <p className="mw-lede">A deposit from Nepal, an Australian income and a changing visa can all be part of the same purchase. We help you put the documents and numbers together.</p>
            <ReviewLine review={review} updatedAt={NEPALI_SYDNEY.updatedAt} />
          </>
        }
        summary={<p>A family gift may help with your deposit, but the lender needs to understand the arrangement and where the money came from. Before funds move, check the evidence required, the transfer arrangements and your current visa. Acceptance depends on the lender and the whole application.</p>}
        toc={[
          { id: "broker", label: "Working with Sulav" },
          { id: "family-funds", label: "Family funds from Nepal" },
          { id: "overseas", label: "Overseas income and assets" },
          { id: "visa", label: "Visa stages" },
          { id: "suburbs", label: "Sydney community data" },
          { id: "transfers", label: "Transfers and exchange rates" },
          { id: "converter", label: "Lakh, crore, NPR and AUD" },
          { id: "faq", label: "Questions" },
          { id: "sources", label: "Sources" },
        ]}
        footer={
          <>
            <section id="faq" style={sectionStyle}>
              <h2 className="mw-h2 mb-6">Questions about buying with overseas connections</h2>
              <Faq items={FAQ} />
            </section>
            <div style={sectionStyle}>
              <CtaBand bare compact title="Discuss your deposit and documents with Sulav" body="Bring a rough savings total, your current visa details and a description of any family contribution. We can work through what needs checking before you apply." />
            </div>
            <div style={sectionStyle}>
              <Sources items={sources} intro="Official guidance and Census records, with checked dates. Document lists are preparation guidance; each lender confirms its requirements." />
            </div>
            <Disclaimer>
              <p>For migration, overseas transfer permissions and ownership arrangements, obtain advice from the relevant qualified adviser. We arrange home loans.</p>
            </Disclaimer>
          </>
        }
      >
        <section id="broker" style={sectionStyle}>
          <Prose>
            <h2>Working with Sulav</h2>
            <p>{SITE.broker.name} is a {SITE.broker.role.toLowerCase()} based in {SITE.serviceArea.base}. We work with first home buyers, skilled visa holders and permanent residents. Consultations run for {SITE.consultation.minutes} minutes by {consultationModes()}, so you can discuss a purchase without travelling to an office.</p>
            <p>Tell us which funds are already available, which depend on family and whether any money must be repaid. We can then check lender requirements against your situation. Read <TextLink href={PATHS.broker}>about Sulav</TextLink> and <TextLink href={PATHS.howWeArePaid}>how we are paid</TextLink> before booking.</p>
            {nepaliConfirmed && <p>Nepali-speaking support is available for your consultation.</p>}
            {/* Human-translated Nepali summary slot: add only after translation and language support are confirmed. */}
            {/* Add Sulav's personal story or community-event details only when supplied and approved. */}
          </Prose>
        </section>

        <section id="family-funds" style={sectionStyle}>
          <Prose>
            <h2>A deposit gift from family in Nepal</h2>
            <p>First clarify what the family intends. A gift, a repayable family loan and money contributed in return for ownership are different arrangements. Tell us about any repayment expectation, including an informal one. Your solicitor can help document ownership or family loan terms; the lender needs an accurate description.</p>
            <h3>Gift letter or statutory declaration</h3>
            <p>Ask which form the proposed lender accepts before relatives sign. A gift letter may need the donor’s name, relationship to you, amount, currency, date and confirmation that repayment is not expected. A lender may request a statutory declaration instead, with its own witnessing requirements. Do not describe a loan as a gift.</p>
            <h3>Evidence behind the transfer</h3>
            <p><TextLink href={SOURCE_FUNDS.url} external>AUSTRAC’s source-of-funds guidance</TextLink> distinguishes the underlying origin of money from the account it was sent from. Depending on the source, evidence may include savings statements, income records or a property sale agreement. A transfer receipt alone may not explain how the donor obtained the money. Guidance checked {formatDate(SOURCE_FUNDS.verifiedAt)}.</p>
            <p>Prepare a clear record from the donor’s account through the transfer provider to your Australian account. Keep complete statements and receipts, including names, dates, references, currencies and fees. If names differ between documents, flag the difference early. Ask about translations before paying to have documents translated.</p>
            <h3>Genuine savings is a separate check</h3>
            <p>A lender may accept the source of a gift yet still apply a genuine savings requirement. This concerns the deposit’s history and how it fits the loan policy. Holding periods, acceptable evidence and exceptions vary by lender. Ask us to confirm the policy for your proposed loan before treating gifted funds as sufficient.</p>
          </Prose>
          <div className="mt-7">
            <Callout title="Before family commits funds">
              <p>Separate confirmed savings from expected contributions in your budget. Ask the lender what it needs, and ask the sending bank what transfers from Nepal are permitted and documented. An Australian loan assessment does not establish permission to remit funds from Nepal.</p>
            </Callout>
          </div>
        </section>

        <section id="overseas" style={sectionStyle}>
          <Prose>
            <h2>Documenting overseas income and assets</h2>
            <p>Prepare an inventory of what you own, earn and owe in Nepal as well as Australia. Separate regular income, savings, property and money expected from a future sale. Include debts attached to an asset and ongoing commitments to family. This helps us ask the lender a precise question.</p>
            <p>For employment income, gather the contract, payslips and bank credits. For rental or business income, ask what lease, tax or financial records the lender needs. Confirm whether the lender accepts that income source and currency before including it in a borrowing estimate. Providing records does not ensure that all income will be counted.</p>
            <p>For property, start with ownership records, your share and any secured debt. An estimated value is different from sale proceeds available in your Australian account. If your deposit depends on a sale, discuss its timing, costs and transfer requirements before agreeing to an Australian settlement date.</p>
            <p>Keep original documents alongside any requested translations. Explain inconsistent spellings or dates rather than editing the originals. These are preparation suggestions: we will check the exact document format with the lender.</p>
          </Prose>
        </section>

        <section id="visa" style={sectionStyle}>
          <Prose>
            <h2>Match the purchase to your current visa stage</h2>
            <p>Bring the visa grant notice and current conditions for every buyer. Tell us about a pending application and any expected employment change. We can compare the lending questions now and after a possible status change, without assuming that a visa will be granted by settlement.</p>
            <p>Start with the guide for your situation: <TextLink href={PATHS.visa189}>189</TextLink>, <TextLink href={PATHS.visa190}>190</TextLink>, <TextLink href={PATHS.visa491}>491</TextLink>, <TextLink href={PATHS.visa191}>191</TextLink> or <TextLink href={PATHS.visa482}>482</TextLink>. There are separate guides for <TextLink href={PATHS.partnerVisa}>partner visas</TextLink>, <TextLink href={PATHS.bridgingVisa}>bridging visas</TextLink> and <TextLink href={PATHS.permanentResidents}>permanent residents</TextLink>.</p>
            {regionalCondition?.verified && (
              <p>If condition {regionalCondition.conditionCode} applies, living, working and studying must be in a designated regional area. Sydney is excluded. Check your conditions before planning to live in a Sydney home. <TextLink href={regionalCondition.sourceUrls[1]} external>Home Affairs regional guidance</TextLink>, verified {formatDate(regionalCondition.verifiedAt)}.</p>
            )}
            <p>The <TextLink href={PATHS.visaHomeLoans}>visa home loan hub</TextLink> separates lending policy, FIRB and state duty. For a first purchase, also use the <TextLink href={PATHS.firstHomeBuyersNsw}>NSW grants and concessions guide</TextLink>. A migration adviser and conveyancer can confirm the conditions affecting where and what you may buy.</p>
          </Prose>
        </section>

        <section id="suburbs" style={sectionStyle}>
          <Prose>
            <h2>Where the community lives in Sydney</h2>
            <p>The Census records Nepal-born residents in the suburbs below. This is a snapshot of usual residents in 2021, not a current population estimate. Country of birth does not identify everyone with Nepali heritage or everyone who speaks Nepali.</p>
          </Prose>
          <div className="mt-6">
            <WorkedExampleTable
              caption="Nepal-born residents, Census 2021"
              rowHeader="Suburb guide"
              columns={[{ key: "count", label: "Nepal-born residents", numeric: true }]}
              rows={COMMUNITY_SUBURBS.map((s) => ({
                label: <TextLink href={`${PATHS.mortgageBrokerNsw}/${s.slug}`}>{s.name}</TextLink>,
                cells: { count: s.census.nepalBorn === null ? "Not available" : s.census.nepalBorn.toLocaleString("en-AU") },
              }))}
              note={<>{COMMUNITY_SUBURBS[0]?.census.sourceRef.attribution}. Data last updated {formatDate(dataDate)}. Figures describe ABS suburb boundaries, not whole postcodes.</>}
            />
          </div>
          <Prose className="mt-7">
            <p>Use the suburb links for housing and local data, then build your own shortlist around work, transport, household needs and purchase costs. Community size does not establish affordability or loan eligibility. If considering an apartment, include strata costs and ask your conveyancer to review the building records before you commit.</p>
          </Prose>
        </section>

        <section id="transfers" style={sectionStyle}>
          <Prose>
            <h2>Sending money and comparing exchange rates</h2>
            <p>Ask providers for the AUD amount expected to arrive after conversion and all fees. Compare quotes on the same basis: amount sent, currency received, charges at each end and whether the quote can change before processing. A favourable headline exchange rate may still produce a smaller deposit after fees.</p>
            <p>Confirm that the provider handles transfers from Nepal to Australia, what the sender must supply and when cleared funds should arrive. Leave time for document checks and delays when planning settlement. Keep the quote and completed transfer receipt so differences between the expected and received amount can be explained.</p>
            <p><TextLink href={TRANSFERS.url} external>Moneysmart’s transfer checklist</TextLink> covers exchange rates, fees and delivery methods; checked {formatDate(TRANSFERS.verifiedAt)}. It does not confirm Nepal’s outward remittance permissions. Ask the sending bank about those requirements before arranging a payment. We do not quote exchange rates or promise transfer times.</p>
          </Prose>
        </section>

        <section id="converter" style={sectionStyle}>
          <Prose>
            <h2>Keep lakh, crore, NPR and AUD clear</h2>
            <p>The <TextLink href={PATHS.nprConverter}>NPR–AUD and lakh–crore converter</TextLink> helps put family discussions and an Australian purchase budget into consistent units. Choose the currency and unit carefully, then enter the exchange rate you want to use. Number grouping and currency conversion are separate calculations.</p>
            <p>Save the original NPR amount beside your AUD estimate and record the quote date. Update the budget when the provider confirms the net amount. The converter does not move money, include every transfer fee or establish that funds are available for settlement.</p>
          </Prose>
        </section>
      </ArticleLayout>
    </>
  );
}
