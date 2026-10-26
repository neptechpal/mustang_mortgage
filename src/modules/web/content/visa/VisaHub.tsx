import { RULES } from "@/modules/calc/rules";
import { COMMON_FACTS, SRC, getVisaPolicy } from "@/modules/seo-data/visas";
import type { VisaPolicy } from "@/modules/seo-data/types";
import { CtaBand } from "../../components/content/CtaBand";
import { Disclaimer } from "../../components/content/Disclaimer";
import { Faq, type FaqEntry } from "../../components/content/Faq";
import { PageIntro } from "../../components/content/PageIntro";
import { PointGrid } from "../../components/content/PointGrid";
import { Prose } from "../../components/content/Prose";
import { Sources } from "../../components/content/Sources";
import { WorkedExampleTable } from "../../components/content/WorkedExampleTable";
import { LinkButton, TextLink } from "../../components/ui/Button";
import { Fact } from "../../components/ui/Fact";
import { IndexList } from "../../components/ui/IndexList";
import { Section } from "../../components/ui/Section";
import { PATHS } from "../../config";
import { formatAud, formatDate } from "../../format";
import { JsonLd, webPageJsonLd } from "../../seo";
import { ReviewLine, type PageReview } from "../shared/review";
import { FIRB_RULES, STATE_ORDER } from "../shared/rules";
import { earliestDate, fromSourced, latestDate, toSourceItems, type SourceInput } from "../shared/sources";
import { VISA_PAGES, visaPath } from "./index";
import { buildMatrix } from "./matrix";

export const VISA_HUB = {
  title: "Home loans for visa holders and new permanent residents",
  metaTitle: "Visa and PR home loans: FIRB, duty and lenders by visa",
  description:
    "How your visa changes a home loan: lender policy, FIRB approval, the established-home ban and state surcharges. Guides for the 189, 190, 491, 191, 482, 494, 186, partner, bridging and NZ citizens.",
  publishedAt: "2026-10-26",
  updatedAt: "2026-10-26",
};

const ban = COMMON_FACTS.establishedDwellingBan;

/** One representative record per residency class (the facts are per class in seo-data/visas). */
const CLASSES: { label: string; examples: string; p: VisaPolicy }[] = [
  { label: "Permanent visa", examples: "189, 190, 191, 186, 801, 100 and other permanent visas", p: getVisaPolicy("permanent-residents")! },
  { label: "New Zealand citizen (444)", examples: "Special Category visa", p: getVisaPolicy("new-zealand-citizens")! },
  { label: "Temporary visa", examples: "491, 494, 482, 820, 309 and bridging visas", p: getVisaPolicy("subclass-482")! },
];

function surchargeSummary(p: VisaPolicy) {
  const rows = buildMatrix(p.stateRules);
  const yes = rows.filter((r) => r.surcharge.tone === "yes").map((r) => r.state);
  const cond = rows.filter((r) => r.surcharge.tone === "cond").map((r) => r.state);
  const confirm = rows.filter((r) => r.surcharge.tone === "confirm").map((r) => r.state);
  const list = (a: string[]) => (a.length > 1 ? `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}` : a[0]);
  const parts: string[] = [];
  if (yes.length) {
    parts.push(`Yes in ${list(yes)}`);
    if (cond.length) parts.push(`${list(cond)}: unless a residence test is met`);
  } else parts.push(cond.length ? `No, except in ${list(cond)} if a residence test isn't met` : "No");
  if (confirm.length) parts.push(`${list(confirm)}: confirm`);
  return parts.join("; ");
}

const tri = (t: string, yes: string, no: string, other = "Confirm") => (t === "yes" ? yes : t === "no" ? no : other);

const FAQ: FaqEntry[] = [
  {
    question: "Can I get a home loan on a temporary visa?",
    answer: `Often, yes, but fewer lenders will consider it and most want a larger deposit. You are a foreign person for FIRB, so you need approval to buy, and until ${formatDate(ban.to)} you can only buy a new home or vacant land. Most states also charge a foreign buyer surcharge on top of transfer duty.`,
  },
  {
    question: "Do permanent residents need FIRB approval?",
    answer: "No. Permanent visa holders are exempt from FIRB approval for residential land, including established homes. New Zealand citizens who hold or are eligible for a 444 visa are exempt too.",
  },
  {
    question: "Which visas can use the 5% Deposit Scheme?",
    answer:
      "The scheme is for Australian citizens and permanent residents. It isn't available if any applicant holds a temporary visa, including where permanent residence has been applied for but not granted. For New Zealand citizens, the participating lender confirms eligibility.",
  },
  {
    question: "Is it worth waiting for permanent residence before buying?",
    answer:
      "It often is, because the grant removes FIRB approval, the established-home ban and foreign buyer surcharges, and opens first home schemes. The cost of waiting is more rent. We compare the two with your own figures.",
  },
  {
    question: "Are you migration agents?",
    answer: "No. We arrange home loans. For questions about your visa, its conditions or your next application, speak to a registered migration agent or the Department of Home Affairs.",
  },
];

export function VisaHub({ review }: { review: PageReview }) {
  const firbFees = FIRB_RULES.fees2026_27.newOrVacant;
  const surcharges = STATE_ORDER.map((s) => ({ s, fs: RULES[s].foreignSurcharge }));
  const surchargeChecked = earliestDate(...surcharges.map((x) => x.fs.verifiedAt));

  const sourceInputs: SourceInput[] = [
    ...CLASSES.flatMap((c) => [...fromSourced(c.p.firb), ...fromSourced(c.p.establishedDwellingBan), ...fromSourced(c.p.fiveDepositScheme), ...fromSourced(c.p.helpToBuy)]),
    { url: FIRB_RULES.fees2026_27.scheduleUrl, verifiedAt: FIRB_RULES.verifiedAt, title: "Schedule of fees 2026-27 (version 8)" },
    ...surcharges.map(({ fs, s }) => ({ url: fs.sourceUrls[0], verifiedAt: fs.verifiedAt, title: `${fs.name} (${s})` })),
    { url: SRC.draAreas, verifiedAt: COMMON_FACTS.establishedDwellingBan.verifiedAt },
  ];
  const sources = toSourceItems(sourceInputs);
  const dataDate = latestDate(...CLASSES.map((c) => c.p.verifiedAt), surchargeChecked);

  return (
    <>
      <JsonLd
        data={webPageJsonLd({
          path: PATHS.visaHomeLoans,
          name: VISA_HUB.title,
          description: VISA_HUB.description,
          type: "CollectionPage",
          about: { "@type": "Thing", name: "Home loans for visa holders and permanent residents in Australia" },
        })}
      />
      <PageIntro
        crumbs={[{ name: "Visa and PR home loans", path: PATHS.visaHomeLoans }]}
        eyebrow="Visa and PR home loans"
        title={
          <>
            Home loans for visa holders and new <em>permanent residents</em>
          </>
        }
        lede="Your visa decides more than most people expect: which lenders will look at your application, whether you need FIRB approval, what you are allowed to buy, and how much duty you pay. These guides set out each rule, with the date we last checked it."
        actions={
          <>
            <LinkButton href={PATHS.book} arrow>
              Book a consultation
            </LinkButton>
            <TextLink href="#guides" arrow>
              Find your visa
            </TextLink>
          </>
        }
      >
        <ReviewLine review={review} updatedAt={dataDate} />
      </PageIntro>

      <Section
        id="how"
        layout="split"
        index="01"
        eyebrow="Three things change"
        title="How a visa changes a home loan"
        lede="The loan itself works the same way for everyone. What changes is who will lend, what you can buy and what it costs."
      >
        <PointGrid
          columns={2}
          items={[
            {
              title: "Lender policy",
              body: (
                <p>
                  Each lender decides which visas it accepts, how much it will lend as a share of the value, and what it needs to see. Permanent residents are often assessed like
                  citizens. Temporary visa holders face fewer lenders and usually need a larger deposit. These policies change during the year, so we check them when you apply.
                </p>
              ),
            },
            {
              title: "FIRB approval",
              body: (
                <p>
                  Temporary residents are foreign persons under foreign investment law and need approval from the Foreign Investment Review Board before buying. Until{" "}
                  {formatDate(ban.to)} they are also banned from buying established homes. Permanent residents and most New Zealand citizens living here are exempt.
                </p>
              ),
            },
            {
              title: "State duty and grants",
              body: (
                <p>
                  Most states charge foreign buyers a surcharge on top of transfer duty, and most first home concessions and grants need at least one buyer who is a citizen or
                  permanent resident. The state where the property is decides, not the state that nominated you.
                </p>
              ),
            },
            {
              title: "Deposit schemes",
              body: (
                <p>
                  The 5% Deposit Scheme is for citizens and permanent residents; Help to Buy is for citizens only. For many visa holders, the grant of permanent residence is the
                  point where these schemes open up.
                </p>
              ),
            },
          ]}
        />
      </Section>

      <Section
        id="guides"
        tone="white"
        index="02"
        eyebrow="Guides by visa"
        title="Find the guide for your visa"
        lede="Each guide covers what lenders look at, FIRB, an eight-state duty and grant table, deposits, documents and a worked example."
      >
        <IndexList
          columns={2}
          items={VISA_PAGES.map((v) => {
            const p = getVisaPolicy(v.slug);
            return {
              href: visaPath(v.slug),
              title: v.short,
              description: v.blurb,
              meta: p ? (p.permanent === "mixed" ? "Temporary, then permanent" : p.permanent ? "Permanent" : v.slug === "new-zealand-citizens" ? "Special Category visa" : "Temporary") : undefined,
            };
          })}
        />
        <p className="mw-small" style={{ marginTop: 24, maxWidth: "70ch" }}>
          Part of the Nepali community in Sydney? See our page for <TextLink href={PATHS.nepaliCommunity}>Nepali home buyers in Sydney</TextLink>, including gift deposits from family
          overseas.
        </p>
      </Section>

      <Section
        id="classes"
        layout="split"
        index="03"
        eyebrow="At a glance"
        title="What each kind of visa allows"
        lede="Federal rules depend on your residency class, not your exact subclass. State rules are summarised from each state's foreign-buyer and first home rules."
      >
        <WorkedExampleTable
          caption="Buying a home to live in, by residency class"
          rowHeader="Rule"
          columns={CLASSES.map((c, i) => ({ key: `c${i}`, label: c.label }))}
          rows={[
            { label: "Examples", cells: Object.fromEntries(CLASSES.map((c, i) => [`c${i}`, c.examples])) },
            { label: "FIRB approval", cells: Object.fromEntries(CLASSES.map((c, i) => [`c${i}`, tri(c.p.firb.approvalRequired, "Needed", "Not needed")])) },
            {
              label: "Established homes",
              cells: Object.fromEntries(
                CLASSES.map((c, i) => [`c${i}`, c.p.establishedDwellingBan.applies === "yes" ? `Banned to ${formatDate(ban.to)}` : tri(c.p.establishedDwellingBan.applies, "Banned", "Allowed")]),
              ),
            },
            { label: "Foreign buyer surcharge", cells: Object.fromEntries(CLASSES.map((c, i) => [`c${i}`, surchargeSummary(c.p)])) },
            {
              label: "5% Deposit Scheme",
              cells: Object.fromEntries(CLASSES.map((c, i) => [`c${i}`, c.p.fiveDepositScheme.verified ? tri(c.p.fiveDepositScheme.eligible, "Eligible", "Not eligible") : "Lender confirms"])),
            },
            { label: "Help to Buy", cells: Object.fromEntries(CLASSES.map((c, i) => [`c${i}`, tri(c.p.helpToBuy.eligible, "Eligible", "Citizens only")])) },
          ]}
          note={<>Checked against FIRB, Housing Australia and each state revenue office on {formatDate(earliestDate(...CLASSES.map((c) => c.p.verifiedAt), surchargeChecked))}.</>}
        />
      </Section>

      <Section id="firb" tone="sand" layout="split" index="04" eyebrow="FIRB" title="The established-home ban and FIRB fees">
        <Prose>
          <p>
            From {formatDate(ban.from)} to {formatDate(ban.to)}, foreign persons, including temporary residents and foreign-owned companies, are generally banned from buying
            established dwellings. The ban was due to end on {formatDate(ban.originalTo)} and was extended in the 2026-27 Budget. Its exceptions are commercial, such as
            redevelopments that add at least 20 dwellings, so they don&rsquo;t help someone buying a home to live in.
          </p>
          <p>
            New dwellings and vacant land can still be bought with FIRB approval. The application fee depends on the price. If a developer holds a New or Near-New Dwelling
            Exemption Certificate, buyers in that project don&rsquo;t need their own approval.
          </p>
        </Prose>
        <div style={{ marginTop: 28 }}>
          <WorkedExampleTable
            caption="FIRB application fee for a new dwelling or vacant land, 2026-27"
            rowHeader="Price"
            columns={[{ key: "fee", label: "Fee", numeric: true }]}
            rows={firbFees.map((r, i) => ({
              label: i === 0 ? `Up to ${formatAud(r.upTo)}` : `${formatAud(firbFees[i - 1].upTo + 1)} to ${formatAud(r.upTo)}`,
              cells: { fee: formatAud(r.fee) },
            }))}
            note={
              <>
                Schedule of Fees v8, checked {formatDate(FIRB_RULES.verifiedAt)}. Higher tiers are in the{" "}
                <a className="mw-link" href={FIRB_RULES.fees2026_27.scheduleUrl} target="_blank" rel="noopener noreferrer">
                  full schedule
                </a>
                .
              </>
            }
          />
        </div>
      </Section>

      <Section
        id="surcharges"
        layout="split"
        index="05"
        eyebrow="State surcharges"
        title="Foreign buyer duty surcharges by state"
        lede="Charged on top of normal transfer duty when a buyer is a foreign person under that state's rules. Each state defines foreign differently."
      >
        <WorkedExampleTable
          caption="Foreign buyer surcharge rates"
          rowHeader="State"
          columns={[
            { key: "name", label: "Name" },
            { key: "rate", label: "Rate", numeric: true },
          ]}
          rows={surcharges.map(({ s, fs }) => ({ label: s, cells: { name: fs.ratePct ? fs.name : "No surcharge on duty", rate: fs.ratePct ? `${fs.ratePct}%` : "—" } }))}
          note={<>Percent of the dutiable value. Checked against each revenue office on {formatDate(surchargeChecked)}.</>}
        />
      </Section>

      <Section id="scope" tone="white" layout="split-even" index="06" eyebrow="What we do" title="What we can help with, and what we can't">
        <div className="mw-stack" style={{ ["--mw-stack" as string]: "18px" }}>
          <p className="mw-body">
            We arrange home loans. For visa holders that means working out which lenders on our panel accept your visa, what they will need, how much deposit you need once FIRB and
            surcharges are counted, and when it makes sense to wait. We compare loans from <Fact path="lenderPanel.count" /> lenders on our panel; not every lender in Australia is on
            it, and not every lender accepts every visa.
          </p>
          <p className="mw-body">
            We are not migration agents and we don&rsquo;t give legal advice. Questions about your visa or your next application belong with a registered migration agent. FIRB
            applications and contract terms are for you and your conveyancer or lawyer; we make sure your loan timing fits around them.
          </p>
        </div>
      </Section>

      <Section id="faq" layout="split" index="07" eyebrow="Questions" title="What visa holders ask us first">
        <Faq items={FAQ} />
      </Section>

      <CtaBand title="Talk through your visa with Sulav" body="Bring your visa grant notice and a rough idea of your savings. In 60 minutes we work out which lenders fit and what the purchase will really cost." />

      <Section id="sources-section" size="tight" width="narrow">
        <Sources items={sources} intro="The rules on this page come from these official sources. Each visa guide lists its own." />
        <div style={{ marginTop: 32 }}>
          <Disclaimer>
            <p>We are not registered migration agents and nothing here is immigration advice.</p>
          </Disclaimer>
        </div>
      </Section>
    </>
  );
}
