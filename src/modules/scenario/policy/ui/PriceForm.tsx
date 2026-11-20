import type { ScnPriceRecord } from "@prisma/client";
import { Save } from "lucide-react";
import { Button, Card, Field, Input, LinkButton, Select, Textarea } from "@/components/admin/ui";
import { savePriceAction } from "../admin";
import type { Lookups } from "../data";
import { BASE, OCCUPANCIES, REPAYMENT_TYPES, toDateInput } from "../meta";
import PriceScopeFields from "./PriceScopeFields";

function Money({ name, label, value, hint, suffix }: { name: string; label: string; value?: number | null; hint?: string; suffix?: string }) {
  return (
    <Field label={label} htmlFor={name} hint={hint}>
      <div className="relative">
        {!suffix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>}
        <Input id={name} name={name} type="number" min={0} step="any" inputMode="decimal" defaultValue={value ?? ""} className={suffix ? "pr-8 tabular-nums" : "!pl-7 tabular-nums"} />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">{suffix}</span>}
      </div>
    </Field>
  );
}

export function PriceForm({ price, lk, defaultProduct, reviewDays, userName, cancelHref }: { price: ScnPriceRecord | null; lk: Lookups; defaultProduct?: number | null; reviewDays: number; userName: string; cancelHref?: string }) {
  const newVersion = price && price.status !== "draft";
  return (
    <form action={savePriceAction} className="space-y-6">
      {price && <input type="hidden" name="id" value={price.id} />}
      <Card title="Product & evidence" description={newVersion ? `Saving creates draft v${price.version + 1} of ${price.recordKey}. v${price.version} is not changed.` : undefined}>
        <PriceScopeFields
          lenders={lk.lenders}
          products={lk.products}
          sources={lk.sources}
          lockProduct={Boolean(price)}
          initial={{ productId: price?.productId ?? defaultProduct ?? null, sourceId: price?.sourceId, pricingType: price?.pricingType, caseId: price?.caseId, sourceSection: price?.sourceSection }}
        />
      </Card>

      <Card title="Segment & pricing">
        <div className="grid gap-5 sm:grid-cols-4">
          <Field label="Occupancy" htmlFor="occupancy" required>
            <Select id="occupancy" name="occupancy" defaultValue={price?.occupancy ?? "owner_occupied"}>
              {OCCUPANCIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Repayment type" htmlFor="repaymentType" required>
            <Select id="repaymentType" name="repaymentType" defaultValue={price?.repaymentType ?? "PI"}>
              {REPAYMENT_TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="LVR from (%)" htmlFor="lvrMin" required hint="Exclusive lower bound of the band.">
            <Input id="lvrMin" name="lvrMin" type="number" min={0} max={100} step="any" required defaultValue={price?.lvrMin ?? 0} className="tabular-nums" />
          </Field>
          <Field label="LVR to (%)" htmlFor="lvrMax" required hint="Inclusive upper bound.">
            <Input id="lvrMax" name="lvrMax" type="number" min={0} max={100} step="any" required defaultValue={price?.lvrMax ?? 80} className="tabular-nums" />
          </Field>
          <Field label="Interest rate (% p.a.)" htmlFor="ratePct" required>
            <Input id="ratePct" name="ratePct" type="number" min={0.01} max={30} step="0.01" required defaultValue={price?.ratePct ?? ""} className="tabular-nums" />
          </Field>
          <Field label="Comparison rate (% p.a.)" htmlFor="comparisonPct">
            <Input id="comparisonPct" name="comparisonPct" type="number" min={0.01} max={30} step="0.01" defaultValue={price?.comparisonPct ?? ""} className="tabular-nums" />
          </Field>
          <Money name="upfrontFees" label="Upfront fees" value={price?.upfrontFees ?? 0} />
          <Money name="annualFee" label="Annual fee" value={price?.annualFee ?? 0} />
          <Money name="monthlyFee" label="Monthly fee" value={price?.monthlyFee ?? 0} />
          <Money name="cashback" label="Cashback" value={price?.cashback ?? 0} />
          <Field label="Cashback expiry" htmlFor="cashbackExpiry">
            <Input id="cashbackExpiry" name="cashbackExpiry" type="date" defaultValue={toDateInput(price?.cashbackExpiry)} />
          </Field>
          <Field label="Cashback terms" htmlFor="cashbackTerms" className="sm:col-span-4">
            <Textarea id="cashbackTerms" name="cashbackTerms" rows={2} maxLength={2000} defaultValue={price?.cashbackTerms ?? ""} className="min-h-0" placeholder="Eligibility, minimum loan, settlement deadline…" />
          </Field>
        </div>
      </Card>

      <Card title="Validity & review">
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Effective from" htmlFor="effectiveFrom">
            <Input id="effectiveFrom" name="effectiveFrom" type="date" defaultValue={toDateInput(price?.effectiveFrom)} />
          </Field>
          <Field label="Expires" htmlFor="expiresAt" hint="Rate sheet / quote expiry.">
            <Input id="expiresAt" name="expiresAt" type="date" defaultValue={toDateInput(price?.expiresAt)} />
          </Field>
          <Field label="Verified on" htmlFor="verifiedAt" hint="Required to publish.">
            <Input id="verifiedAt" name="verifiedAt" type="date" defaultValue={newVersion ? "" : toDateInput(price?.verifiedAt)} />
          </Field>
          <Field label="Review due" htmlFor="reviewDue" hint={`Blank = verified date + ${reviewDays} days.`}>
            <Input id="reviewDue" name="reviewDue" type="date" defaultValue={newVersion ? "" : toDateInput(price?.reviewDue)} />
          </Field>
          <Field label="Reviewer" htmlFor="reviewer">
            <Input id="reviewer" name="reviewer" maxLength={120} defaultValue={newVersion ? userName : price?.reviewer || userName} />
          </Field>
          <Field label="Change note" htmlFor="changeNote">
            <Input id="changeNote" name="changeNote" maxLength={1000} defaultValue={newVersion ? "" : price?.changeNote ?? ""} required={Boolean(newVersion)} />
          </Field>
        </div>
      </Card>

      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-end gap-2 sm:gap-3 rounded-xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-[0_8px_24px_-6px_rgba(15,23,42,0.15)] backdrop-blur">
        <p className="mr-auto hidden text-xs text-slate-500 sm:block">Saved as a draft. An admin publishes it.</p>
        <LinkButton href={cancelHref ?? `${BASE}?tab=pricing`} variant="ghost">Cancel</LinkButton>
        <Button variant="primary"><Save />{newVersion ? `Save as draft v${price.version + 1}` : price ? "Save draft" : "Create draft"}</Button>
      </div>
    </form>
  );
}
