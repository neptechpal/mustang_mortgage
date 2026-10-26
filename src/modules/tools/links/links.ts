import { getSetting } from "@/lib/settings";

export type CustomLink = { id: string; label: string; url: string; group?: string; target?: number; modal?: number; order?: number; notes?: string; icon?: string };

// Setting key for WP option `mmcrm_custom_links` (owned by the Custom Links admin module).
export const CUSTOM_LINKS_KEY = "crm.customLinks";

// Live rows as rendered on /serviceability (2025), used until the option is imported/edited.
export const DEFAULT_LINKS: CustomLink[] = [
  { id: "l_1", label: "Stamp Duty Calc", url: "https://www.visionabacus.net/Tools/B3/SuiteA/Z200/MFAA/Stamp_Duty_Calculator/", target: 1, modal: 1, order: 1 },
  { id: "l_2", label: "Digital ID", url: "/digital-id", target: 0, modal: 1, order: 2 },
  { id: "l_3", label: "Borrowing Power Calc", url: "https://www.visionabacus.net/Tools/B3/SuiteA/Z200/MFAA/Borrowing_Power_Calculator/", target: 1, modal: 1, order: 3 },
  { id: "l_4", label: "Income Tax Calc", url: "https://www.visionabacus.net/Tools/B3/SuiteA/Z200/MFAA/income_tax_Calculator/", target: 1, modal: 1, order: 4 },
  { id: "l_5", label: "Loan Repayment", url: "https://www.visionabacus.net/Tools/B3/SuiteA/Z200/MFAA/loan_repayment_Calculator/", target: 1, modal: 1, order: 5, notes: "Loan Repayment" },
  { id: "l_6", label: "Home Loan Offset", url: "https://www.visionabacus.net/Tools/B3/SuiteA/Z200/MFAA/home_loan_offset_calculator/", target: 1, modal: 1, order: 6 },
  { id: "l_7", label: "Flex", url: "/admin/borrowing?tab=flex", target: 0, modal: 1, order: 7 },
  { id: "l_8", label: "Quickli", url: "https://app.quickli.com.au/", target: 1, modal: 0, order: 8 },
];

/** Rewrites absolute links to the old WP site to local paths. */
function localise(url: string) {
  return url
    .replace(/^https?:\/\/(www\.)?mustangmortgage\.com\.au\/wp-admin\/admin\.php\?page=mm-borrow-flex.*$/i, "/admin/borrowing?tab=flex")
    .replace(/^https?:\/\/(www\.)?mustangmortgage\.com\.au(?=\/|$)/i, "") || "/";
}

export async function getCustomLinks(): Promise<CustomLink[]> {
  const rows = await getSetting<CustomLink[] | null>(CUSTOM_LINKS_KEY, null);
  const list = Array.isArray(rows) && rows.length ? rows : DEFAULT_LINKS;
  return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((r) => ({ ...r, url: localise(r.url ?? "") }));
}
