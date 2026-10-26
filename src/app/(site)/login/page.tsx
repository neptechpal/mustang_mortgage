import { getCurrentUser, isStaff } from "@/lib/session";
import { LoginForm } from "@/modules/members/components/AuthForms";
import { LoggedInBox } from "@/modules/members/components/LoggedInBox";
import { safeRedirect } from "@/modules/members/security";
import { AuthShell, NewClientNote } from "@/modules/web/account/AuthShell";
import { buildMetadata } from "@/modules/web/seo";

export const metadata = buildMetadata({ title: "Client login", description: "Log in to your Mustang Mortgage client account to upload documents and complete your fact find.", path: "/login", noindex: true });
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const raw = typeof sp.redirect_to === "string" ? sp.redirect_to : "";
  const redirectTo = raw ? safeRedirect(raw, "") : "";
  const notice =
    sp.activated === "1"
      ? "Your account has been activated. You can now log in."
      : sp.updated === "password_changed"
        ? "You have successfully changed password."
        : undefined;
  const warning = sp.activation === "invalid" ? "This activation link is invalid or has expired." : undefined;
  return (
    <div className="um-page">
      {user ? (
        <AuthShell title="You're logged in" lede="Go to your account, or log out if this isn't you." aside="none">
          <LoggedInBox user={user} staff={isStaff(user.role)} />
        </AuthShell>
      ) : (
        <AuthShell title="Log in to your client account" lede="Use the username or email and password you registered with.">
          <LoginForm redirectTo={redirectTo} notice={notice} warning={warning} />
          <NewClientNote />
        </AuthShell>
      )}
    </div>
  );
}
