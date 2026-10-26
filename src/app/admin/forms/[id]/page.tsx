import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { getFfFormId } from "@/modules/crm/options";
import { blankSchema } from "@/modules/crm/forms/engine";
import { BLOCKS } from "@/modules/crm/forms/defaults";
import { formSchema } from "@/modules/crm/forms/service";
import FormBuilder from "@/modules/crm/components/FormBuilder";
import { Badge } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function FormEditPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await requireStaff();
  const { id } = await params;
  const isNew = id === "new";
  const f = isNew ? null : await prisma.crmForm.findUnique({ where: { id: Number(id) } });
  if (!isNew && (!f || f.status === "trash")) notFound();
  const ffId = await getFfFormId();
  return (
    <div>
      <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1 text-xs text-slate-500">
        <Link href="/admin/forms" className="hover:text-slate-800">Forms</Link>
        <ChevronRight className="size-3 text-slate-400" />
        <span className="text-slate-700">{isNew ? "New form" : "Edit form"}</span>
        {f && f.id === ffId && <Badge tone="success" className="ml-1.5 !py-0 !text-[11px]">Fact Find</Badge>}
      </nav>
      <FormBuilder id={f?.id ?? null} title={f?.title ?? ""} schema={f ? formSchema(f) : blankSchema()} isFf={!!f && f.id === ffId} canSetFf={s.role === "ADMIN"} blocks={BLOCKS} />
    </div>
  );
}
