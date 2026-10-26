import { applicantNames, applicantSearch } from "@/modules/crm/applicants";
import Link from "next/link";
import { Eye, FileText, History, Paperclip, Printer, Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { FF_SECTIONS, groupKey, pretty } from "@/modules/crm/ff-history";
import { fmtDateTime } from "@/modules/crm/util";
import { Badge, Button, EmptyState, LinkButton, PageHeader, TBody, TD, TH, THead, TR, TabLinks, Table, TableWrap, Toolbar, buttonStyles, cn, inputStyles, selectStyles } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
type SP = Promise<Record<string, string | undefined>>;

export default async function FactFindsPage({ searchParams }: { searchParams: SP }) {
  await requireStaff();
  const sp = await searchParams;
  const legacy = sp.view === "legacy";
  return (
    <div>
      <PageHeader icon={<History />} title="Fact Find History" description="Client Fact Finds from the secure portal, and submissions of the website Fact Find form." />
      <TabLinks
        tabs={[
          { href: "/admin/factfinds", label: "Portal Fact Finds", active: !legacy },
          { href: "/admin/factfinds?view=legacy", label: "Website form submissions", active: legacy },
        ]}
      />
      {legacy ? <Legacy sel={Number(sp.fact_find_id || 0)} /> : <Portal q={sp.s ?? ""} />}
    </div>
  );
}

async function Portal({ q }: { q: string }) {
  const cases = await prisma.case.findMany({
    where: {
      OR: [{ ffDone: true }, { NOT: { ffDraft: { equals: {} } } }],
      ...(q ? { AND: [{ OR: [{ title: { contains: q, mode: "insensitive" } }, ...applicantSearch(q)] }] } : {}),
    },
    orderBy: [{ ffDoneAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
    take: 300,
  });
  const done = cases.filter((c) => c.ffDone).length;
  return (
    <div>
      <Toolbar>
        <form className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-1">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input name="s" defaultValue={q} placeholder="Search case or applicant…" aria-label="Search" className={cn(inputStyles, "!pl-9")} />
          </div>
          <Button variant="secondary">Search</Button>
          {q && <Link href="/admin/factfinds" className={buttonStyles({ variant: "ghost", size: "sm" })}>Clear</Link>}
        </form>
        <p className="px-1 text-xs tabular-nums text-slate-500 sm:ml-auto">
          <span className="font-semibold text-slate-700">{cases.length}</span> fact finds · <span className="font-semibold text-emerald-700">{done}</span> submitted · <span className="font-semibold text-sky-700">{cases.length - done}</span> in progress
        </p>
      </Toolbar>
      {cases.length ? (
        <TableWrap>
          <Table>
            <THead>
              <tr>
                <TH>Case</TH>
                <TH className="hidden md:table-cell">Applicants</TH>
                <TH className="hidden sm:table-cell">Status</TH>
                <TH className="hidden lg:table-cell">Submitted</TH>
                <TH className="text-right"><span className="sr-only">Actions</span></TH>
              </tr>
            </THead>
            <TBody>
              {cases.map((c) => {
                const status = c.ffDone ? <Badge tone="success" dot>Submitted</Badge> : <Badge tone="info" dot>In progress</Badge>;
                const apps = applicantNames(c);
                return (
                  <TR key={c.id}>
                    <TD className="min-w-[200px]">
                      <Link className="font-semibold text-slate-900 hover:text-brand-700" href={`/admin/cases/${c.id}#tab-forms`}>{c.title}</Link>
                      <div className="mt-0.5 text-xs text-slate-500 md:hidden">{apps}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 sm:hidden">{status}<span className="text-xs tabular-nums text-slate-500">{c.ffDoneAt ? fmtDateTime(c.ffDoneAt) : ""}</span></div>
                    </TD>
                    <TD className="hidden md:table-cell">{apps || <span className="text-slate-400">—</span>}</TD>
                    <TD className="hidden sm:table-cell">
                      {status}
                      <div className="mt-1 text-xs tabular-nums text-slate-500 lg:hidden">{c.ffDoneAt ? fmtDateTime(c.ffDoneAt) : ""}</div>
                    </TD>
                    <TD className="hidden whitespace-nowrap tabular-nums text-slate-500 lg:table-cell">{c.ffDoneAt ? fmtDateTime(c.ffDoneAt) : "—"}</TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-1">
                        <LinkButton variant="secondary" size="xs" href={`/admin/factfinds/case/${c.id}`}><Eye />View</LinkButton>
                        <LinkButton variant="ghost" size="xs" target="_blank" href={`/admin/factfinds/case/${c.id}?print=1`} aria-label="Print"><Printer /><span className="hidden sm:inline">Print</span></LinkButton>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </TableWrap>
      ) : (
        <EmptyState icon={<FileText />} title={q ? "No Fact Finds match your search." : "No Fact Finds yet."} description={q ? "Try a different name or case title." : "Fact Finds appear here once a client starts filling theirs in on the portal."} />
      )}
    </div>
  );
}

async function Legacy({ sel }: { sel: number }) {
  const subs = await prisma.factFindEntry.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, title: true } });
  const id = sel || subs[0]?.id || 0;
  const e = id ? await prisma.factFindEntry.findUnique({ where: { id } }) : null;
  const data = (e?.data ?? {}) as Record<string, unknown>;
  const buckets: Record<string, { label: string; val: string; img?: boolean; url?: string }[]> = {};
  if (e) {
    for (const [k, raw] of Object.entries(data)) {
      if (["_edit_lock", "_edit_last", "_snapshot_json"].includes(k)) continue;
      let val = pretty(raw);
      if (!val.trim()) continue;
      const b = groupKey(k);
      let url: string | undefined, img = false;
      if (val.startsWith("file:")) { url = `/api/admin/crm/files/${val.slice(5)}`; img = true; val = k; }
      else if (/^https?:\/\//.test(val)) { url = val; img = /\.(png|jpe?g|gif|webp)$/i.test(val); }
      (buckets[b] ||= []).push({ label: k.replace(/_/g, " ").replace(/\b\w/g, (x) => x.toUpperCase()), val, url, img });
    }
    const files = Array.isArray(e.files) ? (e.files as unknown[]) : [];
    for (const f of files) {
      const o = typeof f === "string" ? { url: f, name: f.split("/").pop() || f } : { url: `/api/admin/crm/files/${(f as { fileId: string }).fileId}`, name: (f as { name: string }).name };
      (buckets.documents ||= []).push({ label: "Uploaded File", val: o.name, url: o.url, img: /\.(png|jpe?g|gif|webp)$/i.test(o.name) });
    }
  }
  const meta: [string, string][] = [];
  for (const n of [1, 2, 3, 4]) if (data[`applicant${n}_fullname`]) meta.push([`Applicant ${n}`, pretty(data[`applicant${n}_fullname`])]);
  if (data.applicant_count) meta.push(["Applicants", pretty(data.applicant_count)]);
  const present = FF_SECTIONS.filter(([sid]) => buckets[sid]?.length);
  return (
    <div>
      <Toolbar>
        <form method="get" className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-1">
          <input type="hidden" name="view" value="legacy" />
          <select name="fact_find_id" defaultValue={id || ""} aria-label="Submission" className={cn(selectStyles, "min-w-0 flex-1 sm:max-w-md")}>
            <option value="">— Select Submission —</option>
            {subs.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
          <Button variant="secondary"><Eye />View</Button>
        </form>
        <p className="px-1 text-xs tabular-nums text-slate-500 sm:ml-auto"><span className="font-semibold text-slate-700">{subs.length}</span> submissions</p>
      </Toolbar>
      {e && (
        <>
          <div className="mb-6 rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Selected</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{e.title}</h2>
            {meta.length > 0 && (
              <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2">
                {meta.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-slate-500">{k}</dt>
                    <dd className="text-sm font-medium text-slate-900">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {present.length > 1 && (
              <nav className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-4">
                {present.map(([sid, label, , accent]) => (
                  <a key={sid} href={`#ff-${sid}`} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900">
                    <span className="size-2 rounded-full" style={{ background: accent }} />{label}
                    <span className="tabular-nums text-slate-400">{buckets[sid].length}</span>
                  </a>
                ))}
              </nav>
            )}
          </div>
          <div className="space-y-5">
            {present.map(([sid, label, head, accent]) => (
              <section key={sid} id={`ff-${sid}`} className="scroll-mt-24 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <header className="flex items-center gap-2.5 border-b border-slate-100 px-5 py-3" style={{ background: head }}>
                  <span className="h-4 w-1 rounded-full" style={{ background: accent }} />
                  <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
                  <span className="ml-auto text-xs tabular-nums text-slate-500">{buckets[sid].length}</span>
                </header>
                <dl className="-mb-px grid gap-x-8 px-5 sm:grid-cols-2 xl:grid-cols-3">
                  {buckets[sid].map((it, i) => (
                    <div key={i} className="min-w-0 border-b border-slate-100 py-3.5">
                      <dt className="text-xs font-medium capitalize text-slate-500">{it.label}</dt>
                      <dd className="mt-1 text-sm text-slate-900">
                        {it.img && it.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.url} alt="" className="mt-1 max-h-64 max-w-full rounded-lg ring-1 ring-slate-200" />
                        ) : it.url ? (
                          <a href={it.url} target="_blank" rel="noopener" className="inline-flex items-center gap-1 break-all font-medium text-brand-700 hover:underline"><Paperclip className="size-3.5 shrink-0" />{it.val}</a>
                        ) : (
                          <span className="block whitespace-pre-line break-words">{it.val}</span>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </>
      )}
      {!subs.length && <EmptyState icon={<FileText />} title="No submissions yet." description="Submissions of the website Fact Find form will appear here." />}
    </div>
  );
}
