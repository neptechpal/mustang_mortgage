"use client";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

// Global mini toast (mmx-toast). Call toast("msg", bad?) from any client component.
type T = { msg: string; bad: boolean; id: number };
let push: ((t: T) => void) | null = null;
export function toast(msg: string, bad = false) {
  push?.({ msg, bad, id: Date.now() });
}
export function Toaster() {
  const [t, setT] = useState<T | null>(null);
  useEffect(() => {
    push = (x) => setT(x);
    return () => { push = null; };
  }, []);
  useEffect(() => {
    if (!t) return;
    const h = setTimeout(() => setT(null), 2400);
    return () => clearTimeout(h);
  }, [t]);
  if (!t) return null;
  return (
    <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-[1000] flex max-w-[calc(100vw-2.5rem)] items-center gap-2.5 rounded-xl bg-ink-900 px-4 py-3 text-sm font-medium text-white shadow-2xl ring-1 ring-white/10">
      {t.bad ? <AlertCircle className="size-4 shrink-0 text-red-400" /> : <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />}
      <span>{t.msg}</span>
    </div>
  );
}
