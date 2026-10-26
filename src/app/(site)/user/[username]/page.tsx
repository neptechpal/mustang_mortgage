import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession, isStaff } from "@/lib/session";
import { Avatar } from "@/modules/members/components/fields";
import { ProfileEditForm } from "@/modules/members/components/ProfileEditForm";
import { avatarUrl, displayNameOf, getProfile, profileUrl } from "@/modules/members/profile";
import { getMembersSettings } from "@/modules/members/settings";
import { AppBody } from "@/modules/web/account/AppHead";
import { Breadcrumbs } from "@/modules/web/components/content/Breadcrumbs";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function decode(raw: string) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

async function load(raw: string) {
  const username = decode(raw);
  return prisma.user.findFirst({ where: { username: { equals: username, mode: "insensitive" } } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const user = await load(username);
  if (!user || user.status !== "approved") return { title: "User" };
  const name = displayNameOf(user);
  const p = getProfile(user);
  return {
    // UM profile_title "{display_name} | {site_name}" / profile_desc
    title: { absolute: `${name} | Mustang Mortgage` },
    description: `${name} is on Mustang Mortgage. Join Mustang Mortgage to view ${name}'s profile`,
    robots: p.profileNoindex === "Yes" || p.profilePrivacy === "Only me" ? { index: false, follow: false } : undefined,
  };
}

export default async function UserProfilePage({ params, searchParams }: Props) {
  const { username } = await params;
  const sp = await searchParams;
  const [user, session, settings] = await Promise.all([load(username), getSession(), getMembersSettings()]);
  const viewerIsStaff = isStaff(session?.role);
  if (!user || (user.status !== "approved" && !viewerIsStaff)) notFound();
  if (user.username !== decode(username)) redirect(profileUrl(user.username));

  const own = session?.uid === user.id;
  const p = getProfile(user);
  const name = displayNameOf(user);
  const isPrivate = p.profilePrivacy === "Only me" && !own && !viewerIsStaff;
  const editing = own && sp.um_action === "edit";

  return (
    <div className="um-page">
      <AppBody>
      <div style={{ marginBottom: 28 }}>
        <Breadcrumbs items={[{ name: "Members", path: "/members" }, { name: isPrivate ? "Profile" : name, path: profileUrl(user.username) }]} jsonLd={false} />
      </div>
      <div className="um um-profile">
        {isPrivate ? (
          <div className="um-profile-body um-profile-body--solo">
            <div className="um-profile-note">This user has chosen to keep their profile private.</div>
          </div>
        ) : editing ? (
          <div className="um-profile-body um-profile-body--solo">
            <ProfileEditForm
              description={p.description ?? ""}
              avatar={avatarUrl(user)}
              name={name}
              maxChars={settings.profileBioMaxChars}
              cancelHref={profileUrl(user.username)}
            />
          </div>
        ) : (
          <>
            <div className="um-profile-header">
              <Avatar src={avatarUrl(user)} name={name} size={140} />
              <div>
                <div className="um-profile-name">{name}</div>
                {viewerIsStaff && user.status !== "approved" && <div className="um-profile-meta">Status: {user.status}</div>}
                {p.description && <div className="um-profile-bio">{p.description}</div>}
              </div>
              {(own || session?.role === "ADMIN") && (
                <div className="um-profile-edit-btn">
                  {own ? (
                    <Link href={`${profileUrl(user.username)}?um_action=edit`} className="um-button um-alt" style={{ padding: "10px 18px" }}>
                      Edit profile
                    </Link>
                  ) : (
                    <Link href={`/admin/users/${user.id}`} className="um-button um-alt" style={{ padding: "10px 18px" }}>
                      Edit user
                    </Link>
                  )}
                </div>
              )}
            </div>
            <nav className="um-profile-nav">
              <a className="active" href="#about">
                About
              </a>
            </nav>
            <div className="um-profile-body" id="about">
              {p.description ? (
                <div className="um-profile-bio">{p.description}</div>
              ) : own ? (
                <div className="um-profile-note">
                  Your profile is empty. <Link href={`${profileUrl(user.username)}?um_action=edit`}>Add a short bio</Link> if you like.
                </div>
              ) : (
                <div className="um-profile-note">This user has not added any information to their profile yet.</div>
              )}
            </div>
          </>
        )}
      </div>
      </AppBody>
    </div>
  );
}
