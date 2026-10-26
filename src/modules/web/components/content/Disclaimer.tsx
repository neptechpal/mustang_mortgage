import Link from "next/link";
import { Info } from "lucide-react";
import { PATHS } from "../../config";
import { cx } from "../ui/cx";

/**
 * General-information disclaimer. Required on every content, service, visa, suburb and calculator page.
 * - general: content pages
 * - calculator: adds "estimate, not a quote/approval" wording
 */
export function Disclaimer({ variant = "general", className, children }: { variant?: "general" | "calculator"; className?: string; children?: React.ReactNode }) {
  return (
    <aside className={cx("mw-disclaimer", className)} aria-label="Important information">
      <Info size={18} strokeWidth={1.5} aria-hidden="true" />
      <div>
        {variant === "calculator" && (
          <p>
            Results are estimates based on the figures you enter and the assumptions shown on this page. They are not a quote, a loan offer or a credit approval. Each lender
            uses its own assessment rate, living-expense measures and policies, so the amount a lender will actually lend you may be different.
          </p>
        )}
        <p>
          This is general information only. It does not take into account your objectives, financial situation or needs, and it is not legal, tax or financial advice.
          Consider whether it is right for you before acting on it. All loans are subject to the lender&rsquo;s eligibility criteria, terms and conditions, fees and charges.{" "}
          <Link href={PATHS.importantInfo} className="mw-plainlink" style={{ textDecoration: "underline", textUnderlineOffset: "0.2em" }}>
            Important information
          </Link>
          .
        </p>
        {children}
      </div>
    </aside>
  );
}
