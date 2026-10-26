import type { Metadata } from "next";
import { ArticleLayout } from "../../components/content/ArticleLayout";
import { CtaBand } from "../../components/content/CtaBand";
import { Disclaimer } from "../../components/content/Disclaimer";
import { Faq, type FaqEntry } from "../../components/content/Faq";
import { Prose } from "../../components/content/Prose";
import { Sources, type SourceItem } from "../../components/content/Sources";
import { IndexList, type IndexItem } from "../../components/ui/IndexList";
import { SITE } from "../../config";
import { BUSINESS_ID, JsonLd, absoluteUrl, buildMetadata, webPageJsonLd, type Crumb } from "../../seo";

/**
 * Home-loan service page template (research §5.3 service skeleton).
 *
 * H1 → quick answer → content sections (who it suits, what lenders look at, worked example,
 * documents, common mistakes …) → FAQ (+FAQPage JSON-LD) → booking CTA → related pages →
 * Sources → general-information disclaimer. Breadcrumb JSON-LD comes from <ArticleLayout>.
 *
 * Each section renders `body` as prose, then `block` (a design-system component that must sit
 * outside .mw-prose, e.g. PointGrid / WorkedExampleTable / Steps), then optional `after` prose.
 * No <ReviewedStrip> until Sulav has signed the page off.
 */

export type ServiceSection = {
  id: string;
  /** Short label for the table of contents. */
  label: string;
  /** H2 text. */
  title: string;
  body?: React.ReactNode;
  block?: React.ReactNode;
  after?: React.ReactNode;
  /** Rendered after `after`, outside prose (e.g. a <Callout>). */
  aside?: React.ReactNode;
};

export type ServicePageContent = {
  path: string;
  /** Breadcrumb trail without "Home". The last crumb is this page. */
  crumbs: Crumb[];
  /** Title without the brand (buildMetadata appends " | Mustang Mortgage"); keep the result ≤ 60 chars. */
  metaTitle: string;
  /** ≤ 155 characters. */
  metaDescription: string;
  eyebrow: string;
  h1: string;
  lede: string;
  summary: React.ReactNode;
  /** Optional callout above the quick answer (e.g. a pointer to the NSW rules page). */
  notice?: React.ReactNode;
  /** schema.org Service name, e.g. "Refinancing a home loan". */
  serviceName: string;
  sections: ServiceSection[];
  faqTitle: string;
  faq: FaqEntry[];
  cta: { title: string; body: string };
  related: IndexItem[];
  sources: SourceItem[];
};

export function serviceMetadata(c: ServicePageContent): Metadata {
  return buildMetadata({ title: c.metaTitle, description: c.metaDescription, path: c.path });
}

function serviceJsonLd(c: ServicePageContent) {
  return webPageJsonLd({
    path: c.path,
    name: c.h1,
    description: c.metaDescription,
    mainEntity: {
      "@type": "Service",
      "@id": `${absoluteUrl(c.path)}#service`,
      name: c.serviceName,
      serviceType: "Mortgage broking",
      url: absoluteUrl(c.path),
      provider: { "@id": BUSINESS_ID },
      areaServed: SITE.serviceArea.areaServed.map((a) => ({ "@type": a.type, name: a.name })),
    },
  });
}

/**
 * Spacing between top-level sections in the article column, and between the parts of a section.
 * Flex gap (not .mw-stack) because component roots such as .mw-points reset their own margins.
 */
const SECTION_CLASS = "mt-14 flex flex-col gap-7";

export function ServicePage({ content: c }: { content: ServicePageContent }) {
  const toc = [
    ...c.sections.map((s) => ({ id: s.id, label: s.label })),
    { id: "questions", label: "Questions" },
    { id: "sources", label: "Sources" },
  ];
  return (
    <>
      <JsonLd data={serviceJsonLd(c)} />
      <ArticleLayout
        crumbs={c.crumbs}
        eyebrow={c.eyebrow}
        title={c.h1}
        lede={c.lede}
        notice={c.notice}
        summary={c.summary}
        toc={toc}
        footer={
          <>
            {/* The band is built for full-width sections; in the 720px article column drop the seal column. */}
            <div className="mt-12 [&_.mw-ctaband]:grid-cols-1 [&_.mw-ctaband>:last-child]:hidden">
              <CtaBand bare title={c.cta.title} body={c.cta.body} />
            </div>
            {c.related.length ? (
              <section aria-labelledby="related-title" className={SECTION_CLASS}>
                <h2 id="related-title" className="mw-h3">
                  Related pages and tools
                </h2>
                <IndexList items={c.related} />
              </section>
            ) : null}
            <Sources items={c.sources} />
            <Disclaimer />
          </>
        }
      >
        {c.sections.map((s) => (
          <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className={SECTION_CLASS}>
            <Prose>
              <h2 id={`${s.id}-title`}>{s.title}</h2>
              {s.body}
            </Prose>
            {s.block}
            {s.after ? <Prose>{s.after}</Prose> : null}
            {s.aside}
          </section>
        ))}
        <section id="questions" aria-labelledby="questions-title" className={SECTION_CLASS}>
          <Prose>
            <h2 id="questions-title">{c.faqTitle}</h2>
          </Prose>
          <Faq items={c.faq} />
        </section>
      </ArticleLayout>
    </>
  );
}

