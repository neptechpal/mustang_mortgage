import { JsonLd, faqJsonLd } from "../../seo";
import { cx } from "../ui/cx";

export type FaqEntry = { question: string; answer: string } | { question: string; answer: React.ReactNode; answerText: string };

function plain(e: FaqEntry) {
  return "answerText" in e ? e.answerText : (e.answer as string);
}

/**
 * Accessible accordion built on <details>/<summary> (keyboard and screen-reader friendly,
 * works without JS) + FAQPage JSON-LD. Answers that are JSX need `answerText` (plain text for JSON-LD).
 * Set `jsonLd={false}` when the same questions already appear in another FAQ on the page.
 */
export function Faq({ items, jsonLd = true, headingLevel = 3, className }: { items: FaqEntry[]; jsonLd?: boolean; headingLevel?: 2 | 3 | 4; className?: string }) {
  const H = `h${headingLevel}` as "h2" | "h3" | "h4";
  return (
    <div className={cx("mw-faq", className)}>
      {items.map((it) => (
        <details className="mw-faq__item" key={it.question}>
          <summary className="mw-faq__q">
            <H style={{ font: "inherit", margin: 0, color: "inherit" }}>{it.question}</H>
            <span className="mw-faq__icon" aria-hidden="true" />
          </summary>
          <div className="mw-faq__a">{typeof it.answer === "string" ? <p>{it.answer}</p> : it.answer}</div>
        </details>
      ))}
      {jsonLd && <JsonLd data={faqJsonLd(items.map((i) => ({ question: i.question, answerText: plain(i) })))} />}
    </div>
  );
}
