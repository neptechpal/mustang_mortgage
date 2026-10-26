import Link from "next/link";
import { AfcaContact } from "@/modules/web/components/content/AfcaContact";
import { LegalLayout } from "@/modules/web/components/content/LegalLayout";
import { LEGAL_PAGES_DRAFT, PATHS, SITE } from "@/modules/web/config";
import { buildMetadata } from "@/modules/web/seo";

export const metadata = buildMetadata({
  title: "Financial hardship",
  description: "Having trouble with your home loan repayments? What to do, how to ask your lender for a hardship arrangement, and where to get free help.",
  path: PATHS.hardship,
  noindex: LEGAL_PAGES_DRAFT,
});

const TOC = [
  { id: "act-early", label: "Act early" },
  { id: "lender", label: "Ask your lender for help" },
  { id: "how-we-help", label: "How we can help" },
  { id: "free-help", label: "Free, independent help" },
  { id: "afca", label: "If your lender says no" },
];

export default function HardshipPage() {
  return (
    <LegalLayout
      title="Financial hardship"
      slug="financial-hardship"
      lastUpdated="2026-10-26"
      lede="Illness, job loss, separation or a rise in costs can make repayments hard. You have options, and the earlier you use them the more there are."
      toc={TOC}
    >
      <section id="act-early">
        <h2>Act early</h2>
        <p>
          If you think you will miss a repayment, contact your lender before it happens. Missed repayments can be recorded on your credit file, and fees and interest can add
          up quickly.
        </p>
      </section>

      <section id="lender">
        <h2>Ask your lender for help</h2>
        <p>
          Your loan is with the lender, so a hardship request goes to them. Ask for their hardship team. Lenders must consider hardship requests, and may agree to change your
          repayments for a period, for example by:
        </p>
        <ul>
          <li>reducing or pausing repayments for a time</li>
          <li>extending the loan term to lower repayments</li>
          <li>switching to interest-only repayments for a short period</li>
        </ul>
        <p>Have your loan details and a summary of your income and expenses ready. Ask for any agreement in writing.</p>
      </section>

      <section id="how-we-help">
        <h2>How we can help</h2>
        <p>
          If we arranged your loan, call {SITE.broker.givenName} on <a href={SITE.broker.phoneHref}>{SITE.broker.phone}</a>. We can explain the process, help you find the
          right contact at your lender and help you put your request together. We can&rsquo;t make the decision for the lender.
        </p>
      </section>

      <section id="free-help">
        <h2>Free, independent help</h2>
        <ul>
          <li>
            National Debt Helpline: free financial counselling on <a href="tel:1800007007">1800 007 007</a> or{" "}
            <a href="https://ndh.org.au/" target="_blank" rel="noopener noreferrer">
              ndh.org.au
            </a>
          </li>
          <li>
            Moneysmart (ASIC):{" "}
            <a href="https://moneysmart.gov.au/" target="_blank" rel="noopener noreferrer">
              moneysmart.gov.au
            </a>
          </li>
        </ul>
      </section>

      <section id="afca">
        <h2>If your lender says no</h2>
        <p>
          If your lender refuses your request or you disagree with its decision, you can complain to the lender, then to AFCA. See also our <Link href={PATHS.complaints}>complaints page</Link>.
        </p>
        <AfcaContact />
      </section>
    </LegalLayout>
  );
}
