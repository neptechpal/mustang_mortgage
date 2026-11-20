// Server-rendered sections of the case Scenario page.
import { AlertTriangle, Calculator, CheckCircle2, CircleHelp, Clock, Info, Landmark, MessageSquare, ShieldAlert, ShieldCheck } from "lucide-react";
import type { ScnAssessment, ScnComplianceItem, ScnQuestion, ScnReviewGate, ScnTask } from "@prisma/client";
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Select, Textarea, cn, type Tone } from "@/components/admin/ui";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import { labelOf } from "../facts";
import type { ScenarioCalc } from "../calc";
import { COST_DISCLOSURE, TIER_LABEL, type Candidate, type EngineResult, type Tier } from "../engine";
import type { ValidatedAi } from "../ai-core";
import type { Checklists } from "../settings";
import { SourceChip } from "./SourceDrawer";

export const TIER_TONE: Record<Tier, Tone> = { fit: "success", conditional: "info", verify: "warning", outside: "danger" };
const money = (n: number | null | undefined, cents = false) =>
  n === null || n === undefined ? "—" : n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: cents ? 2 : 0 });
const pct = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n.toFixed(2).replace(/\.00$/, "")}%`);
const syd = (d: Date | string | null | undefined, time = false) =>
  d ? new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", dateStyle: "medium", ...(time ? { timeStyle: "short" } : {}) }).format(new Date(d)) : "—";

/* ------------------------------------------------------------------ analysis */

export function FundingCard({ calc }: { calc: ScenarioCalc }) {
  const basisTone: Record<string, Tone> = { entered: "neutral", estimate: "warning", derived: "info", missing: "danger" };
  const row = (label: string, v: string, note?: string, tone?: Tone) => (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="text-slate-600">{label}{note && <span className="ml-1.5 text-xs text-slate-400">{note}</span>}</span>
      <span className={cn("font-medium tabular-nums text-slate-900", tone === "danger" && "text-red-600", tone === "success" && "text-emerald-700")}>{v}</span>
    </div>
  );
  return (
    <Card title="Loan, LVR and funds to complete" description={`Security value: ${calc.securityBasis || "unknown"} · ${calc.loanBasis}`}>
      <div className="grid gap-6 lg:grid-cols-3">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Loan</p>
          {row("Loan used for comparison", money(calc.loanUsed))}
          {calc.loanNeeded !== null && calc.loanNeeded !== calc.loanUsed && row("Loan the numbers require", money(calc.loanNeeded))}
          {calc.lmiCapitalised > 0 && row("Capitalised LMI", money(calc.lmiCapitalised))}
          {row("Total loan", money(calc.totalLoan))}
          {row("Security value", money(calc.securityValue))}
          {row("LVR", pct(calc.lvrPct), calc.lvrInclLmiPct !== calc.lvrPct ? `incl. LMI ${pct(calc.lvrInclLmiPct)}` : undefined)}
          {calc.depositPct !== null && row("Deposit", pct(calc.depositPct))}
          {calc.genuineSavingsPct !== null && row("Savings / price", pct(calc.genuineSavingsPct))}
          {row(`Term / repayments`, `${calc.termYears} yrs · ${calc.repaymentType}${calc.repaymentType === "IO" ? ` (${calc.ioYears} yrs IO)` : ""}`)}
        </div>
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Costs</p>
          {calc.costs.map((c) => (
            <div key={c.key} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
              <span className="min-w-0 text-slate-600">
                {c.label} <Badge tone={basisTone[c.basis]} className="ml-1">{c.basis}</Badge>
                {c.note && <span className="block truncate text-xs text-slate-400" title={c.note}>{c.note}</span>}
              </span>
              <span className="font-medium tabular-nums text-slate-900">{money(c.amount)}</span>
            </div>
          ))}
          <div className="mt-1 border-t border-slate-100 pt-1">{row("Total costs", money(calc.totalCosts))}</div>
          {row("Funds required", money(calc.fundsRequired))}
        </div>
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Contributions</p>
          {calc.contributions.map((c) => <div key={c.key}>{row(c.label, money(c.amount), c.basis === "missing" ? "unknown" : undefined)}</div>)}
          <div className="mt-1 border-t border-slate-100 pt-1">{row("Total contributions", money(calc.totalContributions))}</div>
          {row("Funding gap", calc.fundingGap === null ? "—" : calc.fundingGap > 0 ? `${money(calc.fundingGap)} short` : `${money(-calc.fundingGap)} surplus`, undefined, calc.fundingGap !== null && calc.fundingGap > 0 ? "danger" : "success")}
        </div>
      </div>
      {(calc.flags.length > 0 || calc.missing.length > 0 || calc.assumptions.length > 0) && (
        <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-3">
          {calc.missing.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700"><CircleHelp className="size-3.5" /> Missing</p>
              <ul className="mt-1 space-y-0.5 text-xs text-slate-600">{calc.missing.map((m) => <li key={m}>{labelOf(m)}</li>)}</ul>
            </div>
          )}
          {calc.flags.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-red-700"><AlertTriangle className="size-3.5" /> Flags</p>
              <ul className="mt-1 space-y-0.5 text-xs text-slate-600">{calc.flags.map((m) => <li key={m}>{m}</li>)}</ul>
            </div>
          )}
          {calc.assumptions.length > 0 && (
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-700"><Info className="size-3.5" /> Assumptions</p>
              <ul className="mt-1 space-y-0.5 text-xs text-slate-600">{calc.assumptions.map((m) => <li key={m}>{m}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function SvcCell({ c }: { c: Candidate }) {
  const s = c.serviceability;
  if (s.state === "current")
    return (
      <span className={cn("text-sm tabular-nums", s.shortfall ? "text-red-600" : "text-slate-900")}>
        {money(s.maxBorrowing)} <span className="block text-xs text-slate-500">{s.calculator} · {s.calculatedAt}</span>
      </span>
    );
  return <Badge tone="warning">{s.state === "obsolete" ? "Rerun lender calculator" : "Run lender calculator"}</Badge>;
}

function PriceCell({ c }: { c: Candidate }) {
  const p = c.pricing;
  if (!p.ratePct) return <span className="text-xs text-slate-500">{p.label}</span>;
  return (
    <div className="text-sm">
      <span className="font-medium tabular-nums text-slate-900">{p.ratePct.toFixed(2)}%</span>
      {p.comparisonPct ? <span className="text-xs text-slate-500"> ({p.comparisonPct.toFixed(2)}% comp.)</span> : null}
      <span className="block text-xs tabular-nums text-slate-600">{money(p.monthly)}/mth · 3-yr {money(p.cost3y)}</span>
      <span className="mt-0.5 flex flex-wrap gap-1">
        <Badge tone={p.state === "verified" ? "success" : "warning"}>{p.state === "verified" ? `Verified ${p.verifiedAt}` : "Verify pricing"}</Badge>
        <Badge>{p.label}</Badge>
        {p.recordId ? <SourceChip id={`P${p.recordId}`} /> : null}
      </span>
      {p.cashback ? <span className="block text-xs text-slate-500">Cashback {money(p.cashback)}{p.cashbackCounted ? "" : " (not counted)"}</span> : null}
    </div>
  );
}

export function Shortlist({ engine, ai, aiStatus, aiError }: { engine: EngineResult; ai: Partial<ValidatedAi>; aiStatus: string; aiError: string }) {
  if (!engine.candidates.length)
    return (
      <Card title="Shortlist">
        <EmptyState icon={<Landmark />} title="No lenders on the panel" description="Add lenders, products and published policy in Lender policy, then rerun." />
      </Card>
    );
  const aiC = ai.candidates ?? {};
  return (
    <Card
      title="Lender shortlist"
      description={`Panel considered: ${engine.panel.map((p) => p.name).join(", ")}. Ranked by policy fit, the client's must-have features, verified cost and conditions — broker commission and referral revenue are never used.`}
      actions={<Badge tone={aiStatus === "ok" ? "success" : aiStatus === "partial" ? "warning" : aiStatus === "off" ? "neutral" : "danger"}>AI: {aiStatus}</Badge>}
    >
      {aiStatus !== "ok" && aiError && <Alert tone={aiStatus === "off" ? "info" : "warning"} className="mb-4">{aiError} The rule-based results below are complete without it.</Alert>}
      {ai.overall?.summary && <p className="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{ai.overall.summary}</p>}
      <div className="space-y-3">
        {engine.candidates.map((c) => {
          const x = aiC[c.id];
          const tier = x?.status ?? c.tier;
          const open = [...c.missing.map(labelOf), ...(x?.openQuestions ?? [])];
          return (
            <details key={c.id} className="group rounded-xl border border-slate-200/80 bg-white open:shadow-sm">
              <summary className="grid cursor-pointer list-none gap-3 p-4 md:grid-cols-[28px_minmax(0,1.3fr)_minmax(0,1.6fr)_150px_170px] md:items-start [&::-webkit-details-marker]:hidden">
                <span className="flex size-7 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold tabular-nums text-slate-600">{c.rank}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{c.lenderName}</p>
                  <p className="text-sm text-slate-600">{c.productName}</p>
                  <Badge tone={TIER_TONE[tier]} dot className="mt-1">{TIER_LABEL[tier]}</Badge>
                  {x?.statusNote && <p className="mt-1 text-xs text-slate-500">{x.statusNote}</p>}
                </div>
                <div className="min-w-0 text-sm">
                  <ul className="space-y-0.5 text-slate-700">{c.reasons.slice(0, 3).map((r, i) => <li key={i} className="truncate" title={r}>{r}</li>)}</ul>
                  {open.length > 0 && <p className="mt-1 text-xs text-amber-700">{open.length} open question{open.length > 1 ? "s" : ""}</p>}
                  <p className="mt-1 text-xs font-medium text-brand-700">Next: {c.nextCheck}</p>
                </div>
                <div><p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 md:hidden">Serviceability</p><SvcCell c={c} /></div>
                <div><p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 md:hidden">Pricing</p><PriceCell c={c} /></div>
              </summary>
              <div className="grid gap-5 border-t border-slate-100 p-4 lg:grid-cols-2">
                <div className="min-w-0 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Policy checks</p>
                  <ul className="space-y-1.5 text-sm">
                    {c.rules.filter((r) => r.status !== "n/a").map((r, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Badge tone={r.status === "pass" ? "success" : r.status === "fail" ? "danger" : r.status === "conditional" ? "info" : r.status === "info" ? "neutral" : "warning"}>{r.status}</Badge>
                        <span className="min-w-0 flex-1 text-slate-700">
                          {r.reason}
                          {r.stale && <span className="ml-1 text-xs text-amber-700">({r.stale})</span>}
                          {r.conflict && <span className="ml-1 text-xs text-red-600">(conflict)</span>}
                          {r.caseSpecific && <span className="ml-1 text-xs text-violet-700">(BDM confirmation for this case)</span>}
                        </span>
                        <SourceChip id={`R${r.ruleId}`} />
                      </li>
                    ))}
                  </ul>
                  {[["Missing policy evidence", c.missingEvidence], ["Conflicts", c.conflicts], ["Stale evidence", c.stale], ["Written confirmation needed", c.confirmations], ["Evidence to collect", c.evidenceNeeded]].map(([t, xs]) =>
                    (xs as string[]).length ? (
                      <div key={t as string}>
                        <p className="text-xs font-semibold text-slate-600">{t as string}</p>
                        <ul className="list-disc pl-5 text-xs text-slate-600">{(xs as string[]).map((m, i) => <li key={i}>{m}</li>)}</ul>
                      </div>
                    ) : null,
                  )}
                  {c.features.missingMustHave.length > 0 && <p className="text-xs text-amber-700">Missing must-have features: {c.features.missingMustHave.join(", ")}</p>}
                  <p className="text-xs text-slate-500">Rank reason: {c.rankReason}</p>
                </div>
                <div className="min-w-0 space-y-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">AI explanation</p>
                  {x ? (
                    <>
                      {x.summary && <p className="text-sm text-slate-700">{x.summary}</p>}
                      <ul className="space-y-1.5 text-sm">
                        {x.claims.map((cl, i) => (
                          <li key={i} className="flex flex-wrap items-start gap-1.5 text-slate-700">
                            <span className="min-w-0 flex-1">{cl.text}</span>
                            {cl.sourceIds.map((s) => <SourceChip key={s} id={s} />)}
                          </li>
                        ))}
                      </ul>
                      {open.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-600">Open questions</p>
                          <ul className="list-disc pl-5 text-xs text-slate-600">{open.map((m, i) => <li key={i}>{m}</li>)}</ul>
                        </div>
                      )}
                      {x.assumptions.length > 0 && <p className="text-xs text-slate-500">Assumptions: {x.assumptions.join("; ")}</p>}
                      {x.nextActions.length > 0 && <p className="text-xs text-slate-600">Next actions: {x.nextActions.join("; ")}</p>}
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">No AI explanation for this option{aiStatus === "off" ? " (AI off)" : ""}. Use the rule results on the left.</p>
                  )}
                  {(ai.withheld ?? []).filter((w) => w.candidateId === c.id).length > 0 && (
                    <Alert tone="warning" title="Withheld AI statements">
                      <ul className="list-disc pl-4 text-xs">{(ai.withheld ?? []).filter((w) => w.candidateId === c.id).map((w, i) => <li key={i}><em>{w.why}</em></li>)}</ul>
                    </Alert>
                  )}
                </div>
              </div>
            </details>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-slate-500">{COST_DISCLOSURE}</p>
    </Card>
  );
}

export function SvcForm({ action, lenders }: { action: (fd: FormData) => void; lenders: { id: number; name: string; products: { id: number; name: string }[] }[] }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Card title={<span className="flex items-center gap-2"><Calculator className="size-4 text-slate-400" /> Record a lender calculator result</span>} description="Enter the maximum borrowing from an approved lender or aggregator calculator. It is tied to the current income, commitments and loan terms — if those change, the result is suppressed until rerun. Product loan limits and funding needs are kept separate.">
      <form action={action} className="grid gap-3 md:grid-cols-6">
        <Field label="Lender / product" className="md:col-span-2">
          <Select name="lenderId" required defaultValue="">
            <option value="" disabled>Choose…</option>
            {lenders.map((l) => <option key={l.id} value={l.id}>{l.name} (all products)</option>)}
          </Select>
        </Field>
        <Field label="Calculator name" className="md:col-span-2"><Input name="calculator" required placeholder="e.g. Lender serviceability calc v3" /></Field>
        <Field label="Max borrowing"><Input name="maxBorrowing" inputMode="decimal" required placeholder="$" /></Field>
        <Field label="Calculated on"><Input type="date" name="calculatedAt" defaultValue={today} max={today} required /></Field>
        <Field label="Note (inputs used, assumptions)" className="md:col-span-5"><Input name="note" /></Field>
        <div className="flex items-end"><Button type="submit" variant="secondary" className="w-full">Save result</Button></div>
      </form>
    </Card>
  );
}

/* ------------------------------------------------------------------ ask */

type Answer = { status?: string; answer?: string; claims?: { text: string; sourceIds: string[] }[]; withheld?: { text: string; why: string }[]; confidence?: string; needsBdmConfirmation?: boolean; bdmQuestion?: string; error?: string };

export function AskView({ questions, action, disabled, reason }: { questions: ScnQuestion[]; action: (fd: FormData) => void; disabled: boolean; reason: string }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        {questions.length === 0 && <EmptyState icon={<MessageSquare />} title="No questions yet" description="Ask about this case — answers use only the approved, published sources for the lenders on the panel." />}
        {questions.map((q) => {
          const a = q.answer as Answer;
          return (
            <div key={q.id} className="rounded-xl border border-slate-200/80 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">{q.question}</p>
              <p className="text-xs text-slate-400">{q.askedBy} · {syd(q.createdAt, true)}</p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                {q.status === "unavailable" ? (
                  <Alert tone="warning">AI unavailable: {a.error}</Alert>
                ) : q.status === "out_of_scope" ? (
                  <Alert tone="info">{a.answer || "Only case-specific questions answered from approved sources."}</Alert>
                ) : (
                  <>
                    {a.answer ? <p className="whitespace-pre-wrap">{a.answer}</p> : <Alert tone="warning" title="Answer withheld">The answer could not be tied to an approved source. Confirm with the BDM.</Alert>}
                    {a.claims && a.claims.length > 0 && (
                      <ul className="space-y-1">{a.claims.map((c, i) => <li key={i} className="flex flex-wrap items-start gap-1.5"><span className="min-w-0 flex-1">{c.text}</span>{c.sourceIds.map((s) => <SourceChip key={s} id={s} />)}</li>)}</ul>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {a.confidence && <Badge tone={a.confidence === "high" ? "success" : a.confidence === "medium" ? "info" : "warning"}>confidence: {a.confidence}</Badge>}
                      {a.needsBdmConfirmation && <Badge tone="warning">Confirm with BDM</Badge>}
                      {(a.withheld?.length ?? 0) > 0 && <Badge tone="danger">{a.withheld!.length} statement(s) withheld</Badge>}
                    </div>
                    {a.bdmQuestion && <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-600"><span className="font-semibold">Suggested BDM question:</span> {a.bdmQuestion}</p>}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Card title="Ask about this case" className="xl:sticky xl:top-36 self-start">
        {disabled ? (
          <Alert tone="info">{reason}</Alert>
        ) : (
          <form action={action} className="space-y-3">
            <Textarea name="question" required minLength={5} maxLength={1000} placeholder="e.g. Does this lender accept both applicants' weekend penalty income?" />
            <p className="text-xs text-slate-500">Tied to the current analysis and approved sources only. Don&apos;t include names or contact details.</p>
            <Button type="submit" variant="primary" className="w-full">Ask</Button>
          </form>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ review */

export function ReviewView({ a, engine, action, gateAction, revokeAction, gates, blockers }: {
  a: ScnAssessment; engine: EngineResult; action: (fd: FormData) => void; gateAction: (fd: FormData) => void; revokeAction: (fd: FormData) => void;
  gates: ScnReviewGate[]; blockers: Record<string, string[]>;
}) {
  const locked = a.status !== "draft";
  const sel = (a.selections ?? {}) as Record<string, { decision: string; reason: string }>;
  return (
    <div className="space-y-6">
      {a.status === "reviewed" && <Alert tone="success" title="Signed off">Reviewed by {a.reviewedBy} on {syd(a.reviewedAt, true)}. This record is locked; rerun the assessment to change anything.</Alert>}
      {a.status === "superseded" && <Alert tone="warning" title="Superseded">{a.supersededWhy} ({syd(a.supersededAt, true)}). Kept for history — rerun for a current analysis.</Alert>}
      <form action={action} className="space-y-6">
        <input type="hidden" name="tab" value="review" />
        <Card title="Options considered" description="Record why each option was selected or excluded (best interests duty). Required before sign-off for selected / excluded options.">
          <div className="divide-y divide-slate-100">
            {engine.candidates.map((c) => (
              <div key={c.id} className="grid gap-2 py-3 md:grid-cols-[minmax(0,1fr)_160px_minmax(0,1.4fr)] md:items-center">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{c.rank}. {c.lenderName} — {c.productName}</p>
                  <Badge tone={TIER_TONE[c.tier]}>{TIER_LABEL[c.tier]}</Badge>
                </div>
                <Select name={`sel:${c.id}`} defaultValue={sel[c.id]?.decision ?? "considered"} disabled={locked}>
                  <option value="considered">Considered</option>
                  <option value="selected">Selected</option>
                  <option value="excluded">Excluded</option>
                </Select>
                <Input name={`why:${c.id}`} defaultValue={sel[c.id]?.reason ?? ""} placeholder="Reason" disabled={locked} />
              </div>
            ))}
          </div>
        </Card>
        <div className="grid gap-6 xl:grid-cols-2">
          <Card title="Client update (editable draft)" description="Never sent automatically. Copy into your email once reviewed.">
            <Textarea name="clientUpdate" defaultValue={a.clientUpdate} className="min-h-[260px] font-[inherit]" disabled={locked} />
          </Card>
          <Card title="BDM enquiry draft" description="Only where written lender confirmation or policy evidence is missing, stale or conflicting.">
            <Textarea name="bdmDraft" defaultValue={a.bdmDraft} className="min-h-[260px]" disabled={locked} placeholder="No BDM enquiry needed." />
          </Card>
        </div>
        <Card title="Broker rationale and sign-off">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Rationale (objectives, why options selected/excluded, trade-offs)" required>
              <Textarea name="rationale" defaultValue={a.rationale} className="min-h-[140px]" disabled={locked} />
            </Field>
            <Field label="Override reason (if departing from the shortlist or a flag)">
              <Textarea name="overrideReason" defaultValue={a.overrideReason} className="min-h-[140px]" disabled={locked} />
            </Field>
          </div>
          {!locked && (
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button type="submit" variant="secondary">Save draft</Button>
              <ConfirmSubmit name="signoff" value="1" message="Sign off this analysis? It will be locked and kept as the reviewed record." className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                <ShieldCheck className="size-4" /> Mark reviewed &amp; sign off
              </ConfirmSubmit>
            </div>
          )}
        </Card>
      </form>

      <Card title="Human review gates" description="A recommendation can't be marked ready to share, nor an application ready to lodge, without a named reviewer. Reviewer, date, evidence, calculator results, rationale and any override are preserved.">
        <div className="grid gap-6 lg:grid-cols-2">
          {(["recommendation_ready", "application_ready"] as const).map((g) => {
            const done = gates.filter((x) => x.gate === g && !x.revoked);
            const b = blockers[g] ?? [];
            return (
              <div key={g} className="rounded-lg border border-slate-200 p-4">
                <p className="flex items-center gap-2 font-semibold text-slate-900">
                  {done.length ? <CheckCircle2 className="size-4 text-emerald-600" /> : <ShieldAlert className="size-4 text-amber-600" />}
                  {g === "recommendation_ready" ? "Recommendation ready to share" : "Application ready to lodge"}
                </p>
                {done.map((x) => (
                  <div key={x.id} className="mt-2 rounded-md bg-emerald-50 p-2 text-xs text-emerald-900">
                    {x.reviewer} · {syd(x.createdAt, true)}{x.overrideReason && <span className="block text-amber-800">Override: {x.overrideReason}</span>}
                    <span className="block text-emerald-800">{x.rationale}</span>
                    <form action={revokeAction} className="mt-1"><input type="hidden" name="id" value={x.id} /><button className="text-xs text-slate-500 underline">Revoke</button></form>
                  </div>
                ))}
                {b.length > 0 && <ul className="mt-2 list-disc pl-5 text-xs text-amber-800">{b.map((x) => <li key={x}>{x}</li>)}</ul>}
                <form action={gateAction} className="mt-3 space-y-2">
                  <input type="hidden" name="gate" value={g} />
                  <Textarea name="rationale" placeholder="Reviewer rationale" className="min-h-[64px]" required />
                  {b.length > 0 && <Textarea name="overrideReason" placeholder="Override reason (required while blockers remain)" className="min-h-[56px]" />}
                  <Button type="submit" variant={b.length ? "secondary" : "primary"} size="sm">Mark as reviewed by me</Button>
                </form>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ tasks + compliance */

export function TasksView({ tasks, taskAction }: { tasks: ScnTask[]; taskAction: (fd: FormData) => void }) {
  if (!tasks.length) return <EmptyState icon={<Clock />} title="No follow-up tasks" description="Tasks are generated when you run the assessment." />;
  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/80 bg-white">
      {tasks.map((t) => (
        <div key={t.id} className={cn("grid gap-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_340px] md:items-center", t.status !== "open" && "bg-slate-50/60")}>
          <div className="min-w-0">
            <p className={cn("text-sm font-medium", t.status === "open" ? "text-slate-900" : "text-slate-400 line-through")}>{t.title}</p>
            <p className="text-xs text-slate-500">{t.detail}</p>
            <p className="mt-0.5 flex flex-wrap gap-1.5 text-xs text-slate-400">
              <Badge>{t.category.replace(/_/g, " ")}</Badge>
              <Badge tone={t.status === "open" ? "warning" : t.status === "done" ? "success" : "neutral"}>{t.status}</Badge>
              {t.doneBy && <span>{t.doneBy} {syd(t.doneAt)}</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <form action={taskAction} className="flex items-center gap-1.5">
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="op" value="edit" />
              <Input name="owner" defaultValue={t.owner} className="h-8 w-28 text-xs" aria-label="Owner" />
              <Input type="date" name="dueAt" defaultValue={t.dueAt ? new Date(t.dueAt).toISOString().slice(0, 10) : ""} className="h-8 w-36 text-xs" aria-label="Due" />
              <Button type="submit" size="xs" variant="ghost">Save</Button>
            </form>
            <form action={taskAction}>
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="op" value={t.status === "open" ? "done" : "open"} />
              <Button type="submit" size="xs" variant={t.status === "open" ? "secondary" : "ghost"}>{t.status === "open" ? "Done" : "Reopen"}</Button>
            </form>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ComplianceView({ lists, items, action }: { lists: Checklists; items: ScnComplianceItem[]; action: (fd: FormData) => void }) {
  const stages: [string, string][] = [["enquiry", "Enquiry"], ["recommendation", "Recommendation"], ["application", "Application"], ["approval", "Approval"], ["settlement", "Settlement"]];
  return (
    <Card title="Stage checklists" description={lists.confirmed ? `Templates confirmed by ${lists.confirmedBy} (${lists.confirmedAt}).` : undefined}>
      {!lists.confirmed && <Alert tone="warning" className="mb-4">Draft templates — the licensee / aggregator must confirm items, triggers and retention before launch.</Alert>}
      <div className="grid gap-5 lg:grid-cols-2">
        {stages.map(([k, label]) => (
          <div key={k}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            <ul className="space-y-1.5">
              {(lists.stages[k] ?? []).map((it) => {
                const x = items.find((i) => i.stage === k && i.itemKey === it.key);
                return (
                  <li key={it.key}>
                    <form action={action} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                      <input type="hidden" name="stage" value={k} />
                      <input type="hidden" name="key" value={it.key} />
                      {it.kind === "check" ? (
                        <>
                          <input type="hidden" name="done" value={x?.done ? "0" : "1"} />
                          <button type="submit" className={cn("flex size-5 items-center justify-center rounded border", x?.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300")} aria-label="Toggle">
                            {x?.done && <CheckCircle2 className="size-3.5" />}
                          </button>
                          <span className="min-w-0 flex-1 text-sm text-slate-700">{it.label}{it.required && <span className="text-red-500"> *</span>}</span>
                          {x?.by && <span className="text-xs text-slate-400">{x.by}</span>}
                        </>
                      ) : (
                        <>
                          <span className="min-w-0 flex-1 text-sm text-slate-700">{it.label}{it.required && <span className="text-red-500"> *</span>}</span>
                          <Input type="date" name="date" defaultValue={x?.date ?? ""} className="h-8 w-36 text-xs" />
                          <Button type="submit" size="xs" variant="ghost">Save</Button>
                        </>
                      )}
                    </form>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ history */

export function HistoryView({ runs, caseId, current }: { runs: ScnAssessment[]; caseId: number; current?: number }) {
  if (!runs.length) return <EmptyState icon={<Clock />} title="No analyses yet" />;
  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/80 bg-white">
      {runs.map((r) => {
        const ev = (r.evidence ?? []) as { type: string; id: number; version?: number; key?: string }[];
        return (
          <a key={r.id} href={`/admin/cases/${caseId}/scenario?tab=analysis&run=${r.id}`} className={cn("grid gap-2 px-4 py-3 hover:bg-slate-50 md:grid-cols-[80px_minmax(0,1fr)_200px] md:items-center", current === r.id && "bg-brand-50/50")}>
            <span className="text-sm font-semibold tabular-nums text-slate-900">Run #{r.runNo}</span>
            <span className="min-w-0 text-sm text-slate-600">
              {syd(r.createdAt, true)} by {r.createdBy} · facts {r.factsHash.slice(0, 8)} · {ev.filter((e) => e.type === "rule").length} rule versions, {ev.filter((e) => e.type === "price").length} price records · AI {r.aiStatus}{r.aiModel ? ` (${r.aiModel})` : ""} · {r.promptVersion} / {r.calcVersion}
              {r.status === "superseded" && <span className="block text-xs text-amber-700">{r.supersededWhy}</span>}
            </span>
            <span className="flex flex-wrap gap-1.5 md:justify-end">
              <Badge tone={r.status === "reviewed" ? "success" : r.status === "superseded" ? "neutral" : "info"}>{r.status}</Badge>
              {r.reviewedBy && <Badge tone="success">signed off · {r.reviewedBy}</Badge>}
            </span>
          </a>
        );
      })}
    </div>
  );
}
