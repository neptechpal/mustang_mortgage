"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Activity, ArrowUpRight, CalendarRange, Clock } from "lucide-react";
import { Badge, Button, checkboxStyles, cn, EmptyState, inputStyles, PageHeader } from "@/components/admin/ui";
import { signalToggle } from "../actions/signals";

export type BoardCard = { caseId: number; title: string; items: { id: number; type: string; msg: string; when: string; dismissed: boolean; tone: string }[] };

const LABELS: Record<string, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days", "1y": "1 year" };
const RANGES: [string, string][] = [
  ["7d", "7 days"],
  ["30d", "30 days"],
  ["90d", "90 days"],
  ["1y", "Year"],
  ["custom", "Custom…"],
];

export default function SignalsBoard({ cards, range, from, to, show }: { cards: BoardCard[]; range: string; from: string; to: string; show: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [r, setR] = useState(range);
  const [f, setF] = useState(from);
  const [t, setT] = useState(to);
  const [gone, setGone] = useState<Set<number>>(new Set());
  const go = (nr: string, ns: boolean, nf = f, nt = t) => {
    const q = new URLSearchParams({ range: nr, ...(ns ? { show: "1" } : {}), ...(nr === "custom" ? { from: nf, to: nt } : {}) });
    start(() => router.push(`/admin/signals?${q}`));
  };
  const label = range === "custom" ? `${from || "…"} → ${to || "…"}` : LABELS[range] ?? "7 days";
  const visible = cards.map((c) => ({ ...c, items: c.items.filter((i) => !gone.has(i.id)) })).filter((c) => c.items.length);
  const total = visible.reduce((s, c) => s + c.items.length, 0);
  return (
    <div className={cn("transition-opacity", pending && "opacity-60")}>
      <PageHeader
        icon={<Activity />}
        title="Recent Case Activity"
        description={
          <>
            Portal uploads, fact-find saves and other client signals on active cases — last <b className="font-semibold text-slate-700">{label}</b>.
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div role="radiogroup" aria-label="Range" className="inline-flex max-w-full overflow-x-auto rounded-lg bg-slate-100 p-0.5">
          {RANGES.map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={r === k}
              onClick={() => {
                setR(k);
                if (k !== "custom") go(k, show);
              }}
              className={cn(
                "whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors sm:px-3",
                r === k ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:text-slate-900",
              )}
            >
              {l}
            </button>
          ))}
        </div>
        {r === "custom" && (
          <div className="flex flex-wrap items-center gap-2">
            <CalendarRange className="size-4 text-slate-400" />
            <input type="date" aria-label="From" className={cn(inputStyles, "w-auto py-1.5")} value={f} onChange={(e) => setF(e.target.value)} />
            <span className="text-slate-400">→</span>
            <input type="date" aria-label="To" className={cn(inputStyles, "w-auto py-1.5")} value={t} onChange={(e) => setT(e.target.value)} />
            <Button size="sm" variant="primary" onClick={() => go("custom", show, f, t)}>
              Apply
            </Button>
          </div>
        )}
        <label className="ml-auto flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
          <input type="checkbox" className={checkboxStyles} checked={show} onChange={(e) => go(r, e.target.checked)} /> Show dismissed
        </label>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={<Activity />} title="No activity in this range." description="Try a longer range, or include dismissed signals." />
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">
            <b className="font-semibold text-slate-800 tabular-nums">{total}</b> signals across <b className="font-semibold text-slate-800 tabular-nums">{visible.length}</b> cases
          </p>
          <div className="grid items-start gap-4" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(min(460px,100%),1fr))" }}>
            {visible.map((c) => (
              <section key={c.caseId} className="flex flex-col rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <header className="flex items-start gap-2 border-b border-slate-100 px-4 py-3">
                  <Link href={`/admin/cases/${c.caseId}#mmcrm_signals`} className="group min-w-0 flex-1 text-sm font-semibold text-slate-900 hover:text-brand-700">
                    <span className="line-clamp-2">
                      {c.title}
                      {!c.title.includes(`#${c.caseId}`) && <span className="font-normal text-slate-500"> — Case #{c.caseId}</span>}
                    </span>
                  </Link>
                  <Badge tone="brand" className="shrink-0 tabular-nums">
                    {c.items.length}
                  </Badge>
                  <Link href={`/admin/cases/${c.caseId}#mmcrm_signals`} aria-label="Open case" className="shrink-0 text-slate-400 hover:text-brand-700">
                    <ArrowUpRight className="size-4" />
                  </Link>
                </header>
                <ul className="max-h-[280px] divide-y divide-slate-100 overflow-y-auto lg:max-h-[320px]">
                  {c.items.map((i) => (
                    <li key={i.id} className={cn("flex items-start gap-2.5 px-4 py-2.5 text-sm", i.dismissed && "opacity-60", i.tone === "bad" && "bg-red-50/40")}>
                      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", i.tone === "bad" ? "bg-red-500" : i.tone === "good" ? "bg-emerald-500" : "bg-slate-300")} />
                      <span className="min-w-0 flex-1 text-slate-700">{i.msg}</span>
                      <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-slate-500 tabular-nums">
                        <Clock className="size-3" />
                        {i.when}
                      </span>
                      <label className="mt-0.5 flex shrink-0 cursor-pointer items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
                        <input
                          type="checkbox"
                          className="size-3.5 rounded border-slate-300 accent-brand-600"
                          defaultChecked={i.dismissed}
                          onChange={async (e) => {
                            const on = e.target.checked;
                            await signalToggle(i.id, on);
                            if (on && !show) setGone((g) => new Set(g).add(i.id));
                          }}
                        />{" "}
                        Done
                      </label>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
