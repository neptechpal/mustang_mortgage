import type { Metadata } from "next";
import ElementorPage from "@/modules/site/components/ElementorPage";
import { html, scripts } from "@/modules/site/content/page-home";

export const metadata: Metadata = { title: { absolute: "Mustang Mortgage" } };

/** Home — WP page 1553 */
export default function Home() {
  return <ElementorPage html={html} scripts={scripts} />;
}
