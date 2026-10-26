import type { Metadata } from "next";
import PageShell from "@/modules/tools/PageShell";
import StampDutyCalculator from "@/modules/tools/stamp-duty/StampDutyCalculator";

export const metadata: Metadata = { title: "Stamp Duty" };

// WP page 2257 — live page embeds the calculatorsonline.com.au widget; the native calculator
// restores the original Mustang Mortgage per-state brackets (WPCode snippets 2460–2488).
export default function StampDutyPage() {
  return (
    <PageShell>
      <StampDutyCalculator />
    </PageShell>
  );
}
