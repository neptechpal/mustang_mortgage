import Link from "next/link";
import { Briefcase, FilePlus2, LayoutGrid, Search, SlidersHorizontal, UserPlus, X } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { listCases, kanbanData } from "@/modules/crm/queries";
import CasesTable from "@/modules/crm/components/CasesTable";
import Kanban from "@/modules/crm/components/Kanban";
import { CHASE_BUCKETS, CHASE_LANE, STAGE_LANE, STAGES, STATUSES } from "@/modules/crm/constants";
import { LinkButton, PageHeader, Toolbar, buttonStyles, cn, inputStyles, selectStyles } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
type SP = Promise<Record<string, string | undefined>>;

export default async function CasesPage({ searchParams }: { searchParams: SP }) {
  await requireStaff();
  const sp = await searchParams;
  const filtering = sp.filter_action !== undefined;
  // Default view forces Active unless the user explicitly filtered.
  const status = sp.mmcrm_case_status ?? (filtering ? "" : "active");
  const rows = await listCases({ status: status || undefined, stage: sp.stage || undefined, q: sp.s || undefined });
  const k = await kanbanData();
  const narrowed = !!(sp.s || sp.stage || filtering);
  return (
    <div>
      <PageHeader
        icon={<Briefcase />}
        title="Cases"
        description={<>{rows.length} {rows.length === 1 ? "case" : "cases"}{status ? <> · {STATUSES[status] ?? status}</> : " · all statuses"}{sp.stage ? <> · {STAGES[sp.stage] ?? sp.stage}</> : null}{sp.s ? <> · matching “{sp.s}”</> : null}</>}
        actions={
          <>
            <LinkButton href="/admin/kanban" variant="secondary"><LayoutGrid /> Pipeline board</LinkButton>
            <LinkButton href="/admin/cases/new?blank=1" variant="secondary"><FilePlus2 /> Add blank case</LinkButton>
            <LinkButton href="/admin/cases/new" variant="primary"><UserPlus /> New client</LinkButton>
          </>
        }
      />
      <form method="get">
        <Toolbar>
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input name="s" defaultValue={sp.s ?? ""} placeholder="Search name, email or case #…" aria-label="Search cases" className={cn(inputStyles, "h-9 py-0 pl-9")} />
          </div>
          <select name="mmcrm_case_status" defaultValue={status} aria-label="Status" className={cn(selectStyles, "h-9 w-full py-0 sm:w-auto")}>
            <option value="">All statuses</option>
            {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select name="stage" defaultValue={sp.stage ?? ""} aria-label="Stage" className={cn(selectStyles, "h-9 w-full py-0 sm:w-auto")}>
            <option value="">All stages</option>
            {Object.entries(STAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button name="filter_action" value="Filter" className={buttonStyles({ variant: "dark", size: "md" })}><SlidersHorizontal /> Filter</button>
          {narrowed && <Link href="/admin/cases" className={buttonStyles({ variant: "ghost", size: "md" })}><X /> Reset</Link>}
        </Toolbar>
      </form>
      <CasesTable rows={rows} viewing={status} />
      <section className="mt-10 hidden md:block">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">Pipeline board</h2>
            <p className="mt-0.5 text-sm text-slate-500">Drag cards between columns to change the stage or chasing bucket.</p>
          </div>
          <Link href="/admin/kanban" className={buttonStyles({ variant: "ghost", size: "sm" })}><LayoutGrid /> Full screen</Link>
        </div>
        <Kanban pipeline={k.pipeline} lost={k.lost} stages={STAGES} chase={CHASE_BUCKETS} stageLanes={STAGE_LANE} chaseLanes={CHASE_LANE} />
      </section>
    </div>
  );
}
