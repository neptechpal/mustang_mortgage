"use client";
// Interactive pieces of the case screen (case-ui.js, admin.inline.js, forms box).
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Ban, BellRing, Check, ChevronDown, ClipboardCheck, Copy, Download, ExternalLink, Eye, EyeOff, FileText, Library, Link2,
  ListChecks, Loader2, Lock, LockOpen, Mail, Paperclip, Plus, RefreshCw, Save, Send, Trash2, Upload, X,
} from "lucide-react";
import {
  Avatar, Badge, buttonStyles, checkboxStyles, cn, inputStyles, labelStyles, selectStyles, textareaStyles, type Tone,
} from "@/components/admin/ui";
import {
  adminReplyAction, applyPresetAction, chaseNowAction, insertTemplateAction, pauseChaseAction, portalToggleAction, removeDocFileAction,
  resetTokenAction, saveApplicantsAction, saveChecklistAction, saveDealAction, savePortalSectionsAction, sendEmailAction, sendFormAction,
  sendPortalLinkAction, setStageAction, setStatusAction, unassignFormAction,
} from "../actions";
import { toast } from "./Toast";
import { chipTone } from "./ui";

const btn = buttonStyles({ variant: "secondary", size: "sm" });
const btnP = buttonStyles({ variant: "primary", size: "sm" });
const btnXs = buttonStyles({ variant: "secondary", size: "xs" });
const ghostXs = buttonStyles({ variant: "ghost", size: "xs" });
const inp = inputStyles;
const lab = labelStyles;

async function copy(txt: string) {
  try {
    await navigator.clipboard.writeText(txt);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = txt;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch { /* */ }
    ta.remove();
  }
}

/** Accessible on/off switch wrapping a real checkbox. */
function Switch({ checked, onChange, disabled, label, title }: { checked: boolean; onChange: (on: boolean) => void; disabled?: boolean; label: ReactNode; title?: string }) {
  return (
    <label title={title} className={cn("inline-flex cursor-pointer select-none items-center gap-2 text-[13px] font-medium text-slate-700", disabled && "cursor-not-allowed opacity-60")}>
      <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className={cn("relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/40", checked ? "bg-brand-600" : "bg-slate-300")}>
        <span className={cn("absolute left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform", checked && "translate-x-4")} />
      </span>
      {label}
    </label>
  );
}

/* ======================= tabs ======================= */
export type CaseTab = { id: string; label: string; badge?: number; count?: number; icon?: ReactNode; content: ReactNode };
export function CaseTabs({ tabs }: { tabs: CaseTab[] }) {
  const [cur, setCur] = useState(tabs[0]?.id);
  useEffect(() => {
    const h = location.hash.replace("#", "");
    let start = h.startsWith("tab-") ? h.slice(4) : "";
    // Deep links to an anchor inside a tab (e.g. #mmcrm_notes_reminders) open that tab first.
    const target = !start && h ? document.getElementById(h) : null;
    if (target) start = target.closest<HTMLElement>("[role=tabpanel]")?.dataset.tab ?? "";
    if (!start) try { start = localStorage.getItem("mmcaseTab") || ""; } catch { /* */ }
    if (start && tabs.some((t) => t.id === start)) setCur(start);
    if (target) setTimeout(() => window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 128 }), 60);
  }, [tabs]);
  function show(id: string) {
    setCur(id);
    try { localStorage.setItem("mmcaseTab", id); } catch { /* */ }
    history.replaceState(null, "", "#tab-" + id);
  }
  return (
    <div>
      <div className="sticky top-16 z-10 -mx-4 mb-6 bg-canvas/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-canvas/75 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div role="tablist" aria-label="Case sections" className="flex gap-1 overflow-x-auto border-b border-slate-200 [scrollbar-width:none]">
          {tabs.map((t) => {
            const on = cur === t.id;
            return (
              <button key={t.id} type="button" role="tab" aria-selected={on} onClick={() => show(t.id)}
                className={cn(
                  "-mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors [&_svg]:size-4",
                  on ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
                )}>
                {t.icon && <span className={on ? "text-brand-600" : "text-slate-400"}>{t.icon}</span>}
                {t.label}
                {t.badge ? (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-amber-800 tabular-nums" title="Needs attention">{t.badge}</span>
                ) : t.count ? (
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none tabular-nums", on ? "bg-brand-100 text-brand-800" : "bg-slate-100 text-slate-600")}>{t.count}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
      {tabs.map((t) => <div key={t.id} id={`panel-${t.id}`} data-tab={t.id} hidden={t.id !== cur} role="tabpanel" className="space-y-6">{t.content}</div>)}
    </div>
  );
}

/* ======================= header ======================= */
/** Stage picker shown in the case header (#mmcase-stage). */
export function StageSelect({ caseId, stage: initial, stages, colors }: { caseId: number; stage: string; stages: Record<string, string>; colors: Record<string, string> }) {
  const [stage, setStage] = useState(initial);
  const [pending, start] = useTransition();
  const col = colors[stage] ?? "#94a3b8";
  return (
    <div className="min-w-0">
      <label htmlFor="mmcase-stage" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Stage</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 size-2.5 -translate-y-1/2 rounded-full" style={{ background: col, boxShadow: `0 0 0 3px ${col}2e` }} />
        <select id="mmcase-stage" value={stage} disabled={pending}
          className={cn(selectStyles, "h-10 w-full py-0 pl-8 font-semibold sm:min-w-[230px]")}
          style={{ borderColor: `${col}80` }}
          onChange={(e) => {
            const v = e.target.value;
            setStage(v);
            start(async () => { const r = await setStageAction(caseId, v); toast(r.ok ? "Stage updated" : "Could not update stage", !r.ok); });
          }}>
          {Object.entries(stages).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
    </div>
  );
}

export function CaseHeaderControls(p: {
  caseId: number; link: string; closed: boolean; paused: boolean;
  chaseDisabled: boolean; lastChase: string; chaseCount: number; zipUrl: string;
}) {
  const [closed, setClosed] = useState(p.closed);
  const [paused, setPaused] = useState(p.paused);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        {!closed && p.link && (
          <>
            <button type="button" className={btn} onClick={() => copy(p.link).then(() => toast("Portal link copied"))}><Copy /> Copy portal link</button>
            <a className={btn} href={p.link} target="_blank" rel="noopener"><ExternalLink /> Preview portal</a>
          </>
        )}
        <button type="button" className={btn} disabled={pending || p.chaseDisabled} title={p.chaseDisabled ? "Nothing outstanding to chase" : "Email the client about everything still outstanding"}
          onClick={() => {
            if (!confirm("Email this client a reminder about everything still outstanding?")) return;
            start(async () => { const r = await chaseNowAction(p.caseId); toast(r.ok ? "Reminder sent ✓" : r.error || "Could not send", !r.ok); router.refresh(); });
          }}><BellRing /> Send reminder</button>
        <button type="button" className={cn(btn, closed && "!border-amber-300 !bg-amber-50 !text-amber-800 hover:!bg-amber-100")} disabled={pending} title="Stop or allow the client to open their portal link"
          onClick={() => {
            if (!closed && !confirm("Close the client portal? Their link will stop working until you re-open it.")) return;
            start(async () => {
              const r = await portalToggleAction(p.caseId, closed);
              if (r.ok) { setClosed(!closed); toast(closed ? "Client portal re-opened" : "Client portal closed"); router.refresh(); } else toast("Could not change the portal", true);
            });
          }}>{closed ? <><LockOpen /> Portal closed — re-open</> : <><Lock /> Close portal</>}</button>
        <a className={btn} href={p.zipUrl}><Download /> Download ZIP</a>
        <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" aria-hidden />
        <Switch title={`Automatic reminders are ${paused ? "paused" : "on"} for this case`} checked={!paused} label="Auto-remind"
          onChange={(on) => {
            setPaused(!on);
            start(async () => { await pauseChaseAction(p.caseId, !on); toast(on ? "Auto-reminders on" : "Auto-reminders paused"); });
          }} />
      </div>
      {p.lastChase && (
        <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <BellRing className="size-3.5 text-slate-400" /> Last reminder {p.lastChase} · {p.chaseCount} sent
        </p>
      )}
    </div>
  );
}

/* ======================= sidebar: status / deal / visibility ======================= */
const STATUS_TONE: Record<string, [string, string]> = {
  active: ["bg-emerald-500", "Work in progress"],
  completed: ["bg-sky-500", "Settled & done"],
  archive: ["bg-slate-400", "Parked for later"],
  unsuccessful: ["bg-red-500", "Closes the client portal"],
};
export function StatusBox({ caseId, status, options }: { caseId: number; status: string; options: Record<string, string> }) {
  const [cur, setCur] = useState(status);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="grid gap-2">
      {Object.entries(options).map(([k, v]) => {
        const on = cur === k;
        return (
          <label key={k} className={cn(
            "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
            on ? "border-brand-300 bg-brand-50/60 ring-1 ring-brand-200" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
          )}>
            <input type="radio" name="case_status" className="size-4 accent-brand-600" checked={on} disabled={pending} onChange={() => {
              setCur(k);
              start(async () => {
                const r = await setStatusAction(caseId, k);
                toast(r.ok ? `Status: ${v}${r.portal_closed ? " — portal closed" : ""}` : "Could not change the status.", !r.ok);
                router.refresh();
              });
            }} />
            <span className={cn("size-2 shrink-0 rounded-full", STATUS_TONE[k]?.[0] ?? "bg-slate-400")} />
            <span className="min-w-0 flex-1">
              <span className={cn("block font-medium", on ? "text-slate-900" : "text-slate-700")}>{v}</span>
              {STATUS_TONE[k] && <span className="block text-xs text-slate-500">{STATUS_TONE[k][1]}</span>}
            </span>
            {on && <Check className="size-4 text-brand-600" />}
          </label>
        );
      })}
    </div>
  );
}

export function PortalSections({ caseId, ff, docs }: { caseId: number; ff: boolean; docs: boolean }) {
  const [a, setA] = useState(ff);
  const [b, setB] = useState(docs);
  const [pending, start] = useTransition();
  const save = (x: boolean, y: boolean) => start(async () => { await savePortalSectionsAction(caseId, x, y); toast("Portal sections saved"); });
  const row = (icon: ReactNode, title: string, desc: string, on: boolean, set: (v: boolean) => void) => (
    <div className="flex items-center gap-3 py-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 [&_svg]:size-4">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800">{title}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
      <Switch checked={on} disabled={pending} label={<span className="sr-only">{title}</span>} onChange={set} />
    </div>
  );
  return (
    <div>
      <p className="mb-1 text-xs text-slate-500">Choose which sections the client sees on their portal.</p>
      <div className="divide-y divide-slate-100">
        {row(<ClipboardCheck />, "Fact Find", "Client can complete the fact find", a, (v) => { setA(v); save(v, b); })}
        {row(<Paperclip />, "Documents", "Client can upload checklist documents", b, (v) => { setB(v); save(a, v); })}
      </div>
    </div>
  );
}

export function DealBox({ caseId, loanType, loanAmount }: { caseId: number; loanType: string; loanAmount: number | null }) {
  const [pending, start] = useTransition();
  return (
    <form className="grid gap-3" action={(fd) => start(async () => { const r = await saveDealAction(caseId, fd); toast(r.ok ? "Saved" : "Could not save", !r.ok); })}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <div><label className={lab} htmlFor="mm-loanType">Loan type</label>
          <select id="mm-loanType" name="loanType" defaultValue={loanType} className={selectStyles}>
            <option value="">—</option><option value="purchase">Purchase</option><option value="refinance">Refinance</option><option value="investment">Investment</option><option value="construction">Construction</option>
          </select></div>
        <div><label className={lab} htmlFor="mm-loanAmount">Loan amount</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
            <input id="mm-loanAmount" name="loanAmount" defaultValue={loanAmount ?? ""} inputMode="decimal" className={cn(inp, "pl-7 tabular-nums")} />
          </div></div>
      </div>
      <div><button className={btn} disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Save />} Save</button></div>
    </form>
  );
}

/* ======================= applicants & portal link ======================= */
type Apps = { title: string; app1Name: string; app1Email: string; app1Mobile: string; app1Dob: string; app2Name: string; app2Email: string; app2Mobile: string; app2Dob: string };
export function ApplicantsBox({ caseId, apps, link, closed }: { caseId: number; apps: Apps; link: string; closed: boolean }) {
  const [pending, start] = useTransition();
  const [dirty, setDirty] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const submit = () => formRef.current?.requestSubmit();
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); submit(); } };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, []);
  const A = (n: 1 | 2) => {
    const name = apps[`app${n}Name`];
    return (
      <fieldset className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
        <legend className="sr-only">Applicant {n}</legend>
        <div className="mb-3 flex items-center gap-2.5">
          {name ? <Avatar name={name} size="sm" /> : <span className="flex size-7 items-center justify-center rounded-full border border-dashed border-slate-300 text-[11px] font-semibold text-slate-400">{n}</span>}
          <h4 className="text-[13px] font-semibold text-slate-900">Applicant {n}</h4>
          {n === 2 && <span className="text-xs text-slate-400">optional</span>}
        </div>
        <div className="grid gap-3">
          <div><label className={lab} htmlFor={`app${n}Name`}>Full name</label><input id={`app${n}Name`} name={`app${n}Name`} defaultValue={apps[`app${n}Name`]} className={inp} /></div>
          <div><label className={lab} htmlFor={`app${n}Email`}>Email</label><input id={`app${n}Email`} type="email" name={`app${n}Email`} defaultValue={apps[`app${n}Email`]} className={inp} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lab} htmlFor={`app${n}Mobile`}>Mobile</label><input id={`app${n}Mobile`} type="tel" name={`app${n}Mobile`} defaultValue={apps[`app${n}Mobile`]} className={inp} /></div>
            <div><label className={lab} htmlFor={`app${n}Dob`}>Date of birth</label><input id={`app${n}Dob`} type="date" name={`app${n}Dob`} defaultValue={apps[`app${n}Dob`]} className={inp} /></div>
          </div>
        </div>
      </fieldset>
    );
  };
  return (
    <div>
      <form ref={formRef} onChange={() => setDirty(true)} action={(fd) => start(async () => { const r = await saveApplicantsAction(caseId, fd); toast(r.ok ? "Case saved." : r.error || "Error", !r.ok); setDirty(false); router.refresh(); })}>
        <div className="mb-4"><label className={lab} htmlFor="mm-case-title">Case title</label><input id="mm-case-title" name="title" defaultValue={apps.title} className={inp} /></div>
        <div className="grid gap-4 md:grid-cols-2">{A(1)}{A(2)}</div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className={btnP} disabled={pending}>{pending ? <><Loader2 className="animate-spin" /> Saving…</> : <><Save /> Save changes</>}</button>
          <span className="hidden items-center gap-1 text-xs text-slate-400 sm:inline-flex"><kbd className="rounded border border-slate-200 bg-white px-1 font-sans text-[10px]">⌘</kbd><kbd className="rounded border border-slate-200 bg-white px-1 font-sans text-[10px]">S</kbd> to save</span>
          {dirty && <Badge tone="warning" dot>Unsaved changes</Badge>}
        </div>
      </form>
      <div className="mt-6 border-t border-slate-100 pt-5">
        <div className="mb-3 flex items-center gap-2">
          <Link2 className="size-4 text-slate-400" />
          <h4 className="text-sm font-semibold text-slate-900">Client portal link</h4>
          {closed ? <Badge tone="danger" dot>Disabled</Badge> : <Badge tone="success" dot>Active</Badge>}
        </div>
        {closed ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-red-100 bg-red-50/60 px-4 py-3">
            <p className="flex-1 text-sm text-red-900">Link is <strong>disabled</strong>. Clients cannot access the portal.</p>
            <button type="button" className={btnP} onClick={() => start(async () => { await portalToggleAction(caseId, true); toast("Client portal re-opened"); router.refresh(); })}><LockOpen /> Enable link</button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input readOnly value={link} aria-label="Client portal link" className={cn(inp, "min-w-0 flex-1 bg-slate-50 font-mono text-xs text-slate-600")} onFocus={(e) => e.target.select()} />
              <button type="button" className={btnP} onClick={() => copy(link).then(() => toast("Copied"))}><Copy /> Copy</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <a className={ghostXs} href={link} target="_blank" rel="noopener"><ExternalLink /> Open</a>
              <button type="button" className={ghostXs} onClick={() => { if (confirm("Disable this client link? They will no longer be able to open the portal.")) start(async () => { await portalToggleAction(caseId, false); toast("Client portal closed"); router.refresh(); }); }}><Ban /> Disable link</button>
              <button type="button" className={ghostXs} title="Old links stop working" onClick={() => { if (confirm("Generate a new secret link? The current link will stop working.")) start(async () => { await resetTokenAction(caseId); toast("New portal link generated"); router.refresh(); }); }}><RefreshCw /> Reset link</button>
            </div>
          </div>
        )}
      </div>
      {dirty && (
        <div className="fixed bottom-5 right-5 z-40">
          <button type="button" onClick={submit} className={buttonStyles({ variant: "primary", size: "lg", className: "shadow-xl ring-4 ring-brand-500/15" })}><Save /> Save changes</button>
        </div>
      )}
    </div>
  );
}

/* ======================= document checklist ======================= */
export type DocFile = { key: string; name: string; viewUrl: string; dlUrl: string; by?: string };
export type DocRow = { id?: number; label: string; status: string; note: string; files: DocFile[]; tmp?: string };

const DOC_TONE: Record<string, { tone: Tone; sel: string; dot: string }> = {
  Pending: { tone: "warning", sel: "!border-amber-200 !bg-amber-50 !text-amber-800", dot: "bg-amber-500" },
  Received: { tone: "info", sel: "!border-sky-200 !bg-sky-50 !text-sky-800", dot: "bg-sky-500" },
  Accepted: { tone: "success", sel: "!border-emerald-200 !bg-emerald-50 !text-emerald-800", dot: "bg-emerald-500" },
  Rejected: { tone: "danger", sel: "!border-red-200 !bg-red-50 !text-red-800", dot: "bg-red-500" },
};

export function ChecklistBox({ caseId, rows: init, presets }: { caseId: number; rows: DocRow[]; presets: string[] }) {
  const [rows, setRows] = useState<DocRow[]>(init);
  const [preset, setPreset] = useState(presets[0] ?? "");
  const [dirty, setDirty] = useState(false);
  const [dropOn, setDropOn] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  useEffect(() => { setRows(init); setDirty(false); }, [init]);
  const upd = (i: number, patch: Partial<DocRow>) => { setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x))); setDirty(true); };
  const pendingCount = rows.filter((r) => r.status === "Pending" || r.status === "Rejected").length;
  const counts = Object.fromEntries(Object.keys(DOC_TONE).map((k) => [k, rows.filter((r) => r.status === k).length]));
  const got = (counts.Received ?? 0) + (counts.Accepted ?? 0);
  const pct = rows.length ? Math.round((100 * got) / rows.length) : 0;
  const save = () => start(async () => {
    const r = await saveChecklistAction(caseId, rows.map(({ id, label, status, note }) => ({ id, label, status, note })));
    toast(r.ok ? "Checklist saved" : "Could not save", !r.ok);
    setDirty(false);
    router.refresh();
  });
  const upload = (docId: number, files: File[]) => {
    if (!files.length) return;
    const fd = new FormData();
    fd.append("doc_id", String(docId));
    files.forEach((f) => fd.append("files", f));
    start(async () => {
      const res = await fetch(`/api/admin/crm/cases/${caseId}/upload`, { method: "POST", body: fd }).then((x) => x.json()).catch(() => ({ ok: false, error: "Upload failed" }));
      toast(res.ok ? res.message : res.error || "Upload failed", !res.ok);
      router.refresh();
    });
  };
  const addRow = () => { setRows((r) => [...r, { label: "", status: "Pending", note: "", files: [], tmp: Math.random().toString(36) }]); setDirty(true); };

  return (
    <div>
      {/* progress summary */}
      <div className="mb-5 grid gap-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900"><span className="tabular-nums">{got} of {rows.length}</span> documents received</p>
            <span className="text-xs font-medium text-slate-500 tabular-nums">{pct}%</span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-slate-200/70">
            {(["Accepted", "Received", "Rejected"] as const).map((k) => counts[k] ? <i key={k} className={cn("block h-full", DOC_TONE[k].dot)} style={{ width: `${(100 * counts[k]) / Math.max(1, rows.length)}%` }} /> : null)}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(DOC_TONE).map(([k, t]) => <Badge key={k} tone={counts[k] ? t.tone : "neutral"} dot={!!counts[k]} className={counts[k] ? "" : "opacity-60"}><span className="tabular-nums">{counts[k]}</span> {k}</Badge>)}
        </div>
      </div>

      {presets.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-sm">
          <span className="inline-flex items-center gap-1.5 font-medium text-slate-700"><Library className="size-4 text-slate-400" /> Quick add</span>
          <select value={preset} onChange={(e) => setPreset(e.target.value)} aria-label="Checklist preset" className={cn(selectStyles, "h-8 !w-auto max-w-full py-0 text-[13px]")}>{presets.map((p) => <option key={p}>{p}</option>)}</select>
          <button type="button" className={btnXs} disabled={pending} onClick={() => {
            if (!confirm("Add this preset to the checklist? Unsaved checklist changes will be lost.")) return;
            start(async () => { const r = await applyPresetAction(caseId, [preset]); toast(r.ok ? `${r.added} documents added` : "Could not add", !r.ok); router.refresh(); });
          }}><Plus /> Add these documents</button>
          <span className="text-xs text-slate-500">Appends the preset’s documents to this checklist (duplicates are skipped).</span>
        </div>
      )}

      {!rows.length ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 px-6 py-10 text-center">
          <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-400"><ListChecks className="size-5" /></div>
          <p className="text-sm font-semibold text-slate-900">No documents requested yet</p>
          <p className="mt-1 max-w-sm text-sm text-slate-500">Use a quick-add preset above or add rows one at a time.</p>
          <button type="button" className={cn(btn, "mt-4")} onClick={addRow}><Plus /> Add Row</button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200/80">
          <div className="hidden grid-cols-[minmax(0,1.3fr)_140px_minmax(0,1fr)_minmax(0,1.4fr)_40px] gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 lg:grid">
            <span>Item</span><span>Status</span><span>Note</span><span>Files</span><span className="sr-only">Remove</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {rows.map((r, i) => {
              const t = DOC_TONE[r.status] ?? DOC_TONE.Pending;
              const canUp = !!r.id;
              return (
                <li key={r.id ?? r.tmp}
                  className={cn("grid gap-3 px-4 py-3.5 transition-colors lg:grid-cols-[minmax(0,1.3fr)_140px_minmax(0,1fr)_minmax(0,1.4fr)_40px] lg:items-start", dropOn === i ? "bg-brand-50/70" : "hover:bg-slate-50/50")}
                  onDragOver={canUp ? (e) => { if (Array.from(e.dataTransfer.types).includes("Files")) { e.preventDefault(); setDropOn(i); } } : undefined}
                  onDragLeave={canUp ? (e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropOn(null); } : undefined}
                  onDrop={canUp ? (e) => { e.preventDefault(); setDropOn(null); upload(r.id!, Array.from(e.dataTransfer.files)); } : undefined}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className={cn("size-2 shrink-0 rounded-full", t.dot)} aria-hidden />
                    <input value={r.label} placeholder="Document name…" aria-label="Item" onChange={(e) => upd(i, { label: e.target.value })}
                      className={cn(inp, "border-transparent bg-transparent px-2 font-medium shadow-none hover:border-slate-200 focus:bg-white")} />
                    <button type="button" title="Remove this item" aria-label="Remove this item" className={cn(ghostXs, "ml-auto !px-1.5 text-slate-400 hover:!text-red-600 lg:hidden")} onClick={() => { setRows((x) => x.filter((_, j) => j !== i)); setDirty(true); }}><Trash2 /></button>
                  </div>
                  <div className="pl-[18px] lg:pl-0">
                    <select value={r.status} aria-label="Status" onChange={(e) => upd(i, { status: e.target.value })} className={cn(selectStyles, "h-9 py-0 text-[13px] font-semibold", t.sel)}>
                      {["Pending", "Received", "Accepted", "Rejected"].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="pl-[18px] lg:pl-0">
                    <textarea rows={2} value={r.note} placeholder="Add a note…" aria-label="Note" onChange={(e) => upd(i, { note: e.target.value })} className={cn(inp, "resize-y py-1.5 text-[13px]")} />
                  </div>
                  <div className="min-w-0 space-y-1.5 pl-[18px] lg:pl-0">
                    {r.files.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {r.files.map((f) => (
                          <span key={f.key} className="group inline-flex max-w-full items-center gap-1 rounded-md border border-slate-200 bg-white py-1 pl-2 pr-1 text-xs shadow-[0_1px_1px_rgba(15,23,42,0.03)]">
                            <FileText className="size-3.5 shrink-0 text-slate-400" />
                            <a href={f.viewUrl} target="_blank" rel="noopener" className="max-w-[170px] truncate font-medium text-slate-700 hover:text-brand-700 hover:underline" title={f.name}>{f.name}</a>
                            <a href={f.dlUrl} title="Download" aria-label="Download" className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800"><Download className="size-3.5" /></a>
                            {r.id && <button type="button" title="Remove" aria-label="Remove" className="rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => { if (confirm("Remove file?")) start(async () => { await removeDocFileAction(caseId, r.id!, f.key); toast("File removed"); router.refresh(); }); }}><X className="size-3.5" /></button>}
                          </span>
                        ))}
                      </div>
                    )}
                    {canUp ? (
                      <label className={cn(
                        "flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-xs font-medium transition-colors",
                        dropOn === i ? "border-brand-400 bg-white text-brand-700" : "border-slate-300 text-slate-500 hover:border-brand-400 hover:text-brand-700",
                      )}>
                        <Upload className="size-3.5" /> {r.files.length ? "Upload more" : "Upload"} <span className="hidden font-normal text-slate-400 sm:inline">or drop files</span>
                        <input type="file" multiple className="hidden" onChange={(e) => {
                          const files = e.target.files;
                          if (!files?.length) return;
                          const list = Array.from(files);
                          e.target.value = "";
                          upload(r.id!, list);
                        }} />
                      </label>
                    ) : (
                      <p className="text-xs text-slate-400">{r.files.length ? "" : "No files · "}Save the checklist to enable uploads</p>
                    )}
                  </div>
                  <div className="hidden lg:block">
                    <button type="button" title="Remove this item" aria-label="Remove this item" className={cn(ghostXs, "!h-9 !px-2 text-slate-400 hover:!bg-red-50 hover:!text-red-600")} onClick={() => { setRows((x) => x.filter((_, j) => j !== i)); setDirty(true); }}><Trash2 /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {rows.length > 0 && <button type="button" className={btn} onClick={addRow}><Plus /> Add Row</button>}
        <a className={btn} href={`/api/admin/crm/cases/${caseId}/download`}><Download /> Download all files</a>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          {pendingCount > 0 && <span className="text-xs text-slate-500 tabular-nums">{pendingCount} pending / rejected</span>}
          {dirty && <Badge tone="warning" dot>Unsaved changes</Badge>}
          <button type="button" className={btnP} disabled={pending || !dirty} onClick={save}>{pending ? <><Loader2 className="animate-spin" /> Saving…</> : <><Save /> Save checklist</>}</button>
        </div>
      </div>
    </div>
  );
}

/* ======================= forms box ======================= */
export type FormRowView = { id: string; title: string; isFf: boolean; statusLabel: string; tone: string; sent: string; submitted: string; url: string; canView: boolean; answers?: ReactNode };

export function FormsBox({ caseId, rows, options, tpl }: { caseId: number; rows: FormRowView[]; options: { value: string; label: string }[]; tpl: { subject: string; body: string } }) {
  const [open, setOpen] = useState<string | null>(null);
  const [pick, setPick] = useState(options[0]?.value ?? "ff");
  const [email, setEmail] = useState(true);
  const [subject, setSubject] = useState(tpl.subject);
  const [body, setBody] = useState(tpl.body);
  const [pending, start] = useTransition();
  const router = useRouter();
  const send = (fid: string, withEmail: boolean) => start(async () => {
    const r = await sendFormAction(caseId, fid, withEmail, subject, body);
    toast(r.ok ? r.message || "Done" : r.error || "Failed", !r.ok);
    if (r.ok) router.refresh();
  });
  return (
    <div>
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/80">
        {rows.map((r) => (
          <FormItem key={r.id} r={r} open={open === r.id}
            onCopy={() => copy(r.url).then(() => toast("Link copied"))}
            onView={() => setOpen(open === r.id ? null : r.id)}
            onResend={() => { if (confirm("Email the link to the client again?")) send(r.id, true); }}
            onRemove={() => { if (confirm("Remove this form from the client’s portal?")) start(async () => { await unassignFormAction(caseId, Number(r.id)); toast("Removed"); router.refresh(); }); }}
            pending={pending} />
        ))}
      </ul>
      <div className="mt-5 rounded-xl border border-slate-200/80 bg-slate-50/60 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"><Send className="size-4 text-slate-400" /> Send a form to the client</p>
          <a href="/admin/forms" target="_blank" className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-slate-500 hover:text-brand-700">Manage forms <ExternalLink className="size-3" /></a>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Form to send" className={cn(selectStyles, "h-9 min-w-0 basis-full py-0 sm:max-w-sm sm:flex-1 sm:basis-auto")}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" className={checkboxStyles} checked={email} onChange={(e) => setEmail(e.target.checked)} /> Email the client now</label>
          <button type="button" className={btnP} disabled={pending} onClick={() => send(pick, email)}>{pending ? <Loader2 className="animate-spin" /> : <Send />} Send</button>
        </div>
        <details className="group mt-3">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-[13px] font-medium text-slate-600 hover:text-slate-900">
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" /> Customise email
          </summary>
          <div className="mt-3 space-y-3">
            <div><label className={lab}>Subject</label><input value={subject} onChange={(e) => setSubject(e.target.value)} className={inp} /></div>
            <div><label className={lab}>Message</label><textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} className={cn(textareaStyles, "font-mono text-xs")} /></div>
            <p className="text-xs text-slate-500">Merge tags: {["{{greeting_names}}", "{{form_name}}", "{{form_button}}", "{{form_url}}"].map((t) => <code key={t} className="mr-1 rounded bg-white px-1 py-0.5 text-[11px] text-slate-700 ring-1 ring-slate-200">{t}</code>)}</p>
          </div>
        </details>
      </div>
    </div>
  );
}
function FormItem({ r, open, onCopy, onView, onResend, onRemove, pending }: { r: FormRowView; open: boolean; onCopy: () => void; onView: () => void; onResend: () => void; onRemove: () => void; pending: boolean }) {
  return (
    <li className={cn(open && "bg-slate-50/40")}>
      <div className="flex flex-col gap-3 px-4 py-3.5 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-[18px]", r.isFf ? "bg-violet-50 text-violet-600" : "bg-slate-100 text-slate-500")}>{r.isFf ? <ClipboardCheck /> : <FileText />}</span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-slate-900">{r.title}</p>
              {r.isFf && <Badge tone="violet">Fact Find</Badge>}
              <Badge tone={chipTone(r.tone)} dot>{r.statusLabel}</Badge>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              <span>Sent {r.sent || "—"}</span><span className="mx-1.5 text-slate-300">·</span><span>Submitted {r.submitted || "—"}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 pl-12 md:pl-0">
          {r.canView && <button type="button" className={cn(btnXs, open && "!border-brand-300 !bg-brand-50 !text-brand-800")} onClick={onView} aria-expanded={open}>{open ? <EyeOff /> : <Eye />} View answers</button>}
          <button type="button" className={btnXs} onClick={onCopy}><Copy /> Copy link</button>
          <a className={btnXs} target="_blank" rel="noopener" href={r.url}><ExternalLink /> Open</a>
          <button type="button" className={btnXs} disabled={pending} onClick={onResend}><Mail /> Resend</button>
          {!r.isFf && <button type="button" className={cn(ghostXs, "!px-1.5 text-slate-400 hover:!bg-red-50 hover:!text-red-600")} title="Remove from client portal" aria-label="Remove from client portal" onClick={onRemove}><X /></button>}
        </div>
      </div>
      {r.canView && open && <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5">{r.answers}</div>}
    </li>
  );
}

/* ======================= email composer ======================= */
export function EmailComposer({ caseId, app1, app2, templates, placeholders, portalLink, closed }: {
  caseId: number; app1: string; app2: string; templates: { id: number; title: string }[]; placeholders: { key: string; label: string }[]; portalLink: string; closed: boolean;
}) {
  const [to, setTo] = useState([app1, app2].filter(Boolean).join(", "));
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("Update from Mustang Mortgage");
  const [body, setBody] = useState("");
  const [tpl, setTpl] = useState("");
  const [ph, setPh] = useState("");
  const [preview, setPreview] = useState(false);
  const [pending, start] = useTransition();
  const ta = useRef<HTMLTextAreaElement>(null);
  const list = useMemo(() => to.split(/[;,]/).map((x) => x.trim()).filter(Boolean), [to]);
  const toggle = (email: string, on: boolean) => {
    const set = new Map(list.map((e) => [e.toLowerCase(), e]));
    if (on) set.set(email.toLowerCase(), email); else set.delete(email.toLowerCase());
    setTo([...set.values()].join(", "));
  };
  const insertAtCursor = (token: string) => {
    const el = ta.current;
    if (!el) return setBody((b) => b + token);
    const s = el.selectionStart ?? body.length, e = el.selectionEnd ?? body.length;
    setBody(body.slice(0, s) + token + body.slice(e));
  };
  const run = (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) => start(async () => { const r = await fn(); toast(r.ok ? r.message || "Sent" : r.error || "Failed", !r.ok); });
  return (
    <div className="space-y-4 text-sm">
      <div>
        <label className={lab} htmlFor="mm_to">To</label>
        <input id="mm_to" value={to} onChange={(e) => setTo(e.target.value)} className={inp} placeholder="email1@example.com, email2@example.com" />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[["Applicant 1", app1], ["Applicant 2", app2]].filter(([, e]) => e).map(([l, e]) => {
            const on = list.some((x) => x.toLowerCase() === e.toLowerCase());
            return (
              <label key={e} className={cn("inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors", on ? "border-brand-200 bg-brand-50 text-brand-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>
                <input type="checkbox" className="size-3.5 accent-brand-600" checked={on} onChange={(ev) => toggle(e, ev.target.checked)} /> <span className="font-medium">{l}</span> <span className="opacity-70">{e}</span>
              </label>
            );
          })}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div><label className={lab}>CC <span className="font-normal text-slate-400">(comma or semicolon separated)</span></label><input value={cc} onChange={(e) => setCc(e.target.value)} className={inp} /></div>
        <div><label className={lab}>BCC <span className="font-normal text-slate-400">(comma or semicolon separated)</span></label><input value={bcc} onChange={(e) => setBcc(e.target.value)} className={inp} /></div>
      </div>
      <div><label className={lab} htmlFor="mm_sub">Subject</label><input id="mm_sub" value={subject} onChange={(e) => setSubject(e.target.value)} className={inp} /></div>
      <div className="grid gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 lg:grid-cols-2">
        <div>
          <label className={lab}>Template</label>
          <div className="flex gap-2">
            <select value={tpl} onChange={(e) => setTpl(e.target.value)} className={cn(selectStyles, "h-9 min-w-0 flex-1 py-0")}>
              <option value="">— Select a template —</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
            <button type="button" className={btn} disabled={!tpl || pending} onClick={() => start(async () => {
              const r = await insertTemplateAction(caseId, Number(tpl));
              if (r.ok) { setSubject(String(r.subject || "")); setBody(String(r.body || "")); toast("Template inserted"); } else toast(r.error || "Not found", true);
            })}>Insert</button>
          </div>
          <p className="mt-1 text-xs text-slate-500">Placeholders (e.g. <code className="text-slate-700">{"{{greeting_names}}"}</code>) are merged on insert and on send.</p>
        </div>
        <div>
          <label className={lab}>Placeholder</label>
          <div className="flex flex-wrap gap-2">
            <select value={ph} onChange={(e) => setPh(e.target.value)} className={cn(selectStyles, "h-9 min-w-0 flex-1 py-0 text-xs")}>
              <option value="">— Insert placeholder —</option>
              {placeholders.map((p) => <option key={p.key} value={p.key}>{`{{${p.key}}}`} — {p.label}</option>)}
            </select>
            <button type="button" className={btnXs + " !h-9"} onClick={() => ph && insertAtCursor(`{{${ph}}}`)}>Into Message</button>
            <button type="button" className={btnXs + " !h-9"} onClick={() => ph && setSubject((s) => s + `{{${ph}}}`)}>Into Subject</button>
          </div>
          <p className="mt-1 text-xs text-slate-500">Tip: placeholders auto-fill from the case.</p>
        </div>
      </div>
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className={cn(lab, "mb-0")}>Message <span className="font-normal text-slate-400">(HTML allowed)</span></label>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
            <button type="button" className={cn("rounded-md px-2.5 py-1", !preview ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")} onClick={() => setPreview(false)}>Edit</button>
            <button type="button" className={cn("rounded-md px-2.5 py-1", preview ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")} onClick={() => setPreview(true)}>Preview</button>
          </div>
        </div>
        {preview ? (
          <div className="min-h-[200px] rounded-lg border border-slate-200 bg-white p-4 text-sm [&_p]:mb-2" dangerouslySetInnerHTML={{ __html: body.replace(/<script[\s\S]*?<\/script>/gi, "") }} />
        ) : (
          <textarea ref={ta} value={body} onChange={(e) => setBody(e.target.value)} rows={10} className={cn(textareaStyles, "font-mono text-xs")} />
        )}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <button type="button" className={btnP} disabled={pending} onClick={() => run(() => sendEmailAction(caseId, { to, cc, bcc, subject, body }))}>{pending ? <Loader2 className="animate-spin" /> : <Send />} Send email</button>
        <button type="button" className={btn} disabled={pending} onClick={() => run(() => sendEmailAction(caseId, { to, cc, bcc, subject: "", body: "", pending: true }))}><ListChecks /> Insert pending list &amp; send</button>
        <button type="button" className={btn} disabled={pending || closed || !portalLink} onClick={() => run(() => sendPortalLinkAction(caseId, to))}><Link2 /> Send Portal Link</button>
      </div>
    </div>
  );
}

/* ======================= portal messages ======================= */
export function MessagesBox({ caseId, msgs }: { caseId: number; msgs: { id: number; by: string; text: string; when: string; name: string }[] }) {
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Start at the newest message — also when the tab is first revealed.
    const el = box.current;
    if (!el) return;
    const go = () => { el.scrollTop = el.scrollHeight; };
    go();
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { go(); io.disconnect(); } });
    io.observe(el);
    return () => io.disconnect();
  }, [msgs.length]);
  return (
    <div>
      <div ref={box} className="max-h-[340px] space-y-3 overflow-auto rounded-xl bg-slate-50/80 p-4 ring-1 ring-inset ring-slate-200/70">
        {!msgs.length ? <p className="py-6 text-center text-sm text-slate-500">No messages yet.</p> : msgs.map((m) => {
          const me = m.by === "admin";
          const who = me ? m.name || "Admin" : "Client";
          return (
            <div key={m.id} className={cn("flex items-end gap-2", me && "flex-row-reverse")}>
              <Avatar name={who} size="sm" />
              <div className={cn("max-w-[78%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm shadow-[0_1px_2px_rgba(15,23,42,0.05)]", me ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-800")}>
                {m.text}
                <div className={cn("mt-1 text-[11px]", me ? "text-white/70" : "text-slate-400")}>{who} · {m.when}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 rounded-xl border border-slate-300 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus-within:border-brand-500 focus-within:ring-3 focus-within:ring-brand-500/15">
        <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply to client…" aria-label="Reply to client" className="block w-full resize-none rounded-t-xl border-0 bg-transparent px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0" />
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-2.5 py-2">
          <span className="text-xs text-slate-400">The client sees this on their portal.</span>
          <button type="button" className={btnP} disabled={pending} onClick={() => {
            if (!text.trim()) { alert("Type a reply."); return; }
            start(async () => { const r = await adminReplyAction(caseId, text); if (r.ok) { setText(""); toast("Reply sent"); router.refresh(); } else alert("Failed to send reply"); });
          }}>{pending ? <Loader2 className="animate-spin" /> : <Send />} Send Reply</button>
        </div>
      </div>
    </div>
  );
}
