"use client";
// Click-to-copy list of {{merge_tags}} for the template editor sidebar.
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/components/admin/ui";

export default function PlaceholderChips({ tags }: { tags: { key: string; label?: string }[] }) {
  const [copied, setCopied] = useState("");
  const copy = async (k: string) => {
    try { await navigator.clipboard.writeText(`{{${k}}}`); setCopied(k); setTimeout(() => setCopied((c) => (c === k ? "" : c)), 1400); } catch { /* clipboard unavailable */ }
  };
  return (
    <ul className="space-y-1">
      {tags.map((t) => (
        <li key={t.key}>
          <button
            type="button"
            onClick={() => copy(t.key)}
            title={`Copy {{${t.key}}}`}
            className={cn("group flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-slate-50", copied === t.key && "bg-emerald-50 hover:bg-emerald-50")}
          >
            <span className="min-w-0 flex-1">
              <code className="block truncate font-mono text-[12px] text-brand-800">{`{{${t.key}}}`}</code>
              {t.label && <span className="block truncate text-[11px] text-slate-500">{t.label}</span>}
            </span>
            {copied === t.key ? <Check className="size-3.5 shrink-0 text-emerald-600" /> : <Copy className="size-3.5 shrink-0 text-slate-300 group-hover:text-slate-500" />}
          </button>
        </li>
      ))}
    </ul>
  );
}
