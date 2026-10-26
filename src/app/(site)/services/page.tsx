import type { Metadata } from "next";
import ElementorPage from "@/modules/site/components/ElementorPage";
import { html, scripts } from "@/modules/site/content/page-services";

export const metadata: Metadata = { title: "Services" };

/** Services — WP page 1555 */
export default function Page() {
  return <ElementorPage html={html} scripts={scripts} />;
}
