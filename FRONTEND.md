# Public website rebuild — brief for contributors

We are replacing the Elementor-replica public site with a new, original, clean design and the information architecture + programmatic SEO plan from research. The staff admin (`/admin`) is out of scope (already redesigned).

## Read first
- `../research/business-facts.md` — what we actually know about the business. **Never invent facts** beyond it.
- `../research/competitor-research.md` — §5.2 anti-patterns, §5.3 IA, §5.4 homepage order, §5.5 design direction, §5.6 compliance.
- `../research/programmatic-seo.md` — Part C (page types, data fields, sections, schema, quality gates, batch 1 URLs).
- Old copy (for facts only, not wording): `../backup/live_mirror/page_*.html`, `src/modules/site/content/*.ts`.

## Non-negotiables
1. **No fabrication.** No invented reviews, ratings, review counts, lender counts, years of experience, loans settled, awards, client stories, photos of people, qualifications, memberships or languages. Where the real value is unknown use the config placeholders in `src/modules/web/config.ts` (rendered as a visible bracketed token like `[Credit Representative number]` and listed as launch blockers). Sulav speaking Nepali is NOT confirmed — say "Nepali-speaking support" only via `SITE.languages` config (default `["English"]`, Nepali flagged `TODO confirm`).
2. **Australian English and Australian terms**: settlement (not closing), payslips, conveyancer/solicitor, repayments (often fortnightly), credit file/credit score, LMI, LVR, transfer (stamp) duty, FHBAS, FHOG, First Home Guarantee/5% Deposit Scheme, FIRB. Owner-occupier interest is NOT tax deductible. No US terms.
3. **Compliance** (competitor-research §5.6): full licence statement block in footer from config; Credit Guide / Privacy / Complaints (AFCA) / Financial hardship / Important information pages; general-information disclaimer on every content/calculator page; **no interest rates published**; no "#1/best/lowest/guaranteed/independent"; "free" only with the commission explanation; no financial-planning language.
4. **Facts with sources.** Any government rule (duty, grants, FIRB, visa conditions) must come from the rules data with `sourceUrl` + `verifiedAt` and be shown on the page ("Checked against Revenue NSW on …"). If you can't verify, say so and link the official source rather than stating a number.
5. **Copy voice**: plain, specific, calm, first person plural for the business, Sulav named as the broker. Short sentences. Concrete numbers and examples. Banned: "nestled, vibrant, seamless, unlock, elevate, empower, embark, journey, tailored, bespoke, cutting-edge, game-changer, peace of mind, dream home, look no further, in today's…, navigate the complexities, one-stop shop, trusted partner, stress-free, hassle-free", rhetorical question openers, emoji, exclamation marks in headings.
6. **Indexing**: staging must not be indexed. `src/modules/web/seo.ts` decides: indexable only when `SEO_INDEXING=on` (production env); canonicals always use `SITE.canonicalOrigin` (https://www.mustangmortgage.com.au). Programmatic pages additionally require `reviewed=true` (broker sign-off) to be indexable/in sitemap.

## Design system (heritage-modern)
- Palette (tokens in `src/modules/web/styles/web.css` under `.web`): ink `#1B1712`, ivory paper `#FAF6EF` (page bg), white surfaces, warm greys (no blue-grey), gold 500 `#BA7200` (fills, large numerals, rules, icons only), gold 600 `#9A5E00` (buttons with white text, links, small gold text), gold 700 `#7E4F05` hover, gold 300 `#D99A2B` (gold text on ink). Gold ≤10% of a viewport; one accent per section; no gradients on gold.
- Type: Fraunces (display, H1/H2, big numbers; light/regular weights, soft optical size) + IBM Plex Sans (UI/body) + IBM Plex Sans Devanagari (Nepali). Load via next/font. Body 17–18px/1.55, measure 60–72ch, H1 56–64px desktop / 36–40 mobile, tabular-nums for figures.
- Layout: max width ~1200px, 12-col, 8px spacing scale, 96–128px section rhythm desktop, 56–72 mobile. Radius 10–12px everywhere. Left-aligned headlines. Fewer, longer sections with substance.
- Imagery: no stock people/mansions/isometric illustrations. No photos of people we don't have. Use typography, data, the horse badge as a seal/watermark, thin gold keylines, simple line icons (lucide, 1.5px). Real Sydney photography can be added later via config slots.
- Signature components: broker card with booking button (monogram seal until a portrait is supplied), calculator result card with CTA, worked-example table, "Reviewed by / updated / sources" strip, licence footer block, FAQ accordion (+FAQPage JSON-LD where allowed), breadcrumbs (+BreadcrumbList JSON-LD), CTA band.
- Motion: subtle; respect prefers-reduced-motion. Accessibility WCAG 2.2 AA (contrast, focus rings gold 500, keyboard nav, skip link).
- Mobile first; check 390px and 1440px.

## Architecture
- New module `src/modules/web/**` (design system components, config, seo helpers, content data). Public routes live in `src/app/(site)/**` and use the new `(site)/layout.tsx` chrome (Elementor CSS no longer loaded).
- Keep working (restyle into new chrome, don't break): `/book-appointment` (+ `/manage/[token]`), `/portal`, `/portal/form/[id]`, `/factfind`, `/login`, `/register`, `/account`, `/password-reset`, `/logout`, `/user`, `/members`, and all `/api/**`.
- Old URLs → 301 to new IA in `next.config.ts` redirects (lead owns): `/services`→`/home-loans/`, `/about-us`→`/about/`, `/stamp-duty`→`/stamp-duty/` hub, `/serviceability`→`/calculators/borrowing-power/`, `/elementor-2749`→`/calculators/npr-aud-converter/`, `/tax-calc`→`/calculators/`, `/mustang-mortgage`→`/`, `/secure-upload*`→`/portal`.
- Trailing slashes: NO trailing slashes (Next default; `/api` and callbacks must not be redirected). Canonicals/links are slash-less, e.g. `/home-loans/refinancing`. Old WP `/x/` URLs get stripped by Next then 301-mapped.
- Enquiry form: post to existing `/api/forms/mmf-3012` (fields per `src/modules/site/lead/definition.ts`) so leads still create CRM cases; add hidden `source_page` field.
- Verify visually: `node scripts/admin-shot.mjs http://localhost:3005 /path out.png 1440` works for public pages too (dev server at http://localhost:3005).
- `npx tsc --noEmit` must pass. No git commits. Don't run `prisma db push` (ask lead).
