import { formatDate } from "../../format";
import { earliestDate, publisherFor, titleFor, urlKind, type SourceInput } from "./sources";

/**
 * Compact source list grouped by state/territory (one row per state, links inline), used under the main
 * <Sources> list so 8 states' revenue-office pages don't turn into 60 numbered items.
 */
export type SourceGroup = { label: string; items: SourceInput[] };

function linkTitle(s: SourceInput, seen: Set<string>) {
  let t = titleFor(s.url, s.title);
  if (seen.has(t)) t = `${t} (${urlKind(s.url)})`;
  seen.add(t);
  return t;
}

export function GroupedSources({ groups, title = "State and territory sources", id = "state-sources", intro }: { groups: SourceGroup[]; title?: string; id?: string; intro?: React.ReactNode }) {
  const rows = groups
    .map((g) => {
      const byUrl = new Map<string, SourceInput>();
      for (const s of g.items) if (!byUrl.has(s.url)) byUrl.set(s.url, s);
      return { label: g.label, items: [...byUrl.values()], checked: earliestDate(...g.items.map((i) => i.verifiedAt)) };
    })
    .filter((g) => g.items.length);
  if (!rows.length) return null;
  return (
    <section id={id} aria-labelledby={`${id}-title`} style={{ fontSize: "0.9375rem" }}>
      <h2 id={`${id}-title`} className="mw-h4" style={{ margin: 0 }}>
        {title}
      </h2>
      {intro && (
        <p className="mw-small" style={{ marginTop: 8 }}>
          {intro}
        </p>
      )}
      <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 0", borderTop: "1px solid var(--mw-line)" }}>
        {rows.map((g) => {
          const seen = new Set<string>();
          const publishers = [...new Set(g.items.map((i) => publisherFor(i.url)).filter(Boolean))].join(", ");
          return (
            <li key={g.label} style={{ padding: "12px 0", borderBottom: "1px solid var(--mw-line)", display: "grid", gridTemplateColumns: "56px minmax(0,1fr)", gap: 8 }}>
              <strong style={{ fontWeight: 600, color: "var(--mw-text)" }}>{g.label}</strong>
              <span>
                {g.items.map((s, i) => (
                  <span key={s.url}>
                    {i > 0 && <span aria-hidden="true"> · </span>}
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="mw-link" style={{ fontWeight: 500, color: "var(--mw-text)", overflowWrap: "anywhere" }}>
                      {linkTitle(s, seen)}
                    </a>
                  </span>
                ))}
                <span style={{ display: "block", color: "var(--mw-text-3)", fontSize: "0.8125rem", marginTop: 2 }}>
                  {publishers}
                  {g.checked && (
                    <>
                      {publishers && " · "}Checked <time dateTime={g.checked}>{formatDate(g.checked)}</time>
                    </>
                  )}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
