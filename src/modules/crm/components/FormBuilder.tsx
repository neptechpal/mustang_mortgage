"use client";
// Form builder (forms-builder.js): palette, ready-made blocks, sections, drag & drop,
// field inspector, conditional logic, case mapping, settings pane and live preview.
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  AlignLeft, ArrowDown, ArrowUp, AtSign, Blocks, Calendar, Check, CircleAlert, CircleDot, Copy, DollarSign, Eye, GitBranch,
  GripVertical, Hash, Info, LayoutTemplate, Link2, LoaderCircle, MousePointerClick, Phone, Plus, Repeat, Settings2, Signature,
  SlidersHorizontal, SquareCheck, SquareChevronDown, ToggleLeft, Trash2, Type, X, type LucideIcon,
} from "lucide-react";
import { CASE_MAP_OPTIONS, OPERATORS, TYPES, keyFrom, normalizeSchema, type Cond, type Field, type FieldType, type Schema, type Section } from "../forms/engine";
import { saveFormAction } from "../actions";
import FormRunner from "./FormRunner";
import { Badge, buttonStyles, cn, inputStyles, labelStyles } from "@/components/admin/ui";
import { Toggle } from "./admin-kit";

type Block = { id: string; label: string; section: Record<string, unknown> };
type Sel = { s: number; f: number | null } | null;
const inp = cn(inputStyles, "!px-2.5 !py-1.5 !text-[13px]");
const lab = "mb-1 mt-3.5 block text-xs font-medium text-slate-600";
const NOOPT: FieldType[] = ["text", "textarea", "email", "tel", "number", "currency", "date", "yesno", "signature", "info", "repeater"];
const SUBTYPES: FieldType[] = ["text", "number", "currency", "date", "select", "tel", "email"];
const rid = () => "s" + Math.random().toString(16).slice(2, 8);

const ICONS: Record<FieldType, LucideIcon> = {
  text: Type, textarea: AlignLeft, email: AtSign, tel: Phone, number: Hash, currency: DollarSign, date: Calendar,
  select: SquareChevronDown, radio: CircleDot, checkbox: SquareCheck, yesno: ToggleLeft, repeater: Repeat, signature: Signature, info: Info,
};
const GROUPS: [string, FieldType[]][] = [
  ["Text", ["text", "textarea", "email", "tel"]],
  ["Numbers & dates", ["number", "currency", "date"]],
  ["Choices", ["select", "radio", "checkbox", "yesno"]],
  ["Advanced", ["repeater", "signature", "info"]],
];
const shortLabel = (t: FieldType) => TYPES[t][0].replace(/ \(.*\)/, "");
const WIDTH_LABEL = { full: "Full", half: "Half", third: "Third" } as const;

function TypeIcon({ type, className }: { type: FieldType; className?: string }) {
  const I = ICONS[type] ?? Type;
  return <I className={className} strokeWidth={1.9} />;
}

function allKeys(s: Schema) {
  const k = new Set<string>();
  s.sections.forEach((sec) => sec.fields.forEach((f) => k.add(f.key)));
  return k;
}
function uniq(base: string, used: Set<string>) {
  let k = base || "field", n = 2;
  while (used.has(k)) k = `${base}_${n++}`;
  return k;
}
function blankField(type: FieldType, used: Set<string>): Field {
  const label = type === "info" ? "Heading" : TYPES[type][0];
  return {
    key: uniq(keyFrom(label) || type, used), type, label, required: 0, width: type === "textarea" || type === "repeater" || type === "info" || type === "checkbox" ? "full" : "half",
    help: "", placeholder: "", default: "", options: ["select", "radio", "checkbox"].includes(type) ? ["Option 1", "Option 2"] : [], show_if: null, map: "", min: "", max: "",
    ...(type === "info" ? { content: "" } : {}), ...(type === "repeater" ? { add_label: "Add another", max_rows: 10, fields: [{ ...blankSub("text", "Item") }] } : {}),
  };
}
function blankSub(type: FieldType, label: string): Field {
  return { key: keyFrom(label) || "col", type, label, required: 0, width: "half", help: "", placeholder: "", default: "", options: [], show_if: null, map: "", min: "", max: "" };
}

/** true at ≥1280px — the inspector docks to the right; below it renders inline under the selection. */
function useWide() {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 1280px)");
    const f = () => setWide(m.matches);
    f();
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return wide;
}

const iconBtn = "inline-flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-30 [&_svg]:size-4";

export default function FormBuilder({ id, title: t0, schema: s0, isFf: ff0, canSetFf, blocks }: { id: number | null; title: string; schema: Schema; isFf: boolean; canSetFf: boolean; blocks: Block[] }) {
  const [schema, setSchema] = useState<Schema>(s0);
  const [title, setTitle] = useState(t0);
  const [isFf, setIsFf] = useState(ff0);
  const [pane, setPane] = useState<"build" | "settings">("build");
  const [sel, setSel] = useState<Sel>(null);
  const [preview, setPreview] = useState(false);
  const [drag, setDrag] = useState<{ s: number; f: number } | null>(null);
  const [over, setOver] = useState<{ s: number; f: number } | null>(null);
  const [adding, setAdding] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const wide = useWide();
  const nFields = schema.sections.reduce((a, s) => a + s.fields.filter((f) => f.type !== "info").length, 0);

  // save-state indicator (UI only)
  const sig = useMemo(() => JSON.stringify([title, isFf, schema]), [title, isFf, schema]);
  const [savedSig, setSavedSig] = useState(sig);
  const dirty = sig !== savedSig;

  const mut = (fn: (s: Schema) => void) => setSchema((prev) => { const c = structuredClone(prev); fn(c); return c; });
  const curSec = sel ? schema.sections[sel.s] : null;
  const curField = sel && sel.f !== null && curSec ? curSec.fields[sel.f] : null;

  // preceding (non-info, non-repeater) fields are condition candidates
  const candidates = useMemo(() => {
    if (!sel) return [];
    const out: Field[] = [];
    for (let si = 0; si < schema.sections.length; si++) {
      const sec = schema.sections[si];
      for (let fi = 0; fi < sec.fields.length; fi++) {
        if (si === sel.s && (sel.f === null || fi >= sel.f)) return out;
        const f = sec.fields[fi];
        if (f.type !== "info" && f.type !== "repeater") out.push(f);
      }
      if (si === sel.s) return out;
    }
    return out;
  }, [schema, sel]);

  function addField(type: FieldType, target: Sel = sel) {
    const used = allKeys(schema);
    mut((s) => {
      if (!s.sections.length) s.sections.push({ id: rid(), title: "Section 1", description: "", show_if: null, tone: "", fields: [] });
      const si = target ? target.s : s.sections.length - 1;
      const at = target && target.f !== null ? target.f + 1 : s.sections[si].fields.length;
      s.sections[si].fields.splice(at, 0, blankField(type, used));
      setSel({ s: si, f: at });
    });
  }
  function addBlock(b: Block) {
    const used = allKeys(schema);
    const sec = normalizeSchema({ sections: [b.section] }).sections[0];
    const remap: Record<string, string> = {};
    for (const f of sec.fields) { const nk = uniq(f.key, used); remap[f.key] = nk; f.key = nk; used.add(nk); }
    for (const f of sec.fields) if (f.show_if && remap[f.show_if.field]) f.show_if.field = remap[f.show_if.field];
    sec.id = rid();
    mut((s) => { s.sections.push(sec); setSel({ s: s.sections.length - 1, f: null }); });
  }
  function updField(patch: Partial<Field>) {
    if (!sel || sel.f === null) return;
    mut((s) => {
      const f = s.sections[sel.s].fields[sel.f!];
      const autoKey = patch.label !== undefined && (f.key === keyFrom(f.label) || f.key.startsWith(keyFrom(f.label) + "_"));
      Object.assign(f, patch);
      if (autoKey) {
        const used = allKeys(s); used.delete(f.key);
        f.key = uniq(keyFrom(f.label) || f.type, used);
      }
    });
  }
  function moveField(from: { s: number; f: number }, to: { s: number; f: number }) {
    mut((s) => {
      const [x] = s.sections[from.s].fields.splice(from.f, 1);
      let idx = to.f;
      if (from.s === to.s && from.f < to.f) idx--;
      s.sections[to.s].fields.splice(Math.max(0, idx), 0, x);
    });
    setSel(null);
  }
  function save() {
    setMsg(null);
    const at = sig;
    start(async () => {
      const r = await saveFormAction(id, title, JSON.stringify(schema), isFf);
      setMsg(r.ok ? { ok: true, text: "Form saved." } : { ok: false, text: r.error || "Could not save" });
      if (r.ok) setSavedSig(at);
      if (r.ok && !id) router.replace(`/admin/forms/${r.id}`);
      else router.refresh();
    });
  }
  const addSection = () => mut((s) => { s.sections.push({ id: rid(), title: `Section ${s.sections.length + 1}`, description: "", show_if: null, tone: "", fields: [] }); setSel({ s: s.sections.length - 1, f: null }); });
  const endDrag = () => { setDrag(null); setOver(null); };

  const inspector = !sel ? null : curField ? (
    <FieldInspector key={`${sel.s}-${sel.f}`} f={curField} upd={updField} candidates={candidates} allKeys={allKeys(schema)} onClose={() => setSel(null)} />
  ) : curSec ? (
    <SectionInspector sec={curSec} upd={(p) => mut((s) => { Object.assign(s.sections[sel.s], p); })} candidates={candidates} onClose={() => setSel(null)} />
  ) : null;
  const inlineInspector = (node: ReactNode) => <div className="mt-2 rounded-xl border border-brand-200 bg-white p-4 shadow-sm ring-4 ring-brand-500/5">{node}</div>;

  const targetSec = schema.sections.length ? schema.sections[sel ? sel.s : schema.sections.length - 1] : null;

  // save-state pill
  const status = pending ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500"><LoaderCircle className="size-3.5 animate-spin" />Saving…</span>
  ) : msg && !msg.ok ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600" role="alert"><CircleAlert className="size-3.5" />{msg.text}</span>
  ) : dirty ? (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-amber-700"><span className="size-1.5 rounded-full bg-amber-500" />Unsaved changes</span>
  ) : !id ? (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-slate-500"><span className="size-1.5 rounded-full bg-slate-400" />Not published yet</span>
  ) : (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-emerald-700"><Check className="size-3.5" />{msg?.ok ? msg.text : "All changes saved"}</span>
  );

  return (
    <div>
      {/* ------------------------------------------------------------- toolbar */}
      <div className="z-10 mb-3 bg-canvas pb-2 xl:sticky xl:top-16 xl:-mt-2 xl:pt-2">
      <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Form title"
            aria-label="Form title"
            className="!h-10 min-w-0 flex-1 basis-full !border-transparent !bg-transparent !px-2 text-lg font-semibold tracking-tight !shadow-none hover:!border-slate-200 focus:!border-brand-500 focus:!bg-white sm:basis-48"
          />
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-[13px] font-medium" role="tablist">
            {(["build", "settings"] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={pane === p}
                onClick={() => setPane(p)}
                className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors [&_svg]:size-4", pane === p ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}
              >
                {p === "build" ? <Blocks /> : <SlidersHorizontal />}
                {p === "build" ? "Build" : "Settings"}
              </button>
            ))}
          </div>
          <span className="hidden text-xs tabular-nums text-slate-500 min-[1400px]:inline">{nFields} fields · {schema.sections.length} sections</span>
          <div className="ml-auto flex items-center gap-2.5">
            {status}
            <button type="button" className={buttonStyles({ variant: "secondary" })} onClick={() => setPreview(true)}><Eye />Preview</button>
            <button type="button" disabled={pending} onClick={save} className={buttonStyles({ variant: "primary" })}>
              {pending ? <LoaderCircle className="animate-spin" /> : <Check />}
              {pending ? "Saving…" : id ? "Update" : "Publish"}
            </button>
          </div>
        </div>
        <p className="mt-1 px-2 text-xs tabular-nums text-slate-500 xl:hidden">{nFields} fields · {schema.sections.length} sections</p>
      </div>
      </div>

      {pane === "settings" ? (
        <div className="mx-auto max-w-3xl space-y-5">
          {id && canSetFf && (
            <SettingsCard title="Client Fact Find" description="Which form clients see on the portal’s Fact Find tab.">
              <label className="flex cursor-pointer items-start gap-3">
                <Toggle checked={isFf} onChange={(e) => setIsFf(e.target.checked)} className="mt-0.5" />
                <span>
                  <span className="block text-sm font-medium text-slate-900">Use this as the client <strong>Fact Find</strong></span>
                  <span className="mt-0.5 block text-[13px] text-slate-500">The Fact Find is what clients see on the portal’s <em>Fact Find</em> tab. Data keeps flowing to Flex Entry, snapshots and the activity log.</span>
                </span>
              </label>
            </SettingsCard>
          )}
          <SettingsCard title="Appearance" description="How the form looks to your client.">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <span className={labelStyles}>Accent colour</span>
                <div className="flex items-center gap-2.5">
                  <input type="color" value={schema.settings.accent} onChange={(e) => mut((s) => { s.settings.accent = e.target.value; })} className="h-9 w-12 cursor-pointer rounded-lg border border-slate-300 bg-white p-1" />
                  <code className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">{schema.settings.accent}</code>
                </div>
              </div>
              <div>
                <span className={labelStyles}>Step-by-step wizard</span>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
                  <Toggle checked={!!schema.settings.steps} onChange={(e) => mut((s) => { s.settings.steps = e.target.checked ? 1 : 0; })} />
                  Show one section at a time with a progress bar
                </label>
              </div>
              <div className="sm:col-span-2">
                <span className={labelStyles}>Intro text</span>
                <textarea rows={3} className={inputStyles} placeholder="Shown at the top of the form" value={schema.settings.intro} onChange={(e) => mut((s) => { s.settings.intro = e.target.value; })} />
              </div>
            </div>
          </SettingsCard>
          <SettingsCard title="Submission" description="What happens when your client presses submit.">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <span className={labelStyles}>Submit button label</span>
                <input className={inputStyles} value={schema.settings.submit_label} onChange={(e) => mut((s) => { s.settings.submit_label = e.target.value; })} />
              </div>
              <div>
                <span className={labelStyles}>Notify me at</span>
                <input className={inputStyles} placeholder="blank = your From email" value={schema.settings.notify_email} onChange={(e) => mut((s) => { s.settings.notify_email = e.target.value; })} />
              </div>
              <div className="sm:col-span-2">
                <span className={labelStyles}>Thank-you message</span>
                <input className={inputStyles} value={schema.settings.success_msg} onChange={(e) => mut((s) => { s.settings.success_msg = e.target.value; })} />
              </div>
            </div>
          </SettingsCard>
          <SettingsCard title="Access" description="Who can fill the form in, and whether they can change their answers.">
            <div className="divide-y divide-slate-100">
              <label className="flex cursor-pointer items-start gap-3 pb-4">
                <Toggle checked={!!schema.settings.allow_edit} onChange={(e) => mut((s) => { s.settings.allow_edit = e.target.checked ? 1 : 0; })} className="mt-0.5" />
                <span><span className="block text-sm font-medium text-slate-900">Editing</span><span className="mt-0.5 block text-[13px] text-slate-500">Let clients edit &amp; re-submit after submitting</span></span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 pt-4">
                <Toggle checked={!!schema.settings.public} onChange={(e) => mut((s) => { s.settings.public = e.target.checked ? 1 : 0; })} className="mt-0.5" />
                <span><span className="block text-sm font-medium text-slate-900">Public form</span><span className="mt-0.5 block text-[13px] text-slate-500">Anyone can fill this in via its public link (creates a new case automatically)</span></span>
              </label>
            </div>
            {id ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-[13px] text-slate-600 ring-1 ring-inset ring-slate-200">
                <Link2 className="size-4 text-slate-400" />
                <span className="font-medium text-slate-700">Public link</span>
                <code className="font-mono text-xs text-slate-800">/portal/form/{id}</code>
              </div>
            ) : null}
          </SettingsCard>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_300px]">
          {/* ----------------------------------------------------------- palette */}
          <aside className="min-w-0 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto lg:pr-1 xl:top-[9.75rem] xl:max-h-[calc(100vh-10.75rem)] [scrollbar-width:thin]">
            <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <div className="mb-2 flex items-baseline justify-between gap-2 px-1">
                <h3 className="shrink-0 whitespace-nowrap text-[13px] font-semibold text-slate-900">Add a field</h3>
                {targetSec && <span className="min-w-0 truncate text-[11px] text-slate-400" title={`New fields go into “${targetSec.title}”`}>→ {targetSec.title || "section"}</span>}
              </div>
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:mx-0 lg:block lg:space-y-3 lg:overflow-visible lg:px-0 lg:pb-0">
                {[...GROUPS, ["Other", (Object.keys(TYPES) as FieldType[]).filter((t) => !GROUPS.some(([, g]) => g.includes(t)))] as [string, FieldType[]]].filter(([, g]) => g.length).map(([g, types]) => (
                  <div key={g} className="contents lg:block">
                    <p className="mb-1 hidden px-1 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400 lg:block">{g}</p>
                    <div className="contents lg:grid lg:gap-0.5">
                      {types.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => addField(t)}
                          title={TYPES[t][0]}
                          className="group flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5 text-left text-[13px] font-medium text-slate-700 transition-colors hover:border-brand-300 hover:bg-brand-50/60 hover:text-slate-900 lg:border-transparent lg:px-1.5 lg:py-1"
                        >
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500 transition-colors group-hover:bg-white group-hover:text-brand-700 group-hover:ring-1 group-hover:ring-brand-200">
                            <TypeIcon type={t} className="size-3.5" />
                          </span>
                          <span className="whitespace-nowrap">{shortLabel(t)}</span>
                          <Plus className="ml-auto hidden size-3.5 text-brand-600 opacity-0 transition-opacity group-hover:opacity-100 lg:block" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <h3 className="mb-2 flex items-center gap-1.5 px-1 text-[13px] font-semibold text-slate-900"><LayoutTemplate className="size-4 text-slate-400" />Ready-made sections</h3>
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:mx-0 lg:grid lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0">
                {blocks.map((b) => (
                  <button key={b.id} type="button" onClick={() => addBlock(b)} className="group flex shrink-0 items-center gap-2 rounded-lg border border-dashed border-slate-300 px-2.5 py-1.5 text-left text-[13px] text-slate-600 transition-colors hover:border-brand-400 hover:bg-brand-50/60 hover:text-slate-900">
                    <Plus className="size-3.5 shrink-0 text-slate-400 group-hover:text-brand-600" />
                    <span className="whitespace-nowrap lg:whitespace-normal">{b.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <p className="mt-3 hidden items-start gap-1.5 px-1 text-[11px] leading-relaxed text-slate-400 lg:flex"><GripVertical className="mt-px size-3.5 shrink-0" />Tip: drag fields by the handle to reorder, or between sections.</p>
          </aside>

          {/* ------------------------------------------------------------ canvas */}
          <main className="@container min-w-0 space-y-4">
            {!schema.sections.length && (
              <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
                <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100"><Blocks className="size-5" /></div>
                <p className="text-sm font-semibold text-slate-900">Start building your form</p>
                <p className="mt-1 max-w-sm text-sm text-slate-500">Pick a field type or a ready-made section from the left, or start with an empty section.</p>
                <button type="button" className={buttonStyles({ variant: "secondary", className: "mt-4" })} onClick={addSection}><Plus />Add section</button>
              </div>
            )}
            {schema.sections.map((sec, si) => {
              const secSel = sel?.s === si && sel.f === null;
              return (
                <section
                  key={sec.id}
                  className={cn(
                    "rounded-xl border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow",
                    secSel ? "border-brand-400 ring-4 ring-brand-500/10" : "border-slate-200/80",
                    sec.tone === "a1" && "border-l-4 border-l-indigo-500",
                    sec.tone === "a2" && "border-l-4 border-l-amber-500",
                  )}
                  onDragOver={(e) => { e.preventDefault(); if (drag) setOver({ s: si, f: sec.fields.length }); }}
                  onDrop={(e) => { e.preventDefault(); if (drag) moveField(drag, { s: si, f: sec.fields.length }); endDrag(); }}
                >
                  <header className="flex items-start gap-2 border-b border-slate-100 px-3 py-2.5 sm:px-4">
                    <span className="mt-2 flex size-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-semibold tabular-nums text-slate-500">{si + 1}</span>
                    <div className="min-w-0 flex-1">
                      <input
                        value={sec.title}
                        placeholder="Section title"
                        aria-label="Section title"
                        onChange={(e) => mut((s) => { s.sections[si].title = e.target.value; })}
                        onFocus={() => setSel({ s: si, f: null })}
                        className="!h-9 w-full !border-transparent !bg-transparent !px-1.5 text-[15px] font-semibold !shadow-none hover:!border-slate-200 focus:!border-brand-500 focus:!bg-white"
                      />
                      <div className="flex flex-wrap items-center gap-1.5 px-1.5 pb-0.5 text-xs text-slate-500">
                        <span className="tabular-nums">{sec.fields.length} {sec.fields.length === 1 ? "field" : "fields"}</span>
                        {sec.description && <span className="truncate">· {sec.description}</span>}
                        {sec.tone && <Badge tone={sec.tone === "a1" ? "violet" : "warning"} className="!py-0 !text-[11px]">{sec.tone === "a1" ? "Applicant 1" : "Applicant 2"}</Badge>}
                        {sec.show_if && <Badge tone="warning" className="!py-0 !text-[11px]"><GitBranch className="size-3" />if {sec.show_if.field}</Badge>}
                      </div>
                    </div>
                    <div className="mt-1 flex shrink-0 items-center">
                      <button type="button" title="Move up" aria-label="Move section up" disabled={si === 0} onClick={() => mut((s) => { const [x] = s.sections.splice(si, 1); s.sections.splice(si - 1, 0, x); })} className={iconBtn}><ArrowUp /></button>
                      <button type="button" title="Move down" aria-label="Move section down" disabled={si === schema.sections.length - 1} onClick={() => mut((s) => { const [x] = s.sections.splice(si, 1); s.sections.splice(si + 1, 0, x); })} className={iconBtn}><ArrowDown /></button>
                      <button type="button" title="Section settings" aria-label="Section settings" onClick={() => setSel({ s: si, f: null })} className={cn(iconBtn, secSel && "bg-brand-50 text-brand-700")}><Settings2 /></button>
                      <button type="button" title="Delete section" aria-label="Delete section" onClick={() => { if (confirm(`Delete this section and its ${sec.fields.length} fields?`)) { mut((s) => { s.sections.splice(si, 1); }); setSel(null); } }} className={cn(iconBtn, "hover:bg-red-50 hover:text-red-600")}><Trash2 /></button>
                    </div>
                  </header>
                  {!wide && secSel && inspector && <div className="px-3 pt-1 sm:px-4">{inlineInspector(inspector)}</div>}
                  <div className="space-y-1.5 p-2.5 sm:p-3">
                    {sec.fields.map((f, fi) => {
                      const on = sel?.s === si && sel.f === fi;
                      const dragging = drag?.s === si && drag.f === fi;
                      return (
                        <div key={f.key + fi}>
                          <div
                            draggable
                            onDragStart={() => setDrag({ s: si, f: fi })}
                            onDragEnd={endDrag}
                            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (drag) setOver({ s: si, f: fi }); }}
                            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (drag) moveField(drag, { s: si, f: fi }); endDrag(); }}
                            onClick={() => setSel({ s: si, f: fi })}
                            className={cn(
                              "group relative flex cursor-pointer items-center gap-2 rounded-lg border bg-white py-2 pl-1 pr-2 text-sm transition-all",
                              on ? "border-brand-400 bg-brand-50/50 ring-2 ring-brand-500/10" : "border-slate-200 hover:border-slate-300 hover:shadow-sm",
                              dragging && "opacity-40",
                            )}
                          >
                            {drag && over?.s === si && over.f === fi && !dragging && <span className="pointer-events-none absolute -top-[5px] left-2 right-2 h-0.5 rounded-full bg-brand-500" />}
                            <span className="flex cursor-grab touch-none items-center self-stretch px-0.5 text-slate-300 group-hover:text-slate-400 active:cursor-grabbing" title="Drag"><GripVertical className="size-4" /></span>
                            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", on ? "bg-white text-brand-700 ring-1 ring-brand-200" : "bg-slate-100 text-slate-500")}>
                              <TypeIcon type={f.type} className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1 truncate font-medium text-slate-900">
                                <span className="truncate">{f.label || <em className="font-normal text-slate-400">(no label)</em>}</span>
                                {f.required ? <span className="text-red-500" title="Required">*</span> : null}
                              </span>
                              <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-slate-400">
                                <code className="truncate font-mono">{f.key}</code>
                                <span className="hidden shrink-0 @md:inline">· {shortLabel(f.type)}</span>
                              </span>
                            </span>
                            <span className="hidden shrink-0 items-center gap-1 @lg:flex">
                              {f.map && <span title={CASE_MAP_OPTIONS[f.map] ?? f.map} className="inline-flex max-w-[9rem] items-center gap-1 rounded-full bg-sky-50 px-1.5 py-0.5 text-[10.5px] font-medium text-sky-700 ring-1 ring-inset ring-sky-200"><Link2 className="size-3 shrink-0" /><span className="truncate">{(CASE_MAP_OPTIONS[f.map] ?? f.map).replace(/^Case: /, "")}</span></span>}
                              {f.show_if && <span title={`Only shown if ${f.show_if.field} ${OPERATORS[f.show_if.op] ?? f.show_if.op} ${f.show_if.value}`} className="inline-flex max-w-[8rem] items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-medium text-amber-800 ring-1 ring-inset ring-amber-200"><GitBranch className="size-3 shrink-0" /><span className="truncate">if {f.show_if.field}</span></span>}
                              {f.width !== "full" && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-medium text-slate-500">{f.width === "half" ? "½" : "⅓"}</span>}
                            </span>
                            {(f.map || f.show_if) && <span className="flex shrink-0 gap-0.5 @lg:hidden">{f.map && <Link2 className="size-3.5 text-sky-600" />}{f.show_if && <GitBranch className="size-3.5 text-amber-600" />}</span>}
                            <span className={cn("flex shrink-0 items-center transition-opacity xl:opacity-0 xl:group-hover:opacity-100 xl:focus-within:opacity-100", on && "xl:opacity-100")}>
                              <button type="button" title="Duplicate" aria-label="Duplicate field" onClick={(e) => { e.stopPropagation(); mut((s) => { const c = structuredClone(f); const used = allKeys(s); c.key = uniq(f.key, used); c.label = f.label + " (copy)"; s.sections[si].fields.splice(fi + 1, 0, c); }); }} className={iconBtn}><Copy className="!size-3.5" /></button>
                              <button type="button" title="Delete" aria-label="Delete field" onClick={(e) => { e.stopPropagation(); mut((s) => { s.sections[si].fields.splice(fi, 1); }); setSel(null); }} className={cn(iconBtn, "hover:bg-red-50 hover:text-red-600")}><Trash2 className="!size-3.5" /></button>
                            </span>
                          </div>
                          {!wide && on && inspector && inlineInspector(inspector)}
                        </div>
                      );
                    })}
                    {drag && over?.s === si && over.f === sec.fields.length && sec.fields.length > 0 && <div className="mx-2 h-0.5 rounded-full bg-brand-500" />}
                    {!sec.fields.length && (
                      <div className={cn("rounded-lg border border-dashed p-5 text-center text-xs", drag && over?.s === si ? "border-brand-400 bg-brand-50/60 text-brand-800" : "border-slate-300 text-slate-500")}>
                        Drop fields here, or select this section and click a field type.
                      </div>
                    )}
                    {adding === si ? (
                      <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-2">
                        <div className="mb-1.5 flex items-center justify-between px-1">
                          <span className="text-xs font-medium text-slate-600">Add a field to this section</span>
                          <button type="button" aria-label="Close" onClick={() => setAdding(null)} className={iconBtn}><X className="!size-3.5" /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4">
                          {(Object.keys(TYPES) as FieldType[]).map((t) => (
                            <button key={t} type="button" title={TYPES[t][0]} onClick={() => { addField(t, { s: si, f: sec.fields.length ? sec.fields.length - 1 : null }); setAdding(null); }} className="flex items-center gap-2 rounded-md border border-transparent bg-white px-2 py-1.5 text-left text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:ring-brand-300 hover:text-slate-900">
                              <TypeIcon type={t} className="size-3.5 shrink-0 text-slate-500" />
                              <span className="truncate">{shortLabel(t)}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setAdding(si)} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-transparent py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700">
                        <Plus className="size-3.5" />Add field
                      </button>
                    )}
                  </div>
                </section>
              );
            })}
            {schema.sections.length > 0 && (
              <button type="button" className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 bg-white/50 py-3 text-sm font-semibold text-slate-500 transition-colors hover:border-brand-300 hover:bg-white hover:text-brand-700" onClick={addSection}>
                <Plus className="size-4" />Add section
              </button>
            )}
          </main>

          {/* --------------------------------------------------------- inspector */}
          {wide && (
            <aside className="min-w-0 self-start rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] xl:sticky xl:top-[9.75rem] xl:max-h-[calc(100vh-10.75rem)] xl:overflow-y-auto [scrollbar-width:thin]">
              {inspector ? <div className="p-4">{inspector}</div> : (
                <div className="flex flex-col items-center px-6 py-12 text-center">
                  <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-slate-100 text-slate-400"><MousePointerClick className="size-5" /></div>
                  <p className="text-sm font-semibold text-slate-900">Nothing selected</p>
                  <p className="mt-1 text-[13px] text-slate-500">Select a field or section to edit its settings.</p>
                </div>
              )}
            </aside>
          )}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-slate-900/50 p-4 backdrop-blur-[2px] sm:p-8" onClick={() => setPreview(false)}>
          <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-slate-50 shadow-2xl ring-1 ring-black/5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100"><Eye className="size-4" /></span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Preview</p>
                  <p className="text-xs text-slate-500">Exactly what your client sees</p>
                </div>
              </div>
              <button type="button" className={buttonStyles({ variant: "ghost", size: "sm" })} onClick={() => setPreview(false)}><X />Close</button>
            </div>
            <div className="p-4 sm:p-6"><FormRunner key={JSON.stringify(schema).length} schema={normalizeSchema(schema)} values={{}} cfg={{ formId: id ?? 0, preview: true, title }} /></div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsCard({ title, description, children }: { title: ReactNode; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <header className="border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function InspectorHead({ icon, kicker, title, onClose }: { icon: ReactNode; kicker: string; title: ReactNode; onClose: () => void }) {
  return (
    <div className="mb-1 flex items-start gap-2.5 border-b border-slate-100 pb-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100 [&_svg]:size-4">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{kicker}</p>
        <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
      </div>
      <button type="button" aria-label="Close settings" title="Close" onClick={onClose} className={iconBtn}><X /></button>
    </div>
  );
}

function Group({ title, children, icon }: { title: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-0 last:pb-0">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 [&_svg]:size-3.5">{icon}{title}</p>
      {children}
    </div>
  );
}

function CondEditor({ value, onChange, candidates }: { value: Cond; onChange: (c: Cond) => void; candidates: Field[] }) {
  return (
    <div className={cn("mt-2 rounded-lg p-2.5 ring-1 ring-inset", value ? "bg-amber-50/60 ring-amber-200" : "bg-slate-50 ring-slate-200")}>
      <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-slate-700">
        <Toggle size="sm" checked={!!value} onChange={(e) => onChange(e.target.checked ? { field: candidates[0]?.key ?? "", op: "eq", value: "" } : null)} />
        Only show if…
      </label>
      {value && (
        <div className="mt-2 grid gap-1.5">
          <select className={inp} value={value.field} onChange={(e) => onChange({ ...value, field: e.target.value })}>
            <option value="">— pick an earlier question —</option>
            {candidates.map((c) => <option key={c.key} value={c.key}>{c.label || c.key}</option>)}
          </select>
          <select className={inp} value={value.op} onChange={(e) => onChange({ ...value, op: e.target.value })}>{Object.entries(OPERATORS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          {!["filled", "empty"].includes(value.op) && (() => {
            const src = candidates.find((c) => c.key === value.field);
            const opts = src?.type === "yesno" ? ["Yes", "No"] : src?.options ?? [];
            return opts.length ? (
              <select className={inp} value={value.value} onChange={(e) => onChange({ ...value, value: e.target.value })}><option value="">—</option>{opts.map((o) => <option key={o}>{o}</option>)}</select>
            ) : <input className={inp} value={value.value} onChange={(e) => onChange({ ...value, value: e.target.value })} placeholder="value" />;
          })()}
        </div>
      )}
    </div>
  );
}

function SectionInspector({ sec, upd, candidates, onClose }: { sec: Section; upd: (p: Partial<Section>) => void; candidates: Field[]; onClose: () => void }) {
  return (
    <div>
      <InspectorHead icon={<Settings2 />} kicker="Section" title={sec.title || "Untitled section"} onClose={onClose} />
      <Group title="Basics">
        <label className={lab}>Title</label><input className={inp} value={sec.title} onChange={(e) => upd({ title: e.target.value })} />
        <label className={lab}>Description</label><input className={inp} value={sec.description} onChange={(e) => upd({ description: e.target.value })} />
        <label className={lab}>Accent</label>
        <select className={inp} value={sec.tone} onChange={(e) => upd({ tone: e.target.value as Section["tone"] })}>
          <option value="">None</option><option value="a1">Applicant 1 (indigo edge)</option><option value="a2">Applicant 2 (amber edge)</option>
        </select>
      </Group>
      <Group title="Logic" icon={<GitBranch />}>
        <CondEditor value={sec.show_if} onChange={(c) => upd({ show_if: c })} candidates={candidates} />
      </Group>
    </div>
  );
}

function FieldInspector({ f, upd, candidates, allKeys: used, onClose }: { f: Field; upd: (p: Partial<Field>) => void; candidates: Field[]; allKeys: Set<string>; onClose: () => void }) {
  const [keyDraft, setKeyDraft] = useState(f.key);
  const subs = f.fields || [];
  const setSubs = (x: Field[]) => upd({ fields: x });
  return (
    <div>
      <InspectorHead icon={<TypeIcon type={f.type} />} kicker="Field settings" title={f.label || "(no label)"} onClose={onClose} />
      <Group title="Basics">
        <label className={lab}>Field type</label>
        <select className={inp} value={f.type} onChange={(e) => {
          const t = e.target.value as FieldType;
          upd({ type: t, options: ["select", "radio", "checkbox"].includes(t) ? (f.options.length ? f.options : ["Option 1", "Option 2"]) : [], ...(t === "repeater" && !f.fields ? { fields: [blankSub("text", "Item")], add_label: "Add another", max_rows: 10 } : {}) });
        }}>{(Object.keys(TYPES) as FieldType[]).map((t) => <option key={t} value={t}>{TYPES[t][0]}</option>)}</select>
        <label className={lab}>{f.type === "info" ? "Heading" : "Label"}</label><input className={inp} value={f.label} onChange={(e) => upd({ label: e.target.value })} />
        {f.type === "info" && <><label className={lab}>Text</label><textarea rows={4} className={inp} value={f.content || ""} onChange={(e) => upd({ content: e.target.value })} /></>}
        {f.type !== "info" && (
          <label className="mt-3.5 flex cursor-pointer items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[13px] font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
            Required
            <Toggle size="sm" checked={!!f.required} onChange={(e) => upd({ required: e.target.checked ? 1 : 0 })} />
          </label>
        )}
        <label className={lab}>Width</label>
        <div className="grid grid-cols-3 gap-0.5 rounded-lg bg-slate-100 p-0.5" role="radiogroup" aria-label="Width">
          {(["full", "half", "third"] as const).map((w) => (
            <button key={w} type="button" role="radio" aria-checked={f.width === w} onClick={() => upd({ width: w })} className={cn("rounded-md py-1 text-xs font-medium transition-colors", f.width === w ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}>
              {WIDTH_LABEL[w]}
            </button>
          ))}
        </div>
      </Group>
      {!NOOPT.includes(f.type) && (
        <Group title="Options">
          <label className={lab}>Options (one per line)</label>
          <textarea rows={5} className={inp} value={f.options.join("\n")} onChange={(e) => upd({ options: e.target.value.split("\n") })} onBlur={(e) => upd({ options: e.target.value.split("\n").map((x) => x.trim()).filter(Boolean) })} />
        </Group>
      )}
      {f.type !== "info" && (
        <Group title="Input & help">
          {!["info", "repeater", "checkbox", "radio", "yesno"].includes(f.type) && <><label className={lab}>Placeholder</label><input className={inp} value={f.placeholder} onChange={(e) => upd({ placeholder: e.target.value })} /></>}
          {!["info", "repeater", "signature"].includes(f.type) && <><label className={lab}>Default value</label><input className={inp} value={f.default} onChange={(e) => upd({ default: e.target.value })} /></>}
          {(f.type === "number" || f.type === "currency") && (
            <div className="grid grid-cols-2 gap-2">
              <div><label className={lab}>Min</label><input className={inp} type="number" value={f.min} onChange={(e) => upd({ min: e.target.value === "" ? "" : Number(e.target.value) })} /></div>
              <div><label className={lab}>Max</label><input className={inp} type="number" value={f.max} onChange={(e) => upd({ max: e.target.value === "" ? "" : Number(e.target.value) })} /></div>
            </div>
          )}
          <label className={lab}>Help text</label><input className={inp} value={f.help} onChange={(e) => upd({ help: e.target.value })} />
        </Group>
      )}
      {f.type === "repeater" && (
        <Group title="Columns">
          <div className="mt-2 space-y-2">
            {subs.map((sf, i) => (
              <div key={i} className="rounded-lg bg-slate-50 p-2 ring-1 ring-inset ring-slate-200">
                <div className="flex items-center gap-1.5">
                  <input className={inp} value={sf.label} placeholder="Label" onChange={(e) => setSubs(subs.map((x, j) => (j === i ? { ...x, label: e.target.value, key: keyFrom(e.target.value) || x.key } : x)))} />
                  <button type="button" aria-label="Remove column" title="Remove column" className={cn(iconBtn, "shrink-0 hover:bg-red-50 hover:text-red-600")} onClick={() => setSubs(subs.filter((_, j) => j !== i))}><X className="!size-3.5" /></button>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <select className={cn(inp, "min-w-0 flex-1")} value={sf.type} onChange={(e) => setSubs(subs.map((x, j) => (j === i ? { ...x, type: e.target.value as FieldType } : x)))}>{SUBTYPES.map((t) => <option key={t} value={t}>{TYPES[t][0]}</option>)}</select>
                  <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-[11px] text-slate-600"><Toggle size="sm" checked={!!sf.required} onChange={(e) => setSubs(subs.map((x, j) => (j === i ? { ...x, required: e.target.checked ? 1 : 0 } : x)))} /> required</label>
                </div>
                {sf.type === "select" && <input className={cn(inp, "mt-1.5")} placeholder="Options, comma separated" value={sf.options.join(", ")} onChange={(e) => setSubs(subs.map((x, j) => (j === i ? { ...x, options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) } : x)))} />}
              </div>
            ))}
          </div>
          <button type="button" className={buttonStyles({ variant: "ghost", size: "xs", className: "mt-2 !text-brand-700" })} onClick={() => setSubs([...subs, blankSub("text", `Column ${subs.length + 1}`)])}><Plus />Add column</button>
          <label className={lab}>“Add” button label</label><input className={inp} value={f.add_label || ""} onChange={(e) => upd({ add_label: e.target.value })} />
          <label className={lab}>Max rows</label><input className={inp} type="number" min={1} max={30} value={f.max_rows ?? 10} onChange={(e) => upd({ max_rows: Math.max(1, Math.min(30, Number(e.target.value) || 10)) })} />
        </Group>
      )}
      <Group title="Data" icon={<Link2 />}>
        {!["info", "repeater"].includes(f.type) && (
          <><label className={lab}>Link to case record</label>
            <select className={inp} value={f.map} onChange={(e) => upd({ map: e.target.value })}>{Object.entries(CASE_MAP_OPTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></>
        )}
        <label className={lab}>Field key</label>
        <input className={cn(inp, "font-mono !text-xs")} value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} onBlur={() => {
          const k = keyFrom(keyDraft) || f.key;
          if (k === f.key) return setKeyDraft(f.key);
          const u = new Set(used); u.delete(f.key);
          const nk = uniq(k, u);
          setKeyDraft(nk); upd({ key: nk });
        }} />
      </Group>
      <Group title="Logic" icon={<GitBranch />}>
        <CondEditor value={f.show_if} onChange={(c) => upd({ show_if: c })} candidates={candidates} />
      </Group>
    </div>
  );
}
