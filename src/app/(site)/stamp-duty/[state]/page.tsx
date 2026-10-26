import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AU_STATES, type AuState } from "@/modules/calc/types";
import { loadPageReview } from "@/modules/web/content/shared/review";
import { StampDutyStatePage, dutyDescription, dutyTitle } from "@/modules/web/duty/StampDutyStatePage";
import { dutyPath } from "@/modules/web/duty/paths";
import { reviewedMetadata, reviewKey } from "@/modules/web/review";

// Programmatic YMYL page (research §C4.3). Indexable + in the sitemap only after broker sign-off (key "duty:<state>").
export const dynamicParams = false;
// Re-render every 10 minutes so a sign-off in /admin/seo shows without a rebuild.
export const revalidate = 600;

export function generateStaticParams() {
  return AU_STATES.map((s) => ({ state: s.toLowerCase() }));
}

type Props = { params: Promise<{ state: string }> };

const toState = (slug: string): AuState | undefined => AU_STATES.find((s) => s.toLowerCase() === slug);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const st = toState((await params).state);
  if (!st) return {};
  return reviewedMetadata(reviewKey("duty", st.toLowerCase()), { title: dutyTitle(st), description: dutyDescription(st), path: dutyPath(st) });
}

export default async function StampDutyStateRoute({ params }: Props) {
  const st = toState((await params).state);
  if (!st) notFound();
  const review = await loadPageReview("duty", st.toLowerCase(), dutyPath(st));
  return <StampDutyStatePage state={st} review={review} />;
}
