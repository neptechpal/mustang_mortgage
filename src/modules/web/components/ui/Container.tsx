import { cx } from "./cx";

type Props = React.HTMLAttributes<HTMLDivElement> & { width?: "default" | "wide" | "narrow"; as?: "div" | "section" | "header" | "footer" };

/** Max-width wrapper with responsive side gutters (16px on phones, up to 40px). */
export function Container({ width = "default", as: Tag = "div", className, ...rest }: Props) {
  return <Tag className={cx("mw-container", width === "wide" && "mw-container--wide", width === "narrow" && "mw-container--narrow", className)} {...rest} />;
}
