import Link from "next/link";
import { LegalLayout } from "@/modules/web/components/content/LegalLayout";
import { Fact, Placeholder } from "@/modules/web/components/ui/Fact";
import { LEGAL_PAGES_DRAFT, PATHS, SITE } from "@/modules/web/config";
import { buildMetadata } from "@/modules/web/seo";

export const metadata = buildMetadata({
  title: "Website terms",
  description: "Terms of use for the Mustang Mortgage website, including general information, calculators, links and intellectual property.",
  path: PATHS.terms,
  noindex: LEGAL_PAGES_DRAFT,
});

const TOC = [
  { id: "about", label: "About these terms" },
  { id: "information", label: "General information only" },
  { id: "calculators", label: "Calculators" },
  { id: "links", label: "Links to other websites" },
  { id: "accounts", label: "Client accounts and the portal" },
  { id: "ip", label: "Intellectual property" },
  { id: "liability", label: "Liability" },
  { id: "law", label: "Governing law" },
];

export default function WebsiteTermsPage() {
  return (
    <LegalLayout title="Website terms" slug="website-terms" lastUpdated="2026-10-26" lede="By using this website you agree to these terms." toc={TOC}>
      <section id="about">
        <h2>About these terms</h2>
        <p>
          This website is operated by <Fact path="legal.entityName" /> (ABN <Fact path="legal.abn" />), trading as {SITE.name}. We may update these terms from time to time; the
          version on this page applies.
        </p>
      </section>

      <section id="information">
        <h2>General information only</h2>
        <p>
          The content on this website is general information. It does not take into account your objectives, financial situation or needs and is not legal, tax, financial or
          migration advice. Government rules, lender policies and fees change; check the date shown on each page and confirm details with us or the official source before
          acting.
        </p>
      </section>

      <section id="calculators">
        <h2>Calculators</h2>
        <p>
          Calculator results are estimates based on the information you enter and the assumptions stated on each calculator. They are not a quote, offer or approval of
          credit. See <Link href={PATHS.importantInfo}>Important information</Link>.
        </p>
      </section>

      <section id="links">
        <h2>Links to other websites</h2>
        <p>We link to government and other websites for your convenience. We don&rsquo;t control those websites and aren&rsquo;t responsible for their content.</p>
      </section>

      <section id="accounts">
        <h2>Client accounts and the portal</h2>
        <p>
          If we give you access to our client portal or an account, keep your link and login details private and tell us straight away if you think someone else has used
          them.
        </p>
      </section>

      <section id="ip">
        <h2>Intellectual property</h2>
        <p>
          The content, design and logo on this website belong to {SITE.name} or its licensors. You may view and print pages for your own use, but not copy or republish them
          without our permission.
        </p>
      </section>

      <section id="liability">
        <h2>Liability</h2>
        <p>
          <Placeholder label="Limitation of liability wording, per licensee template (must not exclude rights under the Australian Consumer Law)" />.
        </p>
      </section>

      <section id="law">
        <h2>Governing law</h2>
        <p>These terms are governed by the laws of New South Wales, Australia.</p>
      </section>
    </LegalLayout>
  );
}
