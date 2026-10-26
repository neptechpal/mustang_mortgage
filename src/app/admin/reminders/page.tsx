import Link from "next/link";
import { AlarmClock, CalendarClock, CalendarDays, Filter, Flame, ListTodo, Mail, StickyNote, TriangleAlert } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { Badge, Button, checkboxStyles, cn, Field, inputStyles, LinkButton, PageHeader, selectStyles, StatCard, type Tone } from "@/components/admin/ui";
import { caseOptions, ymdHi, fromSydLocal, sydParts } from "@/modules/crm-extra/lib/cases";
import { getCrmOptions } from "@/modules/crm-extra/lib/opts";
import { QuickAdd, BoardTable, GlanceDone, type BoardRow, type BoardGroup } from "@/modules/crm-extra/components/ReminderBoard";

export const metadata = { title: "Reminders" };
export const dynamic = "force-dynamic";

type SP = Record<string, string | undefined>;
const priorityTone = (p: string): Tone => (p === "High" ? "danger" : p === "Low" ? "neutral" : "warning");

function timeframe(tf: string, from?: string, to?: string): { gte?: Date; lt?: Date } {
  const p = sydParts();
  const start = fromSydLocal(`${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}T00:00`)!;
  const day = 86400000;
  switch (tf) {
    case "overdue":
      return { lt: new Date() };
    case "today":
      return { gte: start, lt: new Date(start.getTime() + day) };
    case "week": {
      const wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.wd);
      const ws = new Date(start.getTime() - Math.max(0, wd) * day);
      return { gte: ws, lt: new Date(ws.getTime() + 7 * day) };
    }
    case "month": {
      const ms = fromSydLocal(`${p.y}-${String(p.m).padStart(2, "0")}-01T00:00`)!;
      const nm = p.m === 12 ? `${p.y + 1}-01-01T00:00` : `${p.y}-${String(p.m + 1).padStart(2, "0")}-01T00:00`;
      return { gte: ms, lt: fromSydLocal(nm)! };
    }
    case "custom":
      return {
        gte: from ? fromSydLocal(`${from}T00:00`) ?? undefined : undefined,
        lt: to ? new Date((fromSydLocal(`${to}T00:00`)?.getTime() ?? 0) + day) : undefined,
      };
    default:
      return {};
  }
}

export default async function RemindersPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaff();
  const sp = await searchParams;
  const status = sp.status ?? "open";
  const prio = sp.priority ?? "";
  const tf = sp.tf ?? "";
  const q = (sp.q ?? "").trim();
  const showAuto = sp.auto === "1";
  const o = await getCrmOptions();

  const due = timeframe(tf, sp.from, sp.to);
  const rows = await prisma.caseReminder.findMany({
    where: {
      ...(status === "open" ? { done: false } : status === "done" ? { done: true } : {}),
      ...(prio ? { priority: prio, type: "Reminder" } : {}),
      ...(due.gte || due.lt ? { type: "Reminder", dueAt: { ...(due.gte ? { gte: due.gte } : {}), ...(due.lt ? { lt: due.lt } : {}) } } : {}),
      ...(showAuto ? {} : { auto: false }),
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { note: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    take: 1000,
  });
  const caseIds = Array.from(new Set(rows.map((r) => r.caseId)));
  const cases = await prisma.case.findMany({ where: { id: { in: caseIds } }, select: { id: true, title: true } });
  const titles = new Map(cases.map((c) => [c.id, c.title || `Case #${c.id}`]));
  const now = Date.now();
  const tp = sydParts();
  const todayYmd = `${tp.y}-${String(tp.m).padStart(2, "0")}-${String(tp.d).padStart(2, "0")}`;
  const groupOf = (done: boolean, dueAt: Date | null): BoardGroup => {
    if (done) return "done";
    if (!dueAt) return "none";
    if (dueAt.getTime() < now) return "overdue";
    if (ymdHi(dueAt).slice(0, 10) === todayYmd) return "today";
    return dueAt.getTime() - now < 7 * 86400000 ? "week" : "later";
  };
  const boardRows: BoardRow[] = rows.map((r) => ({
    id: r.id,
    caseId: r.caseId,
    caseTitle: titles.get(r.caseId) ?? `Case #${r.caseId}`,
    type: r.type,
    text: r.type === "Note" ? r.note : r.title,
    priority: r.priority,
    email: r.email,
    due: r.dueAt ? ymdHi(r.dueAt) : "",
    overdue: !!r.dueAt && r.dueAt.getTime() < now,
    repeatDays: r.repeatDays,
    done: r.done,
    auto: r.auto,
    group: groupOf(r.done, r.dueAt),
  }));

  // Summary chips (always over all open items)
  const [openN, overdueN, highN] = await Promise.all([
    prisma.caseReminder.count({ where: { done: false } }),
    prisma.caseReminder.count({ where: { done: false, type: "Reminder", dueAt: { lt: new Date() } } }),
    prisma.caseReminder.count({ where: { done: false, type: "Reminder", priority: "High" } }),
  ]);

  // "At a glance" — open items per case (200 newest active cases)
  const glanceCases = await prisma.case.findMany({ where: { status: "active" }, orderBy: { createdAt: "desc" }, take: 200, select: { id: true, title: true } });
  const openItems = await prisma.caseReminder.findMany({
    where: { done: false, caseId: { in: glanceCases.map((c) => c.id) } },
    orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { title: "asc" }],
  });
  const glance = glanceCases
    .map((c) => ({ c, items: openItems.filter((i) => i.caseId === c.id && (i.type === "Note" ? i.note.trim() : i.title.trim())) }))
    .filter((g) => g.items.length);

  const activeFilters = [status !== "open", !!prio, !!tf, !!q, showAuto].filter(Boolean).length;
  return (
    <div className="space-y-6">
      <PageHeader
        icon={<AlarmClock />}
        title="Reminder Board"
        description="Every open note and reminder across your cases — grouped by when it’s due."
        actions={
          <LinkButton href="/admin/reminders/ics" variant="secondary">
            <CalendarDays /> Calendar feed (ICS)
          </LinkButton>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open" value={openN} hint="Notes & reminders not done" icon={<ListTodo />} tone="info" href="/admin/reminders?status=open" />
        <StatCard label="Overdue" value={overdueN} hint="Reminders past their due time" icon={<TriangleAlert />} tone="danger" href="/admin/reminders?status=open&tf=overdue" />
        <StatCard label="High priority" value={highN} hint="Open high-priority reminders" icon={<Flame />} tone="warning" href="/admin/reminders?status=open&priority=High" />
      </div>

      <QuickAdd cases={await caseOptions()} defaultEmail={o.fromEmail} />

      <section className="space-y-3">
        <form className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]" method="get">
          <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-slate-700">
            <Filter className="size-4 text-slate-400" /> Filters
            {activeFilters > 0 && <Badge tone="brand">{activeFilters} active</Badge>}
            {activeFilters > 0 && (
              <Link href="/admin/reminders" className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-800 hover:underline">
                Reset
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-[repeat(5,minmax(0,1fr))_minmax(0,1.6fr)]">
            <Field label="Status">
              <select name="status" defaultValue={status} className={selectStyles}>
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="done">Done</option>
              </select>
            </Field>
            <Field label="Priority">
              <select name="priority" defaultValue={prio} className={selectStyles}>
                <option value="">All</option>
                <option>Low</option>
                <option>Normal</option>
                <option>High</option>
              </select>
            </Field>
            <Field label="Timeframe">
              <select name="tf" defaultValue={tf} className={selectStyles}>
                <option value="">All</option>
                <option value="overdue">Overdue</option>
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
                <option value="custom">Custom</option>
              </select>
            </Field>
            <Field label="From">
              <input type="date" name="from" defaultValue={sp.from} className={inputStyles} />
            </Field>
            <Field label="To">
              <input type="date" name="to" defaultValue={sp.to} className={inputStyles} />
            </Field>
            <Field label="Search" className="col-span-2 md:col-span-1">
              <input name="q" defaultValue={q} className={inputStyles} placeholder="Title, note or email…" />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="auto" value="1" defaultChecked={showAuto} className={checkboxStyles} /> Show automation-generated
            </label>
            <Button variant="primary" size="sm">
              Apply filters
            </Button>
          </div>
        </form>

        <div className="flex items-center justify-between gap-2 px-1">
          <h2 className="text-sm font-semibold text-slate-900">
            Items <span className="ml-1 font-normal text-slate-500 tabular-nums">{boardRows.length}</span>
          </h2>
        </div>
        <BoardTable rows={boardRows} />
      </section>

      {glance.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <CalendarClock className="size-4 text-slate-400" />
            <h2 className="text-[15px] font-semibold text-slate-900">At a glance</h2>
            <span className="text-sm text-slate-500">— open items on active cases</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {glance.map(({ c, items }) => {
              const notes = items.filter((i) => i.type === "Note").length;
              const rems = items.filter((i) => i.type === "Reminder");
              const over = rems.filter((i) => i.dueAt && i.dueAt.getTime() < now).length;
              return (
                <div key={c.id} className="flex flex-col rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <div className="flex items-start gap-2 border-b border-slate-100 px-4 py-3">
                    <Link href={`/admin/cases/${c.id}#mmcrm_notes_reminders`} className="line-clamp-2 min-w-0 flex-1 text-sm font-semibold text-slate-900 hover:text-brand-700">
                      {c.title || `Case #${c.id}`}
                    </Link>
                    <div className="flex shrink-0 items-center gap-1">
                      <span title="Open notes">
                        <Badge tone="violet">
                          <StickyNote className="size-3" /> {notes}
                        </Badge>
                      </span>
                      <span title="Reminders">
                        <Badge tone="brand">
                          <AlarmClock className="size-3" /> {rems.length}
                        </Badge>
                      </span>
                      {over > 0 && (
                        <span title="Overdue">
                          <Badge tone="danger">
                            <TriangleAlert className="size-3" /> {over}
                          </Badge>
                        </span>
                      )}
                    </div>
                  </div>
                  <ol className="divide-y divide-slate-100">
                    {items.map((i) => {
                      const isOver = i.type === "Reminder" && i.dueAt && i.dueAt.getTime() < now;
                      return (
                        <li key={i.id} className={cn("flex items-start gap-2.5 px-4 py-2.5 text-sm", isOver && "bg-red-50/50")}>
                          <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", i.type === "Note" ? "bg-violet-400" : isOver ? "bg-red-500" : "bg-emerald-500")} />
                          <div className="min-w-0 flex-1">
                            {i.type === "Note" ? (
                              <p className="text-slate-700">{i.note}</p>
                            ) : (
                              <>
                                <p className="font-medium text-slate-900">{i.title}</p>
                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                                  {i.dueAt && (
                                    <span className={cn("tabular-nums", isOver && "font-semibold text-red-700")}>
                                      {isOver ? "Overdue · " : "Due "}
                                      {ymdHi(i.dueAt)}
                                    </span>
                                  )}
                                  <Badge tone={priorityTone(i.priority)} className="!py-0 text-[11px]">
                                    {i.priority}
                                  </Badge>
                                  {i.email && (
                                    <span className="inline-flex min-w-0 items-center gap-1">
                                      <Mail className="size-3 shrink-0" />
                                      <span className="truncate">{i.email}</span>
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                          <GlanceDone id={i.id} />
                        </li>
                      );
                    })}
                  </ol>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
