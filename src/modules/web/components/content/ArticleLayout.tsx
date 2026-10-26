import { ChevronDown } from "lucide-react";
import type { Crumb } from "../../seo";
import { Container } from "../ui/Container";
import { Callout } from "../ui/Callout";
import { Eyebrow } from "../ui/Eyebrow";
import { Heading } from "../ui/Heading";
import { BrokerCard } from "./BrokerCard";
import { Breadcrumbs } from "./Breadcrumbs";
import { ReviewedStrip } from "./ReviewedStrip";
import { TocLinks, type TocItem } from "./TocLinks";

/**
 * Long-form page template (guides, visa pages, legal pages).
 *
 * Desktop: sticky left rail (table of contents + compact broker card) and a 720px main column.
 * Mobile: collapsible "On this page" above the body.
 *
 * Body sections should be <section id="…"> elements whose ids match `toc`.
 * Put FAQ, <Sources>, <Disclaimer> in `footer` (rendered under the body in the main column).
 */
export function ArticleLayout({
  crumbs,
  eyebrow,
  title,
  lede,
  summary,
  summaryTitle = "Quick answer",
  reviewed,
  toc,
  rail,
  notice,
  footer,
  children,
}: {
  crumbs: Crumb[];
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  lede?: React.ReactNode;
  /** Featured-snippet style direct answer (2–3 sentences). */
  summary?: React.ReactNode;
  summaryTitle?: string;
  /** Broker sign-off: ISO dates. Omit on pages that are not reviewed content (e.g. legal drafts). */
  reviewed?: { reviewedAt: string; updatedAt?: string; sourcesHref?: string | null };
  toc?: TocItem[];
  /** Replaces the default compact broker card in the rail. Pass null to hide. */
  rail?: React.ReactNode | null;
  /** Shown above the summary, e.g. a draft notice. */
  notice?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const railCard = rail === undefined ? <BrokerCard variant="compact" /> : rail;
  return (
    <>
      <header className="mw-intro">
        <Container>
          <Breadcrumbs items={crumbs} />
          <div className="mw-intro__grid">
            <div className="mw-intro__copy" style={{ maxWidth: 860 }}>
              {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
              <Heading level={1}>{title}</Heading>
              {lede && (typeof lede === "string" ? <p className="mw-lede">{lede}</p> : lede)}
              {reviewed && (
                <div style={{ marginTop: 28 }}>
                  <ReviewedStrip {...reviewed} />
                </div>
              )}
            </div>
          </div>
        </Container>
      </header>
      <Container>
        <div className="mw-article">
          <aside className="mw-article__rail" aria-label="Page navigation">
            <div className="mw-article__rail-inner">
              {toc?.length ? <TocLinks items={toc} /> : null}
              {railCard}
            </div>
          </aside>
          <div className="mw-article__main">
            {toc?.length ? (
              <details className="mw-article__toc-mobile">
                <summary>
                  On this page <ChevronDown size={18} strokeWidth={1.5} aria-hidden="true" />
                </summary>
                <TocLinks items={toc} title={null} />
              </details>
            ) : null}
            {notice}
            {summary && (
              <Callout tone="answer" title={summaryTitle}>
                {summary}
              </Callout>
            )}
            {children}
            {footer}
          </div>
        </div>
      </Container>
    </>
  );
}
