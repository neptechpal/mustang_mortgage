import { prisma } from "@/lib/db";
import type { MembersSettings } from "./settings";

// Validation rules and messages copied from Ultimate Member 2.x
// (um-actions-form.php / class-validation.php) for the forms used on the site.

export type FieldErrors = Record<string, string>;

const EMAIL_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export const isEmail = (v: string) => v.length <= 254 && EMAIL_RE.test(v);

/** UM safe_username: WP sanitize_user(strict) chars. */
export const safeUsername = (v: string) => /^[A-Za-z0-9 _.\-@]+$/.test(v);

export async function validateUsername(v: string, s: MembersSettings, excludeId?: number): Promise<string | null> {
  if (!v) return "You must provide a username";
  if (v.length < 3) return "Your Username must contain at least 3 characters";
  if (v.length > 24) return "Your Username must contain less than 24 characters";
  const taken = await prisma.user.findFirst({
    where: { username: { equals: v, mode: "insensitive" }, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  if (taken) return "The username you entered is incorrect";
  if (isEmail(v)) return "Username cannot be an email";
  if (!safeUsername(v)) return "Your username contains invalid characters";
  if (s.blockedWords.some((w) => w && v.toLowerCase() === w.toLowerCase()))
    return "You are not allowed to use this word as your username.";
  return null;
}

export async function validateEmail(v: string, s: MembersSettings, excludeId?: number): Promise<string | null> {
  if (!v) return "You must provide your email";
  const taken = await prisma.user.findFirst({
    where: { email: { equals: v, mode: "insensitive" }, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    select: { id: true },
  });
  if (taken) return "This email address is already in use";
  if (!isEmail(v)) return "This is not a valid email";
  const lower = v.toLowerCase();
  const domain = lower.split("@")[1] ?? "";
  if (
    s.blockedEmails.some((b) => {
      const x = b.trim().toLowerCase();
      if (!x) return false;
      if (x.startsWith("*@")) return domain === x.slice(2);
      return x === lower;
    })
  )
    return "This email address has been blocked.";
  return null;
}

/** Password checks for a field with force_good_pass + min/max chars (registration / change). */
export function validatePassword(
  pw: string,
  s: MembersSettings,
  ctx: { username?: string; email?: string; strong?: boolean } = {},
): string | null {
  if (!pw) return "You must enter a new password";
  if (pw.includes("\\")) return 'Passwords may not contain the character "\\".';
  if (pw.length < s.passwordMinChars) return `Your password must contain at least ${s.passwordMinChars} characters`;
  if (pw.length > s.passwordMaxChars) return `Your password must contain less than ${s.passwordMaxChars} characters`;
  if (ctx.strong !== false) {
    const lower = pw.toLowerCase();
    if (ctx.username && ctx.username.length >= 3 && lower.includes(ctx.username.toLowerCase()))
      return "Your password cannot contain the part of your username";
    const local = ctx.email?.split("@")[0]?.toLowerCase();
    if (local && local.length >= 3 && lower.includes(local)) return "Your password cannot contain the part of your email address";
    if (!/\p{Lu}/u.test(pw)) return "Your password must contain at least one capital letter";
    if (!/\p{Ll}/u.test(pw)) return "Your password must contain at least one lowercase letter";
    if (!/\p{N}/u.test(pw)) return "Your password must contain at least one number";
  }
  return null;
}

export const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};
