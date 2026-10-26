import Link from "next/link";
import { AfcaContact } from "@/modules/web/components/content/AfcaContact";
import { LegalLayout } from "@/modules/web/components/content/LegalLayout";
import { Placeholder } from "@/modules/web/components/ui/Fact";
import { LEGAL_PAGES_DRAFT, PATHS, SITE } from "@/modules/web/config";
import { buildMetadata } from "@/modules/web/seo";

export const metadata = buildMetadata({
  title: "Complaints",
  description: "How to make a complaint to Mustang Mortgage, how we handle it and how to contact the Australian Financial Complaints Authority (AFCA).",
  path: PATHS.complaints,
  noindex: LEGAL_PAGES_DRAFT,
});

const TOC = [
  { id: "tell-us", label: "Tell us first" },
  { id: "what-happens", label: "What happens next" },
  { id: "afca", label: "If you are not satisfied" },
  { id: "help", label: "Getting help to complain" },
];

export default function ComplaintsPage() {
  return (
    <LegalLayout
      title="Complaints"
      slug="complaints"
      lastUpdated="2026-10-26"
      lede="If something has gone wrong, we want to hear about it and put it right. Making a complaint is free."
      toc={TOC}
    >
      <section id="tell-us">
        <h2>Tell us first</h2>
        <p>You can complain in whatever way suits you:</p>
        <ul>
          <li>
            phone {SITE.broker.name} on <a href={SITE.broker.phoneHref}>{SITE.broker.phone}</a>
          </li>
          <li>
            email <a href={`mailto:${SITE.contact.email}`}>{SITE.contact.email}</a>
          </li>
          <li>
            write to us at <Placeholder label="Postal address for complaints" />
          </li>
        </ul>
        <p>
          Tell us what happened, what you would like us to do, and any documents that help explain it. You can also contact our licensee directly:{" "}
          <Placeholder label="Licensee complaints officer contact" />.
        </p>
      </section>

      <section id="what-happens">
        <h2>What happens next</h2>
        <ul>
          <li>We acknowledge your complaint within one business day, or as soon as practicable.</li>
          <li>We look into it, and may ask you for more information.</li>
          <li>We give you a written response with our decision and the reasons for it, within 30 calendar days.</li>
          <li>If we need longer, we tell you why, and remind you that you can go to AFCA.</li>
        </ul>
        <p>
          These timeframes follow ASIC&rsquo;s internal dispute resolution standards in{" "}
          <a href="https://asic.gov.au/regulatory-resources/find-a-document/regulatory-guides/rg-271-internal-dispute-resolution/" target="_blank" rel="noopener noreferrer">
            Regulatory Guide 271
          </a>
          . Different timeframes apply to some complaints, such as those about financial hardship.
        </p>
      </section>

      <section id="afca">
        <h2>If you are not satisfied</h2>
        <p>
          If you are not happy with our response, or we haven&rsquo;t responded within 30 days, you can complain to the Australian Financial Complaints Authority (AFCA). AFCA is
          free and independent, and its decisions are binding on us if you accept them.
        </p>
        <AfcaContact />
        <p>Time limits may apply to complaints to AFCA, so act promptly or check with AFCA.</p>
      </section>

      <section id="help">
        <h2>Getting help to complain</h2>
        <p>
          If you need an interpreter, call the Translating and Interpreting Service (TIS National) on 131 450 and ask them to call us. If you are having trouble with
          repayments, see <Link href={PATHS.hardship}>Financial hardship</Link>.
        </p>
      </section>
    </LegalLayout>
  );
}
