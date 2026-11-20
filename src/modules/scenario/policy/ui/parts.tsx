// Lender policy admin — small server-safe presentational helpers.
import type { ReactNode } from "react";
import { BookOpenText, ChevronDown, ShieldAlert } from "lucide-react";
import { Alert, Badge, cn } from "@/components/admin/ui";
import { CHECKS } from "../checks";
import { STATUS_TONE, statusLabel, type Flag } from "../meta";

export function Flash({ sp }: { sp: Record<string, string | undefined> }) {
  if (!sp.msg && !sp.err) return null;
  return (
    <div className="mb-5 space-y-2">
      {sp.err && <Alert tone="danger" title="Not saved">{sp.err}</Alert>}
      {sp.msg && <Alert tone="success">{sp.msg}</Alert>}
    </div>
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? "neutral"} dot className={className}>
      {statusLabel(status)}
    </Badge>
  );
}

export function FlagBadges({ flags, max }: { flags: Flag[]; max?: number }) {
  const shown = max ? flags.slice(0, max) : flags;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((f) => (
        <Badge key={f.key} tone={f.tone}>
          {f.label}
        </Badge>
      ))}
      {max && flags.length > max && <Badge tone="neutral">+{flags.length - max}</Badge>}
    </div>
  );
}

/** Human summary of a rule's typed parameters, using the check's ParamSpec labels/options. */
export function paramsSummary(check: string, params: unknown): [string, string][] {
  const def = CHECKS[check];
  const p = (params && typeof params === "object" ? params : {}) as Record<string, unknown>;
  if (!def) return Object.entries(p).map(([k, v]) => [k, JSON.stringify(v)]);
  const out: [string, string][] = [];
  for (const s of def.params) {
    const v = p[s.key];
    if (v === undefined || v === null || (Array.isArray(v) && v.length === 0)) continue;
    const opt = (x: unknown) => s.options?.find(([k]) => k === x)?.[1] ?? String(x);
    if (s.type === "bool") out.push([s.label, v ? "Yes" : "No"]);
    else if (s.type === "multi" || s.type === "list") out.push([s.label, (v as unknown[]).map(opt).join(", ")]);
    else if (s.type === "enum") out.push([s.label, opt(v)]);
    else out.push([s.label, String(v)]);
  }
  return out;
}

export function ParamsInline({ check, params, className }: { check: string; params: unknown; className?: string }) {
  const items = paramsSummary(check, params);
  if (!items.length) return <span className="text-xs text-slate-400">No parameters</span>;
  return (
    <p className={cn("text-xs leading-relaxed text-slate-500", className)}>
      {items.map(([k, v], i) => (
        <span key={k}>
          {i > 0 && <span className="mx-1 text-slate-300">·</span>}
          <span className="text-slate-400">{k}:</span> <span className="text-slate-600">{v}</span>
        </span>
      ))}
    </p>
  );
}

function GuideItem({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-[13px] font-semibold text-slate-900">{title}</h3>
      <div className="mt-1 space-y-1.5 text-[13px] leading-relaxed text-slate-600">{children}</div>
    </div>
  );
}

/** Collapsible admin guide shown at the top of /admin/lender-policy. */
export function AdminGuide() {
  return (
    <details className="group mb-6 rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 [&::-webkit-details-marker]:hidden">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
          <BookOpenText className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-900">How lender policy is maintained</span>
          <span className="block text-xs text-slate-500">Refreshing sources, BDM confirmations, permissions and what must never be entered.</span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
      </summary>
      <div className="grid gap-5 border-t border-slate-100 px-5 py-5 md:grid-cols-2">
        <GuideItem title="1 · Refreshing a source (new guide or rate sheet)">
          <ol className="list-decimal space-y-1 pl-4">
            <li>Register the new version on <b>Sources</b> (title, reference/version, file or URL) and confirm permissions.</li>
            <li>An admin publishes the new source.</li>
            <li>Open the <i>old</i> source and use <b>Re-key to new source</b>: draft versions of every published rule and price are created against the new source.</li>
            <li>Check each draft against the new document, record <b>Verified on</b>, and publish (the old version is superseded automatically).</li>
            <li>Supersede the old source. Anything still citing it stops being used and shows in the Review queue.</li>
          </ol>
        </GuideItem>
        <GuideItem title="2 · BDM confirmations">
          <p>
            Register a source of kind <b>BDM written confirmation</b> with the BDM&apos;s name, date received and the written response pasted into <b>Excerpt</b> (required). Verbal advice is not a source.
          </p>
          <p>
            If it only applies to one client, set <b>Case #</b> on the source and on the rule or confirmed quote — case-specific records are only used for that case.
          </p>
        </GuideItem>
        <GuideItem title="3 · Permissions">
          <p>
            Only enter material the business is authorised to use. <b>Storage permission</b> is required before a source can be published. Without <b>AI transmission permission</b>, extracts from that source are never sent to the AI provider — the
            rule-based checks still use the structured rule.
          </p>
        </GuideItem>
        <GuideItem title="4 · Never enter">
          <p className="flex gap-2 rounded-lg bg-red-50 px-3 py-2 text-red-800 ring-1 ring-inset ring-red-100">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              Commission, referral, volume-bonus or any other remuneration data must <b>never</b> be entered here. Lender choice must be driven by the client&apos;s best interests, not broker remuneration.
            </span>
          </p>
          <p>Staff create and edit drafts. Only an admin can publish, supersede or withdraw, and change panel membership.</p>
        </GuideItem>
      </div>
    </details>
  );
}

export const code = "rounded bg-slate-100 px-1 py-px font-mono text-[12px] text-slate-700";

/** Server-rendered checkbox group (submits repeated `name` values). */
export function CheckGroup({ name, options, selected, legend, hint }: { name: string; options: [string, string][]; selected: string[]; legend: ReactNode; hint?: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-1.5 block text-[13px] font-medium text-slate-700">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([k, v]) => (
          <label
            key={k}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-700 transition-colors hover:border-slate-300 has-[:checked]:border-brand-300 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-900"
          >
            <input type="checkbox" name={name} value={k} defaultChecked={selected.includes(k)} className="size-4 rounded border-slate-300 accent-brand-600" />
            {v}
          </label>
        ))}
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </fieldset>
  );
}
