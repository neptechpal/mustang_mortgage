"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, GripVertical } from "lucide-react";
import { Avatar, buttonStyles, cn } from "@/components/admin/ui";
import { kanbanMoveAction } from "../actions";

export type KCard = { id: number; title: string; names: string; loan: number; toMm: number; stage: string; chase: string };
type Lane = [string, string, string, string, string];
const aud = (n: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n || 0);

function Board({ title, sub, lsKey, columns, lanes, tax, cards }: { title: string; sub: string; lsKey: string; columns: Record<string, string>; lanes: Record<string, Lane>; tax: "stage" | "chase"; cards: KCard[] }) {
  const [items, setItems] = useState(cards);
  const [open, setOpen] = useState(true);
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<string | null>(null);
  useEffect(() => {
    try { const v = localStorage.getItem(lsKey); if (v !== null) setOpen(v === "1"); } catch { /* */ }
  }, [lsKey]);
  function toggle() {
    setOpen((o) => { try { localStorage.setItem(lsKey, o ? "0" : "1"); } catch { /* */ } return !o; });
  }
  function drop(bucket: string) {
    setOver(null);
    if (drag == null) return;
    const id = drag;
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, [tax]: bucket } : x)));
    void kanbanMoveAction(id, tax, bucket);
  }
  const sc = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ l: false, r: false });
  const measure = useCallback(() => {
    const el = sc.current;
    if (el) setEdge({ l: el.scrollLeft > 4, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, open]);
  const nudge = (dir: 1 | -1) => sc.current?.scrollBy({ left: dir * 540, behavior: "smooth" });
  const first = Object.keys(columns)[0];
  const totalLoan = items.reduce((a, c) => a + c.loan, 0);
  return (
    <section className="mb-8 min-w-0">
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold tracking-tight text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 tabular-nums">{items.length} {items.length === 1 ? "case" : "cases"} · {aud(totalLoan)} total loans · {sub}</p>
        </div>
        {open && (edge.l || edge.r) && (
          <div className="hidden items-center gap-1 md:flex">
            <button type="button" aria-label="Scroll left" disabled={!edge.l} onClick={() => nudge(-1)} className={buttonStyles({ variant: "secondary", size: "sm", className: "!px-2" })}><ChevronLeft /></button>
            <button type="button" aria-label="Scroll right" disabled={!edge.r} onClick={() => nudge(1)} className={buttonStyles({ variant: "secondary", size: "sm", className: "!px-2" })}><ChevronRight /></button>
          </div>
        )}
        <button type="button" onClick={toggle} aria-expanded={open} className={buttonStyles({ variant: "secondary", size: "sm" })}>
          <span className={cn("size-2 rounded-full", open ? "bg-emerald-500" : "bg-amber-400")} />
          {open ? "Hide" : "Show"}
          <ChevronDown className={cn("transition-transform", !open && "-rotate-90")} />
        </button>
      </div>
      {open && (
        <div className="relative">
          {edge.l && <div className="pointer-events-none absolute inset-y-0 left-0 z-[2] w-10 bg-gradient-to-r from-canvas to-transparent" aria-hidden />}
          {edge.r && <div className="pointer-events-none absolute inset-y-0 right-0 z-[2] w-14 bg-gradient-to-l from-canvas to-transparent" aria-hidden />}
          <div ref={sc} onScroll={measure} className="-mx-1 grid auto-cols-[minmax(256px,1fr)] grid-flow-col items-start gap-3 overflow-x-auto px-1 pb-3 [scrollbar-width:thin] md:items-stretch">
            {Object.entries(columns).map(([slug, label]) => {
              const lane = lanes[slug];
              const col = items.filter((c) => (c[tax] || first) === slug);
              const loan = col.reduce((a, c) => a + c.loan, 0);
              const mm = col.reduce((a, c) => a + c.toMm, 0);
              const isOver = over === slug;
              return (
                <div key={slug} className="flex min-h-[200px] flex-col rounded-xl border border-slate-200/80 bg-slate-100/60">
                  <div className="rounded-t-xl border-b border-slate-200/70 bg-white/70 px-3 pb-2.5 pt-3">
                    <div className="flex items-center gap-2">
                      <span className="size-2.5 shrink-0 rounded-full" style={{ background: lane[4] }} />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-900">{label}</span>
                      <span className="inline-flex h-5 min-w-6 items-center justify-center rounded-full bg-slate-200/80 px-1.5 text-[11px] font-semibold text-slate-700 tabular-nums">{col.length}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500 tabular-nums">
                      <span><span className="text-slate-400">Loan</span> <span className="font-semibold text-slate-700">{aud(loan)}</span></span>
                      <span><span className="text-slate-400">To MM</span> <span className="font-semibold text-slate-700">{aud(mm)}</span></span>
                    </div>
                  </div>
                  <div
                    className="flex flex-1 flex-col gap-2 rounded-b-xl p-2 transition-colors"
                    style={isOver ? { background: lane[3], boxShadow: `inset 0 0 0 2px ${lane[4]}` } : undefined}
                    onDragOver={(e) => { e.preventDefault(); setOver(slug); }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null); }} onDrop={(e) => { e.preventDefault(); drop(slug); }}
                  >
                    {col.map((c) => (
                      <div key={c.id} draggable onDragStart={(e) => { setDrag(c.id); e.dataTransfer.setData("text/plain", String(c.id)); }} onDragEnd={() => setDrag(null)}
                        className={cn(
                          "group relative cursor-grab overflow-hidden rounded-lg border border-slate-200 bg-white p-3 pl-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition hover:-translate-y-px hover:border-slate-300 hover:shadow-md active:cursor-grabbing",
                          drag === c.id && "rotate-1 opacity-50 ring-2 ring-brand-300",
                        )}>
                        <i className="absolute inset-y-0 left-0 w-[3px]" style={{ background: lane[4] }} />
                        <div className="flex items-start gap-2.5">
                          <Avatar name={c.names || c.title} size="sm" />
                          <div className="min-w-0 flex-1">
                            <Link href={`/admin/cases/${c.id}`} draggable={false} className="block truncate text-[13px] font-semibold leading-5 text-slate-900 hover:text-brand-700">{c.names || "Client"}</Link>
                            <p className="line-clamp-2 text-xs leading-snug text-slate-500" title={c.title}>{c.title}</p>
                          </div>
                          <GripVertical className="size-4 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100" />
                        </div>
                        {(c.loan > 0 || c.toMm > 0) && (
                          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5 text-[11px] tabular-nums">
                            {c.loan > 0 && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700">Loan {aud(c.loan)}</span>}
                            {c.toMm > 0 && <span className="rounded-md bg-brand-50 px-1.5 py-0.5 font-semibold text-brand-800 ring-1 ring-inset ring-brand-100">To MM {aud(c.toMm)}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                    {!col.length && (
                      <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-slate-200 px-3 py-8 text-center text-xs text-slate-400">
                        Drop cases here
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export default function Kanban(props: { alwaysShow?: boolean; pipeline: KCard[]; lost: KCard[]; stages: Record<string, string>; chase: Record<string, string>; stageLanes: Record<string, Lane>; chaseLanes: Record<string, Lane> }) {
  return (
    <div className={props.alwaysShow ? "" : "hidden md:block"}>
      <Board title="Mustang Mortgage Pipeline" sub="active & completed" lsKey="mmcrm_kanban_open" columns={props.stages} lanes={props.stageLanes} tax="stage" cards={props.pipeline} />
      <Board title="Unsuccessful & Archive (Chasing)" sub="drag to re-prioritise follow-ups" lsKey="mmcrm_chase_open" columns={props.chase} lanes={props.chaseLanes} tax="chase" cards={props.lost} />
    </div>
  );
}
