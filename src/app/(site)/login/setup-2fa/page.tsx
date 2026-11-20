import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { readPendingLogin } from "@/lib/session";
import { otpauthUrl } from "@/lib/totp";
import { SetupForm } from "@/modules/members/components/TwoFactorForms";
import { getSetupSecret } from "@/modules/members/twofactor";
import { AuthShell } from "@/modules/web/account/AuthShell";
import { buildMetadata } from "@/modules/web/seo";

export const metadata = buildMetadata({ title: "Set up two-step sign-in", description: "Set up two-step sign-in for your staff account.", path: "/login/setup-2fa", noindex: true });
export const dynamic = "force-dynamic";

export default async function SetupTwoFactorPage() {
  const p = await readPendingLogin();
  if (!p || p.purpose !== "setup") redirect("/login");
  const user = await prisma.user.findUnique({ where: { id: p.uid }, select: { id: true, email: true, twoFactorEnabled: true } });
  if (!user) redirect("/login");
  // Once the first code is confirmed (p.ok) the page only shows the backup codes; the secret is never shown again.
  if (user.twoFactorEnabled && p.ok !== 1) redirect("/login");
  const confirmed = user.twoFactorEnabled;

  const secret = confirmed ? "" : await getSetupSecret(user.id);
  const qr = confirmed ? "" : await QRCode.toDataURL(otpauthUrl(secret, user.email), { margin: 1, width: 220 });
  const grouped = secret.match(/.{1,4}/g)?.join(" ") ?? secret;

  return (
    <div className="um-page">
      <AuthShell
        eyebrow="Staff login"
        title="Set up two-step sign-in"
        lede="Staff accounts need a second step. It takes a minute and protects client information."
        aside={
          <ol style={{ margin: "20px 0 0", paddingLeft: 24, lineHeight: 1.7, listStyle: "decimal" }}>
            <li>Install an authenticator app, such as Google Authenticator, Microsoft Authenticator or 1Password.</li>
            <li>Scan the QR code, or type the key in by hand.</li>
            <li>Enter the 6-digit code the app shows, then save your backup codes.</li>
          </ol>
        }
      >
        {!confirmed && (
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR code for your authenticator app" width={220} height={220} style={{ display: "inline-block" }} />
            <p style={{ margin: "10px 0 0", fontSize: 13 }}>Can&rsquo;t scan? Enter this key:</p>
            <code style={{ fontSize: 15, letterSpacing: 1 }}>{grouped}</code>
          </div>
        )}
        <SetupForm />
      </AuthShell>
    </div>
  );
}
