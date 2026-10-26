// Mustang Mini-CRM public lead form [mmcrm_form id="3012"] embedded on /contact/
// ("Client Enquiry (website lead form)"). Field keys + CRM case mapping as in WP.

export type LeadField = {
  key: string;
  label: string;
  type: "text" | "email" | "tel" | "checkbox" | "currency" | "select" | "textarea";
  required?: boolean;
  width: "half" | "full";
  options?: string[];
  default?: string;
  map?: string; // CRM case meta key the WP plugin mapped this answer to
};

export const LEAD_FORM = {
  id: 3012,
  title: "Client Enquiry (website lead form)",
  accent: "#987633",
  intro: "Tell us a little about what you need and we will be in touch shortly.",
  submitLabel: "Send enquiry",
  success: "Thanks — we have your enquiry and will be in touch soon.",
  sections: [
    {
      title: "About you",
      fields: [
        { key: "applicant_count", label: "Number of applicants", type: "select", required: true, width: "half", options: ["1", "2", "3", "4"], default: "1", map: "applicant_count" },
        { key: "full_name", label: "Applicant 1 — full name", type: "text", required: true, width: "half", map: "app1_name" },
        { key: "email", label: "Email address", type: "email", required: true, width: "half", map: "app1_email" },
        { key: "mobile", label: "Mobile number", type: "tel", required: true, width: "half", map: "app1_mobile" },
      ],
    },
    ...[2, 3, 4].map(n => ({ title: `Applicant ${n}`, applicant: n, fields: [
      { key: `full_name_${n}`, label: 'Full name', type: 'text', required: true, width: 'half', map: `app${n}_name` },
      { key: `email_${n}`, label: 'Email address', type: 'email', width: 'half', map: `app${n}_email` },
      { key: `mobile_${n}`, label: 'Mobile number', type: 'tel', width: 'half', map: `app${n}_mobile` },
    ] })),
    {
      title: "What are you looking for?",
      fields: [
        { key: "purpose", label: "I would like help to", type: "checkbox", width: "full", options: ["Buy a home", "Refinance", "Invest", "Build", "Something else"] },
        { key: "loan_amount", label: "Approximate loan amount", type: "currency", width: "half", map: "loan_amount" },
        { key: "timeframe", label: "When are you looking to proceed?", type: "select", width: "half", options: ["As soon as possible", "Within 1–3 months", "3–6 months", "Just exploring"] },
        { key: "notes", label: "Additional info (details of the conversation)", type: "textarea", width: "full", map: "broker_note" },
      ],
    },
  ] as { title: string; applicant?: number; fields: LeadField[] }[],
};

export const LEAD_FIELDS = LEAD_FORM.sections.flatMap((s) => s.fields);
export const LEAD_EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
