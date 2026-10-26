import Link from "next/link";
import type { Prisma, Role } from "@prisma/client";
import { Check, ChevronLeft, ChevronRight, Pencil, Search, Settings2, UserPlus, Users, X } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { Avatar, Badge, Button, EmptyState, LinkButton, PageHeader, Table, TableWrap, TabLinks, TBody, TD, TH, THead, TR, cn, inputStyles, selectStyles } from "@/components/admin/ui";
import { adminSetStatus } from "@/modules/members/admin-actions";
import { Flash, RoleBadge, STATUS_SHORT, StatusPill, btnOkXs, sp1 } from "@/modules/members/components/AdminUi";
import { getProfile, STATUS_LABELS } from "@/modules/members/profile";

export const metadata = { title: "Users" };
export const dynamic = "force-dynamic";

const PER_PAGE = 25;
const fmt = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", dateStyle: "medium" });

export default async function UsersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const q = sp1(sp.q).trim();
  const status = sp1(sp.status);
  const role = sp1(sp.role) as Role | "";
  const page = Math.max(1, parseInt(sp1(sp.page) || "1", 10) || 1);

  const where: Prisma.UserWhereInput = {
    ...(q
      ? {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { displayName: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(status ? { status } : {}),
    ...(role && ["ADMIN", "STAFF", "MEMBER"].includes(role) ? { role } : {}),
  };

  const [total, users, counts] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.user.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const all = counts.reduce((a, c) => a + c._count._all, 0);
  const link = (patch: Record<string, string>) => {
    const u = new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), ...(role ? { role } : {}), ...patch });
    for (const [k, v] of [...u.entries()]) if (!v) u.delete(k);
    return `/admin/users?${u.toString()}`;
  };
  const awaiting = countOf("pending") + countOf("checkmail");
  const from = total ? (page - 1) * PER_PAGE + 1 : 0;
  const to = Math.min(total, page * PER_PAGE);

  return (
    <div>
      <PageHeader
        icon={<Users />}
        title="Users"
        description="Website members, staff and administrators."
        actions={
          <>
            <LinkButton href="/admin/users/settings" variant="secondary">
              <Settings2 /> Membership settings
            </LinkButton>
            <LinkButton href="/admin/users/new" variant="primary">
              <UserPlus /> Add New User
            </LinkButton>
          </>
        }
      />
      <Flash msg={sp1(sp.msg)} error={sp1(sp.error)} />

      {countOf("pending") > 0 && status !== "pending" && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span>
            <strong className="font-semibold">{countOf("pending")}</strong> membership{countOf("pending") === 1 ? "" : "s"} waiting for administrator review.
          </span>
          <LinkButton href={link({ status: "pending", page: "" })} size="sm" variant="secondary">
            Review now
          </LinkButton>
        </div>
      )}

      <TabLinks
        className="mb-4"
        tabs={[
          { href: link({ status: "", page: "" }), label: "All", count: all, active: !status },
          ...["approved", "pending", "checkmail", "rejected", "inactive"].map((s) => ({
            href: link({ status: s, page: "" }),
            label: <span title={STATUS_LABELS[s]}>{STATUS_SHORT[s]}</span>,
            count: countOf(s),
            active: status === s,
          })),
        ]}
      />

      <form className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-white p-2.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]" method="get" action="/admin/users">
        <div className="relative min-w-0 flex-1 basis-60">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={q} placeholder="Search username, name or e-mail" aria-label="Search username, name or e-mail" className={cn(inputStyles, "pl-9")} />
        </div>
        <select name="role" defaultValue={role} aria-label="Role" className={cn(selectStyles, "!w-auto min-w-[150px]")}>
          <option value="">All roles</option>
          <option value="ADMIN">Administrator</option>
          <option value="STAFF">Staff</option>
          <option value="MEMBER">Member</option>
        </select>
        {status && <input type="hidden" name="status" value={status} />}
        <Button type="submit" variant="secondary">
          Search Users
        </Button>
        {(q || role) && (
          <LinkButton href={status ? `/admin/users?status=${status}` : "/admin/users"} variant="ghost">
            <X /> Clear
          </LinkButton>
        )}
      </form>

      {users.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No users found"
          description={q || role || status ? "Nothing matches the current filters." : "Users who register on the website appear here."}
          action={
            <LinkButton href="/admin/users/new" variant="secondary" size="sm">
              <UserPlus /> Add New User
            </LinkButton>
          }
        />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <tr>
                <TH>User</TH>
                <TH className="hidden lg:table-cell">E-mail</TH>
                <TH className="hidden sm:table-cell">Role</TH>
                <TH className="hidden sm:table-cell">Status</TH>
                <TH className="hidden md:table-cell">Registered</TH>
                <TH className="hidden xl:table-cell">Last login</TH>
                <TH>
                  <span className="sr-only">Actions</span>
                </TH>
              </tr>
            </THead>
            <TBody>
              {users.map((u) => {
                const p = getProfile(u);
                const name = u.displayName || `${u.firstName} ${u.lastName}`.trim();
                const awaitingUser = u.id !== me.uid && (u.status === "pending" || u.status === "checkmail");
                return (
                  <TR key={u.id} className={cn(awaitingUser && "bg-amber-50/30")}>
                    <TD>
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar name={name || u.username} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Link href={`/admin/users/${u.id}`} className="truncate font-medium text-slate-900 hover:text-brand-700 hover:underline">
                              {name || u.username}
                            </Link>
                            {u.id === me.uid && (
                              <Badge tone="brand" className="px-1.5 py-0 text-[10px]">
                                You
                              </Badge>
                            )}
                          </div>
                          <div className="truncate text-xs text-slate-500">@{u.username}</div>
                          <div className="truncate text-xs text-slate-500 lg:hidden">{u.email}</div>
                          <div className="mt-1.5 flex flex-wrap gap-1 sm:hidden">
                            <RoleBadge role={u.role} />
                            <StatusPill status={u.status} />
                          </div>
                        </div>
                      </div>
                    </TD>
                    <TD className="hidden lg:table-cell">
                      <a href={`mailto:${u.email}`} className="text-slate-600 hover:text-slate-900 hover:underline">
                        {u.email}
                      </a>
                    </TD>
                    <TD className="hidden sm:table-cell">
                      <RoleBadge role={u.role} />
                    </TD>
                    <TD className="hidden sm:table-cell">
                      <StatusPill status={u.status} />
                    </TD>
                    <TD className="hidden whitespace-nowrap text-slate-600 tabular-nums md:table-cell">{fmt.format(u.createdAt)}</TD>
                    <TD className="hidden whitespace-nowrap text-slate-600 tabular-nums xl:table-cell">{p.lastLogin ? fmt.format(new Date(p.lastLogin)) : <span className="text-slate-400">—</span>}</TD>
                    <TD>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {awaitingUser && (
                          <>
                            <form action={adminSetStatus}>
                              <input type="hidden" name="id" value={u.id} />
                              <input type="hidden" name="status" value="approved" />
                              <input type="hidden" name="return" value="list" />
                              <button className={btnOkXs}>
                                <Check /> Approve
                              </button>
                            </form>
                            <form action={adminSetStatus}>
                              <input type="hidden" name="id" value={u.id} />
                              <input type="hidden" name="status" value="rejected" />
                              <input type="hidden" name="return" value="list" />
                              <Button variant="danger" size="xs">
                                <X /> Reject
                              </Button>
                            </form>
                          </>
                        )}
                        <LinkButton href={`/admin/users/${u.id}`} variant="ghost" size="xs" aria-label={`Edit ${u.username}`}>
                          <Pencil /> <span className="hidden sm:inline">Edit</span>
                        </LinkButton>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-500">
            <span className="tabular-nums">
              {from}–{to} of {total} user{total === 1 ? "" : "s"}
              {awaiting > 0 && !status ? ` · ${awaiting} awaiting approval` : ""}
            </span>
            {pages > 1 && (
              <div className="flex items-center gap-2">
                {page > 1 && (
                  <LinkButton href={link({ page: String(page - 1) })} variant="secondary" size="xs">
                    <ChevronLeft /> Prev
                  </LinkButton>
                )}
                <span className="tabular-nums">
                  Page {page} of {pages}
                </span>
                {page < pages && (
                  <LinkButton href={link({ page: String(page + 1) })} variant="secondary" size="xs">
                    Next <ChevronRight />
                  </LinkButton>
                )}
              </div>
            )}
          </div>
        </TableWrap>
      )}
    </div>
  );
}
