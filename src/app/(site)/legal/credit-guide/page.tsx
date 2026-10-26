import Link from "next/link";
import { AfcaContact } from "@/modules/web/components/content/AfcaContact";
import { LegalLayout } from "@/modules/web/components/content/LegalLayout";
import { LicenceStatement } from "@/modules/web/components/content/LicenceStatement";
import { Fact, Placeholder } from "@/modules/web/components/ui/Fact";
import { LEGAL_PAGES_DRAFT, PATHS, SITE } from "@/modules/web/config";
import { buildMetadata } from "@/modules/web/seo";

export const metadata = buildMetadata({
  title: "Credit Guide",
  description: "Mustang Mortgage Credit Guide: who we are, our credit licence, how we are paid, the lenders we use most and how to complain.",
  path: PATHS.creditGuide,
  noindex: LEGAL_PAGES_DRAFT,
});

const TOC = [
  { id: "about", label: "About this guide" },
  { id: "who-we-are", label: "Who we are" },
  { id: "lenders", label: "Lenders we use most" },
  { id: "assessment", label: "Our obligations to you" },
  { id: "fees", label: "Fees and commissions" },
  { id: "complaints", label: "Complaints" },
  { id: "privacy", label: "Your privacy" },
];

export default function CreditGuidePage() {
  return (
    <LegalLayout
      title="Credit Guide"
      slug="credit-guide"
      lastUpdated="2026-10-26"
      lede="This guide tells you who we are, who licenses us, how we are paid and what to do if you are unhappy with our service. Please read it before you use our credit assistance."
      toc={TOC}
    >
      <section id="about">
        <h2>About this guide</h2>
        <p>
          We are required to give you a Credit Guide before we provide credit assistance. The final version of this guide will be the one issued under our licensee&rsquo;s
          template, also available as a PDF: <Placeholder label="Licensee Credit Guide PDF" />.
        </p>
      </section>

      <section id="who-we-are">
        <h2>Who we are</h2>
        <dl>
          <div>
            <dt>Business</dt>
            <dd>
              {SITE.name}, a trading name of <Fact path="legal.entityName" />, ABN <Fact path="legal.abn" />
            </dd>
          </div>
          <div>
            <dt>Your broker</dt>
            <dd>
              {SITE.broker.name}, Credit Representative number <Fact path="licence.creditRepresentativeNumber" />
            </dd>
          </div>
          <div>
            <dt>Licensee</dt>
            <dd>
              <Fact path="licence.licenseeName" />, Australian Credit Licence <Fact path="licence.licenseeAcl" />
            </dd>
          </div>
          <div>
            <dt>Contact</dt>
            <dd>
              Phone <a href={SITE.broker.phoneHref}>{SITE.broker.phone}</a>, email <a href={`mailto:${SITE.contact.email}`}>{SITE.contact.email}</a>
            </dd>
          </div>
        </dl>
        <LicenceStatement />
      </section>

      <section id="lenders">
        <h2>Lenders we use most often</h2>
        <p>
          We can arrange loans only with lenders we are accredited with. The lenders we have used most often over the last financial year are:{" "}
          <Placeholder label="List of the six lenders most used, from licensee records" />.
        </p>
      </section>

      <section id="assessment">
        <h2>Our obligations to you</h2>
        <p>Before we help you apply for a loan, we must:</p>
        <ul>
          <li>make reasonable inquiries about your requirements, objectives and financial situation, and take reasonable steps to verify your financial situation</li>
          <li>assess whether the loan is not unsuitable for you (a preliminary assessment)</li>
          <li>act in your best interests, and put your interests first if they conflict with ours</li>
        </ul>
        <p>You can ask us for a copy of our preliminary assessment. We will give it to you within the timeframes set by law.</p>
      </section>

      <section id="fees">
        <h2>Fees and commissions</h2>
        <h3>Fees payable by you</h3>
        <p>
          <Fact path="fees.clientFeeStatement" />. If a fee is payable for our credit assistance, we will give you a written quote before we provide that assistance.
        </p>
        <h3>Commissions we receive</h3>
        <p>
          When your loan settles, the lender pays commission to our licensee, which passes it to us. This usually includes an upfront commission based on the loan amount and
          an ongoing (trail) commission based on the balance. <Placeholder label="Commission ranges and payment flow, from licensee template" />.
        </p>
        <p>
          You can ask us how commissions are calculated and the amounts we expect to receive. See also <Link href={PATHS.howWeArePaid}>How we are paid</Link>.
        </p>
        <h3>Referrers</h3>
        <p>
          <Placeholder label="Referral arrangements (who refers clients to us and whether they are paid), or a statement that there are none" />.
        </p>
      </section>

      <section id="complaints">
        <h2>Complaints</h2>
        <p>
          If you are unhappy with our service, please tell us first. Our <Link href={PATHS.complaints}>complaints page</Link> explains how we handle complaints and the
          timeframes. You can also contact our licensee: <Placeholder label="Licensee complaints contact" />.
        </p>
        <p>If you are not satisfied with our response, or we take too long, you can take your complaint to AFCA, a free and independent external dispute resolution scheme.</p>
        <AfcaContact />
      </section>

      <section id="privacy">
        <h2>Your privacy</h2>
        <p>
          We collect and handle your personal and credit information as set out in our <Link href={PATHS.privacy}>Privacy policy</Link>.
        </p>
      </section>
    </LegalLayout>
  );
}
