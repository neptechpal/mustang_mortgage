import { RULES } from "@/modules/calc/rules";
import type { AuState, Provenance } from "@/modules/calc/types";
import { ArticleLayout } from "../../components/content/ArticleLayout";
import { CtaBand } from "../../components/content/CtaBand";
import { Disclaimer } from "../../components/content/Disclaimer";
import { Faq, type FaqEntry } from "../../components/content/Faq";
import { Prose } from "../../components/content/Prose";
import { Sources } from "../../components/content/Sources";
import { WorkedExampleTable } from "../../components/content/WorkedExampleTable";
import { TextLink } from "../../components/ui/Button";
import { PATHS } from "../../config";
import { formatAud, formatDate } from "../../format";
import { JsonLd, webPageJsonLd } from "../../seo";
import { DEPOSIT_SCHEME, FHSS, HELP_TO_BUY, STATE_ORDER, concessionThresholds, fhbConcessionsFor, fhogFor, stateSlug } from "../shared/rules";
import { earliestDate, toSourceItems, type SourceInput } from "../shared/sources";

export const FHB_HUB = {
  title: "First home buyer grants and schemes in Australia",
  description: "Compare first home buyer grants, stamp duty concessions and federal deposit schemes across all eight states and territories, with official sources and checked dates.",
};

const sectionStyle = { marginTop: 72 } as const;
const statePath = (s: AuState) => `${PATHS.firstHomeBuyers}/${stateSlug(s)}`;
const homeConcessions = (s: AuState) => fhbConcessionsFor(s).filter((c) => c.appliesTo.includes("established") || c.appliesTo.includes("new"));
const checkedAt = earliestDate(DEPOSIT_SCHEME.verifiedAt, HELP_TO_BUY.verifiedAt, ...STATE_ORDER.map((s) => RULES[s].generalScale.verifiedAt));

function source(g: Provenance, title: string): SourceInput {
  return { url: g.sourceUrls[0], verifiedAt: g.verifiedAt, title };
}

function DutySummary({ state }: { state: AuState }) {
  const concessions = homeConcessions(state);
  if (!concessions.length) return <>No current general first home duty concession. See state guide for other relief.</>;
  return (
    <div className="space-y-3">
      {concessions.map((c) => {
        if (!c.verified) return <TextLink key={c.id} href={c.sourceUrls[0]} external>Confirm with {RULES[state].revenueOffice}</TextLink>;
        const t = concessionThresholds(state, c);
        const both = c.appliesTo.includes("new") && c.appliesTo.includes("established");
        const inclusive = c.bands.some((b) => b.kind === "marginal");
        return (
          <p key={c.id}>
            {both ? "New or established" : c.appliesTo.includes("new") ? "New homes only" : "Established"}: {t.exemptTo === Infinity
              ? "exempt, no value cap"
              : `exempt to ${formatAud(t.exemptTo ?? 0)}${t.reducedTo ? `; reduced duty ${inclusive ? "to" : "below"} ${formatAud(t.reducedTo)}` : ""}`}.
          </p>
        );
      })}
    </div>
  );
}

function GrantSummary({ state }: { state: AuState }) {
  const g = fhogFor(state);
  if (!g) return <>No current FHOG.</>;
  if (!g.verified) return <TextLink href={g.sourceUrls[0]} external>Confirm grant</TextLink>;
  return (
    <>
      {formatAud(g.amount)}. {g.appliesTo.includes("established") ? "See eligible home types." : "New homes only."}{" "}
      {g.priceCap === null ? "No price cap." : `Purchase ${g.capIsExclusive ? "below" : "up to"} ${formatAud(g.priceCap)}.`}{" "}
      {g.buildCap !== undefined && g.buildCap !== g.priceCap && `Land + build: ${g.buildCap === null ? "no cap" : formatAud(g.buildCap)}. `}
      {g.regionalCap && `${g.regionalCap.label}: ${g.regionalCap.priceCap === null ? "no cap" : formatAud(g.regionalCap.priceCap)}. `}
      {g.effectiveTo && `Eligible transaction before ${formatDate(g.effectiveTo)}.`}
    </>
  );
}

const stateSources = STATE_ORDER.flatMap((s) => {
  const r = RULES[s];
  const g = fhogFor(s);
  const concessions = homeConcessions(s);
  const closedGrant = r.otherConcessions.find((c) => c.id === "fhog-abolished");
  const endedDuty = r.otherConcessions.find((c) => c.id === "fhb-established-ended");
  return [
    ...concessions.map((c) => source(c, `${s}: ${c.name}`)),
    ...(!concessions.length ? [source(endedDuty ?? r.generalScale, `${s}: duty and concessions`)] : []),
    ...(g ? [source(g, `${s}: ${g.name}`)] : closedGrant ? [source(closedGrant, `${s}: FHOG closed`)] : []),
    source(r.foreignSurcharge, `${s}: foreign purchaser duty`),
  ];
});

const sources = toSourceItems([
  source(DEPOSIT_SCHEME, `${DEPOSIT_SCHEME.name}: price caps`),
  { url: DEPOSIT_SCHEME.sourceUrls[2], verifiedAt: DEPOSIT_SCHEME.verifiedAt, title: "Deposit scheme eligibility" },
  source(HELP_TO_BUY, HELP_TO_BUY.name),
  { url: HELP_TO_BUY.sourceUrls[2], verifiedAt: HELP_TO_BUY.verifiedAt, title: "Help to Buy income thresholds" },
  source(FHSS, FHSS.name),
  ...stateSources,
]);

const FAQ: FaqEntry[] = [
  {
    question: "Is the First Home Owner Grant the same as a duty exemption?",
    answer: "No. The grant contributes money towards an eligible purchase or build. A duty exemption removes transfer duty. They have separate eligibility and property tests, so qualifying for one does not establish eligibility for the other.",
  },
  {
    question: "Can I get help when buying an established home?",
    answer: "Some state duty concessions and federal schemes cover established homes. The current grants listed here are for new homes. Check the property type before including a grant in your deposit budget.",
  },
  {
    question: "Does a scheme price cap tell me what I can borrow?",
    answer: "No. It limits eligible properties. A lender separately assesses income, expenses, debts, the deposit and the property valuation. Allow for purchase costs as well as the deposit.",
  },
  {
    question: "Where do I start with the application?",
    answer: <>Use our <TextLink href={PATHS.homeLoansFirstHomeBuyers}>step-by-step first home buying guide</TextLink> for the process, documents and settlement preparation. Use the state guides here to check the assistance attached to the property.</>,
    answerText: "Use our step-by-step first home buying guide for the process, documents and settlement preparation. Use the state guides here to check the assistance attached to the property.",
  },
];

export function FhbHub() {
  return (
    <>
      <JsonLd data={webPageJsonLd({ path: PATHS.firstHomeBuyers, name: FHB_HUB.title, description: FHB_HUB.description, type: "CollectionPage" })} />
      <ArticleLayout
        crumbs={[{ name: "First home buyers", path: PATHS.firstHomeBuyers }]}
        eyebrow="First home buyers · Australia"
        title={FHB_HUB.title}
        lede="Start with the state where you are buying, the type of home and each buyer’s residency. Each scheme checks these separately."
        summary={<p>First home buyers may qualify for a state duty concession, a grant for a new home or a federal deposit scheme. They do different jobs: reduce purchase costs, contribute funds or help with the deposit. Eligibility for assistance does not mean a lender has approved the loan.</p>}
        toc={[
          { id: "national", label: "National schemes" },
          { id: "states", label: "Compare the states" },
          { id: "eligibility", label: "Who is eligible" },
          { id: "next", label: "Your next step" },
          { id: "faq", label: "Questions" },
          { id: "sources", label: "Sources" },
        ]}
        footer={
          <>
            <section id="faq" style={sectionStyle}>
              <h2 className="mw-h2 mb-6">First home buyer questions</h2>
              <Faq items={FAQ} />
            </section>
            <div style={sectionStyle}>
              <CtaBand bare compact title="Check which assistance fits your purchase" body="Bring your property budget, savings and residency details. Sulav can help check the available schemes and the cash needed for settlement." />
            </div>
            <div style={sectionStyle}>
              <Sources items={sources} intro="Official rules and their verification dates. Recheck eligibility and contract dates before committing." />
            </div>
            <Disclaimer />
          </>
        }
      >
        <section id="national" style={sectionStyle}>
          <Prose>
            <h2>National schemes</h2>
            <h3>{DEPOSIT_SCHEME.name}</h3>
            <p>Previously called the {DEPOSIT_SCHEME.formerNames[1]}, this scheme helps eligible buyers purchase with a deposit from {DEPOSIT_SCHEME.minDepositPct}%{!DEPOSIT_SCHEME.lmiPayable && " without lenders mortgage insurance (LMI)"}. The government guarantee supports the loan; it does not pay your deposit.</p>
            <ul>{DEPOSIT_SCHEME.eligibility.map((line) => <li key={line}>{line}</li>)}</ul>
          </Prose>
          <div className="mt-6">
            <WorkedExampleTable
              caption={`${DEPOSIT_SCHEME.minDepositPct}% Deposit Scheme property price caps`}
              rowHeader="State / territory"
              columns={[{ key: "capital", label: "Capital / listed centres", numeric: true }, { key: "regional", label: "Other areas", numeric: true }]}
              rows={STATE_ORDER.map((s) => ({ label: s, cells: { capital: formatAud(DEPOSIT_SCHEME.priceCaps[s].capital), regional: formatAud(DEPOSIT_SCHEME.priceCaps[s].regional) } }))}
              note={<>Effective {formatDate(DEPOSIT_SCHEME.effectiveFrom)}; checked against Housing Australia on {formatDate(DEPOSIT_SCHEME.verifiedAt)}. <TextLink href={DEPOSIT_SCHEME.sourceUrls[0]} external>Official caps</TextLink>.</>}
            />
          </div>
          <Prose className="mt-7">
            <p>{DEPOSIT_SCHEME.regionalCentres}</p>
            <p>{DEPOSIT_SCHEME.capTest}</p>
            <h3>Help to Buy</h3>
            <p>Status: {HELP_TO_BUY.status}; opened {formatDate(HELP_TO_BUY.openedOn)}. {HELP_TO_BUY.eligibility[0]} The minimum deposit is {HELP_TO_BUY.minDepositPct}%, with government equity of up to {HELP_TO_BUY.equityShareMaxPct.established}% for established homes or {HELP_TO_BUY.equityShareMaxPct.new}% for new homes. You must live in the home. This is shared equity, with ongoing obligations.</p>
            <p>For {HELP_TO_BUY.incomeCaps.financialYear}, income caps are {formatAud(HELP_TO_BUY.incomeCaps.single)} for a single applicant and {formatAud(HELP_TO_BUY.incomeCaps.joint)} for joint applicants or {formatAud(HELP_TO_BUY.incomeCaps.singleParent)} for a single parent. {HELP_TO_BUY.eligibility[1]} {HELP_TO_BUY.eligibility[4]}</p>
            <p className="mw-small">Help to Buy has separate property caps. Check the <TextLink href={HELP_TO_BUY.sourceUrls[1]} external>Help to Buy postcode tool</TextLink>. Checked against Housing Australia on {formatDate(HELP_TO_BUY.verifiedAt)}.</p>
            <h3>First Home Super Saver</h3>
            <p>Eligible voluntary super contributions can count towards a first home deposit, up to {formatAud(FHSS.maxPerFinancialYear)} per financial year and {formatAud(FHSS.maxTotal)} overall, plus associated earnings. Check the <TextLink href={FHSS.sourceUrls[0]} external>release rules</TextLink> before relying on these funds. Verified {formatDate(FHSS.verifiedAt)}.</p>
          </Prose>
        </section>

        <section id="states" style={sectionStyle}>
          <Prose>
            <h2>Compare all eight states and territories</h2>
            <p>This summary covers homes, with separate land rules in each state guide. Grants are separate from duty savings. Residence requirements, ownership history and transaction dates still apply.</p>
          </Prose>
          <div className="mt-6">
            <WorkedExampleTable
              caption="First home assistance by property location"
              rowHeader="State guide"
              columns={[{ key: "duty", label: "FHB duty relief" }, { key: "grant", label: "FHOG / new-home grant" }, { key: "surcharge", label: "Foreign surcharge" }]}
              rows={STATE_ORDER.map((s) => ({
                label: <TextLink href={statePath(s)}>{s}</TextLink>,
                cells: {
                  duty: <DutySummary state={s} />,
                  grant: <GrantSummary state={s} />,
                  surcharge: RULES[s].foreignSurcharge.verified
                    ? RULES[s].foreignSurcharge.ratePct ? `${RULES[s].foreignSurcharge.ratePct}%` : "None on duty"
                    : <TextLink href={RULES[s].foreignSurcharge.sourceUrls[0]} external>Confirm</TextLink>,
                },
              }))}
              note={<>Checked against state revenue sources on {formatDate(checkedAt)}; <a href="#sources">sources below</a>. Surcharges apply to foreign interests under each state’s definition, subject to exemptions.</>}
            />
          </div>
        </section>

        <section id="eligibility" style={sectionStyle}>
          <Prose>
            <h2>Who is eligible</h2>
            <p>Citizens still need to meet ownership, occupancy and property tests. <TextLink href={PATHS.permanentResidents}>Permanent residents</TextLink> can meet the federal deposit scheme’s residency requirement, but Help to Buy requires citizenship. State concessions have their own tests; a visa label alone does not determine the result.</p>
            <p>For temporary residency, start with the <TextLink href={PATHS.visa491}>491</TextLink>, <TextLink href={PATHS.visa482}>482</TextLink>, <TextLink href={PATHS.partnerVisa}>partner</TextLink> or <TextLink href={PATHS.bridgingVisa}>bridging visa</TextLink> guide. Check each co-buyer’s status and any overseas ownership before choosing a scheme. The state guide explains its residency conditions.</p>
          </Prose>
        </section>

        <section id="next" style={sectionStyle}>
          <Prose>
            <h2>Turn the scheme check into a purchase budget</h2>
            <p>Use the <TextLink href={PATHS.homeLoansFirstHomeBuyers}>step-by-step first home buying process</TextLink> for preparation, pre-approval and settlement. For the numbers, open your state guide or the <TextLink href={PATHS.stampDuty}>stamp duty calculator</TextLink>. Keep conveyancing, inspections and other purchase costs in the budget alongside your deposit.</p>
          </Prose>
        </section>
      </ArticleLayout>
    </>
  );
}
