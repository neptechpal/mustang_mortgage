import type { Metadata } from "next";
import ElementorPage from "@/modules/site/components/ElementorPage";
import { html, scripts } from "@/modules/site/content/page-about-us";

export const metadata: Metadata = { title: "About Us" };

/** About Us — WP page 1554 */
export default function Page() {
  return <ElementorPage html={html} scripts={scripts} />;
}
