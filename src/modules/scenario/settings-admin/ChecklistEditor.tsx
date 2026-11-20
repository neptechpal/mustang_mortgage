"use client";
// Compliance checklist template editor: per stage list of items (key / label / kind / required),
// add / remove / reorder. Submits the whole structure as JSON in the hidden "stages" input.
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button, Input, Select, checkboxStyles, cn } from "@/components/admin/ui";
import type { ChecklistItem } from "../settings";

type Row = ChecklistItem & { uid: string; autoKey?: boolean };
let seq = 0;
const uid = () => `i${++seq}`;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);

export default function ChecklistEditor({ stages, initial }: { stages: [string, string][]; initial: Record<string, ChecklistItem[]> }) {
  const [data, setData] = useState<Record<string, Row[]>>(() =>
    Object.fromEntries(stages.map(([k]) => [k, (initial[k] ?? []).map((it) => ({ ...it, uid: uid() }))])),
  );
  const [active, setActive] = useState(stages[0]?.[0] ?? "");
  const rows = data[active] ?? [];
  const update = (fn: (rows: Row[]) => Row[]) => setData((d) => ({ ...d, [active]: fn(d[active] ?? []) }));
  const patch = (i: number, p: Partial<Row>) => update((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i: number, dir: -1 | 1) =>
    update((r) => {
      const j = i + dir;
      if (j < 0 || j >= r.length) return r;
      const n = [...r];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const serial = JSON.stringify(Object.fromEntries(Object.entries(data).map(([k, list]) => [k, list.map((r) => ({ key: r.key, label: r.label, kind: r.kind, required: r.required, ...(r.help ? { help: r.help } : {}) }))])));

  return (
    <div>
      <input type="hidden" name="stages" value={serial} />
      <div role="tablist" className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
        {stages.map(([k, v]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={active === k}
            onClick={() => setActive(k)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
              active === k ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:text-slate-900",
            )}
          >
            {v}
            <span className="rounded-full bg-slate-200/80 px-1.5 text-[11px] tabular-nums text-slate-600">{data[k]?.length ?? 0}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">No items for this stage.</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((r, i) => (
            <li key={r.uid} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-5 shrink-0 text-xs font-medium tabular-nums text-slate-400">{i + 1}</span>
                <Input
                  aria-label="Label"
                  value={r.label}
                  maxLength={200}
                  placeholder="Item label"
                  className="min-w-0 flex-1 basis-60"
                  onChange={(e) => patch(i, { label: e.target.value, ...(r.autoKey ? { key: slug(e.target.value) } : {}) })}
                />
                <div className="flex shrink-0 items-center gap-1">
                  <Button type="button" variant="ghost" size="xs" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp /></Button>
                  <Button type="button" variant="ghost" size="xs" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)}><ArrowDown /></Button>
                  <Button type="button" variant="ghost" size="xs" aria-label="Remove item" className="text-red-600 hover:bg-red-50" onClick={() => update((x) => x.filter((_, j) => j !== i))}><Trash2 /></Button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 pl-7">
                <Input
                  aria-label="Key"
                  value={r.key}
                  maxLength={60}
                  placeholder="key"
                  className="h-8 w-44 py-1 font-mono text-xs"
                  onChange={(e) => patch(i, { key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"), autoKey: false })}
                />
                <Select aria-label="Kind" value={r.kind} className="h-8 w-auto py-1 text-xs" onChange={(e) => patch(i, { kind: e.target.value as Row["kind"] })}>
                  <option value="check">Tick box</option>
                  <option value="date">Date</option>
                </Select>
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                  <input type="checkbox" className={checkboxStyles} checked={r.required} onChange={(e) => patch(i, { required: e.target.checked })} />
                  Required
                </label>
              </div>
            </li>
          ))}
        </ol>
      )}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mt-3"
        onClick={() => update((r) => [...r, { uid: uid(), key: "", label: "", kind: "check", required: true, autoKey: true }])}
      >
        <Plus />Add item
      </Button>
      <p className="mt-2 text-xs text-slate-500">Keys identify an item on existing cases — changing a key starts that item afresh.</p>
    </div>
  );
}
