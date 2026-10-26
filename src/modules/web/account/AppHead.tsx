import { Breadcrumbs } from "../components/content/Breadcrumbs";
import { Container } from "../components/ui/Container";
import { Eyebrow } from "../components/ui/Eyebrow";
import type { Crumb } from "../seo";
import "./account.css";

/** Compact header for private/app pages (account, members, profile, portal, fact find, booking manage). */
export function AppHead({ crumbs, eyebrow, title, lede, actions }: { crumbs?: Crumb[]; eyebrow?: string; title: React.ReactNode; lede?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <header className="mw-apphead">
      <Container>
        {crumbs && <Breadcrumbs items={crumbs} jsonLd={false} />}
        <div className="mw-apphead__row">
          <div>
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            <h1 className="mw-h1">{title}</h1>
            {lede && (typeof lede === "string" ? <p className="mw-lede" style={{ maxWidth: "62ch" }}>{lede}</p> : lede)}
          </div>
          {actions && <div className="mw-btnrow">{actions}</div>}
        </div>
      </Container>
    </header>
  );
}

/** Body wrapper under an AppHead. */
export function AppBody({ children, width = "default" }: { children: React.ReactNode; width?: "default" | "narrow" }) {
  return (
    <div className="mw-appbody">
      <Container width={width}>{children}</Container>
    </div>
  );
}
