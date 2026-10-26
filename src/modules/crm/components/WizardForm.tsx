"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { ArrowRight, Check, CircleCheck, FileStack, Landmark, Loader2, Send, UserRound, UserPlus } from "lucide-react";
import { buttonStyles, checkboxStyles, cn, inputStyles, labelStyles, selectStyles } from "@/components/admin/ui";
import type { Preset } from "../options";
import { wizardCreateAction } from "../actions";

const inp = inputStyles;
const lab = labelStyles;

function Step({ n, title, description, icon, children, last }: { n: number; title: string; description?: ReactNode; icon: ReactNode; children: ReactNode; last?: boolean }) {
  return (
    <section className="relative flex gap-4">
      <div className="hidden flex-col items-center sm:flex">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white shadow-sm ring-4 ring-brand-50">{n}</span>
        {!last && <span className="mt-2 w-px flex-1 bg-gradient-to-b from-brand-200 to-slate-200" aria-hidden />}
      </div>
      <div className="min-w-0 flex-1 rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <header className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100 [&_svg]:size-[18px]">{icon}</span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">Step {n} of 4</p>
            <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </section>
  );
}

function CheckRow({ children, hint, ...p }: React.ComponentProps<"input"> & { hint?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-3.5 py-3 text-sm transition-colors hover:border-slate-300 hover:bg-slate-50 has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50/50">
      <input type="checkbox" className={cn(checkboxStyles, "mt-0.5")} {...p} />
      <span className="min-w-0">
        <span className="block text-slate-800">{children}</span>
        {hint && <span className="mt-0.5 block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonStyles({ variant: "primary", size: "lg", className: "w-full" })}>
      {pending ? <><Loader2 className="animate-spin" /> Creating…</> : <>Create client &amp; send <ArrowRight /></>}
    </button>
  );
}

export default function WizardForm({ presets, forms, ffTitle, chaseOn }: { presets: Preset[]; forms: { id: number; title: string }[]; ffTitle: string; chaseOn: boolean }) {
  const [two, setTwo] = useState(false);
  const [loan, setLoan] = useState("purchase");
  const [inc, setInc] = useState("payg");
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const want = ["all", loan, inc];
    setTicked(Object.fromEntries(presets.map((p) => [p.name, p.tags.some((t) => want.includes(t))])));
  }, [loan, inc, presets]);
  const picked = presets.filter((p) => ticked[p.name]);
  const docCount = picked.reduce((a, p) => a + p.items.length, 0);
  return (
    <form action={wizardCreateAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-5">
        <Step n={1} title="Who is the client?" description="The primary applicant receives the secure portal link." icon={<UserRound />}>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className={lab} htmlFor="p1_name">Applicant 1 — full name <span className="text-red-500">*</span></label><input id="p1_name" className={inp} name="p1_name" required autoFocus /></div>
            <div><label className={lab} htmlFor="p1_email">Email <span className="text-red-500">*</span></label><input id="p1_email" className={inp} type="email" name="p1_email" required /></div>
            <div><label className={lab} htmlFor="p1_mobile">Mobile</label><input id="p1_mobile" className={inp} type="tel" name="p1_mobile" /></div>
          </div>
          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand-400 hover:text-brand-700 has-[:checked]:border-solid has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50/50">
            <input type="checkbox" className={checkboxStyles} checked={two} onChange={(e) => setTwo(e.target.checked)} />
            <UserPlus className="size-4" /> Add a second applicant
          </label>
          {two && (
            <div className="mt-4 grid gap-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 sm:grid-cols-3">
              <div><label className={lab} htmlFor="p2_name">Applicant 2 — full name</label><input id="p2_name" className={inp} name="p2_name" /></div>
              <div><label className={lab} htmlFor="p2_email">Email</label><input id="p2_email" className={inp} type="email" name="p2_email" /></div>
              <div><label className={lab} htmlFor="p2_mobile">Mobile</label><input id="p2_mobile" className={inp} type="tel" name="p2_mobile" /></div>
            </div>
          )}
        </Step>

        <Step n={2} title="The deal" description="Loan and income type pick the right document presets in step 3." icon={<Landmark />}>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className={lab} htmlFor="loan_type">Loan type</label>
              <select id="loan_type" className={selectStyles} name="loan_type" value={loan} onChange={(e) => setLoan(e.target.value)}>
                <option value="purchase">Purchase</option><option value="refinance">Refinance</option><option value="investment">Investment</option><option value="construction">Construction</option>
              </select></div>
            <div><label className={lab} htmlFor="income_type">Income type</label>
              <select id="income_type" className={selectStyles} name="income_type" value={inc} onChange={(e) => setInc(e.target.value)}>
                <option value="payg">PAYG / employed</option><option value="self">Self-employed</option>
              </select></div>
            <div><label className={lab} htmlFor="loan_amount">Estimated loan amount</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                <input id="loan_amount" className={cn(inp, "pl-7 tabular-nums")} type="number" name="loan_amount" min={0} step={1000} placeholder="e.g. 650000" />
              </div></div>
          </div>
        </Step>

        <Step n={3} title="Documents to request" icon={<FileStack />}
          description={<>Ticked automatically from the loan and income type. Edit the lists in <a className="font-medium text-brand-700 hover:underline" href="/admin/automation">Automation → Checklist presets</a>.</>}>
          <div className="grid gap-3 sm:grid-cols-2">
            {presets.map((p) => {
              const on = !!ticked[p.name];
              return (
                <label key={p.name} className={cn("relative flex cursor-pointer gap-3 rounded-xl border p-3.5 text-sm transition-colors", on ? "border-brand-300 bg-brand-50/50 ring-1 ring-brand-200" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50")}>
                  <input type="checkbox" className={cn(checkboxStyles, "mt-0.5")} name="presets" value={p.name} checked={on} onChange={(e) => setTicked((t) => ({ ...t, [p.name]: e.target.checked }))} />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 font-semibold text-slate-900">{p.name}<span className="rounded-full bg-white px-1.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200 tabular-nums">{p.items.length}</span></span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{p.items.slice(0, 4).join(" · ")}{p.items.length > 4 ? " …" : ""}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {!presets.length && <p className="text-sm text-slate-500">No checklist presets yet — add some under Automation.</p>}
        </Step>

        <Step n={4} title="Send to client" description="Choose what goes out with the welcome email." icon={<Send />} last>
          <div className="grid gap-2.5">
            <CheckRow name="send_ff" value="1" defaultChecked hint={ffTitle || undefined}>Fact Find</CheckRow>
            {forms.map((f) => <CheckRow key={f.id} name="send_forms" value={f.id}>{f.title}</CheckRow>)}
            <CheckRow name="send_welcome" value="1" defaultChecked hint="Sends their secure portal link straight away."><strong className="font-semibold">Email the client now</strong> with their secure portal link</CheckRow>
            <CheckRow name="auto_chase" value="1" defaultChecked hint={chaseOn ? "Automatic reminders are on" : "Switch on under Automation"}>Automatically remind them if things are still outstanding</CheckRow>
          </div>
        </Step>
      </div>

      <aside className="min-w-0">
        <div className="space-y-4 lg:sticky lg:top-24">
          <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <h3 className="text-[15px] font-semibold text-slate-900">What happens next</h3>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                ["Case is created", "with applicant and deal details"],
                ["Document checklist is built", picked.length ? `${picked.length} preset${picked.length > 1 ? "s" : ""} · up to ${docCount} items` : "no presets ticked yet"],
                ["Client gets a secure portal link", "to upload documents and fill in forms"],
                ["Reminders chase anything outstanding", chaseOn ? "automation is on" : "once automation is switched on"],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200"><Check className="size-3" /></span>
                  <span><span className="block font-medium text-slate-800">{t}</span><span className="block text-xs text-slate-500">{d}</span></span>
                </li>
              ))}
            </ul>
            <div className="mt-5 border-t border-slate-100 pt-5"><Submit /></div>
          </div>
          <p className="flex items-start gap-2 px-1 text-xs text-slate-500"><CircleCheck className="mt-0.5 size-3.5 shrink-0 text-slate-400" /> You can edit everything later from the case screen.</p>
        </div>
      </aside>
    </form>
  );
}
