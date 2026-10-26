import { Container } from "./Container";
import { Eyebrow } from "./Eyebrow";
import { Heading } from "./Heading";
import { cx } from "./cx";

export type Tone = "paper" | "sand" | "white" | "ink";

type HeaderProps = {
  /** Serif section number shown before the eyebrow, e.g. "02". */
  index?: string;
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  titleLevel?: 2 | 3;
  titleId?: string;
  lede?: React.ReactNode;
  /** Link or button row under the lede. */
  action?: React.ReactNode;
};

/** Eyebrow + H2 + lede block. Used by <Section>, also usable on its own. */
export function SectionHeader({ index, eyebrow, title, titleLevel = 2, titleId, lede, action, className }: HeaderProps & { className?: string }) {
  if (!eyebrow && !title && !lede) return null;
  return (
    <header className={cx("mw-sechead", className)}>
      {eyebrow && <Eyebrow index={index}>{eyebrow}</Eyebrow>}
      {title && (
        <Heading level={titleLevel} id={titleId}>
          {title}
        </Heading>
      )}
      {lede && (typeof lede === "string" ? <p className="mw-lede">{lede}</p> : lede)}
      {action && <div className="mw-sechead__action">{action}</div>}
    </header>
  );
}

type SectionProps = HeaderProps & {
  id?: string;
  tone?: Tone;
  /** "stack": header above content. "split": header left (sticky on desktop), content right. */
  layout?: "stack" | "split" | "split-even";
  size?: "default" | "tight";
  width?: "default" | "wide" | "narrow";
  flushTop?: boolean;
  className?: string;
  children?: React.ReactNode;
  "aria-label"?: string;
};

/**
 * Page section with vertical rhythm (96–120px desktop, 56px mobile) and a tone:
 * paper (default page bg), sand (warm alternate), white, ink (dark, max one per page).
 */
export function Section({ id, tone = "paper", layout = "stack", size = "default", width = "default", flushTop, className, children, index, eyebrow, title, titleLevel, lede, action, ...aria }: SectionProps) {
  const titleId = id && title ? `${id}-title` : undefined;
  const header = <SectionHeader index={index} eyebrow={eyebrow} title={title} titleLevel={titleLevel} titleId={titleId} lede={lede} action={action} />;
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      aria-label={aria["aria-label"]}
      className={cx("mw-section", `mw-tone-${tone}`, size === "tight" && "mw-section--tight", flushTop && "mw-section--flush-top", className)}
    >
      <Container width={width}>
        {layout === "stack" ? (
          <>
            {header}
            {children}
          </>
        ) : (
          <div className={cx("mw-split", layout === "split-even" && "mw-split--even")}>
            {header}
            <div>{children}</div>
          </div>
        )}
      </Container>
    </section>
  );
}
