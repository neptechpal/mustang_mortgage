"use client";
// Small shared client helpers for crm-extra UIs.
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, CircleAlert, CircleCheck, Copy } from "lucide-react";
import { cx } from "./styles";

export function useToast() {
  const [msg, setMsg] = useState<{ t: string; bad?: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((t: string, bad?: boolean) => {
    setMsg({ t, bad });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2500);
  }, []);
  const node = msg ? (
    <div
      className="fixed right-5 bottom-5 z-[1000] flex max-w-sm items-center gap-2.5 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-2xl ring-1 ring-black/10"
      role="status"
    >
      {msg.bad ? <CircleAlert className="size-4 shrink-0 text-red-400" /> : <CircleCheck className="size-4 shrink-0 text-emerald-400" />}
      {msg.t}
    </div>
  ) : null;
  return { show, node };
}

export async function copyText(t: string) {
  try {
    await navigator.clipboard.writeText(t);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = t;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch {}
    document.body.removeChild(ta);
  }
}

export function CopyButton({ text, label = "Copy", done = "Copied!", className = "" }: { text: string; label?: string; done?: string; className?: string }) {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => setOk(false), 1200);
    return () => clearTimeout(t);
  }, [ok]);
  return (
    <button type="button" className={className || cx.btn} onClick={() => copyText(text).then(() => setOk(true))}>
      {ok ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
      {ok ? done : label}
    </button>
  );
}

export function ConfirmButton({
  confirm,
  children,
  className,
  formAction,
}: {
  confirm: string;
  children: React.ReactNode;
  className?: string;
  formAction?: (fd: FormData) => void | Promise<void>;
}) {
  return (
    <button
      type="submit"
      className={className}
      formAction={formAction}
      onClick={(e) => {
        if (!window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
