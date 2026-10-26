import { notFound } from "next/navigation";
import { ensureReviewRows, getReview, reviewedMetadata } from "@/modules/web/review";
import { SuburbGuide, suburbDescription, suburbTitle } from "@/modules/web/suburbs/SuburbGuide";
import { PUBLISHED_SUBURBS, SUBURB_KIND, buildSuburbView, findPublishedSuburb, stateSlug, suburbKey, suburbPath } from "@/modules/web/suburbs/model";

// Suburb home-buying guides (research §C4.1). Only suburbs passing the ≥10/14 data gate are generated; everything
// else 404s. Pages are noindex (and out of the sitemap) until Sulav approves them in /admin/seo.
export const dynamicParams = false;
export const revalidate = 86400; // /admin/seo revalidates a page on approve / note change

type Params = { state: string; suburb: string };

export function generateStaticParams(): Params[] {
  return PUBLISHED_SUBURBS.map((s) => ({ state: stateSlug(s), suburb: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { state, suburb } = await params;
  const s = findPublishedSuburb(state, suburb);
  if (!s) return {};
  const v = buildSuburbView(s);
  return reviewedMetadata(suburbKey(s), { title: suburbTitle(v), description: suburbDescription(v), path: suburbPath(s) });
}

export default async function SuburbPage({ params }: { params: Promise<Params> }) {
  const { state, suburb } = await params;
  const s = findPublishedSuburb(state, suburb);
  if (!s) notFound();
  const key = suburbKey(s);
  await ensureReviewRows([{ key, kind: SUBURB_KIND, path: suburbPath(s) }]);
  const review = await getReview(key);
  return <SuburbGuide v={buildSuburbView(s)} review={review} isProduction={process.env.NODE_ENV === "production"} />;
}
