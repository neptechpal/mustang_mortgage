import type { Metadata } from "next";
import AmortizationEmbed from "@/modules/tools/calculators/AmortizationEmbed";
import PageShell from "@/modules/tools/PageShell";

export const metadata: Metadata = { title: "Calculators" };

// WP page 2093 — single HTML widget embedding the mortgage-calculator.net amortization widget.
export default function CalculatorsPage() {
  return (
    <PageShell>
      <AmortizationEmbed />
    </PageShell>
  );
}
