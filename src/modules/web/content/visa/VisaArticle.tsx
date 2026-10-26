import { RULES } from "@/modules/calc/rules";
import { NSW_DRA_POSTCODES, STATE_RESIDENCY_RULES, SRC, COMMON_FACTS } from "@/modules/seo-data/visas";
import type { Tri, VisaPolicy } from "@/modules/seo-data/types";
import { ArticleLayout } from "../../components/content/ArticleLayout";
import { CtaBand } from "../../components/content/CtaBand";
import { Disclaimer } from "../../components/content/Disclaimer";
import { Faq } from "../../components/content/Faq";
import { PointGrid } from "../../components/content/PointGrid";
import { Prose } from "../../components/content/Prose";
import { Sources } from "../../components/content/Sources";
import { WorkedExampleTable, type WorkedRow } from "../../components/content/WorkedExampleTable";
import { Callout } from "../../components/ui/Callout";
import { IndexList } from "../../components/ui/IndexList";
import { PATHS } from "../../config";
import { formatAud, formatDate } from "../../format";
import { JsonLd, articleJsonLd, absoluteUrl } from "../../seo";
import { ReviewLine, withReviewClaim, type PageReview } from "../shared/review";
import { duty, firbNewDwellingFee, regFees } from "../shared/rules";
import { GroupedSources, type SourceGroup } from "../shared/GroupedSources";
import { fromSourced, latestDate, toSourceItems, type SourceInput } from "../shared/sources";
import { buildMatrix, StateTable } from "./matrix";
import type { VisaPageContent } from "./types";

export const visaPath = (slug: string) => `${PATHS.visaHomeLoans}/${slug}`;

const sectionStyle = { marginTop: 72 } as const;

const TYPE_LABEL = { established: "established home", new: "new home", "off-the-plan": "off-the-plan home", "vacant-land": "block of vacant land" } as const;

function triLabel(t: Tri, map: Partial<Record<Tri, string>>) {
  return map[t] ?? (t === "yes" ? "Yes" : t === "no" ? "No" : t === "conditional" ? "Depends" : "Confirm");
}

/** "At a glance" facts for the visa, straight from seo-data/visas. */
function AtAGlance({ p }: { p: VisaPolicy }) {
  const ban = p.establishedDwellingBan;
  const rows: { k: string; v: React.ReactNode; checked: string }[] = [
    {
      k: "Visa status",
      v: p.permanent === "mixed" ? "Temporary first stage, then permanent" : p.permanent ? "Permanent visa" : "Temporary visa",
      checked: p.verifiedAt,
    },
    {
      k: "FIRB approval to buy a home",
      v: triLabel(p.firb.approvalRequired, { yes: "Needed", no: "Not needed" }),
      checked: p.firb.verifiedAt,
    },
    {
      k: "Established (existing) homes",
      v:
        ban.applies === "yes" && ban.from && ban.to
          ? `Banned for foreign persons from ${formatDate(ban.from)} to ${formatDate(ban.to)}`
          : ban.applies === "no"
            ? "Can buy, no approval needed"
            : "Confirm",
      checked: ban.verifiedAt,
    },
    {
      k: "New homes and vacant land",
      v: triLabel(p.newDwellingFirb.required, { yes: "Can buy with FIRB approval (fee applies)", no: "Can buy, no approval needed" }),
      checked: p.newDwellingFirb.verifiedAt,
    },
    {
      k: "5% Deposit Scheme",
      v: p.fiveDepositScheme.verified ? triLabel(p.fiveDepositScheme.eligible, { yes: "Eligible (other criteria apply)", no: "Not eligible" }) : "Confirm with a participating lender",
      checked: p.fiveDepositScheme.verifiedAt,
    },
    {
      k: "Help to Buy",
      v: triLabel(p.helpToBuy.eligible, { yes: "Eligible", no: "Not eligible (Australian citizens only)" }),
      checked: p.helpToBuy.verifiedAt,
    },
  ];
  const checked = rows.map((r) => r.checked).sort()[0];
  return (
    <div className="mw-table-wrap" role="region" aria-label="At a glance" tabIndex={0}>
      <table className="mw-table" style={{ minWidth: 0 }}>
        <caption>At a glance</caption>
        <tbody>
          {rows.map((r) => (
            <tr key={r.k}>
              <th scope="row" style={{ width: "42%" }}>
                {r.k}
              </th>
              <td>{r.v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mw-table-notes" style={{ padding: "0 20px 16px", margin: 0 }}>
        Checked against the Foreign Investment Review Board, Home Affairs and Housing Australia on {formatDate(checked)}.
      </p>
    </div>
  );
}

function NswRegionalPostcodes() {
  const fmt = (rs: [number, number][]) => rs.map(([a, b]) => (a === b ? String(a) : `${a}–${b}`)).join(", ");
  return (
    <WorkedExampleTable
      caption="NSW postcodes in a designated regional area"
      rowHeader="Category"
      columns={[{ key: "pc", label: "Postcodes" }]}
      rows={[
        { label: "Category 2: cities and major regional centres", cells: { pc: fmt(NSW_DRA_POSTCODES.category2) } },
        { label: "Category 3: regional centres and other regional areas", cells: { pc: fmt(NSW_DRA_POSTCODES.category3) } },
      ]}
      note={
        <>
          Home Affairs regional postcodes list, checked {formatDate(NSW_DRA_POSTCODES.verifiedAt)}. Any NSW postcode not listed (including all of Sydney) is not a
          designated regional area. Your visa is tied to the areas that were designated when it was granted.{" "}
        </>
      }
    />
  );
}

/** Rows for the illustrative scenario (1–2 columns), all computed by the duty engine. */
export function scenarioFigures(s: VisaPageContent["scenario"]) {
  const cols = s.columns.map((col, i) => {
    const r = duty(col.duty);
    const firb = col.firbFee ? firbNewDwellingFee(col.duty.price) : null;
    return { key: `c${i}`, col, r, firb, total: Math.round((r.totalGovtCosts + (firb?.fee ?? 0)) * 100) / 100 };
  });
  const first = s.columns[0].duty;
  const R = RULES[first.state];
  const cell = (fn: (x: (typeof cols)[number]) => React.ReactNode) => Object.fromEntries(cols.map((x) => [x.key, fn(x)]));
  const anyForeign = cols.some((x) => x.col.duty.foreignPurchaser);
  const anyFirb = cols.some((x) => x.firb);
  const rows: WorkedRow[] = [
    { label: "Purchase price", cells: cell((x) => formatAud(x.col.duty.price)) },
    { label: "Transfer duty before any concession", cells: cell((x) => formatAud(x.r.baseDuty)) },
    {
      label: "First home duty concession",
      cells: cell((x) => (x.r.concession > 0 ? `−${formatAud(x.r.concession)}` : x.col.duty.firstHomeBuyer ? "Not available" : "Not applicable")),
    },
    ...(anyForeign
      ? [
          {
            label: cols.every((x) => x.col.duty.state === first.state)
              ? `${R.foreignSurcharge.name}${R.foreignSurcharge.ratePct ? ` (${R.foreignSurcharge.ratePct}%)` : ""}`
              : "Foreign buyer duty surcharge",
            cells: cell((x) => (x.col.duty.foreignPurchaser ? formatAud(x.r.surcharge) : "Not payable")),
          },
        ]
      : []),
    ...(cols.some((x) => x.r.offThePlanConcession > 0)
      ? [{ label: "Off-the-plan concession", cells: cell((x) => (x.r.offThePlanConcession > 0 ? `−${formatAud(x.r.offThePlanConcession)}` : "None")) }]
      : []),
    { label: "Mortgage and transfer registration fees", cells: cell((x) => formatAud(regFees(x.r), { cents: true })) },
    ...(anyFirb ? [{ label: "FIRB application fee (new dwelling)", cells: cell((x) => (x.firb ? (x.firb.fee !== null ? formatAud(x.firb.fee) : "See FIRB fees") : "Not needed")) }] : []),
    { label: "Government costs to budget for", cells: cell((x) => formatAud(x.total, { cents: true })), total: true },
    ...(s.depositPct
      ? [
          { label: `Deposit (${s.depositPct}%)`, cells: cell((x) => formatAud(Math.round((x.col.duty.price * s.depositPct!) / 100))) },
          { label: `Loan before any LMI (${100 - s.depositPct}% LVR)`, cells: cell((x) => formatAud(Math.round((x.col.duty.price * (100 - s.depositPct!)) / 100))) },
        ]
      : []),
    {
      label: "First Home Owner Grant (paid separately)",
      cells: cell((x) => (x.r.fhogAmount > 0 ? formatAud(x.r.fhogAmount) : x.col.duty.firstHomeBuyer ? "Not eligible" : "Not applicable")),
    },
  ];
  const same = cols.every((x) => x.col.duty.price === first.price && x.col.duty.propertyType === first.propertyType && x.col.duty.state === first.state);
  const offices = [...new Set(cols.map((x) => RULES[x.col.duty.state].revenueOffice))];
  return {
    cols,
    rows,
    columns: cols.map((x) => ({ key: x.key, label: x.col.label, numeric: true })),
    caption: same ? `${formatAud(first.price)} ${TYPE_LABEL[first.propertyType]} in ${R.name}` : s.title.charAt(0).toUpperCase() + s.title.slice(1),
    offices: offices.join(" and "),
    firb: cols.find((x) => x.firb)?.firb ?? null,
  };
}

export function VisaArticle({ policy: p, content: c, review, related }: { policy: VisaPolicy; content: VisaPageContent; review: PageReview; related: { href: string; title: string; description: string }[] }) {
  const path = visaPath(c.slug);
  const matrix = buildMatrix(p.stateRules);
  const permMatrix = c.permanentStageTable ? buildMatrix(STATE_RESIDENCY_RULES.permanent) : null;

  // Illustrative scenario, computed by the duty engine.
  const s = c.scenario;
  const sc = scenarioFigures(s);
  const R = RULES[s.columns[0].duty.state];

  // Main sources: Commonwealth/visa facts and the scenario's state. Other states: grouped list.
  const sourceInputs: SourceInput[] = [
    ...(p.homeAffairsUrl ? [{ url: p.homeAffairsUrl, verifiedAt: p.verifiedAt }] : []),
    ...fromSourced(p.firb),
    ...fromSourced(p.establishedDwellingBan),
    ...fromSourced(p.newDwellingFirb),
    ...(p.regionalCondition ? fromSourced(p.regionalCondition) : []),
    ...(p.pathway ? fromSourced(p.pathway) : []),
    ...fromSourced(p.fiveDepositScheme),
    ...fromSourced(p.helpToBuy),
    ...(sc.firb ? [{ url: sc.firb.url, verifiedAt: sc.firb.verifiedAt, title: "Schedule of fees 2026-27 (version 8)" }] : []),
    ...(c.regional?.showNswPostcodes ? [{ url: SRC.draPostcodes, verifiedAt: NSW_DRA_POSTCODES.verifiedAt }] : []),
    ...sc.cols.flatMap((col) => col.r.sources.map((x) => ({ url: x.url, verifiedAt: x.verifiedAt, title: x.label.replace(/^[^:]+:\s*/, "") }))),
  ];
  const sources = toSourceItems(sourceInputs);
  const inMain = new Set(sources.map((x) => x.url));
  const stateGroups: SourceGroup[] = matrix.map((m) => ({
    label: m.state,
    items: [...m.sources, ...(permMatrix?.find((x) => x.state === m.state)?.sources ?? [])].filter((x) => !inMain.has(x.url)),
  }));
  const dataDate = latestDate(p.verifiedAt, ...sc.cols.map((col) => col.r.rulesVerifiedAt));
  const modified = latestDate(c.updatedAt, dataDate);

  const toc = [
    { id: "lenders", label: "What lenders look at" },
    { id: "firb", label: "FIRB and established homes" },
    { id: "states", label: "Duty and grants by state" },
    { id: "deposit", label: "Deposit and LMI" },
    ...(c.regional ? [{ id: "regional", label: c.regional.title }] : []),
    { id: "pathway", label: c.pathway.title },
    { id: "documents", label: "Documents checklist" },
    { id: "scenario", label: "Illustrative scenario" },
    ...(c.mistakes?.length ? [{ id: "mistakes", label: "Common mistakes" }] : []),
    { id: "faq", label: "Questions" },
    { id: "sources", label: "Sources" },
  ];

  const ld = withReviewClaim(
    articleJsonLd({
      path,
      headline: c.headline,
      description: c.metaDescription,
      datePublished: c.publishedAt,
      dateModified: modified,
      about: {
        "@type": "Thing",
        name: p.name,
        ...(p.homeAffairsUrl ? { sameAs: p.homeAffairsUrl } : {}),
      },
      citations: [...sources.map((x) => x.url), ...stateGroups.flatMap((g) => g.items.map((i) => i.url))].filter((u, i, a) => a.indexOf(u) === i),
    }),
    review,
  );

  return (
    <>
      <JsonLd data={ld} />
      <ArticleLayout
        crumbs={[
          { name: "Visa and PR home loans", path: PATHS.visaHomeLoans },
          { name: c.short, path },
        ]}
        eyebrow="Visa and PR home loans"
        title={c.h1}
        lede={
          <>
            <p className="mw-lede">{c.lede}</p>
            <ReviewLine review={review} updatedAt={dataDate} />
          </>
        }
        summary={<div className="space-y-3">{c.answer}</div>}
        toc={toc}
        footer={
          <>
            <section id="faq" style={sectionStyle} aria-labelledby="faq-title">
              <h2 id="faq-title" className="mw-h2" style={{ marginBottom: 24 }}>
                {c.faqTitle ?? "Questions"}
              </h2>
              <Faq items={c.faqs} />
            </section>
            <div style={sectionStyle}>
              <CtaBand bare compact headingLevel={2} title="Talk through your visa and deposit with Sulav" body="Bring your visa grant notice and a rough idea of your savings. In 60 minutes we work out which lenders fit and what the purchase will really cost." />
            </div>
            {related.length > 0 && (
              <section style={sectionStyle} aria-labelledby="related-title">
                <h2 id="related-title" className="mw-h3" style={{ marginBottom: 16 }}>
                  Related guides
                </h2>
                <IndexList items={related} />
              </section>
            )}
            <div style={sectionStyle}>
              <Sources items={sources} intro="Every rule on this page comes from these official pages. Dates show when we last checked each one." />
              <div style={{ marginTop: 32 }}>
                <GroupedSources groups={stateGroups} intro="Used for the state-by-state table." />
              </div>
            </div>
            <Disclaimer>
              <p>
                We arrange home loans. We are not registered migration agents and nothing here is immigration advice. For questions about your visa, speak to a registered
                migration agent or the Department of Home Affairs.
              </p>
            </Disclaimer>
          </>
        }
      >
        <AtAGlance p={p} />

        <section id="lenders" style={sectionStyle}>
          <Prose>
            <h2>What lenders look at</h2>
            {c.lenders.intro}
          </Prose>
          <div style={{ marginTop: 28 }}>
            <PointGrid items={c.lenders.points} />
          </div>
          {c.lenders.outro && <Prose className="mt-7">{c.lenders.outro}</Prose>}
        </section>

        <section id="firb" style={sectionStyle}>
          <Prose>
            <h2>FIRB and the established-home ban</h2>
            {c.firb}
          </Prose>
        </section>

        <section id="states" style={sectionStyle}>
          <Prose>
            <h2>Duty, concessions and grants in each state</h2>
            {c.states.intro}
          </Prose>
          <div style={{ marginTop: 24 }}>
            <StateTable rows={matrix} caption={p.permanent === "mixed" ? "While you hold the temporary partner visa (820 or 309)" : `${c.short}: what applies in each state`} />
          </div>
          {permMatrix && c.permanentStageTable && (
            <>
              <Prose className="mt-8">{c.permanentStageTable.intro}</Prose>
              <div style={{ marginTop: 24 }}>
                <StateTable rows={permMatrix} caption={c.permanentStageTable.caption} />
              </div>
            </>
          )}
          <Prose className="mt-7">{c.states.after}</Prose>
        </section>

        <section id="deposit" style={sectionStyle}>
          <Prose>
            <h2>Deposit and LMI</h2>
            {c.deposit}
          </Prose>
        </section>

        {c.regional && (
          <section id="regional" style={sectionStyle}>
            <Prose>
              <h2>{c.regional.title}</h2>
              {c.regional.body}
            </Prose>
            {c.regional.showNswPostcodes && (
              <div style={{ marginTop: 24 }}>
                <NswRegionalPostcodes />
              </div>
            )}
          </section>
        )}

        <section id="pathway" style={sectionStyle}>
          <Prose>
            <h2>{c.pathway.title}</h2>
            {c.pathway.body}
          </Prose>
        </section>

        <section id="documents" style={sectionStyle}>
          <Prose>
            <h2>Documents checklist</h2>
            {c.documents.intro ?? <p>Most lenders will ask for these. Have them ready before you apply and the assessment moves faster.</p>}
            <ul>
              {[...p.typicalDocuments, ...(c.documents.extra ?? [])].map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
            <p className="mw-small">
              This list is common lender practice, not a government rule. Each lender sets its own requirements, so we send you a checklist for the lender we recommend.
            </p>
            {c.documents.after}
          </Prose>
        </section>

        <section id="scenario" style={sectionStyle}>
          <Prose>
            <h2>Illustrative scenario: {s.title}</h2>
            <Callout tone="note" title="Illustrative only">
              <p>This is a made-up example to show how the rules combine. It is not a real client and the people in it do not exist.</p>
            </Callout>
            {s.setup}
          </Prose>
          <div style={{ marginTop: 24 }}>
            <WorkedExampleTable
              caption={sc.caption}
              rowHeader="Item"
              columns={sc.columns}
              rows={sc.rows}
              assumptions={[
                ...s.assumptions,
                `Duty, concessions and fees calculated from ${sc.offices} rules checked on ${formatDate(sc.cols[0].r.rulesVerifiedAt)}.`,
                ...(sc.firb ? [`FIRB fee from the 2026-27 Schedule of Fees, checked on ${formatDate(sc.firb.verifiedAt)}.`] : []),
                "Excludes conveyancing, building and pest inspections, lender fees, LMI and moving costs.",
              ]}
            />
          </div>
          <Prose className="mt-7">{s.after}</Prose>
        </section>

        {c.mistakes?.length ? (
          <section id="mistakes" style={sectionStyle}>
            <Prose>
              <h2>Common mistakes</h2>
            </Prose>
            <div style={{ marginTop: 24 }}>
              <PointGrid items={c.mistakes} />
            </div>
          </section>
        ) : null}
      </ArticleLayout>
    </>
  );
}

/** Helpers for content files. */
export const BAN = COMMON_FACTS.establishedDwellingBan;
export const banFrom = () => formatDate(BAN.from);
export const banTo = () => formatDate(BAN.to);
export const banOriginalTo = () => formatDate(BAN.originalTo);
export const canonical = (slug: string) => absoluteUrl(visaPath(slug));
