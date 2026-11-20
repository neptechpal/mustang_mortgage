import { Plus, Scale } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { Badge, LinkButton, PageHeader, TabLinks } from "@/components/admin/ui";
import { buildReviewQueue, loadLookups } from "@/modules/scenario/policy/data";
import { BASE } from "@/modules/scenario/policy/meta";
import { AdminGuide, Flash } from "@/modules/scenario/policy/ui/parts";
import { LendersTab } from "@/modules/scenario/policy/ui/LendersTab";
import { SourcesTab } from "@/modules/scenario/policy/ui/SourcesTab";
import { RulesTab } from "@/modules/scenario/policy/ui/RulesTab";
import { PricingTab } from "@/modules/scenario/policy/ui/PricingTab";
import { ReviewTab } from "@/modules/scenario/policy/ui/ReviewTab";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lender policy" };

const TABS = ["lenders", "sources", "rules", "pricing", "review"] as const;
type Tab = (typeof TABS)[number];

export default async function LenderPolicyPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requireStaff();
  const sp = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as Tab) : "lenders";
  const isAdmin = s.role === "ADMIN";
  const [queue, lk, rules, prices] = await Promise.all([
    buildReviewQueue(),
    loadLookups(),
    prisma.scnPolicyRule.count({ where: { status: { in: ["draft", "published"] } } }),
    prisma.scnPriceRecord.count({ where: { status: { in: ["draft", "published"] } } }),
  ]);
  const panel = lk.lenders.filter((l) => l.onPanel).length;
  const liveSources = lk.sources.filter((x) => x.status === "draft" || x.status === "published").length;

  const action = {
    lenders: <LinkButton href={`${BASE}/lenders/new`} variant="primary"><Plus />Add lender</LinkButton>,
    sources: <LinkButton href={`${BASE}/sources/new`} variant="primary"><Plus />Register source</LinkButton>,
    rules: <LinkButton href={`${BASE}/rules/new${sp.lender ? `?lender=${encodeURIComponent(sp.lender)}` : ""}`} variant="primary"><Plus />New rule</LinkButton>,
    pricing: <LinkButton href={`${BASE}/pricing/new`} variant="primary"><Plus />New price record</LinkButton>,
    review: null,
  }[tab];

  return (
    <div>
      <PageHeader
        icon={<Scale />}
        title="Lender policy & pricing"
        description="Authorised lender policy, sources and pricing used by the Scenario Assistant's rule-based checks. Staff draft; an admin publishes."
        actions={
          <>
            {!isAdmin && <Badge tone="neutral">Staff · drafts only</Badge>}
            {action}
          </>
        }
      />
      <Flash sp={sp} />
      <AdminGuide />
      <TabLinks
        tabs={[
          { href: `${BASE}?tab=lenders`, label: "Lenders & products", active: tab === "lenders", count: panel },
          { href: `${BASE}?tab=sources`, label: "Sources", active: tab === "sources", count: liveSources },
          { href: `${BASE}?tab=rules`, label: "Policy rules", active: tab === "rules", count: rules },
          { href: `${BASE}?tab=pricing`, label: "Pricing", active: tab === "pricing", count: prices },
          { href: `${BASE}?tab=review`, label: "Review queue", active: tab === "review", count: queue.length },
        ]}
      />
      {tab === "lenders" && <LendersTab isAdmin={isAdmin} />}
      {tab === "sources" && <SourcesTab sp={sp} />}
      {tab === "rules" && <RulesTab sp={sp} />}
      {tab === "pricing" && <PricingTab sp={sp} />}
      {tab === "review" && <ReviewTab queue={queue} lenders={lk.lenders} />}
    </div>
  );
}
