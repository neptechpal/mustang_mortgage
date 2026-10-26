import type { Metadata } from "next";
import Converter from "@/modules/tools/converter/Converter";
import PageShell from "@/modules/tools/PageShell";

export const metadata: Metadata = { title: "Number Conversion" };

// WP page 2749 (slug kept for URL parity) — [mustang_converter] shortcode.
export default function NumberConversionPage() {
  return (
    <PageShell>
      <Converter />
    </PageShell>
  );
}
