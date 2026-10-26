import type { Metadata } from "next";
import ElementorHtml from "@/modules/site/components/ElementorHtml";
import SiteChrome from "@/modules/site/components/SiteChrome";
import { html } from "@/modules/site/content/not-found";

export const metadata: Metadata = { title: "Page not found" };

/** 404 — Royal Elementor theme-builder template 245, inside the site header/footer. */
export default function NotFound() {
  return (
    <SiteChrome>
      <ElementorHtml html={html} />
    </SiteChrome>
  );
}
