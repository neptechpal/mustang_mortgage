import Link from "next/link";
import { RULES } from "@/modules/calc/rules";
import { AU_STATES } from "@/modules/calc/types";
import { StampDutyCalculator } from "@/modules/web/calculators";
import { CtaBand } from "@/modules/web/components/content/CtaBand";
import { Disclaimer } from "@/modules/web/components/content/Disclaimer";
import { Faq, type FaqEntry } from "@/modules/web/components/content/Faq";
import { PageIntro } from "@/modules/web/components/content/PageIntro";
import { PointGrid } from "@/modules/web/components/content/PointGrid";
import { WorkedExampleTable } from "@/modules/web/components/content/WorkedExampleTable";
import { TextLink } from "@/modules/web/components/ui/Button";
import { Section } from "@/modules/web/components/ui/Section";
import { PATHS } from "@/modules/web/config";
import { GroupedSources } from "@/modules/web/content/shared/GroupedSources";
import { duty, fhogFor, regFees } from "@/modules/web/content/shared/rules";
import { fromSourced } from "@/modules/web/content/shared/sources";
import { money, stateCheckedAt } from "@/modules/web/duty/describe";
import { dutyPath } from "@/modules/web/duty/paths";
import { StatePicker } from "@/modules/web/duty/StatePicker";
import { formatDate } from "@/modules/web/format";
import { JsonLd, buildMetadata, webAppJsonLd, webPageJsonLd } from "@/modules/web/seo";

const TITLE = "Stamp duty calculator for every state and territory";
const DESCRIPTION =
  "Estimate transfer (stamp) duty anywhere in Australia, with first home buyer concessions, foreign purchaser surcharges and land titles fees, from rules checked against each revenue office.";

export const metadata = buildMetadata({ title: "Stamp duty calculator: all states", description: DESCRIPTION, path: PATHS.stampDuty });

const PRICE = 750_000;
const checkedAll = AU_STATES.map(stateCheckedAt).sort()[0];

const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}` : (xs[0] ?? ""));
const nameOf = (s: (typeof AU_STATES)[number]) => (s === "ACT" || s === "NT" ? `the ${RULES[s].name}` : RULES[s].name);
const base = (s: (typeof AU_STATES)[number]) => ({ state: s, price: PRICE, ownerOccupier: true, foreignPurchaser: false, citizenOrPR: true });

// Facts used in the copy, all derived from the rules data.
const surchargeStates = AU_STATES.filter((s) => RULES[s].foreignSurcharge.ratePct > 0);
const surchargeRates = surchargeStates.map((s) => RULES[s].foreignSurcharge.ratePct).sort((a, b) => a - b);
const noFhbConcession = AU_STATES.filter((s) => !RULES[s].concessions.some((c) => c.requiresFirstHomeBuyer));
const newHomeBetter = AU_STATES.filter(
  (s) => duty({ ...base(s), propertyType: "new", firstHomeBuyer: true }).transferDuty < duty({ ...base(s), propertyType: "established", firstHomeBuyer: true }).transferDuty,
);
const ownerScales = AU_STATES.filter((s) => RULES[s].ownerOccupierScale).map((s) => {
  const o = RULES[s].ownerOccupierScale!;
  return o.maxValue ? `${nameOf(s)} (up to ${money(o.maxValue)})` : nameOf(s);
});

const FAQ: FaqEntry[] = [
  {
    question: "What is stamp duty?",
    answer:
      "Stamp duty (called transfer duty in most states, and conveyance duty in the ACT) is a state or territory tax the buyer pays when a property changes hands. It is worked out on the dutiable value: the price, or the market value if that is higher.",
  },
  {
    question: "Why is stamp duty so different between states?",
    answer: `Each state and territory sets its own rates, thresholds and concessions. Some remove duty for first home buyers up to a price, some only help with new homes${
      noFhbConcession.length ? `, and ${list(noFhbConcession.map(nameOf))} currently ${noFhbConcession.length > 1 ? "have" : "has"} no first home buyer duty concession` : ""
    }. The table on this page compares them at the same price.`,
  },
  {
    question: "Do I pay stamp duty on a new home or off the plan?",
    answer: `Usually yes, but some states give first home buyers more help with new homes than established ones. At ${money(PRICE)} a first home buyer pays less duty on a new home than an established one in ${list(newHomeBetter.map(nameOf))}. Choose the property type in the calculator to see the difference.`,
  },
  {
    question: "Can a lender add stamp duty to my home loan?",
    answer:
      "Lenders generally expect duty and other buying costs to come from your own money. Borrowing more to cover them raises your loan-to-value ratio and can mean paying lenders mortgage insurance (LMI). We can tell you how the lenders on our panel treat it.",
  },
  {
    question: "Is this calculator accurate?",
    answer: "It uses each revenue office's published rates and concessions, checked on the dates shown under every result, and is tested against the revenue offices' own calculators and worked examples. It is still an estimate: your conveyancer or solicitor confirms the duty payable.",
  },
];

export default function StampDutyHubPage() {
  const rows = AU_STATES.map((s) => {
    const R = RULES[s];
    const base = { state: s, price: PRICE, propertyType: "established" as const, ownerOccupier: true, foreignPurchaser: false, citizenOrPR: true };
    const home = duty({ ...base, firstHomeBuyer: false });
    const fhb = duty({ ...base, firstHomeBuyer: true });
    const fhbNew = duty({ ...base, propertyType: "new", firstHomeBuyer: true });
    const g = fhogFor(s);
    return {
      s,
      name: R.name,
      home: home.transferDuty,
      fees: regFees(home),
      fhb: fhb.transferDuty,
      fhbNew: fhbNew.transferDuty,
      surcharge: R.foreignSurcharge.ratePct,
      grant: g ? g.amount : 0,
    };
  });

  return (
    <>
      <JsonLd data={webAppJsonLd({ path: PATHS.stampDuty, name: "Australian stamp duty calculator", description: DESCRIPTION })} />
      <JsonLd data={webPageJsonLd({ path: PATHS.stampDuty, name: TITLE, description: DESCRIPTION })} />

      <PageIntro
        crumbs={[{ name: "Stamp duty", path: PATHS.stampDuty }]}
        eyebrow="Stamp duty"
        title={TITLE}
        lede={`Transfer duty, first home buyer concessions, foreign purchaser surcharges and land titles fees for all eight states and territories. Every rule shows its official source and the date we checked it; the current set was checked on ${formatDate(checkedAll)}.`}
      />

      <Section id="calculator" size="tight" className="mw-calcsection" aria-label="Stamp duty calculator">
        <StampDutyCalculator defaultState="NSW" defaultPrice={PRICE} title={null} />
      </Section>

      <Section
        id="compare"
        tone="white"
        index="01"
        eyebrow="Compare"
        title={`Stamp duty on a ${money(PRICE)} home in each state`}
        lede="Same price, same buyers: Australian citizens or permanent residents who will live in the home. Select a state for its rates, concessions and worked examples."
      >
        <WorkedExampleTable
          caption={`Transfer duty on a ${money(PRICE)} purchase`}
          rowHeader="State or territory"
          columns={[
            { key: "home", label: "Home buyer", numeric: true },
            { key: "fhb", label: "First home, established", numeric: true },
            { key: "fhbNew", label: "First home, new", numeric: true },
            { key: "surcharge", label: "Foreign surcharge", numeric: true },
            { key: "grant", label: "First home grant (new homes)", numeric: true },
          ]}
          rows={rows.map((r) => ({
            label: (
              <Link href={dutyPath(r.s)} className="mw-link">
                {r.name}
              </Link>
            ),
            cells: {
              home: money(r.home),
              fhb: money(r.fhb),
              fhbNew: money(r.fhbNew),
              surcharge: r.surcharge ? `${r.surcharge}%` : "None",
              grant: r.grant ? money(r.grant) : "None",
            },
          }))}
          assumptions={[
            "Transfer duty only. Land titles fees and any foreign purchaser surcharge are extra.",
            "First home columns assume every condition of the concession is met. Grants have their own price caps and are paid separately.",
            (() => {
              const last = AU_STATES.map(stateCheckedAt).sort().pop() ?? checkedAll;
              return last === checkedAll ? `Rules checked against each revenue office on ${formatDate(checkedAll)}.` : `Rules checked against each revenue office between ${formatDate(checkedAll)} and ${formatDate(last)}.`;
            })(),
          ]}
        />
        <div style={{ marginTop: 40 }}>
          <StatePicker />
        </div>
      </Section>

      <Section id="how" layout="split" index="02" eyebrow="How it works" title="What goes into the number" lede="Four things decide what you pay, and the calculator asks about each.">
        <PointGrid
          items={[
            { title: "The dutiable value", body: "The price, or the market value if that is higher. Most states round it up to the next $100 before applying their rates." },
            { title: "Your home or an investment", body: `Some places charge less when you will live in the property: ${list(ownerScales)}.` },
            { title: "First home buyer status", body: "Most states cut or remove duty for first home buyers under a price threshold, often with different rules for new and established homes." },
            {
              title: "Residency",
              body: (
                <>
                  {surchargeStates.length} states charge foreign persons a surcharge of {surchargeRates[0]}% to {surchargeRates[surchargeRates.length - 1]}% on top of duty. Temporary visa holders are
                  foreign persons for these rules.{" "}
                  <TextLink href={PATHS.visaHomeLoans}>Buying on a visa</TextLink>
                </>
              ),
            },
          ]}
        />
      </Section>

      <Section id="faq" tone="white" layout="split" index="03" eyebrow="Questions" title="Stamp duty questions">
        <Faq items={FAQ} />
      </Section>

      <Section id="sources-section" size="tight" aria-label="Sources and disclaimer">
        <div className="mw-flow" style={{ maxWidth: 900 }}>
          <GroupedSources
            id="sources"
            title="Sources"
            intro="Official pages, legislation and calculators behind every rate, concession, surcharge and fee. Each state page lists them in full."
            groups={AU_STATES.map((s) => {
              const R = RULES[s];
              return { label: s, items: [...fromSourced(R.generalScale), ...R.concessions.flatMap((c) => fromSourced(c)), ...fromSourced(R.foreignSurcharge), ...fromSourced(R.govtFees)] };
            })}
          />
          <Disclaimer variant="calculator" />
        </div>
      </Section>

      <CtaBand title="Work out your buying costs with Sulav" body="Duty, grants, LMI and lender fees for your situation, before you sign a contract." />
    </>
  );
}
