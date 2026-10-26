import { summary, type Schema, type Values } from "../forms/engine";

// Read-only answers (MMCRM_Forms::summary_html).
export default function Summary({ schema, values }: { schema: Schema; values: Values }) {
  const groups = summary(schema, values);
  if (!groups.length) return <p className="text-sm text-slate-500">No answers yet.</p>;
  return (
    <div className="space-y-6">
      {groups.map((g, gi) => {
        const accent = g.tone === "a1" ? "bg-sky-500" : g.tone === "a2" ? "bg-amber-500" : "bg-brand-500";
        return (
          <section key={gi} className="min-w-0">
            <h4 className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-slate-700">
              <span className={`h-4 w-1 rounded-full ${accent}`} aria-hidden />
              {g.title}
            </h4>
            <dl className="grid gap-px overflow-hidden rounded-xl border border-slate-200/80 bg-slate-100 sm:grid-cols-2">
              {g.rows.map((r) =>
                r.table ? (
                  <div key={r.key} className="bg-white px-4 py-3 sm:col-span-2">
                    <dt className="text-xs font-medium text-slate-500">{r.label}</dt>
                    <dd className="mt-2 overflow-x-auto">
                      <table className="w-full min-w-max text-xs">
                        <thead className="bg-slate-50"><tr>{r.cols?.map((c) => <th key={c} className="border-b border-slate-200 px-2.5 py-1.5 text-left font-semibold text-slate-600">{c}</th>)}</tr></thead>
                        <tbody className="divide-y divide-slate-100">{r.table.map((line, i) => <tr key={i}>{line.map((c, j) => <td key={j} className="px-2.5 py-1.5 text-slate-800">{c}</td>)}</tr>)}</tbody>
                      </table>
                    </dd>
                  </div>
                ) : (
                  <div key={r.key} className={`min-w-0 bg-white px-4 py-3 ${r.type === "textarea" ? "sm:col-span-2" : "sm:last:odd:col-span-2"}`}>
                    <dt className="text-xs font-medium text-slate-500">{r.label}</dt>
                    <dd className="mt-0.5 whitespace-pre-line break-words text-sm text-slate-900">{r.value || <span className="text-slate-400">—</span>}</dd>
                    {r.signed_at && <dd className="mt-0.5 text-xs text-slate-500">Signed {r.signed_at}</dd>}
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
