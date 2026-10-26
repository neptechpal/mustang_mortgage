import { cx } from "../ui/cx";

/**
 * Typographic styles for long-form content (h2/h3, lists with gold dashes, tables, blockquotes, links).
 * Keeps a 68ch measure. Put <Callout>, <WorkedExampleTable>, <Disclaimer> inside freely.
 */
export function Prose({ children, className, as: Tag = "div", id }: { children: React.ReactNode; className?: string; as?: "div" | "article" | "section"; id?: string }) {
  return (
    <Tag id={id} className={cx("mw-prose", className)}>
      {children}
    </Tag>
  );
}
