import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Bot, Database, ExternalLink, FileText, Filter, Plus, X } from "lucide-react";
import { prisma } from "@/lib/db";
import { Badge, Button, EmptyState, LinkButton, Select, Table, TableWrap, TBody, TD, TH, THead, Toolbar, TR, cn } from "@/components/admin/ui";
import { BASE, SOURCE_KINDS, STATUSES, fmtDate, sourceKindLabel } from "../meta";
import { StatusBadge } from "./parts";

export async function SourcesTab({ sp }: { sp: Record<string, string | undefined> }) {
  const where: Prisma.ScnSourceWhereInput = {};
  const st = sp.status || "current";
  if (st === "current") where.status = { in: ["draft", "published"] };
  else if (st !== "all") where.status = st;
  if (sp.kind) where.kind = sp.kind;
  if (sp.lender === "panel") where.lenderId = null;
  else if (Number(sp.lender)) where.lenderId = Number(sp.lender);
  const [rows, lenders, ruleUse, priceUse] = await Promise.all([
    prisma.scnSource.findMany({ where, orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 500 }),
    prisma.scnLender.findMany({ orderBy: [{ sort: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    prisma.scnPolicyRule.groupBy({ by: ["sourceId"], where: { status: "published" }, _count: { _all: true } }),
    prisma.scnPriceRecord.groupBy({ by: ["sourceId"], where: { status: "published" }, _count: { _all: true } }),
  ]);
  const lname = new Map(lenders.map((l) => [l.id, l.name]));
  const use = (id: number) => (ruleUse.find((u) => u.sourceId === id)?._count._all ?? 0) + (priceUse.find((u) => u.sourceId === id)?._count._all ?? 0);
  const filtered = st !== "current" || sp.kind || sp.lender;

  return (
    <div>
      <form action={BASE} className="contents">
        <input type="hidden" name="tab" value="sources" />
        <Toolbar>
          <Filter className="ml-1 hidden size-4 text-slate-400 sm:block" />
          <Select name="status" defaultValue={st} aria-label="Status" className="w-full sm:w-auto sm:min-w-36 sm:max-w-60">
            <option value="current">Draft + published</option>
            {STATUSES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            <option value="all">All statuses</option>
          </Select>
          <Select name="kind" defaultValue={sp.kind ?? ""} aria-label="Kind" className="w-full sm:w-auto sm:min-w-44 sm:max-w-60">
            <option value="">All kinds</option>
            {SOURCE_KINDS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Select name="lender" defaultValue={sp.lender ?? ""} aria-label="Lender" className="w-full sm:w-auto sm:min-w-40 sm:max-w-60">
            <option value="">All lenders</option>
            <option value="panel">Panel-wide only</option>
            {lenders.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
          <Button type="submit" variant="secondary">Apply</Button>
          {filtered && <LinkButton href={`${BASE}?tab=sources`} variant="ghost"><X />Clear</LinkButton>}
          <span className="ml-auto px-1 text-xs text-slate-500 tabular-nums">{rows.length} source{rows.length === 1 ? "" : "s"}</span>
        </Toolbar>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title={filtered ? "No sources match" : "No sources registered"}
          description="Every rule and price record must cite authorised material: a lender guide, rate sheet, aggregator data, public product page or a written BDM confirmation."
          action={<LinkButton href={`${BASE}/sources/new`} variant="primary" size="sm"><Plus />Register source</LinkButton>}
        />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <tr>
                <TH>Source</TH>
                <TH className="hidden md:table-cell">Lender</TH>
                <TH className="hidden sm:table-cell">Permissions</TH>
                <TH className="hidden lg:table-cell">Received</TH>
                <TH className="hidden lg:table-cell text-right">In use</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((s) => (
                <TR key={s.id}>
                  <TD className="min-w-0">
                    <Link href={`${BASE}/sources/${s.id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">{s.title}</Link>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <span>{sourceKindLabel(s.kind)}</span>
                      {s.reference && <span>· {s.reference}</span>}
                      {s.caseId && <Badge tone="violet" className="py-0 text-[10px]">Case #{s.caseId}</Badge>}
                      {s.fileId && <FileText className="size-3.5 text-slate-400" aria-label="File attached" />}
                      {s.url && <ExternalLink className="size-3.5 text-slate-400" aria-label="Has URL" />}
                    </div>
                  </TD>
                  <TD className="hidden md:table-cell text-sm">{s.lenderId ? lname.get(s.lenderId) ?? `#${s.lenderId}` : <span className="text-slate-500">Panel-wide</span>}</TD>
                  <TD className="hidden sm:table-cell">
                    <div className="flex gap-1.5">
                      <PermPill on={s.permStore} icon={<Database className="size-3" />} label="Store" />
                      <PermPill on={s.permAi} icon={<Bot className="size-3" />} label="AI" />
                    </div>
                  </TD>
                  <TD className="hidden lg:table-cell text-xs tabular-nums text-slate-600">{fmtDate(s.receivedAt) || "—"}</TD>
                  <TD className="hidden lg:table-cell text-right text-xs tabular-nums text-slate-600">{use(s.id) || "—"}</TD>
                  <TD><StatusBadge status={s.status} /></TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      )}
    </div>
  );
}

function PermPill({ on, icon, label }: { on: boolean; icon: React.ReactNode; label: string }) {
  return (
    <span
      title={`${label} permission ${on ? "confirmed" : "not confirmed"}`}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        on ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-50 text-slate-400 ring-slate-200 line-through decoration-slate-300",
      )}
    >
      {icon}
      {label}
    </span>
  );
}
