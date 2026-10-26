import type { Metadata } from "next";
import { ResetRequestForm, SetPasswordForm } from "@/modules/members/components/AuthForms";
import { lookupResetToken } from "@/modules/members/service";
import { redirect } from "next/navigation";
import "@/modules/members/components/um.css";

export const metadata: Metadata = { title: "Password Reset", robots: { index: false } };
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
  if (key) {
    const found = await lookupResetToken(key);
    if (!found.ok) redirect(`/password-reset?updated=${found.reason}`);
    content = <SetPasswordForm rpKey={key} />;
  } else if (updated === "checkemail") {
    content = <Message text="If an account matching the provided details exists, we will send a password reset link. Please check your inbox." />;
  } else if (updated === "password_changed") {
    content = <Message text="You have successfully changed password." />;
  } else if (updated === "expiredkey") {
    content = <ResetRequestForm notice="Your password reset link has expired. Please request a new link below." />;
  } else if (updated === "invalidkey") {
    content = <ResetRequestForm notice="Your password reset link appears to be invalid. Please request a new link below." />;
  } else {
    content = <ResetRequestForm />;
  }
  return <div className="um-page">{content}</div>;
}
