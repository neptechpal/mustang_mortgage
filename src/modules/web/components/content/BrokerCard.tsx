/* eslint-disable @next/next/no-img-element */
import { Phone } from "lucide-react";
import { HEADER_ACTIONS, PATHS, SITE, confirmedLanguages } from "../../config";
import { LinkButton, TextLink } from "../ui/Button";
import { Eyebrow } from "../ui/Eyebrow";
import { Fact } from "../ui/Fact";
import { Heading } from "../ui/Heading";
import { Seal } from "../ui/Seal";

function Portrait({ size }: { size: "lg" | "sm" }) {
  const p = SITE.broker.photo;
  if (p) return <img src={p.src} alt={p.alt} width={p.width} height={p.height} loading="lazy" />;
  return <Seal center="monogram" text={size === "lg" ? "Sulav Adhikari · Mortgage broker · Mustang Mortgage · " : "Sulav Adhikari · Mortgage broker · "} />;
}

export const DEFAULT_BROKER_BIO = [
  "Sulav Adhikari is the mortgage broker behind Mustang Mortgage. Sulav runs your first consultation, works through the numbers with you and manages the application with the lender through to settlement.",
  "Many of Sulav's clients are skilled visa holders and new permanent residents buying their first home in Australia. Those applications need extra care: which lenders accept the visa, how savings and income from overseas are treated, and whether FIRB approval or extra duty applies.",
];

/**
 * The broker, with a booking button.
 * - feature: portrait (monogram seal until SITE.broker.photo is set), bio, credentials, actions
 * - compact: small card for article rails and sidebars
 */
export function BrokerCard({
  variant = "feature",
  eyebrow = "Your broker",
  bio = DEFAULT_BROKER_BIO,
  headingLevel = 2,
  showProfileLink = true,
  compactText = "Talk your situation through before you apply. Consultations run 60 minutes by phone or video.",
}: {
  variant?: "feature" | "compact";
  eyebrow?: string;
  bio?: React.ReactNode[];
  headingLevel?: 2 | 3;
  showProfileLink?: boolean;
  compactText?: string;
}) {
  const langs = confirmedLanguages()
    .map((l) => l.label)
    .join(", ");
  if (variant === "compact") {
    return (
      <aside className="mw-brokermini" aria-label={`Talk to ${SITE.broker.name}`}>
        <div className="mw-brokermini__head">
          <div className="mw-brokermini__seal">
            <Portrait size="sm" />
          </div>
          <div>
            <p className="mw-brokermini__name">{SITE.broker.name}</p>
            <p className="mw-brokermini__role">
              {SITE.broker.role}, {SITE.name}
            </p>
          </div>
        </div>
        <p>{compactText}</p>
        <LinkButton href={HEADER_ACTIONS.book.href} arrow>
          {HEADER_ACTIONS.book.label}
        </LinkButton>
        <span className="mw-brokermini__call">
          or call <a href={SITE.broker.phoneHref}>{SITE.broker.phone}</a>
        </span>
      </aside>
    );
  }
  return (
    <div className="mw-broker">
      <div className="mw-broker__portrait">
        <Portrait size="lg" />
      </div>
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <Heading level={headingLevel} className="mw-broker__name">
          {SITE.broker.name}
        </Heading>
        <p className="mw-broker__role">
          {SITE.broker.role}, {SITE.name}
        </p>
        <div className="mw-broker__bio">
          {bio.map((b, i) => (
            <p key={i}>{b}</p>
          ))}
        </div>
        <dl className="mw-creds">
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
            <dt>Consults in</dt>
            <dd>{langs}</dd>
          </div>
        </dl>
        <div className="mw-btnrow">
          <LinkButton href={HEADER_ACTIONS.book.href} arrow>
            Book with {SITE.broker.givenName}
          </LinkButton>
          <LinkButton href={SITE.broker.phoneHref} variant="secondary" icon={<Phone size={18} strokeWidth={1.5} aria-hidden="true" />}>
            <span className="mw-num">{SITE.broker.phone}</span>
          </LinkButton>
          {showProfileLink && (
            <TextLink href={PATHS.broker} arrow>
              Full profile
            </TextLink>
          )}
        </div>
      </div>
    </div>
  );
}
