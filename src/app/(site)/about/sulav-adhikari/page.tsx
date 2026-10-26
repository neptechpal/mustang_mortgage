import { Mail, MapPin, Phone } from "lucide-react";
import { DEFAULT_BROKER_BIO } from "@/modules/web/components/content/BrokerCard";
import { ConsultationCard } from "@/modules/web/components/content/ConsultationCard";
import { CtaBand } from "@/modules/web/components/content/CtaBand";
import { LicenceStatement } from "@/modules/web/components/content/LicenceStatement";
import { PageIntro } from "@/modules/web/components/content/PageIntro";
import { SITUATIONS } from "@/modules/web/components/content/SituationSelector";
import { TextLink } from "@/modules/web/components/ui/Button";
import { Fact, Placeholder } from "@/modules/web/components/ui/Fact";
import { IndexList } from "@/modules/web/components/ui/IndexList";
import { Seal } from "@/modules/web/components/ui/Seal";
import { Section } from "@/modules/web/components/ui/Section";
import { PATHS, SITE, confirmedLanguages } from "@/modules/web/config";
import { BROKER_ID, JsonLd, absoluteUrl, buildMetadata } from "@/modules/web/seo";

const TITLE = "Sulav Adhikari, mortgage broker";
const DESCRIPTION =
  "Sulav Adhikari runs Mustang Mortgage, a NSW mortgage broking business, and helps first home buyers, skilled visa holders and new permanent residents get a home loan.";

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATHS.broker, ogType: "profile" });

/* eslint-disable @next/next/no-img-element */
export default function BrokerProfilePage() {
  const langs = confirmedLanguages().map((l) => l.label).join(", ");
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          "@id": `${absoluteUrl(PATHS.broker)}#webpage`,
          url: absoluteUrl(PATHS.broker),
          name: TITLE,
          description: DESCRIPTION,
          mainEntity: { "@id": BROKER_ID },
        }}
      />
      <PageIntro
        crumbs={[
          { name: "About", path: PATHS.about },
          { name: SITE.broker.name, path: PATHS.broker },
        ]}
        eyebrow={`${SITE.broker.role}, ${SITE.name}`}
        title={SITE.broker.name}
        lede="Sulav runs Mustang Mortgage, meets you at the first consultation, works through the numbers with you and manages your application with the lender through to settlement."
        aside={<ConsultationCard title={`Book ${SITE.consultation.minutes} minutes with ${SITE.broker.givenName}`} />}
        media={
          SITE.broker.photo ? (
            <img src={SITE.broker.photo.src} alt={SITE.broker.photo.alt} width={SITE.broker.photo.width} height={SITE.broker.photo.height} />
          ) : (
            <Seal center="monogram" text="Sulav Adhikari · Mortgage broker · " />
          )
        }
      />

      <Section id="about-sulav" layout="split" eyebrow="About Sulav" title="Who you will be working with">
        <div className="mw-stack" style={{ ["--mw-stack" as string]: "18px" }}>
          {DEFAULT_BROKER_BIO.map((p, i) => (
            <p className="mw-body" key={i}>
              {p}
            </p>
          ))}
          <p className="mw-body">
            <Placeholder label="Sulav's background: how Sulav came to broking, years broking and the kinds of clients Sulav works with most (to be written with Sulav)" />
          </p>
        </div>
      </Section>

      <Section id="credentials" tone="white" layout="split" eyebrow="Qualifications and licensing" title="Credentials" lede="Every Australian mortgage broker must be licensed, or authorised by a licensee, to arrange credit.">
        <dl className="mw-creds" style={{ marginTop: 0 }}>
          <div>
            <dt>Qualifications</dt>
            <dd>
              <Fact path="broker.qualifications" />
            </dd>
          </div>
          <div>
            <dt>Industry membership</dt>
            <dd>
              <Fact path="broker.memberships" />
            </dd>
          </div>
          <div>
            <dt>Credit Representative number</dt>
            <dd>
              <Fact path="licence.creditRepresentativeNumber" />
            </dd>
          </div>
          <div>
            <dt>Licensee</dt>
            <dd>
              <Fact path="licence.licenseeName" />, Australian Credit Licence <Fact path="licence.licenseeAcl" />
            </dd>
          </div>
          <div>
            <dt>External dispute resolution</dt>
            <dd>
              Australian Financial Complaints Authority (AFCA), member number <Fact path="licence.afcaMemberNumber" />
            </dd>
          </div>
          <div>
            <dt>Consults in</dt>
            <dd>{langs}</dd>
          </div>
        </dl>
        <LicenceStatement className="mw-small" />
        <p className="mw-small" style={{ marginTop: 8 }}>
          You can check a credit representative on{" "}
          <a className="mw-link" href="https://www.asic.gov.au/online-services/search-asic-registers/" target="_blank" rel="noopener noreferrer">
            ASIC&rsquo;s registers
          </a>{" "}
          once the number above is published.
        </p>
      </Section>

      <Section id="works-on" layout="split" eyebrow="Services" title="What Sulav helps with" lede="Each links to a page that explains what lenders look at and what it costs.">
        <IndexList items={SITUATIONS.map((s) => ({ href: s.href, title: s.label, description: s.description }))} />
      </Section>

      <Section id="contact-sulav" tone="white" layout="split-even" eyebrow="Contact" title={`Talk to ${SITE.broker.givenName}`}>
        <dl className="mw-contactlist">
          <div>
            <Phone size={20} strokeWidth={1.5} aria-hidden="true" />
            <dt>Phone</dt>
            <dd className="mw-contactlist__big">
              <a href={SITE.broker.phoneHref}>{SITE.broker.phone}</a>
            </dd>
          </div>
          <div>
            <Mail size={20} strokeWidth={1.5} aria-hidden="true" />
            <dt>Email</dt>
            <dd>
              <a href={`mailto:${SITE.broker.email}`}>{SITE.broker.email}</a>
            </dd>
          </div>
          <div>
            <MapPin size={20} strokeWidth={1.5} aria-hidden="true" />
            <dt>Where</dt>
            <dd>{SITE.serviceArea.short}</dd>
          </div>
        </dl>
        <p className="mw-small" style={{ marginTop: 20 }}>
          Prefer to write it down first? <TextLink href={PATHS.contact}>Send an enquiry</TextLink>.
        </p>
      </Section>

      <CtaBand />
    </>
  );
}
