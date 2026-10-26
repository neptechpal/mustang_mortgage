import type { StampDutyInput } from "@/modules/calc/types";
import type { FaqEntry } from "../../components/content/Faq";
import type { Point } from "../../components/content/PointGrid";

/**
 * Hand-written content for one /visa-home-loans/[slug] page. Facts (FIRB status, ban dates, state rules,
 * scheme eligibility, documents) come from seo-data/visas and calc/rules; this file holds the explanation,
 * written per visa. Keep every number out of the copy unless it is read from the rules data.
 */
export type ScenarioColumn = {
  /** Column heading, e.g. "On the 491 today". */
  label: string;
  /** Duty engine inputs (price, state, property type, foreign status…). */
  duty: Omit<StampDutyInput, "contractDate">;
  /** Add the FIRB new-dwelling application fee for this column. */
  firbFee?: boolean;
};

export type VisaScenario = {
  /** Short title after "Illustrative scenario:" */
  title: string;
  /** Who is buying and what (the template labels it as not a real client). */
  setup: React.ReactNode;
  /** One or two columns (two = a before/after comparison). Same state in every column. */
  columns: ScenarioColumn[];
  /** Deposit % to show (deposit + loan rows). */
  depositPct?: number;
  /** Extra assumptions in plain words. */
  assumptions: string[];
  /** What the numbers mean for this buyer. */
  after: React.ReactNode;
};

export type VisaPageContent = {
  slug: string;
  /** Breadcrumb / index label, e.g. "Subclass 491". */
  short: string;
  /** One-line description for index lists. */
  blurb: string;
  metaTitle: string;
  metaDescription: string;
  h1: React.ReactNode;
  /** Plain-text headline for JSON-LD. */
  headline: string;
  lede: string;
  publishedAt: string;
  updatedAt: string;
  /** Quick answer box ("Yes, but…"). */
  answer: React.ReactNode;
  lenders: { intro: React.ReactNode; points: Point[]; outro?: React.ReactNode };
  firb: React.ReactNode;
  states: { intro: React.ReactNode; after: React.ReactNode };
  deposit: React.ReactNode;
  /** Regional rules (491, 494, 191). */
  regional?: { title: string; body: React.ReactNode; showNswPostcodes?: boolean };
  pathway: { title: string; body: React.ReactNode };
  documents: { intro?: React.ReactNode; extra?: string[]; after?: React.ReactNode };
  scenario: VisaScenario;
  mistakes?: Point[];
  faqs: FaqEntry[];
  /** Heading above the FAQ (default "Questions"). */
  faqTitle?: string;
  /** Related visa slugs for the "keep reading" list. */
  related: string[];
  /** Show a second table for the permanent stage (partner visas). */
  permanentStageTable?: { caption: string; intro: React.ReactNode };
};
