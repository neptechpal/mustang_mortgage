import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { TestimonialForm } from "@/modules/web/admin/TestimonialForm";
import { Container } from "@/modules/web/components/ui/Container";

export const metadata = { title: "Edit Testimonial", noindex: true };

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTestimonialPage({ params }: PageProps) {
  await requireAdmin();
  const { id } = await params;

  const testimonial = await prisma.testimonial.findUnique({
    where: { id: parseInt(id) },
  });

  if (!testimonial) {
    return <div>Testimonial not found</div>;
  }

  return (
    <Container>
      <h1 style={{ padding: "40px 0 20px" }}>Edit Testimonial</h1>
      <TestimonialForm testimonial={testimonial} />
    </Container>
  );
}
