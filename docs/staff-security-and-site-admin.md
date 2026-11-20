# Staff security, client portal codes and site admin

## Deploy checklist
- Run `npx prisma db push` against the production database before or with this release. It adds `User` columns (`twoFactorEnabled`, `twoFactorSecret`, `twoFactorBackupCodes`, `twoFactorLastStep`, `permissions`) and the `Testimonial` and `PortalOtp` tables.
- `SESSION_SECRET` (32+ characters) is required. 2FA secrets are encrypted with it unless `SETTINGS_ENCRYPTION_KEY` is set. Changing either later makes stored 2FA secrets unreadable, so staff would need their 2FA reset.
- `PORTAL_OTP=off` switches off the emailed client code (use only if email delivery is down).

## Staff accounts
- No public sign-up. `registerAction` always refuses and `/register` redirects to `/contact`. Admins create staff in Admin > Users.
- Staff (ADMIN and STAFF roles) must use 2FA. Password login leads to `/login/setup-2fa` (first time) or `/login/verify`. A session only exists after the second step. "Remember this device" is a signed cookie bound to the user's 2FA secret, 30 days.
- Admin > Users > edit shows Staff access (standard, junior, custom areas) and Reset two-step sign-in.
- Access areas are defined in `src/lib/access.ts`. Unmapped `/admin` paths are admin-only. The middleware enforces areas from claims in the session; `/api/auth/refresh` re-reads the database about every 5 minutes, so a change or deactivation applies within that time.
- Recovery from the command line: `npx tsx scripts/users.ts create-admin <username> <email> [password]` and `npx tsx scripts/users.ts reset-2fa <username>`.

## Client portal
- Links (`?mm_case=&mm_key=`) now also need a 6-digit code emailed to an address on the case. Enforced in `authPortal` (`src/modules/crm/cases.ts`), so uploads, downloads, messages, saves and print are covered. Staff previewing while logged in skip the code.
- Codes are stored hashed, last 10 minutes, allow 5 tries and 3 sends per 15 minutes. A verified browser stays unlocked for 12 hours.

## Website content
- Admin > Lenders edits the lender list on the home page (defaults live in `src/modules/web/lenders.ts`; confirm them against the current AFG panel).
- Admin > Testimonials adds quotes. The home page section only shows once one is published.
- Enquiry emails go to Admin > Settings > "Enquiry and broker notifications to" (blank = the From address).
- Visa pages still exist but are not linked from the menu or home page. `/about/sulav-adhikari`, `/how-we-are-paid`, `/legal/credit-guide` and `/legal/complaints` redirect.
