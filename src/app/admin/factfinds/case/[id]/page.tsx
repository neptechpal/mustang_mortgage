import { printSubmission, staffPrintUrl } from "@/modules/crm/forms/print";
import SubmissionPrint from "@/modules/crm/components/SubmissionPrint";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, PenLine, Printer } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { factFindSchema } from "@/modules/crm/forms/service";
import { fmtLong } from "@/modules/crm/util";
import { Badge, LinkButton, PageHeader } from "@/components/admin/ui";
import Answers from "./Answers";

export const dynamic = "force-dynamic";

// Fact Find answers view / print for one case.
export default async function CaseFactFind({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireStaff();
  const { id } = await params;
  const sp = await searchParams;
  const c = await prisma.case.findUnique({ where: { id: Number(id) } });
  if (!c) notFound();
  const { schema } = await factFindSchema();
  const values = (c.ffDraft ?? {}) as Record<string, unknown>;
  const print = sp.print === "1";
  const status = c.ffDone ? `Submitted ${fmtLong(c.ffDoneAt)}` : "Not yet submitted (draft answers)";

  if (print) {
    const data = await printSubmission(c, 'ff', sp.v);
    if (!data) notFound();
    return <SubmissionPrint data={data} printedBy={me.name} />;
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
            <LinkButton variant="primary" target="_blank" href={staffPrintUrl(c.id)}><Printer />Print</LinkButton>
          </>
        }
      />
      <Answers schema={schema} values={values} />
      {c.ffSignatureTs && <p className="mt-5 inline-flex items-center gap-1.5 text-sm text-slate-500"><PenLine className="size-3.5" />Signed on {c.ffSignatureTs}</p>}
    </div>
  );
}
