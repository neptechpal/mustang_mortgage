import { getSetting, setSetting } from "@/lib/settings";
import { rehostWpAsset } from "@/lib/assets";

// mm_crm_options (core.php defaults) minus the Zoho keys, which crm-extra stores itself.
export type CrmOptions = {
  brand_logo: string;
  from_name: string;
  from_email: string;
  signature_html: string;
  auto_append_signature: number;
  commission_target: number;
  notify_email: string; // broker notification address (defaults to from_email)
};
export const CRM_OPTIONS_DEFAULTS: CrmOptions = {
  brand_logo: "https://www.mustangmortgage.com.au/wp-content/uploads/2024/06/cropped-MM-PNG-LOGO.png",
  from_name: "Mustang Mortgage",
  from_email: "info@mustangmortgage.com.au",
  signature_html: "",
  auto_append_signature: 1,
  commission_target: 0,
  notify_email: "",
};
export const getCrmOptions = async () => {
  const o = await getSetting<CrmOptions>("crm.options", CRM_OPTIONS_DEFAULTS);
  return { ...o, brand_logo: o.brand_logo ? rehostWpAsset(o.brand_logo) : o.brand_logo };
};
export const saveCrmOptions = (o: CrmOptions) => setSetting("crm.options", o);

// mmcrm_auto (MMCRM_Automation::defaults)
export type AutoOptions = {
  stage_on_docs: number;
  task_on_ff: number;
  task_on_form: number;
  task_on_create: number;
  followup_days: number;
  welcome_public: number;
  portal_off_on_flex: number;
  portal_off_on_close: number;
  chase_enabled: number;
  chase_after_days: number;
  chase_every_days: number;
  chase_max: number;
  chase_hour_from: number;
  chase_hour_to: number;
  chase_weekends: number;
  chase_subject: string;
  chase_body: string;
};
export const AUTO_DEFAULTS: AutoOptions = {
  stage_on_docs: 1,
  task_on_ff: 1,
  task_on_form: 1,
  task_on_create: 1,
  followup_days: 2,
  welcome_public: 1,
  portal_off_on_flex: 1,
  portal_off_on_close: 1,
  chase_enabled: 0,
  chase_after_days: 3,
  chase_every_days: 4,
  chase_max: 3,
  chase_hour_from: 9,
  chase_hour_to: 17,
  chase_weekends: 0,
  chase_subject: "Quick reminder — a few items still needed",
  chase_body:
    "Hi {{greeting_names}},\n\nJust a quick reminder — we're still waiting on a few things to keep your application moving:\n\n{{outstanding}}\n\n{{portal_button}}\n\nIf you've already sent these, thank you — please ignore this message. If you're stuck or have any questions, just reply to this email and I'll help.",
};
export const getAutoOptions = () => getSetting<AutoOptions>("crm.auto", AUTO_DEFAULTS);
export const saveAutoOptions = (o: AutoOptions) => setSetting("crm.auto", o);

// mmcrm_checklist_presets
export type Preset = { name: string; tags: string[]; items: string[] };
export const DEFAULT_PRESETS: Preset[] = [
  { name: "Identification", tags: ["all"], items: ["Photo ID (driver licence or passport)", "Second ID (Medicare card or other)"] },
  { name: "PAYG income", tags: ["payg"], items: ["Last 2 payslips", "Latest PAYG payment summary / ATO income statement", "3 months bank statements (all accounts)"] },
  {
    name: "Self-employed income",
    tags: ["self"],
    items: [
      "Last 2 years personal tax returns & notices of assessment",
      "Last 2 years company/business financials",
      "Last 4 quarters BAS",
      "ATO portal statement (income tax & activity statements)",
      "3 months business bank statements",
    ],
  },
  { name: "Purchase", tags: ["purchase", "investment"], items: ["Contract of sale (or offer / expression of interest)", "Evidence of deposit / genuine savings (3 months)", "Proof of any gift or family guarantee"] },
  {
    name: "Refinance",
    tags: ["refinance"],
    items: ["Current loan statements (last 6 months)", "Latest council rates notice", "Building insurance certificate of currency", "Statements for all credit cards & other debts"],
  },
  { name: "Construction", tags: ["construction"], items: ["Building contract & plans", "Council approval / DA", "Builder licence & insurance", "Land title / contract of sale"] },
];
export async function getPresets(): Promise<Preset[]> {
  const p = await getSetting<Preset[] | null>("crm.presets", null);
  return Array.isArray(p) && p.length ? p : DEFAULT_PRESETS;
}
export const savePresets = (p: Preset[]) => setSetting("crm.presets", p);

// mmcrm_form_email_tpl
export type FormEmailTpl = { subject: string; body: string };
export const FORM_EMAIL_DEFAULTS: FormEmailTpl = {
  subject: "Please complete your {{form_name}}",
  body: "Hi {{greeting_names}},\n\nPlease complete your {{form_name}} using the secure link below. It takes a few minutes, saves automatically, and you can return to it any time.\n\n{{form_button}}\n\nIf you have any questions just reply to this email.",
};
export async function getFormEmailTpl(): Promise<FormEmailTpl> {
  const o = await getSetting<Partial<FormEmailTpl>>("crm.formEmail", {});
  return { subject: o.subject || FORM_EMAIL_DEFAULTS.subject, body: o.body || FORM_EMAIL_DEFAULTS.body };
}
export const saveFormEmailTpl = (t: FormEmailTpl) => setSetting("crm.formEmail", t);

// mmcrm_ff_form_id (0 = classic built-in Fact Find)
export const getFfFormId = () => getSetting<number>("crm.ffFormId", 0);
export const setFfFormId = (id: number) => setSetting("crm.ffFormId", id);

// Public portal path. WP portal page was /secure-upload-3/ (portal_page_id 2840); those URLs redirect here.
export const getPortalPath = () => getSetting<string>("crm.portalPath", "/portal");
