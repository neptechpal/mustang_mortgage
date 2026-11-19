import { prisma } from "@/lib/db";

export async function Testimonials() {
  const testimonials = await prisma.testimonial.findMany({
    where: {
      published: true,
      approved: true,
    },
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  if (testimonials.length === 0) {
    return null;
  }

  return (
    <div className="mw-testimonials-grid">
      {testimonials.map((testimonial) => (
        <article
          key={testimonial.id}
          className="mw-testimonial-card"
          style={{
            padding: "24px",
            backgroundColor: "var(--white)",
            borderRadius: "10px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          }}
        >
          <div className="mw-testimonial-stars" style={{ marginBottom: 12 }}>
            {"★".repeat(testimonial.rating)}
          </div>
          <p className="mw-body" style={{ marginBottom: 16, fontStyle: "italic" }}>
            &ldquo;{testimonial.content}&rdquo;
          </p>
          <div>
            <p className="mw-small" style={{ fontWeight: 600 }}>
              {testimonial.clientName}
            </p>
            {testimonial.role && <p className="mw-small" style={{ color: "var(--grey-600)" }}>{testimonial.role}</p>}
          </div>
        </article>
      ))}
    </div>
  );
}
