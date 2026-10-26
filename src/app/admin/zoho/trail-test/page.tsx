import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { getSetting, setSetting } from "@/lib/settings";
import { FlaskConical, Play } from "lucide-react";
import { buttonStyles, Card, EmptyState, LinkButton, PageHeader } from "@/components/admin/ui";
import { trailProbe } from "@/modules/crm-extra/lib/diag";

export const metadata = { title: "Trail Test" };
export const dynamic = "force-dynamic";
const KEY = "crmx.trailProbeLast";

async function probe() {
  "use server";
  await requireAdmin();
  await setSetting(KEY, { at: Date.now(), out: await trailProbe() });
  redirect("/admin/zoho/trail-test?ran=1");
}

export default async function TrailTest({ searchParams }: { searchParams: Promise<{ ran?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const last = await getSetting<{ at: number; out: string } | null>(KEY, null);
  const fresh = last && Date.now() - last.at < 10 * 60 * 1000 ? last.out : "";
  return (
    <div className="max-w-4xl">
      <PageHeader
        icon={<FlaskConical />}
        title="Trail Test (Bare Minimum)"
        description={<span className="font-mono text-xs">Build: trail-min-probe-2025-08-13</span>}
        breadcrumbs={[{ label: "Email Trail", href: "/admin/trail" }, { label: "Zoho", href: "/admin/zoho" }, { label: "Trail Test" }]}
        actions={
          <form action={probe}>
            <button className={buttonStyles({ variant: "primary" })}>
              <Play /> Probe Zoho (Inbox &amp; Sent)
            </button>
          </form>
        }
      />
      {sp.ran ? (
        <Card title="Last Probe Output">
          <pre className="max-h-[70vh] overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-700">{fresh || "No output captured."}</pre>
        </Card>
      ) : (
        <EmptyState
          icon={<FlaskConical />}
          title="No probe run yet"
          description="Runs a minimal list of the Zoho Inbox and Sent folders and shows the raw output here."
          action={
            <LinkButton href="/admin/diagnostics" variant="secondary" size="sm">
              Open full diagnostics
            </LinkButton>
          }
        />
      )}
    </div>
  );
}
