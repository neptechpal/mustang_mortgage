import { cx } from "../ui/cx";

export type Point = { title: string; body: React.ReactNode };

/**
 * Hairline-topped columns of short titled points (2 or 3 per row on desktop).
 * Use for "what lenders look at", principles, documents. Not for decorative icon grids.
 */
export function PointGrid({ items, columns = 2, headingLevel = 3, className }: { items: Point[]; columns?: 2 | 3; headingLevel?: 3 | 4; className?: string }) {
  const H = `h${headingLevel}` as "h3" | "h4";
  return (
    <ul className={cx("mw-points", columns === 3 && "mw-points--3", className)}>
      {items.map((p) => (
        <li key={p.title}>
          <H className="mw-points__title">{p.title}</H>
          <div className="mw-points__body">{p.body}</div>
        </li>
      ))}
    </ul>
  );
}
