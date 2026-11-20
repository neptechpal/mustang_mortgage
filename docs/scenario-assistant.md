# AI Scenario Assistant — admin & developer guide

Built 2026-11-20 from the "Mustang Mortgage AI Scenario Assistant — Developer handoff". Broker-only; reuses the CRM login.

## Where it lives
| What | Where |
|---|---|
| Broker workspace | Case page → **Assess Scenario** (also on the website-enquiry submission page) → `/admin/cases/<id>/scenario` |
| Lender panel, sources, policy rules, pricing, review queue | `/admin/lender-policy` (staff draft; **ADMIN** publishes / supersedes / withdraws) |
| AI kill switch, model, privacy confirmation, checklist templates | `/admin/scenario-settings` (ADMIN) |
| Code | `src/modules/scenario/**`, schema `prisma/schema/scenario.prisma` |
| Tests (acceptance §8) | `npx tsx --test src/modules/scenario/__tests__/*.test.ts` |
| Synthetic demo data (dev only) | `npx tsx scripts/scenario-demo-seed.ts` / `--remove` |

## How an assessment works
1. **Facts** (`facts.ts`): 120+ structured fields with units and validation; each value records source (enquiry / case / broker) and a broker *Verified* tick. Blank = unknown — never assumed. Pre-filled from the website lead form (`mmf:3012`) and the case record.
2. **Calculations** (`calc.ts`, server-side): security value used, costs (duty from the verified state engine or a broker figure with source), contributions, loan used, capitalised LMI, LVR, deposit, funding gap, repayments on identical assumptions.
3. **Rules engine** (`policy/checks.ts`, `engine.ts`): every published rule of every panel lender/product is evaluated per applicant and for joint combinations. Status per option: *Potential fit / Conditional / Needs verification / Outside stated policy*. Missing facts, stale (never verified / review overdue / expired), conflicting rules and missing policy evidence for a relevant area all force **Needs verification**. Pricing is chosen by product, occupancy, repayment type and LVR band; expired / review-due pricing or an expired cashback shows **Verify pricing** and is excluded from verified comparisons. Lender calculator results are tied to a hash of the serviceability inputs and suppressed when inputs change. Ranking: tier → must-have features → verified 3-year cost → number of conditions. **Commission / referral revenue is never an input.**
4. **AI explanation** (`ai.ts`, `ai-core.ts`): optional. Sends only an allowlisted, reduced scenario (no names, contact details, suburb/postcode, exact dates, IDs, bank details or documents; free text is redacted) plus the published rules/prices whose source has *AI permission*. Claude returns structured JSON; the server rejects unknown lender/product IDs, claims without a cited source, claims citing another lender's source and claims containing figures not in the cited evidence. The AI can only keep or downgrade a status, never upgrade. No tools are offered — it cannot run commands, change policy, send messages or lodge anything. If AI is off/unavailable the rule-based results, tasks and template drafts still work.
5. **Saved analysis** (`ScnAssessment`): fact snapshot + hash, calc, engine result, exact rule/price/source versions used, prompt + calc versions, AI status/model, selections, rationale, drafts, reviewer. Editing facts marks current analyses *superseded*; reruns create a new run. Signed-off runs are locked and kept.
6. **Tasks** (`tasks.ts`): payslips, employment letters, visa evidence, savings history, gift letters, calculator runs, policy confirmations, conflicts, expired pricing, lender conditions, contract/finance/settlement dates. Each has owner, due date, status and is mirrored into the case's Notes & Reminders (so it shows on the dashboard). Reruns update open tasks, never duplicate them, never reopen completed ones, and close ones no longer needed.
7. **Compliance**: stage checklists (enquiry → settlement; templates in settings, **draft until the licensee/aggregator confirms**), Credit Guide / disclosure dates, and two human review gates (*Recommendation ready to share*, *Application ready to lodge*) that require a named reviewer + rationale and record blockers, evidence, calculator results and any override reason.

## Refreshing lender sources (admin routine)
1. New guide / rate sheet received → **Sources → Add** with kind, lender, reference/version, file or link; tick *Permission to store* (required to publish) and *Permission to send extracts to the AI provider* only if the lender/aggregator allows it. Publish.
2. For each changed rule/price: open it → **Edit** (creates a new draft version) → point it at the new source + section, set *Verified* and *Review due* → Publish (ADMIN). The old version becomes *superseded* automatically; history is kept.
3. Withdraw a source/rule that is no longer valid — the engine stops using it immediately.
4. **BDM confirmations**: add a source of kind *BDM confirmation* (paste the written answer, BDM name, date, case ID), then add a rule with the same check and the case ID — it overrides the general rule for that case only.
5. Work through **Review queue** weekly (review due, expiring pricing, unverified, drafts, missing permissions).
6. Use the same *segment* label only for rules that are true alternatives — different answers in the same segment are flagged as a conflict for broker review.

## Switching AI on (production)
1. Business confirms: privacy notice / collection statement covers AI-assisted analysis, consent approach, permitted uses, retention; AI provider assessment (Anthropic API: retention, no training on API data by default, subprocessors, overseas processing). Record it in Scenario settings (*Privacy confirmed* + note).
2. Scenario settings → **API key**: paste the Anthropic key and Save. It is stored encrypted (AES-256-GCM, key derived via HKDF from `SETTINGS_ENCRYPTION_KEY` if set, otherwise `SESSION_SECRET`), never shown again (only the last 4 characters), and a free connection test runs on save. *Test connection* / *Remove key* are on the same card. A key saved here overrides `ANTHROPIC_API_KEY` in `.env` (still supported as a fallback). If the server secret is ever rotated, the stored key becomes unreadable and the page asks for it again.
3. Turn on *AI explanations* in Scenario settings. Model default `claude-opus-5-5` (server-side refusal fallback enabled); `claude-sonnet-5-5` is the lower-cost option.
4. Turning AI off never disables the enquiry form or the lead workflow.

## Known limits (v1)
- Lender calculator results are broker-entered (no lender API).
- Duty / grant figures come from `src/modules/calc` (verified rules with dates) or a broker figure; LMI is broker-entered only.
- Policy is entered as structured rules + quoted statement per source section; documents are stored but not auto-parsed.
- Client communication is draft-only — nothing is sent from this module.
