import type { Metadata } from "next";
import { getCurrentUser, isStaff } from "@/lib/session";
import { RegisterForm } from "@/modules/members/components/AuthForms";
import { LoggedInBox } from "@/modules/members/components/LoggedInBox";
import { Notice } from "@/modules/members/components/fields";
import { getMembersSettings } from "@/modules/members/settings";

export const metadata: Metadata = { title: "Register" };
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const [user, s] = await Promise.all([getCurrentUser(), getMembersSettings()]);
  return (
    <div className="um-page">
      {user ? (
        <LoggedInBox user={user} staff={isStaff(user.role)} />
      ) : s.registrationEnabled ? (
        <RegisterForm />
      ) : (
        <div className="um um-register">
          <Notice kind="warning">Registration is currently disabled.</Notice>
        </div>
      )}
    </div>
  );
}
