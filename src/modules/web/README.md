# `src/modules/web` — public website design system

The public site (`src/app/(site)/**`) is built only from this module. Read `app/FRONTEND.md` first
(non-negotiables: no fabrication, Australian English, compliance, sourced facts, indexing).

```
web/
  config.ts            SITE facts, PATHS, NAV, FOOTER_GROUPS, LEGAL_LINKS, FACT_LABELS, LAUNCH_BLOCKERS
  seo.ts               buildMetadata, JSON-LD helpers, <JsonLd>
  format.ts            hours/date/AUD formatting (en-AU)
  fonts.ts             Fraunces, IBM Plex Sans, IBM Plex Sans Devanagari (next/font)
  sitemap-entries.ts   sitemap registry (append your pages here)
  styles/web.css       tokens + every component style, scoped under .web, class prefix mw-
  components/          see below; barrel export in components/index.ts
```

## Rules for anyone adding pages

1. **URLs are slash-less**: `/home-loans/refinancing`. Use `PATHS.*` from `config.ts`; add new paths there.
2. **Never invent a fact.** Unknown → `null` in `SITE` + label in `FACT_LABELS`, render with `<Fact path="…"/>`
   (shows a dashed `[Label]` token and is listed in `LAUNCH_BLOCKERS`). Ad hoc unknowns: `<Placeholder label="…"/>`.
3. **Metadata**: every page exports `metadata = buildMetadata({ title, description, path })`.
   Programmatic pages pass `noindex: !record.reviewed`. Indexing is only ever on when `SEO_INDEXING=on`.
4. **Disclaimer** on every content, service, visa, suburb and calculator page: `<Disclaimer />` or `<Disclaimer variant="calculator" />`.
5. **Government rules** (duty, grants, FIRB, visas) come from the rules data with `sourceUrl` + `verifiedAt`,
   and appear in `<Sources>` with `checkedAt`. Only show `<ReviewedStrip>` when Sulav has actually signed the page off.
6. **No interest rates**, no "#1 / best / lowest / guaranteed / independent", "free" only next to the commission explanation.
7. **One accent per section**, gold ≤10% of the viewport. Only one `tone="ink"` section per page. Left-aligned headings.
8. Styling: compose the components; for one-offs use Tailwind utilities (they win over `.web` styles because
   web.css lives in `@layer components`). Don't add new colours; use the tokens.

## Tokens (`.web` in `styles/web.css`)

| Token | Value | Use |
|---|---|---|
| `--mw-ink` | `#1B1712` | text, ink sections, footer |
| `--mw-paper` | `#FAF6EF` | page background |
| `--mw-sand` | `#F3ECE0` | alternate section, tags |
| `--mw-surface` | `#FFFFFF` | cards, forms |
| `--mw-text-2` / `--mw-text-3` | `#4A4238` / `#6B6155` | body / meta (both AA on paper) |
| `--mw-line` / `--mw-line-strong` | `#E6DCCD` / `#CFC3B1` | hairlines, borders |
| `--mw-gold-500` | `#BA7200` | fills, large numerals, rules, icons, focus ring (never small text) |
| `--mw-gold-600` | `#9A5E00` | buttons (white text), links, small gold text |
| `--mw-gold-700` | `#7E4F05` | hover |
| `--mw-gold-300` | `#D99A2B` | gold on ink |
| `--mw-radius` / `--mw-radius-sm` | 12px / 10px | everywhere |

Type: `.mw-display` (hero H1 38→64px), `.mw-h1`, `.mw-h2`, `.mw-h3` (Fraunces), `.mw-h4` (Plex 600),
`.mw-lede`, `.mw-body`, `.mw-small`, `.mw-eyebrow`, `.mw-num` (tabular figures). Wrap a phrase in `<em>` inside a
display/H1/H2 for the italic gold accent (once per page at most).

## Layout

### `WebChrome` (layout/WebChrome.tsx)
`.web` scope + fonts, skip link, `SiteHeader`, `<main id="main">`, `SiteFooter`, site-wide JSON-LD graph
(FinancialService `#business`, Person `#sulav`, WebSite). Used by `src/app/(site)/layout.tsx` and `src/app/not-found.tsx`.
Don't render it again inside pages.

### `SiteHeader` / `SiteFooter`
Driven entirely by `NAV`, `HEADER_ACTIONS`, `FOOTER_GROUPS`, `LEGAL_LINKS`, `SITE`. Change config, not markup.
Desktop nav ≥1140px (dropdowns: click, hover, ArrowDown, Escape); below that a full-height sheet.

### `Container`
```tsx
<Container>…</Container>            // 1200px + gutters
<Container width="narrow">…</Container> // 800px
```

### `Section` / `SectionHeader`
```tsx
<Section id="how-it-works" tone="paper|sand|white|ink" layout="stack|split|split-even" size="default|tight"
  index="03" eyebrow="How it works" title="From first call to settlement" lede="…" action={<LinkButton …/>}>
  {children}
</Section>
```
`split` puts the header in a sticky left column (5/12) and children on the right (7/12). Section ids give
`aria-labelledby` automatically.

### `PageIntro` — header for inner pages
```tsx
<PageIntro crumbs={[{ name: "About", path: PATHS.about }]} eyebrow="About us" title="…" lede="…"
  actions={<LinkButton href={PATHS.book} arrow>Book a consultation</LinkButton>}
  aside={<ConsultationCard />} media={<Seal center="monogram" />} />
```

### `ArticleLayout` — guides, visa pages, long service pages
```tsx
<ArticleLayout
  crumbs={[{ name: "Visa and PR home loans", path: PATHS.visaHomeLoans }, { name: "Subclass 491", path: PATHS.visa491 }]}
  eyebrow="Visa and PR home loans" title="Home loans for subclass 491 visa holders" lede="…"
  summary={<p>Yes, but…</p>}                       // quick answer box
  reviewed={{ reviewedAt: "2026-11-02", updatedAt: "2026-11-02" }} // ONLY after broker sign-off
  toc={[{ id: "lenders", label: "What lenders look at" }, …]}
  footer={<><Faq items={…} /><Sources items={…} /><Disclaimer /></>}
>
  <Prose><section id="lenders"><h2>What lenders look at</h2>…</section></Prose>
</ArticleLayout>
```
Desktop: sticky rail with scroll-spy ToC + compact `BrokerCard` (override with `rail`, `null` hides it). Mobile: "On this page" disclosure.

### `LegalLayout`
`/legal/*` template. Shows the draft notice while `LEGAL_PAGES_DRAFT` is true (also used for `noindex`).
```tsx
<LegalLayout title="Credit Guide" slug="credit-guide" lastUpdated="2026-10-26" toc={TOC}>
  <section id="about"><h2>About this guide</h2>…</section>
</LegalLayout>
```

## UI primitives

### `Heading`, `Eyebrow`
```tsx
<Eyebrow index="02">Visa and PR home loans</Eyebrow>
<Heading level={1} size="display">Home loans for … <em>visa holders</em></Heading>
<Heading level={2}>Section title</Heading>   // size defaults to the level
```

### `Button`, `LinkButton`, `TextLink`
```tsx
<LinkButton href={PATHS.book} arrow>Book a consultation</LinkButton>             // primary gold 600
<LinkButton href={PATHS.refinancing} variant="secondary" size="lg" arrow>I'm refinancing</LinkButton>
<LinkButton href={SITE.broker.phoneHref} variant="quiet" icon={<Phone size={18} strokeWidth={1.5} />}>0416 066 954</LinkButton>
<Button type="submit">Send</Button>
<TextLink href={PATHS.creditGuide} arrow>Credit Guide</TextLink>
<TextLink href="https://www.revenue.nsw.gov.au/" external>Revenue NSW</TextLink>
```
One primary button per view. Inside `tone="ink"` primary turns gold 300 with ink text automatically.

### `Fact`, `Placeholder`
```tsx
Australian Credit Licence <Fact path="licence.licenseeAcl" />
<Placeholder label="Broker's local note (80–200 words)" />
```

### `Callout`
```tsx
<Callout tone="note|warning|draft|answer|tip" title="Before you sign">…</Callout>
```

### `IndexList` — hairline link list (use instead of icon-card grids)
```tsx
<IndexList columns={2} numbered items={[{ href, title, description, meta?, mark? }]} />
```
`mark` can be a lucide icon (`<Calculator size={22} strokeWidth={1.5} />`). Without marks the left column collapses.

### `Seal`
```tsx
<Seal center="badge" />                 // horse badge with circular lettering (CTA band)
<Seal center="monogram" />              // "SA" monogram, used until SITE.broker.photo exists
<Seal center="none" text="…" />         // rings + lettering only (watermark)
```

## Content components

### `Breadcrumbs` (+ BreadcrumbList JSON-LD; "Home" is added for you)
```tsx
<Breadcrumbs items={[{ name: "Stamp duty", path: PATHS.stampDuty }, { name: "NSW", path: PATHS.stampDutyNsw }]} />
```

### `Faq` (+ FAQPage JSON-LD)
```tsx
<Faq items={[
  { question: "Can I buy on a 491?", answer: "Plain string answer." },
  { question: "…", answer: <><p>JSX answer</p></>, answerText: "Plain-text version for JSON-LD" },
]} />
```
Set `jsonLd={false}` if the page already emits another FAQPage.

### `ReviewedStrip`
```tsx
<ReviewedStrip reviewedAt="2026-11-02" updatedAt="2026-11-10" sourcesHref="#sources" />
```

### `Sources`
```tsx
<Sources items={[{ title: "Transfer duty rates", publisher: "Revenue NSW", url: "https://…", checkedAt: "2026-10-26" }]} />
```
Renders `id="sources"`.

### `Disclaimer`
```tsx
<Disclaimer />                       // general information
<Disclaimer variant="calculator" />  // + estimate/not-a-quote wording
```

### `LicenceStatement`
ASIC format in full, from config. `<LicenceStatement withAbn={false} />`.

### `KeyFacts` (alias `StatRow`) — verifiable facts only
```tsx
<KeyFacts items={[{ value: 60, unit: "min", label: "First consultation" }, { value: <Fact path="lenderPanel.count" />, label: "Lenders on our panel" }]} />
```

### `WorkedExampleTable`
```tsx
<WorkedExampleTable caption="Buying a $750,000 unit with a 10% deposit" rowHeader="Item"
  columns={[{ key: "amount", label: "Amount", numeric: true }]}
  rows={[{ label: "Purchase price", cells: { amount: formatAud(750000) } }, { label: "Total upfront", cells: { amount: "…" }, total: true }]}
  assumptions={["Owner-occupier, established home", "Duty checked against Revenue NSW on 26 October 2026"]} />
```

### `Steps`
```tsx
<Steps items={[{ title: "A 60-minute consultation", body: "…", meta: ["60 minutes", "Phone or video"] }]} />
<Steps variant="row" items={…} />    // four columns on desktop
```

### `PointGrid` — short titled points in hairline columns
```tsx
<PointGrid columns={2|3} items={[{ title: "Visa grant notice", body: "…" }]} />
```

### `SituationSelector`
```tsx
<SituationSelector />                                  // numbered index (home)
<SituationSelector variant="chips" current={PATHS.refinancing} />
```
Default items: `SITUATIONS` (first home, visa/PR, refinance, investment, construction, debt consolidation).

### `VisaIndex` — subclass numerals as display type (designed for `tone="ink"`)
```tsx
<VisaIndex />   // VISA_TILES: 189, 190, 491, 191, 482, PR
```

### `BrokerCard`
```tsx
<BrokerCard />                       // feature: seal/portrait, bio, credentials, Book + phone + profile link
<BrokerCard variant="compact" />     // rails and sidebars
```

### `ConsultationCard`
Booking card with consultation hours from config. `<ConsultationCard title="Book 60 minutes with Sulav" />`.

### `TrustRow`
```tsx
<TrustRow items={[{ icon: <Clock size={20} strokeWidth={1.5} />, children: <><strong>We reply within 1 business day</strong></> }]} />
```

### `ReviewBadge`
Only from `SITE.reviews` (real rating + count + source link). `{SITE.reviews && <ReviewBadge review={SITE.reviews} />}`.

### `CtaBand`
```tsx
<CtaBand />                                      // section with default booking copy
<CtaBand title="Talk it through with Sulav" tone="ink" />
<CtaBand bare headingLevel={3} />                // no section wrapper, e.g. inside an article
```

### `Prose`
Wrap long-form HTML. Direct children or `<section>` children get rhythm; h2/h3, lists (gold dash), tables,
blockquote, dl are styled.

### `EnquiryForm` (client)
```tsx
<EnquiryForm sourcePage={PATHS.firstHomeBuyersNsw} defaultPurpose={["Buy a home"]} />
```
Posts multipart to `/api/forms/mmf-3012` (fields from `src/modules/site/lead/definition.ts`, so leads still create
CRM cases) plus hidden `source_page` (stored as `meta.sourcePage`) and `_url`. Inline validation, error summary,
success state with a booking link, privacy + Credit Guide link.

### `AfcaContact`
AFCA contact block for complaints/hardship/Credit Guide.

## SEO helpers (`seo.ts`)

```ts
export const metadata = buildMetadata({ title: "Home loans for 491 visa holders", description: "…", path: PATHS.visa491, noindex: !reviewed, ogType: "article" });
<JsonLd data={articleJsonLd({ path, headline, description, datePublished, dateModified, about, citations })} />
<JsonLd data={webAppJsonLd({ path: PATHS.stampDutyNsw, name: "NSW stamp duty calculator", description })} />
<JsonLd data={webPageJsonLd({ path, name, description, type: "WebPage", about, mainEntity })} />
breadcrumbJsonLd(crumbs) · faqJsonLd(items) · orgJsonLd() · personJsonLd() — Breadcrumbs/Faq emit theirs automatically.
```
Reference the business as `{ "@id": BUSINESS_ID }` and the broker as `{ "@id": BROKER_ID }`. No `AggregateRating`.

## Sitemap

`src/app/sitemap.ts` flattens `SITEMAP_SOURCES` from `sitemap-entries.ts`. Hand-written pages: append to
`STATIC_ENTRIES`. Programmatic pages: push an (async) source returning only published + reviewed records:
```ts
SITEMAP_SOURCES.push(async () => (await publishedSuburbs()).map((s) => ({ path: `/mortgage-broker/nsw/${s.slug}`, lastModified: s.updatedAt, indexable: s.reviewed })));
```
`robots.ts` disallows everything unless `SEO_INDEXING=on`, and always disallows `/admin`, `/api`, `/portal`, `/account` and other private routes.

## Page skeletons (from research §5.3)

Service / visa page: `ArticleLayout` with `summary` (direct answer) → eligibility table (`WorkedExampleTable` or
`Prose` table) → worked example → `PointGrid` "what lenders look at" → documents checklist → common mistakes →
`Faq` → `CtaBand bare` → `Sources` → `Disclaimer`.

Calculator page: `PageIntro` → calculator → result card CTA (`LinkButton` to `PATHS.book`) → assumptions →
`Disclaimer variant="calculator"` → `webAppJsonLd`.

### Notes
- Prose list styles only apply to plain lists (`ul`/`ol` without a class); component lists keep their own styling.
- `CtaBand compact` hides the seal for narrow columns (inside `ArticleLayout`).
