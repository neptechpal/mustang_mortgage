"use client";
// "Open" button: modal iframe (ThickBox replacement) or window.open per link settings.
import { useEffect, useState } from "react";
import { AppWindow, ExternalLink, X } from "lucide-react";
import { buttonStyles } from "@/components/admin/ui";

export default function LinkOpen({ url, label, modal, target, className }: { url: string; label: string; modal: boolean; target: boolean; className?: string }) {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState({ w: 1000, h: 700 });
  useEffect(() => {
    if (!open) return;
    const calc = () => setSize({ w: Math.min(1200, Math.max(760, window.innerWidth - 100)), h: Math.min(900, Math.max(500, window.innerHeight - 140)) });
    calc();
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("resize", calc);
    window.addEventListener("keydown", k);
    return () => {
      window.removeEventListener("resize", calc);
      window.removeEventListener("keydown", k);
    };
  }, [open]);
  return (
    <>
      <button
        type="button"
        className={className ?? buttonStyles({ variant: "secondary", size: "xs" })}
        onClick={() => {
          if (modal) setOpen(true);
          else window.open(url, target ? "_blank" : "_self");
        }}
      >
        {modal ? <AppWindow /> : <ExternalLink />}
        Open
      </button>
      {open && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/60 backdrop-blur-[2px]" onClick={() => setOpen(false)}>
          <div
            className="flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl ring-1 ring-black/10 md:h-auto md:w-auto md:rounded-xl"
            style={{ maxWidth: "100vw" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm">
              <AppWindow className="size-4 shrink-0 text-slate-400" />
              <strong className="truncate font-semibold text-slate-900">Link Preview — {label}</strong>
              <a href={url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-brand-700 hover:text-brand-800 hover:underline">
                <ExternalLink className="size-3.5" /> Open in new tab
              </a>
              <button className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-200/70 hover:text-slate-900" aria-label="Close" onClick={() => setOpen(false)}>
                <X className="size-4" />
              </button>
            </div>
            <iframe title={label} src={url} className="h-full w-full flex-1 md:h-[var(--h)] md:w-[var(--w)]" style={{ ["--w" as string]: `${size.w}px`, ["--h" as string]: `${size.h}px` }} />
          </div>
        </div>
      )}
    </>
  );
}
