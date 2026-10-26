import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ChevronLeft, ChevronRight, ClipboardList, FileSignature, Inbox, Mail, MessageSquareText, Newspaper, Paperclip, Search, Trash2, X } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { Avatar, Badge, Button, EmptyState, LinkButton, PageHeader, Table, TableWrap, TBody, TD, TH, THead, TR, cn, inputStyles } from "@/components/admin/ui";
import { FORM_LABELS, submissionFiles } from "@/modules/site/forms/admin";
import { deleteSubmissionAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Form Submissions" };

const PER_PAGE = 50;
const fmt = (d: Date) =>
  new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", dateStyle: "medium", timeStyle: "short" }).format(d);

const FORM_ICONS: Record<string, typeof Inbox> = {
  "cf7:1767": MessageSquareText,
  "cf7:2651": ClipboardList,
  "cf7:2790": FileSignature,
  "mmf:3012": Mail,
  newsletter: Newspaper,
};

export default async function SubmissionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff();
  const sp = await searchParams;
  const form = sp.form || "";
  const q = (sp.q || "").trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.FormSubmissionWhereInput = {
    ...(form ? { formKey: form } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [rows, total, groups, unreadGroups] = await Promise.all([
    prisma.formSubmission.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.formSubmission.count({ where }),
    prisma.formSubmission.groupBy({ by: ["formKey"], _count: { _all: true } }),
    prisma.formSubmission.groupBy({ by: ["formKey"], where: { status: "new" }, _count: { _all: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const qs = (p: Record<string, string | number>) => {
    const u = new URLSearchParams({ ...(form ? { form } : {}), ...(q ? { q } : {}), ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)])) });
    return `/admin/submissions?${u}`;
  };
  const formHref = (k: string) => {
    const u = new URLSearchParams({ ...(k ? { form: k } : {}), ...(q ? { q } : {}) });
    const s = u.toString();
    return `/admin/submissions${s ? `?${s}` : ""}`;
  };
  const back = qs({ page });
  const countOf = (k: string) => groups.find((g) => g.formKey === k)?._count._all ?? 0;
  const unreadOf = (k: string) => unreadGroups.find((g) => g.formKey === k)?._count._all ?? 0;
  const allCount = groups.reduce((a, g) => a + g._count._all, 0);
  const allUnread = unreadGroups.reduce((a, g) => a + g._count._all, 0);
  const folders = [
    { key: "", label: "All forms", Icon: Inbox, count: allCount, unread: allUnread },
    ...Object.entries(FORM_LABELS).map(([k, v]) => ({ key: k, label: v, Icon: FORM_ICONS[k] ?? Inbox, count: countOf(k), unread: unreadOf(k) })),
  ];
  const from = total ? (page - 1) * PER_PAGE + 1 : 0;
  const to = Math.min(total, page * PER_PAGE);

  return (
    <div>
      <PageHeader
        icon={<Inbox />}
        title="Form submissions"
        description="Website forms: enquiry drawer, contact lead form, fact find, intake form, newsletter."
        actions={
          allUnread > 0 ? (
            <Badge tone="brand" dot>
              {allUnread} unread
            </Badge>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-[256px_minmax(0,1fr)]">
        {/* Form "folders" — horizontal scroller on mobile, sticky rail on desktop */}
        <nav aria-label="Filter by form" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 lg:overflow-visible">
          <p className="mb-2 hidden px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:block">Forms</p>
          <ul className="flex gap-1.5 lg:sticky lg:top-24 lg:flex-col lg:gap-0.5">
            {folders.map((f) => {
              const active = form === f.key;
              return (
                <li key={f.key || "all"} className="shrink-0">
                  <Link
                    href={formHref(f.key)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                      "border lg:border-0",
                      active
                        ? "border-brand-200 bg-brand-50 font-semibold text-brand-800 lg:bg-white lg:shadow-[0_1px_2px_rgba(15,23,42,0.06)] lg:ring-1 lg:ring-slate-200/80"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-white hover:text-slate-900 lg:bg-transparent",
                    )}
                  >
                    <f.Icon className={cn("size-4 shrink-0", active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-500")} />
                    <span className="whitespace-nowrap lg:min-w-0 lg:flex-1 lg:truncate" title={f.label}>
                      {f.label}
                    </span>
                    {f.unread > 0 && (
                      <span className="rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white tabular-nums" title={`${f.unread} unread`}>
                        {f.unread}
                      </span>
                    )}
                    <span className={cn("text-xs tabular-nums", active ? "text-brand-700" : "text-slate-400")}>{f.count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0">
          <form action="/admin/submissions" className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            {form && <input type="hidden" name="form" value={form} />}
            <div className="relative min-w-0 flex-1 basis-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input name="q" defaultValue={q} placeholder="Search name or email" aria-label="Search name or email" className={cn(inputStyles, "pl-9")} />
            </div>
            <Button type="submit" variant="secondary">
              Search
            </Button>
            {(q || form) && (
              <LinkButton href="/admin/submissions" variant="ghost">
                <X /> Clear
              </LinkButton>
            )}
            <span className="ml-auto hidden px-1 text-xs text-slate-500 tabular-nums sm:inline">
              {total ? `${from}–${to} of ${total}` : "0 results"}
            </span>
          </form>

          {rows.length === 0 ? (
            <EmptyState
              icon={<Inbox />}
              title="No submissions found"
              description={q || form ? "Nothing matches the current filters. Try another form or search term." : "Submissions from the website forms will appear here."}
              action={
                q || form ? (
                  <LinkButton href="/admin/submissions" variant="secondary" size="sm">
                    Clear filters
                  </LinkButton>
                ) : undefined
              }
            />
          ) : (
            <TableWrap>
              <Table>
                <THead>
                  <tr>
                    <TH className="hidden w-14 pr-0 sm:table-cell">#</TH>
                    <TH>Submitter</TH>
                    <TH className="hidden md:table-cell">Form</TH>
                    <TH className="hidden sm:table-cell">Received</TH>
                    <TH className="hidden w-16 sm:table-cell">Files</TH>
                    <TH className="w-12">
                      <span className="sr-only">Actions</span>
                    </TH>
                  </tr>
                </THead>
                <TBody>
                  {rows.map((r) => {
                    const unread = r.status === "new";
                    const nFiles = submissionFiles(r.files).length;
                    const label = FORM_LABELS[r.formKey] ?? r.formTitle;
                    return (
                      <TR key={r.id} className={cn("group", unread && "bg-brand-50/30")}>
                        <TD className="hidden pr-0 sm:table-cell">
                          <div className="flex items-center gap-2">
                            <span className={cn("size-2 shrink-0 rounded-full", unread ? "bg-brand-500" : "bg-transparent")} title={unread ? "Unread" : undefined} />
                            <Link href={`/admin/submissions/${r.id}`} className="text-xs font-medium text-slate-400 tabular-nums hover:text-brand-700">
                              {r.id}
                            </Link>
                          </div>
                        </TD>
                        <TD className="min-w-0">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="hidden sm:block">
                              <Avatar name={r.name || r.email || "?"} size="sm" />
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/admin/submissions/${r.id}`}
                                  className={cn("truncate hover:text-brand-700 hover:underline", unread ? "font-semibold text-slate-900" : "font-medium text-slate-700")}
                                >
                                  {r.name || "—"}
                                </Link>
                                {unread && (
                                  <Badge tone="brand" className="px-1.5 py-0 text-[10px] uppercase tracking-wide">
                                    New
                                  </Badge>
                                )}
                              </div>
                              <div className="truncate text-xs text-slate-500">
                                {r.email ? (
                                  <a href={`mailto:${r.email}`} className="hover:text-slate-800 hover:underline">
                                    {r.email}
                                  </a>
                                ) : (
                                  "—"
                                )}
                              </div>
                              <div className="mt-1.5 text-xs text-slate-600 md:hidden">{label}</div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400 tabular-nums sm:hidden">
                                <span>#{r.id}</span>
                                <span>{fmt(r.createdAt)}</span>
                                {nFiles > 0 && (
                                  <span className="inline-flex items-center gap-0.5">
                                    <Paperclip className="size-3" /> {nFiles}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TD>
                        <TD className="hidden max-w-[220px] md:table-cell">
                          <span className="block truncate text-slate-600" title={label}>
                            {label}
                          </span>
                        </TD>
                        <TD className={cn("hidden whitespace-nowrap tabular-nums sm:table-cell", unread ? "text-slate-800" : "text-slate-500")}>{fmt(r.createdAt)}</TD>
                        <TD className="hidden sm:table-cell">
                          {nFiles > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600 tabular-nums">
                              <Paperclip className="size-3" />
                              {nFiles}
                            </span>
                          )}
                        </TD>
                        <TD className="w-12 text-right align-top sm:align-middle">
                          <form action={deleteSubmissionAction}>
                            <input type="hidden" name="id" value={r.id} />
                            <input type="hidden" name="back" value={back} />
                            <Button variant="ghost" size="xs" className="text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete submission" aria-label={`Delete submission ${r.id}`}>
                              <Trash2 />
                            </Button>
                          </form>
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-500">
                <span className="tabular-nums">
                  Page {page} of {pages} · {total} submission{total === 1 ? "" : "s"}
                </span>
                {pages > 1 && (
                  <div className="flex gap-2">
                    {page > 1 ? (
                      <LinkButton href={qs({ page: page - 1 })} size="xs" variant="secondary">
                        <ChevronLeft /> Newer
                      </LinkButton>
                    ) : (
                      <Button size="xs" variant="secondary" disabled>
                        <ChevronLeft /> Newer
                      </Button>
                    )}
                    {page < pages ? (
                      <LinkButton href={qs({ page: page + 1 })} size="xs" variant="secondary">
                        Older <ChevronRight />
                      </LinkButton>
                    ) : (
                      <Button size="xs" variant="secondary" disabled>
                        Older <ChevronRight />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </TableWrap>
          )}
        </div>
      </div>
    </div>
  );
}
