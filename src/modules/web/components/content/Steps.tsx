import { cx } from "../ui/cx";

export type Step = { title: string; body: React.ReactNode; meta?: string[] };

/**
 * Numbered process with large serif numerals.
 * - list (default): vertical, hairline-separated; best in a split section
 * - row: four columns on desktop
 */
export function Steps({ items, variant = "list", headingLevel = 3, className }: { items: Step[]; variant?: "list" | "row"; headingLevel?: 3 | 4; className?: string }) {
  const H = `h${headingLevel}` as "h3" | "h4";
  return (
    <ol className={cx("mw-steps", variant === "row" && "mw-steps--row", className)}>
      {items.map((s, i) => (
        <li key={s.title}>
          <span className="mw-steps__num" aria-hidden="true">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div>
            <H className="mw-h3 mw-steps__title">
              <span className="mw-sr">Step {i + 1}: </span>
              {s.title}
            </H>
          </div>
          <div className="mw-steps__body">{s.body}</div>
          {s.meta?.length ? (
            <div className="mw-steps__meta">
              {s.meta.map((m) => (
                <span className="mw-tag" key={m}>
                  {m}
                </span>
              ))}
            </div>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
