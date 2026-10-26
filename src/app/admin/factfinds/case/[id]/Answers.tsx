// Read-only Fact Find answers grouped by section (admin view + print view).
// Same data as modules/crm/components/Summary (engine `summary()`), laid out for staff.
import { PenLine } from "lucide-react";
import { summary, type Schema, type Values } from "@/modules/crm/forms/engine";
import { cn } from "@/components/admin/ui";

const toneEdge = (t: string) => (t === "a1" ? "#6366f1" : t === "a2" ? "#f59e0b" : "");

export default function Answers({ schema, values, print = false }: { schema: Schema; values: Values; print?: boolean }) {
  const groups = summary(schema, values);
  if (!groups.length) {
    return <p className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500">No answers yet.</p>;
  }
  return (
    <div className="space-y-5">
      {!print && groups.length > 2 && (
        <nav className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 print:hidden" aria-label="Sections">
          {groups.map((g, gi) => (
            <a key={gi} href={`#ff-sec-${gi}`} className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900">
              {toneEdge(g.tone) && <span className="size-2 rounded-full" style={{ background: toneEdge(g.tone) }} />}
              {g.title}
              <span className="tabular-nums text-slate-400">{g.rows.length}</span>
            </a>
          ))}
        </nav>
      )}
      {groups.map((g, gi) => (
        <section
          key={gi}
          id={`ff-sec-${gi}`}
          className={cn(
            "scroll-mt-24 overflow-hidden bg-white",
            print ? "break-inside-auto rounded-lg border border-slate-300" : "rounded-xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] print:rounded-lg print:border-slate-300 print:shadow-none",
          )}
          style={toneEdge(g.tone) ? { borderLeft: `4px solid ${toneEdge(g.tone)}` } : undefined}
        >
          <header className={cn("flex items-center gap-2 border-b break-after-avoid", print ? "border-slate-300 bg-slate-100 px-4 py-2" : "border-slate-100 bg-slate-50/70 px-5 py-3 print:bg-slate-100")}>
            <h2 className="text-sm font-semibold text-slate-900">{g.title}</h2>
            <span className="ml-auto text-xs tabular-nums text-slate-400 print:hidden">{g.rows.length} {g.rows.length === 1 ? "answer" : "answers"}</span>
          </header>
          <dl className={cn("-mb-px grid", print ? "grid-cols-2 gap-x-6 px-4" : "gap-x-8 px-5 sm:grid-cols-2")}>
            {g.rows.map((r) =>
              r.table ? (
                <div key={r.key} className={cn("min-w-0 break-inside-avoid border-b sm:col-span-2", print ? "col-span-2 border-slate-200 py-2.5" : "border-slate-100 py-3.5")}>
                  <dt className="text-xs font-medium text-slate-500">{r.label}</dt>
                  <dd className="mt-2 overflow-x-auto">
                    <table className="w-full min-w-[420px] border-collapse text-[13px]">
                      <thead>
                        <tr>{r.cols?.map((c) => <th key={c} className="border-b border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">{c}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {r.table.map((line, i) => <tr key={i}>{line.map((c, j) => <td key={j} className="px-2.5 py-1.5 text-slate-800">{c}</td>)}</tr>)}
                      </tbody>
                    </table>
                  </dd>
                </div>
              ) : (
                <div key={r.key} className={cn("min-w-0 break-inside-avoid border-b", r.type === "textarea" && (print ? "col-span-2" : "sm:col-span-2"), print ? "border-slate-200 py-2" : "border-slate-100 py-3")}>
                  <dt className="text-xs font-medium text-slate-500">{r.label}</dt>
                  <dd className="mt-0.5 whitespace-pre-line break-words text-sm text-slate-900">{r.value}</dd>
                  {r.signed_at && <dd className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500"><PenLine className="size-3" />Signed {r.signed_at}</dd>}
                </div>
              ),
            )}
          </dl>
        </section>
      ))}
    </div>
  );
}
