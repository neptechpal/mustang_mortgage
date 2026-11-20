"use client";
// Rule editor fields: lender → product / source scoping, category, check and its typed parameters.
// Parameters are rendered generically from the check's ParamSpec list and submitted as JSON in
// the hidden "params" input (validated again server-side with parseParams).
import { useMemo, useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { Field, Input, Select, checkboxStyles, cn, hintStyles, labelStyles } from "@/components/admin/ui";
import type { CheckDef, LenderLite, ProductLite, SourceLite } from "../data";
import { sourceKindLabel, statusLabel } from "../meta";

type ParamSpec = CheckDef["params"][number];
type Params = Record<string, unknown>;

export default function RuleFields({
  lenders, products, sources, checks, categories, initial, lockLender, children,
}: {
  lenders: LenderLite[];
  products: ProductLite[];
  sources: SourceLite[];
  checks: CheckDef[];
  categories: [string, string][];
  initial: { lenderId?: number | null; productId?: number | null; sourceId?: number | null; sourceSection?: string; segment?: string; category?: string; check?: string; params?: Params };
  lockLender?: boolean;
  /** Server-rendered fields placed between the parameters and the source (statement, conditions…). */
  children?: ReactNode;
}) {
  const [lenderId, setLenderId] = useState<string>(initial.lenderId ? String(initial.lenderId) : "");
  const [productId, setProductId] = useState<string>(initial.productId ? String(initial.productId) : "");
  const [sourceId, setSourceId] = useState<string>(initial.sourceId ? String(initial.sourceId) : "");
  const [checkKey, setCheckKey] = useState<string>(initial.check ?? "");
  const [category, setCategory] = useState<string>(initial.category ?? "");
  const [params, setParams] = useState<Params>(initial.params ?? {});

  const lid = Number(lenderId) || 0;
  const lenderProducts = useMemo(() => products.filter((p) => p.lenderId === lid), [products, lid]);
  const lenderSources = useMemo(
    () => sources.filter((s) => (s.lenderId === null || s.lenderId === lid) && (s.status === "draft" || s.status === "published" || String(s.id) === sourceId)),
    [sources, lid, sourceId],
  );
  const check = checks.find((c) => c.key === checkKey);
  const src = sources.find((s) => String(s.id) === sourceId);

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Lender" htmlFor="lenderId" required hint={lockLender ? "Fixed for all versions of this rule." : undefined}>
          {lockLender && <input type="hidden" name="lenderId" value={lenderId} />}
          <Select
            id="lenderId"
            name={lockLender ? undefined : "lenderId"}
            required
            disabled={lockLender}
            value={lenderId}
            onChange={(e) => {
              setLenderId(e.target.value);
              setProductId("");
              const s = sources.find((x) => String(x.id) === sourceId);
              if (s && s.lenderId !== null && String(s.lenderId) !== e.target.value) setSourceId("");
            }}
          >
            <option value="">Select lender…</option>
            {lenders.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} ({l.code}){l.onPanel ? "" : " — not on panel"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Product" htmlFor="productId" hint="Blank = applies to all of the lender's products.">
          <Select id="productId" name="productId" value={productId} onChange={(e) => setProductId(e.target.value)} disabled={!lid}>
            <option value="">All products</option>
            {lenderProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code}){p.active ? "" : " — inactive"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Segment" htmlFor="segment" hint="Who it applies to, e.g. “temporary visa”, “PAYG casual”. Default “all”.">
          <Input id="segment" name="segment" maxLength={120} defaultValue={initial.segment ?? "all"} />
        </Field>
      </div>
      <p className="-mt-2 text-xs leading-relaxed text-slate-500">
        Published rules of the same lender with the same <b>check</b> and <b>segment</b> are treated as alternatives for that situation — if they give different answers the assessment flags a conflict for the broker to resolve.
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Check" htmlFor="check" required hint={check?.help}>
          <Select
            id="check"
            name="check"
            required
            value={checkKey}
            onChange={(e) => {
              const c = checks.find((x) => x.key === e.target.value);
              setCheckKey(e.target.value);
              if (c) setCategory(c.category);
              setParams({});
            }}
          >
            <option value="">Select check…</option>
            {checks.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Category" htmlFor="category" required hint="Set from the check; change only if the rule belongs elsewhere.">
          <Select id="category" name="category" required value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Select category…</option>
            {categories.map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <input type="hidden" name="params" value={JSON.stringify(params)} />
      {check ? (
        <fieldset className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
          <legend className="px-1 text-[13px] font-semibold text-slate-800">Parameters — {check.label}</legend>
          {check.params.length === 0 ? (
            <p className="text-sm text-slate-500">This check has no parameters.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {check.params.map((p) => (
                <ParamInput key={`${check.key}:${p.key}`} spec={p} value={params[p.key]} onChange={(v) => setParams((cur) => setKey(cur, p.key, v))} />
              ))}
            </div>
          )}
        </fieldset>
      ) : (
        <p className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500">
          <Info className="size-4 shrink-0" /> Choose a check to enter its parameters.
        </p>
      )}

      {children}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Source"
          htmlFor="sourceId"
          required
          hint={
            src && src.status !== "published"
              ? `This source is ${statusLabel(src.status).toLowerCase()} — the rule can't be published until the source is.`
              : "Published or draft sources of this lender, or panel-wide sources."
          }
        >
          <Select id="sourceId" name="sourceId" required value={sourceId} onChange={(e) => setSourceId(e.target.value)} disabled={!lid}>
            <option value="">{lid ? "Select source…" : "Select a lender first"}</option>
            {lenderSources.map((s) => (
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
        <Field label="Source section / page" htmlFor="sourceSection" hint="Where in the source this rule is stated, e.g. “s4.2, p.17”.">
          <Input id="sourceSection" name="sourceSection" defaultValue={initial.sourceSection ?? ""} maxLength={200} />
        </Field>
      </div>
    </div>
  );
}

function setKey(cur: Params, k: string, v: unknown): Params {
  const next = { ...cur };
  if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) delete next[k];
  else next[k] = v;
  return next;
}

function ParamInput({ spec, value, onChange }: { spec: ParamSpec; value: unknown; onChange: (v: unknown) => void }) {
  const id = `param-${spec.key}`;
  const hint = spec.hint ? <p className={hintStyles}>{spec.hint}</p> : null;
  if (spec.type === "bool") {
    return (
      <label htmlFor={id} className="flex cursor-pointer items-start gap-2.5 self-end rounded-lg border border-slate-200 bg-white px-3 py-2.5">
        <input id={id} type="checkbox" className={cn(checkboxStyles, "mt-0.5")} checked={value === true} onChange={(e) => onChange(e.target.checked)} />
        <span className="text-sm text-slate-800">
          {spec.label}
          {hint}
        </span>
      </label>
    );
  }
  if (spec.type === "number") {
    return (
      <div>
        <label htmlFor={id} className={labelStyles}>{spec.label}</label>
        <Input
          id={id}
          type="number"
          step="any"
          min={0}
          inputMode="decimal"
          className="tabular-nums"
          value={typeof value === "number" ? String(value) : ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))}
        />
        {hint}
      </div>
    );
  }
  if (spec.type === "enum") {
    return (
      <div>
        <label htmlFor={id} className={labelStyles}>{spec.label}</label>
        <Select id={id} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value || undefined)}>
          <option value="">— not set —</option>
          {(spec.options ?? []).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        {hint}
      </div>
    );
  }
  if (spec.type === "multi") {
    const sel = Array.isArray(value) ? (value as string[]) : [];
    return (
      <fieldset className="sm:col-span-2">
        <legend className={labelStyles}>{spec.label}</legend>
        <div className="flex flex-wrap gap-2">
          {(spec.options ?? []).map(([k, v]) => {
            const on = sel.includes(k);
            return (
              <label
                key={k}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[13px] transition-colors",
                  on ? "border-brand-300 bg-brand-50 text-brand-900" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                )}
              >
                <input type="checkbox" className={checkboxStyles} checked={on} onChange={(e) => onChange(e.target.checked ? [...sel, k] : sel.filter((x) => x !== k))} />
                {v}
              </label>
            );
          })}
        </div>
        {hint}
      </fieldset>
    );
  }
  // list → comma separated text
  return <ListInput id={id} spec={spec} value={value} onChange={onChange} hint={hint} />;
}

function ListInput({ id, spec, value, onChange, hint }: { id: string; spec: ParamSpec; value: unknown; onChange: (v: unknown) => void; hint: React.ReactNode }) {
  const [txt, setTxt] = useState(Array.isArray(value) ? (value as string[]).join(", ") : "");
  return (
    <div>
      <label htmlFor={id} className={labelStyles}>{spec.label}</label>
      <Input
        id={id}
        value={txt}
        placeholder="comma separated"
        onChange={(e) => {
          setTxt(e.target.value);
          onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean));
        }}
      />
      {hint}
    </div>
  );
}
