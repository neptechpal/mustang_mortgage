import Link from "next/link";
import { Plus, Quote } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireArea } from "@/lib/session";
import { Badge, EmptyState, PageHeader, TBody, TD, TH, THead, TR, Table, TableWrap, buttonStyles } from "@/components/admin/ui";
import { Flash, sp1 } from "@/modules/members/components/AdminUi";

export const metadata = { title: "Testimonials" };
export const dynamic = "force-dynamic";

export default async function TestimonialsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireArea("/admin/testimonials");
  const sp = await searchParams;
  const items = await prisma.testimonial.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] });

  return (
    <div>
      <PageHeader
        title="Testimonials"
        description="Quotes from clients, shown on the home page. Only published ones appear, and the section is hidden while none are published."
        icon={<Quote />}
        actions={
          <Link href="/admin/testimonials/new" className={buttonStyles({ variant: "primary" })}>
            <Plus /> Add testimonial
          </Link>
        }
      />
      <Flash msg={sp1(sp.msg)} error={sp1(sp.error)} />
      {items.length === 0 ? (
        <EmptyState
          icon={<Quote />}
          title="No testimonials yet"
          description="Add your first one. Only publish a testimonial once the client has agreed to share it."
          action={
            <Link href="/admin/testimonials/new" className={buttonStyles({ variant: "primary" })}>
              <Plus /> Add testimonial
            </Link>
          }
        />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Client</TH>
                <TH>Testimonial</TH>
                <TH>Stars</TH>
                <TH>Order</TH>
                <TH>Status</TH>
                <TH />
              </TR>
            </THead>
            <TBody>
              {items.map((t) => (
                <TR key={t.id}>
                  <TD className="font-medium text-slate-900">
                    {t.clientName}
                    {t.detail && <span className="block text-xs font-normal text-slate-500">{t.detail}</span>}
                  </TD>
                  <TD className="max-w-md truncate text-slate-600">{t.content}</TD>
                  <TD>{t.rating ? "★".repeat(t.rating) : "—"}</TD>
                  <TD>{t.sortOrder}</TD>
                  <TD>{t.published ? <Badge tone="success">Shown on website</Badge> : <Badge>Hidden</Badge>}</TD>
                  <TD className="text-right">
                    <Link href={`/admin/testimonials/${t.id}`} className="text-brand-700 hover:underline">
                      Edit
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      )}
    </div>
  );
}
