import { PATHS } from "../config";
import { reviewedPaths } from "../review";
import type { SitemapEntry } from "../sitemap-entries";
import { DATA_PULLED_AT, suburbReviewRows } from "./model";

/**
 * Sitemap source for the suburb guides + their hubs. Suburb pages appear only once Sulav has approved them in
 * /admin/seo (SeoReview.reviewed = true) and they are still generated (pass the data gate).
 * lastModified = the later of the data pull and the review update (not the build time).
 */
export async function suburbSitemapEntries(): Promise<SitemapEntry[]> {
  const live = new Set(suburbReviewRows().map((r) => r.key));
  const reviewed = (await reviewedPaths("suburb")).filter((r) => live.has(r.key));
  const data = new Date(`${DATA_PULLED_AT}T00:00:00Z`);
  const later = (d: Date) => (d > data ? d : data);
  return [
    { path: PATHS.mortgageBroker, lastModified: DATA_PULLED_AT, changeFrequency: "monthly", priority: 0.6 },
    { path: PATHS.mortgageBrokerNsw, lastModified: DATA_PULLED_AT, changeFrequency: "monthly", priority: 0.6 },
    ...reviewed.map((r) => ({ path: r.path, lastModified: later(r.updatedAt), changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
}
