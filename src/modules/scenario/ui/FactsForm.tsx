"use client";
// Structured fact sheet editor: shows where each value came from (enquiry / case / broker),
// lets the broker correct it and tick "verified". Unknown = left blank.
import { useMemo, useState } from "react";
import { CheckCircle2, CircleDashed, Play, Save } from "lucide-react";
import { Badge, Button, cn, inputStyles, selectStyles, textareaStyles } from "@/components/admin/ui";
import type { Fact, FieldDef, IncomeValue } from "../facts";

type Props = { defs: FieldDef[]; facts: Record<string, Fact>; action: (fd: FormData) => void; maxApplicants: number };

const SRC: Record<string, [string, "info" | "violet" | "brand"]> = { enquiry: ["Enquiry", "info"], case: ["Case record", "violet"], broker: ["Broker", "brand"] };

function asInputValue(v: unknown) {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

export default function FactsForm({ defs, facts, action, maxApplicants }: Props) {
  const [vals, setVals] = useState<Record<string, unknown>>(() => Object.fromEntries(defs.map((d) => [d.key, facts[d.key]?.v ?? null])));
  const [oks, setOks] = useState<Record<string, boolean>>(() => Object.fromEntries(defs.map((d) => [d.key, Boolean(facts[d.key]?.ok)])));
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const count = Math.min(maxApplicants, Math.max(1, Number(vals["app.count"]) || 1));

  const set = (k: string, v: unknown) => {
    setVals((s) => ({ ...s, [k]: v }));
    setDirty((s) => ({ ...s, [k]: true }));
  };
  const visible = (d: FieldDef) => {
    const m = /^a(\d)\./.exec(d.key);
    if (m && Number(m[1]) > count) return false;
    if (!d.showIf) return true;
    const v = vals[d.showIf.key];
    return v === null || v === undefined || v === "" || d.showIf.in.includes(String(v));
  };
  const groups = useMemo(() => {
    const g = new Map<string, FieldDef[]>();
    for (const d of defs) g.set(d.group, [...(g.get(d.group) ?? []), d]);
    return [...g.entries()];
  }, [defs]);

  const known = defs.filter((d) => visible(d) && vals[d.key] !== null && vals[d.key] !== undefined && vals[d.key] !== "").length;
  const verified = defs.filter((d) => visible(d) && oks[d.key] && vals[d.key] !== null && vals[d.key] !== "").length;

  const control = (d: FieldDef) => {
    const name = `f:${d.key}`;
    const v = vals[d.key];
    switch (d.type) {
      case "select":
        return (
          <select name={name} className={selectStyles} value={asInputValue(v)} onChange={(e) => set(d.key, e.target.value || null)}>
            <option value="">Unknown</option>
            {d.options!.map(([k, l]) => (
              <option key={k} value={k}>{l}</option>
            ))}
          </select>
        );
      case "bool":
        return (
          <select name={name} className={selectStyles} value={asInputValue(v)} onChange={(e) => set(d.key, e.target.value === "" ? null : e.target.value === "true")}>
            <option value="">Unknown</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );
      case "multi": {
        const arr = Array.isArray(v) ? (v as string[]) : [];
        return (
          <div className="flex flex-wrap gap-1.5">
            <input type="hidden" name={`present:${d.key}`} value="1" />
            {d.options!.map(([k, l]) => (
              <label key={k} className={cn("inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs", arr.includes(k) ? "border-brand-300 bg-brand-50 text-brand-800" : "border-slate-200 text-slate-600")}>
                <input type="checkbox" name={name} value={k} checked={arr.includes(k)} onChange={(e) => set(d.key, e.target.checked ? [...arr, k] : arr.filter((x) => x !== k))} className="size-3.5 accent-brand-600" />
                {l}
              </label>
            ))}
          </div>
        );
      }
      case "income": {
        const i = (v ?? {}) as Partial<IncomeValue>;
        const upd = (p: Partial<IncomeValue>) => set(d.key, { freq: "annual", basis: "gross", months: null, ...i, ...p });
        return (
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            <input name={`${name}:amount`} inputMode="decimal" placeholder="Amount $" className={inputStyles} value={i.amount ?? ""} onChange={(e) => upd({ amount: e.target.value === "" ? (undefined as unknown as number) : (e.target.value as unknown as number) })} />
            <select name={`${name}:freq`} className={selectStyles} value={i.freq ?? "annual"} onChange={(e) => upd({ freq: e.target.value as IncomeValue["freq"] })}>
              <option value="weekly">/ week</option>
              <option value="fortnightly">/ fortnight</option>
              <option value="monthly">/ month</option>
              <option value="annual">/ year</option>
            </select>
            <select name={`${name}:basis`} className={selectStyles} value={i.basis ?? "gross"} onChange={(e) => upd({ basis: e.target.value as IncomeValue["basis"] })}>
              <option value="gross">Gross</option>
              <option value="net">Net</option>
            </select>
            <input name={`${name}:months`} inputMode="numeric" placeholder="Evidence (months)" className={inputStyles} value={i.months ?? ""} onChange={(e) => upd({ months: e.target.value === "" ? null : (e.target.value as unknown as number) })} />
          </div>
        );
      }
      case "text":
        return d.key === "loan.objectives" ? (
          <textarea name={name} className={cn(textareaStyles, "min-h-[72px]")} value={asInputValue(v)} onChange={(e) => set(d.key, e.target.value)} />
        ) : (
          <input name={name} className={inputStyles} value={asInputValue(v)} onChange={(e) => set(d.key, e.target.value)} />
        );
      case "date":
        return <input type="date" name={name} className={inputStyles} value={asInputValue(v)} onChange={(e) => set(d.key, e.target.value || null)} />;
      default:
        return (
          <div className="relative">
            {d.type === "money" && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">$</span>}
            <input name={name} inputMode="decimal" className={cn(inputStyles, d.type === "money" && "pl-6", "tabular-nums")} value={asInputValue(v)} onChange={(e) => set(d.key, e.target.value)} />
          </div>
        );
    }
  };

  return (
    <form action={action} className="space-y-6">
      <div className="sticky top-14 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <p className="text-sm text-slate-600">
          <span className="font-semibold tabular-nums text-slate-900">{known}</span> known · <span className="font-semibold tabular-nums text-emerald-700">{verified}</span> verified · blank = unknown
        </p>
        <div className="flex gap-2">
          <Button type="submit" variant="secondary" size="sm"><Save /> Save facts</Button>
          <Button type="submit" name="then" value="run" variant="primary" size="sm"><Play /> Save &amp; run assessment</Button>
        </div>
      </div>
      {groups.map(([group, fields]) => {
        const shown = fields.filter(visible);
        if (!shown.length) return null;
        return (
          <section key={group} className="rounded-xl border border-slate-200/80 bg-white">
            <h3 className="border-b border-slate-100 px-5 py-3 text-[15px] font-semibold text-slate-900">{group}</h3>
            <div className="divide-y divide-slate-100">
              {shown.map((d) => {
                const f = facts[d.key];
                const v = vals[d.key];
                const isKnown = v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && !v.length);
                const src = dirty[d.key] ? (isKnown ? ["Edited", "brand"] : null) : f?.src && isKnown ? SRC[f.src] : null;
                return (
                  <div key={d.key} className="grid gap-2 px-5 py-3 md:grid-cols-[220px_minmax(0,1fr)_170px] md:items-center">
                    <div>
                      <p className="text-[13px] font-medium text-slate-800">{d.label}{d.unit && <span className="font-normal text-slate-400"> · {d.unit}</span>}</p>
                      {d.hint && <p className="mt-0.5 text-xs text-slate-500">{d.hint}</p>}
                    </div>
                    <div className="min-w-0">{control(d)}</div>
                    <div className="flex items-center gap-2 md:justify-end">
                      {isKnown ? (
                        <>
                          {src && <Badge tone={src[1] as "info"}>{src[0]}</Badge>}
                          <label className={cn("inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-xs", oks[d.key] ? "text-emerald-700" : "text-slate-500")}>
                            <input type="checkbox" name={`ok:${d.key}`} value="1" checked={Boolean(oks[d.key])} onChange={(e) => setOks((s) => ({ ...s, [d.key]: e.target.checked }))} className="size-3.5 accent-emerald-600" />
                            {oks[d.key] ? <CheckCircle2 className="size-3.5" /> : null}
                            Verified
                          </label>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600"><CircleDashed className="size-3.5" /> Missing</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </form>
  );
}
