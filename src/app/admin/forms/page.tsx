import Link from "next/link";
import { ClipboardList, Copy, FileCheck2, Globe, Pencil, Plus, Send, Star, Trash2, Undo2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { duplicateFormAction, setFfFormAction, trashFormAction } from "@/modules/crm/actions";
import { getFfFormId, setFfFormId } from "@/modules/crm/options";
import { countFields } from "@/modules/crm/forms/engine";
import { formSchema } from "@/modules/crm/forms/service";
import { fmtDate } from "@/modules/crm/util";
import { Badge, EmptyState, LinkButton, PageHeader, TBody, TD, TH, THead, TR, Table, TableWrap, buttonStyles, cn } from "@/components/admin/ui";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function unsetFf() {
  "use server";
  const { requireAdmin } = await import("@/lib/session");
  await requireAdmin();
  await setFfFormId(0);
  revalidatePath("/admin/forms");
}

const rowAction = cn(buttonStyles({ variant: "ghost", size: "xs" }), "!px-1.5 font-medium text-slate-500");

export default async function FormsPage() {
  const s = await requireStaff();
  const [forms, ffId] = await Promise.all([prisma.crmForm.findMany({ where: { status: { not: "trash" } }, orderBy: { title: "asc" } }), getFfFormId()]);
  const ff = forms.find((f) => f.id === ffId);
  return (
    <div>
      <PageHeader
        icon={<ClipboardList />}
        title="Forms"
        description="Build any form, then send it to clients from the case screen (Forms tab), or publish it as a public lead form."
        actions={<LinkButton href="/admin/forms/new" variant="primary"><Plus />New form</LinkButton>}
      />

      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset", ff ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-500 ring-slate-200")}>
          <FileCheck2 className="size-5" />
        </span>
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-slate-900">Client Fact Find</p>
          <p className="mt-0.5 text-slate-500">
            {ff ? (
              <>Your clients currently fill in <Link className="font-medium text-brand-700 hover:underline" href={`/admin/forms/${ff.id}`}>{ff.title}</Link> as the Fact Find.</>
            ) : (
              <>The classic built-in Fact Find is active. Pick a form and choose <em>Use as Fact Find</em> to make it editable.</>
            )}
          </p>
        </div>
        {ff && s.role === "ADMIN" && (
          <form action={unsetFf} className="shrink-0">
            <button className={buttonStyles({ variant: "secondary", size: "sm" })}><Undo2 />Switch back to the classic Fact Find</button>
          </form>
        )}
      </div>

      {forms.length ? (
        <TableWrap>
          <Table>
            <THead>
              <tr>
                <TH>Form</TH>
                <TH className="hidden w-px md:table-cell">Used as</TH>
                <TH className="hidden w-px sm:table-cell">Fields</TH>
                <TH className="hidden lg:table-cell">How to use</TH>
                <TH className="hidden w-px md:table-cell">Updated</TH>
              </tr>
            </THead>
            <TBody>
              {forms.map((f) => {
                const sc = formSchema(f);
                const used = f.id === ffId ? <Badge tone="success" dot>Fact Find</Badge> : sc.settings.public ? <Badge tone="info" dot>Public lead form</Badge> : <Badge tone="neutral" dot>Send to client</Badge>;
                return (
                  <TR key={f.id} className="group align-top">
                    <TD className="min-w-[240px]">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 hidden size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 sm:flex">
                          {sc.settings.public ? <Globe className="size-4" /> : <ClipboardList className="size-4" />}
                        </span>
                        <div className="min-w-0">
                          <Link className="font-semibold text-slate-900 hover:text-brand-700" href={`/admin/forms/${f.id}`}>{f.title}</Link>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 md:hidden">
                            {used}
                            <span className="text-xs tabular-nums text-slate-500 sm:hidden">{countFields(sc)} fields · {sc.sections.length} sections</span>
                          </div>
                          <div className="-ml-1.5 mt-1.5 flex flex-wrap items-center gap-0.5">
                            <Link href={`/admin/forms/${f.id}`} className={rowAction}><Pencil />Edit</Link>
                            <form action={duplicateFormAction.bind(null, f.id)}><button className={rowAction}><Copy />Duplicate</button></form>
                            {f.id !== ffId && s.role === "ADMIN" && <form action={setFfFormAction.bind(null, f.id)}><button className={rowAction}><Star />Use as Fact Find</button></form>}
                            <form action={trashFormAction.bind(null, f.id)}><button className={cn(rowAction, "hover:!bg-red-50 hover:!text-red-600")}><Trash2 />Trash</button></form>
                          </div>
                        </div>
                      </div>
                    </TD>
                    <TD className="hidden pt-3.5 md:table-cell">{used}</TD>
                    <TD className="hidden whitespace-nowrap pt-3.5 tabular-nums text-slate-600 sm:table-cell">
                      <span className="font-medium text-slate-900">{countFields(sc)}</span> fields <span className="text-slate-300">·</span> {sc.sections.length} sections
                    </TD>
                    <TD className="hidden pt-3.5 text-[13px] text-slate-600 lg:table-cell">
                      {sc.settings.public ? (
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-700 ring-1 ring-inset ring-slate-200">/portal/form/{f.id}</code>
                          <span className="text-xs text-slate-500">(public link)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-start gap-1.5"><Send className="mt-0.5 size-3.5 shrink-0 text-slate-400" /><span>Open a case → <em>Forms</em> tab → Send</span></span>
                      )}
                    </TD>
                    <TD className="hidden whitespace-nowrap pt-3.5 tabular-nums text-slate-500 md:table-cell">{fmtDate(f.updatedAt)}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </TableWrap>
      ) : (
        <EmptyState
          icon={<ClipboardList />}
          title="No forms yet."
          description="Create your first form — pick fields or ready-made sections and send it to clients."
          action={<LinkButton href="/admin/forms/new" variant="primary"><Plus />New form</LinkButton>}
        />
      )}
    </div>
  );
}
