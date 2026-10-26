import { CircleCheck, FilePenLine, Info, TriangleAlert } from "lucide-react";
import { cx } from "./cx";

type Tone = "note" | "warning" | "draft" | "answer" | "tip";

const ICONS = { note: Info, warning: TriangleAlert, draft: FilePenLine, tip: CircleCheck } as const;

/**
 * Boxed aside inside content.
 * - note: neutral information (gold left rule)
 * - warning: something that can cost the reader money or time
 * - draft: "Draft — to be replaced with licensee-approved text" (legal pages)
 * - answer: the "quick answer" box at the top of a guide (no icon, ink rule)
 * - tip: practical suggestion
 */
export function Callout({ tone = "note", title, children, className, id }: { tone?: Tone; title?: React.ReactNode; children: React.ReactNode; className?: string; id?: string }) {
  const Icon = tone === "answer" ? null : ICONS[tone];
  return (
    <aside id={id} className={cx("mw-callout", tone !== "note" && tone !== "tip" && `mw-callout--${tone}`, className)} role={tone === "warning" ? "note" : undefined}>
      {Icon && <Icon size={20} strokeWidth={1.5} aria-hidden="true" />}
      <div>
        {title && <p className="mw-callout__title">{title}</p>}
        <div className="mw-callout__body">{children}</div>
      </div>
    </aside>
  );
}
