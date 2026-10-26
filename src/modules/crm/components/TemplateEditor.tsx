"use client";
import { useRef, useState } from "react";
import { Code, Eye, Plus } from "lucide-react";
import { buttonStyles, cn, selectStyles } from "@/components/admin/ui";

export default function TemplateEditor({ name, initial, placeholders }: { name: string; initial: string; placeholders: { key: string; label: string }[] }) {
  const [body, setBody] = useState(initial);
  const [ph, setPh] = useState("");
  const [tab, setTab] = useState<"html" | "preview">("html");
  const ta = useRef<HTMLTextAreaElement>(null);
  const insert = () => {
    if (!ph) return;
    const t = `{{${ph}}}`;
    const el = ta.current;
    const s = el?.selectionStart ?? body.length, e = el?.selectionEnd ?? body.length;
    setBody(body.slice(0, s) + t + body.slice(e));
  };
  return (
    <div className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] focus-within:border-brand-500 focus-within:ring-3 focus-within:ring-brand-500/15">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/80 px-2 py-1.5">
        <div className="flex rounded-md bg-slate-200/60 p-0.5 text-xs font-medium" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "html"} onClick={() => setTab("html")} className={cn("inline-flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors", tab === "html" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}><Code className="size-3.5" />HTML</button>
          <button type="button" role="tab" aria-selected={tab === "preview"} onClick={() => setTab("preview")} className={cn("inline-flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors", tab === "preview" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800")}><Eye className="size-3.5" />Preview</button>
        </div>
        {placeholders.length > 0 && (
          <div className="flex w-full min-w-0 items-center gap-1.5 sm:ml-auto sm:w-auto">
            <select value={ph} onChange={(e) => setPh(e.target.value)} aria-label="Insert placeholder" className={cn(selectStyles, "!h-8 min-w-0 flex-1 !py-1 !text-xs sm:w-[260px] sm:flex-none")}>
              <option value="">— Insert placeholder —</option>
              {placeholders.map((p) => <option key={p.key} value={p.key}>{`{{${p.key}}}`} — {p.label}</option>)}
            </select>
            <button type="button" onClick={insert} disabled={!ph} className={buttonStyles({ variant: "secondary", size: "sm", className: "shrink-0" })}><Plus />Insert<span className="hidden sm:inline"> into Message</span></button>
          </div>
        )}
      </div>
      <textarea
        ref={ta}
        name={name}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={22}
        hidden={tab !== "html"}
        spellCheck={false}
        className="block w-full resize-y !rounded-none !border-0 bg-white !px-3.5 !py-3 font-mono !text-xs leading-relaxed text-slate-800 !shadow-none focus:!ring-0"
      />
      {tab === "preview" && <div className="min-h-[400px] overflow-auto bg-white px-5 py-4 text-sm leading-relaxed text-slate-800 [&_a]:text-brand-700 [&_a]:underline [&_p]:mb-2 whitespace-pre-line" dangerouslySetInnerHTML={{ __html: body.replace(/<script[\s\S]*?<\/script>/gi, "") }} />}
      {placeholders.length > 0 && <p className="border-t border-slate-100 bg-slate-50/60 px-3.5 py-2 text-xs text-slate-500">Tip: placeholders auto-fill from the case.</p>}
    </div>
  );
}
