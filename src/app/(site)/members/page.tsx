import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession, isStaff } from "@/lib/session";
import { Avatar, Notice } from "@/modules/members/components/fields";
import { avatarUrl, displayNameOf, getProfile, profileUrl } from "@/modules/members/profile";
import { getMembersSettings } from "@/modules/members/settings";

export const metadata: Metadata = { title: "Members" };
export const dynamic = "force-dynamic";

// UM member directory (um_directory 17): grid view, newest registered first,
// 12 per page, profile photo + name, header "{total_users} Members".
export default async function MembersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const [s, session] = await Promise.all([getMembersSettings(), getSession()]);
  const d = s.directory;

  if (d.visibleTo === "members" && !session) redirect("/login?redirect_to=/members");
  if (d.visibleTo === "staff" && !isStaff(session?.role)) redirect("/login?redirect_to=/members");
  if (!d.enabled) {
    return (
      <div className="um-page">
        <div className="um um-directory">
          <Notice kind="warning">The member directory is not available.</Notice>
        </div>
      </div>
    );
  }

  const q = d.search && typeof sp.search === "string" ? sp.search.trim().slice(0, 100) : "";
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const perPage = Math.max(1, d.perPage);

  const where: Prisma.UserWhereInput = {
    status: "approved",
    ...(q
      ? {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            { displayName: { contains: q, mode: "insensitive" } },
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  // "Hide my profile from directory" lives in the profile JSON; filter in JS (missing key = visible).
  const visible = (
    await prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, select: { id: true, profile: true } })
  ).filter((u) => getProfile(u).hideInMembers !== "Yes");
  const total = visible.length;
  const ids = visible.slice((page - 1) * perPage, page * perPage).map((u) => u.id);
  const users = (await prisma.user.findMany({ where: { id: { in: ids } } })).sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  const pages = Math.max(1, Math.ceil(total / perPage));
  const header = (total === 1 ? d.headerSingle : d.header).replace("{total_users}", String(total));
  const href = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set("search", q);
    if (p > 1) u.set("page", String(p));
    const qs = u.toString();
    return `/members${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="um-page">
      <div className="um um-directory">
        {d.search && (
          <form className="um-directory-search" method="get" action="/members">
            <input className="um-form-field" type="search" name="search" defaultValue={q} placeholder="Search" aria-label="Search members" />
            <input type="submit" className="um-button" value="Search" />
          </form>
        )}
        {total > 0 && <div className="um-members-total">{header}</div>}
        {users.length === 0 ? (
          <div className="um-members-none">{d.noUsers}</div>
        ) : (
          <div className="um-members-grid">
            {users.map((u) => {
              const name = displayNameOf(u);
              return (
                <div className="um-member" key={u.id}>
                  <div className="um-member-photo">
                    <Link href={profileUrl(u.username)} title={name}>
                      <Avatar src={avatarUrl(u)} name={name} size={90} />
                    </Link>
                  </div>
                  <div className="um-member-name">
                    <Link href={profileUrl(u.username)}>{name}</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {pages > 1 && (
          <nav className="um-members-pagi" aria-label="Members pagination">
            {page > 1 ? <Link href={href(1)}>«</Link> : <span className="disabled">«</span>}
            {page > 1 ? <Link href={href(page - 1)}>‹</Link> : <span className="disabled">‹</span>}
            {Array.from({ length: pages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === pages)
              .map((p) =>
                p === page ? (
                  <span key={p} className="current">
                    {p}
                  </span>
                ) : (
                  <Link key={p} href={href(p)}>
                    {p}
                  </Link>
                ),
              )}
            {page < pages ? <Link href={href(page + 1)}>›</Link> : <span className="disabled">›</span>}
            {page < pages ? <Link href={href(pages)}>»</Link> : <span className="disabled">»</span>}
          </nav>
        )}
      </div>
    </div>
  );
}
