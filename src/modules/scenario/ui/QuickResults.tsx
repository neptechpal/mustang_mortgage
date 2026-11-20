"use client";

import { useEffect, useState } from "react";
import { Check, Copy, FilePlus2, RotateCcw, Search, Save } from "lucide-react";
import { Alert, Badge, Button, Card, Field, Input, LinkButton } from "@/components/admin/ui";
import { saveQuickScenarioAction, searchQuickCasesAction } from "../quick-actions";
import type { QuickResult } from "../quick";

const disclaimer = "General information for the broker — verify before advising; not a credit assessment";
export function QuickSkeleton() {
  return <div role="status" aria-live="polite" className="space-y-4">
    <p className="text-sm font-medium text-slate-600">Preparing your scenario… AI may take 10–30 seconds.</p>
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-5 motion-reduce:animate-none" aria-hidden="true">
      <div className="mb-6 h-6 w-3/4 rounded bg-slate-200" />
      {[0, 1, 2, 3].map((n) => <div key={n} className="mb-4 h-4 rounded bg-slate-100" />)}
      <div className="grid grid-cols-2 gap-4">{[0, 1, 2, 3].map((n) => <div key={n} className="h-24 rounded-lg bg-slate-100" />)}</div>
    </div>
  </div>;
}

function CopyButton({ text, all = false }: { text: string; all?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => { if (!copied) return; const t = setTimeout(() => setCopied(false), 2000); return () => clearTimeout(t); }, [copied]);
  return <span className="shrink-0">
    <Button type="button" variant="ghost" className="min-h-11 min-w-11" aria-label={all ? "Copy all talking points" : "Copy talking point"} onClick={async () => {
      try { await navigator.clipboard.writeText(text); setCopied(true); setError(false); } catch { setError(true); }
    }}>{copied ? <Check className="size-4" /> : <Copy className="size-4" />}{all ? copied ? "Copied" : "Copy all" : null}</Button>
    {error && <span role="status" className="block text-xs text-red-700">Copy unavailable; select the text.</span>}
  </span>;
}

function TextList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return <Card title={title}><ul className="space-y-2 text-sm leading-relaxed text-slate-700">{items.map((t, n) => <li key={n} className="flex gap-2"><span aria-hidden="true" className="text-brand-600">•</span><span>{t}</span></li>)}</ul></Card>;
}

function CaseSave({ saveToken }: { saveToken: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cases, setCases] = useState<{ id: number; label: string }[]>([]);
  const [chosen, setChosen] = useState<{ id: number; label: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!open) return;
    let active = true;
    setSearching(true);
    const t = setTimeout(() => {
      searchQuickCasesAction(query).then((rows) => { if (active) setCases(rows); })
        .catch(() => { if (active) setMessage("Could not search cases. Try again."); })
        .finally(() => { if (active) setSearching(false); });
    }, 250);
    return () => { active = false; clearTimeout(t); };
  }, [open, query]);
  return <Card title="Continue with a case" description="Keep this conversation on file, then verify the full scenario.">
    <div className="flex flex-wrap gap-3">
      <Button type="button" variant="secondary" className="min-h-11" onClick={() => setOpen(!open)} aria-expanded={open}><Save className="size-4" />Save to case</Button>
      {chosen ? <LinkButton href={`/admin/cases/${chosen.id}/scenario`} variant="secondary" className="min-h-11"><FilePlus2 className="size-4" />Start full assessment</LinkButton>
        : <Button type="button" variant="secondary" className="min-h-11" onClick={() => setOpen(true)}><FilePlus2 className="size-4" />Start full assessment</Button>}
    </div>
    {open && <div className="mt-5 space-y-3">
      <Field label="Choose an active case" htmlFor="quick-case" hint="Case names stay in the CRM and are never included in the AI request.">
        <div className="relative"><Search className="absolute left-3 top-3.5 size-4 text-slate-400" /><Input id="quick-case" className="min-h-11 pl-9 text-base" placeholder="Search by name, title or case number" value={query} maxLength={100} onChange={(e) => setQuery(e.target.value)} /></div>
      </Field>
      {searching ? <p role="status" className="text-sm text-slate-500">Searching cases…</p> : <div className="max-h-60 overflow-auto rounded-lg border border-slate-200" role="group" aria-label="Matching cases">
        {cases.length === 0 && <p className="p-3 text-sm text-slate-500">No active cases found.</p>}
        {cases.map((c) => <button type="button" key={c.id} aria-pressed={chosen?.id === c.id} className={`flex min-h-12 w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-3 text-left text-sm last:border-0 hover:bg-brand-50 ${chosen?.id === c.id ? "bg-brand-50 font-medium text-brand-800" : "text-slate-700"}`} onClick={() => { setChosen(c); setSaved(false); setMessage(""); }}>{c.label}{chosen?.id === c.id && <Check className="size-4 shrink-0" />}</button>)}
      </div>}
      {chosen && <div className="flex flex-wrap items-center gap-3">
        <Button type="button" className="min-h-11" disabled={saving || saved} onClick={async () => {
          setSaving(true); setMessage("");
          try { const r = await saveQuickScenarioAction(chosen.id, saveToken); if (r.error) setMessage(r.error); else { setSaved(true); setMessage(`Saved to ${chosen.label}.`); } }
          catch { setMessage("Could not save the note. Check the case notes before retrying."); } finally { setSaving(false); }
        }}><Save className="size-4" />{saving ? "Saving…" : saved ? "Saved" : "Save scenario note"}</Button>
        <span className="text-sm text-slate-500">{chosen.label}</span>
      </div>}
      {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
    </div>}
  </Card>;
}

export default function QuickResults({ result: r, saveToken, isAdmin, onReset }: { result: QuickResult; saveToken: string; isAdmin: boolean; onReset: () => void }) {
  const a = r.assessment;
  const sources = (ids: string[]) => ids.map((id) => {
    const e = r.evidence.find((s) => s.id === id);
    return e ? `${id}: ${e.label} · ${e.verifiedAt ? `verified ${e.verifiedAt}` : "calculated / broker checklist"}${e.stale ? " · STALE" : ""}${!e.verified ? " · verify source" : ""}` : id;
  }).join("\n");
  const footnote = (ids: string[]) => <a href="#quick-sources" title={sources(ids)} className="mt-2 block text-xs text-slate-500 underline decoration-dotted underline-offset-4">{ids.map((id) => {
    const e = r.evidence.find((s) => s.id === id); return `${id}${e?.verifiedAt ? ` · ${e.verifiedAt}` : ""}`;
  }).join(" / ")}</a>;
  return <div className="space-y-6" aria-label="Quick scenario results">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="mb-2 flex flex-wrap items-center gap-2"><Badge tone={a.confidence === "low" ? "warning" : "info"}>{a.confidence} confidence</Badge><Badge>{r.aiStatus === "off" || r.aiStatus === "unavailable" ? "Rule-based guidance" : "AI-assisted"}</Badge></div><h2 className="text-xl font-semibold tracking-tight text-slate-900">{a.headline}</h2><p className="mt-1 text-xs text-slate-500">Generated {new Date(r.createdAt).toLocaleString("en-AU")}. Estimates reflect the inputs at that time.</p></div>
      <Button type="button" variant="secondary" className="min-h-11" onClick={onReset}><RotateCcw className="size-4" />New scenario</Button>
    </div>
    <Alert tone={r.aiStatus === "ok" ? "info" : "warning"} title={r.aiStatus === "off" ? "AI is off" : r.aiStatus === "unavailable" ? "AI unavailable" : undefined}>
      {r.aiMessage}{r.aiStatus === "off" && isAdmin && <> <a href="/admin/scenario-settings" className="font-medium underline">Open Scenario settings</a>.</>}
      {r.withheld > 0 && <p className="mt-1">Withheld items: {r.withheld}. Review the remaining points before using them.</p>}
    </Alert>
    <Card title="Say this" actions={<CopyButton all text={[...a.talkingPoints.map((p) => p.text), disclaimer].join("\n\n")} />}>
      {a.talkingPoints.length ? <ul className="divide-y divide-slate-100">{a.talkingPoints.map((p, n) => <li key={n} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"><div className="min-w-0 flex-1"><p className="text-base leading-relaxed text-slate-800">{p.text}</p>{footnote(p.sourceIds)}</div><CopyButton text={p.text} /></li>)}</ul> : <p className="text-sm text-slate-600">AI talking points were withheld. Use the verified figures and checklist below to guide the meeting.</p>}
    </Card>
    <section aria-labelledby="quick-numbers"><h2 id="quick-numbers" className="mb-3 text-base font-semibold text-slate-900">Key numbers <span className="font-normal text-slate-500">· estimates only</span></h2>
      <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 xl:grid-cols-3">{r.figures.map((f) => {
        const needsCheck = f.sourceIds.some((id) => r.evidence.some((e) => e.id === id && (e.stale || !e.verified)));
        const value = needsCheck && f.value !== null ? "Verify source" : f.value === null ? "Not enough information" : f.unit === "pct" ? `${f.value}%` : new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(f.value);
        return <div key={f.key} className="rounded-xl border border-slate-200/80 bg-white p-4"><p className="text-xs font-medium text-slate-500">{f.label}</p><p className={`mt-2 break-words font-semibold tabular-nums text-slate-900 ${f.value === null || needsCheck ? "text-sm" : "text-xl"}`}>{value}</p>{f.note && <p className="mt-2 text-xs leading-relaxed text-slate-500">{f.note}</p>}{footnote(f.sourceIds)}</div>;
      })}</div>
      {a.keyNumbers.length > 0 && <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4"><p className="mb-2 text-sm font-medium">Numbers highlighted by AI</p>{a.keyNumbers.map((n, k) => <div key={k} className="py-2 text-sm"><span className="text-slate-600">{n.label}: </span><span className="font-medium tabular-nums">{n.value}</span>{footnote(n.sourceIds)}</div>)}</div>}
    </section>
    {r.scheme.applicable && <Card title="5% Deposit Scheme · checks to confirm">
      <p className="text-sm text-slate-700">Residency: {r.scheme.residencyEligible === "yes" ? "citizen / permanent resident indicated; verify each applicant" : r.scheme.residencyEligible === "no" ? "does not meet the residency requirement entered" : "needs confirmation"}.</p>
      {r.scheme.capital && !r.evidence.find((e) => e.id === "SCHEME")?.stale && <p className="mt-2 text-sm tabular-nums text-slate-700">Capital / listed regional centres: {r.scheme.capital.withinCap ? "within" : "above"} the {r.scheme.capital.cap.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 })} cap. Other areas: {r.scheme.regional?.withinCap ? "within" : "above"} the {r.scheme.regional?.cap.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 })} cap.</p>}
      <p className="mt-2 text-sm text-slate-500">{r.scheme.note}</p>{footnote(["SCHEME"])}
    </Card>}
    <div className="grid gap-6 lg:grid-cols-2"><TextList title="Strengths" items={a.strengths} /><TextList title="Questions to ask" items={a.questionsToAsk} /></div>
    <Card title="Watch-outs & assumptions"><ul className="space-y-3 text-sm leading-relaxed text-slate-700">{[...r.warnings, ...a.watchOuts.filter((p) => !r.warnings.includes(p.text)).map((p) => p.text)].map((t, n) => <li key={n}>{t}</li>)}</ul></Card>
    <div className="grid gap-6 lg:grid-cols-2"><TextList title="Documents to request" items={a.documentsToRequest} /><TextList title="Next steps" items={a.nextSteps} /></div>
    <TextList title="Compliance reminders" items={a.complianceReminders} />
    <Alert tone="warning">{disclaimer}</Alert>
    <CaseSave saveToken={saveToken} />
    <details id="quick-sources" className="rounded-xl border border-slate-200 bg-white p-5"><summary className="min-h-11 cursor-pointer text-sm font-semibold text-slate-700">Sources & verification dates</summary><ul className="space-y-4 pt-3 text-xs text-slate-600">{r.evidence.map((e) => <li key={e.id}><p className="font-medium">{e.id} · {e.label}</p><p>{e.verifiedAt ? `Verified ${e.verifiedAt}` : "Calculated from entered facts / broker checklist; no external verification date"}{e.stale ? " · STALE — check the source" : ""}{!e.verified ? " · UNVERIFIED" : ""}</p>{[...new Set(e.sourceUrls)].map((url) => <a key={url} href={url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-brand-700 underline">{url}</a>)}</li>)}</ul></details>
  </div>;
}
