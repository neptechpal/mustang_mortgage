import type { Review } from "../../config";

/**
 * Rating + count + source link. Render ONLY from SITE.reviews (real, verifiable reviews).
 * ACCC: always show the count with the rating, and link to the source.
 */
export function ReviewBadge({ review }: { review: Review }) {
  return (
    <a href={review.url} target="_blank" rel="noopener noreferrer" className="mw-link" style={{ fontWeight: 500 }}>
      <span className="mw-num">{review.rating.toFixed(1)}</span> from <span className="mw-num">{review.count}</span> {review.source} reviews
    </a>
  );
}
