"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity, BarChart3, Bot, Briefcase, Calculator, CalendarClock, CalendarDays, ClipboardList, Columns3, ExternalLink,
  FileText, GraduationCap, Inbox, KanbanSquare, LayoutDashboard, Link2, Mail, Megaphone, Menu, Settings, ShieldCheck,
  Sparkles, Stethoscope, StickyNote, Users, Wallet, X, type LucideIcon,
} from "lucide-react";
import type { NavGroup } from "@/app/admin/nav";

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard, cases: Briefcase, pipeline: KanbanSquare, forms: ClipboardList, templates: FileText,
  factfind: Columns3, reminders: CalendarClock, notes: StickyNote, learning: GraduationCap, activity: Activity,
  mail: Mail, commissions: Wallet, calculator: Calculator, marketing: Megaphone, social: Sparkles, links: Link2,
  calendarFeed: CalendarDays, submissions: Inbox, appointments: CalendarDays, users: Users, settings: Settings,
  automation: Bot, zoho: ShieldCheck, diagnostics: Stethoscope, chart: BarChart3,
};

const LOGO = "/wp-content/uploads/2024/06/Copy-of-Financial-Advisor-Logo-in-Dark-Light-Blue-White-Clean-Minimalist-Style-.png";

function activeHref(path: string, hrefs: string[]) {
  // Longest matching prefix wins (/admin/cases/new beats /admin/cases).
  let best = "";
  for (const h of hrefs) {
    const hit = h === "/admin" ? path === "/admin" : path === h || path.startsWith(h + "/");
    if (hit && h.length > best.length) best = h;
  }
  return best;
}

function NavList({ nav, onNavigate }: { nav: NavGroup[]; onNavigate?: () => void }) {
  const path = usePathname();
  const current = activeHref(path, nav.flatMap((g) => g.items.map((i) => i.href)));
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5 [scrollbar-width:thin] [scrollbar-color:#2a3856_transparent]">
      {nav.map((g) => (
        <div key={g.title}>
          <p className="mb-1.5 px-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500">{g.title}</p>
          <ul className="space-y-0.5">
            {g.items.map((i) => {
              const Icon = ICONS[i.icon] ?? LayoutDashboard;
              const on = i.href === current;
              return (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    onClick={onNavigate}
                    aria-current={on ? "page" : undefined}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors ${
                      on ? "bg-white/[0.08] text-white" : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100"
                    }`}
                  >
                    {on && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-brand-400" />}
                    <Icon className={`size-[18px] shrink-0 ${on ? "text-brand-300" : "text-slate-500 group-hover:text-slate-300"}`} strokeWidth={1.9} />
                    <span className="truncate">{i.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-3 px-5 py-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={LOGO} alt="" className="size-9 rounded-full ring-1 ring-brand-400/40" />
      <div className="leading-tight">
        <p className="text-[15px] font-semibold text-white">Mustang Mortgage</p>
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-brand-300/80">Broker CRM</p>
      </div>
    </Link>
  );
}

function Footer() {
  return (
    <div className="border-t border-white/[0.06] p-3">
      <Link href="/" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-slate-400 hover:bg-white/[0.04] hover:text-slate-100">
        <ExternalLink className="size-4" /> View website
      </Link>
    </div>
  );
}

export default function Sidebar({ nav }: { nav: NavGroup[] }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-ink-900 lg:flex print:!hidden">
        <Brand />
        <NavList nav={nav} />
        <Footer />
      </aside>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-40 print:hidden inline-flex size-10 items-center justify-center rounded-lg bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-ink-900 shadow-2xl">
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close menu">
                <X className="size-5" />
              </button>
            </div>
            <NavList nav={nav} onNavigate={() => setOpen(false)} />
            <Footer />
          </aside>
        </div>
      )}
    </>
  );
}
