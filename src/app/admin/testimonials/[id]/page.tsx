import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireArea } from "@/lib/session";
import { PageHeader } from "@/components/admin/ui";
import { sp1 } from "@/modules/members/components/AdminUi";
import { TestimonialForm } from "../TestimonialForm";

export const metadata = { title: "Edit testimonial" };
export const dynamic = "force-dynamic";

export default async function EditTestimonialPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireArea("/admin/testimonials");
  const { id } = await params;
  const sp = await searchParams;
  const t = await prisma.testimonial.findUnique({ where: { id: parseInt(id, 10) || 0 } });
  if (!t) notFound();
  return (
    <div>
      <PageHeader breadcrumbs={[{ label: "Testimonials", href: "/admin/testimonials" }, { label: t.clientName }]} title={t.clientName} />
      <TestimonialForm t={t} error={sp1(sp.error)} />
    </div>
  );
}
