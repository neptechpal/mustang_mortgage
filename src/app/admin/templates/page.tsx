import Link from "next/link";
import { ChevronRight, Mail, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { fmtDate } from "@/modules/crm/util";
import { EmptyState, LinkButton, PageHeader, TBody, TD, TH, THead, TR, Table, TableWrap } from "@/components/admin/ui";
import { WithTags } from "@/modules/crm/components/admin-kit";

export const dynamic = "force-dynamic";

/** Plain-text excerpt of an HTML body. */
function excerpt(html: string, n = 140) {
  const t = html.replace(/<(style|script)[\s\S]*?<\/\1>/gi, " ").replace(/<br\s*\/?>|<\/p>|<\/div>|<\/li>/gi, " ").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&rsquo;/g, "’").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n).trimEnd() + "…" : t;
}

export default async function TemplatesPage() {
  await requireStaff();
  const list = await prisma.emailTemplate.findMany({ orderBy: { title: "asc" } });
  return (
    <div>
      <PageHeader
        icon={<Mail />}
        title="Email Templates"
        description={<>Insert these into any case email. Placeholders like <code className="rounded bg-slate-100 px-1 font-mono text-xs text-slate-700">{"{{greeting_names}}"}</code> fill in from the case.</>}
        actions={<LinkButton href="/admin/templates/new" variant="primary"><Plus />Add New Template</LinkButton>}
      />
      {list.length ? (
        <TableWrap>
          <Table className="table-fixed">
            <THead>
              <tr>
                <TH className="w-auto md:w-[42%]">Template</TH>
                <TH className="hidden md:table-cell">Subject</TH>
                <TH className="hidden w-32 sm:table-cell">Updated</TH>
                <TH className="w-10"><span className="sr-only">Open</span></TH>
              </tr>
            </THead>
            <TBody>
              {list.map((t) => {
                let ex = excerpt(t.body, 220);
                // drop the leading heading when it just repeats the title/subject
                for (const h of [t.subject, t.title]) if (h && ex.toLowerCase().startsWith(h.toLowerCase())) { ex = ex.slice(h.length).trim(); break; }
                if (ex.length > 140) ex = ex.slice(0, 140).trimEnd() + "…";
                return (
                  <TR key={t.id} className="group relative">
                    <TD className="align-top">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 hidden size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100 sm:flex"><Mail className="size-4" /></span>
                        <div className="min-w-0">
                          <Link href={`/admin/templates/${t.id}`} className="font-semibold text-slate-900 after:absolute after:inset-0 group-hover:text-brand-700">{t.title}</Link>
                          <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-slate-500 md:hidden">
                            <span className="font-medium text-slate-600">Subject: </span>
                            {t.subject ? <WithTags text={t.subject} /> : <span className="text-slate-400">(uses title)</span>}
                          </p>
                          {ex && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">{ex}</p>}
                        </div>
                      </div>
                    </TD>
                    <TD className="hidden align-top text-[13px] text-slate-700 md:table-cell">
                      <p className="line-clamp-2 pt-0.5">{t.subject ? <WithTags text={t.subject} /> : <span className="text-slate-400">(uses title)</span>}</p>
                    </TD>
                    <TD className="hidden whitespace-nowrap align-top tabular-nums text-slate-500 sm:table-cell"><span className="pt-0.5 block">{fmtDate(t.updatedAt)}</span></TD>
                    <TD className="align-top text-right"><ChevronRight className="ml-auto mt-0.5 size-4 text-slate-300 transition-colors group-hover:text-brand-600" /></TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </TableWrap>
      ) : (
        <EmptyState
          icon={<Mail />}
          title="No templates yet."
          description="Save the emails you send often, with placeholders that fill in from the case."
          action={<LinkButton href="/admin/templates/new" variant="primary"><Plus />Add New Template</LinkButton>}
        />
      )}
    </div>
  );
}
