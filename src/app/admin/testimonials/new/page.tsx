import { TestimonialForm } from "@/modules/web/admin/TestimonialForm";
import { Container } from "@/modules/web/components/ui/Container";

export const metadata = { title: "Add Testimonial", noindex: true };

export default function NewTestimonialPage() {
  return (
    <Container>
      <h1 style={{ padding: "40px 0 20px" }}>Add New Testimonial</h1>
      <TestimonialForm />
    </Container>
  );
}
