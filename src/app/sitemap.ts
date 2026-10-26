import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/modules/web/seo";
import { SITEMAP_SOURCES } from "@/modules/web/sitemap-entries";

// Base sitemap. Pages register themselves in src/modules/web/sitemap-entries.ts.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lists = await Promise.all(SITEMAP_SOURCES.map(async (s) => s()));
  const seen = new Set<string>();
  const out: MetadataRoute.Sitemap = [];
  for (const e of lists.flat()) {
    if (e.indexable === false) continue;
    const url = absoluteUrl(e.path);
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, lastModified: e.lastModified, changeFrequency: e.changeFrequency, priority: e.priority });
  }
  return out;
}
