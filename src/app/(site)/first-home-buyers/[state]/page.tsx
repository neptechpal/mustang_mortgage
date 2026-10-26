import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FHB_SLUGS, fhbPath, getFhbPage } from "@/modules/web/content/fhb";
import { FhbArticle } from "@/modules/web/content/fhb/FhbArticle";
import { loadPageReview } from "@/modules/web/content/shared/review";
import { stateSlug } from "@/modules/web/content/shared/rules";
import { reviewedMetadata, reviewKey } from "@/modules/web/review";

// YMYL programmatic page (research §C4.2). Indexable only after broker sign-off (key "fhb:<state>").
export const dynamicParams = false;
// Re-render every 10 minutes so a sign-off in /admin/seo shows without a rebuild.
export const revalidate = 600;

export function generateStaticParams() {
  return FHB_SLUGS.map((state) => ({ state }));
}

type Props = { params: Promise<{ state: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state } = await params;
  const c = getFhbPage(state);
  if (!c) return {};
  return reviewedMetadata(reviewKey("fhb", stateSlug(c.state)), {
    title: c.metaTitle,
    description: c.metaDescription,
    path: fhbPath(c.state),
    ogType: "article",
    publishedTime: c.publishedAt,
    modifiedTime: c.updatedAt,
  });
}

export default async function FirstHomeBuyersStatePage({ params }: Props) {
  const { state } = await params;
  const c = getFhbPage(state);
  if (!c) notFound();
  const review = await loadPageReview("fhb", stateSlug(c.state), fhbPath(c.state));
  return <FhbArticle content={c} review={review} />;
}
