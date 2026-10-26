import { formatDate } from "../../format";

export type SourceItem = { title: string; url: string; publisher?: string; checkedAt?: string };

/**
 * Numbered source list (id="sources" so <ReviewedStrip> can link to it).
 * Every government rule on a page must appear here with the date it was checked.
 */
export function Sources({ items, title = "Sources", id = "sources", intro }: { items: SourceItem[]; title?: string; id?: string; intro?: React.ReactNode }) {
  if (!items.length) return null;
  return (
    <section className="mw-sources" id={id} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} className="mw-h3">
        {title}
      </h2>
      {intro && <p className="mw-small" style={{ marginTop: 8 }}>{intro}</p>}
      <ol>
        {items.map((s) => (
          <li key={s.url + s.title}>
            <span>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.title}
              </a>
              {(s.publisher || s.checkedAt) && (
                <span className="mw-sources__meta">
                  {s.publisher}
                  {s.publisher && s.checkedAt && " · "}
                  {s.checkedAt && (
                    <>
                      Checked <time dateTime={s.checkedAt}>{formatDate(s.checkedAt)}</time>
                    </>
                  )}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
