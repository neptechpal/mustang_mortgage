"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ExternalLink, LogOut, Plus, Search, UserRound } from "lucide-react";
import { Avatar } from "../ui";

export default function Topbar({ name, role }: { name: string; role: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false); };
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") setMenu(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", key); };
  }, []);

  return (
    <header className="print:hidden sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="flex h-16 items-center gap-3 pl-16 pr-4 sm:pr-6 lg:px-8">
        <form
          className="relative max-w-md flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            const s = q.trim();
            router.push(s ? `/admin/cases?s=${encodeURIComponent(s)}&mmcrm_case_status=&filter_action=Filter` : "/admin/cases");
          }}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search clients and cases…"
            aria-label="Search cases"
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-14 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-3 focus:ring-brand-500/15"
          />
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:block">⌘K</kbd>
        </form>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/admin/cases/new"
            className="hidden h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 sm:inline-flex"
          >
            <Plus className="size-4" /> New client
          </Link>

          <div className="relative" ref={ref}>
            <button
              type="button"
              onClick={() => setMenu((v) => !v)}
              className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-slate-100"
              aria-haspopup="menu"
              aria-expanded={menu}
            >
              <Avatar name={name} size="sm" />
              <span className="hidden text-left leading-tight md:block">
                <span className="block text-[13px] font-semibold text-slate-900">{name}</span>
                <span className="block text-[11px] text-slate-500">{role === "ADMIN" ? "Administrator" : "Staff"}</span>
              </span>
              <ChevronDown className="hidden size-4 text-slate-400 md:block" />
            </button>
            {menu && (
              <div role="menu" className="admin-fade-in absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                  <p className="text-xs text-slate-500">{role === "ADMIN" ? "Administrator" : "Staff"}</p>
                </div>
                <Link role="menuitem" href="/account" className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <UserRound className="size-4 text-slate-400" /> My account
                </Link>
                <Link role="menuitem" href="/" target="_blank" className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <ExternalLink className="size-4 text-slate-400" /> View website
                </Link>
                <Link role="menuitem" href="/logout" prefetch={false} className="flex items-center gap-2.5 border-t border-slate-100 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                  <LogOut className="size-4" /> Log out
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
