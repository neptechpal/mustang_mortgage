import Link from "next/link";
import { LegalLayout } from "@/modules/web/components/content/LegalLayout";
import { Fact, Placeholder } from "@/modules/web/components/ui/Fact";
import { LEGAL_PAGES_DRAFT, PATHS, SITE } from "@/modules/web/config";
import { buildMetadata } from "@/modules/web/seo";

export const metadata = buildMetadata({
  title: "Privacy policy",
  description: "How Mustang Mortgage collects, uses, stores and discloses your personal and credit information, and how to access or correct it.",
  path: PATHS.privacy,
  noindex: LEGAL_PAGES_DRAFT,
});

const TOC = [
  { id: "scope", label: "Who this covers" },
  { id: "collect", label: "What we collect" },
  { id: "how", label: "How we collect it" },
  { id: "use", label: "How we use it" },
  { id: "disclose", label: "Who we share it with" },
  { id: "overseas", label: "Overseas disclosure" },
  { id: "credit", label: "Credit information" },
  { id: "security", label: "Security and retention" },
  { id: "access", label: "Access and correction" },
  { id: "marketing", label: "Marketing" },
  { id: "website", label: "Website, cookies and analytics" },
  { id: "automated", label: "Automated decisions" },
  { id: "complaints", label: "Privacy complaints" },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy policy"
      slug="privacy-policy"
      lastUpdated="2026-10-26"
      lede="Arranging a home loan means handling sensitive information about you. This policy explains what we collect, why, who we share it with and your rights under the Privacy Act 1988 and the Australian Privacy Principles."
      toc={TOC}
    >
      <section id="scope">
        <h2>Who this covers</h2>
        <p>
          This policy applies to {SITE.name} (<Fact path="legal.entityName" />, ABN <Fact path="legal.abn" />) and to {SITE.broker.name} as a credit representative of{" "}
          <Fact path="licence.licenseeName" />. Our licensee&rsquo;s own privacy policy also applies: <Placeholder label="Link to licensee privacy policy" />.
        </p>
      </section>

      <section id="collect">
        <h2>What we collect</h2>
        <ul>
          <li>identity and contact details: name, date of birth, address, phone, email, and identity documents</li>
          <li>residency and visa details: citizenship, visa subclass, grant and expiry dates</li>
          <li>financial details: income, employment, assets, liabilities, living expenses, bank statements and tax documents</li>
          <li>credit information, including your credit history and credit reports obtained by lenders</li>
          <li>details about the property you are buying or refinancing</li>
          <li>records of our conversations, appointments and messages</li>
        </ul>
      </section>

      <section id="how">
        <h2>How we collect it</h2>
        <p>
          We collect most information from you directly: through our enquiry and booking forms, during consultations, through the online fact find, and when you upload
          documents to our secure client portal. With your consent we may also collect information from others, such as lenders, your employer, accountant, conveyancer or
          solicitor, or a co-applicant.
        </p>
      </section>

      <section id="use">
        <h2>How we use it</h2>
        <p>We use your information to:</p>
        <ul>
          <li>respond to your enquiry and book consultations</li>
          <li>assess your situation and recommend suitable loans</li>
          <li>prepare and lodge loan applications and manage them through to settlement</li>
          <li>meet our legal obligations, including responsible lending, best interests, record keeping and identity verification</li>
          <li>look after your loan after settlement, if you ask us to</li>
        </ul>
      </section>

      <section id="disclose">
        <h2>Who we share it with</h2>
        <p>We share your information only as needed to provide our service or where the law requires it, for example with:</p>
        <ul>
          <li>lenders you apply to, and lenders mortgage insurers</li>
          <li>our licensee and aggregator, <Fact path="licence.licenseeName" /></li>
          <li>valuers, conveyancers or solicitors involved in your purchase or refinance</li>
          <li>service providers who host our systems, email and document storage</li>
          <li>regulators, courts or AFCA where required</li>
        </ul>
      </section>

      <section id="overseas">
        <h2>Overseas disclosure</h2>
        <p>
          <Placeholder label="Confirm whether any service providers (for example email, CRM or cloud storage) store or access data overseas, and list the countries" />.
        </p>
      </section>

      <section id="credit">
        <h2>Credit information</h2>
        <p>
          Lenders obtain credit reports from credit reporting bodies when they assess your application. We may receive and hold that credit information as part of arranging
          your loan. <Placeholder label="Credit reporting bodies used and how to contact them, per licensee template" />.
        </p>
      </section>

      <section id="security">
        <h2>Security and retention</h2>
        <p>
          We ask you to send documents through our secure client portal rather than by email. Access to client records is limited to people who need it to work on your file.
          We keep records for as long as the law requires, then destroy or de-identify them. <Placeholder label="Retention period per licensee requirements" />.
        </p>
      </section>

      <section id="access">
        <h2>Access and correction</h2>
        <p>
          You can ask for a copy of the personal information we hold about you, and ask us to correct it if it is wrong. Contact us at{" "}
          <a href={`mailto:${SITE.contact.email}`}>{SITE.contact.email}</a>. We will respond within a reasonable time.
        </p>
      </section>

      <section id="marketing">
        <h2>Marketing</h2>
        <p>
          We only send marketing messages if you have agreed to receive them, and every message includes a way to unsubscribe. You can also tell us at any time that you no
          longer want to hear from us.
        </p>
      </section>

      <section id="website">
        <h2>Website, cookies and analytics</h2>
        <p>
          Our website uses cookies that are needed for logging in and for the booking and enquiry forms. <Placeholder label="Analytics or advertising tools used, if any" />.
        </p>
      </section>

      <section id="automated">
        <h2>Automated decisions</h2>
        <p>
          <Placeholder label="Describe any automated processing that significantly affects clients (required from 10 December 2026), or confirm there is none" />.
        </p>
      </section>

      <section id="complaints">
        <h2>Privacy complaints</h2>
        <p>
          If you think we have mishandled your information, contact us first. If you are not satisfied with our response, you can complain to the Office of the Australian
          Information Commissioner (OAIC) at{" "}
          <a href="https://www.oaic.gov.au/" target="_blank" rel="noopener noreferrer">
            www.oaic.gov.au
          </a>{" "}
          or on 1300 363 992, or to AFCA (see our <Link href={PATHS.complaints}>complaints page</Link>).
        </p>
      </section>
    </LegalLayout>
  );
}
