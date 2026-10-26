import type { Metadata } from "next";
import { PATHS } from "@/modules/web/config";
import { loadPageReview } from "@/modules/web/content/shared/review";
import { VISA_HUB, VisaHub } from "@/modules/web/content/visa/VisaHub";
import { reviewedMetadata, reviewKey } from "@/modules/web/review";

// Hand-written hub, but it states FIRB/duty rules, so it follows the review contract (key "visa:hub").
export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  return reviewedMetadata(reviewKey("visa", "hub"), { title: VISA_HUB.metaTitle, description: VISA_HUB.description, path: PATHS.visaHomeLoans });
}

export default async function VisaHomeLoansPage() {
  const review = await loadPageReview("visa", "hub", PATHS.visaHomeLoans);
  return <VisaHub review={review} />;
}
