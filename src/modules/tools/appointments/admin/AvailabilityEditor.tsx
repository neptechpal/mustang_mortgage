"use client";

import { useState } from "react";
import { Copy, Plus, X } from "lucide-react";
import { buttonStyles, cn, inputStyles } from "@/components/admin/ui";

type Block = { start: string; end: string };
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function AvailabilityEditor({ initial }: { initial: Record<string, Block[]> }) {
  const [av, setAv] = useState<Record<string, Block[]>>(() => Object.fromEntries(DAYS.map((d) => [d, initial[d] ?? []])));
  const update = (d: string, i: number, k: keyof Block, v: string) => setAv((a) => ({ ...a, [d]: a[d].map((b, j) => (j === i ? { ...b, [k]: v } : b)) }));
  const add = (d: string) => setAv((a) => ({ ...a, [d]: [...a[d], { start: "09:00", end: "17:00" }] }));
  const remove = (d: string, i: number) => setAv((a) => ({ ...a, [d]: a[d].filter((_, j) => j !== i) }));
  const copyAll = (d: string) => setAv((a) => Object.fromEntries(DAYS.map((x) => [x, a[d].map((b) => ({ ...b }))])));

  return (
    <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
      {DAYS.map((d) => {
        const open = av[d].length > 0;
        return (
          <div key={d} className={cn("grid gap-3 px-4 py-3 text-sm sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-start", !open && "bg-slate-50/60")}>
            <div className="flex items-center gap-2 sm:pt-2">
              <span className={cn("size-2 rounded-full", open ? "bg-emerald-500" : "bg-slate-300")} />
              <span className={cn("font-medium", open ? "text-slate-900" : "text-slate-500")}>{d}</span>
            </div>
            <div className="flex flex-col gap-2">
              {!open && <span className="text-slate-400 sm:pt-2">Unavailable</span>}
              {av[d].map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="time"
                    name={`av_${d}_start`}
                    value={b.start}
                    onChange={(e) => update(d, i, "start", e.target.value)}
                    aria-label={`${d} block ${i + 1} start`}
                    className={cn(inputStyles, "w-auto min-w-0 flex-1 tabular-nums sm:w-32 sm:flex-none")}
                  />
                  <span className="text-slate-400">–</span>
                  <input
                    type="time"
                    name={`av_${d}_end`}
                    value={b.end}
                    onChange={(e) => update(d, i, "end", e.target.value)}
                    aria-label={`${d} block ${i + 1} end`}
                    className={cn(inputStyles, "w-auto min-w-0 flex-1 tabular-nums sm:w-32 sm:flex-none")}
                  />
                  <button
                    type="button"
                    onClick={() => remove(d, i)}
                    className={buttonStyles({ variant: "ghost", size: "sm", className: "px-2 text-slate-400 hover:bg-red-50 hover:text-red-600" })}
                    aria-label="Remove block"
                  >
                    <X />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 sm:justify-end sm:pt-1">
              <button type="button" onClick={() => add(d)} className={buttonStyles({ variant: "ghost", size: "xs", className: "text-brand-700 hover:bg-brand-50 hover:text-brand-800" })}>
                <Plus /> Add block
              </button>
              {open && (
                <button type="button" onClick={() => copyAll(d)} className={buttonStyles({ variant: "ghost", size: "xs" })}>
                  <Copy /> Copy to all days
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
