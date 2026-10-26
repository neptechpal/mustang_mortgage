"use client";
import { useState } from "react";
import { FileText, ListChecks, Plus, Tag, Trash2 } from "lucide-react";
import type { Preset } from "../options";
import { buttonStyles, cn, inputStyles, textareaStyles } from "@/components/admin/ui";

const lines = (s: string) => s.split(/\r?\n/).filter((x) => x.trim()).length;
const lab = "mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-600 [&_svg]:size-3.5 [&_svg]:text-slate-400";

export default function PresetsEditor({ initial }: { initial: Preset[] }) {
  const [rows, setRows] = useState(initial.map((p, i) => ({ ...p, k: String(i) })));
  const [counts, setCounts] = useState<Record<string, number>>({});
  return (
    <div>
      {rows.length === 0 && (
        <div className="flex flex-col items-center rounded-lg border border-dashed border-slate-300 px-6 py-8 text-center">
          <ListChecks className="mb-2 size-5 text-slate-400" />
          <p className="text-sm font-medium text-slate-700">No presets yet</p>
          <p className="mt-0.5 text-xs text-slate-500">Add a preset to reuse a document list on new clients.</p>
        </div>
      )}
      <div className="space-y-3">
        {rows.map((p, i) => {
          const n = counts[p.k] ?? p.items.length;
          return (
            <div key={p.k} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 sm:p-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] md:gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-white text-[11px] font-semibold tabular-nums text-slate-500 ring-1 ring-slate-200">{i + 1}</span>
                    <input name="pre_name" defaultValue={p.name} placeholder="Preset name" aria-label="Preset name" className={cn(inputStyles, "font-medium")} />
                  </div>
                  <div>
                    <label className={lab}><Tag />Tags</label>
                    <input name="pre_tags" defaultValue={p.tags.join(", ")} placeholder="tags, comma separated" aria-label="Tags" className={cn(inputStyles, "!text-[13px]")} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-xs tabular-nums text-slate-500"><FileText className="size-3.5 text-slate-400" />{n} {n === 1 ? "document" : "documents"}</span>
                    <button type="button" className={buttonStyles({ variant: "ghost", size: "xs", className: "text-slate-500 hover:!bg-red-50 hover:!text-red-600" })} onClick={() => setRows((r) => r.filter((_, j) => j !== i))}><Trash2 />Remove</button>
                  </div>
                </div>
                <div>
                  <label className={cn(lab, "md:sr-only")}>Documents</label>
                  <textarea
                    name="pre_items"
                    defaultValue={p.items.join("\n")}
                    rows={5}
                    placeholder="One document per line"
                    aria-label="Documents, one per line"
                    onChange={(e) => { const v = lines(e.target.value); setCounts((c) => ({ ...c, [p.k]: v })); }}
                    className={cn(textareaStyles, "!min-h-[124px] !text-[13px] leading-relaxed")}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button type="button" className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-3" })} onClick={() => setRows((r) => [...r, { name: "", tags: [], items: [], k: Math.random().toString(36) }])}><Plus />Add preset</button>
    </div>
  );
}
