import { NprConverter } from "@/modules/web/calculators";
import { AREA, formatIndian } from "@/modules/web/calculators/npr";
import "@/modules/web/styles/calc.css";
import { CtaBand } from "@/modules/web/components/content/CtaBand";
import { Disclaimer } from "@/modules/web/components/content/Disclaimer";
import { Faq, type FaqEntry } from "@/modules/web/components/content/Faq";
import { PageIntro } from "@/modules/web/components/content/PageIntro";
import { PointGrid } from "@/modules/web/components/content/PointGrid";
import { Prose } from "@/modules/web/components/content/Prose";
import { WorkedExampleTable } from "@/modules/web/components/content/WorkedExampleTable";
import { TextLink } from "@/modules/web/components/ui/Button";
import { Section } from "@/modules/web/components/ui/Section";
import { PATHS } from "@/modules/web/config";
import { JsonLd, buildMetadata, webAppJsonLd } from "@/modules/web/seo";

const TITLE = "NPR to AUD converter, with lakh and crore";
const DESCRIPTION =
  "Convert Nepalese rupees to Australian dollars at today's rate, lakh and crore to millions, and ropani, aana, bigha and kattha to square metres. For deposits, gifts and property sales from Nepal.";

export const metadata = buildMetadata({ title: "NPR to AUD converter (lakh, crore, ropani)", description: DESCRIPTION, path: PATHS.nprConverter });

const m2 = (n: number, dp = 2) => `${n.toLocaleString("en-AU", { minimumFractionDigits: dp, maximumFractionDigits: dp })} m²`;

const NUMBERS = [
  { name: "Hundred", ne: "सय", value: 1e2, west: "100" },
  { name: "Thousand", ne: "हजार", value: 1e3, west: "1,000" },
  { name: "Lakh", ne: "लाख", value: 1e5, west: "100,000 (one hundred thousand)" },
  { name: "10 lakh", ne: "दस लाख", value: 1e6, west: "1,000,000 (one million)" },
  { name: "Crore", ne: "करोड", value: 1e7, west: "10,000,000 (ten million)" },
  { name: "Arab", ne: "अर्ब", value: 1e9, west: "1,000,000,000 (one billion)" },
  { name: "Kharab", ne: "खर्ब", value: 1e11, west: "100,000,000,000 (one hundred billion)" },
];

const LAND = [
  { name: "Ropani", ne: "रोपनी", m2: AREA.Ropani, note: "16 aana. Hilly region, including Kathmandu Valley" },
  { name: "Aana", ne: "आना", m2: AREA.Aana, note: "4 paisa" },
  { name: "Paisa", ne: "पैसा", m2: AREA.Paisa, note: "4 dam" },
  { name: "Dam", ne: "दाम", m2: AREA.Dam, note: "Smallest hilly unit" },
  { name: "Bigha", ne: "बिघा", m2: AREA.Bigha, note: "20 kattha. Terai" },
  { name: "Kattha", ne: "कट्ठा", m2: AREA.Kattha, note: "20 dhur" },
  { name: "Dhur", ne: "धुर", m2: AREA.Dhur, note: "Smallest Terai unit" },
];

/** Illustration only: a round number, clearly not today's rate. */
const ILLUSTRATIVE_RATE = 100;

const FAQ: FaqEntry[] = [
  { question: "How many lakh is one million?", answer: "Ten lakh. One lakh is 100,000, so 10 lakh is 1,000,000 and 1 crore (100 lakh) is 10 million." },
  {
    question: "How much is 1 crore rupees in Australian dollars?",
    answer:
      "Divide 10,000,000 by the number of rupees in one Australian dollar on the day. The rate changes daily, so enter today's rate in the converter. Your bank or transfer service will also take a fee or use a less favourable rate.",
  },
  { question: "How many square metres is 1 ropani?", answer: `About ${m2(AREA.Ropani)} (the factor this converter uses is ${AREA.Ropani}). One aana is 1/16 of a ropani, about ${m2(AREA.Aana)}.` },
  { question: "How many square metres is 1 bigha?", answer: `About ${m2(AREA.Bigha)}. One kattha is 1/20 of a bigha (about ${m2(AREA.Kattha)}) and one dhur is 1/20 of a kattha (about ${m2(AREA.Dhur)}).` },
  {
    question: "Can I use money from family in Nepal for my deposit?",
    answer:
      "Many lenders accept a gift from a parent or close family member, including money sent from overseas, if it is properly documented: usually a signed gift letter and records showing where the money came from and how it reached Australia. Policies differ between lenders, so talk to us before the money is transferred.",
  },
];

export default function NprConverterPage() {
  return (
    <>
      <JsonLd data={webAppJsonLd({ path: PATHS.nprConverter, name: "NPR and AUD, lakh and crore, and land area converter", description: DESCRIPTION })} />
      <PageIntro
        crumbs={[
          { name: "Calculators", path: PATHS.calculators },
          { name: "NPR and AUD converter", path: PATHS.nprConverter },
        ]}
        eyebrow="Converter"
        title={TITLE}
        lede="Convert rupees and Australian dollars at today's rate, move between lakh and crore and millions, and turn ropani or bigha into square metres. Useful when savings, a family gift or a land sale in Nepal is part of your deposit."
      />

      <Section id="converter" size="tight" className="mw-calcsection" aria-label="Converter">
        <NprConverter />
      </Section>

      <Section
        id="numbers"
        tone="white"
        layout="split"
        index="01"
        eyebrow="Numbers"
        title="Lakh, crore and arab, in Australian terms"
        lede="Nepal groups digits in twos after the first thousand: 12,34,56,789 there is 123,456,789 here. The converter can show either style."
      >
        <dl className="mw-glossary" style={{ gridTemplateColumns: "1fr" }}>
          {NUMBERS.map((n) => (
            <div key={n.name}>
              <dt>
                {n.name}
                <span lang="ne">{n.ne}</span>
              </dt>
              <dd className="mw-num">{formatIndian(n.value, 0)}</dd>
              <dd>{n.west}</dd>
            </div>
          ))}
        </dl>
        <div style={{ marginTop: 32 }}>
          <WorkedExampleTable
            caption={`Rupees to dollars at an illustrative ${ILLUSTRATIVE_RATE} NPR per AUD`}
            rowHeader="Nepalese rupees"
            columns={[
              { key: "digits", label: "In digits", numeric: true },
              { key: "aud", label: "Australian dollars", numeric: true },
            ]}
            rows={[
              { label: "Rs 5 lakh", value: 5e5 },
              { label: "Rs 25 lakh", value: 25e5 },
              { label: "Rs 50 lakh", value: 5e6 },
              { label: "Rs 1 crore", value: 1e7 },
              { label: "Rs 2.5 crore", value: 2.5e7 },
            ].map((r) => ({ label: r.label, cells: { digits: formatIndian(r.value, 0), aud: `$${(r.value / ILLUSTRATIVE_RATE).toLocaleString("en-AU")}` } }))}
            assumptions={[`Illustration only. ${ILLUSTRATIVE_RATE} is a round number chosen for easy maths, not today's exchange rate. Use the converter with the current rate.`]}
          />
        </div>
      </Section>

      <Section id="land" layout="split" index="02" eyebrow="Land" title="Ropani, aana, bigha and kattha" lede="Two systems are used in Nepal: ropani-aana-paisa-dam in the hills and bigha-kattha-dhur in the Terai. These are the factors the converter uses.">
        <dl className="mw-glossary" style={{ gridTemplateColumns: "1fr" }}>
          {LAND.map((l) => (
            <div key={l.name}>
              <dt>
                {l.name}
                <span lang="ne">{l.ne}</span>
              </dt>
              <dd className="mw-num">{m2(l.m2)}</dd>
              <dd>{l.note}</dd>
            </div>
          ))}
        </dl>
        <p className="mw-small" style={{ marginTop: 20 }}>
          For comparison, a 500 m² house block is just under 1 ropani ({(500 / AREA.Ropani).toFixed(2)} ropani) or about {(500 / AREA.Kattha).toFixed(2)} kattha.
        </p>
      </Section>

      <Section
        id="deposit"
        tone="white"
        layout="split"
        index="03"
        eyebrow="Money from Nepal"
        title="Using savings or a gift from Nepal for your deposit"
        lede="Lenders assess your deposit in Australian dollars, and they want to see where it came from."
      >
        <PointGrid
          items={[
            { title: "Show the trail", body: "Statements for the account the money came from, the transfer receipt, and the Australian account it arrived in. Large unexplained deposits slow approvals down." },
            { title: "Gifts need a letter", body: "A signed gift letter from the family member saying the money is a gift, not a loan. Some lenders have their own form." },
            { title: "Selling land", body: "If the money comes from selling property in Nepal, keep the sale documents and the bank records of the payment." },
            { title: "Their rate, not yours", body: "Lenders convert foreign money at their own rate and some count only part of it. Allow a margin when you plan your deposit." },
          ]}
        />
        <Prose className="mw-small" as="div">
          <p style={{ marginTop: 24 }}>
            Banks in Nepal have their own requirements for sending money overseas, and money arriving from overseas can have Australian tax or reporting consequences. Check with your bank and a registered tax agent before moving large amounts.
          </p>
        </Prose>
        <p className="mw-small" style={{ marginTop: 16, display: "flex", gap: "8px 24px", flexWrap: "wrap" }}>
          <TextLink href={PATHS.visaHomeLoans} arrow>
            Buying on a visa or as a new PR
          </TextLink>
          <TextLink href={PATHS.borrowingPower} arrow>
            Borrowing power calculator
          </TextLink>
        </p>
      </Section>

      <Section id="faq" layout="split" index="04" eyebrow="Questions" title="Converter questions">
        <Faq items={FAQ} />
      </Section>

      <Section id="note" size="tight" aria-label="Important information">
        <Disclaimer>
          <p>
            Exchange rates come from you; we don&rsquo;t supply or update one. Land-area factors are the conventional conversions; a survey or land certificate (lalpurja) is the
            authority for any particular plot.
          </p>
        </Disclaimer>
      </Section>

      <CtaBand title="Planning a deposit with money from Nepal" body="We can tell you what lenders will want to see before the money moves." />
    </>
  );
}
