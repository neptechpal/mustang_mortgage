"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { html as headerHtml } from "../content/header";
import type { Cf7ClientProps } from "../cf7/types";
import ElementorHtml from "./ElementorHtml";

const norm = (p: string) => (p.replace(/[?#].*$/, "").replace(/\/+$/, "") || "/").toLowerCase();

/** Marks the menu items for the current path like WordPress does (current-menu-item, wpr-active-menu-item). */
export function withActiveMenu(html: string, pathname: string) {
  const path = norm(pathname);
  return html.replace(/<li class="([^"]*)"><a ([^>]*?)href="([^"]*)"([^>]*)>/g, (m, liCls: string, pre: string, href: string, post: string) => {
    if (norm(href) !== path) return m;
    const a = `${pre}href="${href}" aria-current="page"${post.replace(/class="(wpr-menu-item[^"]*)"/, 'class="$1 wpr-active-menu-item"')}`;
    return `<li class="${liCls} current-menu-item current_page_item"><a ${a}>`;
  });
}

/** wpr_template 183 "Software Company V1 Header" incl. mobile menu and the "Contact Us !" offcanvas (template 103). */
export default function SiteHeader({ enquiryForm }: { enquiryForm: Cf7ClientProps | null }) {
  const pathname = usePathname() || "/";
  const html = useMemo(() => withActiveMenu(headerHtml, pathname), [pathname]);
  return <ElementorHtml html={html} forms={{ "1767": enquiryForm }} />;
}
