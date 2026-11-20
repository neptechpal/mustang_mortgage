"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { Alert, Button, Card, Field, Input, Select, Textarea } from "@/components/admin/ui";
import { quickScenarioAction } from "../quick-actions";
import { QUICK_DEFAULTS, QUICK_EMPLOYMENT, QUICK_GOALS, QUICK_RESIDENCY, QUICK_VISAS, QuickInputSchema, type QuickInput } from "../quick-input";
import type { QuickResult } from "../quick";
import QuickResults, { QuickSkeleton } from "./QuickResults";

type Saved = { result: QuickResult; saveToken: string };
function MoneyField({ id, label, value, onChange }: { id: string; label: string; value: number | null; onChange: (n: number | null) => void }) {
  const [focused, setFocused] = useState(false);
  return <Field label={label} htmlFor={id}><div className="relative"><span className="pointer-events-none absolute left-3 top-3 text-slate-400" aria-hidden="true">$</span><Input id={id} inputMode="numeric" autoComplete="off" className="min-h-12 pl-7 text-base tabular-nums" placeholder="Unknown" value={value === null ? "" : focused ? String(value) : value.toLocaleString("en-AU")} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onChange={(e) => { const s = e.target.value.replace(/[$,\s]/g, ""); if (s === "") onChange(null); else if (/^\d{1,9}$/.test(s) && Number(s) <= 100_000_000) onChange(Number(s)); }} /></div></Field>;
}

function Applicant({ number, value, onChange }: { number: number; value: QuickInput["applicant1"]; onChange: (a: QuickInput["applicant1"]) => void }) {
  return <fieldset className="min-w-0 space-y-3"><legend className="mb-3 text-sm font-semibold text-slate-700">Applicant {number}</legend>
    <MoneyField id={`quick-income-${number}`} label="Gross annual income (AUD)" value={value.income} onChange={(income) => onChange({ ...value, income })} />
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Field label="Employment" htmlFor={`quick-employment-${number}`}><Select id={`quick-employment-${number}`} className="min-h-12 text-base" value={value.employment} onChange={(e) => onChange({ ...value, employment: e.target.value as typeof value.employment })}>{Object.entries(QUICK_EMPLOYMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
      <Field label="Months in current job" htmlFor={`quick-months-${number}`}><Input id={`quick-months-${number}`} className="min-h-12 text-base" type="number" min={0} max={720} step={1} inputMode="numeric" placeholder="Unknown" value={value.monthsInJob ?? ""} onChange={(e) => onChange({ ...value, monthsInJob: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
    </div>
  </fieldset>;
}

export default function QuickScenario({ isAdmin, storageOwner }: { isAdmin: boolean; storageOwner: number }) {
  const [input, setInput] = useState<QuickInput>(QUICK_DEFAULTS);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [storageNote, setStorageNote] = useState("");
  const storageKey = `mm:quick-scenario:v1:${storageOwner}`;
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const s = JSON.parse(raw) as Saved;
        if (s.result?.figures && s.result?.assessment && s.result?.evidence && s.saveToken && QuickInputSchema.safeParse(s.result.input).success) { setSaved(s); setInput(s.result.input); }
        else sessionStorage.removeItem(storageKey);
      }
    } catch { setStorageNote("Session storage is unavailable. Keep this tab open or save your result to a case."); }
    setReady(true);
  }, [storageKey]);
  const update = <K extends keyof QuickInput>(key: K, value: QuickInput[K]) => setInput((i) => ({ ...i, [key]: value }));
  const refinance = input.goal === "refinance";
  if (!ready) return <QuickSkeleton />;
  return <div className="mx-auto max-w-5xl space-y-6">
    {storageNote && <Alert tone="warning">{storageNote}</Alert>}
    {saved ? <QuickResults result={saved.result} saveToken={saved.saveToken} isAdmin={isAdmin} onReset={() => {
      setSaved(null); setInput(QUICK_DEFAULTS); setError("");
      try { sessionStorage.removeItem(storageKey); } catch { /* Browser storage may be disabled. */ }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }} /> : <form className="space-y-6" onSubmit={async (e) => {
      e.preventDefault(); if (pending) return; setPending(true); setError("");
      try {
        const response = await quickScenarioAction(input);
        if (response.error) setError(response.error);
        else if (response.result && response.saveToken) {
          const next = { result: response.result, saveToken: response.saveToken }; setSaved(next);
          try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch { setStorageNote("This result could not be kept for refresh. Save it to a case before leaving."); }
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } catch { setError("Could not prepare the scenario. Please try again."); } finally { setPending(false); }
    }}>
      <fieldset disabled={pending} className="min-w-0 space-y-6 disabled:opacity-70">
        <Card title="The property" description="Only goal and state are required. Leave anything you don't know blank; all amounts are AUD.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Goal" htmlFor="quick-goal" required><Select id="quick-goal" required className="min-h-12 text-base" value={input.goal} onChange={(e) => { const goal = e.target.value as QuickInput["goal"]; setInput((i) => ({ ...i, goal, firstHomeBuyer: goal === "first_home", propertyType: goal === "build" ? "new" : i.propertyType, price: null, funds: null })); }}>{Object.entries(QUICK_GOALS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            <Field label="State / territory" htmlFor="quick-state" required><Select id="quick-state" required className="min-h-12 text-base" value={input.state} onChange={(e) => update("state", e.target.value as QuickInput["state"])}>{["NSW", "VIC", "QLD", "WA", "SA", "ACT", "TAS", "NT"].map((s) => <option key={s}>{s}</option>)}</Select></Field>
            <MoneyField id="quick-price" label={refinance ? "Current property value" : input.goal === "build" ? "Estimated completed property value" : "Property price"} value={input.price} onChange={(n) => update("price", n)} />
            <MoneyField id="quick-funds" label={refinance ? "Current loan balance" : "Deposit / savings available"} value={input.funds} onChange={(n) => update("funds", n)} />
            {!refinance && <>
              <Field label="Property" htmlFor="quick-property"><Select id="quick-property" className="min-h-12 text-base" disabled={input.goal === "build"} value={input.propertyType} onChange={(e) => update("propertyType", e.target.value as QuickInput["propertyType"])}><option value="established">Established</option><option value="new">New build</option></Select></Field>
              <Field label="First home buyer" htmlFor="quick-fhb"><Select id="quick-fhb" className="min-h-12 text-base" disabled={input.goal === "first_home" || input.goal === "investment"} value={input.firstHomeBuyer ? "yes" : "no"} onChange={(e) => update("firstHomeBuyer", e.target.value === "yes")}><option value="yes">Yes — verify full eligibility</option><option value="no">No</option></Select></Field>
            </>}
          </div>
        </Card>
        <Card title="Income & residency" description="Use gross income before tax. Estimates still need income and expense verification.">
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Applicants" htmlFor="quick-applicants"><Select id="quick-applicants" className="min-h-12 text-base" value={input.applicantCount} onChange={(e) => update("applicantCount", Number(e.target.value) as 1 | 2)}><option value={1}>1 applicant</option><option value={2}>2 applicants</option></Select></Field>
            <Field label="Residency" htmlFor="quick-residency" hint={input.applicantCount === 2 ? "Assumed the same for both; confirm each applicant." : undefined}><Select id="quick-residency" className="min-h-12 text-base" value={input.residency} onChange={(e) => update("residency", e.target.value as QuickInput["residency"])}>{Object.entries(QUICK_RESIDENCY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
            {input.residency === "visa" && <Field label="Visa subclass" htmlFor="quick-visa"><Select id="quick-visa" className="min-h-12 text-base" value={input.visaSubclass} onChange={(e) => update("visaSubclass", e.target.value as QuickInput["visaSubclass"])}>{QUICK_VISAS.map((v) => <option key={v} value={v}>{v === "820/801" ? "820/801 — partner (confirm stage)" : v === "500" ? "500 — student" : v === "bridging" ? "Bridging visa" : v === "other" ? "Other / not sure" : v}</option>)}</Select></Field>}
          </div>
          <div className={`grid gap-6 ${input.applicantCount === 2 ? "lg:grid-cols-2" : ""}`}><Applicant number={1} value={input.applicant1} onChange={(a) => update("applicant1", a)} />{input.applicantCount === 2 && <Applicant number={2} value={input.applicant2} onChange={(a) => update("applicant2", a)} />}</div>
        </Card>
        <Card title="A few final details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Dependants" htmlFor="quick-dependants"><Input id="quick-dependants" className="min-h-12 text-base" type="number" min={0} max={20} step={1} inputMode="numeric" value={input.dependants} onChange={(e) => update("dependants", Number(e.target.value))} /></Field>
            <Field label="Assumed interest rate (%) — for estimate only" htmlFor="quick-rate" hint="Editable borrowing-tool assumption, not a lender rate or offer."><Input id="quick-rate" className="min-h-12 text-base" type="number" min={0.01} max={30} step={0.01} inputMode="decimal" value={input.ratePct} onChange={(e) => update("ratePct", e.target.value === "" ? QUICK_DEFAULTS.ratePct : Number(e.target.value))} /></Field>
            <MoneyField id="quick-other" label="Monthly other loan repayments" value={input.otherRepayments} onChange={(n) => update("otherRepayments", n)} />
            <MoneyField id="quick-cards" label="Total credit card limits" value={input.cardLimits} onChange={(n) => update("cardLimits", n)} />
            <Field label="Anything else?" htmlFor="quick-notes" className="sm:col-span-2" hint={`${input.anythingElse.length}/500 · No names or contact details. Only recognised topics (e.g. gift, guarantor, probation) are passed to AI; the original text is not retained.`}><Textarea id="quick-notes" className="text-base" maxLength={500} placeholder="For example: gifted deposit, probation, HELP debt…" value={input.anythingElse} onChange={(e) => update("anythingElse", e.target.value)} /></Field>
          </div>
        </Card>
      </fieldset>
      {error && <Alert tone="danger">{error}</Alert>}
      {pending ? <QuickSkeleton /> : <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur-sm"><Button type="submit" variant="primary" size="lg" className="min-h-12 w-full sm:w-auto"><Sparkles className="size-5" />Prepare quick scenario</Button><p className="text-xs text-slate-500">General information for the broker. Verify before advising.</p></div>}
    </form>}
  </div>;
}
