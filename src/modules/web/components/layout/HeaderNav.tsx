"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import type { NavGroup } from "../../config";

const isIn = (pathname: string, g: NavGroup) => pathname === g.href || pathname.startsWith(`${g.href}/`) || g.items.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));

/** Desktop navigation with dropdown panels (click, hover on fine pointers, Escape, outside click). */
export function HeaderNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState<number | null>(null);
  const rootRef = useRef<HTMLUListElement>(null);
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const close = useCallback((focusTrigger?: boolean) => {
    setOpen((cur) => {
      if (focusTrigger && cur !== null) triggers.current[cur]?.focus();
      return null;
    });
  }, []);

  useEffect(() => setOpen(null), [pathname]);

  useEffect(() => {
    if (open === null) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  const hoverOpen = (i: number) => (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(i);
  };
  const hoverClose = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(null), 160);
  };

  const onTriggerKey = (i: number) => (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(i);
      requestAnimationFrame(() => document.querySelector<HTMLAnchorElement>(`#mw-nav-panel-${i} a`)?.focus());
    }
  };

  return (
    <nav className="mw-nav" aria-label="Main">
      <ul className="mw-nav__list" ref={rootRef}>
        {groups.map((g, i) => {
          const expanded = open === i;
          return (
            <li key={g.label} className="mw-nav__item" onPointerEnter={hoverOpen(i)} onPointerLeave={hoverClose}>
              <button
                ref={(el) => {
                  triggers.current[i] = el;
                }}
                type="button"
                className="mw-nav__trigger"
                aria-expanded={expanded}
                aria-controls={`mw-nav-panel-${i}`}
                data-active={isIn(pathname, g) || undefined}
                onClick={() => setOpen(expanded ? null : i)}
                onKeyDown={onTriggerKey(i)}
              >
                {g.label}
                <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
              </button>
              <div className="mw-nav__panel" id={`mw-nav-panel-${i}`} hidden={!expanded}>
                <ul className="mw-nav__grid">
                  {g.items.map((it) => (
                    <li key={it.href}>
                      <Link href={it.href} className="mw-nav__link" aria-current={pathname === it.href ? "page" : undefined}>
                        <span className="mw-nav__link-label">{it.label}</span>
                        {it.description && <span className="mw-nav__link-desc">{it.description}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mw-nav__foot">
                  <Link href={g.href} className="mw-link mw-link--arrow">
                    <span>{g.overview}</span>
                    <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
