import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeDollarSign, CircleCheck, CircleSlash, Pencil, Send, Trash2, TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import { Alert, Badge, Button, Card, KeyValue, LinkButton, PageHeader, buttonStyles } from "@/components/admin/ui";
import { getScenarioSettings } from "@/modules/scenario/settings";
import { deletePriceDraftAction, publishPriceAction, withdrawPriceAction } from "@/modules/scenario/policy/admin";
import { loadLookups } from "@/modules/scenario/policy/data";
import { BASE, OCCUPANCIES, PRICING_TYPES, REPAYMENT_TYPES, fmtDate, label, money, priceVerifyState, recordFlags, statusLabel } from "@/modules/scenario/policy/meta";
import { FlagBadges, Flash, StatusBadge } from "@/modules/scenario/policy/ui/parts";
import { Readiness, VersionHistory } from "@/modules/scenario/policy/ui/Lifecycle";
import { PriceForm } from "@/modules/scenario/policy/ui/PriceForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Price record" };

export default async function PricePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requireStaff();
  const isAdmin = s.role === "ADMIN";
  const { id } = await params;
  const sp = await searchParams;
  const [lk, settings] = await Promise.all([loadLookups(), getScenarioSettings()]);
  const crumbs = [{ label: "Lender policy", href: BASE }, { label: "Pricing", href: `${BASE}?tab=pricing` }];

  if (id === "new") {
    return (
      <div className="max-w-5xl">
        <PageHeader icon={<BadgeDollarSign />} breadcrumbs={[...crumbs, { label: "New" }]} title="New price record" description="Rate, fees and cashback for one product / occupancy / repayment type / LVR band. Saved as a draft for an admin to publish." />
        <Flash sp={sp} />
        {lk.products.length === 0 ? (
          <Alert tone="warning" title="Add a product first">Pricing belongs to a lender product. <Link href={`${BASE}?tab=lenders`} className="font-medium underline">Lenders & products</Link></Alert>
        ) : (
          <PriceForm price={null} lk={lk} defaultProduct={Number(sp.product) || null} reviewDays={settings.reviewDays} userName={s.name} />
        )}
      </div>
    );
  }

  const price = await prisma.scnPriceRecord.findUnique({ where: { id: Number(id) || 0 } });
  if (!price) notFound();
  const versions = await prisma.scnPriceRecord.findMany({ where: { recordKey: price.recordKey }, orderBy: { version: "desc" } });
  const otherDraft = versions.find((v) => v.status === "draft" && v.id !== price.id);
  const showForm = price.status === "draft" || (sp.edit === "1" && !otherDraft);
  const src = lk.sourceById.get(price.sourceId);
  const product = lk.productById.get(price.productId);
  const lender = lk.lenderById.get(price.lenderId);
  const flags = recordFlags({ ...price, sourceStatus: src?.status ?? null, sourcePermStore: src?.permStore ?? null }).filter((f) => f.key !== "draft");
  const v = priceVerifyState(price);
  const now = new Date();
  const ready: [string, boolean][] = [
    ["Source is published", src?.status === "published"],
    ["Source has storage permission", Boolean(src?.permStore)],
    ["Verified date recorded", Boolean(price.verifiedAt)],
    ["Not expired", !price.expiresAt || price.expiresAt >= now],
    ["Case linked (confirmed quote)", price.pricingType !== "confirmed_quote" || Boolean(price.caseId)],
  ];
  const canPublish = ready.every(([, ok]) => ok);
  const published = versions.find((x) => x.status === "published");

  return (
    <div className="max-w-6xl">
      <PageHeader
        icon={<BadgeDollarSign />}
        breadcrumbs={[...crumbs, { label: `${price.recordKey} v${price.version}` }]}
        title={showForm && price.status !== "draft" ? `New version of ${price.recordKey}` : `${product?.name ?? `Product #${price.productId}`} — ${price.ratePct.toFixed(2)}%`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={price.status} />
            <span>{lender?.name} · {label(OCCUPANCIES, price.occupancy)} · {price.repaymentType} · LVR {price.lvrMin}–{price.lvrMax}%</span>
            <code className="font-mono text-xs text-slate-400">{price.recordKey} v{price.version}</code>
          </span>
        }
        actions={!showForm && !otherDraft && <LinkButton href="?edit=1" variant="secondary"><Pencil />Edit (new version)</LinkButton>}
      />
      <Flash sp={sp} />
      {otherDraft && (
        <Alert tone="info" className="mb-5" title={`Draft v${otherDraft.version} is in progress`}>
          <Link href={`${BASE}/pricing/${otherDraft.id}`} className="font-medium underline">Open draft v{otherDraft.version}</Link>
        </Alert>
      )}
      {price.status === "superseded" && published && (
        <Alert tone="info" className="mb-5">This version was superseded. <Link href={`${BASE}/pricing/${published.id}`} className="font-medium underline">Current published version: v{published.version}</Link></Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {showForm ? (
            <PriceForm price={price} lk={lk} reviewDays={settings.reviewDays} userName={s.name} cancelHref={price.status === "draft" ? `${BASE}?tab=pricing` : `${BASE}/pricing/${price.id}`} />
          ) : (
            <div className="space-y-6">
              <Card title="Pricing">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Stat label="Interest rate" value={`${price.ratePct.toFixed(2)}%`} />
                  <Stat label="Comparison" value={price.comparisonPct !== null ? `${price.comparisonPct.toFixed(2)}%` : "—"} />
                  <Stat label="Upfront fees" value={money(price.upfrontFees)} />
                  <Stat label="Cashback" value={price.cashback ? money(price.cashback) : "—"} />
                </div>
                {flags.length > 0 && <div className="mt-4"><FlagBadges flags={flags} /></div>}
                <KeyValue
                  className="mt-5"
                  items={[
                    ["Pricing type", label(PRICING_TYPES, price.pricingType)],
                    ["Case", price.caseId ? <Link href={`/admin/cases/${price.caseId}`} className="text-brand-700 hover:underline">#{price.caseId}</Link> : "All cases"],
                    ["Occupancy · repayment", `${label(OCCUPANCIES, price.occupancy)} · ${label(REPAYMENT_TYPES, price.repaymentType)}`],
                    ["LVR band", <span key="l" className="tabular-nums">above {price.lvrMin}% up to {price.lvrMax}%</span>],
                    ["Ongoing fees", <span key="f" className="tabular-nums">{money(price.annualFee)}/yr · {money(price.monthlyFee)}/mth</span>],
                    ["Cashback terms", price.cashback ? `${price.cashbackTerms || "—"}${price.cashbackExpiry ? ` (until ${fmtDate(price.cashbackExpiry)})` : ""}` : ""],
                    ["Effective", `${fmtDate(price.effectiveFrom) || "—"} → ${fmtDate(price.expiresAt) || "no expiry set"}`],
                  ]}
                />
              </Card>
              <Card title="Evidence & review">
                <KeyValue
                  items={[
                    ["Source", src ? <span className="inline-flex flex-wrap items-center gap-2"><Link href={`${BASE}/sources/${src.id}`} className="text-brand-700 hover:underline">{src.title}</Link>{src.status !== "published" && <Badge tone="danger">{statusLabel(src.status)}</Badge>}</span> : `#${price.sourceId}`],
                    ["Section / page", price.sourceSection],
                    ["Verified", price.verifiedAt ? `${fmtDate(price.verifiedAt)}${price.reviewer ? ` by ${price.reviewer}` : ""}` : ""],
                    ["Review due", fmtDate(price.reviewDue)],
                    ["Change note", price.changeNote],
                  ]}
                />
              </Card>
            </div>
          )}
        </div>
        <aside className="space-y-6">
          <Card title="Status">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between"><span className="text-slate-500">This version</span><StatusBadge status={price.status} /></div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Verification</span>
                {v.ok ? <Badge tone="success"><CircleCheck className="size-3" />{v.label}</Badge> : <Badge tone="warning"><TriangleAlert className="size-3" />{v.label}</Badge>}
              </div>
            </div>
            {price.status === "draft" && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Ready to publish?</p>
                <Readiness items={ready} />
                <div className="mt-4 space-y-2">
                  {isAdmin ? (
                    <form action={publishPriceAction}>
                      <input type="hidden" name="id" value={price.id} />
                      <Button variant="primary" className="w-full" disabled={!canPublish}><Send />Publish v{price.version}</Button>
                      {published && <p className="mt-1.5 text-xs text-slate-500">v{published.version} will be superseded.</p>}
                    </form>
                  ) : (
                    <p className="text-xs text-slate-500">An admin publishes drafts.</p>
                  )}
                  <form action={deletePriceDraftAction}>
                    <input type="hidden" name="id" value={price.id} />
                    <ConfirmSubmit message={`Delete draft v${price.version}?`} className={buttonStyles({ variant: "ghost", size: "sm", className: "w-full text-red-600 hover:bg-red-50" })}>
                      <Trash2 />Delete draft
                    </ConfirmSubmit>
                  </form>
                </div>
              </div>
            )}
            {price.status === "published" && isAdmin && (
              <form action={withdrawPriceAction} className="mt-4 border-t border-slate-100 pt-4">
                <input type="hidden" name="id" value={price.id} />
                <ConfirmSubmit message="Withdraw this price record? Assessments will stop using it immediately." className={buttonStyles({ variant: "danger", className: "w-full" })}>
                  <CircleSlash />Withdraw
                </ConfirmSubmit>
              </form>
            )}
          </Card>
          <VersionHistory versions={versions} currentId={price.id} hrefBase={`${BASE}/pricing`} keyLabel={price.recordKey} />
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5 ring-1 ring-inset ring-slate-200/70">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}
