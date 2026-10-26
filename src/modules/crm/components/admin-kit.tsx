// Small presentational helpers shared by the CRM settings / automation / forms /
// templates admin screens. Server-safe (no hooks) — usable from client components too.
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/components/admin/ui";

/** Checkbox rendered as a switch. Keeps the native input (name/value/checked) intact. */
export function Toggle({ className, size = "md", ...p }: Omit<ComponentProps<"input">, "type" | "size"> & { size?: "sm" | "md" }) {
  const sm = size === "sm";
  return (
    <span className={cn("relative inline-flex shrink-0", sm ? "h-4 w-7" : "h-5 w-9", className)}>
      <input
        type="checkbox"
        {...p}
        className="peer absolute inset-0 z-10 m-0 !size-full cursor-pointer appearance-none rounded-full opacity-0 disabled:cursor-not-allowed"
      />
      <span className="pointer-events-none absolute inset-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-brand-600 peer-hover:bg-slate-400 peer-checked:peer-hover:bg-brand-700 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/40 peer-focus-visible:ring-offset-1 peer-disabled:opacity-50" />
      <span
        className={cn(
          "pointer-events-none absolute left-0.5 top-0.5 rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform",
          sm ? "size-3 peer-checked:translate-x-3" : "size-4 peer-checked:translate-x-4",
        )}
      />
    </span>
  );
}

/** A clickable row: switch on the left, title + description, optional extra content. */
export function ToggleRow({
  title, description, children, input, className,
}: { title: ReactNode; description?: ReactNode; children?: ReactNode; input: ReactNode; className?: string }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 py-3", className)}>
      <span className="pt-0.5">{input}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-slate-900">{title}</span>
        {description && <span className="mt-0.5 block text-[13px] leading-relaxed text-slate-500">{description}</span>}
        {children}
      </span>
    </label>
  );
}

/** Stripe-style settings group: heading + description on the left, card on the right. */
export function SettingsGroup({
  title, description, icon, children, id, className, bodyClassName,
}: { title: ReactNode; description?: ReactNode; icon?: ReactNode; children: ReactNode; id?: string; className?: string; bodyClassName?: string }) {
  return (
    <section id={id} className={cn("grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8", className)}>
      <div className="lg:pt-1">
        <div className="flex items-center gap-2.5">
          {icon && <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 ring-1 ring-slate-200 [&_svg]:size-4">{icon}</span>}
          <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
        </div>
        {description && <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{description}</p>}
      </div>
      <div className={cn("min-w-0 rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Inline list of merge tags, e.g. {{greeting_names}}. */
export function MergeTags({ tags, label = "Merge tags", className }: { tags: string[]; label?: ReactNode; className?: string }) {
  return (
    <div className={cn("mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500", className)}>
      <span className="mr-0.5">{label}:</span>
      {tags.map((t) => (
        <code key={t} className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700 ring-1 ring-inset ring-slate-200">{`{{${t}}}`}</code>
      ))}
    </div>
  );
}

/** Sticky footer bar for long settings forms. */
export function SaveBar({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="sticky bottom-3 z-10 mt-8 rounded-xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-[0_8px_24px_-6px_rgba(15,23,42,0.15)] backdrop-blur sm:bottom-4">
      <div className="flex flex-wrap items-center justify-end gap-3">
        {hint && <p className="mr-auto text-xs text-slate-500">{hint}</p>}
        {children}
      </div>
    </div>
  );
}

/** Renders text with {{placeholders}} highlighted as small mono chips. */
export function WithTags({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return (
    <span className={className}>
      {parts.map((p, i) =>
        /^\{\{[^}]+\}\}$/.test(p) ? (
          <code key={i} className="mx-px rounded bg-brand-50 px-1 py-px font-mono text-[11px] text-brand-800 ring-1 ring-inset ring-brand-100">{p.slice(2, -2)}</code>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </span>
  );
}
