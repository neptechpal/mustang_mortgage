import { reviewedPaths } from "../review";
import type { SitemapEntry } from "../sitemap-entries";
import { AU_STATES } from "@/modules/calc/types";
import { RULES } from "@/modules/calc/rules";
import { dutyPath } from "./paths";

/** Review rows for the 8 state duty pages (key "duty:<state>"). */
export const dutyReviewRows = () => AU_STATES.map((s) => ({ key: `duty:${s.toLowerCase()}`, kind: "duty" as const, path: dutyPath(s) }));

/**
 * Sitemap source: state stamp-duty pages appear only after broker sign-off in /admin/seo.
 * lastModified = the later of the rules check date and the review update.
 */
export async function dutySitemapEntries(): Promise<SitemapEntry[]> {
  const live = new Set(dutyReviewRows().map((r) => r.key));
  const rows = (await reviewedPaths("duty")).filter((r) => live.has(r.key));
  return rows.map((r) => {
    const st = AU_STATES.find((s) => `duty:${s.toLowerCase()}` === r.key);
    const rules = st ? new Date(`${RULES[st].generalScale.verifiedAt}T00:00:00Z`) : r.updatedAt;
    return { path: r.path, lastModified: r.updatedAt > rules ? r.updatedAt : rules, changeFrequency: "monthly" as const, priority: 0.6 };
  });
}
