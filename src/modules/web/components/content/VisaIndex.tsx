import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PATHS } from "../../config";

export type VisaTile = { code: string; label: string; href: string };

export const VISA_TILES: VisaTile[] = [
  { code: "189", label: "Skilled Independent", href: PATHS.visa189 },
  { code: "190", label: "Skilled Nominated", href: PATHS.visa190 },
  { code: "491", label: "Skilled Work Regional (Provisional)", href: PATHS.visa491 },
  { code: "191", label: "Permanent Residence (Skilled Regional)", href: PATHS.visa191 },
  { code: "482", label: "Skills in Demand", href: PATHS.visa482 },
  { code: "PR", label: "New permanent residents", href: PATHS.permanentResidents },
];

/** Visa subclass tiles with the subclass number set as display type. Designed for ink sections. */
export function VisaIndex({ items = VISA_TILES }: { items?: VisaTile[] }) {
  return (
    <ul className="mw-visa">
      {items.map((v) => (
        <li key={v.code}>
          <Link href={v.href} aria-label={v.code === "PR" ? v.label : `Subclass ${v.code}: ${v.label}`}>
            <span className="mw-visa__num" aria-hidden="true">
              {v.code}
            </span>
            <span className="mw-visa__label" aria-hidden="true">
              <span>{v.label}</span>
              <ArrowUpRight size={18} strokeWidth={1.5} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
