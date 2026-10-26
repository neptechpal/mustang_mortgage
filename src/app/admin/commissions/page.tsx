import { CircleDollarSign, Save, Target } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { Button, Card, Field, inputStyles, PageHeader, TabLinks } from "@/components/admin/ui";
import { readDeal } from "@/modules/crm-extra/lib/income";
import { getIncomeSettings } from "@/modules/crm-extra/lib/income-settings";
import { getCrmOptions } from "@/modules/crm-extra/lib/opts";
import { getSetting, setSetting } from "@/lib/settings";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import CasesSummary from "@/modules/crm-extra/components/CasesSummary";

export const metadata = { title: "Commissions" };
export const dynamic = "force-dynamic";

const SCOPES = [
  ["active", "Active"],
  ["completed", "Completed"],
  ["archive", "Archive"],
  ["unsuccessful", "Unsuccessful"],
  ["all", "All"],
];

async function saveTarget(fd: FormData) {
  "use server";
  await requireAdmin();
  await setSetting("crmx.commissionTarget", Math.max(0, parseFloat(String(fd.get("target") || "0").replace(/[,\s$]/g, "")) || 0));
  revalidatePath("/admin/commissions");
}

export default async function CommissionsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const s = await requireStaff();
  const sp = await searchParams;
  const status = SCOPES.some(([k]) => k === sp.status) ? sp.status! : "active";
  const cases = await prisma.case.findMany({
    where: status === "all" ? {} : { status },

  });
  const income = await getIncomeSettings();
  const rows = cases
    .map((c) => ({ id: c.id, title: c.title, loan: Math.max(0, c.loanAmount ?? 0), amt: readDeal(c, income).upfrontYou }))
    .sort((a, b) => b.amt - a.amt || a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
  const o = await getCrmOptions();
  const target = Number(await getSetting<number>("crmx.commissionTarget", 0)) || o.commissionTarget || 0;
  const targetForm =
    s.role === "ADMIN" ? (
      <Card
        title={
          <span className="flex items-center gap-2">
            <Target className="size-4 text-slate-400" /> Commission target
          </span>
        }
        description="Set to 0 for an automatic stretch goal."
      >
        <form action={saveTarget} className="space-y-3">
          <Field label="Target amount (A$)" htmlFor="mmc-target">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">A$</span>
              <input id="mmc-target" name="target" type="number" min={0} step="100" defaultValue={target || 0} className={`${inputStyles} pl-9 tabular-nums`} />
            </div>
          </Field>
          <Button variant="secondary" className="w-full">
            <Save /> Save target
          </Button>
        </form>
      </Card>
    ) : undefined;
  return (
    <div>
      <PageHeader icon={<CircleDollarSign />} title="Commissions" description="Loan book and expected commission to Mustang Mortgage, with progress towards your target." />
      <TabLinks tabs={SCOPES.map(([k, l]) => ({ href: `/admin/commissions?status=${k}`, label: l, active: k === status }))} />
      <CasesSummary rows={rows} target={target} targetForm={targetForm} />
    </div>
  );
}
