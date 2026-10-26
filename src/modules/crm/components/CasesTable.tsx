"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { BellOff, BellRing, ChevronRight, FolderSearch, Lock } from "lucide-react";
import { Avatar, Badge, EmptyState, buttonStyles, checkboxStyles, cn, selectStyles, tableCls } from "@/components/admin/ui";
import { bulkStatusAction, setStatusAction } from "../actions";
import { STATUS_OPTIONS } from "../constants";
import { Toaster, toast } from "./Toast";
import { chipTone } from "./ui";

export type CaseRow = {
  id: number; title: string; status: string; stageLabel: string; stageColor: string;
  docsTotal: number; docsDone: number; docsRejected: number; docsPct: number;
  ffLabel: string; ffTone: string; created: string; names: string;
  // display-only extras
  stage?: string; email?: string; loan?: number; docsPending?: number;
  updated?: string; lastChase?: string; chaseCount?: number; chasePaused?: boolean; portalClosed?: boolean;
};

const aud = (n: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n || 0);
const STATUS_DOT: Record<string, string> = { active: "bg-emerald-500", completed: "bg-sky-500", archive: "bg-slate-400", unsuccessful: "bg-red-500" };

/** Stage pill tinted with the (data-driven) stage colour. */
export function StagePill({ label, color, className }: { label: string; color: string; className?: string }) {
  return (
    <span className={cn("inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium text-slate-700", className)}
      style={{ background: `${color}14`, boxShadow: `inset 0 0 0 1px ${color}40` }}>
      <span className="size-1.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="truncate">{label}</span>
    </span>
  );
}

function DocsCell({ r }: { r: CaseRow }) {
  if (!r.docsTotal) return <span className="text-xs text-slate-400">No checklist</span>;
  const done = r.docsPct >= 100;
  return (
    <div className="min-w-[110px]">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-slate-700 tabular-nums">{r.docsDone}/{r.docsTotal}</span>
        {r.docsRejected ? <span className="font-medium text-red-600">{r.docsRejected} rejected</span> : <span className="text-slate-400 tabular-nums">{r.docsPct}%</span>}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
        <i className={cn("block h-full rounded-full", done ? "bg-emerald-500" : r.docsRejected ? "bg-red-400" : "bg-brand-500")} style={{ width: `${Math.max(r.docsPct, r.docsPct ? 4 : 0)}%` }} />
      </div>
    </div>
  );
}

function ChaseLine({ r }: { r: CaseRow }) {
  if (r.chasePaused) return <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-slate-400"><BellOff className="size-3" /> Reminders paused</span>;
  if (r.chaseCount) return <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-slate-500" title={`Last reminder ${r.lastChase}`}><BellRing className="size-3 text-brand-500" /> Chased {r.chaseCount}×{r.lastChase ? ` · ${r.lastChase}` : ""}</span>;
  return null;
}

export default function CasesTable({ rows, viewing }: { rows: CaseRow[]; viewing: string }) {
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [cur, setCur] = useState<Record<number, string>>(() => Object.fromEntries(rows.map((r) => [r.id, r.status])));
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [bulk, setBulk] = useState("");
  const [pending, start] = useTransition();

  function change(id: number, slug: string) {
    const prev = cur[id];
    setCur((c) => ({ ...c, [id]: slug }));
    start(async () => {
      const r = await setStatusAction(id, slug);
      if (!r.ok) { setCur((c) => ({ ...c, [id]: prev })); alert("Could not change the status."); return; }
      if (viewing && viewing !== slug) setTimeout(() => setHidden((h) => new Set(h).add(id)), 500);
    });
  }
  function applyBulk() {
    if (!bulk || !sel.size) return;
    start(async () => {
      const r = await bulkStatusAction([...sel], bulk);
      toast(`${r.n ?? 0} case(s) moved to ${STATUS_OPTIONS[bulk]}.`);
      setSel(new Set());
    });
  }
  const visible = rows.filter((r) => !hidden.has(r.id));
  const allOn = sel.size > 0 && sel.size === visible.length;
  const toggleAll = (on: boolean) => setSel(on ? new Set(visible.map((r) => r.id)) : new Set());
  const toggleOne = (id: number, on: boolean) => setSel((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n; });

  const th = (extra = "") => cn(tableCls.th.replace("px-4", "px-3 first:pl-4 last:pr-4"), extra);
  const td = (extra = "") => cn(tableCls.td.replace("px-4", "px-3 first:pl-4 last:pr-4"), extra);

  const statusSelect = (r: CaseRow, cls = "") => (
    <div className={cn("relative", cls)}>
      <span className={cn("pointer-events-none absolute left-2.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full", STATUS_DOT[cur[r.id]] ?? "bg-slate-400")} />
      <select aria-label="Case status" value={cur[r.id]} disabled={pending} onChange={(e) => change(r.id, e.target.value)}
        className={cn(selectStyles, "h-8 min-w-[118px] py-0 pl-6 text-[13px] font-medium")}>
        {Object.entries(STATUS_OPTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </div>
  );

  return (
    <div className={tableCls.wrap}>
      <Toaster />
      {/* bulk bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 px-3 py-2.5 sm:px-4">
        <label className="mr-1 flex items-center gap-2 text-[13px] font-medium text-slate-600 md:hidden">
          <input type="checkbox" className={checkboxStyles} checked={allOn} onChange={(e) => toggleAll(e.target.checked)} /> All
        </label>
        <select aria-label="Bulk actions" value={bulk} onChange={(e) => setBulk(e.target.value)} className={cn(selectStyles, "h-8 !w-auto min-w-0 flex-1 py-0 text-[13px] sm:flex-none")}>
          <option value="">Bulk actions</option>
          <option value="completed">Mark as Completed</option>
          <option value="archive">Move to Archive</option>
          <option value="unsuccessful">Mark as Closed / unsuccessful</option>
          <option value="active">Mark as Active</option>
        </select>
        <button type="button" disabled={pending || !bulk || !sel.size} onClick={applyBulk} className={buttonStyles({ variant: "secondary", size: "sm" })}>Apply</button>
        {sel.size > 0 && <Badge tone="brand">{sel.size} selected</Badge>}
        <span className="ml-auto text-xs font-medium text-slate-500 tabular-nums">{visible.length} {visible.length === 1 ? "case" : "cases"}</span>
      </div>

      {!visible.length ? (
        <EmptyState className="m-4 border-slate-200" icon={<FolderSearch />} title="No cases found" description="Try another status or stage, or clear the search to see every case." />
      ) : (
        <>
          {/* desktop table */}
          <table className={cn(tableCls.table, "hidden md:table")}>
            <thead className={tableCls.thead}>
              <tr>
                <th className={th("w-10 pr-0")}><input type="checkbox" aria-label="Select all" className={checkboxStyles} checked={allOn} onChange={(e) => toggleAll(e.target.checked)} /></th>
                <th className={th()}>Client</th>
                <th className={th()}>Stage</th>
                <th className={th()}>Status</th>
                <th className={th()}>Documents</th>
                <th className={th()}>Fact Find</th>
                <th className={th("text-right")}>Loan</th>
                <th className={th()}>Last activity</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className={cn(tableCls.tr, sel.has(r.id) && "bg-brand-50/40")}>
                  <td className={td("pr-0")}><input type="checkbox" aria-label={`Select case ${r.id}`} className={checkboxStyles} checked={sel.has(r.id)} onChange={(e) => toggleOne(r.id, e.target.checked)} /></td>
                  <td className={td("max-w-[264px]")}>
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={r.names || r.title} />
                      <div className="min-w-0">
                        <Link href={`/admin/cases/${r.id}`} className="block truncate font-semibold text-slate-900 hover:text-brand-700">{r.names || r.title}</Link>
                        <p className="truncate text-xs text-slate-500" title={r.title}>
                          <span className="font-medium text-slate-400 tabular-nums">#{r.id}</span>{r.names ? <> · {r.title}</> : r.email ? <> · {r.email}</> : null}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={td()}><StagePill label={r.stageLabel} color={r.stageColor} /></td>
                  <td className={td()}>{statusSelect(r)}</td>
                  <td className={td()}>
                    <DocsCell r={r} />
                    <div className="mt-1"><ChaseLine r={r} /></div>
                  </td>
                  <td className={td()}><Badge tone={chipTone(r.ffTone)} dot>{r.ffLabel}</Badge></td>
                  <td className={td("text-right font-medium text-slate-900 tabular-nums")}>{r.loan ? aud(r.loan) : <span className="font-normal text-slate-400">—</span>}</td>
                  <td className={td()}>
                    <div className="whitespace-nowrap text-[13px] text-slate-700">{r.updated || "—"}</div>
                    <div className="whitespace-nowrap text-xs text-slate-400" title={`Published ${r.created}`}>Created {r.created.split(",")[0]}</div>
                    {r.portalClosed && <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-400"><Lock className="size-3" /> Portal closed</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* mobile cards */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {visible.map((r) => (
              <li key={r.id} className={cn("p-4", sel.has(r.id) && "bg-brand-50/40")}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" aria-label={`Select case ${r.id}`} className={cn(checkboxStyles, "mt-2.5")} checked={sel.has(r.id)} onChange={(e) => toggleOne(r.id, e.target.checked)} />
                  <Link href={`/admin/cases/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={r.names || r.title} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">{r.names || r.title}</p>
                      <p className="truncate text-xs text-slate-500"><span className="tabular-nums">#{r.id}</span> · {r.names ? r.title : `Created ${r.created.split(",")[0]}`}</p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-slate-400" />
                  </Link>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5 pl-7">
                  <StagePill label={r.stageLabel} color={r.stageColor} />
                  <Badge tone={chipTone(r.ffTone)} dot>FF: {r.ffLabel}</Badge>
                  {r.loan ? <span className="ml-auto text-sm font-semibold text-slate-900 tabular-nums">{aud(r.loan)}</span> : null}
                </div>
                <div className="mt-3 space-y-3 pl-7">
                  <DocsCell r={r} />
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 space-y-0.5 overflow-hidden text-xs text-slate-400">
                      <p className="truncate">Updated {r.updated || "—"}</p>
                      <ChaseLine r={r} />
                    </div>
                    {statusSelect(r, "w-[140px] shrink-0")}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
