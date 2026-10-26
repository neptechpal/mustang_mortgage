import { redirect } from "next/navigation";
import { ResetRequestForm, SetPasswordForm } from "@/modules/members/components/AuthForms";
import { lookupResetToken } from "@/modules/members/service";
import "@/modules/members/components/um.css";
import { AuthShell } from "@/modules/web/account/AuthShell";
import { buildMetadata } from "@/modules/web/seo";

export const metadata = buildMetadata({ title: "Reset your password", description: "Reset the password for your Mustang Mortgage client account.", path: "/password-reset", noindex: true });
export const dynamic = "force-dynamic";

function Message({ text }: { text: string }) {
  return (
    <div className="um um-password">
      <div className="um-form">
        <div className="um-field um-field-block um-field-type_block">
          <div className="um-field-block">
            <div style={{ textAlign: "center" }}>{text}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function PasswordResetPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const updated = typeof sp.updated === "string" ? sp.updated : "";
  const key = typeof sp.key === "string" ? sp.key : "";

  let content: React.ReactNode;
  let title = "Reset your password";
  if (key) {
    const found = await lookupResetToken(key);
    if (!found.ok) redirect(`/password-reset?updated=${found.reason}`);
    content = <SetPasswordForm rpKey={key} />;
    title = "Choose a new password";
  } else if (updated === "checkemail") {
    content = <Message text="If an account matching the provided details exists, we will send a password reset link. Please check your inbox." />;
    title = "Check your email";
  } else if (updated === "password_changed") {
    content = <Message text="You have successfully changed password." />;
    title = "Password changed";
  } else if (updated === "expiredkey") {
    content = <ResetRequestForm notice="Your password reset link has expired. Please request a new link below." />;
  } else if (updated === "invalidkey") {
    content = <ResetRequestForm notice="Your password reset link appears to be invalid. Please request a new link below." />;
  } else {
    content = <ResetRequestForm />;
  }
  return (
    <div className="um-page">
      <AuthShell title={title} lede="We email a reset link to the address on your account. It expires after a short time, so use it soon." aside="none">
        {content}
      </AuthShell>
    </div>
  );
}
