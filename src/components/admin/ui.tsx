// Admin design system — shared by every staff screen under /admin.
// Server-safe (no hooks). Interactive shell pieces live in ./shell/.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ChevronRight, Inbox } from "lucide-react";
import { twMerge } from "tailwind-merge";

/** Joins class names; later Tailwind classes override earlier conflicting ones. */
export function cn(...c: (string | false | null | undefined)[]) {
  return twMerge(c.filter(Boolean).join(" "));
}

/* ------------------------------------------------------------------ buttons */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "success" | "dark" | "link";
export type ButtonSize = "xs" | "sm" | "md" | "lg";

const BTN_BASE =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer";
const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700 border border-brand-600 hover:border-brand-700",
  secondary: "bg-white text-slate-700 border border-slate-300 shadow-sm hover:bg-slate-50 hover:text-slate-900",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent",
  danger: "bg-white text-red-600 border border-red-200 shadow-sm hover:bg-red-50 hover:border-red-300",
  success: "bg-emerald-600 text-white border border-emerald-600 shadow-sm hover:bg-emerald-700 hover:border-emerald-700",
  dark: "bg-ink-900 text-white border border-ink-900 shadow-sm hover:bg-ink-700",
  link: "text-brand-700 hover:text-brand-800 hover:underline border border-transparent !px-0",
};
const BTN_SIZE: Record<ButtonSize, string> = {
  xs: "h-7 px-2 text-xs [&_svg]:size-3.5",
  sm: "h-8 px-3 text-[13px] [&_svg]:size-4",
  md: "h-9 px-3.5 text-sm [&_svg]:size-4",
  lg: "h-11 px-5 text-[15px] [&_svg]:size-5",
};

export function buttonStyles({ variant = "secondary", size = "md", className = "" }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], className);
}

export function Button({ variant, size, className, ...p }: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button {...p} className={buttonStyles({ variant, size, className })} />;
}

export function LinkButton({ variant, size, className, ...p }: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link {...p} className={buttonStyles({ variant, size, className })} />;
}

/* ------------------------------------------------------------------- badges */

export type Tone = "neutral" | "brand" | "success" | "warning" | "danger" | "info" | "violet";
const TONE: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  brand: "bg-brand-50 text-brand-800 ring-brand-200",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-800 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};
const DOT: Record<Tone, string> = {
  neutral: "bg-slate-400", brand: "bg-brand-500", success: "bg-emerald-500", warning: "bg-amber-500",
  danger: "bg-red-500", info: "bg-sky-500", violet: "bg-violet-500",
};

export function badgeStyles(tone: Tone = "neutral") {
  return cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", TONE[tone]);
}

export function Badge({ tone = "neutral", dot, children, className, style }: { tone?: Tone; dot?: boolean; children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={cn(badgeStyles(tone), className)} style={style}>
      {dot && <span className={cn("size-1.5 rounded-full", DOT[tone])} />}
      {children}
    </span>
  );
}

/* --------------------------------------------------------------- page head */

export type Crumb = { label: string; href?: string };

export function PageHeader({
  title, description, breadcrumbs, actions, icon,
}: { title: ReactNode; description?: ReactNode; breadcrumbs?: Crumb[]; actions?: ReactNode; icon?: ReactNode }) {
  return (
    <header className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1 text-xs text-slate-500">
          {breadcrumbs.map((b, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="size-3 text-slate-400" />}
              {b.href ? <Link href={b.href} className="hover:text-slate-800">{b.label}</Link> : <span className="text-slate-700">{b.label}</span>}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {icon && <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 [&_svg]:size-5">{icon}</div>}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
            {description && <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------- cards */

export function Card({
  title, description, actions, children, className, bodyClassName, padded = true, id, footer,
}: {
  title?: ReactNode; description?: ReactNode; actions?: ReactNode; children?: ReactNode; className?: string;
  bodyClassName?: string; padded?: boolean; id?: string; footer?: ReactNode;
}) {
  return (
    <section id={id} className={cn("rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(padded && "p-5", bodyClassName)}>{children}</div>
      {footer && <footer className="rounded-b-xl border-t border-slate-100 bg-slate-50/60 px-5 py-3">{footer}</footer>}
    </section>
  );
}

export function StatCard({
  label, value, hint, icon, tone = "brand", href,
}: { label: ReactNode; value: ReactNode; hint?: ReactNode; icon?: ReactNode; tone?: Tone; href?: string }) {
  const inner = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </div>
      {icon && <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset [&_svg]:size-5", TONE[tone])}>{icon}</div>}
    </div>
  );
  const cls = "block rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]";
  return href ? <Link href={href} className={cn(cls, "transition hover:border-brand-300 hover:shadow-md")}>{inner}</Link> : <div className={cls}>{inner}</div>;
}

/* ------------------------------------------------------------------- tables */

export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("relative overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]", className)}>{children}</div>;
}
export const Table = ({ className, ...p }: ComponentProps<"table">) => <table {...p} className={cn("w-full min-w-full border-collapse text-sm", className)} />;
export const THead = ({ className, ...p }: ComponentProps<"thead">) => <thead {...p} className={cn("bg-slate-50/80", className)} />;
export const TBody = ({ className, ...p }: ComponentProps<"tbody">) => <tbody {...p} className={cn("divide-y divide-slate-100", className)} />;
export const TR = ({ className, ...p }: ComponentProps<"tr">) => <tr {...p} className={cn("transition-colors hover:bg-slate-50/70", className)} />;
export const TH = ({ className, ...p }: ComponentProps<"th">) => (
  <th {...p} className={cn("border-b border-slate-200 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap", className)} />
);
export const TD = ({ className, ...p }: ComponentProps<"td">) => <td {...p} className={cn("px-4 py-3 align-middle text-slate-700", className)} />;

/** Class strings for modules that render tables in client components. */
export const tableCls = {
  wrap: "relative overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
  table: "w-full min-w-full border-collapse text-sm",
  thead: "bg-slate-50/80",
  th: "border-b border-slate-200 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap",
  tr: "border-b border-slate-100 last:border-0 transition-colors hover:bg-slate-50/70",
  td: "px-4 py-3 align-middle text-slate-700",
};

/* -------------------------------------------------------------------- forms */

export const inputStyles =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/15 disabled:bg-slate-50 disabled:text-slate-500";
export const selectStyles = inputStyles + " pr-8";
export const textareaStyles = inputStyles + " min-h-[96px]";
export const labelStyles = "mb-1.5 block text-[13px] font-medium text-slate-700";
export const hintStyles = "mt-1 text-xs text-slate-500";
export const checkboxStyles = "size-4 rounded border-slate-300 text-brand-600 accent-brand-600 focus:ring-brand-500";

export function Field({ label, hint, error, children, className, htmlFor, required }: { label?: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string; htmlFor?: string; required?: boolean }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className={labelStyles}>
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {children}
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : hint ? <p className={hintStyles}>{hint}</p> : null}
    </div>
  );
}
export const Input = ({ className, ...p }: ComponentProps<"input">) => <input {...p} className={cn(inputStyles, className)} />;
export const Select = ({ className, ...p }: ComponentProps<"select">) => <select {...p} className={cn(selectStyles, className)} />;
export const Textarea = ({ className, ...p }: ComponentProps<"textarea">) => <textarea {...p} className={cn(textareaStyles, className)} />;

/** Horizontal filter/search row above lists. */
export function Toolbar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]", className)}>{children}</div>;
}

/* ------------------------------------------------------------------- alerts */

const ALERT: Record<"info" | "success" | "warning" | "danger", string> = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  danger: "border-red-200 bg-red-50 text-red-900",
};
export function Alert({ tone = "info", title, children, className }: { tone?: keyof typeof ALERT; title?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-lg border px-4 py-3 text-sm", ALERT[tone], className)}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cn(title ? "mt-0.5" : "", "opacity-90")}>{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------- misc */

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center", className)}>
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 [&_svg]:size-5">{icon ?? <Inbox />}</div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

const AVATAR_BG = ["bg-brand-100 text-brand-800", "bg-sky-100 text-sky-800", "bg-emerald-100 text-emerald-800", "bg-violet-100 text-violet-800", "bg-rose-100 text-rose-800", "bg-amber-100 text-amber-800"];
export function initials(name: string) {
  const parts = name.trim().split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
export function Avatar({ name, size = "md", className }: { name: string; size?: "sm" | "md" | "lg"; className?: string }) {
  const n = Array.from(name).reduce((a, ch) => a + ch.charCodeAt(0), 0);
  const s = size === "sm" ? "size-7 text-[11px]" : size === "lg" ? "size-11 text-base" : "size-9 text-xs";
  return <span className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold", s, AVATAR_BG[n % AVATAR_BG.length], className)}>{initials(name)}</span>;
}

/** Link-based tab strip (server friendly). */
export function TabLinks({ tabs, className }: { tabs: { href: string; label: ReactNode; active?: boolean; count?: number }[]; className?: string }) {
  return (
    <nav className={cn("mb-5 flex gap-1 overflow-x-auto border-b border-slate-200", className)}>
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
            t.active ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800",
          )}
        >
          {t.label}
          {t.count !== undefined && <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] font-semibold", t.active ? "bg-brand-100 text-brand-800" : "bg-slate-100 text-slate-600")}>{t.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

/** Definition list for record details. */
export function KeyValue({ items, cols = 2, className }: { items: [ReactNode, ReactNode][]; cols?: 1 | 2 | 3; className?: string }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4", cols === 1 ? "grid-cols-1" : cols === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3", className)}>
      {items.map(([k, v], i) => (
        <div key={i} className="min-w-0">
          <dt className="text-xs font-medium text-slate-500">{k}</dt>
          <dd className="mt-0.5 break-words text-sm text-slate-900">{v || <span className="text-slate-400">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SectionTitle({ children, actions, className }: { children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-2", className)}>
      <h3 className="text-sm font-semibold text-slate-900">{children}</h3>
      {actions}
    </div>
  );
}
