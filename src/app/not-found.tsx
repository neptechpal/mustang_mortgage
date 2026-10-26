import type { Metadata } from "next";
import { WebChrome } from "@/modules/web/components/layout/WebChrome";
import { Container } from "@/modules/web/components/ui/Container";
import { LinkButton, TextLink } from "@/modules/web/components/ui/Button";
import { IndexList } from "@/modules/web/components/ui/IndexList";
import { PATHS, SITE } from "@/modules/web/config";

export const metadata: Metadata = { title: { absolute: `Page not found | ${SITE.name}` }, robots: { index: false, follow: true } };

/** 404 inside the public chrome. */
export default function NotFound() {
  return (
    <WebChrome>
      <section className="mw-404">
        <Container>
          <div className="mw-split">
            <div className="mw-sechead">
              <div className="mw-404__code" aria-hidden="true">
                404
              </div>
              <h1 className="mw-h1" style={{ marginTop: 24 }}>
                We can&rsquo;t find that page
              </h1>
              <p className="mw-lede">
                It may have moved when we rebuilt the website. Try one of these, or call {SITE.broker.givenName} on{" "}
                <a className="mw-link mw-num" href={SITE.broker.phoneHref}>
                  {SITE.broker.phone}
                </a>
                .
              </p>
              <div className="mw-btnrow" style={{ marginTop: 28 }}>
                <LinkButton href="/" variant="secondary">
                  Go to the home page
                </LinkButton>
                <TextLink href={PATHS.contact} arrow>
                  Contact us
                </TextLink>
              </div>
            </div>
            <IndexList
              items={[
                { href: PATHS.book, title: "Book a consultation", description: `${SITE.consultation.minutes} minutes with ${SITE.broker.name}, 7 days a week.` },
                { href: PATHS.homeLoans, title: "Home loans", description: "First home, refinancing, investment and construction loans." },
                { href: PATHS.visaHomeLoans, title: "Visa and PR home loans", description: "Buying on a skilled visa or as a new permanent resident." },
                { href: PATHS.calculators, title: "Calculators", description: "Borrowing power, repayments, stamp duty and the NPR converter." },
                { href: PATHS.login, title: "Client login", description: "Your account and secure documents." },
              ]}
            />
          </div>
        </Container>
      </section>
    </WebChrome>
  );
}
