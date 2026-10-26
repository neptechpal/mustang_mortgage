import { cx } from "./cx";

/** Small uppercase label above a heading. `index` renders a serif section number ("02") with a gold rule. */
export function Eyebrow({ children, index, className, as: Tag = "p" }: { children: React.ReactNode; index?: string; className?: string; as?: "p" | "span" | "div" }) {
  return (
    <Tag className={cx("mw-eyebrow", className)}>
      {index && (
        <>
          <span className="mw-eyebrow__index">{index}</span>
          <span className="mw-eyebrow__rule" aria-hidden="true" />
        </>
      )}
      <span>{children}</span>
    </Tag>
  );
}
