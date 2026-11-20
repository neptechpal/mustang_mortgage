import { redirect } from "next/navigation";
import { VerifyForm } from "@/modules/members/components/TwoFactorForms";
import { AuthShell } from "@/modules/web/account/AuthShell";
import { readPendingLogin } from "@/lib/session";
import { buildMetadata } from "@/modules/web/seo";

export const metadata = buildMetadata({ title: "Two-step sign-in", description: "Enter your authentication code.", path: "/login/verify", noindex: true });
export const dynamic = "force-dynamic";

export default async function VerifyPage() {
  const p = await readPendingLogin();
  if (!p || p.purpose !== "verify") redirect("/login");
  return (
    <div className="um-page">
      <AuthShell eyebrow="Staff login" title="Enter your code" lede="Your password was correct. Now confirm it is you with the code from your authenticator app." aside="none">
        <VerifyForm />
      </AuthShell>
    </div>
  );
}
