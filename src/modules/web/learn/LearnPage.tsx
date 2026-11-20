import type { Metadata } from "next";
import { ArticleLayout } from "../components/content/ArticleLayout";
import { CtaBand } from "../components/content/CtaBand";
import { Disclaimer } from "../components/content/Disclaimer";
import { Prose } from "../components/content/Prose";
import { IndexList, type IndexItem } from "../components/ui/IndexList";
import { PATHS } from "../config";
import { JsonLd, breadcrumbJsonLd, buildMetadata, webPageJsonLd } from "../seo";
import "../styles/learn.css";

const SECTION_CLASS = "mt-14 flex flex-col gap-7";

export type LearnSection = { id: string; label: string; title: string; body: React.ReactNode; block?: React.ReactNode; after?: React.ReactNode };

export const LEARN_GUIDES: IndexItem[] = [
  { href: PATHS.fixedVsVariable, title: "Fixed or variable?", description: "How each rate type works, what you give up with each, and splitting a loan." },
  { href: PATHS.learnOffset, title: "Offset accounts, simply explained", description: "How the savings in one account can cut the interest on your loan." },
  { href: PATHS.learnRepayments, title: "Ways to repay your home loan", description: "Monthly or fortnightly, interest-only, extra repayments and the term." },
  { href: PATHS.learnFacts, title: "Nine things most people find out later", description: "Short, plain facts about how home loans really work." },
  { href: PATHS.loanExplorer, title: "Loan explorer", description: "Move the sliders and watch your loan change, year by year." },
];

export const learnMetadata = (a: { title: string; description: string; path: string }): Metadata => buildMetadata(a);

/** Template for the Learn guides: article layout, structured data, related guides and the general-information disclaimer. */
export function LearnPage({
  path,
  crumbTitle,
  eyebrow = "Learn",
  h1,
  lede,
  summary,
  summaryTitle,
  description,
  sections,
  children,
  rail,
}: {
  path: string;
  crumbTitle: string;
  eyebrow?: string;
  h1: string;
  lede: string;
  summary?: React.ReactNode;
  summaryTitle?: string;
  description: string;
  sections: LearnSection[];
  children?: React.ReactNode;
  rail?: React.ReactNode | null;
}) {
  const crumbs = [
    { name: "Learn", path: PATHS.learn },
    { name: crumbTitle, path },
  ];
  return (
    <>
      <JsonLd data={webPageJsonLd({ path, name: h1, description })} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <ArticleLayout
        crumbs={crumbs}
        eyebrow={eyebrow}
        title={h1}
        lede={lede}
        summary={summary}
        summaryTitle={summaryTitle}
        toc={sections.map((s) => ({ id: s.id, label: s.label }))}
        rail={rail}
        footer={
          <>
            <div className="mt-12 [&_.mw-ctaband]:grid-cols-1 [&_.mw-ctaband>:last-child]:hidden">
              <CtaBand bare title="Want to talk it through?" body="A 60-minute consultation by phone or video. We compare lenders for your situation and explain the costs." />
            </div>
            <section aria-labelledby="more-title" className={SECTION_CLASS}>
              <h2 id="more-title" className="mw-h3">
                More to read
              </h2>
              <IndexList items={LEARN_GUIDES.filter((g) => g.href !== path)} />
            </section>
            <Disclaimer />
          </>
        }
      >
        {sections.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className={SECTION_CLASS}>
            <Prose>
              <h2 id={`${s.id}-title`}>{s.title}</h2>
              {s.body}
            </Prose>
            {s.block}
            {s.after ? <Prose>{s.after}</Prose> : null}
          </section>
        ))}
        {children}
      </ArticleLayout>
    </>
  );
}
