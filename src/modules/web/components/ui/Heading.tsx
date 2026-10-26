import { cx } from "./cx";

type Level = 1 | 2 | 3 | 4;
type Size = "display" | "h1" | "h2" | "h3" | "h4";

const DEFAULT_SIZE: Record<Level, Size> = { 1: "h1", 2: "h2", 3: "h3", 4: "h4" };

/**
 * Semantic level and visual size are independent:
 * <Heading level={1} size="display">…</Heading> for the home hero,
 * <Heading level={2}>…</Heading> for section titles. Wrap a phrase in <em> for the italic accent.
 */
export function Heading({ level = 2, size, className, children, id }: { level?: Level; size?: Size; className?: string; children: React.ReactNode; id?: string }) {
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4";
  return (
    <Tag id={id} className={cx(`mw-${size ?? DEFAULT_SIZE[level]}`, className)}>
      {children}
    </Tag>
  );
}
