import { Phone } from "lucide-react";
import { HEADER_ACTIONS, SITE } from "../../config";
import { LinkButton } from "../ui/Button";
import { Container } from "../ui/Container";
import { Heading } from "../ui/Heading";
import { Seal } from "../ui/Seal";
import { cx } from "../ui/cx";

/**
 * Closing call to action (before the footer). Defaults: book a consultation + call Sulav.
 * Rendered as its own section; set `bare` to drop the section wrapper (e.g. inside an article).
 */
export function CtaBand({
  title = "Book a 60-minute consultation with Sulav",
  body = `Morning, midday and evening times, 7 days a week. We reply to enquiries ${SITE.responsePromise}.`,
  primary = HEADER_ACTIONS.book,
  showPhone = true,
  tone = "white",
  bare,
  headingLevel = 2,
}: {
  title?: React.ReactNode;
  body?: React.ReactNode;
  primary?: { label: string; href: string };
  showPhone?: boolean;
  tone?: "white" | "ink";
  bare?: boolean;
  headingLevel?: 2 | 3;
}) {
  const band = (
    <div className={cx("mw-ctaband", tone === "ink" && "mw-ctaband--ink mw-tone-ink")}>
      <div className="mw-ctaband__body">
        <Heading level={headingLevel} size="h2">
          {title}
        </Heading>
        {typeof body === "string" ? <p className="mw-lede">{body}</p> : body}
        <div className="mw-btnrow">
          <LinkButton href={primary.href} size="lg" arrow>
            {primary.label}
          </LinkButton>
          {showPhone && (
            <LinkButton href={SITE.broker.phoneHref} variant="secondary" size="lg" icon={<Phone size={18} strokeWidth={1.5} aria-hidden="true" />}>
              <span className="mw-num">{SITE.broker.phone}</span>
            </LinkButton>
          )}
        </div>
      </div>
      <div className="mw-ctaband__seal">
        <Seal center="badge" />
      </div>
    </div>
  );
  if (bare) return band;
  return (
    <section className="mw-section mw-section--tight" aria-label="Book a consultation">
      <Container>{band}</Container>
    </section>
  );
}
