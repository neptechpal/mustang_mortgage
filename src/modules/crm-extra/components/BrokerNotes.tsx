"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, MessageSquareText, NotebookPen, Pencil, Plus, Printer, Save, Trash2 } from "lucide-react";
import { Alert, Avatar, Card, Field, buttonStyles, cn, inputStyles, selectStyles, textareaStyles } from "@/components/admin/ui";
import { bnSave, bnUpdate, bnDelete } from "../actions/notes";

export type NoteView = { id: number; title: string; body: string; author: string; date: string };

/** Escape plain text and turn blank lines into paragraphs (wpautop) when body has no HTML. */
const autop = (b: string) =>
  /<\w+[^>]*>/.test(b)
    ? b
    : b
        .replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!)
        .split(/\n{2,}/)
        .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
        .join("");

export function NoteBubbles({
  notes,
  assignCases,
  dateSep = " @ ",
}: {
  notes: NoteView[];
  assignCases?: { id: number; label: string }[];
  dateSep?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState<number | null>(null);
  const [f, setF] = useState({ title: "", body: "", assign: "" });
  return (
    <div className="space-y-3">
      {notes.map((n) => (
        <article key={n.id} className="flex gap-3">
          <Avatar name={n.author || "User"} size="sm" className="mt-0.5" />
          <div className={cn("min-w-0 flex-1 rounded-xl border bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]", edit === n.id ? "border-brand-300 ring-3 ring-brand-500/10" : "border-slate-200/80")}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
              <strong className="font-semibold text-slate-800">{n.author || "User"}</strong>
              <span className="text-slate-300">·</span>
              <span className="tabular-nums">{n.date.replace(" @ ", dateSep)}</span>
              {edit !== n.id && (
                <span className="ml-auto flex items-center gap-0.5">
                  <button
                    type="button"
                    className={buttonStyles({ variant: "ghost", size: "xs" })}
                    onClick={() => {
                      setF({ title: n.title, body: n.body, assign: "" });
                      setEdit(n.id);
                    }}
                  >
                    <Pencil /> Edit
                  </button>
                  <button
                    type="button"
                    className={buttonStyles({ variant: "ghost", size: "xs", className: "hover:!bg-red-50 hover:!text-red-600" })}
                    onClick={() => {
                      if (!confirm("Delete this note?")) return;
                      start(async () => {
                        const r = await bnDelete(n.id);
                        if (!r.ok) return alert(r.message || "Request failed.");
                        router.refresh();
                      });
                    }}
                  >
                    <Trash2 /> Delete
                  </button>
                </span>
              )}
            </div>
            {edit === n.id ? (
              <div className="mt-3 space-y-2.5">
                <input className={inputStyles} placeholder="Title" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
                {assignCases && (
                  <select className={selectStyles} value={f.assign} onChange={(e) => setF({ ...f, assign: e.target.value })}>
                    <option value="">Assign to case (optional)</option>
                    {assignCases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                )}
                <textarea className={textareaStyles} rows={3} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
                <div className="flex gap-2">
                  <button
                    className={buttonStyles({ variant: "primary", size: "sm" })}
                    disabled={pending}
                    onClick={() => {
                      if (!f.body.trim()) return alert("Please enter a note before saving.");
                      start(async () => {
                        const r = await bnUpdate(n.id, f.title, f.body, Number(f.assign) || 0);
                        if (!r.ok) return alert(r.message || "Request failed.");
                        setEdit(null);
                        router.refresh();
                      });
                    }}
                  >
                    <Check /> Save
                  </button>
                  <button className={buttonStyles({ variant: "secondary", size: "sm" })} onClick={() => setEdit(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                {n.title && <h4 className="mt-1.5 text-sm font-semibold text-slate-900">{n.title}</h4>}
                <div
                  className="mt-1 max-w-none text-sm leading-relaxed break-words text-slate-700 [&_a]:text-brand-700 [&_a]:underline [&_li]:ml-5 [&_ol]:list-decimal [&_p+p]:mt-2 [&_ul]:list-disc"
                  dangerouslySetInnerHTML={{ __html: autop(n.body) }}
                />
              </>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

/** Case metabox "Broker Notes & Strategy". */
export function CaseNotesBox({ caseId, notes, printUrl }: { caseId: number; notes: NoteView[]; printUrl: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [flash, setFlash] = useState<"" | "saved" | "error">("");
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <MessageSquareText className="size-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900">Broker Notes &amp; Strategy</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 tabular-nums">{notes.length}</span>
        {notes.length > 0 && (
          <a href={printUrl} target="_blank" rel="noopener" className={buttonStyles({ variant: "secondary", size: "sm", className: "ml-auto" })}>
            <Printer /> Print / Save PDF
          </a>
        )}
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="space-y-2.5">
          <input className={inputStyles} placeholder="Note title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            className={textareaStyles}
            rows={3}
            placeholder="Add broker note (lender strategy, servicing notes, objections, follow-ups, etc.)..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <button
            className={buttonStyles({ variant: "primary" })}
            disabled={pending}
            onClick={() => {
              if (!body.trim()) {
                setFlash("error");
                return alert("Please enter a note before saving.");
              }
              start(async () => {
                const r = await bnSave(caseId, title, body);
                if (!r.ok) return alert(r.message);
                setTitle("");
                setBody("");
                setFlash("saved");
                router.refresh();
              });
            }}
          >
            <Plus /> Add Note
          </button>
        </div>
      </div>
      {flash === "saved" && <Alert tone="success">Note saved successfully!</Alert>}
      {flash === "error" && <Alert tone="warning">Please enter a note before saving.</Alert>}
      <div className="max-h-[520px] overflow-y-auto pr-1">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center">
            <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <MessageSquareText className="size-5" />
            </span>
            <p className="text-sm font-semibold text-slate-900">No broker notes yet</p>
            <p className="mt-1 text-sm text-slate-500">Add your first note above to start tracking this case.</p>
          </div>
        ) : (
          <NoteBubbles notes={notes} />
        )}
      </div>
    </div>
  );
}

/** Overview page "Quick Add Broker Note". */
export function QuickAddNote({ cases }: { cases: { id: number; label: string }[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState({ caseId: "0", title: "", body: "" });
  const [saved, setSaved] = useState(false);
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <NotebookPen className="size-4 text-brand-600" /> Quick Add Broker Note
        </span>
      }
      description="Attach it to a case, or leave it as a general note."
      footer={
        <div className="flex justify-end">
          <button
            className={buttonStyles({ variant: "primary" })}
            disabled={pending}
            onClick={() => {
              if (!f.body.trim()) return alert("Please enter a note before saving.");
              start(async () => {
                const r = await bnSave(Number(f.caseId), f.title, f.body);
                if (!r.ok) return alert(r.message);
                setF({ caseId: "0", title: "", body: "" });
                setSaved(true);
                router.refresh();
              });
            }}
          >
            <Save /> Save Note
          </button>
        </div>
      }
    >
      {saved && (
        <Alert tone="success" className="mb-4">
          Note saved successfully!
        </Alert>
      )}
      <div className="@container">
      <div className="grid gap-4 @lg:grid-cols-2">
        <Field label="Case (optional)">
          <select className={selectStyles} value={f.caseId} onChange={(e) => setF({ ...f, caseId: e.target.value })}>
            <option value="0">General Note (no case)</option>
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Note Title (optional)">
          <input
            className={inputStyles}
            placeholder="e.g., Initial enquiry, Follow-up needed, Lender strategy"
            value={f.title}
            onChange={(e) => setF({ ...f, title: e.target.value })}
          />
        </Field>
        <Field label="Note" required className="@lg:col-span-2">
          <textarea className={textareaStyles} rows={4} required placeholder="Add your broker note here..." value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} />
        </Field>
      </div>
      </div>
    </Card>
  );
}
