import { LEGAL_PAGES_DRAFT, PATHS, SITE } from "../../config";
import { formatDate } from "../../format";
import { TextLink } from "../ui/Button";
import { Callout } from "../ui/Callout";
import { Prose } from "./Prose";
import { ArticleLayout } from "./ArticleLayout";
import type { TocItem } from "./TocLinks";

/**
 * Template for /legal/* pages. While `draft` is true a visible notice says the text must be
 * replaced with licensee-approved wording. Body goes in <section id> blocks matching `toc`.
 */
export function LegalLayout({
  title,
  slug,
  lede,
  lastUpdated,
  draft = LEGAL_PAGES_DRAFT,
  toc,
  children,
}: {
  title: string;
  slug: string;
  lede?: string;
  lastUpdated: string;
  draft?: boolean;
  toc: TocItem[];
  children: React.ReactNode;
}) {
  return (
    <ArticleLayout
      crumbs={[{ name: title, path: `/legal/${slug}` }]}
      eyebrow="Legal and compliance"
      title={title}
      lede={lede}
      toc={toc}
      rail={null}
      notice={
        draft ? (
          <Callout tone="draft" title="Draft — to be replaced with licensee-approved text">
            <p>
              This page is a working draft prepared for {SITE.name}. Before launch it must be replaced or approved by our credit licensee&rsquo;s compliance team. Bracketed
              items are details we have not yet confirmed.
            </p>
          </Callout>
        ) : null
      }
      footer={
        <p className="mw-small" style={{ borderTop: "1px solid var(--mw-line)", paddingTop: 20 }}>
          Last updated <time dateTime={lastUpdated}>{formatDate(lastUpdated)}</time>. Questions about this page:{" "}
          <a className="mw-link" href={`mailto:${SITE.contact.email}`}>
            {SITE.contact.email}
          </a>{" "}
          or{" "}
          <TextLink href={PATHS.contact}>contact us</TextLink>.
        </p>
      }
    >
      <Prose>{children}</Prose>
    </ArticleLayout>
  );
}
