import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, isStaff } from "@/lib/session";
import { prisma } from "@/lib/db";
import { AccountTabs } from "@/modules/members/components/AccountTabs";
import { avatarUrl, displayNameOf, getProfile, profileUrl } from "@/modules/members/profile";

export const metadata: Metadata = { title: "Account", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AccountPage({ params }: { params: Promise<{ tab?: string[] }> }) {
  const { tab } = await params;
  const s = await getSession();
  if (!s) redirect(`/login?redirect_to=${encodeURIComponent(tab?.length ? `/account/${tab[0]}` : "/account")}`);
  const user = await prisma.user.findUnique({ where: { id: s.uid } });
  if (!user) redirect("/logout");
  const p = getProfile(user);
  return (
    <div className="um-page">
      <AccountTabs
        initialTab={tab?.[0]}
        d={{
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          displayName: displayNameOf(user),
          avatar: avatarUrl(user),
          profileLink: profileUrl(user.username),
          privacy: p.profilePrivacy ?? "Everyone",
          noindex: p.profileNoindex ?? "No",
          hideInMembers: p.hideInMembers ?? "No",
          canDelete: !isStaff(user.role),
        }}
      />
    </div>
  );
}
