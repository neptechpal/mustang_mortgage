import Link from "next/link";
import { RULES } from "@/modules/calc/rules";
import { depositSchemeCheck } from "@/modules/calc/rules/federal";
import type { AuState } from "@/modules/calc/types";
import { STATE_RESIDENCY_RULES } from "@/modules/seo-data/visas";
import { ArticleLayout } from "../../components/content/ArticleLayout";
import { CtaBand } from "../../components/content/CtaBand";
import { Disclaimer } from "../../components/content/Disclaimer";
import { Faq } from "../../components/content/Faq";
import { PointGrid } from "../../components/content/PointGrid";
import { Prose } from "../../components/content/Prose";
import { Sources } from "../../components/content/Sources";
import { Steps } from "../../components/content/Steps";
import { WorkedExampleTable, type WorkedRow } from "../../components/content/WorkedExampleTable";
import { TextLink } from "../../components/ui/Button";
import { StampDutyCalculator } from "../../calculators";
import { PATHS } from "../../config";
import { formatAud, formatDate } from "../../format";
import { JsonLd, articleJsonLd } from "../../seo";
import { ReviewLine, withReviewClaim, type PageReview } from "../shared/review";
import {
  DEPOSIT_SCHEME,
  FHSS,
  HELP_TO_BUY,
  STATE_ORDER,
  concessionSentence,
  duty,
  fhbConcessionsFor,
  fhogFor,
  regFees,
  regionalCentresFor,
  stateName,
  stateShort,
  stateSlug,
} from "../shared/rules";
import { earliestDate, fromSourced, latestDate, toSourceItems, type SourceInput } from "../shared/sources";
import { buildMatrix, type Cell } from "../visa/matrix";
import { visaPath } from "../visa/VisaArticle";
import type { FhbStateContent } from "./types";

export const fhbPath = (s: AuState) => `${PATHS.firstHomeBuyers}/${stateSlug(s)}`;

const sectionStyle = { marginTop: 72 } as const;
const TYPE = { established: "Established", new: "New", "off-the-plan": "Off the plan", "vacant-land": "Vacant land" } as const;

const CAPITAL: Record<AuState, string> = { NSW: "Sydney", VIC: "Melbourne", QLD: "Brisbane", WA: "Perth", SA: "Adelaide", TAS: "Hobart", ACT: "Canberra", NT: "Darwin" };

/** Scheme cap areas in words for a state (`short` for summaries, `area` with the regional-centre list). */
export function capAreas(s: AuState) {
  const caps = DEPOSIT_SCHEME.priceCaps[s];
  if (s === "ACT" || caps.capital === caps.regional) return [{ area: `Whole of ${stateShort(s)}`, short: `all of ${stateShort(s)}`, cap: caps.capital }];
  const centres = s === "NSW" || s === "VIC" || s === "QLD" ? regionalCentresFor(s) : null;
  return [
    { area: `${CAPITAL[s]}${centres ? ` and ${centres}` : ""}`, short: `${CAPITAL[s]}${centres ? " and listed regional centres" : ""}`, cap: caps.capital },
    { area: `Rest of ${stateShort(s)}`, short: `rest of ${stateShort(s)}`, cap: caps.regional },
  ];
}

/** The "what you may get today" lines, all from the rules data. */
export function summaryFacts(s: AuState) {
  const R = RULES[s];
  const conc = fhbConcessionsFor(s);
  const g = fhogFor(s);
  const lines: { k: string; v: string }[] = [];
  if (conc.length) for (const c of conc) lines.push({ k: c.name, v: concessionSentence(s, c, (n) => formatAud(n)) });
  else {
    const info = R.otherConcessions.filter((c) => !c.modelled && (c.appliesTo ?? []).some((t) => t !== "vacant-land"));
    lines.push({
      k: "First home duty concession",
      v: `None for contracts signed now.${info.length ? ` ${info.map((i) => i.name).join("; ")}: see below.` : ""}`,
    });
  }
  if (g) {
    lines.push({
      k: g.name,
      v: `${formatAud(g.amount)} for a new home${g.priceCap ? `, price ${g.capIsExclusive ? "under" : "up to"} ${formatAud(g.priceCap)}` : ", no price cap"}${g.effectiveTo ? `, for contracts or building starts before ${formatDate(g.effectiveTo)}` : ""}. Not for established homes.`,
    });
  } else {
    const closed = R.otherConcessions.find((c) => /grant/i.test(c.name));
    lines.push({ k: "First Home Owner Grant", v: closed?.summary ?? "No grant." });
  }
  const caps = capAreas(s);
  lines.push({ k: DEPOSIT_SCHEME.name, v: `Buy with a 5% deposit and no LMI. Price cap ${caps.map((c) => `${formatAud(c.cap)} (${c.short})`).join(", ")}.` });
  const h = HELP_TO_BUY.priceCaps[s];
  lines.push({
    k: HELP_TO_BUY.name,
    v: `Shared equity for Australian citizens. Price cap ${h.capital === h.regional ? formatAud(h.capital) : `${formatAud(h.capital)} (${caps[0].short}), ${formatAud(h.regional)} (${caps[caps.length - 1].short})`}.`,
  });
  return lines;
}

const CITIZEN: Cell = { label: "Yes", tone: "yes" };

function CellText({ c }: { c: Cell }) {
  if (c.tone === "confirm")
    return c.href ? (
      <a className="mw-link" href={c.href} target="_blank" rel="noopener noreferrer">
        Confirm
      </a>
    ) : (
      <>Confirm</>
    );
  return <>{c.label}</>;
}

export function FhbArticle({ content: c, review }: { content: FhbStateContent; review: PageReview }) {
  const s = c.state;
  const R = RULES[s];
  const path = fhbPath(s);
  const conc = fhbConcessionsFor(s);
  const g = fhogFor(s);

  // Residency rows for this state (from seo-data/visas).
  const row = (cls: "permanent" | "nz444" | "temporary") => buildMatrix(STATE_RESIDENCY_RULES[cls]).find((r) => r.state === s)!;
  const pr = row("permanent");
  const nz = row("nz444");
  const temp = row("temporary");

  // Worked examples (calcStampDuty, first home buyer, owner-occupier, citizen/PR).
  const ex = c.examples.map((e) => ({ e, r: duty({ state: s, price: e.price, propertyType: e.propertyType, firstHomeBuyer: true, foreignPurchaser: false, ownerOccupier: true, citizenOrPR: true }) }));
  const cell = (fn: (x: (typeof ex)[number]) => React.ReactNode) => Object.fromEntries(ex.map((x, i) => [`e${i}`, fn(x)]));
  const exRows: WorkedRow[] = [
    { label: "Price", cells: cell((x) => formatAud(x.e.price)) },
    { label: "Duty before concession", cells: cell((x) => formatAud(x.r.baseDuty)) },
    { label: "First home concession", cells: cell((x) => (x.r.concession > 0 ? `−${formatAud(x.r.concession)}` : "None")) },
    ...(ex.some((x) => x.r.offThePlanConcession > 0)
      ? [{ label: "Off-the-plan concession", cells: cell((x) => (x.r.offThePlanConcession > 0 ? `−${formatAud(x.r.offThePlanConcession)}` : "None")) }]
      : []),
    { label: "Duty payable", cells: cell((x) => formatAud(x.r.transferDuty)) },
    { label: "Registration fees", cells: cell((x) => formatAud(regFees(x.r), { cents: true })) },
    { label: "Government costs", cells: cell((x) => formatAud(x.r.totalGovtCosts, { cents: true })), total: true },
    { label: "First Home Owner Grant", cells: cell((x) => (x.r.fhogAmount > 0 ? formatAud(x.r.fhogAmount) : "Not eligible")) },
    { label: "Under 5% scheme cap", cells: cell((x) => (depositSchemeCheck(s, x.e.price, "capital").withinCap ? "Yes" : "No")) },
    { label: "5% deposit", cells: cell((x) => formatAud(Math.round(x.e.price * 0.05))) },
  ];
  const rulesChecked = earliestDate(...ex.map((x) => x.r.rulesVerifiedAt));

  const others = STATE_ORDER.filter((x) => x !== s);

  const sourceInputs: SourceInput[] = [
    ...conc.flatMap((x) => fromSourced(x, () => x.name)),
    ...(g ? fromSourced(g, () => g.name) : []),
    ...R.otherConcessions.flatMap((x) => fromSourced(x, () => x.name)),
    ...fromSourced(R.foreignSurcharge, () => R.foreignSurcharge.name),
    ...fromSourced(R.generalScale, () => R.generalScale.label),
    ...(R.ownerOccupierScale ? fromSourced(R.ownerOccupierScale.scale, () => R.ownerOccupierScale!.scale.label) : []),
    ...fromSourced(R.govtFees, () => `${R.govtFees.authority} fees`),
    ...fromSourced(DEPOSIT_SCHEME, () => undefined),
    ...fromSourced(HELP_TO_BUY, () => undefined),
    ...fromSourced(FHSS, () => FHSS.name),
    ...[pr, nz, temp].flatMap((m) => m.sources),
  ];
  const sources = toSourceItems(sourceInputs);
  const dataDate = latestDate(rulesChecked, DEPOSIT_SCHEME.verifiedAt, HELP_TO_BUY.verifiedAt);
  const modified = latestDate(c.updatedAt, dataDate);

  const toc = [
    { id: "different", label: `What's different in ${stateShort(s)}` },
    { id: "eligibility", label: "Who qualifies" },
    { id: "calculator", label: "Stamp duty calculator" },
    { id: "examples", label: "Worked examples" },
    { id: "schemes", label: "5% Deposit Scheme and Help to Buy" },
    ...(c.extra ? [{ id: c.extra.id, label: c.extra.title }] : []),
    { id: "apply", label: "How and when to apply" },
    { id: "documents", label: "Documents" },
    { id: "mistakes", label: "Common mistakes" },
    { id: "faq", label: "Questions" },
    { id: "sources", label: "Sources" },
  ];

  const service = conc[0]?.name ?? g?.name ?? "First home buyer assistance";
  const ld = withReviewClaim(
    articleJsonLd({
      path,
      headline: c.headline,
      description: c.metaDescription,
      datePublished: c.publishedAt,
      dateModified: modified,
      about: { "@type": "GovernmentService", name: service, provider: { "@type": "GovernmentOrganization", name: R.revenueOffice, url: R.revenueOfficeUrl } },
      citations: sources.map((x) => x.url),
    }),
    review,
  );

  return (
    <>
      <JsonLd data={ld} />
      <ArticleLayout
        crumbs={[
          { name: "First home buyers", path: PATHS.firstHomeBuyers },
          { name: s, path },
        ]}
        eyebrow={`First home buyers · ${stateName(s)}`}
        title={c.h1}
        lede={
          <>
            <p className="mw-lede">{c.lede}</p>
            <ReviewLine review={review} updatedAt={dataDate} />
          </>
        }
        summaryTitle={`What a first home buyer may get in ${stateShort(s)} today`}
        summary={
          <div className="space-y-3">
            <ul style={{ margin: 0, paddingLeft: 18, listStyle: "disc" }} className="space-y-2">
              {summaryFacts(s).map((l) => (
                <li key={l.k}>
                  <strong style={{ fontWeight: 600 }}>{l.k}:</strong> {l.v}
                </li>
              ))}
            </ul>
            <p className="mw-small">
              Checked against {R.revenueOffice} and Housing Australia on {formatDate(earliestDate(rulesChecked, DEPOSIT_SCHEME.verifiedAt))}. Each scheme has more conditions,
              listed below.
            </p>
          </div>
        }
        toc={toc}
        footer={
          <>
            <section id="faq" style={sectionStyle} aria-labelledby="faq-title">
              <h2 id="faq-title" className="mw-h2" style={{ marginBottom: 24 }}>
                First home buyer questions in {stateShort(s)}
              </h2>
              <Faq items={c.faqs} />
            </section>
            {s === "NSW" && (
              <section style={sectionStyle} aria-labelledby="suburbs-title">
                <h2 id="suburbs-title" className="mw-h3" style={{ marginBottom: 12 }}>
                  Suburb guides
                </h2>
                <p className="mw-body">
                  Prices, rents and who lives where, for the Sydney suburbs our clients buy in most.{" "}
                  <TextLink href={PATHS.mortgageBrokerNsw} arrow>
                    NSW suburb guides
                  </TextLink>
                </p>
              </section>
            )}
            <div style={sectionStyle}>
              <CtaBand bare compact headingLevel={2} title="Check your first home numbers with Sulav" body="We work out which concession and grant apply to you, what you can borrow and how much cash you need at settlement." />
            </div>
            <section style={sectionStyle} aria-labelledby="other-title">
              <h2 id="other-title" className="mw-h4" style={{ marginBottom: 12 }}>
                First home buyer guides for other states
              </h2>
              <ul className="mw-chips">
                {others.map((o) => (
                  <li key={o}>
                    <Link href={fhbPath(o)} className="mw-chip">
                      {stateName(o)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
            <div style={sectionStyle}>
              <Sources items={sources} intro="Every rule and figure on this page comes from these official sources. Dates show when we last checked each one." />
            </div>
            <Disclaimer variant="calculator" />
          </>
        }
      >
        <section id="different" style={{ marginTop: 56 }}>
          <Prose>
            <h2>What&rsquo;s different in {stateShort(s)}</h2>
            {c.intro}
          </Prose>
        </section>

        <section id="eligibility" style={sectionStyle}>
          <Prose>
            <h2>Who qualifies</h2>
            {conc.map((x) => (
              <div key={x.id}>
                <h3>{x.name}</h3>
                <ul>
                  {x.eligibility.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            ))}
            {g && (
              <>
                <h3>{g.name}</h3>
                <ul>
                  {g.eligibility.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </>
            )}
            <h3>Citizens, permanent residents and visa holders</h3>
            <p>
              Most first home schemes need at least one buyer who is an Australian citizen or permanent resident. Here is how {stateName(s)} treats each group. The visa guides go
              into detail.
            </p>
          </Prose>
          <div style={{ marginTop: 20 }}>
            <WorkedExampleTable
              caption={`${stateName(s)}: first home schemes by residency`}
              rowHeader="Buyer"
              columns={[
                { key: "fhb", label: "Duty concession" },
                { key: "fhog", label: "First home grant" },
                { key: "sur", label: "Foreign buyer surcharge" },
              ]}
              rows={[
                { label: "Australian citizen", cells: { fhb: <CellText c={conc.length ? CITIZEN : { label: "No current scheme", tone: "no" }} />, fhog: <CellText c={g ? CITIZEN : { label: "No grant", tone: "no" }} />, sur: "No" } },
                {
                  label: <Link href={visaPath("permanent-residents")}>Permanent resident</Link>,
                  cells: { fhb: <CellText c={pr.fhb} />, fhog: <CellText c={pr.fhog} />, sur: <CellText c={pr.surcharge} /> },
                },
                {
                  label: <Link href={visaPath("new-zealand-citizens")}>New Zealand citizen (444)</Link>,
                  cells: { fhb: <CellText c={nz.fhb} />, fhog: <CellText c={nz.fhog} />, sur: <CellText c={nz.surcharge} /> },
                },
                {
                  label: <Link href={PATHS.visaHomeLoans}>Temporary visa holder</Link>,
                  cells: { fhb: <CellText c={temp.fhb} />, fhog: <CellText c={temp.fhog} />, sur: <CellText c={temp.surcharge} /> },
                },
              ]}
              note={<>From {R.revenueOffice}&rsquo;s rules, checked {formatDate(earliestDate(pr.verifiedAt, nz.verifiedAt, temp.verifiedAt))}. &ldquo;Confirm&rdquo; means we could not verify it on the official site.</>}
            />
          </div>
        </section>

        <section id="calculator" style={sectionStyle}>
          <Prose>
            <h2>Stamp duty calculator for {stateShort(s)}</h2>
            <p>Set to a first home buyer who will live in the home. Change the price and property type to see the concession and grant for your purchase.</p>
          </Prose>
          <div style={{ marginTop: 24 }}>
            <StampDutyCalculator defaultState={s} defaultPrice={c.calcPrice} defaultFirstHomeBuyer defaultOwnerOccupier lockState compact title={`${stateShort(s)} stamp duty calculator`} />
          </div>
          <p className="mw-small" style={{ marginTop: 16 }}>
            More options, including investors and foreign buyers: <TextLink href={`${PATHS.stampDuty}/${stateSlug(s)}`}>{stateShort(s)} stamp duty calculator</TextLink>.
          </p>
        </section>

        <section id="examples" style={sectionStyle}>
          <Prose>
            <h2>Worked examples at three prices</h2>
          </Prose>
          <div style={{ marginTop: 20 }}>
            <WorkedExampleTable
              caption={`First home buyer costs in ${stateName(s)}`}
              rowHeader="Item"
              columns={c.examples.map((e, i) => ({ key: `e${i}`, label: `${e.label} (${TYPE[e.propertyType].toLowerCase()})`, numeric: true }))}
              rows={exRows}
              assumptions={[
                "First home buyer, owner-occupier, at least one buyer an Australian citizen or permanent resident, buying with a loan.",
                `5% Deposit Scheme cap check uses the ${capAreas(s)[0].short} cap; confirm your postcode with the official tool.`,
                `Calculated from ${R.revenueOffice} rules checked on ${formatDate(rulesChecked)}. Excludes conveyancing, inspections, lender fees and LMI.`,
              ]}
            />
          </div>
          <Prose className="mt-7">{c.examplesAfter}</Prose>
        </section>

        <section id="schemes" style={sectionStyle}>
          <Prose>
            <h2>5% Deposit Scheme and Help to Buy in {stateShort(s)}</h2>
            {c.schemesIntro ?? (
              <p>
                Both federal schemes apply in {stateShort(s)} with their own price caps. The 5% Deposit Scheme replaces LMI with a Government guarantee; Help to Buy is shared equity
                for citizens only.
              </p>
            )}
          </Prose>
          <div style={{ marginTop: 20 }}>
            <WorkedExampleTable
              caption={`Price caps in ${stateName(s)}`}
              rowHeader="Area"
              columns={[
                { key: "five", label: "5% Deposit Scheme", numeric: true },
                { key: "htb", label: "Help to Buy", numeric: true },
              ]}
              rows={capAreas(s).map((a, i) => ({
                label: a.area,
                cells: { five: formatAud(a.cap), htb: formatAud(i === 0 ? HELP_TO_BUY.priceCaps[s].capital : HELP_TO_BUY.priceCaps[s].regional) },
              }))}
              note={
                <>
                  5% Deposit Scheme caps from {formatDate(DEPOSIT_SCHEME.effectiveFrom)}. Help to Buy sets its own caps and area lists, so check its postcode tool too. Checked{" "}
                  {formatDate(earliestDate(DEPOSIT_SCHEME.verifiedAt, HELP_TO_BUY.verifiedAt))}.
                </>
              }
            />
          </div>
          <p className="mw-small" style={{ marginTop: 16 }}>
            Eligibility for both schemes, and the First Home Super Saver Scheme, is set out on our <TextLink href={PATHS.firstHomeBuyers}>first home buyers overview</TextLink>.
          </p>
        </section>

        {c.extra && (
          <section id={c.extra.id} style={sectionStyle}>
            <Prose>
              <h2>{c.extra.title}</h2>
              {c.extra.body}
            </Prose>
          </section>
        )}

        <section id="apply" style={sectionStyle}>
          <Prose>
            <h2>How and when to apply in {stateShort(s)}</h2>
          </Prose>
          <div style={{ marginTop: 24 }}>
            <Steps items={c.apply} />
          </div>
          {c.applyAfter && <Prose className="mt-7">{c.applyAfter}</Prose>}
        </section>

        <section id="documents" style={sectionStyle}>
          <Prose>
            <h2>Documents to have ready</h2>
            <ul>
              {c.documents.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <p className="mw-small">Lender requirements differ; this is a typical list, not a government rule.</p>
          </Prose>
        </section>

        <section id="mistakes" style={sectionStyle}>
          <Prose>
            <h2>Common mistakes in {stateShort(s)}</h2>
          </Prose>
          <div style={{ marginTop: 24 }}>
            <PointGrid items={c.mistakes} />
          </div>
        </section>
      </ArticleLayout>
    </>
  );
}
