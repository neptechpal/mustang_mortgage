import { Clock, Lock, Mail, MapPin, Phone } from "lucide-react";
import { PageIntro } from "@/modules/web/components/content/PageIntro";
import { EnquiryForm } from "@/modules/web/components/forms/EnquiryForm";
import { LinkButton, TextLink } from "@/modules/web/components/ui/Button";
import { Container } from "@/modules/web/components/ui/Container";
import { PATHS, SITE } from "@/modules/web/config";
import { consultationHoursSentence, consultationModes } from "@/modules/web/format";
import { JsonLd, buildMetadata, webPageJsonLd } from "@/modules/web/seo";

const TITLE = "Contact Mustang Mortgage";
const DESCRIPTION = `Call Sulav Adhikari on ${SITE.broker.phone}, email ${SITE.contact.email} or send an enquiry. We reply within 1 business day.`;

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATHS.contact });

const ic = { size: 20, strokeWidth: 1.5, "aria-hidden": true } as const;

export default function ContactPage() {
  return (
    <>
      <JsonLd data={webPageJsonLd({ path: PATHS.contact, name: TITLE, description: DESCRIPTION, type: "ContactPage" })} />
      <PageIntro
        crumbs={[{ name: "Contact", path: PATHS.contact }]}
        eyebrow="Contact"
        title="Talk to Sulav"
        lede={`Call, email or send an enquiry and we will reply ${SITE.responsePromise}. If you already know you want to talk it through, book a ${SITE.consultation.minutes}-minute consultation.`}
        actions={
          <LinkButton href={PATHS.book} arrow>
            Book a consultation
          </LinkButton>
        }
      />
      <section className="mw-section" aria-label="Enquiry form and contact details">
        <Container>
          <div className="mw-split mw-split--form">
            <div className="mw-card" style={{ padding: "clamp(22px, 4vw, 40px)" }}>
              <h2 className="mw-h3">Send an enquiry</h2>
              <p className="mw-small" style={{ marginTop: 8, marginBottom: 28 }}>
                A few details are enough. We will call you to talk through the rest.
              </p>
              <EnquiryForm sourcePage={PATHS.contact} />
            </div>
            <div>
              <dl className="mw-contactlist">
                <div>
                  <Phone {...ic} />
                  <dt>Phone</dt>
                  <dd className="mw-contactlist__big">
                    <a href={SITE.broker.phoneHref}>{SITE.broker.phone}</a>
                  </dd>
                </div>
                <div>
                  <Mail {...ic} />
                  <dt>Email</dt>
                  <dd>
                    <a href={`mailto:${SITE.contact.email}`}>{SITE.contact.email}</a>
                    <br />
                    <a href={`mailto:${SITE.broker.email}`}>{SITE.broker.email}</a>
                  </dd>
                </div>
                <div>
                  <Clock {...ic} />
                  <dt>Consultation hours</dt>
                  <dd>
                    {SITE.hours.days}, {consultationHoursSentence()} ({SITE.hours.zoneLabel}), by {consultationModes()}.
                  </dd>
                </div>
                <div>
                  <MapPin {...ic} />
                  <dt>Where we work</dt>
                  <dd>{SITE.serviceArea.long}</dd>
                </div>
                <div>
                  <Lock {...ic} />
                  <dt>Existing clients</dt>
                  <dd>
                    Use the secure link we sent you to upload documents, or <TextLink href={PATHS.login}>log in to your account</TextLink>. Please don&rsquo;t email ID or bank
                    statements.
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
