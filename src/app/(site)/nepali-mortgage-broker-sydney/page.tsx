import type { Metadata } from "next";
import { PATHS } from "@/modules/web/config";
import { NEPALI_SYDNEY, NepaliSydney } from "@/modules/web/content/community/nepali-sydney";
import { loadPageReview } from "@/modules/web/content/shared/review";
import { reviewedMetadata, reviewKey } from "@/modules/web/review";

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  return reviewedMetadata(reviewKey("community", "nepali-sydney"), {
    title: NEPALI_SYDNEY.title,
    description: NEPALI_SYDNEY.description,
    path: PATHS.nepaliCommunity,
  });
}

export default async function NepaliMortgageBrokerSydneyPage() {
  // loadPageReview calls ensureReviewRows before reading the broker's sign-off.
  const review = await loadPageReview("community", "nepali-sydney", PATHS.nepaliCommunity);
  return <NepaliSydney review={review} />;
}
