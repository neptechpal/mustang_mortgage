"use client";
// Cross-case reminder board: quick add + interactive rows.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlarmClock, BellRing, CalendarClock, CalendarDays, CheckCircle2, Clock, Mail, Plus, Repeat, StickyNote, Trash2, TriangleAlert, Zap } from "lucide-react";
import { Badge, Button, cn, Field, inputStyles, selectStyles, type Tone } from "@/components/admin/ui";
import { useToast } from "../ui/client";
import { nrAdd, nrToggle, nrDelete } from "../actions/reminders";

export type BoardGroup = "overdue" | "today" | "week" | "later" | "none" | "done";

export type BoardRow = {
  id: number;
  caseId: number;
  caseTitle: string;
  type: string;
  text: string;
  priority: string;
  email: string;
  due: string;
  overdue: boolean;
  repeatDays: number;
  done: boolean;
  auto: boolean;
  /** Display bucket (computed server-side in Sydney time). */
  group?: BoardGroup;
};

export const priorityTone = (p: string): Tone => (p === "High" ? "danger" : p === "Low" ? "neutral" : "warning");

export function QuickAdd({ cases, defaultEmail }: { cases: { id: number; label: string }[]; defaultEmail: string }) {
  const router = useRouter();
  const { show, node } = useToast();
  const [pending, start] = useTransition();
  const [f, setF] = useState({ what: "", caseId: "", priority: "Normal", email: defaultEmail, due: "", repeatDays: "" });
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
        <span className="flex size-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
          <Plus className="size-4" />
        </span>
        <h2 className="text-[15px] font-semibold text-slate-900">Quick add reminder</h2>
      </header>
      <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-12 lg:items-end">
        <Field label="What" htmlFor="mmnr-what" className="sm:col-span-2 lg:col-span-4">
          <input id="mmnr-what" className={inputStyles} placeholder="e.g. Chase payslips" value={f.what} onChange={(e) => setF({ ...f, what: e.target.value })} />
        </Field>
        <Field label="Case" htmlFor="mmnr-case" className="lg:col-span-2">
          <input id="mmnr-case" className={inputStyles} list="mmnr-cases" placeholder="Case #" value={f.caseId} onChange={(e) => setF({ ...f, caseId: e.target.value })} />
        </Field>
        <datalist id="mmnr-cases">
          {cases.map((c) => (
            <option key={c.id} value={String(c.id)}>
              {c.label}
            </option>
          ))}
        </datalist>
        <Field label="Priority" htmlFor="mmnr-prio" className="lg:col-span-2">
          <select id="mmnr-prio" className={selectStyles} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
            <option>Low</option>
            <option>Normal</option>
            <option>High</option>
          </select>
        </Field>
        <Field label="Due" htmlFor="mmnr-due" className="lg:col-span-2">
          <input id="mmnr-due" type="datetime-local" className={inputStyles} value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} />
        </Field>
        <Field label="Repeat (days)" htmlFor="mmnr-rep" className="lg:col-span-2">
          <input id="mmnr-rep" type="number" min={0} className={inputStyles} placeholder="0" value={f.repeatDays} onChange={(e) => setF({ ...f, repeatDays: e.target.value })} />
        </Field>
        <Field label="Email reminder to" htmlFor="mmnr-email" className="sm:col-span-2 lg:col-span-4">
          <input id="mmnr-email" className={inputStyles} placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Field>
        <div className="sm:col-span-2 lg:col-span-8 lg:flex lg:justify-end">
          <Button
            type="button"
            variant="primary"
            className="w-full sm:w-auto"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await nrAdd({ ...f, caseId: parseInt(f.caseId, 10) || 0, type: "Reminder" });
                if (!r.ok) return show(r.error || "Failed", true);
                setF({ ...f, what: "", due: "", repeatDays: "" });
                show("Added");
                router.refresh();
              })
            }
          >
            <Plus /> Add reminder
          </Button>
        </div>
      </div>
      {node}
    </section>
  );
}

const GROUPS: { key: BoardGroup; label: string; icon: React.ReactNode; tone: string }[] = [
  { key: "overdue", label: "Overdue", icon: <TriangleAlert className="size-4" />, tone: "text-red-700" },
  { key: "today", label: "Due today", icon: <AlarmClock className="size-4" />, tone: "text-amber-700" },
  { key: "week", label: "Next 7 days", icon: <CalendarClock className="size-4" />, tone: "text-sky-700" },
  { key: "later", label: "Later", icon: <CalendarDays className="size-4" />, tone: "text-slate-700" },
  { key: "none", label: "No due date", icon: <StickyNote className="size-4" />, tone: "text-slate-600" },
  { key: "done", label: "Completed", icon: <CheckCircle2 className="size-4" />, tone: "text-emerald-700" },
];

export function BoardTable({ rows }: { rows: BoardRow[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const run = (p: Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const r = await p;
      if (!r.ok) alert(r.error || "Failed");
      router.refresh();
    });

  if (rows.length === 0)
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <BellRing className="size-5" />
        </div>
        <p className="text-sm font-semibold text-slate-900">No items match these filters.</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">Try another status or timeframe, or tick “Show automation-generated”.</p>
      </div>
    );

  const bucket = (r: BoardRow): BoardGroup => r.group ?? (r.done ? "done" : r.overdue ? "overdue" : r.due ? "later" : "none");
  return (
    <div className="space-y-4">
      {GROUPS.map((g) => {
        const list = rows.filter((r) => bucket(r) === g.key);
        if (!list.length) return null;
        return (
          <section key={g.key} className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <header
              className={cn(
                "flex items-center gap-2 border-b px-4 py-2.5 text-[13px] font-semibold",
                g.key === "overdue" ? "border-red-100 bg-red-50/60" : g.key === "today" ? "border-amber-100 bg-amber-50/50" : "border-slate-100 bg-slate-50/70",
                g.tone,
              )}
            >
              {g.icon}
              {g.label}
              <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200 tabular-nums">{list.length}</span>
            </header>
            <ul className="divide-y divide-slate-100">
              {list.map((r) => (
                <li key={r.id} className={cn("group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50/70", r.done && "bg-emerald-50/30")}>
                  <input
                    type="checkbox"
                    aria-label="Done"
                    className="mt-0.5 size-4 shrink-0 cursor-pointer rounded border-slate-300 accent-brand-600"
                    checked={r.done}
                    onChange={(e) => run(nrToggle(r.id, e.target.checked))}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {r.type === "Note" ? (
                        <Badge tone="violet">
                          <StickyNote className="size-3" /> Note
                        </Badge>
                      ) : null}
                      <span className={cn("text-sm font-medium text-slate-900", r.done && "text-slate-400 line-through")}>{r.text}</span>
                      {r.auto && (
                        <Badge tone="info">
                          <Zap className="size-3" /> auto
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <Link className="max-w-[28rem] truncate font-medium text-brand-700 hover:text-brand-800 hover:underline" href={`/admin/cases/${r.caseId}#mmcrm_notes_reminders`}>
                        {r.caseTitle}
                      </Link>
                      {r.email && (
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <Mail className="size-3 shrink-0" />
                          <span className="truncate">{r.email}</span>
                        </span>
                      )}
                      {r.repeatDays > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Repeat className="size-3" /> every {r.repeatDays}d
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
                    {r.type === "Reminder" && <Badge tone={priorityTone(r.priority)} dot>{r.priority}</Badge>}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 whitespace-nowrap text-xs tabular-nums sm:w-[124px] sm:justify-end",
                        r.overdue && !r.done ? "font-semibold text-red-700" : r.due ? "text-slate-600" : "text-slate-400",
                      )}
                    >
                      {r.due ? <Clock className="size-3.5" /> : null}
                      {r.due || (r.type === "Note" ? "" : "—")}
                    </span>
                    <button
                      type="button"
                      title="Delete"
                      aria-label="Delete"
                      className="inline-flex size-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      onClick={() => {
                        if (confirm("Delete this item?")) run(nrDelete(r.id));
                      }}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/** "At a glance" card list item with Done checkbox. */
export function GlanceDone({ id }: { id: number }) {
  const router = useRouter();
  const [, start] = useTransition();
  return (
    <label className="ml-auto flex shrink-0 cursor-pointer items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
      <input
        type="checkbox"
        className="size-3.5 rounded border-slate-300 accent-brand-600"
        onChange={() =>
          start(async () => {
            await nrToggle(id, true);
            router.refresh();
          })
        }
      />{" "}
      Done
    </label>
  );
}
