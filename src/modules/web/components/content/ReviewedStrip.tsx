import Link from "next/link";
import { PATHS, SITE } from "../../config";
import { formatDate } from "../../format";
import { Seal } from "../ui/Seal";

/**
 * "Written by Sulav Adhikari · Reviewed 26 October 2026 · Sources" — E-E-A-T strip under the H1
 * of every guide, visa, calculator and suburb page. `reviewedAt` is the broker sign-off date (ISO).
 */
export function ReviewedStrip({ reviewedAt, updatedAt, sourcesHref = "#sources", label = "Written by" }: { reviewedAt: string; updatedAt?: string; sourcesHref?: string | null; label?: string }) {
  return (
    <div className="mw-reviewed">
      <span className="mw-reviewed__mono">
        <Seal center="monogram" text="Mustang Mortgage · Reviewed · " />
      </span>
      <span>
        {label} <Link href={PATHS.broker}>{SITE.broker.name}</Link>
      </span>
      <span className="mw-reviewed__sep" aria-hidden="true">
        ·
      </span>
      <span>
        Reviewed <time dateTime={reviewedAt}>{formatDate(reviewedAt)}</time>
      </span>
      {updatedAt && updatedAt !== reviewedAt && (
        <>
          <span className="mw-reviewed__sep" aria-hidden="true">
            ·
          </span>
          <span>
            Updated <time dateTime={updatedAt}>{formatDate(updatedAt)}</time>
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
