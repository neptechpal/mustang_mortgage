"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, Phone, X } from "lucide-react";
import type { NavGroup } from "../../config";

/** Menu button + full-height sheet for screens below 1140px. */
export function MobileMenu({ groups, phone, phoneHref, book, login }: { groups: NavGroup[]; phone: string; phoneHref: string; book: { label: string; href: string }; login: { label: string; href: string } }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button type="button" className="mw-iconbtn mw-header__menu" aria-expanded={open} aria-controls="mw-sheet" onClick={() => setOpen((v) => !v)}>
        {open ? <X size={20} strokeWidth={1.5} aria-hidden="true" /> : <Menu size={20} strokeWidth={1.5} aria-hidden="true" />}
        <span className="mw-iconbtn__label">{open ? "Close" : "Menu"}</span>
      </button>
      <div id="mw-sheet" className="mw-sheet" hidden={!open}>
        <nav aria-label="Main">
          {groups.map((g) => (
            <details className="mw-sheet__group" key={g.label}>
              <summary>
                {g.label}
                <ChevronDown size={20} strokeWidth={1.5} aria-hidden="true" />
              </summary>
              <ul className="mw-sheet__links">
                <li>
                  <Link href={g.href}>{g.overview}</Link>
                </li>
                {g.items.map((it) => (
                  <li key={it.href}>
                    <Link href={it.href}>
                      {it.label}
                      {it.description && <span>{it.description}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </nav>
        <div className="mw-sheet__actions">
          <Link href={book.href} className="mw-btn mw-btn--primary mw-btn--lg mw-btn--block">
            {book.label}
          </Link>
          <a href={phoneHref} className="mw-btn mw-btn--secondary mw-btn--lg mw-btn--block">
            <Phone size={18} strokeWidth={1.5} aria-hidden="true" />
            <span className="mw-num">Call {phone}</span>
          </a>
          <Link href={login.href} className="mw-btn mw-btn--quiet mw-btn--block">
            {login.label}
          </Link>
        </div>
      </div>
    </>
  );
}
