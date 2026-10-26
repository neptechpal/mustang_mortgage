import type { User } from "@prisma/client";
import { sendMail, fillTemplate, escapeHtml } from "@/lib/mail";
import { getMembersSettings, type EmailKey, type MembersSettings } from "./settings";
import { displayNameOf, profileUrl } from "./profile";
import { siteUrl } from "./security";

// Ultimate Member HTML e-mail templates (wp-content/plugins/ultimate-member/templates/email/*.php),
// reproduced with their original inline styles.

const SITE_NAME = "Mustang Mortgage";
const A = 'style="color: #3ba1da;text-decoration: none;"';
const BTN = 'style="background: #555555;color: #fff;padding: 12px 30px;text-decoration: none;border-radius: 3px;letter-spacing: 0.3px;"';
const HEAD = 'style="padding: 30px 0;font-size: 24px;text-align: center;line-height: 40px;"';
const SPAN = 'style="display: block;"';

function shell(content: string) {
  return `<div style="max-width: 560px;padding: 20px;background: #ffffff;border-radius: 5px;margin:40px auto;font-family: Open Sans,Helvetica,Arial;font-size: 15px;color: #666;">
<div style="color: #444444;font-weight: normal;">
<div style="text-align: center;font-weight:600;font-size:26px;padding: 10px 0;border-bottom: solid 3px #eeeeee;">{site_name}</div>
<div style="clear:both"></div>
</div>
<div style="padding: 0 30px 30px 30px;border-bottom: 3px solid #eeeeee;">
${content}
</div>
<div style="color: #999;padding: 20px 30px">
<div style="">Thank you!</div>
<div style="">The <a href="{site_url}" ${A}>{site_name}</a> Team</div>
</div>
</div>`;
}

const button = (href: string, label: string) =>
  `<div style="padding: 10px 0 50px 0;text-align: center;"><a href="${href}" ${BTN}>${label}</a></div>`;
const para = (html: string) => `<div style="padding: 0 0 15px 0;">${html}</div>`;
const contact = (lead: string, tail = "") =>
  `<div style="padding: 0 0 15px 0;">${lead} <a href="mailto:{admin_email}" ${A}>contact us</a>${tail}</div>`;

const BODIES: Record<EmailKey, string> = {
  welcome_email: `<div ${HEAD}>Thank you for signing up! <span ${SPAN}>Your account is now active.</span></div>
${button("{action_url}", "{action_title}")}
<div style="padding:20px;">If you have any problems, please contact us at <a href="mailto:{admin_email}" ${A}>{admin_email}</a></div>`,
  checkmail_email: `<div ${HEAD}>Thank you for signing up!<span ${SPAN}>Please click the following link to activate your account.</span></div>
${button("{account_activation_link}", "Activate your Account")}
<div style="padding: 20px;">Need help? <a href="mailto:{admin_email}" ${A}>contact  us</a> today.</div>`,
  pending_email: `<div ${HEAD}>Thank you for signing up!<span ${SPAN}>Your account has to be manually reviewed.</span></div>
<div style="padding: 0 0 50px 0;text-align: center;">Please allow us some time to process your request and review your information.</div>`,
  approved_email: `<div ${HEAD}>Thank you for signing up!<span ${SPAN}>Your account is now approved.</span></div>
${button("{login_url}", "Login to our site")}
<div style="padding: 0 0 30px 0;">
<div style="font-size:15px;font-weight:600;padding:0 0 10px 0;">Account Information</div>
<div style="padding: 0 0 5px 0;"><span>Your account email:</span> <span style="font-weight:600;">{email}</span></div>
<div style="padding: 0 0 5px 0;"><span>Your account username:</span> <span style="font-weight:600;">{username}</span></div>
<div style="padding: 0 0 5px 0;"><span>Set your password:</span> <span style="font-weight:600;"><a href="{password_reset_link}" ${A}>{password_reset_link}</a></span></div>
</div>`,
  rejected_email: `<div ${HEAD}>Your registration request has been rejected.</div>
${contact("Please feel free to apply at a future date or", " If you want your information to be reviewed again.")}`,
  inactive_email: `<div ${HEAD}>Your account is now deactivated.</div>
${contact("If you want your account to be re-activated, please", ".")}`,
  deletion_email: `<div ${HEAD}>Your account has been deleted.<span ${SPAN}>All your personal details and any uploads have been permanently removed.</span></div>
${contact("If your account has been deleted by accident please", ".")}`,
  resetpw_email: `<div ${HEAD}>We received a request to reset the password for your account. If you made this request, click the link below to change your password:</div>
${button("{password_reset_link}", "Reset your password")}
<div style="padding: 0 0 15px 0;">If you didn't make this request, ignore this email or <a href="mailto:{admin_email}" ${A}>report it to us</a>.</div>`,
  changedpw_email: `<div ${HEAD}>You recently changed the password associated with your account.</div>
${button("{user_account_link}", "Go to your Account")}
<div style="padding: 0 0 15px 0;">If you did not make this change and believe your account has been compromised, please <a href="mailto:{admin_email}" ${A}>contact  us</a> ASAP.</div>`,
  changedaccount_email: `<div ${HEAD}>You recently updated your account.</div>
${button("{user_account_link}", "Go to your Account")}
<div style="padding: 0 0 15px 0;">If you did not make this change and believe your account has been compromised, please <a href="mailto:{admin_email}" ${A}>contact  us</a> ASAP.</div>`,
  notification_new_user: `<div ${HEAD}>{display_name} has just created an account on {site_name}.</div>
${para(`To view their profile click here: <a href="{user_profile_link}" ${A}>{user_profile_link}</a>`)}
<div style="padding: 0 0 15px 0;"><div style="padding: 15px;background: #eee;border-radius: 3px;">Here is the submitted registration form:<br /><br />{submitted_registration}</div></div>`,
  notification_review: `<div ${HEAD}>{display_name} has just applied for membership to {site_name} and is waiting to be reviewed.</div>
${para(`To review this member please click the following link: <a href="{user_profile_link}" ${A}>{user_profile_link}</a>`)}
<div style="padding: 0 0 15px 0;"><div style="padding: 15px;background: #eee;border-radius: 3px;">Here is the submitted registration form:<br /><br />{submitted_registration}</div></div>`,
  notification_deletion: `<div ${HEAD}>{display_name} has just deleted their {site_name} account.</div>`,
};

const ADMIN_KEYS: EmailKey[] = ["notification_new_user", "notification_review", "notification_deletion"];

export function renderUmEmail(key: EmailKey, vars: Record<string, string>) {
  return fillTemplate(shell(BODIES[key]), vars);
}

type MailUser = Pick<User, "id" | "username" | "email" | "firstName" | "lastName" | "displayName">;

/**
 * Sends one of the UM notification e-mails if enabled in members.settings.
 * Extra placeholders (password_reset_link, account_activation_link, submitted_registration…) via `extra`.
 * Values in `extra` are inserted as-is (callers escape where needed).
 */
export async function sendUmEmail(key: EmailKey, user: MailUser, extra: Record<string, string> = {}, settings?: MembersSettings) {
  const s = settings ?? (await getMembersSettings());
  const conf = s.emails[key];
  if (!conf?.on) return { ok: false, error: "disabled" };
  const name = displayNameOf(user);
  const vars: Record<string, string> = {
    site_name: SITE_NAME,
    site_url: siteUrl("/"),
    admin_email: s.adminEmail.split(",")[0]?.trim() || "",
    display_name: escapeHtml(name),
    first_name: escapeHtml(user.firstName),
    last_name: escapeHtml(user.lastName),
    username: escapeHtml(user.username),
    email: escapeHtml(user.email),
    user_id: String(user.id),
    login_url: siteUrl("/login"),
    user_account_link: siteUrl("/account"),
    user_profile_link: ADMIN_KEYS.includes(key) ? siteUrl(`/admin/users/${user.id}`) : siteUrl(profileUrl(user.username)),
    action_url: siteUrl(profileUrl(user.username)),
    action_title: "View Profile",
    ...extra,
  };
  const subject = fillTemplate(conf.subject, { ...vars, display_name: name, username: user.username });
  const to = ADMIN_KEYS.includes(key) ? s.adminEmail : user.email;
  return sendMail({
    to,
    subject,
    html: renderUmEmail(key, vars),
    fromName: s.mailFromName || undefined,
    context: `um:${key}:${user.id}`,
  });
}

/** HTML listing of submitted registration fields for admin notifications. */
export function submittedRegistration(fields: Record<string, string>) {
  return Object.entries(fields)
    .map(([k, v]) => `<p><label>${escapeHtml(k)}:</label> <span>${escapeHtml(v)}</span></p>`)
    .join("");
}
