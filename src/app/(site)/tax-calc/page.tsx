import type { Metadata } from "next";
import PageShell from "@/modules/tools/PageShell";

export const metadata: Metadata = { title: "Tax Calc" };

// WP page 2727 — HTML widget linking to the Moneysmart income tax calculator.
export default function TaxCalcPage() {
  return (
    <PageShell>
      <a
        href="https://moneysmart.gov.au/income-tax/income-tax-calculator"
        target="_blank"
        rel="noopener"
        style={{
          display: "inline-block",
          backgroundColor: "#987633",
          color: "white",
          padding: "12px 24px",
          borderRadius: 6,
          textDecoration: "none",
          fontWeight: "bold",
        }}
      >
        Click here to Go to Income Tax Calculator
      </a>
    </PageShell>
  );
}
