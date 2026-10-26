import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { buildMetadata, type BuildMetadataInput } from "./seo";

// CONTRACT for programmatic / YMYL pages (suburb, visa, state FHB, state duty,
// community, lender). Each page has a stable review key; it is indexable and
// listed in the sitemap only after the broker signs it off in /admin/seo.
//
//   key format: `${kind}:${slug}`  e.g. "suburb:nsw/auburn-2144", "visa:subclass-491",
//               "fhb:nsw", "duty:nsw", "community:nepali-sydney"

export type ReviewKind = "suburb" | "visa" | "fhb" | "duty" | "community" | "lender" | "guide";

export type ReviewState = { reviewed: boolean; reviewedBy: string; reviewedAt: Date | null; brokerNote: string };

const EMPTY: ReviewState = { reviewed: false, reviewedBy: "", reviewedAt: null, brokerNote: "" };

export const reviewKey = (kind: ReviewKind, slug: string) => `${kind}:${slug}`;

/** Review state for a page; never throws (DB down → treated as unreviewed). */
export async function getReview(key: string): Promise<ReviewState> {
  try {
    const r = await prisma.seoReview.findUnique({ where: { key } });
    return r ? { reviewed: r.reviewed, reviewedBy: r.reviewedBy, reviewedAt: r.reviewedAt, brokerNote: r.brokerNote } : EMPTY;
  } catch {
    return EMPTY;
  }
}

/** buildMetadata + noindex unless the page has been reviewed. */
export async function reviewedMetadata(key: string, input: BuildMetadataInput): Promise<Metadata> {
  const r = await getReview(key);
  return buildMetadata({ ...input, noindex: input.noindex || !r.reviewed });
}

/** Register pages so they appear in /admin/seo even before anyone reviews them. */
export async function ensureReviewRows(rows: { key: string; kind: ReviewKind; path: string }[]) {
  try {
    const existing = new Set((await prisma.seoReview.findMany({ where: { key: { in: rows.map((r) => r.key) } }, select: { key: true } })).map((r) => r.key));
    const missing = rows.filter((r) => !existing.has(r.key));
    if (missing.length) await prisma.seoReview.createMany({ data: missing, skipDuplicates: true });
  } catch {
    /* non-fatal */
  }
}

/** Keys (and paths) that are reviewed, for sitemap sources. */
export async function reviewedPaths(kind: ReviewKind): Promise<{ key: string; path: string; updatedAt: Date }[]> {
  try {
    return await prisma.seoReview.findMany({ where: { kind, reviewed: true }, select: { key: true, path: true, updatedAt: true } });
  } catch {
    return [];
  }
}
