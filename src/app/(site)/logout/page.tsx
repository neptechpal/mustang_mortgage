import { LogoutRunner } from "@/modules/members/components/LogoutRunner";
import { AuthShell } from "@/modules/web/account/AuthShell";
import { buildMetadata } from "@/modules/web/seo";

export const metadata = buildMetadata({ title: "Log out", description: "Log out of your Mustang Mortgage client account.", path: "/logout", noindex: true });
export const dynamic = "force-dynamic";

// UM "logout" core page: clears the session and redirects home (after_logout = redirect_home).
// Implemented as a page + server action (not a GET handler) so link prefetching can never log users out.
export default function LogoutPage() {
  return (
    <div className="um-page">
      <AuthShell title="Logging you out" aside="none">
        <div className="um um-logout">
          <LogoutRunner />
        </div>
      </AuthShell>
    </div>
  );
}
