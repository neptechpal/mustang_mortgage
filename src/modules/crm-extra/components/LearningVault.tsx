"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ExternalLink, Eye, GraduationCap, Pencil, Pin, Plus, Save, Search, Tag, Trash2, X } from "lucide-react";
import { Alert, Badge, buttonStyles, checkboxStyles, cn, EmptyState, Field, inputStyles, textareaStyles } from "@/components/admin/ui";
import { learningSave, learningDelete } from "../actions/notes";

export type LearnItem = { id: number; title: string; url: string; summary: string; tags: string; pinned: boolean; added: string; updated: string };
const DEFAULT_TAGS = ["policy", "lender-a", "lender-b", "docs", "compliance", "broker-tips"];

function LearnForm({ item, onDone, submitLabel }: { item?: LearnItem; onDone: (msg: string, bad?: boolean) => void; submitLabel: string }) {
  const [tags, setTags] = useState(item?.tags ?? "");
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-4"
      action={(fd) =>
        start(async () => {
          fd.set("learning_tags", tags);
          const r = await learningSave(fd);
          onDone(r.message || "", !r.ok);
        })
      }
    >
      {item && <input type="hidden" name="learning_id" value={item.id} />}
      <Field label="Title" required>
        <input name="learning_title" required defaultValue={item?.title} className={inputStyles} placeholder="e.g., Lender policy changes" />
      </Field>
      <Field label="URL">
        <input name="learning_url" type="url" defaultValue={item?.url} className={inputStyles} placeholder="https://" />
      </Field>
      <Field label="Summary">
        <textarea name="learning_summary" rows={6} defaultValue={item?.summary} className={textareaStyles} />
      </Field>
      <Field label="Tags" hint="Comma separated. Helps search and grouping.">
        <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputStyles} placeholder="policy, lender-a, docs" />
      </Field>
      <div className="-mt-1 flex flex-wrap gap-1.5">
        {DEFAULT_TAGS.map((t) => (
          <button
            type="button"
            key={t}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-xs font-medium text-slate-600 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-800"
            onClick={() => {
              const cur = tags.split(",").map((s) => s.trim()).filter(Boolean);
              if (!cur.includes(t)) setTags([...cur, t].join(", "));
            }}
          >
            <Plus className="size-3" />
            {t}
          </button>
        ))}
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="learning_pinned" value="1" defaultChecked={item?.pinned} className={checkboxStyles} /> Pin to top
      </label>
      <button className={buttonStyles({ variant: "primary", className: "w-full sm:w-auto" })} disabled={pending}>
        {item ? <Save /> : <Plus />}
        {submitLabel}
      </button>
    </form>
  );
}

export default function LearningVault({ items }: { items: LearnItem[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [flash, setFlash] = useState<{ t: string; bad?: boolean } | null>(null);
  const [view, setView] = useState<LearnItem | null>(null);
  const [preview, setPreview] = useState(false);
  const [edit, setEdit] = useState<LearnItem | null>(null);
  const [formKey, setFormKey] = useState(0);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setView(null);
        setEdit(null);
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter((i) => `${i.title} ${i.summary} ${i.tags}`.toLowerCase().includes(s)) : items;
  }, [items, q]);
  const done = (t: string, bad?: boolean) => {
    setFlash({ t, bad });
    if (!bad) {
      setEdit(null);
      setFormKey((k) => k + 1);
    }
    router.refresh();
  };
  const xs = buttonStyles({ variant: "ghost", size: "xs" });
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <section className="rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:sticky lg:top-6">
        <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <Plus className="size-4" />
          </span>
          <h2 className="text-[15px] font-semibold text-slate-900">Add to Learning Vault</h2>
        </header>
        <div className="p-5">
          {flash && (
            <Alert tone={flash.bad ? "warning" : "success"} className="mb-4">
              {flash.t}
            </Alert>
          )}
          <LearnForm key={formKey} onDone={done} submitLabel="Save Learning" />
        </div>
      </section>
      <section className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-[15px] font-semibold text-slate-900">
            Your Learning Vault <span className="ml-1 font-normal text-slate-500 tabular-nums">{shown.length}</span>
          </h2>
          <div className="relative w-full sm:ml-auto sm:w-72">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input className={`${inputStyles} pl-9`} placeholder="Search title, summary, tags" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        {items.length === 0 && <EmptyState icon={<GraduationCap />} title="No items yet." description="Add your first resource on the left." />}
        {items.length > 0 && shown.length === 0 && <EmptyState icon={<Search />} title="Nothing matches your search." />}
        <div className="grid gap-4 xl:grid-cols-2">
          {shown.map((i) => (
            <article
              key={i.id}
              className={cn(
                "flex flex-col rounded-xl border bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:shadow-md",
                i.pinned ? "border-brand-200 ring-1 ring-brand-100" : "border-slate-200/80",
              )}
            >
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                  <BookOpen className="size-4" />
                </span>
                <button type="button" onClick={() => (setView(i), setPreview(false))} className="min-w-0 flex-1 text-left text-sm font-semibold text-slate-900 hover:text-brand-700">
                  {i.title}
                </button>
                {i.pinned && (
                  <Badge tone="brand">
                    <Pin className="size-3" /> Pinned
                  </Badge>
                )}
              </div>
              <div
                className="relative mt-2 max-h-[140px] overflow-hidden text-sm leading-relaxed text-slate-600 after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-8 after:bg-gradient-to-t after:from-white"
                dangerouslySetInnerHTML={{ __html: i.summary }}
              />
              <div className="h-3 shrink-0" />
              {i.tags.trim() && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {i.tags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((t) => (
                      <Badge key={t} tone="info" className="text-[11px]">
                        <Tag className="size-3" />
                        {t}
                      </Badge>
                    ))}
                </div>
              )}
              <p className="mt-auto text-xs text-slate-500">
                Added {i.added}
                {i.updated && ` · Updated ${i.updated}`}
              </p>
              <div className="-mx-1.5 mt-2.5 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-2.5">
                <button className={xs} onClick={() => (setView(i), setPreview(false))}>
                  <Eye /> Open
                </button>
                {i.url && (
                  <a className={xs} href={i.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink /> New Tab
                  </a>
                )}
                <button className={xs} onClick={() => setEdit(i)}>
                  <Pencil /> Edit
                </button>
                <button
                  className={cn(xs, "text-red-600 hover:bg-red-50 hover:text-red-700")}
                  onClick={async () => {
                    if (!confirm("Delete this learning item?")) return;
                    const r = await learningDelete(i.id);
                    setFlash({ t: r.message || "Deleted.", bad: true });
                    router.refresh();
                  }}
                >
                  <Trash2 /> Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {view && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]" onClick={() => setView(null)}>
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/10" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold text-slate-900">{view.title || "Resource"}</h3>
                <div className="mt-0.5 text-xs text-slate-500">
                  Added {view.added}
                  {view.updated && ` · Updated ${view.updated}`}
                </div>
              </div>
              <button className={buttonStyles({ variant: "ghost", size: "sm" })} onClick={() => setView(null)} aria-label="Close">
                <X /> Close
              </button>
            </div>
            <div className="px-6 py-5">
              <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: view.summary || "<em>No summary provided.</em>" }} />
              <div className="mt-5 flex flex-wrap gap-2">
                <button className={buttonStyles({ variant: "secondary" })} disabled={!view.url} onClick={() => setPreview(true)}>
                  <Eye /> Preview in Modal
                </button>
                {view.url && (
                  <a className={buttonStyles({ variant: "secondary" })} href={view.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink /> Open in New Tab
                  </a>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500">Some sites block embedded previews. Use New Tab if preview fails.</p>
              {preview && view.url && <iframe title="Learning resource" src={view.url} className="mt-4 h-[60vh] w-full rounded-lg border border-slate-200" />}
            </div>
          </div>
        </div>
      )}
      {edit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[2px]" onClick={() => setEdit(null)}>
          <div className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-2xl bg-white shadow-2xl ring-1 ring-black/10" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
              <Pencil className="size-4 text-slate-400" />
              <h3 className="flex-1 text-[15px] font-semibold text-slate-900">Edit Learning</h3>
              <button className={buttonStyles({ variant: "ghost", size: "xs" })} onClick={() => setEdit(null)} aria-label="Close">
                <X />
              </button>
            </div>
            <div className="px-6 py-5">
              <LearnForm item={edit} onDone={done} submitLabel="Save Changes" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
