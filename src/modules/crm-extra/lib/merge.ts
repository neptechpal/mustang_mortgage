// Merge-tag engine (port of core.php mmcrm_build_context / merge).
import { applicants, applicantEmails } from "@/modules/crm/applicants";
import { prisma } from "@/lib/db";
import { getCrmOptions, SITE_NAME } from "./opts";
import { portalUrl } from "./cases";
import { esc, nl2p } from "./html";

const first = (n: string) => (n || "").trim().split(/\s+/)[0] || "";
const smartJoin = (a: string[]) => a.filter(Boolean).join(" & ");

export function pendingListHtml(items: { label: string; status: string; note: string }[]) {
  const pend = items.filter((i) => i.status === "Pending" || i.status === "Rejected");
  if (!pend.length) return "<p>No pending items.</p>";
  return (
    "<ul>" +
    pend.map((i) => `<li>${esc(i.label)} <em>(${esc(i.status)})</em>${i.note ? " — " + esc(i.note) : ""}</li>`).join("") +
    "</ul>"
  );
}

export async function buildContext(caseId: number): Promise<Record<string, string>> {
  const o = await getCrmOptions();
  const c = await prisma.case.findUnique({ where: { id: caseId }, include: { documents: { orderBy: { sort: "asc" } } } });
  const today = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const base: Record<string, string> = { site_name: SITE_NAME, brand_logo_url: o.brandLogo, today, signature_html: o.signatureHtml };
  if (!c) return base;
  const a1 = c.app1Name.trim() || c.legacyName.trim();
  const a2 = c.app2Name.trim();
  const portal = portalUrl(c);
  const emails = Array.from(new Set([...applicantEmails(c), c.legacyEmail].filter(Boolean)));
  return {
    ...base,
    applicant1_full_name: a1,
    applicant2_full_name: a2,
    applicant3_full_name: c.app3Name, applicant4_full_name: c.app4Name,
    applicant3_first_name: first(c.app3Name), applicant4_first_name: first(c.app4Name),
    applicant1_first_name: first(a1),
    applicant2_first_name: first(a2),
    applicants_first_names: smartJoin([first(a1), ...applicants(c).slice(1).map(a => first(a.name))]),
    applicants_full_names: smartJoin([a1, ...applicants(c).slice(1).map(a => a.name)]),
    greeting_names: smartJoin([first(a1), ...applicants(c).slice(1).map(a => first(a.name))]) || "there",
    applicant_full_name: a1 || c.legacyName,
    applicant_first_name: first(a1 || c.legacyName),
    applicant_email_list: emails.join(", "),
    case_id: String(c.id),
    client_name: c.title || a1,
    portal_url: portal,
    portal_button: `<a href="${esc(portal)}" style="background:#987633;color:#fff;text-decoration:none;padding:8px 12px;border-radius:8px;display:inline-block">Go to your secure portal</a>`,
    checklist_pending_list: pendingListHtml(c.documents),
  };
}

/** Replace {{key}} tokens; unknown keys are kept literally. */
export function merge(tpl: string, ctx: Record<string, string>, isHtml = false) {
  const out = tpl.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (m, k) => (k in ctx ? ctx[k] : m));
  if (isHtml && !/<\/(p|div|ul|ol|table|h[1-6]|blockquote|pre)>/i.test(out)) return nl2p(out);
  return out;
}

export const MERGE_TAGS = [
  "greeting_names",
  "applicant1_full_name",
  "applicant2_full_name",
  "applicant1_first_name",
  "applicant2_first_name", "applicant3_first_name", "applicant4_first_name", "applicant3_full_name", "applicant4_full_name",
  "applicants_first_names",
  "applicants_full_names",
  "applicant_email_list",
  "case_id",
  "client_name",
  "site_name",
  "brand_logo_url",
  "today",
  "portal_url",
  "portal_button",
  "checklist_pending_list",
  "signature_html",
];
