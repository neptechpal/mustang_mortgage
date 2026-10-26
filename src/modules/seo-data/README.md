# seo-data — structured data for programmatic SEO pages

Data and types only (no UI, no calculators). Consumers: suburb guides `/mortgage-broker/nsw/{slug}/`, the NSW hub (LGA groups), visa guides `/visa-home-loans/{slug}/`. Spec: `../../../../research/programmatic-seo.md` Part C (§C4.1 suburb fields, §C4.4 visa fields, §C8 sources).

| File | What |
|---|---|
| `types.ts` | All types (`SuburbRecord`, `SuburbDataset`, `VisaPolicy`, `StateResidencyRule`, `SourceRef`, …) |
| `targets.ts` | Input list for the pull script: suburb name, ABS SAL code, URL postcode, batch |
| `data/suburbs.json` | Generated dataset (26 NSW suburbs: batch 1 × 11, batch 2 × 15) |
| `suburbs.ts` | Typed accessors: `SUBURBS`, `getSuburbBySlug`, `suburbsPassingDataGate`, `nearestPublished` |
| `lgas.ts` | `NSW_LGA_GROUPS` / `lgaGroupsFor(publishedSlugs)` for the NSW hub, derived from the dataset |
| `visas.ts` | `VISA_POLICIES` (11 records) + `STATE_RESIDENCY_RULES` (per state × residency class) |
| `scripts/pull-abs.ts` | Re-runnable fetch (ABS Data API + ASGS ArcGIS + NSW DCJ xlsx) → `data/suburbs.json` |
| `scripts/xlsx.ts` | Minimal dependency-free .xlsx reader used for the DCJ tables |

## Rules

- **Never fabricate.** A value we could not source is `null`; the reason is in `completeness.missing`, `notes` or `dcj.note`.
- Every field group carries a `sourceRef` (`source`, `sourceUrl`, `licence`, `attribution`, `year` or `quarter`/`period`). Show the attribution and "data last updated" (`pulledAt`) on the page.
- Visa/state facts carry `sourceUrls`, `verified`, `verifiedAt`. Anything `verified: false` must not be stated as fact on a page — link the official source instead.
- 2021 Census figures are labelled 2021 on the page (`medianRentWk2021`, …); pair them with the DCJ quarter for current rents/prices.

## Refresh

```bash
cd app
npx tsx src/modules/seo-data/scripts/pull-abs.ts     # ~2–3 min, no API keys
npx tsc --noEmit
```

- The script finds the latest DCJ `rent-tables-*-quarter.xlsx` and `sales-tables-*-quarter.xlsx` links on the DCJ report page automatically. Re-run each quarter (DCJ publishes rents ~1 quarter behind, sales ~2 quarters behind).
- ABS values change only with a new Census. When Census 2026 data is released (expected from mid-2027, verify), update the dataflow ids in `TABLES` (`C21_*` → the 2026 ids), the `year`, and SAL codes in `targets.ts` (ASGS 2026 SALs may be renumbered), then re-run.
- To add a suburb: add `{ name, salCode, postcode, state, batch }` to `targets.ts` (SAL code from the ABS `CL_SAL_2021` codelist / QuickStats URL), re-run. The script warns (in `notes`) if the postcode is not the dominant ASGS postal area.
- Review the console table: completeness per suburb and any notes. Diff `data/suburbs.json` before deploying.
- Visa/state facts (`visas.ts`) are hand-maintained: re-verify each official URL at least quarterly and on any budget/legislation announcement, then bump `verifiedAt`.

## Sources, licences, attribution

| Source | Used for | Licence | Attribution string |
|---|---|---|---|
| ABS Data API (SDMX) — Census 2021 GCP tables at SAL level: `C21_G01_SAL`, `G02`, `G09`, `G10`, `G13`, `G36`, `G37`, `G62` (`https://data.api.abs.gov.au/rest/data/ABS,C21_G02_SAL,1.0.0/.{SAL}.SAL.1`) | All `census.*` fields | CC BY 4.0 | `Source: ABS, Census of Population and Housing 2021, CC BY 4.0` |
| ABS QuickStats 2021 (`https://www.abs.gov.au/census/find-census-data/quickstats/2021/SAL{code}`) | Cross-check of top countries of birth; human verification link | CC BY 4.0 | as above |
| ABS ASGS Edition 3 ArcGIS services (`https://geo.abs.gov.au/arcgis/rest/services/ASGS2021/{SAL,LGA,POA,GCCSA}/MapServer`) | SAL point (centroid), area, LGA and postal-area overlap, GCCSA | CC BY 4.0 | `Source: ABS, Australian Statistical Geography Standard (ASGS) Edition 3, CC BY 4.0` |
| NSW DCJ Rent and Sales Report (`https://dcj.nsw.gov.au/about-us/families-and-communities-statistics/housing-rent-and-sales/rent-and-sales-report.html`) | `dcj.sales*`, `dcj.rent` | NSW Government copyright. Data.NSW lists the "Rent and Sales Tables" with "Licence specified by agency"; no explicit CC licence was found on the DCJ pages (checked 2026-10-26). Publish aggregates only, with attribution + link. **Confirm before launch.** | `Source: NSW Department of Communities and Justice, Rent and Sales Report, {period}` |

ABS licence/copyright: https://www.abs.gov.au/website-privacy-copyright-and-disclaimer

## Suburb data dictionary (`SuburbRecord`)

Identity / geography (`geoSourceRef`, ASGS 2021)

| Field | Meaning |
|---|---|
| `salCode`, `name`, `slug` (`{name}-{postcode}`), `state`, `postcode`, `batch` | Identity. Postcode = URL postcode from `targets.ts`, checked against `poaShares`. |
| `gccsa` | GCCSA containing the SAL point ("Greater Sydney" / "Rest of NSW"). |
| `lga` / `lgas[]` | Primary LGA (largest **area** share) and every LGA with ≥1% of the area (`code`, `name`, `areaSharePct`). Shares are grid-sampled from ASGS polygons, not population-weighted. |
| `poaShares[]` | ABS Postal Areas overlapping the suburb, by area. |
| `centroid {lat,lng}` | ASGS `SAL_PT` representative point. |
| `areaSqKm` | ASGS Albers area. |
| `selectionRule` | Which §C4.1 selection rule the suburb meets (`nepalBorn>=500`, `overseas>=50%&renters>=50%`, `none`). |

Census 2021 (`census`, `census.sourceRef`, `census.tableUrls` = per-table API query for the suburb)

| Field | ABS table / definition |
|---|---|
| `population` | G01 P_1, total persons (usual residence). |
| `bornOverseas`, `bornOverseasPct` | G01 B_O "Birthplace: Elsewhere" / total persons. |
| `australianCitizenPct` | G01 C_1 / total persons. |
| `nepalBorn`, `nepalBornPct` | G09 BPLP 7105, persons all ages / G09 total. |
| `topCountriesOfBirth[3]` (`code`, `name`, `count`, `pct`) | G09 ranking excluding Australia; `topCountriesCheck` = `match`/`replaced`/`unchecked` vs QuickStats. |
| `nepaliSpokenAtHome`, `nepaliSpokenAtHomePct` | G13 LANP 5206 (Nepali), persons / G13 total. |
| `arrived2016to2021` | G10 overseas-born persons arriving 2016 … Census night 2021 (2021 = Jan–10 Aug). |
| `arrivedLast5yrsPct` | `arrived2016to2021` / total population. |
| `arrivedLast5yrsPctOfOverseasBorn` | `arrived2016to2021` / overseas-born persons (G10 total). |
| `medianAge`, `medianHouseholdIncomeWk`, `medianPersonalIncomeWk`, `medianRentWk2021`, `medianMortgageRepayMth2021`, `avgHouseholdSize` | G02 medians (0 treated as null). |
| `occupiedPrivateDwellings`, `renterPct`, `ownerWithMortgagePct`, `ownedOutrightPct` | G37 tenure, % of occupied private dwellings (incl. not stated), as QuickStats. |
| `dwellingMix` | G36, % of occupied private dwellings: separate house / semi-detached, row, terrace, townhouse / flat or apartment / other / not stated. |
| `trainToWorkPct` | G62: employed persons whose trip included a train (train only + train and one other + train and two others) / all employed persons. **Census day was in the Greater Sydney COVID-19 lockdown** — understated; `workedAtHomePct` given for context. |

NSW DCJ (`dcj`)

| Field | Meaning |
|---|---|
| `sales` | Postcode-level sales for the latest DCJ sales quarter (`sourceRef.quarter`/`period`). Falls back to the primary LGA (`geography: "lga"`) only if the postcode has no strata/non-strata median. |
| `sales.medianSalePriceStrata` / `medianSalePriceNonStrata` / `medianSalePriceAll` | Median sale price, AUD (DCJ publishes $'000 — ×1000 here). Strata ≈ units/townhouses, non-strata ≈ houses. `*Sales` = count; `*SmallSample` = DCJ "s" flag (11–30 sales). Null = suppressed (≤10 sales) or none. |
| `salesLga` | Same fields for the primary LGA, for context (e.g. a house median when the postcode's is suppressed). |
| `rent.medianRentWkLatest` | Median weekly rent for new bonds, all dwellings, latest rent quarter. |
| `rent.rows[]` | Every dwelling type (`Total`/`House`/`Townhouse`/`Flat/Unit`/`Other`) × bedrooms row with a published median (`medianWk`, `newBonds`, `smallSample`). |
| `postcodeSharedWith[]` | Other dataset suburbs in the same postcode (their DCJ figures are identical — say "postcode 2140" on the page). |

Derived

| Field | Meaning |
|---|---|
| `nearest[]` | Up to 6 dataset suburbs within 25 km by centroid (haversine), nearest first. UI filters to published and shows 3–5 (`nearestPublished`). |
| `completeness {score, of: 14, missing[]}` | §C4.1 gate (≥10/14 to generate). The 14 groups: population, nepalBorn, bornOverseas (+ top 3), nepaliSpokenAtHome, arrivedLast5yrsPct, medianAge, medianHouseholdIncomeWk, rentAndRepayment2021 (both), tenure (renter + mortgage), dwellingMix, trainToWorkPct, dcjSalePrice (strata or non-strata), dcjRentLatest, nearest (≥3). |
| `notes[]` | Suburb-specific caveats (LGA straddle, shared postcode, small samples, suppressed medians). |

Not in this module (other owners): computed deposits/duty/5% cap check (calculator engine + `StateRules`), `brokerNote`, case studies, publish/review status.

## Visa data (`visas.ts`)

Records (`VISA_POLICIES`, slug = route under `/visa-home-loans/`): `subclass-189`, `subclass-190`, `subclass-491`, `subclass-191`, `subclass-482`, `subclass-494`, `subclass-186`, `permanent-residents`, `partner-visa` (820/801, 309/100 — two `stages`, fields describe the temporary stage), `bridging-visa` (010/020/030/050/051), `new-zealand-citizens` (444).

| Field | Meaning |
|---|---|
| `permanent`, `residencyClass` (`permanent` / `nz444` / `temporary` / `mixed`), `stayNote` | Visa status from Home Affairs. |
| `firb {foreignPerson, approvalRequired, note}` | FATA foreign-person status and whether FIRB approval is needed for residential land (FIRB Guidance Notes 2 v5 and 6 v5). |
| `establishedDwellingBan {applies, from, to}` | Ban on foreign persons buying established dwellings: 2025-04-01 → 2029-06-30 (extended in the 2026-27 Budget from 2027-03-31). |
| `newDwellingFirb {required}` | Approval needed for new dwellings / vacant land (fee amounts not stored; link `SRC.firbFees`). |
| `regionalCondition` | 491/494 condition 8579 + designated regional areas. `nswDesignatedRegionalCategory(postcode)` returns 2, 3 or null from the Home Affairs NSW postcode ranges (`NSW_DRA_POSTCODES`). |
| `stateRules[8]` | Per state: `surcharge`, `fhbConcession`, `fhog` as `yes`/`no`/`conditional`/`unknown` + short notes. Built from `STATE_RESIDENCY_RULES[class]` (+ overrides, e.g. NSW treats 309/820 like PR for surcharge). "conditional" for temporary visas = not eligible alone, only with a citizen/PR co-buyer. |
| `fiveDepositScheme`, `helpToBuy` | Federal scheme eligibility (5% scheme: citizens + PRs; Help to Buy: citizens only). |
| `typicalDocuments` | Common lender requests — lending practice, not a rule; broker to confirm. |
| `pathway` | Route to permanent residence (491/494 → 191 after 3 years; 482 → 186 TRT; 820 → 801; 309 → 100). |
| `typicalMaxLvrRange` | Always null until the broker supplies a verified range. |
| `verified`, `verifiedAt`, `unverifiedNotes[]` | `verified` is true only if every fact group on the record is verified. Currently false on every record because the SA entries are unverified (RevenueSA blocks automated access). Check each group's own `verified` flag when rendering. |

Dollar amounts, duty rates and thresholds are deliberately not here; the stamp-duty / `StateRules` engine owns them. `COMMON_FACTS` holds cross-page facts (ban dates, 5% scheme NSW cap regions).
