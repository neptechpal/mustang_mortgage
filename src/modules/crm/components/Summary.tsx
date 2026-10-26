import { summary, type Schema, type Values } from "../forms/engine";

// Read-only answers (MMCRM_Forms::summary_html).
export default function Summary({ schema, values, publicView = false }: { schema: Schema; values: Values; publicView?: boolean }) {
  const cls = (publicClass: string, staffClass: string) => publicView ? publicClass : staffClass;
  const groups = summary(schema, values);
  if (!groups.length) return <p className={cls("mw-portal__meta", "text-sm text-slate-500")}>No answers yet.</p>;
  return (
    <div className={cls("mw-portal__summary", "space-y-6")}>
      {groups.map((g, gi) => {
        const accent = g.tone === "a1" ? "bg-sky-500" : g.tone === "a2" ? "bg-amber-500" : "bg-brand-500";
        return (
          <section key={gi} className="min-w-0">
            <h4 className={cls("mw-portal__summary-title", "mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-slate-700")}>
              <span className={cls("mw-portal__summary-rule", `h-4 w-1 rounded-full ${accent}`)} aria-hidden />
              {g.title}
            </h4>
            <dl className={cls("mw-portal__answers", "grid gap-px overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 sm:grid-cols-2")}>
              {g.rows.map((r) =>
                r.table ? (
                  <div key={r.key} className={cls("mw-portal__answer mw-portal__answer--wide", "bg-white px-4 py-3 sm:col-span-2")}>
                    <dt className={cls("mw-portal__meta", "text-xs font-medium text-slate-500")}>{r.label}</dt>
                    <dd className="mt-2 overflow-x-auto">
                      <table className={cls("mw-portal__answer-table", "w-full min-w-max text-xs")}>
                        <thead className={cls("", "bg-slate-50")}><tr>{r.cols?.map((c) => <th key={c} className={cls("", "border-b border-slate-200 px-2.5 py-1.5 text-left font-semibold text-slate-600")}>{c}</th>)}</tr></thead>
                        <tbody className={cls("", "divide-y divide-slate-100")}>{r.table.map((line, i) => <tr key={i}>{line.map((c, j) => <td key={j} className={cls("", "px-2.5 py-1.5 text-slate-800")}>{c}</td>)}</tr>)}</tbody>
                      </table>
                    </dd>
                  </div>
                ) : (
                  <div key={r.key} className={cls(`mw-portal__answer${r.type === "textarea" ? " mw-portal__answer--wide" : ""}`, `min-w-0 bg-white px-4 py-3 ${r.type === "textarea" ? "sm:col-span-2" : "sm:last:odd:col-span-2"}`)}>
                    <dt className={cls("mw-portal__meta", "text-xs font-medium text-slate-500")}>{r.label}</dt>
                    <dd className={cls("mw-portal__answer-value", "mt-0.5 whitespace-pre-line break-words text-sm text-slate-900")}>{r.value || <span className={cls("mw-portal__meta", "text-slate-400")}>—</span>}</dd>
                    {r.signed_at && <dd className={cls("mw-portal__meta", "mt-0.5 text-xs text-slate-500")}>Signed {r.signed_at}</dd>}
                  </div>
                ),
              )}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
