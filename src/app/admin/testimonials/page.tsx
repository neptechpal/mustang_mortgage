import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import Link from "next/link";
import { Container } from "@/modules/web/components/ui/Container";

export const metadata = { title: "Testimonials", noindex: true };

export default async function TestimonialsPage() {
  await requireAdmin();

  const testimonials = await prisma.testimonial.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <Container>
      <div style={{ padding: "40px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40 }}>
          <h1>Testimonials</h1>
          <Link href="/admin/testimonials/new" style={{ padding: "10px 20px", backgroundColor: "var(--gold-600)", color: "white", borderRadius: "6px", textDecoration: "none" }}>
            Add Testimonial
          </Link>
        </div>

        {testimonials.length === 0 ? (
          <p>No testimonials yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--grey-300)" }}>
                <th style={{ padding: "12px", textAlign: "left" }}>Client Name</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Rating</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Approved</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Published</th>
                <th style={{ padding: "12px", textAlign: "left" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {testimonials.map((testimonial) => (
                <tr key={testimonial.id} style={{ borderBottom: "1px solid var(--grey-200)" }}>
                  <td style={{ padding: "12px" }}>{testimonial.clientName}</td>
                  <td style={{ padding: "12px" }}>{"★".repeat(testimonial.rating)}</td>
                  <td style={{ padding: "12px" }}>{testimonial.approved ? "✓" : "✗"}</td>
                  <td style={{ padding: "12px" }}>{testimonial.published ? "✓" : "✗"}</td>
                  <td style={{ padding: "12px" }}>
                    <Link href={`/admin/testimonials/${testimonial.id}`} style={{ color: "var(--gold-600)", textDecoration: "none" }}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Container>
  );
}
