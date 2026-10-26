import Link from "next/link";
import { PATHS } from "../../config";
import { IndexList } from "../ui/IndexList";

export type Situation = { label: string; href: string; description: string };

/** Default situations (each routes to the page that answers it). */
export const SITUATIONS: Situation[] = [
  { label: "Buying your first home", href: PATHS.firstHomeBuyers, description: "Deposit and LMI, NSW first home buyer concessions, and the government 5% Deposit Scheme." },
  { label: "Buying on a visa or as a new PR", href: PATHS.visaHomeLoans, description: "What changes for 189, 190, 491, 191 and 482 holders, and for new permanent residents." },
  { label: "Refinancing your loan", href: PATHS.refinancing, description: "Compare your current rate, fees and structure with what other lenders offer now." },
  { label: "Buying an investment property", href: PATHS.investmentLoans, description: "How lenders treat rental income, and structuring a loan for an investment." },
  { label: "Building a home", href: PATHS.constructionLoans, description: "Construction loans are paid in stages as the build progresses." },
  { label: "Consolidating debts", href: PATHS.debtConsolidation, description: "Rolling credit cards or personal loans into your home loan, and what it costs over time." },
];

/**
 * Routes a visitor to the page for their situation.
 * - index (default): numbered editorial list, two columns on desktop (home page)
 * - chips: compact buttons (hubs, sidebars). `current` highlights the active page.
 */
export function SituationSelector({ items = SITUATIONS, variant = "index", current, label = "Choose your situation" }: { items?: Situation[]; variant?: "index" | "chips"; current?: string; label?: string }) {
  if (variant === "chips") {
    return (
      <nav aria-label={label}>
        <ul className="mw-chips">
          {items.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="mw-chip" aria-current={current === s.href ? "page" : undefined}>
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }
  return (
    <nav aria-label={label}>
      <IndexList numbered columns={2} items={items.map((s) => ({ href: s.href, title: s.label, description: s.description }))} />
    </nav>
  );
}
