import type { Metadata } from "next";
import ElementorPage from "@/modules/site/components/ElementorPage";
import { html, scripts } from "@/modules/site/content/page-mustang-mortgage";

export const metadata: Metadata = { title: "Mustang mortgage" };

/** Mustang mortgage — WP page 7 (legacy demo page) */
export default function Page() {
  return <ElementorPage html={html} scripts={scripts} />;
}
