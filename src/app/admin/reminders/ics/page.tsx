import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { CalendarDays, Link2, RotateCcw, ShieldAlert } from "lucide-react";
import { Alert, buttonStyles, inputStyles, PageHeader } from "@/components/admin/ui";
import { CopyButton, ConfirmButton } from "@/modules/crm-extra/ui/client";
import { getIcsToken, rotateIcsToken, icsUrl } from "@/modules/crm-extra/lib/ics";

export const metadata = { title: "MMCRM ICS Feed" };
export const dynamic = "force-dynamic";

async function rotate() {
  "use server";
  await requireAdmin();
  await rotateIcsToken();
  revalidatePath("/admin/reminders/ics");
  redirect("/admin/reminders/ics?rotated=1");
}

export default async function IcsPage({ searchParams }: { searchParams: Promise<{ rotated?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const token = await getIcsToken();
  const rows: [string, string][] = [
    ["Active cases", "active"],
    ["Completed cases", "completed"],
    ["All cases", "all"],
  ];
  return (
    <div className="max-w-4xl">
      <PageHeader
        icon={<CalendarDays />}
        title="MMCRM ICS Feed"
        breadcrumbs={[{ label: "Reminders", href: "/admin/reminders" }, { label: "Calendar feed" }]}
        description={
          <>
            Subscribe in TickTick / Apple / Google / Outlook via “Subscribe by URL”. The <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs text-slate-700">roll=1</code> flag makes overdue
            not-done items appear today.
          </>
        }
      />
      <div className="space-y-6">
        {sp.rotated && <Alert tone="success">Token rotated. Use the new URLs below.</Alert>}
        <section className="rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
            <Link2 className="size-4 text-slate-400" />
            <h2 className="text-[15px] font-semibold text-slate-900">Subscription URLs</h2>
          </header>
          <div className="divide-y divide-slate-100">
            {rows.map(([label, st]) => (
              <div key={st} className="grid items-center gap-2 px-5 py-4 md:grid-cols-[160px_1fr_auto] md:gap-3">
                <strong className="text-sm font-semibold text-slate-800">{label}</strong>
                <input readOnly aria-label={`${label} feed URL`} className={`${inputStyles} bg-slate-50 font-mono text-xs text-slate-600`} value={icsUrl(token, st)} />
                <CopyButton text={icsUrl(token, st)} />
              </div>
            ))}
          </div>
        </section>
        <section className="flex flex-wrap items-center gap-4 rounded-xl border border-red-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 ring-1 ring-red-200 ring-inset">
            <ShieldAlert className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">Keep these URLs private.</p>
            <p className="text-sm text-slate-500">Anyone with a link can read your calendar. Rotating the token breaks every existing subscription.</p>
          </div>
          <form action={rotate}>
            <ConfirmButton className={buttonStyles({ variant: "danger" })} confirm="Rotate token now? Old subscriber URLs will stop updating.">
              <RotateCcw className="size-4" /> Rotate Token
            </ConfirmButton>
          </form>
        </section>
      </div>
    </div>
  );
}
