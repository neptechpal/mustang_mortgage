import { FEDERAL, RULES } from "@/modules/calc/rules";
import type { AuState } from "@/modules/calc/types";
import { StampDutyCalculator } from "../calculators/StampDutyCalculator";
import { CtaBand } from "../components/content/CtaBand";
import { Disclaimer } from "../components/content/Disclaimer";
import { Faq, type FaqEntry } from "../components/content/Faq";
import { PageIntro } from "../components/content/PageIntro";
import { Prose } from "../components/content/Prose";
import { Sources } from "../components/content/Sources";
import { WorkedExampleTable } from "../components/content/WorkedExampleTable";
import { TextLink } from "../components/ui/Button";
import { Callout } from "../components/ui/Callout";
import { Section } from "../components/ui/Section";
import { PATHS } from "../config";
import { ReviewLine, type PageReview } from "../content/shared/review";
import { duty, fhogFor, regFees, stateShort } from "../content/shared/rules";
import { fromSourced } from "../content/shared/sources";
import { formatDate } from "../format";
import { JsonLd, webAppJsonLd, webPageJsonLd } from "../seo";
import { concessionSummary, feeAt, feeText, keyPoints, lowerFirst, money, priceTable, rateRows, scaleNotes, stateCheckedAt, stateFaqs, stateSources, typeList, workedExamples } from "./describe";
import { PointGrid } from "../components/content/PointGrid";
import { StatePicker, dutyPath } from "./StatePicker";

export const dutyTitle = (s: AuState) => `${s} stamp duty calculator`;
export function dutyDescription(s: AuState) {
  const R = RULES[s];
  return `Estimate ${R.name} transfer (stamp) duty with first home buyer concessions, the foreign purchaser surcharge and land titles fees. Rates checked against ${R.revenueOffice} on ${formatDate(stateCheckedAt(s))}.`;
}

/** First home buyer guide for the state, where one exists. */
const fhbGuide = (s: AuState) => (s === "NSW" ? { href: PATHS.firstHomeBuyersNsw, title: "First home buyers in NSW" } : { href: PATHS.firstHomeBuyers, title: "First home buyer guide" });

const EXAMPLE_PRICE = 750_000;

function DutyTable({ caption, rows, notes }: { caption: string; rows: { range: string; duty: string }[]; notes: string[] }) {
  return (
    <div className="mw-tablefit">
    <WorkedExampleTable
      caption={caption}
      rowHeader="Dutiable value"
      columns={[{ key: "duty", label: "Duty" }]}
      rows={rows.map((r) => ({ label: <span className="mw-num">{r.range}</span>, cells: { duty: r.duty } }))}
      note={notes.length ? <p style={{ margin: "0 0 6px" }}>{notes.join(" ")}</p> : undefined}
    />
    </div>
  );
}

export function StampDutyStatePage({ state, review }: { state: AuState; review: PageReview }) {
  const R = RULES[state];
  const S = stateShort(state);
  /** Name at the start of a sentence ("The Northern Territory", "Victoria"). */
  const Name = state === "ACT" || state === "NT" ? `The ${R.name}` : R.name;
  const path = dutyPath(state);
  const checked = stateCheckedAt(state);
  const FS = R.foreignSurcharge;
  const fhog = fhogFor(state);
  const table = priceTable(state);
  const examples = workedExamples(state);
  const at = (o: Partial<Parameters<typeof duty>[0]>) =>
    duty({ state, price: EXAMPLE_PRICE, propertyType: "established", firstHomeBuyer: false, ownerOccupier: true, foreignPurchaser: false, citizenOrPR: true, ...o });
  const home = at({});
  const inv = at({ ownerOccupier: false });
  const fhbEst = at({ firstHomeBuyer: true });
  const fhbNew = at({ firstHomeBuyer: true, propertyType: "new" });
  const fhbConcessions = R.concessions.filter((c) => c.requiresFirstHomeBuyer);
  const otherModelled = R.concessions.filter((c) => !c.requiresFirstHomeBuyer);
  const fhogInfo = R.otherConcessions.find((c) => c.id.includes("fhog"));
  const ban = FEDERAL.FIRB.establishedDwellingBan;

  const faq: FaqEntry[] = [
    {
      question: `How much is stamp duty on a ${money(EXAMPLE_PRICE)} home in ${S}?`,
      answer: `About ${money(home.transferDuty)} for an established home you will live in, if you are an Australian citizen or permanent resident and not a first home buyer${
        inv.transferDuty !== home.transferDuty ? ` (${money(inv.transferDuty)} for an investment property)` : ""
      }. First home buyers pay ${money(fhbEst.transferDuty)} on an established home${fhbNew.transferDuty !== fhbEst.transferDuty ? ` and ${money(fhbNew.transferDuty)} on a new home` : ""}, if they meet the conditions. Land titles fees add about ${money(regFees(home))}. Figures checked against ${R.revenueOffice} on ${formatDate(checked)}.`,
    },
    {
      question: `Do first home buyers pay stamp duty in ${S}?`,
      answer: fhbConcessions.length
        ? `It depends on the price and the property. ${fhbConcessions.map((c) => `${c.name}: ${concessionSummary(c)}`).join(" ")} You must meet every condition, including living in the home.`
        : `${Name} has no first home buyer duty concession for contracts signed now, so first home buyers pay the same duty as other home buyers.${fhog ? ` The ${fhog.name} (${money(fhog.amount)}) is available for ${typeList(fhog.appliesTo.filter((t) => t !== "vacant-land"))}.` : ""}`,
    },
    {
      question: `Do temporary visa holders pay extra stamp duty in ${S}?`,
      answer:
        FS.ratePct > 0
          ? `Yes. Foreign persons pay ${lowerFirst(FS.name)} of ${FS.ratePct}% of the dutiable value on top of transfer duty. ${FS.whoPays[0]} Separately, foreign persons need FIRB approval and generally can't buy established homes until ${formatDate(ban.to)}.`
          : `${Name} has no foreign purchaser surcharge on duty, so temporary visa holders pay the same transfer duty as everyone else. FIRB approval is still needed, and foreign persons generally can't buy established homes until ${formatDate(ban.to)}.`,
    },
    {
      question: fhog ? `Is the ${fhog.name} taken off the stamp duty?` : `Is there a first home owner grant in ${S}?`,
      answer: fhog
        ? `No. Duty is worked out on the full price and the grant is paid separately. In ${S} the ${fhog.name} is ${money(fhog.amount)} for ${typeList(fhog.appliesTo.filter((t) => t !== "vacant-land"))}${fhog.priceCap ? ` up to ${money(fhog.priceCap)}` : ", with no price cap"}. It is not available for established homes.`
        : `${fhogInfo ? fhogInfo.summary : `${Name} has no first home owner grant at the moment.`} Duty concessions are the main help for first home buyers in ${S}.`,
    },
    ...stateFaqs(state, EXAMPLE_PRICE),
    {
      question: `What does ${R.govtFees.authority} charge?`,
      answer: `Transfer registration: ${feeText(R.govtFees.transfer)} (${money(home.transferFee)} at ${money(EXAMPLE_PRICE)}). Mortgage registration: ${feeText(R.govtFees.mortgageRegistration)}. ${(R.govtFees.notes ?? [])[0] ?? ""}`.trim(),
    },
  ];

  const description = dutyDescription(state);

  return (
    <>
      <JsonLd data={webAppJsonLd({ path, name: `${R.name} stamp duty calculator`, description })} />
      <JsonLd data={webPageJsonLd({ path, name: dutyTitle(state), description, about: { "@type": "Thing", name: `Transfer duty in ${R.name}` } })} />

      <PageIntro
        crumbs={[
          { name: "Stamp duty", path: PATHS.stampDuty },
          { name: state, path },
        ]}
        eyebrow={`Stamp duty · ${R.name}`}
        title={dutyTitle(state)}
        lede={`${Name} charges ${money(home.transferDuty)} transfer duty on a ${money(EXAMPLE_PRICE)} established home${
          fhbEst.transferDuty !== home.transferDuty ? `, or ${money(fhbEst.transferDuty)} for a first home buyer` : ""
        }${FS.ratePct > 0 ? `, plus ${FS.ratePct}% for foreign buyers` : ""}. Estimate yours below, with ${R.revenueOffice}'s rules as checked on ${formatDate(checked)}.`}
      >
        <ReviewLine review={review} updatedAt={checked} />
      </PageIntro>

      <Section id="calculator" size="tight" className="mw-calcsection" aria-label={`${R.name} stamp duty calculator`}>
        <StampDutyCalculator defaultState={state} defaultPrice={EXAMPLE_PRICE} lockState title={null} />
      </Section>

      <Section id="key-points" size="tight" eyebrow={`${state} in brief`} title={`What makes ${S} different`}>
        <PointGrid columns={3} items={keyPoints(state, EXAMPLE_PRICE)} />
      </Section>

      <Section
        id="rates"
        tone="white"
        layout="split"
        index="01"
        eyebrow="Rates"
        title={`${state} transfer duty rates`}
        lede={`What ${R.revenueOffice} charges on the dutiable value, for contracts from ${formatDate(R.generalScale.effectiveFrom)}.${R.ownerOccupierScale ? " Lower owner-occupier rates follow." : ""}`}
      >
        <div className="mw-flow">
          <DutyTable caption={R.generalScale.label} rows={rateRows(R.generalScale)} notes={scaleNotes(R.generalScale)} />
          {R.ownerOccupierScale && (
            <>
              <DutyTable caption={R.ownerOccupierScale.scale.label} rows={rateRows(R.ownerOccupierScale.scale)} notes={scaleNotes(R.ownerOccupierScale.scale)} />
              <Prose>
                <p>
                  {R.ownerOccupierScale.maxValue ? `Available for values up to ${money(R.ownerOccupierScale.maxValue)}. ` : ""}
                  {R.ownerOccupierScale.conditions.join(" ")}
                </p>
              </Prose>
            </>
          )}
        </div>
      </Section>


      <Section id="prices" tone="white" size="tight" eyebrow="At a glance" title={`Duty at common prices in ${S}`} lede={`From ${money(table.rows[0].price)} to ${money(table.rows[table.rows.length - 1].price)}, for investors, home buyers and first home buyers in ${S}.`}>
          <WorkedExampleTable
            caption={`Transfer duty in ${S} by price and buyer`}
            rowHeader="Price"
            columns={[
              ...(table.hasOwnerOccupierScale
                ? [
                    { key: "investor", label: "Investment", numeric: true },
                    { key: "home", label: "Your home", numeric: true },
                  ]
                : [{ key: "home", label: "Home or investment", numeric: true }]),
              { key: "fhbEstablished", label: "First home, established", numeric: true },
              { key: "fhbNew", label: "First home, new", numeric: true },
            ]}
            rows={table.rows.map((r) => ({
              label: <span className="mw-num">{money(r.price)}</span>,
              cells: { investor: money(r.investor), home: money(r.home), fhbEstablished: money(r.fhbEstablished), fhbNew: money(r.fhbNew) },
            }))}
            assumptions={[`Before land titles fees; citizens or permanent residents; ${R.revenueOffice} rules as checked on ${formatDate(checked)}.`]}
          />
      </Section>

      <Section id="concessions" layout="split" index="02" eyebrow="Concessions" title="First home buyer concessions and grants" lede={`What ${R.revenueOffice} offers home buyers, and the conditions that come with it.`}>
        <Prose>
          {fhbConcessions.length === 0 && (
            <p>
              {Name} has no first home buyer duty concession for contracts signed now. First home buyers pay the same duty as other buyers
              {R.ownerOccupierScale ? ", including the owner-occupier rates above where they apply" : ""}.
            </p>
          )}
          {fhbConcessions.map((c) => (
            <section key={c.id}>
              <h3>{c.name}</h3>
              <p>
                <strong>{concessionSummary(c)}</strong> Applies to {typeList(c.appliesTo)}.
              </p>
              <ul>
                {c.eligibility.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </section>
          ))}
          {otherModelled.map((c) => (
            <section key={c.id}>
              <h3>{c.name}</h3>
              <p>
                <strong>{concessionSummary(c)}</strong> Open to buyers who are not first home buyers. Applies to {typeList(c.appliesTo)}.
              </p>
              <ul>
                {c.eligibility.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </section>
          ))}
          {(R.totalDutyConcessions ?? []).map((c) => (
            <section key={c.id}>
              <h3>{c.name}</h3>
              <p>
                <strong>
                  Up to {money(c.maxSaving)} off the duty (including any foreign surcharge) for {typeList(c.appliesTo)}, full concession up to {money(c.fullUpTo)}, reducing to a floor from {money(c.floorFrom)}.
                </strong>
              </p>
              <ul>
                {c.eligibility.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </section>
          ))}
          {R.grants.map((g) => (
            <section key={g.id}>
              <h3>
                {g.name}: {money(g.amount)}
              </h3>
              <ul>
                {g.eligibility.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </section>
          ))}
          {R.otherConcessions.length > 0 && (
            <section>
              <h3>Other concessions</h3>
              <p>The calculator does not apply these. Your conveyancer or {R.revenueOffice} can confirm whether you qualify.</p>
              <ul>
                {R.otherConcessions.map((c) => (
                  <li key={c.id}>
                    <strong>{c.name}.</strong> {c.summary}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p>
            <TextLink href={fhbGuide(state).href} arrow>
              {fhbGuide(state).title}
            </TextLink>
          </p>
        </Prose>
      </Section>

      <Section
        id="foreign"
        tone="white"
        layout="split"
        index="03"
        eyebrow="Foreign buyers"
        title={FS.ratePct > 0 ? `${FS.name}: ${FS.ratePct}%` : `No foreign purchaser surcharge in ${S}`}
        lede={
          FS.ratePct > 0
            ? `Paid on top of transfer duty, on the full dutiable value. On a ${money(EXAMPLE_PRICE)} purchase that is ${money(at({ foreignPurchaser: true, citizenOrPR: false }).surcharge)}.`
            : `${Name} doesn't charge foreign buyers extra duty. Commonwealth FIRB rules still apply.`
        }
      >
        <Prose>
          <h3>Who pays it</h3>
          <ul>
            {FS.whoPays.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          {FS.exemptions.length > 0 && (
            <>
              <h3>{FS.ratePct > 0 ? "Who doesn't" : "Other costs for foreign owners"}</h3>
              <ul>
                {FS.exemptions.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </>
          )}
          <Callout tone="warning" title="FIRB rules apply as well">
            <p>
              Foreign persons need FIRB approval, and generally can&rsquo;t buy established homes from {formatDate(ban.from)} to {formatDate(ban.to)}. New homes and vacant land are still allowed with approval.
            </p>
          </Callout>
          <p>How your visa changes this:</p>
          <ul>
            <li>
              <TextLink href={PATHS.visaHomeLoans}>Visa and PR home loans</TextLink>
            </li>
            <li>
              <TextLink href={PATHS.permanentResidents}>Permanent residents</TextLink>
            </li>
            <li>
              <TextLink href={PATHS.visa491}>Subclass 491</TextLink> and <TextLink href={PATHS.visa482}>subclass 482</TextLink> visa holders
            </li>
          </ul>
        </Prose>
      </Section>

      <Section id="fees" layout="split" className="mw-tablefit" index="04" eyebrow="Government fees" title="Land titles fees" lede={`${R.govtFees.authority} charges these to register your purchase and your mortgage. Fees from ${formatDate(R.govtFees.effectiveFrom)}.`}>
        <WorkedExampleTable
          caption={`${R.govtFees.authority} fees`}
          rowHeader="Fee"
          columns={[
            { key: "rule", label: "How it is worked out" },
            { key: "eg", label: `At ${money(EXAMPLE_PRICE)}`, numeric: true },
          ]}
          rows={[
            { label: "Transfer registration", cells: { rule: feeText(R.govtFees.transfer), eg: money(feeAt(R.govtFees.transfer, EXAMPLE_PRICE)) } },
            { label: "Mortgage registration", cells: { rule: feeText(R.govtFees.mortgageRegistration), eg: money(feeAt(R.govtFees.mortgageRegistration, EXAMPLE_PRICE)) } },
            { label: "Total", cells: { rule: "", eg: money(regFees(home)) }, total: true },
          ]}
          assumptions={[...(R.govtFees.notes ?? []), "Conveyancing, inspections, lender fees and any FIRB application fee are not included."]}
        />
      </Section>

      <Section id="examples" tone="white" index="05" eyebrow="Worked examples" title={`Three ${state} purchases, worked through`} lede={`${money(examples[0].result.price)}, ${money(examples[1].result.price)} and ${money(examples[2].result.price)} purchases in ${S}, from the same rules as the calculator.`}>
        <div className="mw-flow" style={{ ["--mw-flow" as string]: "48px" }}>
          {examples.map((e) => (
            <div key={e.id} id={e.id} className="mw-split mw-split--example mw-tablefit">
              <Prose>
                <h3>{e.title}</h3>
                <p>{e.who}</p>
                <p>{e.summary}</p>
              </Prose>
              <WorkedExampleTable
                caption="Government costs"
                rowHeader="Item"
                columns={[{ key: "amount", label: "Amount", numeric: true }]}
                rows={[
                  ...e.result.breakdown.map((b) => {
                    const m = /^Transfer duty \((.+)\)$/.exec(b.label);
                    return {
                      label: m ? (
                        <>
                          Transfer duty
                          <span className="mw-small" style={{ display: "block", fontWeight: 400, color: "var(--mw-text-3)" }}>
                            {m[1]}
                          </span>
                        </>
                      ) : (
                        b.label
                      ),
                      cells: { amount: (b.amount < 0 ? "−" : "") + money(Math.abs(b.amount)) },
                    };
                  }),
                  { label: "Total government costs", cells: { amount: money(e.result.totalGovtCosts) }, total: true },
                ]}
                assumptions={e.assumptions}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section id="faq" layout="split" index="06" eyebrow="Questions" title={`${state} stamp duty questions`}>
        <Faq items={faq} />
      </Section>

      <Section id="more" tone="sand" size="tight" eyebrow="Other states and territories" title="Stamp duty in other states">
        <StatePicker current={state} />
        <p className="mw-small" style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: "8px 24px" }}>
          <TextLink href={PATHS.stampDuty} arrow>
            All states compared
          </TextLink>
          <TextLink href={fhbGuide(state).href} arrow>
            {fhbGuide(state).title}
          </TextLink>
        </p>
      </Section>

      <Section id="sources-section" size="tight" aria-label="Sources and disclaimer">
        <div className="mw-flow" style={{ maxWidth: 860 }}>
          <Sources
            items={stateSources(state, fromSourced({ sourceUrls: FEDERAL.FIRB.sourceUrls.filter((u) => /residential-land|banning-foreign/.test(u)), verifiedAt: FEDERAL.FIRB.verifiedAt }))}
            intro={`${R.revenueOffice}, ${R.govtFees.authority} and FIRB pages behind every figure above, as checked on ${formatDate(checked)}.`}
          />
          <Disclaimer variant="calculator" />
        </div>
      </Section>

      <CtaBand title={`Buying in ${S}? Talk it through with Sulav`} body="We check the duty, grants and lender policy for your situation before you sign a contract." />
    </>
  );
}
