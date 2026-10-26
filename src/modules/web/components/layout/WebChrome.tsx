import "../../styles/web.css";
import { webFontVars } from "../../fonts";
import { JsonLd, siteGraphJsonLd } from "../../seo";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/**
 * Public-site chrome: `.web` scope (tokens + fonts), skip link, header, <main id="main">, footer,
 * and the site-wide Organization/Person/WebSite JSON-LD graph.
 * Used by src/app/(site)/layout.tsx and the root not-found page.
 */
export function WebChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className={`web ${webFontVars}`}>
      <a href="#main" className="mw-skip">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} style={{ outline: "none" }}>
        {children}
      </main>
      <SiteFooter />
      <JsonLd data={siteGraphJsonLd()} />
    </div>
  );
}
