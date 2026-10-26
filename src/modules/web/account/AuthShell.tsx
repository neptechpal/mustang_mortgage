import { FileLock2, ListChecks, Phone } from "lucide-react";
import { Container } from "../components/ui/Container";
import { Eyebrow } from "../components/ui/Eyebrow";
import { TextLink } from "../components/ui/Button";
import { PATHS, SITE } from "../config";
import "../styles/calc.css";
import "./account.css";

const icon = { size: 20, strokeWidth: 1.5, "aria-hidden": true } as const;

/** What a client account is for (shown beside the login/register forms). */
export const ACCOUNT_POINTS = [
  { icon: <FileLock2 {...icon} />, title: "Upload documents securely", body: "Payslips, bank statements, ID and visa documents go to us through the portal, not by email." },
  { icon: <ListChecks {...icon} />, title: "See what is still needed", body: "Your checklist shows what we have and what is outstanding for your application." },
  { icon: <Phone {...icon} />, title: "Talk to a person", body: `If you are locked out or stuck on a step, call ${SITE.broker.givenName} on ${SITE.broker.phone}.` },
];

/**
 * Two-column shell for the client account pages (/login, /register, /password-reset, /logout):
 * title + context on the left, the unchanged member form in a card on the right.
 */
export function AuthShell({
  eyebrow = "Client account",
  title,
  lede,
  children,
  aside = "points",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  children: React.ReactNode;
  /** "points" = what the account is for; "none" = no list; or custom content. */
  aside?: "points" | "none" | React.ReactNode;
}) {
  return (
    <section className="mw-section mw-acct" aria-labelledby="acct-title">
      <Container>
        <div className="mw-acct__grid">
          <div className="mw-acct__copy">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1 id="acct-title" className="mw-h1">
              {title}
            </h1>
            {lede && (typeof lede === "string" ? <p className="mw-lede">{lede}</p> : lede)}
            {aside === "points" ? (
              <ul className="mw-acct__points">
                {ACCOUNT_POINTS.map((p) => (
                  <li key={p.title}>
                    {p.icon}
                    <div>
                      <strong>{p.title}</strong>
                      <span>{p.body}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : aside === "none" ? null : (
              aside
            )}
          </div>
          <div className="mw-acct__card">{children}</div>
        </div>
      </Container>
    </section>
  );
}

/** Small "new client" note under the forms. */
export function NewClientNote() {
  return (
    <p className="mw-small mw-acct__note">
      New to Mustang Mortgage?{" "}
      <TextLink href={PATHS.book} arrow>
        Book a consultation
      </TextLink>
    </p>
  );
}
