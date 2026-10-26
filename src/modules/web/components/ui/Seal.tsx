import { useId } from "react";
import { SITE } from "../../config";
import { cx } from "./cx";

/**
 * The Mustang seal: thin gold rings with circular lettering, and either the broker's
 * monogram (until a portrait exists) or the horse badge in the centre.
 * Decorative by default (aria-hidden); pass `label` to expose it.
 */
export function Seal({
  center = "badge",
  text = "Mustang Mortgage · Mortgage broker · New South Wales · ",
  monogram = SITE.broker.initials,
  className,
  label,
}: {
  /** "none" draws only the rings and lettering (watermark use). */
  center?: "badge" | "monogram" | "none";
  text?: string;
  monogram?: string;
  className?: string;
  label?: string;
}) {
  const id = useId().replace(/:/g, "");
  const r = 82;
  const circumference = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 200 200" className={cx("mw-seal", className)} role={label ? "img" : undefined} aria-hidden={label ? undefined : true} aria-label={label}>
      <defs>
        <path id={`${id}-p`} d={`M 100,100 m -${r},0 a ${r},${r} 0 1,1 ${2 * r},0 a ${r},${r} 0 1,1 -${2 * r},0`} />
        <clipPath id={`${id}-c`}>
          <circle cx="100" cy="100" r="62" />
        </clipPath>
      </defs>
      <circle className="mw-seal__ring" cx="100" cy="100" r="98" strokeWidth="1" />
      <circle className="mw-seal__ring" cx="100" cy="100" r="70" strokeWidth="1" />
      <text className="mw-seal__text">
        <textPath href={`#${id}-p`} textLength={circumference - 6} lengthAdjust="spacing">
          {text.toUpperCase()}
        </textPath>
      </text>
      {center === "none" ? null : center === "badge" ? (
        <image href={SITE.logo.badge} x="38" y="38" width="124" height="124" clipPath={`url(#${id}-c)`} preserveAspectRatio="xMidYMid slice" />
      ) : (
        <text className="mw-seal__mono" x="100" y="102" textAnchor="middle" dominantBaseline="central" fontSize="58">
          {monogram}
        </text>
      )}
    </svg>
  );
}
