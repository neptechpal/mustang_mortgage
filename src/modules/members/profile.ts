import type { User } from "@prisma/client";

// Extra Ultimate Member fields kept in User.profile (JSON).
export type UmProfile = {
  description?: string; // biography
  photoId?: string; // StoredFile id of profile photo
  profilePrivacy?: "Everyone" | "Only me";
  profileNoindex?: "Yes" | "No";
  hideInMembers?: "Yes" | "No";
  lastLogin?: string;
  pwResetAttempts?: number;
  activationHash?: string;
  activationExpires?: string;
  statusChangedAt?: string;
  statusChangedBy?: string;
  registeredVia?: string;
  phone?: string;
  [k: string]: unknown;
};

export function getProfile(u: Pick<User, "profile">): UmProfile {
  const p = u.profile;
  return p && typeof p === "object" && !Array.isArray(p) ? (p as UmProfile) : {};
}

/** UM "display_name" = full_name: "First Last", falling back to username. */
export function fullName(first: string, last: string, username: string) {
  const n = `${first.trim()} ${last.trim()}`.trim();
  return n || username;
}

export function displayNameOf(u: Pick<User, "displayName" | "firstName" | "lastName" | "username">) {
  return u.displayName || fullName(u.firstName, u.lastName, u.username);
}

export function profileUrl(username: string) {
  return `/user/${encodeURIComponent(username)}`;
}

export function avatarUrl(u: Pick<User, "id" | "profile">) {
  const p = getProfile(u);
  return p.photoId ? `/api/auth/avatar/${u.id}?v=${encodeURIComponent(p.photoId.slice(-6))}` : null;
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join("") || "?"
  );
}

export const STATUS_LABELS: Record<string, string> = {
  approved: "Approved",
  pending: "Pending administrator review",
  checkmail: "Waiting email confirmation",
  inactive: "Membership inactive",
  rejected: "Membership rejected",
};
