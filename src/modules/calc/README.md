# `src/modules/calc` — money-calculation engines

Pure TypeScript (no React, no DB). Used by the public calculators and the programmatic state pages
(`/stamp-duty/<state>/`, `/first-home-buyers/<state>/`). YMYL: every government number lives in `rules/*.ts`
with its official source and the date it was checked.

## API

```ts
import { calcStampDuty } from "@/modules/calc/stampDuty";
calcStampDuty({
  state: "NSW", price: 900_000, propertyType: "established", // | "new" | "vacant-land" | "off-the-plan"
  firstHomeBuyer: true, foreignPurchaser: false, ownerOccupier: true,
  citizenOrPR?: true, buildContractPrice?, regional?, householdIncome?, dependants?, offThePlanStage?: "pre-construction",
  withMortgage?: true, contractDate?: "2026-10-26",
});
// → { baseDuty, transferDuty, concession, concessionName, surcharge, offThePlanConcession, mortgageRegFee, transferFee, totalGovtCosts,
//     fhogEligible, fhogAmount, otherGrants[], notes[], breakdown[], scaleUsed, rulesVerifiedAt, rulesVersion,
//     hasUnverified, sources[{label,url,verifiedAt}] }
```

- `price` is treated as the dutiable value (higher of price and market value).
- `foreignPurchaser` assumes the whole property is bought by foreign persons (surcharge on 100%). In QLD, VIC, WA, SA and TAS
  a foreign person is by definition not a citizen/PR, so citizen/PR-only concessions are also lost; in NSW a PR can be
  "foreign" (200-day rule) and keep the FHBAS. Mixed purchases (one foreign co-buyer) need the revenue office calculator.
- `ownerOccupier` selects the owner-occupier scale where one exists (VIC PPR ≤ $550k, QLD home concession, ACT Table 1,
  WA ≤ $200k) and is required for every first-home concession and grant.
- `regional` = outside the capital where a state has different caps (only WA FHOG north of the 26th parallel today).
- `transferDuty` excludes the foreign surcharge; `totalGovtCosts = transferDuty + surcharge + mortgageRegFee + transferFee`.
- The FHOG is returned separately (`fhogAmount`) and never deducted from duty.
- `hasUnverified` is true if any fact group used has `verified: false` — the UI must then show the official link
  instead of presenting the number as fact (FRONTEND.md non-negotiable 4).
- Lower-level helpers: `dutyFromScale(scale, value)`, `feeFromRule(rule, value)`, `fhbConcessionDuty(...)`.

```ts
import { calcRepayments, repaymentsByFrequency } from "@/modules/calc/repayments";
calcRepayments({ principal, annualRatePct, termYears, frequency?: "weekly"|"fortnightly"|"monthly",
  repaymentType?: "PI"|"IO", interestOnlyYears?: 5, extraPerPeriod?: 0, fortnightlyMethod?: "true"|"half-monthly" });
// → { repayment, interestOnlyRepayment?, principalAndInterestRepayment, monthlyEquivalent,
//     scheduled{periods,years,totalRepaid,totalInterest}, withExtra{…, interestSaved, periodsSaved, timeSavedYears}, yearly[], notes[] }

import { calcRefinance } from "@/modules/calc/refinance";
calcRefinance({ balance, remainingYears, currentRatePct, newRatePct, newTermYears?, switchingCosts?: number | Record<string, number>,
  currentAnnualFee?, currentMonthlyFee?, newAnnualFee?, newMonthlyFee?, capitaliseCosts? });
// → { currentMonthlyRepayment, newMonthlyRepayment, monthlySaving, upfrontCosts, breakEvenMonths|null, lifetimeSaving, … }

import { calcDeposit } from "@/modules/calc/deposit";
calcDeposit({ price, depositPcts?: [5,10,20], savings?, stampDuty?: { state, propertyType, firstHomeBuyer, … }, otherCosts?, schemeArea?: "capital"|"regional" });
// → { rows[{depositPct, deposit, loan, lvrPct, lmiLikely, cashNeeded}], fromSavings?, govtCosts, depositScheme?, notes[] }

import { estimateBorrowingPower } from "@/modules/calc/borrowing";
estimateBorrowingPower({ applicant1Gross, household: "single", productRatePct /* required, user-supplied */, … });
```

- **Rates are always user-supplied.** Nothing here publishes or defaults an interest rate (FRONTEND.md non-negotiable 3).
  `estimateBorrowingPower` throws without `productRatePct`.
- **LMI** is an indicator only (`lmiLikely` when LVR > 80%). No premium estimates — there is no published, citable table.
- `borrowing.ts` re-exports the existing maths in `src/modules/tools/serviceability/math.ts` unchanged (its tax table is
  FY2024-25 and its HEM figures are the old plugin's flat benchmarks — flagged, not changed).

## Rules data (`rules/`)

One `StateRules` record per jurisdiction (`nsw.ts … nt.ts`, typed in `types.ts`) plus `federal.ts` (5% Deposit Scheme,
Help to Buy, FIRB). Each fact group — duty scale, each FHB concession, each grant, the surcharge, fees, other concessions — has:

| field | meaning |
|---|---|
| `sourceUrls[]` | the official page/PDF/legislation/calculator the value was checked against |
| `verifiedAt` | ISO date it was last checked |
| `verified` | `false` = could not be confirmed on an official source; `note` says why |
| `effectiveFrom` / `effectiveTo` | contract dates the rule covers (where relevant) |

Concessions the engine models are data in `concessions[]` (first-home schemes, plus non-first-home exemptions such as the
ACT off-the-plan unit exemption with `requiresFirstHomeBuyer: false`), `totalDutyConcessions[]` (WA off-the-plan: % of
transfer duty + surcharge, capped) and owner-occupier scales. Band kinds (`FhbBand`): `exempt`, `taper-saving-from-lower` (NSW), `taper-duty`,
`marginal`, `concession-table` (QLD), `max-saving`). Information-only concessions (`otherConcessions`, `modelled: false`)
are surfaced as notes with their source.

## Freshness policy

- A fact is **stale** when `verifiedAt` is more than **90 days** old: `isStale(verifiedAt)` in `freshness.ts`.
- `auditFreshness(ALL_RULES)` (from `rules/index.ts`) lists every stale or unverified fact group — use it as a build gate for the programmatic
  pages (programmatic-seo.md C4.2: "Every numeric rule has a sourceUrl and verifiedAt ≤ 90 days. The build fails if stale.").
- Pages show "Checked against <revenue office> on <verifiedAt>" from `result.sources` / `rulesVerifiedAt`.
- Any rules change needs broker sign-off before the affected pages are re-marked `reviewed`.

## How to update (each year, and whenever a budget changes a rule)

1. **1 July every year**: NSW (CPI-indexed thresholds), and any state that publishes new financial-year tables, plus all
   land-titles fees (they change every 1 July). Check each `sourceUrls` entry; update numbers, `effectiveFrom`,
   `rulesVersion`, `verifiedAt`.
2. **State budgets (May–June) and federal budget**: re-check FHB concessions, grants (amounts, caps, end dates),
   surcharges, the 5% Deposit Scheme caps and Help to Buy caps.
3. Every **≤ 90 days**: re-open each source, confirm nothing changed, bump `verifiedAt`.
4. Re-run the official calculator cases in `__tests__/*.test.ts` (each test cites its source) and update expectations
   only from the official source — never from our own output.
5. `npx tsx --test src/modules/calc/__tests__/*.test.ts` and `npx tsc --noEmit` must pass.

## What the rules say today (contracts signed 26 Oct 2026)

| | General duty | First home buyer duty | FHOG / grants | Foreign surcharge | Govt fees (transfer / mortgage) |
|---|---|---|---|---|---|
| NSW | 2026-27 CPI-indexed scale; premium 7% over $3.87m; value rounded up to $100; $20 min | FHBAS: homes exempt ≤ $800k, taper to $1m; land ≤ $350k, taper to $450k; citizen/PR | $10k new homes ≤ $600k (build ≤ $750k) | 9% | $182.73 / $182.73 |
| VIC | 2021 scale, 5.5% of whole $960k–$2m, half-down rounding; PPR rates ≤ $550k | Exempt ≤ $600k, (V−600k)/150k × duty to $750k — any home type incl. established and land | $10k new homes ≤ $750k | 8% FPAD | $104.30 + $2.34/$1k (max $3,614) / $129.20 |
| QLD | Sch 3 + home concession rates (owner-occupier) | Established: Sch 4A table (nil ≤ $700k, none ≥ $800k); new home / vacant land: nil, no cap; specified-resident rule from 1 Aug 2026 | $30k new homes < $750k (permanent from 1 Jul 2026) | 8% AFAD | $248.04 + $46.56/$10k over $180k / $248.04 |
| WA | General rate; s 147 rate ≤ $200k home | FHOR from 7 May 2026: home nil ≤ $600k, $16.15/$100 to $800k; land nil ≤ $450k, $20.14/$100 to $550k | $10k new homes ≤ $800k (≤ $1m north of 26th) | 7% | $225.10–$255.10 + $20/$100k over $200k / $225.10 |
| SA | 2002 scale | Nil for new / off-the-plan / vacant land, no cap; established homes: none | $15k new homes, no cap | 7% | $204–$353 + $105/$10k over $50k / $204 |
| ACT | Table 2 (non-owner-occupier) / Table 1 (owner-occupier); 4.54% of whole over $1.455m | HBCS: nil at any price from 1 Jul 2026 (no income/value cap; no property in last 5 years; no citizenship test). Off-the-plan unit exemption for any owner-occupier | none (FHOG ended 2019) | none on duty | $496 / $184 |
| TAS | 2013 scale, $50 min | None for contracts now (established-home exemption ended 30 Jun 2026) | $20k new homes, 1 Jul 2026 – 30 Jun 2027, no cap | 8% FIDS | $256.76 / $167.58 |
| NT | Quadratic ≤ $525k, 4.95% / 5.75% / 5.95% of whole; down to 5c | None (house-and-land package exemption is info only) | HomeGrown $50k new homes to 30 Sep 2027; FreshStart $30k (non-FHB) | none | $181 / $181 |

Commonwealth (`rules/federal.ts`): 5% Deposit Scheme caps from 1 Jul 2026 (NSW $1.5m capital & regional centres / $800k
other; VIC $950k/$650k; QLD $1m/$700k; WA $850k/$600k; SA $900k/$500k; TAS $700k/$550k; ACT $1m; NT Darwin $750k / rest
$600k), no income caps or place limits since 1 Oct 2025, citizens/PRs; Help to Buy open since 5 Dec 2025 (citizens only,
income caps $103k single / $165k joint or single parent for 2026-27, own caps incl. NSW $1.3m); FIRB established-dwelling
ban 1 Apr 2025 – 30 Jun 2029; FHSS $15k/yr, $50k total.

### Known caveats
- VIC transfer-fee cap: the regulation arithmetic gives $3,614.30; Land Use Victoria's guide (not readable by script) is
  reported as $3,614.00 — we use $3,614. VIC FHB concession rounding (truncate) follows the SRO calculator, not the Act.
- WA rounds duty down to 5 cents and counts whole $100s in the off-the-plan taper — calculator behaviour, no statute found.
- ACT rounds the value up to $100 even in the flat 4.54% band (calculator behaviour; max $4.54 difference).
- Not modelled (shown as notes): VIC temporary off-the-plan concession (construction-cost deduction, to 21 Apr 2027),
  VIC/ACT/SA pensioner and seniors concessions, ACT newly-unit-titled exemption, NT house-and-land package exemption,
  QLD/VIC/WA/SA partial (shared) foreign interests, QLD specified foreign retirees.
- Sites that block scripts (revenue.act.gov.au, revenuesa.sa.gov.au, nt.gov.au, ato.gov.au, land.vic.gov.au,
  landservices.com.au) were read via legislation registers, a real browser or Wayback copies of the official pages; each
  record's `note` says which.

## Replaces `src/modules/tools/stamp-duty/brackets.ts`

The old port is wrong in ways that matter (do not reuse it): NSW 2024-25 brackets and 8% surcharge (now 9%), and a wrong
FHBAS taper ($900k: $17,515 vs $19,594); QLD sets FHB duty to the concession amount ($650k → $17,350, should be $0) and to
$0 above $800k, and pays the $30k FHOG on established homes; VIC PPR rates applied above $550k and the FHB taper inverted
($650k: $23,833 vs $11,356), FHOG not checked for new homes; SA and TAS give $0 duty to every FHB (SA relief is new homes
only; the TAS exemption has ended); ACT and NT add an 8% foreign surcharge that doesn't exist; NT deducts a $10k FHB
discount and pays $10k on established homes (both ended); WA FHB uses May 2024 – Mar 2025 thresholds and never fires
(it compares the PPR/investment field with "Established Home"); grants are paid regardless of new vs established;
land-titles fees are out of date in every state.

## Tests

```
npx tsx --test src/modules/calc/__tests__/*.test.ts
```

Each state test file uses the revenue office's own worked examples or its online calculator outputs (source in a
comment), plus threshold edge cases.
