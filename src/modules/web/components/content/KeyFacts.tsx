import { cx } from "../ui/cx";

export type KeyFact = { value: React.ReactNode; unit?: string; label: React.ReactNode; source?: React.ReactNode };

/**
 * Row of large serif figures. ONLY verifiable facts (from config or rules data with a source).
 * Never lender counts, loans settled or years unless SITE has the real value.
 */
export function KeyFacts({ items, className }: { items: KeyFact[]; className?: string }) {
  return (
    <dl className={cx("mw-facts", className)} style={{ ["--mw-facts-cols" as string]: String(Math.min(items.length, 4)) }}>
      {items.map((f, i) => (
        <div key={i}>
          <dd>
            {f.value}
            {f.unit && <small>{f.unit}</small>}
          </dd>
          <dt>
            {f.label}
            {f.source && <span className="mw-facts__source">{f.source}</span>}
          </dt>
        </div>
      ))}
    </dl>
  );
}

/** Alias: some pages call it a stat row. */
export const StatRow = KeyFacts;
