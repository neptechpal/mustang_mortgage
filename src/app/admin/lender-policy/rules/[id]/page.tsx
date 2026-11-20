import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleSlash, ListChecks, Pencil, Send, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import { Alert, Badge, Button, Card, KeyValue, LinkButton, PageHeader, buttonStyles } from "@/components/admin/ui";
import { getScenarioSettings } from "@/modules/scenario/settings";
import { CHECKS, parseParams } from "@/modules/scenario/policy/checks";
import { deleteRuleDraftAction, publishRuleAction, withdrawRuleAction } from "@/modules/scenario/policy/admin";
import { categoryLabel, loadLookups } from "@/modules/scenario/policy/data";
import { BASE, fmtDate, recordFlags, sourceKindLabel, startOfTodaySydney, statusLabel } from "@/modules/scenario/policy/meta";
import { FlagBadges, Flash, StatusBadge, paramsSummary } from "@/modules/scenario/policy/ui/parts";
import { Readiness, VersionHistory } from "@/modules/scenario/policy/ui/Lifecycle";
import { RuleForm } from "@/modules/scenario/policy/ui/RuleForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Policy rule" };

export default async function RulePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requireStaff();
  const isAdmin = s.role === "ADMIN";
  const { id } = await params;
  const sp = await searchParams;
  const [lk, settings] = await Promise.all([loadLookups(), getScenarioSettings()]);
  const crumbs = [{ label: "Lender policy", href: BASE }, { label: "Policy rules", href: `${BASE}?tab=rules` }];

  if (id === "new") {
    return (
      <div className="max-w-5xl">
        <PageHeader icon={<ListChecks />} breadcrumbs={[...crumbs, { label: "New" }]} title="New policy rule" description="One structured check for one lender, citing an authorised source. Saved as a draft for an admin to publish." />
        <Flash sp={sp} />
        {lk.lenders.length === 0 ? (
          <Alert tone="warning" title="Add a lender first">Rules belong to a lender. <Link href={`${BASE}/lenders/new`} className="font-medium underline">Add lender</Link></Alert>
        ) : (
          <RuleForm rule={null} lk={lk} defaultLender={Number(sp.lender) || null} reviewDays={settings.reviewDays} userName={s.name} />
        )}
      </div>
    );
  }

  const rule = await prisma.scnPolicyRule.findUnique({ where: { id: Number(id) || 0 } });
  if (!rule) notFound();
  const versions = await prisma.scnPolicyRule.findMany({ where: { ruleKey: rule.ruleKey }, orderBy: { version: "desc" } });
  const otherDraft = versions.find((v) => v.status === "draft" && v.id !== rule.id);
  const showForm = rule.status === "draft" || (sp.edit === "1" && !otherDraft);
  const src = lk.sourceById.get(rule.sourceId);
  const lender = lk.lenderById.get(rule.lenderId);
  const product = rule.productId ? lk.productById.get(rule.productId) : null;
  const flags = recordFlags({ ...rule, sourceStatus: src?.status ?? null, sourcePermStore: src?.permStore ?? null }).filter((f) => f.key !== "draft");
  const paramsOk = parseParams(rule.check, rule.params).ok;
  const ready: [string, boolean][] = [
    ["Source is published", src?.status === "published"],
    ["Source has storage permission", Boolean(src?.permStore)],
    ["Verified date recorded", Boolean(rule.verifiedAt)],
    ["Statement entered", Boolean(rule.statement.trim())],
    ["Parameters valid", paramsOk],
  ];
  const canPublish = ready.every(([, ok]) => ok);
  const published = versions.find((v) => v.status === "published");

  return (
    <div className="max-w-6xl">
      <PageHeader
        icon={<ListChecks />}
        breadcrumbs={[...crumbs, { label: `${rule.ruleKey} v${rule.version}` }]}
        title={showForm && rule.status !== "draft" ? `New version of ${rule.ruleKey}` : CHECKS[rule.check]?.label ?? rule.check}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={rule.status} />
            <span>{lender?.name ?? `Lender #${rule.lenderId}`}{product ? ` · ${product.name}` : " · all products"} · segment “{rule.segment}”</span>
            <code className="font-mono text-xs text-slate-400">{rule.ruleKey} v{rule.version}</code>
          </span>
        }
        actions={!showForm && !otherDraft && <LinkButton href="?edit=1" variant="secondary"><Pencil />Edit (new version)</LinkButton>}
      />
      <Flash sp={sp} />
      {otherDraft && (
        <Alert tone="info" className="mb-5" title={`Draft v${otherDraft.version} is in progress`}>
          Changes to this rule continue in the draft. <Link href={`${BASE}/rules/${otherDraft.id}`} className="font-medium underline">Open draft v{otherDraft.version}</Link>
        </Alert>
      )}
      {rule.status === "superseded" && published && (
        <Alert tone="info" className="mb-5">This version was superseded. <Link href={`${BASE}/rules/${published.id}`} className="font-medium underline">Current published version: v{published.version}</Link></Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {showForm ? (
            <RuleForm rule={rule} lk={lk} reviewDays={settings.reviewDays} userName={s.name} cancelHref={rule.status === "draft" ? `${BASE}?tab=rules` : `${BASE}/rules/${rule.id}`} />
          ) : (
            <div className="space-y-6">
              <Card title="Rule">
                <blockquote className="rounded-lg border-l-4 border-brand-300 bg-brand-50/40 px-4 py-3 text-[15px] leading-relaxed text-slate-900">{rule.statement}</blockquote>
                {flags.length > 0 && <div className="mt-4"><FlagBadges flags={flags} /></div>}
                <KeyValue
                  className="mt-5"
                  items={[
                    ["Category", categoryLabel(rule.category)],
                    ["Check", CHECKS[rule.check]?.label ?? rule.check],
                    ["Conditions", rule.conditions && <span className="whitespace-pre-wrap">{rule.conditions}</span>],
                    ["Exceptions", rule.exceptions && <span className="whitespace-pre-wrap">{rule.exceptions}</span>],
                    ["Case", rule.caseId ? <Link href={`/admin/cases/${rule.caseId}`} className="text-brand-700 hover:underline">#{rule.caseId} (case-specific)</Link> : "All cases"],
                    ["Effective", rule.effectiveFrom || rule.effectiveTo ? `${fmtDate(rule.effectiveFrom) || "—"} → ${fmtDate(rule.effectiveTo) || "until replaced"}` : "Until replaced"],
                  ]}
                />
              </Card>
              <Card title="Parameters" description={CHECKS[rule.check]?.help}>
                {paramsSummary(rule.check, rule.params).length ? <KeyValue items={paramsSummary(rule.check, rule.params)} /> : <p className="text-sm text-slate-500">No parameters set.</p>}
                {!paramsOk && <Alert tone="danger" className="mt-4">Stored parameters no longer validate — assessments treat this rule as “unknown”. Create a new version.</Alert>}
              </Card>
              <Card title="Evidence & review">
                <KeyValue
                  items={[
                    ["Source", src ? <span className="inline-flex flex-wrap items-center gap-2"><Link href={`${BASE}/sources/${src.id}`} className="text-brand-700 hover:underline">{src.title}</Link>{src.status !== "published" && <Badge tone="danger">{statusLabel(src.status)}</Badge>}</span> : `#${rule.sourceId}`],
                    ["Source kind", src ? sourceKindLabel(src.kind) : ""],
                    ["Section / page", rule.sourceSection],
                    ["Verified", rule.verifiedAt ? `${fmtDate(rule.verifiedAt)}${rule.reviewer ? ` by ${rule.reviewer}` : ""}` : <span className="text-amber-700">Never verified</span>],
                    ["Review due", rule.reviewDue ? <span className={rule.reviewDue < startOfTodaySydney() ? "text-red-700" : ""}>{fmtDate(rule.reviewDue)}</span> : ""],
                    ["Change note", rule.changeNote],
                  ]}
                />
              </Card>
            </div>
          )}
        </div>

        <aside className="space-y-6">
          <Card title="Status">
            <div className="flex items-center justify-between text-sm"><span className="text-slate-500">This version</span><StatusBadge status={rule.status} /></div>
            {rule.status === "draft" && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Ready to publish?</p>
                <Readiness items={ready} />
                <div className="mt-4 space-y-2">
                  {isAdmin ? (
                    <form action={publishRuleAction}>
                      <input type="hidden" name="id" value={rule.id} />
                      <Button variant="primary" className="w-full" disabled={!canPublish}><Send />Publish v{rule.version}</Button>
                      {published && <p className="mt-1.5 text-xs text-slate-500">v{published.version} will be superseded.</p>}
                    </form>
                  ) : (
                    <p className="text-xs text-slate-500">An admin publishes drafts.</p>
                  )}
                  <form action={deleteRuleDraftAction}>
                    <input type="hidden" name="id" value={rule.id} />
                    <ConfirmSubmit message={`Delete draft v${rule.version}?`} className={buttonStyles({ variant: "ghost", size: "sm", className: "w-full text-red-600 hover:bg-red-50" })}>
                      <Trash2 />Delete draft
                    </ConfirmSubmit>
                  </form>
                </div>
              </div>
            )}
            {rule.status === "published" && isAdmin && (
              <form action={withdrawRuleAction} className="mt-4 border-t border-slate-100 pt-4">
                <input type="hidden" name="id" value={rule.id} />
                <ConfirmSubmit message="Withdraw this rule? Assessments will stop using it immediately." className={buttonStyles({ variant: "danger", className: "w-full" })}>
                  <CircleSlash />Withdraw rule
                </ConfirmSubmit>
              </form>
            )}
          </Card>
          <VersionHistory versions={versions} currentId={rule.id} hrefBase={`${BASE}/rules`} keyLabel={rule.ruleKey} />
        </aside>
      </div>
    </div>
  );
}
