"use server";

import crypto from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { hashPassword } from "@/lib/wp-password";
import { deleteStoredFile } from "@/lib/storage";
import { getMembersSettings, saveMembersSettings, type EmailKey, type MembersSettings, type RegisterStatus } from "./settings";
import { fullName, getProfile } from "./profile";
import { isEmail, safeUsername, str, validatePassword } from "./validation";
import { changeStatus, createResetLink, setUserPassword } from "./service";
import { sendUmEmail } from "./emails";

const ROLES: Role[] = ["ADMIN", "STAFF", "MEMBER"];
const STATUSES = ["approved", "pending", "checkmail", "rejected", "inactive"];

const back = (id: number | "new", q: Record<string, string>) =>
  `/admin/users/${id === "new" ? "new" : id}?${new URLSearchParams(q).toString()}`;

async function uniqueCheck(username: string, email: string, excludeId?: number) {
  const not = excludeId ? { NOT: { id: excludeId } } : {};
  const u = await prisma.user.findFirst({ where: { username: { equals: username, mode: "insensitive" }, ...not }, select: { id: true } });
  if (u) return "That username is already in use.";
  const e = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" }, ...not }, select: { id: true } });
  if (e) return "That e-mail address is already in use.";
  return null;
}

export async function adminCreateUser(fd: FormData) {
  const admin = await requireAdmin();
  const s = await getMembersSettings();
  const username = str(fd, "username").trim();
  const email = str(fd, "email").trim().toLowerCase();
  const firstName = str(fd, "firstName").trim();
  const lastName = str(fd, "lastName").trim();
  const role = (ROLES.includes(str(fd, "role") as Role) ? str(fd, "role") : "MEMBER") as Role;
  const status = STATUSES.includes(str(fd, "status")) ? str(fd, "status") : "approved";
  const password = str(fd, "password");
  const notify = str(fd, "notify") === "1";

  const err = (m: string) => redirect(back("new", { error: m, username, email, firstName, lastName }));
  if (!username || username.length < 3 || username.length > 60 || !safeUsername(username)) err("Please enter a valid username (3–60 letters, numbers, . _ - @).");
  if (!isEmail(email)) err("Please enter a valid e-mail address.");
  const dup = await uniqueCheck(username, email);
  if (dup) err(dup);
  if (password) {
    const p = validatePassword(password, s, { strong: false });
    if (p) err(p);
  }

  const user = await prisma.user.create({
    data: {
      username,
      email,
      firstName,
      lastName,
      displayName: fullName(firstName, lastName, username),
      role,
      status,
      passwordHash: hashPassword(password || crypto.randomBytes(24).toString("base64url")),
      profile: { registeredVia: `admin:${admin.uid}`, hideInMembers: "No", profilePrivacy: "Everyone" },
    },
  });
  if (notify) {
    const link = await createResetLink(user.id, 24 * 3600_000);
    await sendUmEmail("approved_email", user, { password_reset_link: link }, { ...s, emails: { ...s.emails, approved_email: { ...s.emails.approved_email, on: true } } });
  }
  revalidatePath("/admin/users");
  redirect(back(user.id, { msg: "User created." }));
}

export async function adminUpdateUser(fd: FormData) {
  const admin = await requireAdmin();
  const id = parseInt(str(fd, "id"), 10);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) redirect("/admin/users?error=User+not+found");
  const s = await getMembersSettings();

  const username = str(fd, "username").trim();
  const email = str(fd, "email").trim().toLowerCase();
  const firstName = str(fd, "firstName").trim();
  const lastName = str(fd, "lastName").trim();
  const displayName = str(fd, "displayName").trim() || fullName(firstName, lastName, username);
  let role = (ROLES.includes(str(fd, "role") as Role) ? str(fd, "role") : user.role) as Role;
  const status = STATUSES.includes(str(fd, "status")) ? str(fd, "status") : user.status;
  const description = str(fd, "description").slice(0, 2000);
  const phone = str(fd, "phone").trim().slice(0, 40);

  const err = (m: string) => redirect(back(id, { error: m }));
  if (!username || username.length < 3 || username.length > 60 || !safeUsername(username)) err("Please enter a valid username.");
  if (!isEmail(email)) err("Please enter a valid e-mail address.");
  const dup = await uniqueCheck(username, email, id);
  if (dup) err(dup);
  if (user.id === admin.uid && role !== "ADMIN") {
    role = "ADMIN"; // never demote yourself
  }
  if (user.id === admin.uid && status !== "approved") err("You cannot change the status of your own account.");

  const profile = getProfile(user);
  await prisma.user.update({
    where: { id },
    data: {
      username,
      email,
      firstName,
      lastName,
      displayName,
      role,
      profile: { ...profile, description, phone } as Prisma.InputJsonValue,
    },
  });
  if (status !== user.status) {
    const fresh = await prisma.user.findUniqueOrThrow({ where: { id } });
    if (status === "approved" || status === "rejected" || status === "inactive" || status === "pending") {
      await changeStatus(fresh, status, `admin:${admin.uid}`, s);
    } else {
      await prisma.user.update({ where: { id }, data: { status } });
    }
  }
  revalidatePath("/admin/users");
  redirect(back(id, { msg: "User updated." }));
}

export async function adminSetStatus(fd: FormData) {
  const admin = await requireAdmin();
  const id = parseInt(str(fd, "id"), 10);
  const status = str(fd, "status");
  const ret = str(fd, "return") === "list" ? "list" : "edit";
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) redirect("/admin/users?error=User+not+found");
  if (user.id === admin.uid) redirect(back(id, { error: "You cannot change the status of your own account." }));
  if (!["approved", "rejected", "inactive", "pending"].includes(status)) redirect(back(id, { error: "Invalid status." }));
  await changeStatus(user, status as "approved" | "rejected" | "inactive" | "pending", `admin:${admin.uid}`, await getMembersSettings());
  revalidatePath("/admin/users");
  const label = { approved: "approved", rejected: "rejected", inactive: "deactivated", pending: "set as pending review" }[status];
  if (ret === "list") redirect(`/admin/users?msg=${encodeURIComponent(`User ${label}.`)}`);
  redirect(back(id, { msg: `User ${label}.` }));
}

export async function adminSendReset(fd: FormData) {
  await requireAdmin();
  const id = parseInt(str(fd, "id"), 10);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) redirect("/admin/users?error=User+not+found");
  const s = await getMembersSettings();
  const link = await createResetLink(user.id);
  const r = await sendUmEmail("resetpw_email", user, { password_reset_link: link }, { ...s, emails: { ...s.emails, resetpw_email: { ...s.emails.resetpw_email, on: true } } });
  redirect(back(id, r.ok ? { msg: "Password reset link sent." } : { error: `Reset e-mail could not be sent (${r.error}).` }));
}

export async function adminSetPassword(fd: FormData) {
  await requireAdmin();
  const id = parseInt(str(fd, "id"), 10);
  const pw = str(fd, "password");
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) redirect("/admin/users?error=User+not+found");
  const s = await getMembersSettings();
  const p = validatePassword(pw, s, { strong: false });
  if (p) redirect(back(id, { error: p }));
  await setUserPassword(id, pw);
  if (str(fd, "notify") === "1") await sendUmEmail("changedpw_email", user, {}, s);
  redirect(back(id, { msg: "Password updated." }));
}

export async function adminDeleteUser(fd: FormData) {
  const admin = await requireAdmin();
  const id = parseInt(str(fd, "id"), 10);
  if (id === admin.uid) redirect(back(id, { error: "You cannot delete your own account." }));
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) redirect("/admin/users?error=User+not+found");
  if (user.role === "ADMIN" && (await prisma.user.count({ where: { role: "ADMIN" } })) <= 1) {
    redirect(back(id, { error: "You cannot delete the last administrator." }));
  }
  const s = await getMembersSettings();
  if (str(fd, "notify") === "1") await sendUmEmail("deletion_email", user, {}, s);
  const p = getProfile(user);
  if (p.photoId) await deleteStoredFile(p.photoId).catch(() => undefined);
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/users");
  redirect(`/admin/users?msg=${encodeURIComponent(`User "${user.username}" deleted.`)}`);
}

export async function adminSaveSettings(fd: FormData) {
  await requireAdmin();
  const cur = await getMembersSettings();
  const num = (k: string, def: number, min: number, max: number) => {
    const n = parseInt(str(fd, k), 10);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
  };
  const lines = (k: string) =>
    str(fd, k)
      .split(/\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean);
  const status = str(fd, "registerStatus");
  const visibleTo = str(fd, "dir_visibleTo");
  const emails = { ...cur.emails };
  for (const k of Object.keys(emails) as EmailKey[]) {
    emails[k] = { on: str(fd, `email_${k}_on`) === "1", subject: str(fd, `email_${k}_subject`).trim() || cur.emails[k].subject };
  }
  const next: MembersSettings = {
    ...cur,
    registrationEnabled: str(fd, "registrationEnabled") === "1",
    registerStatus: (["approved", "checkmail", "pending"].includes(status) ? status : cur.registerStatus) as RegisterStatus,
    afterRegister: str(fd, "afterRegister") === "redirect_url" ? "redirect_url" : "redirect_profile",
    afterRegisterUrl: str(fd, "afterRegisterUrl").trim(),
    checkmailMessage: str(fd, "checkmailMessage").trim() || cur.checkmailMessage,
    pendingMessage: str(fd, "pendingMessage").trim() || cur.pendingMessage,
    adminEmail: str(fd, "adminEmail").trim() || cur.adminEmail,
    mailFromName: str(fd, "mailFromName").trim() || cur.mailFromName,
    blockedWords: lines("blockedWords"),
    blockedEmails: lines("blockedEmails"),
    passwordMinChars: num("passwordMinChars", cur.passwordMinChars, 6, 64),
    passwordMaxChars: num("passwordMaxChars", cur.passwordMaxChars, 8, 255),
    resetPasswordLimit: num("resetPasswordLimit", cur.resetPasswordLimit, 0, 100),
    profileBioMaxChars: num("profileBioMaxChars", cur.profileBioMaxChars, 0, 5000),
    directory: {
      ...cur.directory,
      enabled: str(fd, "dir_enabled") === "1",
      perPage: num("dir_perPage", cur.directory.perPage, 1, 100),
      perPageMobile: num("dir_perPageMobile", cur.directory.perPageMobile, 1, 100),
      search: str(fd, "dir_search") === "1",
      header: str(fd, "dir_header").trim() || cur.directory.header,
      headerSingle: str(fd, "dir_headerSingle").trim() || cur.directory.headerSingle,
      noUsers: str(fd, "dir_noUsers").trim() || cur.directory.noUsers,
      visibleTo: (["everyone", "members", "staff"].includes(visibleTo) ? visibleTo : cur.directory.visibleTo) as MembersSettings["directory"]["visibleTo"],
    },
    emails,
  };
  await saveMembersSettings(next);
  revalidatePath("/admin/users/settings");
  redirect("/admin/users/settings?msg=Settings+saved.");
}
