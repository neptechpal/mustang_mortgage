import Link from "next/link";
import { notFound } from "next/navigation";
import { Bot, ClipboardList, History, ListChecks, MessageSquare, PenLine, Play, RefreshCw, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { Alert, Badge, Button, EmptyState, PageHeader, TabLinks } from "@/components/admin/ui";
import { fieldsFor, FIELD_DEFS, MAX_APPLICANTS, provenance, labelOf } from "@/modules/scenario/facts";
import { loadFacts, loadTasks, gateBlockers, findEnquirySubmission } from "@/modules/scenario/service";
import { getChecklists, getScenarioSettings } from "@/modules/scenario/settings";
import { TIER_LABEL, type EngineResult } from "@/modules/scenario/engine";
import type { ScenarioCalc } from "@/modules/scenario/calc";
import type { ValidatedAi } from "@/modules/scenario/ai-core";
import FactsForm from "@/modules/scenario/ui/FactsForm";
import { EvidenceProvider, type EvidenceView } from "@/modules/scenario/ui/SourceDrawer";
import { AskView, ComplianceView, FundingCard, HistoryView, ReviewView, Shortlist, SvcForm, TasksView, TIER_TONE } from "@/modules/scenario/ui/views";
import {
  addSvcAction, askAction, complianceAction, gateAction, reimportAction, revokeGateAction, runAction, saveDraftsAction, saveFactsAction, taskAction,
} from "@/modules/scenario/actions";

export const dynamic = "force-dynamic";
const TABS = ["facts", "analysis", "ask", "review", "tasks", "history"] as const;
type Tab = (typeof TABS)[number];
const SYD_DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" });
const iso = (d: Date | null | undefined) => (d ? SYD_DAY.format(d) : null); // YYYY-MM-DD in Sydney

export default async function ScenarioPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff();
  const caseId = Number((await params).id);
  if (!Number.isInteger(caseId)) notFound();
  const sp = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as Tab) : "facts";
  const loaded = await loadFacts(caseId);
  if (!loaded) notFound();
  const { case: c, row, facts } = loaded;

  const [runs, settings, lists, compliance, gates, lenders] = await Promise.all([
    prisma.scnAssessment.findMany({ where: { caseId }, orderBy: { runNo: "desc" } }),
    getScenarioSettings(),
    getChecklists(),
    prisma.scnComplianceItem.findMany({ where: { caseId } }),
    prisma.scnReviewGate.findMany({ where: { caseId }, orderBy: { createdAt: "desc" } }),
    prisma.scnLender.findMany({ where: { onPanel: true }, include: { products: { where: { active: true } } }, orderBy: [{ sort: "asc" }, { name: "asc" }] }),
  ]);
  const current = sp.run ? runs.find((r) => r.id === Number(sp.run)) ?? runs[0] : runs[0];
  const stale = current && current.factsHash !== row.hash;
  const tasks = tab === "tasks" ? await loadTasks(caseId) : [];
  const questions = tab === "ask" && current ? await prisma.scnQuestion.findMany({ where: { assessmentId: current.id }, orderBy: { createdAt: "desc" } }) : [];
  const blockers: Record<string, string[]> = tab === "review" ? { recommendation_ready: (await gateBlockers(caseId, "recommendation_ready")).blockers, application_ready: (await gateBlockers(caseId, "application_ready")).blockers } : {};
  const sub = row.submissionId ? await prisma.formSubmission.findUnique({ where: { id: row.submissionId }, select: { id: true, createdAt: true } }) : await findEnquirySubmission(c);
  const prov = provenance(facts);

  // Evidence used by the current analysis, at the exact versions recorded.
  const evMap: Record<string, EvidenceView> = {};
  if (current) {
    const ev = (current.evidence ?? []) as { type: string; id: number }[];
    const ruleIds = ev.filter((e) => e.type === "rule").map((e) => e.id);
    const priceIds = ev.filter((e) => e.type === "price").map((e) => e.id);
    const [rules, prices] = await Promise.all([
      prisma.scnPolicyRule.findMany({ where: { id: { in: ruleIds } } }),
      prisma.scnPriceRecord.findMany({ where: { id: { in: priceIds } } }),
    ]);
    const sources = await prisma.scnSource.findMany({ where: { id: { in: [...rules.map((r) => r.sourceId), ...prices.map((p) => p.sourceId)] } } });
    const products = await prisma.scnProduct.findMany({ where: { id: { in: prices.map((p) => p.productId) } }, include: { lender: true } });
    const src = new Map(sources.map((s) => [s.id, s]));
    const now = new Date();
    for (const r of rules) {
      const s = src.get(r.sourceId);
      evMap[`R${r.id}`] = {
        id: `R${r.id}`, kind: "rule", heading: `${r.category.replace(/_/g, " ")} — ${r.segment} (v${r.version})`,
        body: [{ label: "Rule as written", value: r.statement }, { label: "Conditions", value: r.conditions }, { label: "Exceptions", value: r.exceptions }, { label: "Structured test", value: `${r.check}: ${JSON.stringify(r.params)}` }, { label: "Effective", value: `${iso(r.effectiveFrom) ?? "—"} → ${iso(r.effectiveTo) ?? "open"}` }, { label: "Reviewer / review due", value: `${r.reviewer || "—"} · ${iso(r.reviewDue) ?? "—"}` }, ...(r.caseId ? [{ label: "Case-specific", value: "BDM confirmation for this case" }] : [])],
        sourceTitle: s ? `${s.title}${s.reference ? ` (${s.reference})` : ""}` : "Source missing", sourceKind: s?.kind, section: r.sourceSection, verifiedAt: iso(r.verifiedAt), status: r.status,
        stale: r.status !== "published" ? `now ${r.status}` : r.reviewDue && r.reviewDue < now ? "review overdue" : undefined,
        url: s?.url || undefined, fileUrl: s?.fileId ? `/api/admin/crm/files/${s.fileId}` : undefined, adminUrl: `/admin/lender-policy/rules/${r.id}`,
      };
    }
    for (const p of prices) {
      const s = src.get(p.sourceId);
      const pr = products.find((x) => x.id === p.productId);
      evMap[`P${p.id}`] = {
        id: `P${p.id}`, kind: "price", heading: `${pr?.lender.name ?? ""} ${pr?.name ?? ""} — ${p.occupancy.replace("_", "-")} ${p.repaymentType}, LVR ${p.lvrMin}–${p.lvrMax}% (v${p.version})`,
        body: [{ label: "Rate", value: `${p.ratePct}%${p.comparisonPct ? ` (comparison ${p.comparisonPct}%)` : ""}` }, { label: "Fees", value: `Upfront $${p.upfrontFees} · annual $${p.annualFee} · monthly $${p.monthlyFee}` }, { label: "Cashback", value: p.cashback ? `$${p.cashback} — ${p.cashbackTerms} (expires ${iso(p.cashbackExpiry) ?? "—"})` : "" }, { label: "Pricing type", value: p.pricingType.replace(/_/g, " ") }, { label: "Expires", value: iso(p.expiresAt) ?? "" }],
        sourceTitle: s?.title, sourceKind: s?.kind, section: p.sourceSection, verifiedAt: iso(p.verifiedAt), status: p.status,
        stale: p.expiresAt && p.expiresAt < now ? "expired" : p.reviewDue && p.reviewDue < now ? "review overdue" : undefined,
        url: s?.url || undefined, fileUrl: s?.fileId ? `/api/admin/crm/files/${s.fileId}` : undefined, adminUrl: `/admin/lender-policy/pricing/${p.id}`,
      };
    }
    const calc = current.calc as ScenarioCalc;
    evMap.CALC = { id: "CALC", kind: "calc", heading: "Server calculation (funding, LVR, repayments)", body: [{ label: "Loan used", value: String(calc.loanUsed ?? "unknown") }, { label: "LVR", value: calc.lvrPct !== null ? `${calc.lvrPct}%` : "unknown" }, { label: "Funding gap", value: String(calc.fundingGap ?? "unknown") }, { label: "Version", value: current.calcVersion }] };
  }

  const tabs = [
    { href: `?tab=facts`, label: <span className="inline-flex items-center gap-1.5"><ClipboardList className="size-4" /> Facts</span>, active: tab === "facts", count: prov.missing.length || undefined },
    { href: `?tab=analysis${current ? `&run=${current.id}` : ""}`, label: <span className="inline-flex items-center gap-1.5"><Sparkles className="size-4" /> Assessment</span>, active: tab === "analysis" },
    { href: `?tab=ask`, label: <span className="inline-flex items-center gap-1.5"><MessageSquare className="size-4" /> Ask</span>, active: tab === "ask" },
    { href: `?tab=review`, label: <span className="inline-flex items-center gap-1.5"><PenLine className="size-4" /> Drafts &amp; review</span>, active: tab === "review" },
    { href: `?tab=tasks`, label: <span className="inline-flex items-center gap-1.5"><ListChecks className="size-4" /> Tasks &amp; compliance</span>, active: tab === "tasks" },
    { href: `?tab=history`, label: <span className="inline-flex items-center gap-1.5"><History className="size-4" /> History</span>, active: tab === "history", count: runs.length || undefined },
  ];

  const engine = (current?.engine ?? null) as EngineResult | null;
  const summary = engine ? (["fit", "conditional", "verify", "outside"] as const).map((t) => [t, engine.candidates.filter((x) => x.tier === t).length] as const).filter(([, n]) => n) : [];
  const run = runAction.bind(null, caseId);

  return (
    <EvidenceProvider map={evMap}>
      <PageHeader
        breadcrumbs={[{ label: "Cases", href: "/admin/cases" }, { label: c.title || `Case #${c.id}`, href: `/admin/cases/${c.id}` }, { label: "Scenario" }]}
        icon={<Bot />}
        title="Assess scenario"
        description={
          <>
            {sub ? <>From website enquiry <Link className="text-brand-700 hover:underline" href={`/admin/submissions/${sub.id}`}>#{sub.id}</Link> · </> : null}
            {prov.enquiry + prov.case} pre-filled · {prov.broker} broker-entered · {prov.verified} verified · {prov.missing.length} missing
          </>
        }
        actions={
          <form action={run}>
            <Button type="submit" variant="primary"><Play /> {current ? "Rerun assessment" : "Run assessment"}</Button>
          </form>
        }
      />
      {sp.msg && <Alert tone="success" className="mb-4">{sp.msg}</Alert>}
      {sp.err && <Alert tone="danger" className="mb-4">{sp.err}</Alert>}
      {!settings.aiEnabled && <Alert tone="info" className="mb-4">AI explanations are off. Facts, calculations, the rule-based shortlist, tasks and drafts still work. An admin can enable AI in Scenario settings once privacy requirements are confirmed.</Alert>}
      {settings.aiEnabled && !settings.privacyConfirmed && <Alert tone="warning" className="mb-4">AI is on but the business has not confirmed privacy notice / consent / provider assessment for live enquiries. Use synthetic records only.</Alert>}
      {stale && <Alert tone="warning" className="mb-4" title="Facts changed">The latest analysis (run #{current!.runNo}) used different facts and is superseded. Rerun to refresh the shortlist, tasks and drafts.</Alert>}
      {engine && tab !== "facts" && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span>Run #{current!.runNo} · {current!.status}</span>
          {summary.map(([t, n]) => <Badge key={t} tone={TIER_TONE[t]}>{n} {TIER_LABEL[t]}</Badge>)}
        </div>
      )}
      <TabLinks tabs={tabs} className="mb-6" />

      {tab === "facts" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">Correct anything that came from the enquiry and tick <strong>Verified</strong> once checked against evidence. Missing values stay unknown — nothing is assumed.</p>
            <form action={reimportAction.bind(null, caseId)}><Button type="submit" variant="ghost" size="sm"><RefreshCw /> Re-fill blanks from enquiry</Button></form>
          </div>
          <FactsForm defs={fieldsFor({ ...facts, "app.count": { v: MAX_APPLICANTS } })} facts={facts} action={saveFactsAction.bind(null, caseId)} maxApplicants={MAX_APPLICANTS} />
          {prov.missing.length > 0 && <p className="text-xs text-slate-500">Missing: {prov.missing.slice(0, 20).map(labelOf).join(", ")}{prov.missing.length > 20 ? "…" : ""}</p>}
        </div>
      )}

      {tab !== "facts" && tab !== "history" && tab !== "tasks" && !current && (
        <EmptyState icon={<Sparkles />} title="No assessment yet" description="Check the facts, then run the assessment." action={<form action={run}><Button type="submit" variant="primary"><Play /> Run assessment</Button></form>} />
      )}

      {tab === "analysis" && current && engine && (
        <div className="space-y-6">
          <FundingCard calc={current.calc as ScenarioCalc} />
          <Shortlist engine={engine} ai={current.ai as Partial<ValidatedAi>} aiStatus={current.aiStatus} aiError={current.aiError} />
          <SvcForm action={addSvcAction.bind(null, caseId)} lenders={lenders.map((l) => ({ id: l.id, name: l.name, products: l.products.map((p) => ({ id: p.id, name: p.name })) }))} />
        </div>
      )}

      {tab === "ask" && current && (
        <AskView questions={questions} action={askAction.bind(null, caseId, current.id)} disabled={!settings.aiEnabled} reason="Case Q&A needs the AI service, which is switched off. Use the policy checks on the Assessment tab or ask the BDM." />
      )}

      {tab === "review" && current && engine && (
        <ReviewView a={current} engine={engine} action={saveDraftsAction.bind(null, caseId, current.id)} gateAction={gateAction.bind(null, caseId)} revokeAction={revokeGateAction.bind(null, caseId)} gates={gates} blockers={blockers} />
      )}

      {tab === "tasks" && (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-[15px] font-semibold text-slate-900">Follow-up tasks</h2>
            <p className="mb-3 text-xs text-slate-500">Also shown in this case&apos;s Notes &amp; Reminders and on the broker dashboard. Reruns refresh them — completed tasks stay completed and open ones are never duplicated.</p>
            <TasksView tasks={tasks} taskAction={taskAction.bind(null, caseId)} />
          </section>
          <ComplianceView lists={lists} items={compliance} action={complianceAction.bind(null, caseId)} />
        </div>
      )}

      {tab === "history" && <HistoryView runs={runs} caseId={caseId} current={current?.id} />}
      <p className="mt-8 text-xs text-slate-400">Field catalogue: {FIELD_DEFS.length} structured fields. Analyses are stored separately from the lead with fact snapshots and source versions.</p>
    </EvidenceProvider>
  );
}
