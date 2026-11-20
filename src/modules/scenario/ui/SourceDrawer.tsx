"use client";
// Evidence chips (R12 / P7 / CALC) that open the underlying source in a side panel next to the claim.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ExternalLink, FileText, X } from "lucide-react";
import { Badge, buttonStyles, cn } from "@/components/admin/ui";

export type EvidenceView = {
  id: string;
  kind: "rule" | "price" | "calc";
  heading: string;
  body: { label: string; value: string }[];
  sourceTitle?: string;
  sourceKind?: string;
  section?: string;
  verifiedAt?: string | null;
  status?: string;
  stale?: string;
  url?: string;
  fileUrl?: string;
  adminUrl?: string;
};

const Ctx = createContext<{ open: (id: string) => void; map: Record<string, EvidenceView> }>({ open: () => {}, map: {} });

export function EvidenceProvider({ map, children }: { map: Record<string, EvidenceView>; children: ReactNode }) {
  const [id, setId] = useState<string | null>(null);
  const ev = id ? map[id] : null;
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && setId(null);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
  return (
    <Ctx.Provider value={{ open: setId, map }}>
      {children}
      {ev && (
        <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl" role="dialog" aria-label="Source">
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{ev.kind === "rule" ? "Policy rule" : ev.kind === "price" ? "Price record" : "Server calculation"} · {ev.id}</p>
              <h3 className="mt-1 text-[15px] font-semibold text-slate-900">{ev.heading}</h3>
            </div>
            <button type="button" onClick={() => setId(null)} className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
              <X className="size-5" />
            </button>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
            <div className="flex flex-wrap gap-1.5">
              {ev.status && <Badge tone={ev.status === "published" ? "success" : "warning"}>{ev.status}</Badge>}
              {ev.verifiedAt ? <Badge tone="info">Verified {ev.verifiedAt}</Badge> : ev.kind !== "calc" && <Badge tone="warning">Never verified</Badge>}
              {ev.stale && <Badge tone="danger">{ev.stale}</Badge>}
            </div>
            <dl className="space-y-3">
              {ev.body.filter((b) => b.value).map((b) => (
                <div key={b.label}>
                  <dt className="text-xs font-medium text-slate-500">{b.label}</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap break-words text-slate-900">{b.value}</dd>
                </div>
              ))}
            </dl>
            {ev.sourceTitle && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-xs font-medium text-slate-500">Source{ev.sourceKind ? ` · ${ev.sourceKind.replace(/_/g, " ")}` : ""}</p>
                <p className="mt-0.5 font-medium text-slate-900">{ev.sourceTitle}</p>
                {ev.section && <p className="text-xs text-slate-600">{ev.section}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ev.fileUrl && <a href={ev.fileUrl} target="_blank" rel="noopener" className={buttonStyles({ variant: "secondary", size: "xs" })}><FileText /> Open document</a>}
                  {ev.url && <a href={ev.url} target="_blank" rel="noopener noreferrer" className={buttonStyles({ variant: "secondary", size: "xs" })}><ExternalLink /> Open link</a>}
                  {ev.adminUrl && <a href={ev.adminUrl} target="_blank" rel="noopener" className={buttonStyles({ variant: "ghost", size: "xs" })}>Record history</a>}
                </div>
              </div>
            )}
          </div>
        </aside>
      )}
    </Ctx.Provider>
  );
}

export function SourceChip({ id, className }: { id: string; className?: string }) {
  const { open, map } = useContext(Ctx);
  const known = Boolean(map[id]);
  return (
    <button
      type="button"
      onClick={() => known && open(id)}
      title={known ? "Open source" : "Source not in this analysis"}
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ring-1 ring-inset",
        known ? "bg-sky-50 text-sky-700 ring-sky-200 hover:bg-sky-100" : "bg-slate-50 text-slate-400 ring-slate-200",
        map[id]?.stale && "bg-amber-50 text-amber-700 ring-amber-200",
        className,
      )}
    >
      {id}
    </button>
  );
}
