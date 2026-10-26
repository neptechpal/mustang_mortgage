/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { FOOTER_GROUPS, LEGAL_LINKS, SITE } from "../../config";
import { consultationHoursSentence, consultationModes } from "../../format";
import { LicenceStatement } from "../content/LicenceStatement";
import { Container } from "../ui/Container";

/** Footer: contact + hours, link groups, full licence block, service area, acknowledgement of country, compliance links. */
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mw-footer">
      <Container>
        <div className="mw-footer__top">
          <div>
            <div className="mw-footer__brand">
              <img src={SITE.logo.badge} alt="" width={52} height={52} />
              <div>
                <div className="mw-footer__name">{SITE.name}</div>
                <div style={{ fontSize: "0.875rem", marginTop: 4 }}>Mortgage broker · {SITE.broker.name}</div>
              </div>
            </div>
            <a href={SITE.broker.phoneHref} className="mw-footer__phone">
              {SITE.broker.phone}
            </a>
            <p style={{ margin: "6px 0 0" }}>
              <a href={`mailto:${SITE.contact.email}`}>{SITE.contact.email}</a>
            </p>
            <p style={{ margin: "18px 0 0", maxWidth: "38ch" }}>
              Consultations {SITE.hours.days.toLowerCase()}, {consultationHoursSentence()} ({SITE.hours.zoneLabel}), by {consultationModes()}.
            </p>
          </div>
          <nav className="mw-footer__cols" aria-label="Footer">
            {FOOTER_GROUPS.map((g) => (
              <div key={g.title}>
                <h2 className="mw-footer__title">{g.title}</h2>
                <ul className="mw-footer__list">
                  {g.links.map((l) => (
                    <li key={l.href + l.label}>
                      <Link href={l.href}>{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mw-footer__mid">
          <div className="mw-footer__licence">
            <h2 className="mw-footer__title">Licence and disclosure</h2>
            <LicenceStatement />
            <p style={{ color: "var(--mw-on-ink-2)" }}>
              The information on this website is general information only and does not take into account your objectives, financial situation or needs. It is not legal,
              tax or financial advice. We do not publish interest rates. All loans are subject to lender eligibility criteria, terms and conditions, fees and charges.
            </p>
          </div>
          <dl className="mw-footer__meta">
            <div>
              <dt>Service area</dt>
              <dd>{SITE.serviceArea.short}</dd>
            </div>
            <div>
              <dt>Complaints</dt>
              <dd>
                Contact us first. If we can&rsquo;t resolve it, you can go to the Australian Financial Complaints Authority (AFCA), a free, independent service.{" "}
                <Link href="/legal/complaints">How to complain</Link>
              </dd>
            </div>
          </dl>
        </div>

        <div className="mw-footer__mid" style={{ paddingTop: 28, paddingBottom: 28 }}>
          <p className="mw-footer__ack" style={{ margin: 0 }}>
            <span className="mw-footer__ack-mark" aria-hidden="true" />
            <span>{SITE.acknowledgementOfCountry}</span>
          </p>
        </div>

        <div className="mw-footer__bottom">
          <ul className="mw-footer__legal">
            {LEGAL_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href}>{l.label}</Link>
              </li>
            ))}
          </ul>
          <span>
            &copy; {year} {SITE.name}
          </span>
        </div>
      </Container>
    </footer>
  );
}
