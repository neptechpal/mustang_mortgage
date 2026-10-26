import { notFound } from "next/navigation";
import { ArrowLeft, FileText, PenLine, Printer } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { factFindSchema } from "@/modules/crm/forms/service";
import { fmtLong } from "@/modules/crm/util";
import PrintButton from "@/modules/crm/components/PrintButton";
import { Badge, LinkButton, PageHeader } from "@/components/admin/ui";
import Answers from "./Answers";

export const dynamic = "force-dynamic";

// Print-only: hide the admin shell (topbar, mobile menu button) so the document prints cleanly.
const PRINT_CSS = `@media print{
  @page{margin:14mm}
  .admin-ui header.sticky,.admin-ui button[aria-label="Open menu"],.admin-ui aside{display:none!important}
  .admin-ui,.admin-ui main{background:#fff!important}
  .admin-ui main{padding:0!important;max-width:none!important}
}`;

// Fact Find answers view / print for one case.
export default async function CaseFactFind({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff();
  const { id } = await params;
  const sp = await searchParams;
  const c = await prisma.case.findUnique({ where: { id: Number(id) } });
  if (!c) notFound();
  const { schema } = await factFindSchema();
  const values = (c.ffDraft ?? {}) as Record<string, unknown>;
  const print = sp.print === "1";
  const status = c.ffDone ? `Submitted ${fmtLong(c.ffDoneAt)}` : "Not yet submitted (draft answers)";

  if (print) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 print:max-w-none print:rounded-none print:p-0 print:shadow-none print:ring-0">
        <style>{PRINT_CSS}</style>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b-2 border-brand-600 pb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-700">Mustang Mortgage · Fact Find</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Fact Find — Case #{c.id}</h1>
            <p className="mt-0.5 text-sm text-slate-600">{c.title} · {status}</p>
          </div>
          <div className="print:hidden"><PrintButton /></div>
        </div>
        <Answers schema={schema} values={values} print />
        {c.ffSignatureTs && <p className="mt-4 inline-flex items-center gap-1.5 text-sm text-slate-500"><PenLine className="size-3.5" />Signed on {c.ffSignatureTs}</p>}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        icon={<FileText />}
        breadcrumbs={[{ label: "Fact Find History", href: "/admin/factfinds" }, { label: `Case #${c.id}` }]}
        title={`Fact Find — Case #${c.id}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span>{c.title}</span>
            {c.ffDone ? <Badge tone="success" dot>{status}</Badge> : <Badge tone="info" dot>{status}</Badge>}
          </span>
        }
        actions={
          <>
            <LinkButton variant="secondary" href={`/admin/cases/${c.id}#tab-forms`}><ArrowLeft />Back to case</LinkButton>
            <LinkButton variant="primary" target="_blank" href={`/admin/factfinds/case/${c.id}?print=1`}><Printer />Print</LinkButton>
          </>
        }
      />
      <Answers schema={schema} values={values} />
      {c.ffSignatureTs && <p className="mt-5 inline-flex items-center gap-1.5 text-sm text-slate-500"><PenLine className="size-3.5" />Signed on {c.ffSignatureTs}</p>}
    </div>
  );
}
