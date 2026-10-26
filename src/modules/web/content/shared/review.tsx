import Link from "next/link";
import { Seal } from "../../components/ui/Seal";
import { PATHS, SITE } from "../../config";
import { formatDate } from "../../format";
import { ensureReviewRows, getReview, reviewKey, type ReviewKind, type ReviewState } from "../../review";

/**
 * Review (broker sign-off) plumbing for the visa, first-home-buyer and community pages.
 * CONTRACT: src/modules/web/review.ts. A page shows "Reviewed by Sulav Adhikari on …" only when its
 * SeoReview row is reviewed. Outside production (SEO_INDEXING !== "on") an unreviewed page shows a
 * small "Pending broker review" note so staff can see what still needs sign-off.
 */

export type PageReview = ReviewState & { key: string };

/** Production check used for staff-only notes. */
export const staffNotesVisible = () => process.env.SEO_INDEXING !== "on";

/** Registers the page in /admin/seo (idempotent) and returns its review state. Never throws. */
export async function loadPageReview(kind: ReviewKind, slug: string, path: string): Promise<PageReview> {
  const key = reviewKey(kind, slug);
  await ensureReviewRows([{ key, kind, path }]);
  return { key, ...(await getReview(key)) };
}

const isoDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(d);

/** ISO date the page was signed off, or null. */
export function reviewedOn(r: ReviewState): string | null {
  return r.reviewed && r.reviewedAt ? isoDay(r.reviewedAt) : null;
}

/**
 * Under the H1: the sign-off strip when reviewed; a quiet staff-only note when not.
 * `updatedAt` is the content/data date (shown when later than the review).
 */
export function ReviewLine({ review, updatedAt, sourcesHref = "#sources" }: { review: ReviewState; updatedAt?: string; sourcesHref?: string | null }) {
  const on = reviewedOn(review);
  if (on) {
    return (
      <div className="mw-reviewed" style={{ marginTop: 28 }}>
        <span className="mw-reviewed__mono">
          <Seal center="monogram" text="Mustang Mortgage · Reviewed · " />
        </span>
        <span>
          Reviewed by <Link href={PATHS.broker}>{SITE.broker.name}</Link> on <time dateTime={on}>{formatDate(on)}</time>
        </span>
        {updatedAt && updatedAt > on && (
          <>
            <span className="mw-reviewed__sep" aria-hidden="true">
              ·
            </span>
            <span>
              Rules checked <time dateTime={updatedAt}>{formatDate(updatedAt)}</time>
            </span>
          </>
        )}
        {sourcesHref && (
          <>
            <span className="mw-reviewed__sep" aria-hidden="true">
              ·
            </span>
            <a href={sourcesHref}>Sources</a>
          </>
        )}
      </div>
    );
  }
  if (!staffNotesVisible()) return null;
  return (
    <p className="mw-small" style={{ marginTop: 20, color: "var(--mw-text-3)" }} data-staff-note="review">
      Pending broker review. This page stays out of search and the sitemap until it is signed off in /admin/seo. (Staff note, not shown in production.)
    </p>
  );
}

/** Article JSON-LD only claims `reviewedBy` once the page is actually reviewed. */
export function withReviewClaim<T extends Record<string, unknown>>(ld: T, review: ReviewState): T {
  if (reviewedOn(review)) return ld;
  const { reviewedBy: _drop, ...rest } = ld as Record<string, unknown>;
  void _drop;
  return rest as T;
}
