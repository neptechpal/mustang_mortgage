import { getVisaPolicy } from "@/modules/seo-data/visas";
import type { VisaPolicy } from "@/modules/seo-data/types";
import type { VisaPageContent } from "./types";
import s189 from "./pages/subclass-189";
import s190 from "./pages/subclass-190";
import s491 from "./pages/subclass-491";
import s191 from "./pages/subclass-191";
import s482 from "./pages/subclass-482";
import pr from "./pages/permanent-residents";
import s494 from "./pages/subclass-494";
import s186 from "./pages/subclass-186";
import partner from "./pages/partner-visa";
import bridging from "./pages/bridging-visa";
import nz from "./pages/new-zealand-citizens";
import { visaPath } from "./VisaArticle";

/** Batch 1 then batch 2 (research §C3). Order is the hub's index order. */
export const VISA_PAGES: VisaPageContent[] = [s189, s190, s491, s191, s482, pr, s494, s186, partner, bridging, nz];
export const VISA_BATCH_1 = ["subclass-189", "subclass-190", "subclass-491", "subclass-191", "subclass-482", "permanent-residents"];

export const VISA_SLUGS = VISA_PAGES.map((p) => p.slug);

export function getVisaPage(slug: string): { content: VisaPageContent; policy: VisaPolicy } | null {
  const content = VISA_PAGES.find((p) => p.slug === slug);
  const policy = getVisaPolicy(slug);
  return content && policy ? { content, policy } : null;
}

export function relatedVisaLinks(slugs: string[]) {
  return slugs
    .map((s) => VISA_PAGES.find((p) => p.slug === s))
    .filter((p): p is VisaPageContent => !!p)
    .map((p) => ({ href: visaPath(p.slug), title: p.headline, description: p.blurb }));
}

export { visaPath };
