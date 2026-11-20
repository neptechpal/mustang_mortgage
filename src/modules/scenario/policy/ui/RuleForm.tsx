import type { ScnPolicyRule } from "@prisma/client";
import { Save } from "lucide-react";
import { Button, Card, Field, Input, LinkButton, Textarea } from "@/components/admin/ui";
import { saveRuleAction } from "../admin";
import { CATEGORIES } from "../checks";
import { checkCatalogue, type Lookups } from "../data";
import { BASE, toDateInput } from "../meta";
import RuleFields from "./RuleFields";

/** Create / edit a rule. `rule` = the version being edited (draft → in place, otherwise → new draft version). */
export function RuleForm({ rule, lk, defaultLender, reviewDays, userName, cancelHref }: { rule: ScnPolicyRule | null; lk: Lookups; defaultLender?: number | null; reviewDays: number; userName: string; cancelHref?: string }) {
  const newVersion = rule && rule.status !== "draft";
  return (
    <form action={saveRuleAction} className="space-y-6">
      {rule && <input type="hidden" name="id" value={rule.id} />}
      <Card title="Scope, check & evidence" description={newVersion ? `Saving creates draft v${rule.version + 1} of ${rule.ruleKey}. v${rule.version} is not changed.` : undefined}>
        <RuleFields
          lenders={lk.lenders}
          products={lk.products}
          sources={lk.sources}
          checks={checkCatalogue()}
          categories={CATEGORIES}
          lockLender={Boolean(rule)}
          initial={{
            lenderId: rule?.lenderId ?? defaultLender ?? null,
            productId: rule?.productId,
            sourceId: rule?.sourceId,
            sourceSection: rule?.sourceSection,
            segment: rule?.segment,
            category: rule?.category,
            check: rule?.check,
            params: (rule?.params ?? {}) as Record<string, unknown>,
          }}
        >
          <Field label="Statement — the rule as written in the source" htmlFor="statement" required hint="Short and faithful to the source wording. Never paste commission or referral information.">
            <Textarea id="statement" name="statement" required rows={3} maxLength={2000} defaultValue={rule?.statement ?? ""} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Conditions" htmlFor="conditions" hint="What must be true / evidenced for the rule to apply.">
              <Textarea id="conditions" name="conditions" rows={3} maxLength={4000} defaultValue={rule?.conditions ?? ""} className="min-h-0" />
            </Field>
            <Field label="Exceptions" htmlFor="exceptions" hint="Stated exceptions or discretions.">
              <Textarea id="exceptions" name="exceptions" rows={3} maxLength={4000} defaultValue={rule?.exceptions ?? ""} className="min-h-0" />
            </Field>
          </div>
        </RuleFields>
      </Card>

      <Card title="Validity & review">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Effective from" htmlFor="effectiveFrom">
            <Input id="effectiveFrom" name="effectiveFrom" type="date" defaultValue={toDateInput(rule?.effectiveFrom)} />
          </Field>
          <Field label="Effective to" htmlFor="effectiveTo" hint="Blank = until replaced.">
            <Input id="effectiveTo" name="effectiveTo" type="date" defaultValue={toDateInput(rule?.effectiveTo)} />
          </Field>
          <Field label="Case #" htmlFor="caseId" hint="Only for a case-specific BDM response.">
            <Input id="caseId" name="caseId" type="number" min={1} inputMode="numeric" defaultValue={rule?.caseId ?? ""} className="tabular-nums" />
          </Field>
          <Field label="Verified on" htmlFor="verifiedAt" hint="Date checked against the source. Required to publish.">
            <Input id="verifiedAt" name="verifiedAt" type="date" defaultValue={newVersion ? "" : toDateInput(rule?.verifiedAt)} />
          </Field>
          <Field label="Review due" htmlFor="reviewDue" hint={`Blank = verified date + ${reviewDays} days.`}>
            <Input id="reviewDue" name="reviewDue" type="date" defaultValue={newVersion ? "" : toDateInput(rule?.reviewDue)} />
          </Field>
          <Field label="Reviewer" htmlFor="reviewer" hint="Defaults to you when verified.">
            <Input id="reviewer" name="reviewer" maxLength={120} defaultValue={newVersion ? userName : rule?.reviewer || userName} />
          </Field>
          <Field label="Change note" htmlFor="changeNote" hint={newVersion ? "What changed and why (shown in version history)." : "Optional — shown in version history."} className="sm:col-span-3">
            <Input id="changeNote" name="changeNote" maxLength={1000} defaultValue={newVersion ? "" : rule?.changeNote ?? ""} required={Boolean(newVersion)} />
          </Field>
        </div>
      </Card>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-end gap-2 sm:gap-3 rounded-xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-[0_8px_24px_-6px_rgba(15,23,42,0.15)] backdrop-blur">
        <p className="mr-auto hidden text-xs text-slate-500 sm:block">Saved as a draft. An admin publishes it.</p>
        <LinkButton href={cancelHref ?? `${BASE}?tab=rules`} variant="ghost">Cancel</LinkButton>
        <Button variant="primary"><Save />{newVersion ? `Save as draft v${rule.version + 1}` : rule ? "Save draft" : "Create draft rule"}</Button>
      </div>
    </form>
  );
}
