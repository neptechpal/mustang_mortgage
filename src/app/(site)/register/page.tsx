import { getCurrentUser, isStaff } from "@/lib/session";
import { RegisterForm } from "@/modules/members/components/AuthForms";
import { LoggedInBox } from "@/modules/members/components/LoggedInBox";
import { Notice } from "@/modules/members/components/fields";
import { getMembersSettings } from "@/modules/members/settings";
import { AuthShell, NewClientNote } from "@/modules/web/account/AuthShell";
import { buildMetadata } from "@/modules/web/seo";

export const metadata = buildMetadata({ title: "Create a client account", description: "Create a Mustang Mortgage client account.", path: "/register", noindex: true });
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const [user, s] = await Promise.all([getCurrentUser(), getMembersSettings()]);
  return (
    <div className="um-page">
      {user ? (
        <AuthShell title="You're logged in" lede="You already have an account on this device." aside="none">
          <LoggedInBox user={user} staff={isStaff(user.role)} />
        </AuthShell>
      ) : s.registrationEnabled ? (
        <AuthShell title="Create your client account" lede="Choose a username and password. You'll use them to upload documents and complete your fact find.">
          <RegisterForm />
          <NewClientNote />
        </AuthShell>
      ) : (
        <AuthShell title="Create your client account" aside="none">
          <div className="um um-register">
            <Notice kind="warning">Registration is currently disabled.</Notice>
          </div>
          <NewClientNote />
        </AuthShell>
      )}
    </div>
  );
}
