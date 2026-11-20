import { requireArea } from "@/lib/session";
import { PageHeader } from "@/components/admin/ui";
import { sp1 } from "@/modules/members/components/AdminUi";
import { TestimonialForm } from "../TestimonialForm";

export const metadata = { title: "Add testimonial" };
export const dynamic = "force-dynamic";

export default async function NewTestimonialPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireArea("/admin/testimonials");
  const sp = await searchParams;
  return (
    <div>
      <PageHeader breadcrumbs={[{ label: "Testimonials", href: "/admin/testimonials" }, { label: "Add" }]} title="Add testimonial" />
      <TestimonialForm error={sp1(sp.error)} />
    </div>
  );
}
