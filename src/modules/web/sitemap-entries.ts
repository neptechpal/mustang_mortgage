import type { MetadataRoute } from "next";
import { PATHS } from "./config";
import { suburbSitemapEntries } from "./suburbs/sitemap";
import { dutySitemapEntries } from "./duty/sitemap";
import { ensureReviewRows, reviewedPaths } from "./review";

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
  // Home-loan service pages (src/modules/web/content/home-loans).
  { path: PATHS.homeLoans, lastModified: BUILT, changeFrequency: "monthly", priority: 0.9 },
  { path: PATHS.homeLoansFirstHomeBuyers, lastModified: BUILT, changeFrequency: "monthly", priority: 0.8 },
  { path: PATHS.firstHomeBuyers, lastModified: BUILT, changeFrequency: "monthly", priority: 0.8 },
  { path: PATHS.refinancing, lastModified: BUILT, changeFrequency: "monthly", priority: 0.8 },
  { path: PATHS.investmentLoans, lastModified: BUILT, changeFrequency: "monthly", priority: 0.8 },
  { path: PATHS.constructionLoans, lastModified: BUILT, changeFrequency: "monthly", priority: 0.7 },
  { path: PATHS.debtConsolidation, lastModified: BUILT, changeFrequency: "monthly", priority: 0.7 },
  { path: PATHS.selfEmployed, lastModified: BUILT, changeFrequency: "monthly", priority: 0.7 },
  { path: PATHS.fixedVsVariable, lastModified: BUILT, changeFrequency: "monthly", priority: 0.6 },
  { path: PATHS.carLoans, lastModified: BUILT, changeFrequency: "yearly", priority: 0.4 },
  // Calculators (src/modules/web/calculators) and the stamp duty hub. State duty pages are programmatic (below).
  { path: PATHS.calculators, lastModified: BUILT, changeFrequency: "monthly", priority: 0.7 },
  { path: PATHS.borrowingPower, lastModified: BUILT, changeFrequency: "monthly", priority: 0.8 },
  { path: PATHS.repayments, lastModified: BUILT, changeFrequency: "monthly", priority: 0.7 },
  { path: PATHS.refinanceCalculator, lastModified: BUILT, changeFrequency: "monthly", priority: 0.6 },
  { path: PATHS.nprConverter, lastModified: BUILT, changeFrequency: "yearly", priority: 0.6 },
  { path: PATHS.stampDuty, lastModified: BUILT, changeFrequency: "monthly", priority: 0.8 },
];

export const SITEMAP_SOURCES: SitemapSource[] = [() => STATIC_ENTRIES];

// Suburb guides + /mortgage-broker hubs (reviewed suburb pages only).
SITEMAP_SOURCES.push(suburbSitemapEntries);

// State stamp duty calculators /stamp-duty/<state> (reviewed "duty:<state>" pages only).
SITEMAP_SOURCES.push(dutySitemapEntries);

// Community guides enter the sitemap only after broker sign-off.
SITEMAP_SOURCES.push(async () => {
  await ensureReviewRows([{ key: "community:nepali-sydney", kind: "community", path: PATHS.nepaliCommunity }]);
  return (await reviewedPaths("community")).map((r) => ({ path: r.path, lastModified: r.updatedAt, changeFrequency: "monthly", priority: 0.7 }));
});
