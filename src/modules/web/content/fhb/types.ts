import type { AuState, PropertyType } from "@/modules/calc/types";
import type { FaqEntry } from "../../components/content/Faq";
import type { Point } from "../../components/content/PointGrid";
import type { Step } from "../../components/content/Steps";

/**
 * Hand-written content for one /first-home-buyers/[state] page (research §C4.2). Every threshold, rate,
 * grant amount and cap shown on the page is read from calc/rules (or computed by calcStampDuty); this file
 * holds the explanation and the choice of worked-example prices.
 */
export type FhbExample = { label: string; price: number; propertyType: PropertyType };

export type FhbStateContent = {
  state: AuState;
  metaTitle: string;
  metaDescription: string;
  h1: React.ReactNode;
  headline: string;
  lede: string;
  publishedAt: string;
  updatedAt: string;
  /** "What is different in this state" — after the summary box. */
  intro: React.ReactNode;
  /** Three price points for the worked example (§C4.2 section 4). */
  examples: [FhbExample, FhbExample, FhbExample];
  examplesAfter: React.ReactNode;
  /** State-specific lead-in to the federal schemes section (caps table follows). */
  schemesIntro?: React.ReactNode;
  /** A state-specific topic (e.g. NSW off-the-plan deferral, WA north of the 26th parallel). */
  extra?: { id: string; title: string; body: React.ReactNode };
  /** How and when to apply, in order. */
  apply: Step[];
  applyAfter?: React.ReactNode;
  documents: string[];
  mistakes: Point[];
  faqs: FaqEntry[];
  /** Default calculator price. */
  calcPrice: number;
};
