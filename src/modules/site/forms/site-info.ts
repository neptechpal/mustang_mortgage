import { getSetting } from "@/lib/settings";

// Values behind CF7's special mail-tags ([_site_title], [_site_url], [_site_admin_email]).
// The WP admin_email was a developer mailbox, so it is configurable via the
// "site.adminEmail" setting / SITE_ADMIN_EMAIL env and defaults to the business inbox.
export async function siteInfo() {
  const adminEmail =
    (await getSetting<string>("site.adminEmail", "").catch(() => "")) || process.env.SITE_ADMIN_EMAIL || "info@mustangmortgage.com.au";
  const url = (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://www.mustangmortgage.com.au").replace(/\/$/, "");
  return { title: "Mustang Mortgage", url, adminEmail };
}

const TZ = "Australia/Sydney";

/** WordPress date_format "F j, Y" */
export const wpDate = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "long", day: "numeric", year: "numeric" }).format(d);

/** WordPress time_format "g:i a" */
export const wpTime = (d: Date) =>
  new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true })
    .format(d)
    .replace(" AM", " am")
    .replace(" PM", " pm");
