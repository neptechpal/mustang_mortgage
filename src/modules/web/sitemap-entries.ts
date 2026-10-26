import type { MetadataRoute } from "next";
import { PATHS } from "./config";

/**
 * Sitemap registry. src/app/sitemap.ts flattens every source below.
 *
 * HOW TO ADD PAGES (other agents):
 * - Hand-written page: append an entry to STATIC_ENTRIES.
 * - Programmatic pages: push a source function onto SITEMAP_SOURCES that returns only
 *   published AND broker-reviewed (`reviewed=true`) records, with lastModified = the data's updatedAt.
 *   Entries with `indexable: false` are dropped.
 * Paths are slash-less ("/home-loans/refinancing").
 */
export type SitemapEntry = {
  path: string;
  lastModified?: string | Date;
  changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority?: number;
  /** false = keep out of the sitemap (e.g. not yet reviewed). Default true. */
  indexable?: boolean;
};

export type SitemapSource = () => SitemapEntry[] | Promise<SitemapEntry[]>;

const BUILT = "2026-10-26";

export const STATIC_ENTRIES: SitemapEntry[] = [
  { path: PATHS.home, lastModified: BUILT, changeFrequency: "monthly", priority: 1 },
  { path: PATHS.about, lastModified: BUILT, changeFrequency: "yearly", priority: 0.6 },
  { path: PATHS.broker, lastModified: BUILT, changeFrequency: "monthly", priority: 0.7 },
  { path: PATHS.howWeArePaid, lastModified: BUILT, changeFrequency: "yearly", priority: 0.5 },
  { path: PATHS.contact, lastModified: BUILT, changeFrequency: "yearly", priority: 0.6 },
  { path: PATHS.book, lastModified: BUILT, changeFrequency: "yearly", priority: 0.6 },
  // Legal drafts stay out until the licensee approves the text.
  { path: PATHS.creditGuide, lastModified: BUILT, changeFrequency: "yearly", priority: 0.3, indexable: false },
  { path: PATHS.privacy, lastModified: BUILT, changeFrequency: "yearly", priority: 0.3, indexable: false },
  { path: PATHS.complaints, lastModified: BUILT, changeFrequency: "yearly", priority: 0.3, indexable: false },
  { path: PATHS.hardship, lastModified: BUILT, changeFrequency: "yearly", priority: 0.3, indexable: false },
  { path: PATHS.terms, lastModified: BUILT, changeFrequency: "yearly", priority: 0.2, indexable: false },
  { path: PATHS.importantInfo, lastModified: BUILT, changeFrequency: "yearly", priority: 0.3, indexable: false },
];

export const SITEMAP_SOURCES: SitemapSource[] = [() => STATIC_ENTRIES];
