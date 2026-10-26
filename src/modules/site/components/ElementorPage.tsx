import { getCf7ClientProps } from "../cf7/registry";
import type { Cf7ClientProps } from "../cf7/types";
import ElementorHtml from "./ElementorHtml";

/** Server wrapper: resolves the CF7 forms referenced by the fragment's slots, then renders it. */
export default async function ElementorPage({ html, scripts }: { html: string; scripts?: { src?: string; code?: string }[] }) {
  const ids = Array.from(new Set(Array.from(html.matchAll(/data-cf7-slot="(\d+)"/g), (m) => m[1])));
  const forms: Record<string, Cf7ClientProps | null> = {};
  for (const id of ids) forms[id] = await getCf7ClientProps(Number(id));
  return <ElementorHtml html={html} scripts={scripts} forms={forms} />;
}
