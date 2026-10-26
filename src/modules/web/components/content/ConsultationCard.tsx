import { HEADER_ACTIONS, SITE } from "../../config";
import { consultationHours, consultationModes } from "../../format";
import { LinkButton } from "../ui/Button";
import { Eyebrow } from "../ui/Eyebrow";

/**
 * Booking card with the real consultation hours from config (Sydney time).
 * Used in the home hero, contact page and broker profile.
 */
export function ConsultationCard({ title = `${SITE.consultation.minutes} minutes with ${SITE.broker.givenName}`, headingLevel = 2 }: { title?: string; headingLevel?: 2 | 3 }) {
  const H = `h${headingLevel}` as "h2" | "h3";
  return (
    <aside className="mw-consult" aria-label="Book a consultation">
      <div className="mw-consult__head">
        <div>
          <Eyebrow>Mortgage consultation</Eyebrow>
          <H className="mw-consult__title">{title}</H>
        </div>
      </div>
      <ul className="mw-consult__times">
        <li>
          <span>Available</span>
          <span>{SITE.hours.days}</span>
        </li>
        {consultationHours().map((h) => (
          <li key={h.range}>
            <span>{h.label}</span>
            <span>{h.range}</span>
          </li>
        ))}
      </ul>
      <p className="mw-consult__note">
        By {consultationModes()}. {SITE.hours.zoneLabel}. Book at least {SITE.consultation.minNoticeHours} hours ahead.
      </p>
      <LinkButton href={HEADER_ACTIONS.book.href} block size="lg" arrow>
        {HEADER_ACTIONS.book.label}
      </LinkButton>
      <p className="mw-consult__call">
        Prefer to talk first? Call <a href={SITE.broker.phoneHref}>{SITE.broker.phone}</a>
      </p>
    </aside>
  );
}
