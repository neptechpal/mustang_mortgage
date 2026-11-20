import type { PublicTestimonial } from "../../testimonials";
import "../../styles/proof.css";

export function Testimonials({ items }: { items: PublicTestimonial[] }) {
  if (!items.length) return null;
  return (
    <div className="mw-testimonials">
      {items.map((t) => (
        <figure key={t.id} className="mw-quote">
          {t.rating ? (
            <div className="mw-quote__stars" role="img" aria-label={`${t.rating} out of 5 stars`}>
              {"★".repeat(t.rating)}
              <span style={{ opacity: 0.25 }}>{"★".repeat(5 - t.rating)}</span>
            </div>
          ) : null}
          <blockquote className="mw-quote__text">&ldquo;{t.content}&rdquo;</blockquote>
          <figcaption className="mw-quote__who">
            <strong>{t.clientName}</strong>
            {t.detail}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
