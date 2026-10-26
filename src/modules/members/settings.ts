import { getSetting, setSetting } from "@/lib/settings";

// Replacement for the Ultimate Member options (um_options + um_role_subscriber_meta)
// as they were configured on the live site. Stored under setting key "members.settings".

export type EmailKey =
  | "welcome_email"
  | "checkmail_email"
  | "pending_email"
  | "approved_email"
  | "rejected_email"
  | "inactive_email"
  | "deletion_email"
  | "resetpw_email"
  | "changedpw_email"
  | "changedaccount_email"
  | "notification_new_user"
  | "notification_review"
  | "notification_deletion";

export type EmailSetting = { on: boolean; subject: string };

export type RegisterStatus = "approved" | "checkmail" | "pending";

export type MembersSettings = {
  registrationEnabled: boolean;
  /** UM role setting "Registration Status" for the default (subscriber) role. */
  registerStatus: RegisterStatus;
  /** UM "Action to be taken after registration" when auto-approved. */
  afterRegister: "redirect_profile" | "redirect_url";
  afterRegisterUrl: string;
  /** Custom messages shown after registering (UM role meta defaults). */
  checkmailMessage: string;
  pendingMessage: string;
  /** Admin e-mail address(es) for notifications (UM "admin_email"). */
  adminEmail: string;
  mailFromName: string;
  blockedWords: string[];
  blockedEmails: string[];
  passwordMinChars: number;
  passwordMaxChars: number;
  resetPasswordLimit: number; // 0 = unlimited
  profileBioMaxChars: number;
  directory: {
    enabled: boolean;
    perPage: number;
    perPageMobile: number;
    search: boolean;
    header: string;
    headerSingle: string;
    noUsers: string;
    /** who may view the directory: everyone | members | staff */
    visibleTo: "everyone" | "members" | "staff";
  };
  emails: Record<EmailKey, EmailSetting>;
};

export const DEFAULT_MEMBERS_SETTINGS: MembersSettings = {
  registrationEnabled: true,
  registerStatus: "approved",
  afterRegister: "redirect_profile",
  afterRegisterUrl: "",
  checkmailMessage:
    "Thank you for registering. Before you can login we need you to activate your account by clicking the activation link in the email we just sent you.",
  pendingMessage:
    "Thank you for applying for membership to our site. We will review your details and send you an email letting you know whether your application has been successful or not.",
  adminEmail: process.env.ADMIN_NOTIFY_EMAIL || "info@mustangmortgage.com.au",
  mailFromName: "Mustang Mortgage",
  blockedWords: ["admin", "administrator", "webmaster", "support", "staff"],
  blockedEmails: [],
  passwordMinChars: 8,
  passwordMaxChars: 30,
  resetPasswordLimit: 3,
  profileBioMaxChars: 180,
  directory: {
    enabled: true,
    perPage: 12,
    perPageMobile: 6,
    search: false,
    header: "{total_users} Members",
    headerSingle: "{total_users} Member",
    noUsers: "We are sorry. We cannot find any users who match your search criteria.",
    visibleTo: "everyone",
  },
  emails: {
    welcome_email: { on: true, subject: "Welcome to {site_name}!" },
    checkmail_email: { on: false, subject: "Please activate your account" },
    pending_email: { on: false, subject: "[{site_name}] New user account" },
    approved_email: { on: false, subject: "Your account at {site_name} is now active" },
    rejected_email: { on: false, subject: "Your account has been rejected" },
    inactive_email: { on: true, subject: "Your account has been deactivated" },
    deletion_email: { on: true, subject: "Your account has been deleted" },
    resetpw_email: { on: true, subject: "Reset your password" },
    changedpw_email: { on: true, subject: "Your {site_name} password has been changed" },
    changedaccount_email: { on: true, subject: "Your account at {site_name} was updated" },
    notification_new_user: { on: true, subject: "[{site_name}] New user account" },
    notification_review: { on: false, subject: "[{site_name}] New user awaiting review" },
    notification_deletion: { on: false, subject: "[{site_name}] Account deleted" },
  },
};

export const EMAIL_LABELS: Record<EmailKey, string> = {
  welcome_email: "Account Welcome Email",
  checkmail_email: "Account Activation Email",
  pending_email: "Pending Review Email",
  approved_email: "Account Approved Email",
  rejected_email: "Account Rejected Email",
  inactive_email: "Account Deactivated Email",
  deletion_email: "Account Deleted Email",
  resetpw_email: "Password Reset Email",
  changedpw_email: "Password Changed Email",
  changedaccount_email: "Account Updated Email",
  notification_new_user: "New User Notification (admin)",
  notification_review: "Account Needs Review Notification (admin)",
  notification_deletion: "Account Deletion Notification (admin)",
};

const KEY = "members.settings";

export async function getMembersSettings(): Promise<MembersSettings> {
  const s = await getSetting<MembersSettings>(KEY, DEFAULT_MEMBERS_SETTINGS);
  // deep-merge nested objects so newly added keys always have defaults
  return {
    ...DEFAULT_MEMBERS_SETTINGS,
    ...s,
    directory: { ...DEFAULT_MEMBERS_SETTINGS.directory, ...(s.directory || {}) },
    emails: Object.fromEntries(
      (Object.keys(DEFAULT_MEMBERS_SETTINGS.emails) as EmailKey[]).map((k) => [
        k,
        { ...DEFAULT_MEMBERS_SETTINGS.emails[k], ...((s.emails || {})[k] || {}) },
      ]),
    ) as Record<EmailKey, EmailSetting>,
  };
}

export async function saveMembersSettings(s: MembersSettings) {
  await setSetting(KEY, s);
}
