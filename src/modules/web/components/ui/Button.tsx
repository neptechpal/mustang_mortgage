import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "quiet";
export type ButtonSize = "sm" | "md" | "lg";

type Common = { variant?: ButtonVariant; size?: ButtonSize; block?: boolean; arrow?: boolean; icon?: React.ReactNode; className?: string; children: React.ReactNode };

function classes({ variant = "primary", size = "md", block, className }: Pick<Common, "variant" | "size" | "block" | "className">) {
  return cx("mw-btn", `mw-btn--${variant}`, size !== "md" && `mw-btn--${size}`, block && "mw-btn--block", className);
}

function Inner({ icon, arrow, children }: Pick<Common, "icon" | "arrow" | "children">) {
  return (
    <>
      {icon}
      <span>{children}</span>
      {arrow && <ArrowRight className="mw-arrow" size={18} strokeWidth={1.75} aria-hidden="true" />}
    </>
  );
}

/**
 * Button styles:
 * - primary: gold 600 with white text (one per view; the main action, usually booking)
 * - secondary: ink outline (intent choices, second actions)
 * - quiet: white surface with hairline border
 * On `.mw-tone-ink` sections primary becomes gold 300 with ink text automatically.
 */
export function Button({ type = "button", ...p }: Common & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  const { variant, size, block, arrow, icon, className, children, ...rest } = p;
  return (
    <button type={type} className={classes({ variant, size, block, className })} {...rest}>
      <Inner icon={icon} arrow={arrow}>
        {children}
      </Inner>
    </button>
  );
}

/** Same styles as <Button>, rendered as a link. Internal hrefs use next/link. */
export function LinkButton({ href, ...p }: Common & { href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "href">) {
  const { variant, size, block, arrow, icon, className, children, ...rest } = p;
  const cls = classes({ variant, size, block, className });
  const inner = (
    <Inner icon={icon} arrow={arrow}>
      {children}
    </Inner>
  );
  if (href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link href={href} className={cls} {...rest}>
        {inner}
      </Link>
    );
  }
  return (
    <a href={href} className={cls} {...rest}>
      {inner}
    </a>
  );
}

/** Inline text link in gold 600. `arrow` adds a trailing arrow that nudges on hover. External links open in the same tab unless `external`. */
export function TextLink({ href, children, arrow, external, className, ...rest }: { href: string; children: React.ReactNode; arrow?: boolean; external?: boolean; className?: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "children">) {
  const cls = cx("mw-link", arrow && "mw-link--arrow", className);
  const content = arrow ? (
    <>
      <span>{children}</span>
      <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
    </>
  ) : (
    children
  );
  if (!external && href.startsWith("/") && !href.startsWith("//")) {
    return (
      <Link href={href} className={cls} {...rest}>
        {content}
      </Link>
    );
  }
  return (
    <a href={href} className={cls} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...rest}>
      {content}
    </a>
  );
}
