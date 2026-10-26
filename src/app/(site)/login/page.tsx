import type { Metadata } from "next";
import { getCurrentUser, isStaff } from "@/lib/session";
import { LoginForm } from "@/modules/members/components/AuthForms";
import { LoggedInBox } from "@/modules/members/components/LoggedInBox";
import { safeRedirect } from "@/modules/members/security";

export const metadata: Metadata = { title: "Login" };
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
      {user ? <LoggedInBox user={user} staff={isStaff(user.role)} /> : <LoginForm redirectTo={redirectTo} notice={notice} warning={warning} />}
    </div>
  );
}
