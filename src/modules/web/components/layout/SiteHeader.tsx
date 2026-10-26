/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Phone } from "lucide-react";
import { HEADER_ACTIONS, NAV, SITE } from "../../config";
import { LinkButton } from "../ui/Button";
import { Container } from "../ui/Container";
import { HeaderNav } from "./HeaderNav";
import { MobileMenu } from "./MobileMenu";

/** Sticky site header: badge + wordmark, desktop dropdown nav, phone, client login, booking CTA, mobile sheet. */
export function SiteHeader() {
  return (
    <header className="mw-header">
      <Container className="mw-header__bar">
        <Link href="/" className="mw-brand" aria-label={`${SITE.name}, home`}>
          <img src={SITE.logo.badge} alt="" width={40} height={40} />
          <span>
            <span className="mw-brand__name">{SITE.name}</span>
          </span>
        </Link>
        <HeaderNav groups={NAV} />
        <div className="mw-header__actions">
          <a href={SITE.broker.phoneHref} className="mw-header__phone" aria-label={`Call ${SITE.broker.name} on ${SITE.broker.phone}`}>
            <Phone size={18} strokeWidth={1.5} aria-hidden="true" />
            <span className="mw-header__phone-text">{SITE.broker.phone}</span>
          </a>
          <Link href={HEADER_ACTIONS.login.href} className="mw-header__login">
            {HEADER_ACTIONS.login.label}
          </Link>
          <LinkButton href={HEADER_ACTIONS.book.href} size="sm" className="mw-header__book">
            {HEADER_ACTIONS.book.label}
          </LinkButton>
          <MobileMenu groups={NAV} phone={SITE.broker.phone} phoneHref={SITE.broker.phoneHref} book={HEADER_ACTIONS.book} login={HEADER_ACTIONS.login} />
        </div>
      </Container>
    </header>
  );
}
