import type { Metadata } from "next";
import ElementorPage from "@/modules/site/components/ElementorPage";
import { html, scripts } from "@/modules/site/content/page-contact";

export const metadata: Metadata = { title: "Contact" };

/** Contact — WP page 1558 (lead form 3012) */
export default function Page() {
  return <ElementorPage html={html} scripts={scripts} />;
}
