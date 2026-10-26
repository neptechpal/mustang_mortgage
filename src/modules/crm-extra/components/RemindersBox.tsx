"use client";
// Case metabox "Notes & Reminders" (reminders.php render_box + timeline).
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlarmClock, CalendarClock, Check, Mail, Pencil, Plus, Repeat, StickyNote, Trash2 } from "lucide-react";
import { Badge, Field, buttonStyles, checkboxStyles, cn, inputStyles, selectStyles, textareaStyles, type Tone } from "@/components/admin/ui";

const PRIORITY_TONE: Record<string, Tone> = { High: "danger", Normal: "warning", Low: "neutral" };
const PRI_DOT: Record<string, string> = { High: "bg-red-500", Normal: "bg-amber-500", Low: "bg-slate-400" };
const iconBtn = "inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 [&_svg]:size-4";
import { useToast } from "../ui/client";
import { nrAdd, nrToggle, nrDelete, nrEdit, nrUpdate } from "../actions/reminders";

export type NrItem = {
  id: number;
  type: string;
  title: string;
  note: string;
  priority: string;
  email: string;
  due: string; // "Y-m-d H:i" (Sydney) or ""
  dueLocal: string; // "Y-m-dTH:i"
  overdue: boolean;
  repeatDays: number;
  done: boolean;
  sent: boolean;
};

export default function RemindersBox({ caseId, items, defaultEmail }: { caseId: number; items: NrItem[]; defaultEmail: string }) {
  const router = useRouter();
  const { show, node } = useToast();
  const [pending, start] = useTransition();
  const [type, setType] = useState<"Reminder" | "Note">("Reminder");
  const [what, setWhat] = useState("");
  const [due, setDue] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [priority, setPriority] = useState("Normal");
  const [repeat, setRepeat] = useState("");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState<number | null>(null);

  const run = (p: Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      const r = await p;
      if (!r.ok) {
        alert(r.error || "Failed");
        return;
      }
      after?.();
      router.refresh();
    });

  const add = () =>
    run(nrAdd({ caseId, type, what, due, email, priority, repeatDays: repeat, note }), () => {
      setWhat("");
      setDue("");
      setRepeat("");
      setNote("");
      show("Added");
    });

  const open = items.filter((i) => !i.done).length;
  const overdue = items.filter((i) => !i.done && i.type === "Reminder" && i.overdue).length;

  return (
    <div id="mmcrm_notes_reminders" className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4" aria-label="Add note or reminder">
        <div className="mb-4">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm" role="radiogroup" aria-label="Type">
            {(
              [
                ["Reminder", <AlarmClock key="r" />],
                ["Note", <StickyNote key="n" />],
              ] as const
            ).map(([t, ic]) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={type === t}
                onClick={() => setType(t)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold transition-colors [&_svg]:size-4",
                  type === t ? "bg-brand-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                {ic}
                {t}
              </button>
            ))}
          </div>
        </div>
        {type === "Reminder" && (
          <div className="grid gap-4 md:grid-cols-6">
            <Field label="What needs to happen?" className="md:col-span-4">
              <input className={inputStyles} placeholder="e.g., Call client" value={what} onChange={(e) => setWhat(e.target.value)} />
            </Field>
            <Field label="Due" className="md:col-span-2">
              <input type="datetime-local" className={inputStyles} value={due} onChange={(e) => setDue(e.target.value)} />
            </Field>
            <Field label="Email" className="md:col-span-3">
              <input className={inputStyles} value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Priority" className="md:col-span-2">
              <div className="flex h-[38px] items-center gap-1 rounded-lg border border-slate-300 bg-white p-0.5" role="radiogroup" aria-label="Priority">
                {["Low", "Normal", "High"].map((p) => (
                  <label
                    key={p}
                    className={cn(
                      "flex h-full flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md text-[13px] font-medium transition-colors",
                      priority === p ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
                    )}
                  >
                    <input type="radio" className="sr-only" name={`pri-${caseId}`} checked={priority === p} onChange={() => setPriority(p)} />
                    <span className={cn("size-1.5 rounded-full", PRI_DOT[p])} />
                    {p}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="Repeat (days)" className="md:col-span-1">
              <input type="number" min={0} step={1} className={inputStyles} placeholder="0 = no repeat" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
            </Field>
          </div>
        )}
        {type === "Note" && (
          <Field label="Note">
            <textarea className={textareaStyles} rows={3} placeholder="Write a clear note you’ll understand in 6 months…" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        )}
        <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:items-end sm:justify-between">
          <p className="max-w-2xl text-xs text-slate-500">
            Reminder emails go to your CRM “Email From Address”. Overdue reminders show in red. Completed items don’t send. Repeating reminders re-send every N days after
            the due date until marked Done.
          </p>
          <button type="button" className={buttonStyles({ variant: "primary", className: "shrink-0 self-end" })} disabled={pending} onClick={add}>
            <Plus /> Add
          </button>
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-semibold text-slate-900">Timeline</h4>
          {items.length > 0 && <Badge>{open} open</Badge>}
          {overdue > 0 && (
            <Badge tone="danger" dot>
              {overdue} overdue
            </Badge>
          )}
        </div>
        <div className="space-y-2">
          {items.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">No activity yet.</div>
          )}
          {items.map((it) => {
            const isNote = it.type === "Note";
            const isOver = !it.done && !isNote && it.overdue;
            return (
              <div
                key={it.id}
                className={cn(
                  "group relative flex flex-wrap items-start gap-3 rounded-xl border sm:flex-nowrap bg-white p-3 pl-3.5 transition-colors",
                  it.done ? "border-slate-200 bg-slate-50/70" : isOver ? "border-red-200 bg-red-50/40" : isNote ? "border-amber-200/70 bg-amber-50/30" : "border-slate-200",
                )}
              >
                {isOver && <span aria-hidden className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-red-500" />}
                <span
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset [&_svg]:size-4",
                    it.done
                      ? "bg-emerald-50 text-emerald-600 ring-emerald-200"
                      : isOver
                        ? "bg-red-50 text-red-600 ring-red-200"
                        : isNote
                          ? "bg-amber-50 text-amber-700 ring-amber-200"
                          : "bg-sky-50 text-sky-700 ring-sky-200",
                  )}
                >
                  {it.done ? <Check /> : isNote ? <StickyNote /> : <AlarmClock />}
                </span>
                <div className="min-w-0 flex-1">
                  {isNote ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="warning">Note</Badge>
                      </div>
                      {editing === it.id ? (
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          className="mt-1.5 rounded-lg border border-brand-300 bg-white p-2.5 text-sm whitespace-pre-wrap ring-3 ring-brand-500/15 outline-none"
                          onBlur={(e) => {
                            const t = e.currentTarget.innerText;
                            setEditing(null);
                            run(nrEdit(it.id, t));
                          }}
                        >
                          {it.note}
                        </div>
                      ) : (
                        <div className={cn("mt-1.5 text-sm break-words whitespace-pre-wrap text-slate-800", it.done && "text-slate-500 line-through")}>{it.note}</div>
                      )}
                    </>
                  ) : editing === it.id ? (
                    <ReminderEdit it={it} onCancel={() => setEditing(null)} onSave={(f) => run(nrUpdate(it.id, f), () => setEditing(null))} />
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <strong className={cn("text-sm font-semibold break-words text-slate-900", it.done && "font-medium text-slate-500 line-through")}>{it.title}</strong>
                        <Badge tone={PRIORITY_TONE[it.priority] ?? "neutral"}>{it.priority}</Badge>
                        {isOver && (
                          <Badge tone="danger" dot>
                            Overdue
                          </Badge>
                        )}
                        {it.done && <Badge tone="success">Done</Badge>}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        {it.due && (
                          <span className={cn("inline-flex items-center gap-1 tabular-nums", isOver && "font-semibold text-red-700")}>
                            <CalendarClock className="size-3.5" /> Due: {it.due}
                          </span>
                        )}
                        <span className="sr-only">Priority: {it.priority}</span>
                        {it.email && (
                          <span className="inline-flex min-w-0 items-center gap-1 break-all">
                            <Mail className="size-3.5 shrink-0" /> Email: {it.email}
                            {it.sent ? " (sent)" : ""}
                          </span>
                        )}
                        {it.repeatDays > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Repeat className="size-3.5" /> Repeat: every {it.repeatDays} day(s)
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <div className="-mt-1 flex shrink-0 basis-full items-center justify-end gap-0.5 sm:mt-0 sm:basis-auto">
                  <label className="mr-1 flex cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">
                    <input type="checkbox" className={checkboxStyles} checked={it.done} onChange={(e) => run(nrToggle(it.id, e.target.checked))} /> Done
                  </label>
                  <button type="button" title="Edit" aria-label="Edit" className={iconBtn} onClick={() => setEditing(it.id)}>
                    <Pencil />
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    aria-label="Delete"
                    className={cn(iconBtn, "hover:bg-red-50 hover:text-red-600")}
                    onClick={() => {
                      if (confirm("Delete this item?")) run(nrDelete(it.id));
                    }}
                  >
                    <Trash2 />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {node}
    </div>
  );
}

function ReminderEdit({
  it,
  onSave,
  onCancel,
}: {
  it: NrItem;
  onSave: (f: { what: string; due: string; priority: string; email: string; repeatDays: string }) => void;
  onCancel: () => void;
}) {
  const [f, setF] = useState({ what: it.title, due: it.dueLocal, priority: it.priority, email: it.email, repeatDays: String(it.repeatDays || "") });
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      <input className={cn(inputStyles, "sm:col-span-2 lg:col-span-1")} placeholder="What" value={f.what} onChange={(e) => setF({ ...f, what: e.target.value })} />
      <input type="datetime-local" className={inputStyles} value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} />
      <select className={selectStyles} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
        <option>Low</option>
        <option>Normal</option>
        <option>High</option>
      </select>
      <input className={inputStyles} placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      <input type="number" min={0} className={inputStyles} placeholder="Repeat days" value={f.repeatDays} onChange={(e) => setF({ ...f, repeatDays: e.target.value })} />
      <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
        <button type="button" className={buttonStyles({ variant: "primary", size: "sm" })} onClick={() => onSave(f)}>
          Save
        </button>
        <button type="button" className={buttonStyles({ variant: "secondary", size: "sm" })} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
