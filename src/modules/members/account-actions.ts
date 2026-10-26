"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { destroySession, getSession, isStaff } from "@/lib/session";
import { verifyWpPassword } from "@/lib/wp-password";
import { saveFormFile, deleteStoredFile } from "@/lib/storage";
import { escapeHtml, sendMail } from "@/lib/mail";
import { getMembersSettings } from "./settings";
import { getProfile, fullName, profileUrl } from "./profile";
import { str, validateEmail, validatePassword, type FieldErrors } from "./validation";
import { sendUmEmail } from "./emails";
import { setUserPassword, updateProfile } from "./service";
import { clientIp, hit, isLimited, siteUrl } from "./security";
import type { FormState } from "./auth-actions";

async function me() {
  const s = await getSession();
  if (!s) redirect("/login?redirect_to=/account");
  const user = await prisma.user.findUnique({ where: { id: s.uid } });
  if (!user) {
    await destroySession();
    redirect("/login");
  }
  return user;
}

async function passwordAttemptAllowed(userId: number) {
  const key = `acctpw:${userId}:${await clientIp()}`;
  if (isLimited(key, 10, 15 * 60_000)) return false;
  hit(key);
  return true;
}

export async function updateGeneralAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await me();
  const s = await getMembersSettings();
  const values = {
    first_name: str(fd, "first_name").trim(),
    last_name: str(fd, "last_name").trim(),
    user_email: str(fd, "user_email").trim(),
  };
  const fe: FieldErrors = {};
  // account_name_require = true
  if (!values.first_name) fe.first_name = "First Name is required";
  if (!values.last_name) fe.last_name = "Last Name is required";
  if (values.first_name.length > 100) fe.first_name = "This field must contain less than 100 characters";
  if (values.last_name.length > 100) fe.last_name = "This field must contain less than 100 characters";
  if (values.user_email.toLowerCase() !== user.email.toLowerCase()) {
    const e = await validateEmail(values.user_email, s, user.id);
    if (e) fe.user_email = e;
  } else if (!values.user_email) fe.user_email = "You must provide your email";
  if (Object.keys(fe).length) return { fieldErrors: fe, values };

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: values.first_name,
      lastName: values.last_name,
      email: values.user_email.toLowerCase(),
      displayName: fullName(values.first_name, values.last_name, user.username),
    },
  });
  await sendUmEmail("changedaccount_email", updated, {}, s);
  revalidatePath("/account");
  return { message: "Your account was updated successfully.", values };
}

export async function changePasswordAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await me();
  const s = await getMembersSettings();
  const current = str(fd, "current_user_password");
  const pw = str(fd, "user_password");
  const confirm = str(fd, "confirm_user_password");
  const fe: FieldErrors = {};
  if (!current) fe.current_user_password = "This is not your password";
  else if (!(await passwordAttemptAllowed(user.id))) return { error: "Too many attempts. Please try again later." };
  else if (!verifyWpPassword(current, user.passwordHash)) fe.current_user_password = "This is not your password";
  const p = pw ? validatePassword(pw, s, { username: user.username, email: user.email }) : "You must enter a new password";
  if (p) fe.user_password = p;
  if (!confirm) fe.confirm_user_password = "You must confirm your new password";
  else if (pw && confirm !== pw) fe.confirm_user_password = "Your new password does not match";
  if (Object.keys(fe).length) return { fieldErrors: fe };

  await setUserPassword(user.id, pw);
  await sendUmEmail("changedpw_email", user, {}, s);
  return { message: "Your password has been changed successfully." };
}

export async function updatePrivacyAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await me();
  const privacy = str(fd, "profile_privacy") === "Only me" ? "Only me" : "Everyone";
  const noindex = str(fd, "profile_noindex") === "Yes" ? "Yes" : "No";
  const hide = str(fd, "hide_in_members") === "Yes" ? "Yes" : "No";
  await updateProfile(user.id, { profilePrivacy: privacy, profileNoindex: noindex, hideInMembers: hide }, user.profile);
  revalidatePath("/account");
  revalidatePath("/members");
  return { message: "Your account was updated successfully.", values: { profile_privacy: privacy, profile_noindex: noindex, hide_in_members: hide } };
}

export async function requestErasureAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await me();
  const s = await getMembersSettings();
  const pw = str(fd, "um-erase-data");
  if (!pw) return { fieldErrors: { "um-erase-data": "You must enter a password" } };
  if (!(await passwordAttemptAllowed(user.id))) return { error: "Too many attempts. Please try again later." };
  if (!verifyWpPassword(pw, user.passwordHash)) return { fieldErrors: { "um-erase-data": "The password you entered is incorrect." } };
  await sendMail({
    to: s.adminEmail,
    subject: `[Mustang Mortgage] Erase Personal Data request`,
    html: `<p>${escapeHtml(user.displayName || user.username)} (${escapeHtml(user.email)}) has requested erasure of their personal data.</p><p><a href="${siteUrl(`/admin/users/${user.id}`)}">Review this user</a></p>`,
    context: `um:erase-request:${user.id}`,
  });
  await updateProfile(user.id, { erasureRequestedAt: new Date().toISOString() });
  return { message: "The administrator has not yet approved deleting your data. Please expect an email with a link to your data." };
}

export async function deleteAccountAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await me();
  const s = await getMembersSettings();
  if (isStaff(user.role)) return { error: "Staff accounts cannot be deleted from the account page. Please ask an administrator." };
  const pw = str(fd, "single_user_password");
  if (!pw) return { fieldErrors: { single_user_password: "You must enter your password" } };
  if (!(await passwordAttemptAllowed(user.id))) return { error: "Too many attempts. Please try again later." };
  if (!verifyWpPassword(pw, user.passwordHash)) return { fieldErrors: { single_user_password: "This is not your password" } };

  const profile = getProfile(user);
  await sendUmEmail("deletion_email", user, {}, s);
  await sendUmEmail("notification_deletion", user, {}, s);
  if (profile.photoId) await deleteStoredFile(profile.photoId).catch(() => undefined);
  await prisma.user.delete({ where: { id: user.id } });
  await destroySession();
  redirect("/");
}

export async function updateProfileAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const user = await me();
  const s = await getMembersSettings();
  const description = str(fd, "description").replace(/\r\n/g, "\n").trim();
  if (description.length > s.profileBioMaxChars)
    return { fieldErrors: { description: `Your user description must contain less than ${s.profileBioMaxChars} characters` }, values: { description } };

  const profile = getProfile(user);
  const patch: Record<string, unknown> = { description };
  const photo = fd.get("profile_photo");
  if (photo && typeof photo === "object" && "size" in photo && photo.size > 0) {
    const f = photo as File;
    if (!/^image\/(jpeg|png|gif|webp)$/.test(f.type)) return { fieldErrors: { profile_photo: "This file type is not recognized." }, values: { description } };
    if (f.size > 950 * 1024) return { fieldErrors: { profile_photo: "This image is too large!" }, values: { description } };
    const rec = await saveFormFile(f, "members/photos", `user:${user.id}`);
    if (profile.photoId) await deleteStoredFile(profile.photoId).catch(() => undefined);
    patch.photoId = rec.id;
  }
  if (str(fd, "remove_photo") === "1" && profile.photoId && !patch.photoId) {
    await deleteStoredFile(profile.photoId).catch(() => undefined);
    patch.photoId = undefined;
  }
  await updateProfile(user.id, patch, user.profile);
  revalidatePath(profileUrl(user.username));
  redirect(profileUrl(user.username));
}
