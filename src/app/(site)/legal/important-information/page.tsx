import Link from "next/link";
import { LegalLayout } from "@/modules/web/components/content/LegalLayout";
import { LicenceStatement } from "@/modules/web/components/content/LicenceStatement";
import { LEGAL_PAGES_DRAFT, PATHS } from "@/modules/web/config";
import { buildMetadata } from "@/modules/web/seo";

export const metadata = buildMetadata({
  title: "Important information",
  description: "General information disclaimer, calculator assumptions, government scheme information and what we can and can't advise on.",
  path: PATHS.importantInfo,
  noindex: LEGAL_PAGES_DRAFT,
});

const TOC = [
  { id: "general", label: "General information" },
  { id: "credit-only", label: "What we can advise on" },
  { id: "rates", label: "Interest rates" },
  { id: "calculators", label: "Calculators" },
  { id: "government", label: "Government rules and schemes" },
  { id: "lenders", label: "Lenders and eligibility" },
  { id: "licence", label: "Our licence" },
];

export default function ImportantInformationPage() {
  return (
    <LegalLayout
      title="Important information"
      slug="important-information"
      lastUpdated="2026-10-26"
      lede="The fine print that applies to every page, guide and calculator on this website."
      toc={TOC}
    >
      <section id="general">
        <h2>General information</h2>
        <p>
          The information on this website is general information only. It has been prepared without taking into account your objectives, financial situation or needs.
          Before acting on it, consider whether it is appropriate for you, and talk to us about your own situation.
        </p>
      </section>

      <section id="credit-only">
        <h2>What we can advise on</h2>
        <p>We provide credit assistance: helping you choose and apply for loans. We do not provide:</p>
        <ul>
          <li>financial product advice, for example about investments, superannuation or insurance. Speak to a licensed financial adviser.</li>
          <li>tax advice. Speak to a registered tax agent or accountant.</li>
          <li>migration advice. We are not registered migration agents. For advice about visas, speak to a registered migration agent or the Department of Home Affairs.</li>
          <li>legal advice about contracts or property. Speak to a conveyancer or solicitor.</li>
        </ul>
      </section>

      <section id="rates">
        <h2>Interest rates</h2>
        <p>
          We do not publish interest rates on this website. Rates change often and depend on the lender, the loan and your circumstances. We will give you current rates, with
          comparison rates, when we discuss specific loans with you.
        </p>
      </section>

      <section id="calculators">
        <h2>Calculators</h2>
        <p>
          Our calculators give estimates based on the figures you enter and the assumptions stated on each calculator page. They are not a quote, a loan offer or an approval.
          Each lender uses its own assessment rate, living-expense measures and policies, so what a lender will lend you may differ from the estimate. Transfer duty and grant
          estimates are based on the government rules shown on the page, checked on the date displayed.
        </p>
      </section>

      <section id="government">
        <h2>Government rules and schemes</h2>
        <p>
          Information about transfer (stamp) duty, first home buyer grants and concessions, the 5% Deposit Scheme, foreign investment (FIRB) rules and visa conditions comes from
          official sources, which we link to and date on each page. These rules change. Always check the official source, or ask us, before relying on them.
        </p>
      </section>

      <section id="lenders">
        <h2>Lenders and eligibility</h2>
        <p>
          All loans are subject to the lender&rsquo;s eligibility criteria, terms and conditions, fees and charges. We can arrange loans only with lenders we are accredited
          with, and not every lender in Australia is on our panel. See our <Link href={PATHS.creditGuide}>Credit Guide</Link>.
        </p>
      </section>

      <section id="licence">
        <h2>Our licence</h2>
        <LicenceStatement />
      </section>
    </LegalLayout>
  );
}
