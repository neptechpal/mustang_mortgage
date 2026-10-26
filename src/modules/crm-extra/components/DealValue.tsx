"use client";
import { useState, useTransition } from "react";
import { Check, Save } from "lucide-react";
import { Field, buttonStyles, inputStyles } from "@/components/admin/ui";
import { saveDealValue } from "../actions/commission";

const norm = (v: number) => (v > 0 && v < 1 ? v * 100 : v);
const n = (s: string) => parseFloat(s.replace(/[,\s]/g, "")) || 0;
const aud = (x: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(x);

export default function DealValue({ caseId, loan, bank, mm }: { caseId: number; loan: string; bank: string; mm: string }) {
  const [f, setF] = useState({ loan, bank, mm });
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const est = Math.max(0, n(f.loan) * (norm(n(f.bank)) / 100) * (norm(n(f.mm)) / 100));
  return (
    <div className="max-w-sm space-y-4">
      <Field label="Loan Amount" hint="Total loan amount for this case.">
        <input type="number" step="0.01" min={0} className={`${inputStyles} tabular-nums`} placeholder="e.g. 600000" value={f.loan} onChange={(e) => setF({ ...f, loan: e.target.value })} />
      </Field>
      <Field
        label="Comm % (Bank)"
        hint={
          <>
            Enter <b>80</b> (80%), 0.8 (0.8%), or <b>0.008</b> (0.8%).
          </>
        }
      >
        <input type="number" step="any" min={0} className={`${inputStyles} tabular-nums`} placeholder="80 or 0.8 or 0.008" value={f.bank} onChange={(e) => setF({ ...f, bank: e.target.value })} />
      </Field>
      <Field label="Comm to MM %" hint="Your split after aggregator.">
        <input type="number" step="any" min={0} className={`${inputStyles} tabular-nums`} placeholder="80 or 0.8" value={f.mm} onChange={(e) => setF({ ...f, mm: e.target.value })} />
      </Field>
      <div className="rounded-lg border border-brand-200 bg-brand-50/70 px-3.5 py-3">
        <p className="text-xs font-medium text-brand-800">Estimated Commission to MM</p>
        <p className="mt-0.5 text-xl font-semibold tracking-tight text-slate-900 tabular-nums">{aud(est)}</p>
      </div>
      <button
        className={buttonStyles({ variant: "primary", className: "w-full" })}
        disabled={pending}
        onClick={() =>
          start(async () => {
            await saveDealValue(caseId, f.loan, f.bank, f.mm);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          })
        }
      >
        {saved ? (
          <>
            <Check /> Saved
          </>
        ) : (
          <>
            <Save /> Save deal value
          </>
        )}
      </button>
    </div>
  );
}
