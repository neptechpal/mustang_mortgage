import type { Metadata } from "next";
import { createElement } from "react";
import { SITE, confirmedLanguages, factValue } from "./config";

/**
 * SEO helpers for the public site.
 *
 * Indexing: a page is indexable only when `SEO_INDEXING=on` (production env) AND the
 * page is not marked `noindex`. Staging/dev never index. Canonicals always point at
 * SITE.canonicalOrigin + path, slash-less (Next default), e.g. /home-loans/refinancing.
 */

export const ORIGIN = SITE.canonicalOrigin;
export const BUSINESS_ID = `${ORIGIN}/#business`;
export const BROKER_ID = `${ORIGIN}/#sulav`;
export const WEBSITE_ID = `${ORIGIN}/#website`;

export function indexingEnabled() {
  return process.env.SEO_INDEXING === "on";
}

/** Normalise a site path: leading slash, no trailing slash (except "/"), no query/hash. */
export function normalisePath(path: string) {
  let p = (path || "/").split(/[?#]/)[0].trim();
  if (!p.startsWith("/")) p = `/${p}`;
  p = p.replace(/\/{2,}/g, "/");
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p;
}

export function absoluteUrl(path: string) {
  const p = normalisePath(path);
  return p === "/" ? `${ORIGIN}/` : `${ORIGIN}${p}`;
}

export type BuildMetadataInput = {
  /** Page title without the brand; " | Mustang Mortgage" is appended unless `absoluteTitle`. */
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  absoluteTitle?: boolean;
  ogType?: "website" | "article" | "profile";
  /** ISO dates for articles */
  publishedTime?: string;
  modifiedTime?: string;
  image?: { url: string; width: number; height: number; alt: string };
};

const DEFAULT_IMAGE = { url: SITE.logo.badgeLarge, width: 1024, height: 1024, alt: SITE.logo.alt };

export function robotsFor(noindex?: boolean): Metadata["robots"] {
  if (!indexingEnabled()) return { index: false, follow: false, googleBot: { index: false, follow: false } };
  if (noindex) return { index: false, follow: true };
  return { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } };
}

export function buildMetadata(input: BuildMetadataInput): Metadata {
  const fullTitle = input.absoluteTitle || input.title.includes(SITE.name) ? input.title : `${input.title} | ${SITE.name}`;
  const url = absoluteUrl(input.path);
  const image = input.image ?? DEFAULT_IMAGE;
  return {
    title: { absolute: fullTitle },
    description: input.description,
    alternates: { canonical: url },
    robots: robotsFor(input.noindex),
    openGraph: {
      type: input.ogType === "article" ? "article" : input.ogType === "profile" ? "profile" : "website",
      url,
      siteName: SITE.name,
      locale: "en_AU",
      title: fullTitle,
      description: input.description,
      images: [image],
      ...(input.ogType === "article" && input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.ogType === "article" && input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: { card: "summary", title: fullTitle, description: input.description, images: [image.url] },
  };
}

/* ------------------------------------------------------------------ */
/* JSON-LD                                                             */
/* ------------------------------------------------------------------ */

type Json = Record<string, unknown>;

function licenceIdentifiers(): Json[] {
  const ids: Json[] = [];
  const acl = factValue("licence.licenseeAcl");
  const cr = factValue("licence.creditRepresentativeNumber");
  const abn = factValue("legal.abn");
  if (cr) ids.push({ "@type": "PropertyValue", propertyID: "Credit Representative number", value: cr });
  if (acl) ids.push({ "@type": "PropertyValue", propertyID: "Australian Credit Licence (licensee)", value: acl });
  if (abn) ids.push({ "@type": "PropertyValue", propertyID: "ABN", value: abn });
  return ids;
}

/** The broker (Person #sulav). */
export function personJsonLd(): Json {
  const ids: Json[] = [];
  const cr = factValue("licence.creditRepresentativeNumber");
  if (cr && SITE.licence.representativeName === SITE.broker.name) ids.push({ "@type": "PropertyValue", propertyID: "Credit Representative number", value: cr });
  return {
    "@type": "Person",
    "@id": BROKER_ID,
    name: SITE.broker.name,
    givenName: SITE.broker.givenName,
    familyName: SITE.broker.familyName,
    jobTitle: SITE.broker.role,
    telephone: SITE.broker.phoneE164,
    email: `mailto:${SITE.broker.email}`,
    url: absoluteUrl("/about/sulav-adhikari"),
    worksFor: { "@id": BUSINESS_ID },
    knowsLanguage: confirmedLanguages().map((l) => l.code),
    ...(SITE.broker.photo ? { image: absoluteUrl(SITE.broker.photo.src) } : {}),
    ...(SITE.broker.linkedin ? { sameAs: [SITE.broker.linkedin] } : {}),
    ...(ids.length ? { identifier: ids } : {}),
  };
}

/** The business node (FinancialService #business). No street address: service-area business. */
export function orgJsonLd(): Json {
  const ids = licenceIdentifiers();
  const sameAs = [SITE.social.google, SITE.social.facebook, SITE.social.linkedin].filter(Boolean);
  return {
    "@type": "FinancialService",
    "@id": BUSINESS_ID,
    name: SITE.name,
    ...(SITE.legal.entityName ? { legalName: SITE.legal.entityName } : {}),
    url: ORIGIN,
    logo: absoluteUrl(SITE.logo.badgeLarge),
    image: absoluteUrl(SITE.logo.badgeLarge),
    description: "Mortgage broker based in New South Wales, helping first home buyers, refinancers, investors, new permanent residents and visa holders.",
    telephone: SITE.broker.phoneE164,
    email: `mailto:${SITE.contact.email}`,
    areaServed: SITE.serviceArea.areaServed.map((a) => ({ "@type": a.type, name: a.name })),
    founder: { "@id": BROKER_ID },
    employee: { "@id": BROKER_ID },
    knowsLanguage: confirmedLanguages().map((l) => l.code),
    contactPoint: {
      "@type": "ContactPoint",
      telephone: SITE.broker.phoneE164,
      email: SITE.contact.email,
      contactType: "customer service",
      areaServed: "AU",
      availableLanguage: confirmedLanguages().map((l) => l.label),
    },
    ...(ids.length ? { identifier: ids } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function websiteJsonLd(): Json {
  return { "@type": "WebSite", "@id": WEBSITE_ID, url: ORIGIN, name: SITE.name, inLanguage: "en-AU", publisher: { "@id": BUSINESS_ID } };
}

/** Site-wide graph: business + broker + website. Rendered once in the (site) layout. */
export function siteGraphJsonLd(): Json {
  return { "@context": "https://schema.org", "@graph": [orgJsonLd(), personJsonLd(), websiteJsonLd()] };
}

export type Crumb = { name: string; path: string };

export function breadcrumbJsonLd(crumbs: Crumb[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absoluteUrl(c.path) })),
  };
}

export type FaqItem = { question: string; answerText: string };

/** FAQPage. Pass plain-text answers (strip markup). Rich results are limited, but the markup is still useful context. */
export function faqJsonLd(items: FaqItem[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((q) => ({ "@type": "Question", name: q.question, acceptedAnswer: { "@type": "Answer", text: q.answerText } })),
  };
}

export function articleJsonLd(a: {
  path: string;
  headline: string;
  description: string;
  datePublished: string;
  dateModified: string;
  about?: Json | Json[];
  citations?: string[];
}): Json {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${absoluteUrl(a.path)}#article`,
    mainEntityOfPage: absoluteUrl(a.path),
    headline: a.headline,
    description: a.description,
    datePublished: a.datePublished,
    dateModified: a.dateModified,
    inLanguage: "en-AU",
    author: { "@id": BROKER_ID, "@type": "Person", name: SITE.broker.name, url: absoluteUrl("/about/sulav-adhikari") },
    reviewedBy: { "@id": BROKER_ID },
    publisher: { "@id": BUSINESS_ID },
    ...(a.about ? { about: a.about } : {}),
    ...(a.citations?.length ? { citation: a.citations } : {}),
  };
}

export function webAppJsonLd(a: { path: string; name: string; description: string }): Json {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${absoluteUrl(a.path)}#app`,
    name: a.name,
    description: a.description,
    url: absoluteUrl(a.path),
    applicationCategory: "FinanceApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    inLanguage: "en-AU",
    offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" },
    provider: { "@id": BUSINESS_ID },
  };
}

export function webPageJsonLd(a: { path: string; name: string; description: string; type?: string; about?: Json; mainEntity?: Json }): Json {
  return {
    "@context": "https://schema.org",
    "@type": a.type ?? "WebPage",
    "@id": `${absoluteUrl(a.path)}#webpage`,
    url: absoluteUrl(a.path),
    name: a.name,
    description: a.description,
    inLanguage: "en-AU",
    isPartOf: { "@id": WEBSITE_ID },
    publisher: { "@id": BUSINESS_ID },
    ...(a.about ? { about: a.about } : {}),
    ...(a.mainEntity ? { mainEntity: a.mainEntity } : {}),
  };
}

/** Renders one JSON-LD block. `<` is escaped so content can never close the script tag. */
export function JsonLd({ data }: { data: Json | Json[] }) {
  return createElement("script", {
    type: "application/ld+json",
    dangerouslySetInnerHTML: { __html: JSON.stringify(data).replace(/</g, "\\u003c") },
  });
}
