import { UserPlus } from "lucide-react";
import { requireAdmin } from "@/lib/session";
import { Card, LinkButton, PageHeader, SectionTitle, checkboxStyles } from "@/components/admin/ui";
import { adminCreateUser } from "@/modules/members/admin-actions";
import { Field, Flash, btnPrimary, inputCls, sp1 } from "@/modules/members/components/AdminUi";

export const metadata = { title: "Add New User" };
export const dynamic = "force-dynamic";

export default async function NewUserPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Users", href: "/admin/users" }, { label: "Add New User" }]}
        icon={<UserPlus />}
        title="Add New User"
        description="Create a member, staff or administrator account."
      />
      <div className="max-w-3xl">
        <Flash error={sp1(sp.error)} />
        <form action={adminCreateUser}>
          <Card
            footer={
              <div className="flex flex-wrap justify-end gap-2">
                <LinkButton href="/admin/users" variant="ghost">
                  Cancel
                </LinkButton>
                <button className={btnPrimary}>
                  <UserPlus /> Add New User
                </button>
              </div>
            }
          >
            <SectionTitle>Account</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Username (required)">
                <input name="username" required defaultValue={sp1(sp.username)} className={inputCls} autoComplete="off" />
              </Field>
              <Field label="E-mail (required)">
                <input name="email" type="email" required defaultValue={sp1(sp.email)} className={inputCls} autoComplete="off" />
              </Field>
              <Field label="First Name">
                <input name="firstName" defaultValue={sp1(sp.firstName)} className={inputCls} />
              </Field>
              <Field label="Last Name">
                <input name="lastName" defaultValue={sp1(sp.lastName)} className={inputCls} />
              </Field>
            </div>

            <SectionTitle className="mt-6 border-t border-slate-100 pt-6">Access</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Role">
                <select name="role" defaultValue="MEMBER" className={inputCls}>
                  <option value="MEMBER">Member (subscriber)</option>
                  <option value="STAFF">Staff (CRM access)</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </Field>
              <Field label="Account status">
                <select name="status" defaultValue="approved" className={inputCls}>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending review</option>
                  <option value="inactive">Inactive</option>
                </select>
              </Field>
            </div>

            <SectionTitle className="mt-6 border-t border-slate-100 pt-6">Password</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Password" hint="Leave blank to generate a random password (the user can set one via the e-mailed link).">
                <input name="password" type="password" className={inputCls} autoComplete="new-password" />
              </Field>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-700 sm:mt-6 sm:self-start">
                <input type="checkbox" name="notify" value="1" defaultChecked className={`${checkboxStyles} mt-0.5 shrink-0`} />
                <span>Send the new user an e-mail about their account (with a set-password link)</span>
              </label>
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
}
