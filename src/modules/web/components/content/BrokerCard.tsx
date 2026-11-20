import { HEADER_ACTIONS, SITE } from "../../config";
import { LinkButton } from "../ui/Button";
import { Seal } from "../ui/Seal";

/** "Talk to our team" card with a booking button, used in article sidebars. Speaks as the company. */
export function BrokerCard({
  compactText = "Talk your situation through before you apply. Consultations run 60 minutes by phone or video.",
}: {
  variant?: "feature" | "compact";
  eyebrow?: string;
  bio?: React.ReactNode[];
  headingLevel?: 2 | 3;
  showProfileLink?: boolean;
  compactText?: string;
}) {
  return (
    <aside className="mw-brokermini" aria-label={`Talk to ${SITE.name}`}>
      <div className="mw-brokermini__head">
        <div className="mw-brokermini__seal">
          <Seal center="monogram" text={`${SITE.name} · Mortgage broker · `} />
        </div>
        <div>
          <p className="mw-brokermini__name">{SITE.name}</p>
          <p className="mw-brokermini__role">{SITE.broker.role}</p>
        </div>
      </div>
      <p>{compactText}</p>
      <LinkButton href={HEADER_ACTIONS.book.href} arrow>
        {HEADER_ACTIONS.book.label}
      </LinkButton>
    </aside>
  );
}

export const DEFAULT_BROKER_BIO: string[] = [];
