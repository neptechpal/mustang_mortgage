"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { buttonStyles, checkboxStyles, cn, inputStyles, selectStyles } from "@/components/admin/ui";

type F = { field: string; required: boolean; type?: string };

export default function CustomFieldsEditor({ initial }: { initial: F[] }) {
  const [rows, setRows] = useState<F[]>(initial);
  return (
    <div className="space-y-2 text-sm">
      {rows.length === 0 && <p className="rounded-lg border border-dashed border-slate-300 px-4 py-3 text-center text-xs text-slate-500">No custom fields yet.</p>}
      {rows.map((r, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-2">
          <input
            name="custom_field"
            value={r.field}
            onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, field: e.target.value } : y)))}
            placeholder="Field label"
            aria-label="Field label"
            className={cn(inputStyles, "min-w-0 flex-1 basis-48")}
          />
          <select
            name="custom_type"
            value={r.type ?? "text"}
            onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, type: e.target.value } : y)))}
            aria-label="Field type"
            className={cn(selectStyles, "!w-auto")}
          >
            <option value="text">Single line</option>
            <option value="textarea">Multi line</option>
          </select>
          <label className="flex items-center gap-2 px-1 text-[13px] text-slate-700">
            <input
              type="checkbox"
              name="custom_required"
              value={i}
              checked={r.required}
              onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, required: e.target.checked } : y)))}
              className={checkboxStyles}
            />{" "}
            Required
          </label>
          <button
            type="button"
            onClick={() => setRows((x) => x.filter((_, j) => j !== i))}
            aria-label="Remove field"
            className={buttonStyles({ variant: "ghost", size: "sm", className: "ml-auto px-2 text-slate-400 hover:bg-red-50 hover:text-red-600" })}
          >
            <X />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => setRows((x) => [...x, { field: "", required: false, type: "text" }])} className={buttonStyles({ variant: "secondary", size: "sm" })}>
        <Plus /> Add custom field
      </button>
    </div>
  );
}
