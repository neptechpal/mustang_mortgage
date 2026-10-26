# Mustang Mini CRM update — 26 October 2026

Port of the complete 1,860-line `../backup/update-2026-10-26/mmcrm-changes.diff`, checked against the updated plugin and the original plugin. Paths below are relative to the app root. No git commit was made.

## Behaviour checklist and implementation

### Applicants, New Client and enquiry forms

| Change in the updated plugin | Next.js implementation |
| --- | --- |
| New Client: “Number of applicants”, choices 1–4, showing each applicant’s name, email and mobile. First name remains required; email is optional in this staff wizard. | `src/modules/crm/components/WizardForm.tsx`, `src/modules/crm/actions.ts` (`wizardCreateAction`). |
| Wizard fields `app_count`, `p1_*` through `p4_*`; keep the original first-two-applicant fields working. | `wizardCreateAction`; `prisma/schema/crm.prisma` retains app1/app2 and adds explicit app3/app4 fields plus `applicantCount`. |
| “Additional info (details of the conversation)”; contact type, optional lead source and conversation text. Contact choices: Met in person, Phone call, Video call, Email / message, Referral, Walk-in / other. | `WizardForm.tsx`; `contact_type`, `lead_source`, `conv_notes` in `wizardCreateAction`. |
| Always file an initial conversation Broker Note, including time, staff author, contact/source, loan purpose/amount, PAYG/self-employed choice and all supplied contacts. An empty conversation gets “No conversation details were entered.” | `wizardCreateAction`, `src/modules/crm-extra/lib/notes.ts` (`addBrokerNote`). Note title begins “Initial conversation”. |
| Positive wizard loan amounts initialise the new deal percentages using income defaults; preserve presets, assigned forms, welcome-email options and automatic chase choices. | `wizardCreateAction`, `dealSaveData` in `src/modules/crm-extra/lib/income.ts`; existing automation and send-form calls retained. |
| Extra applicants survive into the case, Fact Find and emails. PHP saves extras in `_mmcrm_extra_apps`, while several PHP readers still only read applicants 1–2. | All four are first-class case columns. `src/modules/crm/applicants.ts` supplies shared names, emails, inferred count and search fields; the following rows cover integration beyond PHP’s partial extra-applicant storage. |
| Case applicant editor, contact details and labels support four applicants; reducing the selected count clears deselected contact fields on save. | `CaseClient.tsx`, `src/app/admin/cases/[id]/page.tsx`, `saveApplicantsAction`. |
| Lists, kanban, search and case selectors include all four names, emails and mobiles. | `src/modules/crm/queries.ts`, `src/modules/crm/cases.ts`, `src/modules/crm-extra/lib/cases.ts`, `src/app/admin/factfinds/page.tsx`, `src/app/admin/borrowing/page.tsx`. |
| Prefill mapped applicant fields and count into Fact Find; counts 3/4 also display applicant 2. Existing designated form schemas retain their custom sections. | `forms/service.ts` (`prefillFromCase`, `factFindSchema`), `forms/defaults.ts` (`classicFactFind`, `defaultFactFind`, `withFourApplicants`); applicant-2 sections are extended for applicants 3/4 when needed. |
| Save mapped fields back to the case and expose new mapping choices to the form builder. | `forms/engine.ts` (`CASE_MAP_OPTIONS`, `caseMapColumn`), `forms/service.ts` (`syncToCase`): app3/app4 name/email/mobile/DOB and `applicant_count`. Incoming counts can grow alongside new contacts without overwriting existing contact details. |
| Email recipients and greetings must include all four applicants without changing first-two placeholder names. | `crm/email.ts`, `crm-extra/lib/merge.ts`, both email composers, `crm/actions.ts`, `crm-extra/actions/email.ts`, `crm-extra/case-panels.tsx`; new applicant3/4 placeholders also appear in `src/app/admin/templates/[id]/page.tsx`. |
| Keep contact matching, marketing contact synchronisation and downstream exports consistent with four applicants. | `crm-extra/lib/marketing.ts`, `crm-extra/lib/trail.ts`, `crm-extra/lib/flex.ts`, `crm/zip.ts`, both CRM download routes, Broker Notes print route. Portal greeting updated in `crm/components/Portal.tsx`. |
| Website enquiry: applicant count and conditional contact sections for applicants 2–4. Original keys `full_name`, `email`, `mobile`, `purpose`, `loan_amount`, `timeframe`, `notes` remain valid. New keys are `applicant_count`, `full_name_2..4`, `email_2..4`, `mobile_2..4`. | `src/modules/site/lead/definition.ts`, `LeadForm.tsx`, `server.ts`, `src/modules/web/components/forms/EnquiryForm.tsx`, `forms/defaults.ts`. Old public requests without a count default to 1. Only selected applicants are validated. |
| Public first name, email and mobile are required; selected extra applicants require a name, with optional email/mobile. “Additional info (details of the conversation)” maps to a Broker Note. | Public definition and schema; hidden applicants are stripped by the existing forms engine. |
| Upgrade the stock seven-field public enquiry form, without replacing customised forms. PHP performs this once using `mmcrm_enquiry_v2`. | `upgradeEnquirySchema`: recognises the exact old public field-key set. Applied on schema reads and WP import, idempotently. Updated WP samples also receive missing extra-applicant/count mappings. The source option is imported as `crm.enquiryV2`. |
| Public case titles include the applicants’ names; public submissions create an audit note even with empty additional info. | `forms/service.ts` (`createCaseFromPublic`, `saveFormNotes`): all four names, source form, timestamp, “Submitted details”, non-table answer summary. Public notes use author `System`. |
| A custom form field mapped to `broker_note` appends its answer on submission; it is not a Case column. Blank mapped answers do not create a non-public note. | `forms/engine.ts`, `forms/service.ts` (`saveFormNotes`, `saveFormAnswers`), `crm/factfind.ts` (`commitSubmit`). Fields used for notes are not duplicated in the public submission summary. |

### Printing submissions

| Change | Next.js implementation |
| --- | --- |
| Staff “Print” action on every assigned form and Fact Find, including draft views. | `/admin/cases/[id]/forms/[formId]/print`, where `formId` is `ff` or a numeric form ID; `forms/print.ts`, `CaseClient.tsx`, case page. |
| Print each saved version using zero-based `v`; omit `v` for latest. Invalid/out-of-range versions fall back to latest; no history prints the draft with the unsubmitted warning. | `printSubmission` reads `FactFindSubmission` in chronological order or `CaseForm.history`. Per-version links are in the case Forms tab. |
| The existing Fact Find print URL remains usable. | `/admin/factfinds/case/[id]?print=1&v=…` now uses the same `SubmissionPrint` renderer. |
| Client completed cards get “Print / save a copy”; print uses the existing case token. | `crm/components/Portal.tsx`, `/portal/print?mm_case=…&mm_key=…&form=…`, `clientPrintUrl`. Supports Fact Find and other completed forms. |
| Staff-only author/IP details, token validation and noindex. | Staff route requires `requireStaff`; portal route uses `authPortal`, rejects closed portals and invisible/removed assignments. Client output omits submitted IP and printing staff identity. Routes are dynamic and set noindex/no-referrer. |
| Branded A4 document: logo, company/broker contact, form title, MM case reference, client contacts, submission time, selected version, printed time, signature, confidential footer, print/PDF control and automatic print dialog. | `crm/components/SubmissionPrint.tsx`, existing `PrintButton.tsx`, `forms/print.ts`; `@page`/`@media print` hide application chrome, repeat table headings naturally and keep signature rows together. Branding reads existing borrowing/core options. |
| Form section summaries and repeater tables; fallback groups for classic Fact Find answers. | `forms/print.ts` and existing forms `summary`; classic groups cover loan, all applicants, expenses, assets, liabilities, preferences, declaration and other fields. |
| Typed electronic signatures and signature timestamps. User also requires signature images. | `printSubmission` and `SubmissionPrint` support typed names, inline PNG/JPEG/WebP signatures and case-owned stored raster files. SVG/active URLs are not embedded as signatures. Classic signatures use the existing case signature timestamp when field timestamps are absent. |

### Deal value and income

| Change | Next.js implementation |
| --- | --- |
| “Deal value & income” panel replaces the old commission split inputs. Fields: Loan amount, Bank pays you upfront, Aggregator keeps, Trail commission (per year), Settlement date. | `crm-extra/components/DealValue.tsx`, `crm-extra/actions/commission.ts`, `crm-extra/case-panels.tsx`, case page. |
| One-click bank chips 0.60/0.65/0.70/0.75/0.80%; aggregator 10/15/20/25%; trail 0.15/0.20/0.25%. | `DealValue.tsx`, kit buttons with selected state and live output. |
| Live “Upfront — you receive”, bank gross, aggregator deduction, “Trail — you receive” per month/year/first five years, retained share and income-dashboard link. | `DealValue.tsx`, shared `dealAmounts` maths. The default-estimate badge stays until the deal is saved. |
| New meta `_mmcrm_bank_pct`, `_mmcrm_agg_pct`, `_mmcrm_trail_pct`, `_mmcrm_deal_v2`, `_mmcrm_settle_date`; backward-compatible legacy writes. | `Case.bankPct`, `aggregatorPct`, `trailPct`, `dealV2`, `settlementDate`; `dealSaveData` also saves `loanAmount`, `commPct = bank/100`, `commMmPct = 100−aggregator`. |
| Automatic legacy conversion and live defaults until explicitly saved. | `readDeal`: old fractional/plain bank rate and MM retained share convert on read; fallback `mm_loan_amount`, `mm_commission_pct`, `mm_commission_to_mm_pct` remain available in `Case.meta`. No destructive backfill or double-normalisation. |
| Default bank 0.70%, aggregator 20%, trail 0.20%; monthly trail goal $3,000, FY upfront goal $150,000; paydown on. | `INCOME_DEFAULTS`, `getIncomeSettings`, `/admin/income` settings form, `saveIncomeSettings`. Each option uses `getSetting`/`setSetting` under `crmx.income.*`. |
| Bank/trail normalisation: nonpositive→0; strictly below 0.05→×100; otherwise unchanged. Aggregator: positive fraction below 1→×100; clamp 0–100. | `normIncomePct`, `normAggregatorPct`; used by panel saves, planner and settings. A saved v2 zero stays zero. |
| Australian settlement date and deal classification; completed fallback date; unsuccessful/undated archived exclusions. | `readDeal`, `validSettlementDate`, `sydneyDate`. See the explicit PHP quirks below. |
| Every existing case-facts/commission summary now uses income after the aggregator deduction and exposes monthly trail. | `crm/cases.ts`, `crm-extra/lib/cases.ts`, `crm/queries.ts`, `/admin/commissions`, case header “Your income”. |
| Dashboard renames commission estimate to “Est. upfront income” and links to income with trail on active cases. | `src/app/admin/page.tsx`, shared case facts and `readDeal`. |
| New Income admin destination with staff access, personalised headline and Work navigation entry. | `src/app/admin/income/page.tsx`, `src/app/admin/nav.ts`, existing `commissions` icon mapping. |
| KPIs: monthly locked-in trail and annual equivalent; likely pipeline trail; upfront current month/last month/Australian FY; pipeline deal/loan/upfront/trail values and weighted values; total upfront/settled loans and averages. | `computeIncome`, `crm-extra/components/IncomeDashboard.tsx`. Only deals with positive loan and positive bank rate, classified settled/pipeline, enter this dashboard. |
| Trail goal ring, remaining amount and average-deal count, milestones, next milestone and FY upfront target bar. | `IncomeDashboard.tsx`, SVG ring and CSS progress bar. Milestones: $500, $1k, $2k, $3k, $5k, $7.5k, $10k, $15k, $20k, $30k monthly. |
| Past 12 months of upfront income and current/next 11 months of settled plus likely pipeline trail. | `computeIncome`, accessible CSS bar charts in `IncomeDashboard.tsx`; no chart dependency. Current month highlighted; per-month values exposed in labels/tooltips. |
| Stage probabilities and estimated settlement lead times; overdue estimates move to today +14 days. | `STAGE_PROB`, `STAGE_LEAD_DAYS`, `computeIncome`; lead times start at case creation, not its last modification. Table marks estimated dates. |
| “What is one more deal worth?” planner with loan/bank/aggregator/trail and deals/month inputs. | `planIncome`, `IncomeDashboard.tsx`; defaults to average loan rounded to $1k (otherwise $650k) and 2 deals/month. Shows one deal, 12-month pace and 3-year trail book. |
| “Every deal” table, settled first sorted newest; pipeline sorted earliest settlement; All/Settled/Pipeline filters, case links, rates and estimated/default badges. | `IncomeDashboard.tsx`. |
| Editable goals/defaults/paydown restricted to administrators, while staff can view income. | `requireAdmin` in `saveIncomeSettings`; page only renders the settings form to ADMIN. Borrowing Capacity rate and term feed paydown projections. |

### Mobile field notes and remaining diff changes

| Change | Next.js implementation |
| --- | --- |
| `[mmcrm_notes]` and `[mmcrm_broker_notes]` become a phone-friendly logged-in staff notes app in WP. | `/admin/field-notes`, `src/modules/crm-extra/components/FieldNotes.tsx`, Work nav “Field notes”. **Per the explicit request, this is admin-only: no shortcode/public-page implementation and no staff-only link on the public website.** |
| WP AJAX `mmcrm_fn_cases`: search cases, optional completed/archived inclusion, latest activity sorting, stage/status/note count, 500 candidate cap, 40 displayed results. | Server action `fieldNoteCases` in `crm-extra/actions/field-notes.ts`; search includes title, case reference and all four contacts. Default excludes completed/archive/unsuccessful. |
| WP AJAX `mmcrm_fn_case`: case contact links and latest 40 notes, author/date/relative date and full-history count. | `fieldNoteCase`, `FieldNotes.tsx`; link to full case/Broker Notes. |
| One-tap call, WhatsApp and email; WhatsApp digit cleanup, leading `00` removal or Australian `0`→`61` conversion. | `crm-extra/lib/field-notes.ts` (`whatsappNumber`), action contact payload, client links for all four applicants. |
| Note types WhatsApp, Phone call, Meeting, Email / SMS, General note; optional From client/To client direction and heading. | `NOTE_TYPES`, `FieldNotes.tsx`, `addFieldNote`. |
| WP AJAX `mmcrm_fn_add`: append only, required text, max 20,000 characters, timestamped heading, recorded type/direction/time/byline and “via mobile notes”; activity/event entry. | `addFieldNote`: staff auth at every action, server validation, escaped body, one transaction for note/event/activity/case modification. No edit/delete controls in this route. |
| Dropped-signal draft retention; prevent double taps; suppress same case/text/type retries by same staff within 60 seconds. | localStorage per user and case retains text, heading, direction, type and request ID. Save failures retain drafts. Database advisory transaction lock + recent event hash + unique request/content source key avoid concurrent and late retries without discarding edited drafts. |
| Phone dictation guidance. | Keyboard-mic hint retained; optional Web Speech API dictation added as explicitly requested, with typing fallback when unavailable. |
| Field-notes noindex and staff-only asset/application access. | Existing protected/noindex admin shell; `requireStaff` on route/actions. Note display strips active HTML and keeps basic text formatting. |
| Shared `mmcrm_add_broker_note` appends notes with generated ID, time and author, used by wizard/forms/field notes. | `addBrokerNote` and Prisma-generated IDs/timestamps; `BrokerNote` is the same audit store used by existing Broker Notes screens. |
| `MMCRM_Core::save_meta` fixes a recursive title suffix update by unhooking before updating. | Existing `crm/cases.ts` (`createCase`) already creates once then adds the reference with a single explicit update; no save hook recursion exists. Retained equivalent behaviour. |
| Case UI forces functional metaboxes visible/open, including field requests/portal; only WP slug metabox stays hidden. | Native case tabs and panels (`CaseClient.tsx`, case page) have no persisted WP hidden/closed-metabox preferences. Functional panels remain accessible; no WordPress screen-option state to migrate. |
| Changed automation portal/status block in the unified diff. | These particular hunks differ only in line endings. Existing `setPortal`/status-close automation is retained; no duplicate rule or new email trigger introduced. Actual wizard/CSS/JS changes are covered above. |
| Nested arrays formatted as “N item(s)” instead of PHP array-to-string output. | `forms/engine.ts` (`formatValue`); flat arrays still join with commas, repeaters still render actual tables in summaries. |
| README and new CSS/JS assets advertise/style the above features. | This checklist plus native React components, admin UI kit/lucide icons and existing public-site form styling. No WordPress assets, jQuery, extra UI library or chart library added. |

## WordPress action equivalents

| Updated WP action | Next.js entry point |
| --- | --- |
| `admin_post_mmcrm_wizard_create` | Authenticated `wizardCreateAction` server action. |
| `wp_ajax_mmcrm_form_save`, `wp_ajax_nopriv_mmcrm_form_save` | Existing CRM form-save route and `saveFormAnswers`; public enquiry also enters through `/api/forms/[formId]` and `handleLeadSubmission`. Both now file mapped Broker Notes. |
| `admin_post_mmcrm_print_submission`, `admin_post_nopriv_mmcrm_print_submission` | Staff print route and token-authenticated `/portal/print`. |
| `admin_post_mmcrm_income_save` | Admin-only `saveIncomeSettings` server action. |
| `wp_ajax_mmcrm_fn_cases`, `wp_ajax_mmcrm_fn_case`, `wp_ajax_mmcrm_fn_add` | Staff-only `fieldNoteCases`, `fieldNoteCase`, `addFieldNote` server actions. |
| `wp_ajax_mmcrm_portal_toggle` / status-change hook hunk | Existing portal-toggle/status automation retained; the supplied hunk is line-ending-only. |

Next.js server-action CSRF/origin checks and session checks replace WordPress action nonces; portal printing keeps the case token rather than granting anonymous access by case ID.

## Formula and date contract

All percentages after normalisation are ordinary percentages. For loan `L`, bank rate `B`, aggregator share `A`, trail rate `T`, retained fraction `K = 1 − A/100`:

- Gross upfront = `L × B/100`; your upfront = gross upfront × `K`.
- Gross annual trail = `L × T/100`; your annual trail = gross annual trail × `K`; monthly trail = annual trail /12.
- Five-year trail is the sum for months **1 through 60**, each multiplied by the balance factor when paydown is on.
- Balance factor: `r = annualRate/1200`, `N = max(1, round(years×12))`; factor is 1 for months≤0, 0 for months≥N, `1−months/N` for r≤0, otherwise `((1+r)^N−(1+r)^months)/((1+r)^N−1)`.
- The dashboard uses Australia/Sydney calendar dates and the Australian financial year **1 July–30 June**, counting FY income through the current month.
- Stage `(probability, days from creation)`: new `(10%,100)`, awaiting-docs `(25%,80)`, submitted `(45%,55)`, pre-approved `(60%,45)`, full-approval `(85%,21)`, settlement `(95%,7)`. Unknown stage fallback `(20%,60)`.
- Planner: annual upfront = `deals/month ×12 × upfront`; additional monthly trail after 12 months = `deals/month ×12 × monthly trail`; three-year monthly book = current trail + `deals/month ×36 × monthly trail ×0.93` with paydown, or ×1 without paydown.

Worked example executed against the supplied PHP: $650,000, 0.7% bank, 20% aggregator, 0.2% trail, 6.2% interest, 30-year term gives $4,550 gross upfront, **$3,640 received**, $910 aggregator, **$86.6666666667/month**, $1,040/year, **$5,031.390301294077** first-five-year trail with paydown ($5,200 without). Two deals/month gives $87,360 upfront/year; with an existing $500/month trail book, the three-year planner gives $6,303.20/month.

## Schema and migration

Only `prisma/schema/crm.prisma` and `prisma/schema/crm-extra.prisma` were changed:

- `Case`: `applicantCount` (Int, default 1); app3/app4 Name, Email, Mobile, Dob (String, default empty); `dealV2` (Boolean, default false); `bankPct`, `aggregatorPct`, `trailPct` (nullable Float); `settlementDate` (String, empty or Sydney YYYY-MM-DD). Existing app1/app2 and commission columns remain.
- `BrokerNote`: nullable unique `sourceKey` for stable WordPress imports and idempotent mobile retries. Existing notes can retain null keys.
- No new models, third-party packages or changes to shared `src/lib`.

`scripts/migrate-wp.ts` and pure adapter `crm-extra/lib/wp-update.ts` handle:

| WordPress input | Destination / migration policy |
| --- | --- |
| `mm_app1_*`, `mm_app2_*`, optional direct `mm_app3_*`/`mm_app4_*`, `_mmcrm_extra_apps` | Applicant columns. Direct meta takes priority, then compact extras for applicants 3/4, then latest saved form answers. |
| `mm_applicant_count`, `applicant_count` in drafts/submissions | Count clamped 1–4 and raised to the highest populated applicant slot. First-two existing cases infer 2 without a mandatory backfill. |
| `_mm_ff_draft`, `_mmf_forms[*].draft/history` extra contacts | Recover unmapped website/form contacts using `applicantN_fullname/email/mobile/dob` and the new public key names. |
| `_mmcrm_deal_v2`, `_mmcrm_bank_pct`, `_mmcrm_agg_pct`, `_mmcrm_trail_pct`, `_mmcrm_settle_date` | New deal columns; plain percentages are imported without a second conversion. Existing `_mmc_*` commission values retain their original representation. |
| Old `mm_loan_amount`, `mm_commission_pct`, `mm_commission_to_mm_pct` | Retained in `Case.meta` for the PHP-compatible fallback reader. |
| `mmcrm_income` option | Individual `crmx.income.bank_pct`, `.agg_pct`, `.trail_pct`, `.goal_trail_month`, `.goal_fy_upfront`, `.paydown` settings with the PHP defaults for absent values. |
| `mmcrm_enquiry_v2`; `_mmf_schema` | Source flag retained as `crm.enquiryV2`; stock enquiry schema upgraded idempotently and missing new mappings supplied. Customised forms retained. |
| `_mmcrm_broker_notes` (including wizard/public/mobile notes), global/legacy note sources | Original note body, timestamp and author preserved. Stable `wp:…` source keys upsert notes. A matching previously imported row with no source key is adopted. Next.js notes and their IDs are preserved on reruns instead of deleting the entire case’s note history. Author ID 0 becomes System. |

The full WordPress migration was **not executed** against existing client data. Its new pure adapters are exercised by unit tests. The existing full-import script still refreshes other imported case children as before; only Broker Notes gained non-destructive stable-key imports.

## PHP ambiguities and deliberate adaptations

1. PHP’s “trail begins the following month” describes chart cashflow. Its locked-in run-rate KPI includes settlement month and even a future-dated deal marked completed. Both calculations are preserved and tested.
2. A completed case without a settlement date uses its current modified date. Later case edits can therefore change inferred income timing. It remains an inferred date until a settlement date is explicitly saved, matching PHP.
3. Unsuccessful always wins over settlement; an archived case with a past date is settled, with no date is excluded, and with a future date remains pipeline. Preserved.
4. PHP marks all legacy deals “assumed”, including those with a saved old upfront rate/share, because trail comes from defaults. The port preserves that flag. Legacy conversion is a read operation, not an eager irreversible rewrite.
5. PHP compacts `_mmcrm_extra_apps` and still has first-two-only readers. Empty omitted slots cannot be reconstructed from that array alone. Import preserves stored order; explicit meta/form answers are also recovered. This port intentionally completes all four-applicant integration requested by the task.
6. Browser PHP JavaScript sometimes falls back to 6.2%/30 years for falsy inputs, while its server helper uses configured values. The shared TypeScript maths consistently uses configured Borrowing Capacity values (the app currently defaults to 6.19%/30 years); the helper fallback/test oracle is 6.2%/30 years. It preserves zero-interest maths instead of silently replacing zero.
7. PHP only checks the settlement-date string shape. The port also rejects impossible dates such as 2026-02-30. Empty dates still clear the saved date.
8. PHP’s print implementation renders typed signatures. Raster signature support was added for the explicit image requirement; token print access is additionally limited to visible/assigned forms. The classic grouping also includes applicants 3/4.
9. Field notes remain inside admin, without any public-site entry point, as explicitly requested. Web Speech dictation and persistent per-draft retry IDs go beyond PHP’s keyboard-mic hint and 60-second-only retry guard.
10. PHP’s enquiry upgrade uses a global one-shot flag; the port recognises the exact original schema on read/import instead, making old databases work immediately and leaving customised forms intact.

## Verification

- `npx prisma validate`: passed.
- Local `mustang_dev` schema push and Prisma Client generation: passed. The first push requested acknowledgement for the new unique note key; information_schema confirmed that the column did not yet exist, so existing rows would all receive null. The local push with `--accept-data-loss` then applied this additive schema/index change successfully.
- Final exact `npx prisma db push --skip-generate && npx prisma generate`: passed; database already in sync, client generated successfully.
- `npx tsc --noEmit`: passed.
- `npx tsx --test src/modules/calc/__tests__/*.test.ts`: **63 passed**.
- `npx tsx --test src/modules/crm-extra/__tests__/income.test.ts`: **16 passed**. Covers PHP worked amounts, percentage thresholds, legacy conversion, zero rates, paydown, FY/DST, state priority, projections, all stage weights/lead times, planner, WP meta, four applicants, enquiry visibility/mapping and AU phone/HTML handling.
- Supplied PHP helper executed independently to obtain the worked-example oracle above; no WordPress bootstrap or email calls.
- `git diff --check`: passed.
- Port 3005 unauthenticated curl checks: `/admin/income`, `/admin/field-notes` and staff print return **307**; missing portal token returns **404**. Authenticated GET checks return **200** for income, field notes, New Client, public contact and staff print.
- The existing port-3005 process retains its pre-generation Prisma singleton and needs restarting to see new columns. This environment denies signalling that process. Fresh-instance fixture checks use a separate temporary local server on 3006.
- Fresh-instance synthetic fixture checks: passed for latest/individual/invalid-version-fallback form prints, Fact Find version selection, four contact names, raster signatures, staff access, valid/invalid portal tokens, closed portal/removed assignment rejection and omission of IP from the rendered client document. Next.js development debug scripts were excluded from the rendered-document assertion.
- Field-note fixture checks: unauthenticated calls create no note; simultaneous identical saves, repeated requests and a fresh request with identical content within 60 seconds create exactly one note; edited content with the original retry ID creates the second note. Author and mobile-note byline verified. All fixtures removed.
- Direct synthetic mapping checks: all four case contacts/count, four marketing contacts, Fact Find prefill, four-applicant email merges and the timestamped System enquiry Broker Note passed. These invoked mapping/note helpers, never form submission or mail functions. All fixtures removed.
- Browser screenshot attempt could not launch system Chrome in this environment. No visual screenshot verification is claimed.
- No emails sent, no forms submitted against real data, no full data import and no git commit.

## Files changed / added

The implementation inventory below is generated from the worktree for this port.

| Status | File |
| --- | --- |
| Added | [docs/mmcrm-update-2026-10-26.md](../docs/mmcrm-update-2026-10-26.md) |
| Modified | [prisma/schema/crm-extra.prisma](../prisma/schema/crm-extra.prisma) |
| Modified | [prisma/schema/crm.prisma](../prisma/schema/crm.prisma) |
| Modified | [scripts/migrate-wp.ts](../scripts/migrate-wp.ts) |
| Modified | [src/app/admin/borrowing/page.tsx](../src/app/admin/borrowing/page.tsx) |
| Added | [src/app/admin/cases/[id]/forms/[formId]/print/page.tsx](../src/app/admin/cases/[id]/forms/[formId]/print/page.tsx) |
| Modified | [src/app/admin/cases/[id]/page.tsx](../src/app/admin/cases/[id]/page.tsx) |
| Modified | [src/app/admin/commissions/page.tsx](../src/app/admin/commissions/page.tsx) |
| Modified | [src/app/admin/factfinds/case/[id]/page.tsx](../src/app/admin/factfinds/case/[id]/page.tsx) |
| Modified | [src/app/admin/factfinds/page.tsx](../src/app/admin/factfinds/page.tsx) |
| Added | [src/app/admin/field-notes/page.tsx](../src/app/admin/field-notes/page.tsx) |
| Added | [src/app/admin/income/page.tsx](../src/app/admin/income/page.tsx) |
| Modified | [src/app/admin/nav.ts](../src/app/admin/nav.ts) |
| Modified | [src/app/admin/notes/print/route.ts](../src/app/admin/notes/print/route.ts) |
| Modified | [src/app/admin/page.tsx](../src/app/admin/page.tsx) |
| Modified | [src/app/admin/templates/[id]/page.tsx](../src/app/admin/templates/[id]/page.tsx) |
| Modified | [src/app/api/admin/crm/cases/[id]/download/route.ts](../src/app/api/admin/crm/cases/[id]/download/route.ts) |
| Modified | [src/app/api/admin/crm/files/[id]/route.ts](../src/app/api/admin/crm/files/[id]/route.ts) |
| Added | [src/app/portal/print/page.tsx](../src/app/portal/print/page.tsx) |
| Added | [src/modules/crm-extra/__tests__/income.test.ts](../src/modules/crm-extra/__tests__/income.test.ts) |
| Modified | [src/modules/crm-extra/actions/commission.ts](../src/modules/crm-extra/actions/commission.ts) |
| Modified | [src/modules/crm-extra/actions/email.ts](../src/modules/crm-extra/actions/email.ts) |
| Added | [src/modules/crm-extra/actions/field-notes.ts](../src/modules/crm-extra/actions/field-notes.ts) |
| Added | [src/modules/crm-extra/actions/income.ts](../src/modules/crm-extra/actions/income.ts) |
| Modified | [src/modules/crm-extra/case-panels.tsx](../src/modules/crm-extra/case-panels.tsx) |
| Modified | [src/modules/crm-extra/components/DealValue.tsx](../src/modules/crm-extra/components/DealValue.tsx) |
| Modified | [src/modules/crm-extra/components/EmailComposer.tsx](../src/modules/crm-extra/components/EmailComposer.tsx) |
| Added | [src/modules/crm-extra/components/FieldNotes.tsx](../src/modules/crm-extra/components/FieldNotes.tsx) |
| Added | [src/modules/crm-extra/components/IncomeDashboard.tsx](../src/modules/crm-extra/components/IncomeDashboard.tsx) |
| Modified | [src/modules/crm-extra/lib/cases.ts](../src/modules/crm-extra/lib/cases.ts) |
| Added | [src/modules/crm-extra/lib/field-notes.ts](../src/modules/crm-extra/lib/field-notes.ts) |
| Modified | [src/modules/crm-extra/lib/flex.ts](../src/modules/crm-extra/lib/flex.ts) |
| Added | [src/modules/crm-extra/lib/income-settings.ts](../src/modules/crm-extra/lib/income-settings.ts) |
| Added | [src/modules/crm-extra/lib/income.ts](../src/modules/crm-extra/lib/income.ts) |
| Modified | [src/modules/crm-extra/lib/marketing.ts](../src/modules/crm-extra/lib/marketing.ts) |
| Modified | [src/modules/crm-extra/lib/merge.ts](../src/modules/crm-extra/lib/merge.ts) |
| Modified | [src/modules/crm-extra/lib/notes.ts](../src/modules/crm-extra/lib/notes.ts) |
| Modified | [src/modules/crm-extra/lib/trail.ts](../src/modules/crm-extra/lib/trail.ts) |
| Added | [src/modules/crm-extra/lib/wp-update.ts](../src/modules/crm-extra/lib/wp-update.ts) |
| Modified | [src/modules/crm/actions.ts](../src/modules/crm/actions.ts) |
| Added | [src/modules/crm/applicants.ts](../src/modules/crm/applicants.ts) |
| Modified | [src/modules/crm/cases.ts](../src/modules/crm/cases.ts) |
| Modified | [src/modules/crm/components/CaseClient.tsx](../src/modules/crm/components/CaseClient.tsx) |
| Modified | [src/modules/crm/components/Portal.tsx](../src/modules/crm/components/Portal.tsx) |
| Added | [src/modules/crm/components/SubmissionPrint.tsx](../src/modules/crm/components/SubmissionPrint.tsx) |
| Modified | [src/modules/crm/components/WizardForm.tsx](../src/modules/crm/components/WizardForm.tsx) |
| Modified | [src/modules/crm/email.ts](../src/modules/crm/email.ts) |
| Modified | [src/modules/crm/factfind.ts](../src/modules/crm/factfind.ts) |
| Modified | [src/modules/crm/forms/defaults.ts](../src/modules/crm/forms/defaults.ts) |
| Modified | [src/modules/crm/forms/engine.ts](../src/modules/crm/forms/engine.ts) |
| Added | [src/modules/crm/forms/print.ts](../src/modules/crm/forms/print.ts) |
| Modified | [src/modules/crm/forms/service.ts](../src/modules/crm/forms/service.ts) |
| Modified | [src/modules/crm/queries.ts](../src/modules/crm/queries.ts) |
| Modified | [src/modules/crm/zip.ts](../src/modules/crm/zip.ts) |
| Modified | [src/modules/site/lead/definition.ts](../src/modules/site/lead/definition.ts) |
| Modified | [src/modules/site/lead/LeadForm.tsx](../src/modules/site/lead/LeadForm.tsx) |
| Modified | [src/modules/site/lead/server.ts](../src/modules/site/lead/server.ts) |
| Modified | [src/modules/web/components/forms/EnquiryForm.tsx](../src/modules/web/components/forms/EnquiryForm.tsx) |
