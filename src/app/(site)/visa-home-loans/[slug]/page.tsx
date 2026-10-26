import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVisaPage, relatedVisaLinks, VISA_SLUGS, visaPath } from "@/modules/web/content/visa";
import { VisaArticle } from "@/modules/web/content/visa/VisaArticle";
import { loadPageReview } from "@/modules/web/content/shared/review";
import { reviewedMetadata, reviewKey } from "@/modules/web/review";

// YMYL programmatic page (research §C4.4). Indexable only after broker sign-off (key "visa:<slug>").
export const dynamicParams = false;
// Re-render every 10 minutes so a sign-off in /admin/seo shows without a rebuild.
export const revalidate = 600;

export function generateStaticParams() {
  return VISA_SLUGS.map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getVisaPage(slug);
  if (!page) return {};
  const { content: c } = page;
  return reviewedMetadata(reviewKey("visa", slug), {
    title: c.metaTitle,
    description: c.metaDescription,
    path: visaPath(slug),
    ogType: "article",
    publishedTime: c.publishedAt,
    modifiedTime: c.updatedAt,
  });
}

export default async function VisaPage({ params }: Props) {
  const { slug } = await params;
  const page = getVisaPage(slug);
  if (!page) notFound();
  const review = await loadPageReview("visa", slug, visaPath(slug));
  return <VisaArticle policy={page.policy} content={page.content} review={review} related={relatedVisaLinks(page.content.related)} />;
}
