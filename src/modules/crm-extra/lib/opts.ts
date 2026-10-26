import { rehostWpAsset } from "@/lib/assets";
// Settings used by the crm-extra module.
// - General CRM options (from_name/from_email/brand_logo/signature …) live under
//   "crm.options" (owned by crm-core's Settings page). We read them tolerantly
//   (snake_case as in WP, or camelCase) and fall back to the WP defaults.
// - Zoho Mail OAuth + mailbox settings live under "crmx.zoho" (owned here).
// - Email signature settings live under "crmx.mail" (owned here, editable on
//   the Zoho / Email settings page and the marketing signature editor).
import { getSetting, setSetting } from "@/lib/settings";

export const SITE_URL = (process.env.SITE_URL || "https://www.mustangmortgage.com.au").replace(/\/+$/, "");
export const SITE_NAME = "Mustang Mortgage";
export const DEFAULT_LOGO = "https://www.mustangmortgage.com.au/wp-content/uploads/2024/06/cropped-MM-PNG-LOGO.png";

type AnyObj = Record<string, unknown>;
const pick = (o: AnyObj, ...keys: string[]) => {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null && o[k] !== "") return o[k];
  return undefined;
};

export type CrmOptions = {
  brandLogo: string;
  fromName: string;
  fromEmail: string;
  signatureHtml: string;
  autoAppendSignature: boolean;
  commissionTarget: number;
  notifyEmail: string;
};

export async function getCrmOptions(): Promise<CrmOptions> {
  const o = await getSetting<AnyObj>("crm.options", {});
  const mail = await getSetting<AnyObj>("crmx.mail", {});
  const sig = pick(mail, "signatureHtml") ?? pick(o, "signature_html", "signatureHtml") ?? "";
  const auto = pick(mail, "autoAppendSignature") ?? pick(o, "auto_append_signature", "autoAppendSignature") ?? 1;
  return {
    brandLogo: rehostWpAsset(String(pick(o, "brand_logo", "brandLogo") ?? DEFAULT_LOGO)),
    fromName: String(pick(o, "from_name", "fromName") ?? process.env.MAIL_FROM_NAME ?? SITE_NAME),
    fromEmail: String(pick(o, "from_email", "fromEmail") ?? process.env.MAIL_FROM ?? "info@mustangmortgage.com.au"),
    signatureHtml: String(sig),
    autoAppendSignature: auto === true || auto === 1 || auto === "1",
    commissionTarget: Number(pick(o, "commission_target", "commissionTarget") ?? 0) || 0,
    notifyEmail: String(pick(o, "notify_email", "notifyEmail") ?? process.env.ADMIN_NOTIFY_EMAIL ?? ""),
  };
}

export async function saveMailSettings(v: { signatureHtml: string; autoAppendSignature: boolean }) {
  await setSetting("crmx.mail", v);
}

export type ZohoDc = "com" | "com.au" | "eu" | "in";
export const ZOHO_DCS: ZohoDc[] = ["com", "com.au", "eu", "in"];

export type ZohoSettings = {
  dc: ZohoDc;
  clientId: string;
  clientSecret: string;
  refresh: string;
  access: string;
  accessExp: number; // unix seconds
  accountId: string;
  label: string;
  inboxFolder: string;
  sentFolder: string;
  fromEmail: string; // overrides crm.options from_email for Zoho fromAddress
  alias1: string;
  alias2: string;
};

export const ZOHO_DEFAULTS: ZohoSettings = {
  dc: "com.au",
  clientId: "",
  clientSecret: "",
  refresh: "",
  access: "",
  accessExp: 0,
  accountId: "",
  label: "MustangCRM",
  inboxFolder: "",
  sentFolder: "",
  fromEmail: "",
  alias1: "",
  alias2: "",
};

export async function getZoho(): Promise<ZohoSettings> {
  return getSetting<ZohoSettings>("crmx.zoho", { ...ZOHO_DEFAULTS });
}
export async function saveZoho(patch: Partial<ZohoSettings>) {
  const cur = await getZoho();
  await setSetting("crmx.zoho", { ...cur, ...patch });
}

export function dcBase(dc: string): [string, string] {
  const d = dc || "com.au";
  return [`https://accounts.zoho.${d}`, `https://mail.zoho.${d}`];
}

/** From-address used for sending (Zoho fromAddress / SMTP from). */
export async function fromAddress() {
  const z = await getZoho();
  const o = await getCrmOptions();
  return z.fromEmail || o.fromEmail;
}

export const zohoConnected = (z: ZohoSettings) => !!(z.refresh && z.accountId);
