import type { Crumb } from "../../seo";
import { Container } from "../ui/Container";
import { Eyebrow } from "../ui/Eyebrow";
import { Heading } from "../ui/Heading";
import { cx } from "../ui/cx";
import { Breadcrumbs } from "./Breadcrumbs";

/**
 * Header block for inner pages: breadcrumbs, optional media (portrait/seal), eyebrow, H1, lede,
 * optional actions and aside (e.g. <ConsultationCard/>). Ends with a hairline.
 */
export function PageIntro({
  crumbs,
  eyebrow,
  title,
  lede,
  actions,
  aside,
  media,
  children,
}: {
  crumbs?: Crumb[];
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  lede?: React.ReactNode;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  /** Small image or seal above the eyebrow (e.g. broker portrait). */
  media?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="mw-intro">
      <Container>
        {crumbs && <Breadcrumbs items={crumbs} />}
        <div className={cx("mw-intro__grid", !!aside && "mw-intro__grid--aside")}>
          <div className="mw-intro__copy">
            {media && <div className="mw-intro__media">{media}</div>}
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            <Heading level={1}>{title}</Heading>
            {lede && (typeof lede === "string" ? <p className="mw-lede">{lede}</p> : lede)}
            {actions && <div className="mw-btnrow" style={{ marginTop: 28 }}>{actions}</div>}
            {children}
          </div>
          {aside && <div>{aside}</div>}
        </div>
      </Container>
    </header>
  );
}
