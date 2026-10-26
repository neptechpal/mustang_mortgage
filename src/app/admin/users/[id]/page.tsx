import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ExternalLink, KeyRound, Mail, PauseCircle, RotateCcw, Save, Trash2, X } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { Avatar, Card, PageHeader, buttonStyles, checkboxStyles, cn } from "@/components/admin/ui";
import {
  adminDeleteUser,
  adminSendReset,
  adminSetPassword,
  adminSetStatus,
  adminUpdateUser,
} from "@/modules/members/admin-actions";
import { Field, Flash, RoleBadge, StatusPill, btnDanger, btnGhost, btnOk, btnPrimary, inputCls, sp1 } from "@/modules/members/components/AdminUi";
import { ConfirmSubmit } from "@/modules/members/components/ConfirmSubmit";
import { getProfile, profileUrl, STATUS_LABELS } from "@/modules/members/profile";

export const metadata = { title: "Edit User" };
export const dynamic = "force-dynamic";

const fmt = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", dateStyle: "medium", timeStyle: "short" });

export default async function EditUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const me = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const uid = parseInt(id, 10);
  if (!Number.isFinite(uid)) notFound();
  const user = await prisma.user.findUnique({ where: { id: uid } });
  if (!user) notFound();
  const p = getProfile(user);
  const self = user.id === me.uid;
  const name = user.displayName || `${user.firstName} ${user.lastName}`.trim() || user.username;

  const statusBtn = (status: string, label: string, cls: string, icon: React.ReactNode) => (
    <form action={adminSetStatus}>
      <input type="hidden" name="id" value={user.id} />
      <input type="hidden" name="status" value={status} />
      <button className={cn(cls, "w-full")}>
        {icon}
        {label}
      </button>
    </form>
  );

  const facts: [string, React.ReactNode, string?][] = [
    ["Status", STATUS_LABELS[user.status] ?? user.status],
    ["Registered", fmt.format(user.createdAt)],
    ["Last login", p.lastLogin ? fmt.format(new Date(p.lastLogin)) : "—"],
    ...(user.wpId ? ([["WordPress ID", user.wpId]] as [string, React.ReactNode][]) : []),
    ["Profile privacy", p.profilePrivacy ?? "Everyone"],
    ["Hidden in directory", p.hideInMembers ?? "No"],
    ...(typeof p.erasureRequestedAt === "string" ? ([["Data erasure requested", fmt.format(new Date(p.erasureRequestedAt)), "warn"]] as [string, React.ReactNode, string][]) : []),
    ...(p.statusChangedAt ? ([["Status changed", fmt.format(new Date(p.statusChangedAt))]] as [string, React.ReactNode][]) : []),
  ];

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Users", href: "/admin/users" }, { label: `Edit User ${user.username}` }]}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Avatar name={name} size="lg" />
            <span className="min-w-0">{name}</span>
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-2 sm:pl-14">
            <span>@{user.username}</span>
            <span className="text-slate-300">·</span>
            <a href={`mailto:${user.email}`} className="hover:text-slate-800 hover:underline">
              {user.email}
            </a>
            <RoleBadge role={user.role} />
            <StatusPill status={user.status} />
            {self && <span className="text-xs text-slate-400">(you)</span>}
          </span>
        }
        actions={
          user.status === "approved" ? (
            <Link href={profileUrl(user.username)} className={buttonStyles({ variant: "secondary" })} target="_blank">
              <ExternalLink /> View profile
            </Link>
          ) : undefined
        }
      />
      <Flash msg={sp1(sp.msg)} error={sp1(sp.error)} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <form action={adminUpdateUser}>
            <input type="hidden" name="id" value={user.id} />
            <Card
              title="Account details"
              description="Name, contact details, role and membership status."
              footer={
                <div className="flex justify-end">
                  <button className={btnPrimary}>
                    <Save /> Update User
                  </button>
                </div>
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Username">
                  <input name="username" defaultValue={user.username} required className={inputCls} />
                </Field>
                <Field label="E-mail">
                  <input name="email" type="email" defaultValue={user.email} required className={inputCls} />
                </Field>
                <Field label="First Name">
                  <input name="firstName" defaultValue={user.firstName} className={inputCls} />
                </Field>
                <Field label="Last Name">
                  <input name="lastName" defaultValue={user.lastName} className={inputCls} />
                </Field>
                <Field label="Display name publicly as" hint="Blank = First Last (UM full_name).">
                  <input name="displayName" defaultValue={user.displayName} className={inputCls} />
                </Field>
                <Field label="Phone">
                  <input name="phone" defaultValue={typeof p.phone === "string" ? p.phone : ""} className={inputCls} />
                </Field>
                <div className="border-t border-slate-100 pt-4 sm:col-span-2" />
                <Field label="Role" hint={self ? "You can't change your own role." : undefined}>
                  <select name="role" defaultValue={user.role} className={inputCls} disabled={self}>
                    <option value="MEMBER">Member (subscriber)</option>
                    <option value="STAFF">Staff (CRM access)</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                  {self && <input type="hidden" name="role" value={user.role} />}
                </Field>
                <Field label="Account status" hint="Changing status sends the matching UM notification e-mail when enabled.">
                  <select name="status" defaultValue={user.status} className={inputCls} disabled={self}>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  {self && <input type="hidden" name="status" value={user.status} />}
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Biographical info">
                    <textarea name="description" defaultValue={p.description ?? ""} rows={4} className={inputCls} />
                  </Field>
                </div>
              </div>
            </Card>
          </form>

          <Card title="Password" description="Let the user choose a password, or set one for them.">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 ring-1 ring-inset ring-slate-200">
                  <Mail className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">Password reset e-mail</p>
                  <p className="text-xs text-slate-500">E-mails the user a single-use link (valid 1 hour).</p>
                </div>
              </div>
              <form action={adminSendReset}>
                <input type="hidden" name="id" value={user.id} />
                <button className={btnGhost}>Send password reset link</button>
              </form>
            </div>
            <form action={adminSetPassword} className="mt-5 flex flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={user.id} />
              <div className="min-w-[220px] flex-1">
                <Field label="Set new password">
                  <input name="password" type="password" required minLength={8} className={inputCls} autoComplete="new-password" />
                </Field>
              </div>
              <label className="flex h-9 items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="notify" value="1" className={checkboxStyles} /> Notify user
              </label>
              <button className={btnPrimary}>
                <KeyRound /> Set Password
              </button>
            </form>
          </Card>
        </div>

        <aside className="min-w-0 space-y-6">
          <Card title="Membership">
            <dl className="divide-y divide-slate-100 text-sm">
              {facts.map(([k, v, warn]) => (
                <div key={k} className={cn("flex justify-between gap-3 py-2 first:pt-0 last:pb-0", warn && "text-amber-700")}>
                  <dt className={cn(warn ? "font-medium" : "text-slate-500")}>{k}</dt>
                  <dd className={cn("text-right", !warn && "text-slate-900")}>{v}</dd>
                </div>
              ))}
            </dl>
            {!self && (
              <div className="mt-5 grid gap-2 border-t border-slate-100 pt-4">
                {user.status !== "approved" && statusBtn("approved", "Approve Membership", btnOk, <Check />)}
                {(user.status === "pending" || user.status === "checkmail") && statusBtn("rejected", "Reject Membership", btnDanger, <X />)}
                {user.status === "approved" && statusBtn("inactive", "Deactivate", btnGhost, <PauseCircle />)}
                {user.status === "approved" && statusBtn("pending", "Put as Pending Review", btnGhost, <RotateCcw />)}
              </div>
            )}
          </Card>

          {!self && (
            <section className="rounded-xl border border-red-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <header className="border-b border-red-100 bg-red-50/50 px-5 py-3.5">
                <h2 className="text-[15px] font-semibold text-red-700">Delete user</h2>
                <p className="mt-0.5 text-xs text-red-600/80">Permanently removes the account. This cannot be undone.</p>
              </header>
              <form action={adminDeleteUser} className="space-y-4 p-5">
                <input type="hidden" name="id" value={user.id} />
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="notify" value="1" className={checkboxStyles} /> Send &quot;account deleted&quot; e-mail
                </label>
                <ConfirmSubmit message={`Permanently delete user "${user.username}"? This cannot be undone.`} className={cn(btnDanger, "w-full")}>
                  <Trash2 /> Delete User
                </ConfirmSubmit>
              </form>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
