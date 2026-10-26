// Cross-case Email Trail: every message sent from the CRM or matched by the 10-minute Zoho sync.
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, ExternalLink, FlaskConical, Mail, Search, Settings2, Stethoscope } from "lucide-react";
import { Badge, Button, EmptyState, inputStyles, LinkButton, PageHeader, selectStyles, Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/admin/ui";
import { ymdHi } from "@/modules/crm-extra/lib/cases";

export const metadata = { title: "Email Trail" };
export const dynamic = "force-dynamic";

const PER = 50;

export default async function TrailPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requireStaff();
  const sp = await searchParams;
  const dir = sp.dir === "in" || sp.dir === "out" ? sp.dir : "";
  const q = (sp.q ?? "").trim();
  const caseId = Number(sp.case || 0);
  const page = Math.max(1, Number(sp.page || 1));
  const where = {
    ...(dir ? { direction: dir } : {}),
    ...(caseId ? { caseId } : {}),
    ...(q
      ? {
          OR: [
            { subject: { contains: q, mode: "insensitive" as const } },
            { fromAddr: { contains: q, mode: "insensitive" as const } },
            { toAddrs: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.caseEmail.findMany({ where, orderBy: { sentAt: "desc" }, skip: (page - 1) * PER, take: PER }),
    prisma.caseEmail.count({ where }),
  ]);
  const cases = await prisma.case.findMany({ where: { id: { in: Array.from(new Set(rows.map((r) => r.caseId))) } }, select: { id: true, title: true } });
  const titles = new Map(cases.map((c) => [c.id, c.title || `Case #${c.id}`]));
  const pages = Math.max(1, Math.ceil(total / PER));
  const qs = (p: number) => new URLSearchParams({ ...(dir ? { dir } : {}), ...(q ? { q } : {}), ...(caseId ? { case: String(caseId) } : {}), page: String(p) }).toString();
  return (
    <div>
      <PageHeader
        icon={<Mail />}
        title="Email Trail"
        description="Messages sent from the CRM and client emails matched to cases by the 10-minute Zoho sync ([MM#id] tag, conversation, message id or contact email)."
        actions={
          s.role === "ADMIN" && (
            <>
              <LinkButton variant="secondary" href="/admin/zoho">
                <Settings2 /> Zoho settings
              </LinkButton>
              <LinkButton variant="secondary" href="/admin/zoho/trail-test">
                <FlaskConical /> Trail Test
              </LinkButton>
              <LinkButton variant="secondary" href="/admin/diagnostics">
                <Stethoscope /> Diagnostics
              </LinkButton>
            </>
          )
        }
      />
      <form className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:flex md:flex-wrap md:items-center">
        <div className="relative col-span-2 md:min-w-64 md:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={q} placeholder="Search subject or address…" aria-label="Search" className={`${inputStyles} pl-9`} />
        </div>
        <select name="dir" defaultValue={dir} aria-label="Direction" className={`${selectStyles} md:w-40`}>
          <option value="">All directions</option>
          <option value="in">Inbound</option>
          <option value="out">Outbound</option>
        </select>
        <input name="case" type="number" defaultValue={caseId || ""} placeholder="Case #" aria-label="Case #" className={`${inputStyles} md:w-28`} />
        <Button variant="primary" className="col-span-2 md:col-span-1">
          Apply
        </Button>
      </form>
      {rows.length === 0 ? (
        <EmptyState icon={<Mail />} title="No email activity yet." description="Sent and synced emails will show up here." />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <tr>
                <TH>When</TH>
                <TH>Dir</TH>
                <TH>Subject</TH>
                <TH>From / To</TH>
                <TH>Case</TH>
                <TH className="text-right" aria-label="View" />
              </tr>
            </THead>
            <TBody>
              {rows.map((e) => (
                <TR key={e.id}>
                  <TD className="whitespace-nowrap text-xs text-slate-500 tabular-nums">{ymdHi(e.sentAt)}</TD>
                  <TD>
                    {e.direction === "in" ? (
                      <Badge tone="success">
                        <ArrowDownLeft className="size-3" /> IN
                      </Badge>
                    ) : (
                      <Badge tone="violet">
                        <ArrowUpRight className="size-3" /> OUT
                      </Badge>
                    )}
                  </TD>
                  <TD className="min-w-[220px] font-medium text-slate-900">{e.subject || <span className="font-normal text-slate-400">(no subject)</span>}</TD>
                  <TD className="max-w-[260px] truncate text-xs text-slate-500">{e.direction === "in" ? e.fromAddr : e.toAddrs}</TD>
                  <TD className="min-w-[180px]">
                    <Link href={`/admin/cases/${e.caseId}`} className="text-[13px] font-medium text-brand-700 hover:text-brand-800 hover:underline">
                      {titles.get(e.caseId) ?? `Case #${e.caseId}`}
                    </Link>
                  </TD>
                  <TD className="text-right">
                    <a className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50" href={`/api/admin/x/email/view?id=${e.id}`} target="_blank">
                      <ExternalLink className="size-3.5" /> View
                    </a>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <span className="tabular-nums">
          <b className="font-semibold text-slate-900">{total}</b> messages
        </span>
        <span className="ml-auto tabular-nums">
          Page {page} / {pages}
        </span>
        {page > 1 && (
          <LinkButton size="sm" variant="secondary" href={`/admin/trail?${qs(page - 1)}`}>
            <ChevronLeft /> Prev
          </LinkButton>
        )}
        {page < pages && (
          <LinkButton size="sm" variant="secondary" href={`/admin/trail?${qs(page + 1)}`}>
            Next <ChevronRight />
          </LinkButton>
        )}
      </div>
    </div>
  );
}
