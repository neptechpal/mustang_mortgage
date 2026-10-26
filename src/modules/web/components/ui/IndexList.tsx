import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cx } from "./cx";

export type IndexItem = {
  href: string;
  title: string;
  description?: React.ReactNode;
  /** Small line under the description (tabular figures), e.g. "1 crore = 100 lakh". */
  meta?: React.ReactNode;
  /** Left mark: a number ("01") or an icon element. Omit with `numbered` to auto-number. */
  mark?: React.ReactNode;
};

/**
 * Editorial list of links separated by hairlines: the alternative to icon-card grids.
 * Use for "start with your situation", related guides, tools, next steps.
 */
export function IndexList({ items, columns = 1, numbered, titleAs = "span", className }: { items: IndexItem[]; columns?: 1 | 2; numbered?: boolean; titleAs?: "span" | "h3"; className?: string }) {
  const Title = titleAs;
  const noMark = !numbered && items.every((i) => i.mark == null);
  return (
    <ul className={cx("mw-index", columns === 2 && "mw-index--2", noMark && "mw-index--nomark", className)}>
      {items.map((it, i) => {
        const mark = it.mark ?? (numbered ? String(i + 1).padStart(2, "0") : null);
        return (
          <li key={it.href + it.title}>
            <Link href={it.href} className="mw-index__link">
              <span className="mw-index__mark" aria-hidden="true">
                {mark}
              </span>
              <Title className="mw-index__title">{it.title}</Title>
              <span className="mw-index__arrow" aria-hidden="true">
                <ArrowRight size={18} strokeWidth={1.5} />
              </span>
              {it.description && <span className="mw-index__desc">{it.description}</span>}
              {it.meta && <span className="mw-index__meta">{it.meta}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
