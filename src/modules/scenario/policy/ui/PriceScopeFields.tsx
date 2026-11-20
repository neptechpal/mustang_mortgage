"use client";
// Pricing editor: product (grouped by lender) scopes the source list; confirmed quotes need a case.
import { useMemo, useState } from "react";
import { Field, Input, Select } from "@/components/admin/ui";
import type { LenderLite, ProductLite, SourceLite } from "../data";
import { PRICING_TYPES, sourceKindLabel, statusLabel } from "../meta";

export default function PriceScopeFields({
  lenders, products, sources, initial, lockProduct,
}: {
  lenders: LenderLite[];
  products: ProductLite[];
  sources: SourceLite[];
  initial: { productId?: number | null; sourceId?: number | null; pricingType?: string; caseId?: number | null; sourceSection?: string };
  lockProduct?: boolean;
}) {
  const [productId, setProductId] = useState(initial.productId ? String(initial.productId) : "");
  const [sourceId, setSourceId] = useState(initial.sourceId ? String(initial.sourceId) : "");
  const [pricingType, setPricingType] = useState(initial.pricingType || "published");
  const lid = products.find((p) => String(p.id) === productId)?.lenderId ?? 0;
  const scoped = useMemo(
    () => sources.filter((s) => (s.lenderId === null || s.lenderId === lid) && (s.status === "draft" || s.status === "published" || String(s.id) === sourceId)),
    [sources, lid, sourceId],
  );
  const src = sources.find((s) => String(s.id) === sourceId);
  const quote = pricingType === "confirmed_quote";

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Product" htmlFor="productId" required hint={lockProduct ? "Fixed for all versions of this price record." : undefined}>
          {lockProduct && <input type="hidden" name="productId" value={productId} />}
          <Select
            id="productId"
            name={lockProduct ? undefined : "productId"}
            required
            disabled={lockProduct}
            value={productId}
            onChange={(e) => {
              setProductId(e.target.value);
              const nl = products.find((p) => String(p.id) === e.target.value)?.lenderId;
              if (src && src.lenderId !== null && src.lenderId !== nl) setSourceId("");
            }}
          >
            <option value="">Select product…</option>
            {lenders.map((l) => {
              const ps = products.filter((p) => p.lenderId === l.id);
              if (!ps.length) return null;
              return (
                <optgroup key={l.id} label={`${l.name} (${l.code})`}>
                  {ps.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code}){p.active ? "" : " — inactive"}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </Select>
        </Field>
        <Field label="Pricing type" htmlFor="pricingType" required hint={quote ? "A confirmed quote applies to one case only." : "Published = on the rate sheet; conditional = discretionary / needs approval."}>
          <Select id="pricingType" name="pricingType" value={pricingType} onChange={(e) => setPricingType(e.target.value)}>
            {PRICING_TYPES.map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Field
          label="Source"
          htmlFor="sourceId"
          required
          hint={src && src.status !== "published" ? `Source is ${statusLabel(src.status).toLowerCase()} — publish it before this record.` : "Rate sheet, aggregator data or a written BDM quote."}
        >
          <Select id="sourceId" name="sourceId" required value={sourceId} onChange={(e) => setSourceId(e.target.value)} disabled={!lid}>
            <option value="">{lid ? "Select source…" : "Select a product first"}</option>
            {scoped.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
                {s.reference ? ` · ${s.reference}` : ""} — {sourceKindLabel(s.kind)}
                {s.lenderId === null ? " (panel-wide)" : ""}
                {s.caseId ? ` (case #${s.caseId})` : ""}
                {s.status !== "published" ? ` [${statusLabel(s.status)}]` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Source section / page" htmlFor="sourceSection">
          <Input id="sourceSection" name="sourceSection" defaultValue={initial.sourceSection ?? ""} maxLength={200} />
        </Field>
        <Field label="Case #" htmlFor="caseId" required={quote} hint={quote ? "Required for a confirmed quote." : "Only for a case-specific quote."}>
          <Input id="caseId" name="caseId" type="number" min={1} inputMode="numeric" className="tabular-nums" required={quote} defaultValue={initial.caseId ?? ""} />
        </Field>
      </div>
    </div>
  );
}
