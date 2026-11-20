import Link from "next/link";
import { Filter, ListChecks, Plus, Search, X } from "lucide-react";
import { Badge, Button, EmptyState, Input, LinkButton, Select, Table, TableWrap, TBody, TD, TH, THead, Toolbar, TR, checkboxStyles, cn } from "@/components/admin/ui";
import { CATEGORIES, CHECKS } from "../checks";
import { categoryLabel, listRules, loadLookups } from "../data";
import { BASE, STATUSES, fmtDate, recordFlags } from "../meta";
import { FlagBadges, ParamsInline, StatusBadge } from "./parts";

export async function RulesTab({ sp }: { sp: Record<string, string | undefined> }) {
  const f = { lender: sp.lender, category: sp.category, status: sp.status, due: sp.due, q: sp.q?.trim() };
  const [rows, lk] = await Promise.all([listRules(f), loadLookups()]);
  const filtered = Boolean(f.lender || f.category || (f.status && f.status !== "current") || f.due || f.q);
  // Mirrors the engine: published panel-wide rules of a lender with the same check (+ income component)
  // and segment are alternatives — differing answers are reported as a conflict.
  const altKey = (r: (typeof rows)[number]) =>
    `${r.lenderId}|${r.check}|${r.check === "income" ? String((r.params as Record<string, unknown>)?.component ?? "") : ""}|${r.segment.trim().toLowerCase()}`;
  const alts = new Map<string, Set<string>>();
  for (const r of rows) if (r.status === "published" && r.caseId === null) alts.set(altKey(r), (alts.get(altKey(r)) ?? new Set()).add(r.ruleKey));
  const now = new Date();

  return (
    <div>
      <form action={BASE} className="contents">
        <input type="hidden" name="tab" value="rules" />
        <Toolbar>
          <div className="relative min-w-0 flex-1 basis-full sm:basis-48">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input name="q" defaultValue={f.q ?? ""} placeholder="Search statement, segment or key" aria-label="Search rules" className="pl-9" />
          </div>
          <Select name="lender" defaultValue={f.lender ?? ""} aria-label="Lender" className="w-full sm:w-auto sm:min-w-36 sm:max-w-60">
            <option value="">All lenders</option>
            {lk.lenders.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
          <Select name="category" defaultValue={f.category ?? ""} aria-label="Category" className="w-full sm:w-auto sm:min-w-40 sm:max-w-60">
            <option value="">All categories</option>
            {CATEGORIES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          <Select name="status" defaultValue={f.status || "current"} aria-label="Status" className="w-full sm:w-auto sm:min-w-36 sm:max-w-60">
            <option value="current">Draft + published</option>
            {STATUSES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            <option value="all">All versions</option>
          </Select>
          <label className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700">
            <input type="checkbox" name="due" value="1" defaultChecked={f.due === "1"} className={checkboxStyles} />
            Review due
          </label>
          <Button type="submit" variant="secondary"><Filter />Apply</Button>
          {filtered && <LinkButton href={`${BASE}?tab=rules`} variant="ghost"><X />Clear</LinkButton>}
          <span className="ml-auto px-1 text-xs text-slate-500 tabular-nums">{rows.length} version{rows.length === 1 ? "" : "s"}</span>
        </Toolbar>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={<ListChecks />}
          title={filtered ? "No rules match these filters" : "No policy rules yet"}
          description={filtered ? "Try clearing a filter." : "Each rule picks a structured check, cites a source and is published by an admin before assessments use it."}
          action={<LinkButton href={`${BASE}/rules/new`} variant="primary" size="sm"><Plus />New rule</LinkButton>}
        />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <tr>
                <TH className="sm:min-w-[280px]">Rule</TH>
                <TH className="hidden md:table-cell">Lender · segment</TH>
                <TH className="hidden xl:table-cell">Source</TH>
                <TH className="hidden w-36 lg:table-cell">Verified</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((r) => {
                const src = lk.sourceById.get(r.sourceId);
                const flags = recordFlags({ ...r, sourceStatus: src?.status ?? null, sourcePermStore: src?.permStore ?? null }, now).filter((x) => x.key !== "draft");
                const nAlt = r.status === "published" && r.caseId === null ? (alts.get(altKey(r))?.size ?? 1) : 1;
                const prod = r.productId ? lk.productById.get(r.productId) : null;
                return (
                  <TR key={r.id} className={cn("align-top", r.status === "superseded" || r.status === "withdrawn" ? "opacity-70" : "")}>
                    <TD className="align-top">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs">
                        <Badge tone="neutral" className="text-[11px]">{categoryLabel(r.category)}</Badge>
                        {(CHECKS[r.check]?.label ?? r.check) !== categoryLabel(r.category) && <span className="font-medium text-slate-700">{CHECKS[r.check]?.label ?? r.check}</span>}
                        {r.caseId && <Badge tone="violet" className="text-[11px]">Case #{r.caseId}</Badge>}
                        {nAlt > 1 && <Badge tone="warning" className="text-[11px]">{nAlt} alternatives</Badge>}
                      </div>
                      <Link href={`${BASE}/rules/${r.id}`} className="mt-1 line-clamp-2 text-sm font-medium text-slate-900 hover:text-brand-700 hover:underline">{r.statement}</Link>
                      <ParamsInline check={r.check} params={r.params} className="mt-1 line-clamp-2" />
                      <div className="mt-1 text-xs text-slate-500 md:hidden">
                        {lk.lenderById.get(r.lenderId)?.name} · {r.segment}
                      </div>
                      {flags.length > 0 && <div className="mt-2"><FlagBadges flags={flags} max={3} /></div>}
                    </TD>
                    <TD className="hidden align-top md:table-cell">
                      <div className="text-sm font-medium text-slate-800">{lk.lenderById.get(r.lenderId)?.name ?? `#${r.lenderId}`}</div>
                      <div className="text-xs text-slate-500">{prod ? prod.name : "All products"}</div>
                      <div className="mt-1 text-xs text-slate-600">Segment: <span className="font-medium">{r.segment}</span></div>
                    </TD>
                    <TD className="hidden max-w-[220px] align-top xl:table-cell">
                      <div className="truncate text-xs text-slate-700" title={src?.title}>{src?.title ?? `#${r.sourceId}`}</div>
                      <div className="truncate text-xs text-slate-500">{r.sourceSection || src?.reference}</div>
                    </TD>
                    <TD className="hidden w-36 align-top text-xs tabular-nums lg:table-cell">
                      {r.verifiedAt ? <div className="whitespace-nowrap text-slate-700">{fmtDate(r.verifiedAt)}</div> : <span className="text-amber-700">Never</span>}
                      {r.reviewer && <div className="max-w-36 truncate text-slate-500" title={r.reviewer}>{r.reviewer}</div>}
                      {r.reviewDue && <div className="mt-1 whitespace-nowrap text-slate-500">Review {fmtDate(r.reviewDue)}</div>}
                    </TD>
                    <TD className="align-top">
                      <StatusBadge status={r.status} />
                      <div className="mt-1 font-mono text-[11px] text-slate-400"><span className="hidden sm:inline">{r.ruleKey} </span>v{r.version}</div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </TableWrap>
      )}
    </div>
  );
}
