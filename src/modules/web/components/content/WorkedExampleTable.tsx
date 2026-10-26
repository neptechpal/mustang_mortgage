export type WorkedColumn = { key: string; label: string; numeric?: boolean };
export type WorkedRow = { label: React.ReactNode; cells: Record<string, React.ReactNode>; total?: boolean };

/**
 * Worked example as an accessible table (caption, row headers, tabular figures, totals row).
 * Scrolls horizontally on phones. State every assumption and the source of any rule-based figure.
 *
 * <WorkedExampleTable
 *   caption="Buying a $750,000 unit in Parramatta with a 10% deposit"
 *   rowHeader="Item"
 *   columns={[{ key: "amount", label: "Amount", numeric: true }]}
 *   rows={[{ label: "Purchase price", cells: { amount: "$750,000" } }, { label: "Total", cells: { amount: "$…" }, total: true }]}
 *   assumptions={["Owner-occupier, established home", "Duty checked against Revenue NSW on 26 October 2026"]}
 * />
 */
export function WorkedExampleTable({
  caption,
  columns,
  rows,
  rowHeader = "",
  assumptions,
  note,
}: {
  caption: React.ReactNode;
  columns: WorkedColumn[];
  rows: WorkedRow[];
  rowHeader?: string;
  assumptions?: React.ReactNode[];
  note?: React.ReactNode;
}) {
  return (
    <figure style={{ margin: 0 }}>
      <div className="mw-table-wrap" role="region" aria-label={typeof caption === "string" ? caption : "Worked example"} tabIndex={0}>
        <table className="mw-table">
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">{rowHeader}</th>
              {columns.map((c) => (
                <th scope="col" key={c.key} className={c.numeric ? "mw-num-cell" : undefined}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={r.total ? "mw-total" : undefined}>
                <th scope="row">{r.label}</th>
                {columns.map((c) => (
                  <td key={c.key} className={c.numeric ? "mw-num-cell" : undefined}>
                    {r.cells[c.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(assumptions?.length || note) && (
        <figcaption className="mw-table-notes">
          {note}
          {assumptions?.length ? (
            <>
              <strong style={{ fontWeight: 600 }}>Assumptions</strong>
              <ul>
                {assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </>
          ) : null}
        </figcaption>
      )}
    </figure>
  );
}
