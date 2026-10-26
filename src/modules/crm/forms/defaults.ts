// Built-in schemas: the classic hard-coded Fact Find (mmcrm-factfind.php render_form),
// the default engine Fact Find + enquiry form (MMCRM_Forms_Admin::default_*), and the
// builder's ready-made blocks.
import { normalizeSchema, type Schema } from "./engine";

type FD = Record<string, unknown>;
const F = (key: string, label: string, type = "text", o: FD = {}): FD => ({ key, label, type, width: "half", ...o });

/* ---------------- Classic (built-in) Fact Find ---------------- */
export function classicFactFind(): Schema {
  const lt3 = (k: string) => ({ field: k, op: "lt", value: "3" });
  const req = { required: 1 };
  const app = (n: 1 | 2 | 3 | 4): FD[] => {
    const p = `applicant${n}_`;
    const show = n > 1 ? { show_if: { field: "applicant_count", op: "gt", value: String(n - 1) } } : {};
    const personal = [
      F(p + "fullname", "Full Name", "text", { ...req, map: `app${n}_name` }),
      F(p + "email", "Email Address", "email", { ...req, map: `app${n}_email` }),
      F(p + "dob", "Date of Birth"),
      F(p + "mobile", "Mobile Number", "tel", { map: `app${n}_mobile` }),
      F(p + "citizenship", "Citizenship / Visa"),
      ...(n === 1 ? [F(p + "dependants", "Number of Dependants"), F(p + "dependant_details", "Dependant ages & childcare")] : []),
    ];
    const employment: FD[] = [
      F(p + "employment_type", "Employment Type", "select", { ...req, options: ["Full Time", "Part Time", "Casual", "Self Employed", "Contractor"] }),
      F(p + "occupation", "Occupation / Role", "text", req),
      F(p + "employer_name", "Employer / Business Name", "text", req),
      F(p + "length_current_employer", "Length of Current Employment (years)", "number", req),
      F(p + "previous_employer", "Previous Employer (< 3yrs)", "text", { ...req, show_if: lt3(p + "length_current_employer") }),
      F(p + "previous_occupation", "Previous Occupation / Role", "text", { ...req, show_if: lt3(p + "length_current_employer") }),
      F(p + "length_previous_employment", "Length of Previous Employment", "text", { ...req, show_if: lt3(p + "length_current_employer") }),
      { key: p + "emp_hint", type: "info", label: "", width: "full", content: "If less than 3 years, previous employment fields will be required." },
    ];
    if (n > 1) {
      employment.push(
        { key: p + "income_info", type: "info", label: "Income", width: "full" },
        F(p + "income_frequency", "Income Frequency", "select", { options: ["Weekly", "Fortnightly", "Monthly"] }),
        F(p + "income_amount", "Gross Income Amount"),
        F(p + "rental_income", "Rental Income"),
      );
    }
    return [
      { title: `Applicant ${n} — Personal Details`, tone: `a${n}`, ...show, fields: personal },
      {
        title: `Applicant ${n} — Address Details`, tone: `a${n}`, ...show,
        fields: [
          F(p + "current_address", "Current Residential Address", "text", req),
          F(p + "residential_status", "Residential Status", "select", { ...req, options: ["Own", "Mortgaged", "Renting", "Other"] }),
          F(p + "time_current_address", "Time at Current Address (years)", "number", req),
          F(p + "previous_address", "Previous Address (< 3yrs)", "text", { ...req, show_if: lt3(p + "time_current_address") }),
          F(p + "time_previous_address", "Time at Previous Address", "text", { ...req, show_if: lt3(p + "time_current_address") }),
          ...(n === 1 ? [{ key: "applicant1_addr_hint", type: "info", label: "", width: "full", content: "If less than 3 years, previous address fields will be required." }] : []),
        ],
      },
      { title: `Applicant ${n} — Employment Details`, tone: `a${n}`, ...show, fields: employment },
    ];
  };
  const exp: [string, string][] = [
    ["expenses_utilities_owner", "Utilities & Rates (Owner Occupied)"], ["expenses_telecom", "Telephone, Internet & Pay TV"],
    ["expenses_food", "Food & Groceries"], ["expenses_recreation", "Recreation & Entertainment"], ["expenses_clothing", "Clothing & Personal Care"],
    ["expenses_medical", "Medical & Health"], ["expenses_transport", "Transport"], ["expenses_education", "Education"],
    ["expenses_childcare", "Childcare"], ["expenses_insurance", "Insurance"], ["expenses_other", "Other"],
  ];
  return normalizeSchema({
    settings: {
      accent: "#6e56cf", submit_label: "Submit Fact Find", steps: 0, allow_edit: 1,
      intro: "You can save and return anytime using the same link.", success_msg: "Thank you — your Fact Find has been submitted.",
    },
    sections: [
      { title: "", fields: [F("applicant_count", "Number of Applicants", "select", { required: 1, options: ["1", "2", "3", "4"], default: "1", map: "applicant_count" })] },
      { title: "Purpose of Loan", description: "Select all that apply.", fields: [F("purpose_of_lending", "Purpose of Loan", "checkbox", { width: "full", options: ["Buy", "Refinance", "Construction", "Other"] })] },
      { title: "Objective of the Loan", fields: [F("compliance_objective", "Briefly describe what you want to achieve…", "textarea", { width: "full" })] },
      ...app(1),
      ...app(2), ...app(3), ...app(4),
      { title: "Monthly Expenses", fields: exp.map(([k, l]) => F(k, l, "text", { required: 1 })) },
      {
        title: "Assets",
        fields: [
          F("asset_savings", "Savings"), F("asset_vehicle_make_model", "Vehicle Make Model"), F("asset_vehicle_value", "Vehicle Value"),
          F("asset_superfund", "Superfund"), F("asset_home_contents", "Home Contents"),
          { key: "realestate_info", type: "info", label: "Real Estate Assets", width: "full" },
          F("realestate_type", "Property Type"), F("realestate_address", "Property Address"), F("realestate_value", "Estimated Value"),
        ],
      },
      {
        title: "Liabilities",
        fields: [
          F("liability_mortgage_loan_repayment", "Remaining Balance"), F("liability_mortgage_loan_rate", "Current Interest Rate"), F("liability_mortgage_loan_lender", "Current Lender"),
          F("liability_vehicle_loan_repayment", "Vehicle Loan Repayment"), F("liability_vehicle_loan_balance", "Vehicle Loan Balance"), F("liability_vehicle_loan_rate", "Vehicle Loan Rate (%)"),
          F("liability_cc_limit", "Credit Cards Limit"), F("liability_cc_balance", "Credit Cards Balance"),
        ],
      },
      { title: "Desired Loan Features", fields: [F("desired_loan_features", "Desired Loan Features", "checkbox", { width: "full", options: ["Variable rate", "Interest only", "Redraw", "Line of credit", "Fixed rate", "Offset account"] })] },
      { title: "Additional Comments", fields: [F("additional_comments", "Anything else you’d like us to know", "textarea", { width: "full" })] },
      { title: "Declaration", fields: [F("declaration_name", "Name", "text", req), F("signature_name", "Signature", "signature", req)] },
    ],
  });
}

/* ---------------- Engine default Fact Find (seeded as form "Fact Find") ---------------- */
export function defaultFactFind(): Schema {
  const sections: FD[] = [
    {
      title: "Your loan", description: "Tell us what you are looking to do.", fields: [
        F("applicant_count", "Number of applicants", "select", { required: 1, options: ["1", "2", "3", "4"], default: "1", map: "applicant_count" }),
        F("purpose_of_lending", "Purpose of loan", "checkbox", { width: "full", options: ["Buy", "Refinance", "Construction", "Other"] }),
        F("compliance_objective", "Objective of the loan", "textarea", { width: "full", placeholder: "Briefly describe what you want to achieve…" }),
      ],
    },
  ];
  for (const n of [1, 2, 3, 4]) {
    const p = `applicant${n}_`;
    const show = n > 1 ? { show_if: { field: "applicant_count", op: "gt", value: String(n - 1) } } : {};
    const tone = `a${n}`;
    const label = `Applicant ${n}`;
    const lt3 = (k: string) => ({ field: p + k, op: "lt", value: "3" });
    const personal = [
      F(p + "fullname", "Full name", "text", { required: 1, map: `app${n}_name` }),
      F(p + "email", "Email address", "email", { required: 1, map: `app${n}_email` }),
      F(p + "dob", "Date of birth", "date", { map: `app${n}_dob` }),
      F(p + "mobile", "Mobile number", "tel", { map: `app${n}_mobile` }),
      F(p + "citizenship", "Citizenship / visa"),
    ];
    if (n === 1) personal.push(F(p + "dependants", "Number of dependants", "number", { min: 0 }), F(p + "dependant_details", "Dependant ages & childcare"));
    sections.push({ title: `${label} — Personal`, tone, ...show, fields: personal });
    sections.push({
      title: `${label} — Address`, tone, ...show, fields: [
        F(p + "current_address", "Current residential address", "text", { required: 1, width: "full" }),
        F(p + "residential_status", "Residential status", "select", { required: 1, options: ["Own", "Mortgaged", "Renting", "Other"] }),
        F(p + "time_current_address", "Time at current address (years)", "number", { required: 1, min: 0 }),
        F(p + "previous_address", "Previous address (less than 3 years)", "text", { required: 1, show_if: lt3("time_current_address") }),
        F(p + "time_previous_address", "Time at previous address", "text", { required: 1, show_if: lt3("time_current_address") }),
      ],
    });
    sections.push({
      title: `${label} — Employment & income`, tone, ...show, fields: [
        F(p + "employment_type", "Employment type", "select", { required: 1, options: ["Full Time", "Part Time", "Casual", "Self Employed", "Contractor"] }),
        F(p + "occupation", "Occupation / role", "text", { required: 1 }),
        F(p + "employer_name", "Employer / business name", "text", { required: 1 }),
        F(p + "length_current_employer", "Length of current employment (years)", "number", { required: 1, min: 0 }),
        F(p + "previous_employer", "Previous employer (less than 3 years)", "text", { required: 1, show_if: lt3("length_current_employer") }),
        F(p + "previous_occupation", "Previous occupation / role", "text", { required: 1, show_if: lt3("length_current_employer") }),
        F(p + "length_previous_employment", "Length of previous employment", "text", { required: 1, show_if: lt3("length_current_employer") }),
        F(p + "income_frequency", "Income frequency", "select", { options: ["Weekly", "Fortnightly", "Monthly", "Annually"] }),
        F(p + "income_amount", "Gross income amount", "currency"),
        F(p + "rental_income", "Rental income", "currency"),
      ],
    });
  }
  const exp: [string, string][] = [
    ["expenses_utilities_owner", "Utilities & rates (owner occupied)"], ["expenses_telecom", "Telephone, internet & pay TV"],
    ["expenses_food", "Food & groceries"], ["expenses_recreation", "Recreation & entertainment"], ["expenses_clothing", "Clothing & personal care"],
    ["expenses_medical", "Medical & health"], ["expenses_transport", "Transport"], ["expenses_education", "Education"], ["expenses_childcare", "Childcare"],
    ["expenses_insurance", "Insurance"], ["expenses_other", "Other"],
  ];
  sections.push({ title: "Monthly expenses", description: "Your average monthly spend. Enter 0 if it does not apply.", fields: exp.map(([k, l]) => F(k, l, "currency", { required: 1, min: 0 })) });
  sections.push({
    title: "Assets", fields: [
      F("asset_savings", "Savings", "currency"), F("asset_vehicle_make_model", "Vehicle make / model"), F("asset_vehicle_value", "Vehicle value", "currency"),
      F("asset_superfund", "Super fund balance", "currency"), F("asset_home_contents", "Home contents value", "currency"),
      { key: "realestate_info", type: "info", label: "Real estate you own", width: "full" },
      F("realestate_type", "Property type"), F("realestate_address", "Property address"), F("realestate_value", "Estimated value", "currency"),
      F("additional_properties", "Any other properties", "repeater", {
        width: "full", add_label: "Add another property",
        fields: [F("address", "Address", "text", { width: "full" }), F("type", "Type"), F("value", "Estimated value", "currency"), F("loan_balance", "Loan balance", "currency"), F("rental_income", "Monthly rent", "currency")],
      }),
    ],
  });
  sections.push({
    title: "Liabilities", fields: [
      F("liability_mortgage_loan_repayment", "Mortgage — remaining balance", "currency"), F("liability_mortgage_loan_rate", "Mortgage — current interest rate (%)"),
      F("liability_mortgage_loan_lender", "Mortgage — current lender"), F("liability_vehicle_loan_repayment", "Vehicle loan repayment", "currency"),
      F("liability_vehicle_loan_balance", "Vehicle loan balance", "currency"), F("liability_vehicle_loan_rate", "Vehicle loan rate (%)"),
      F("liability_cc_limit", "Credit cards — total limit", "currency"), F("liability_cc_balance", "Credit cards — total balance", "currency"),
      F("other_liabilities", "Other debts (personal loans, HECS, BNPL…)", "repeater", {
        width: "full", add_label: "Add another debt",
        fields: [
          F("type", "Type", "select", { options: ["Personal loan", "Credit card", "HECS/HELP", "Buy now pay later", "Car loan", "Other"] }),
          F("lender", "Lender"), F("limit", "Limit", "currency"), F("balance", "Balance", "currency"), F("repayment", "Monthly repayment", "currency"),
        ],
      }),
    ],
  });
  sections.push({
    title: "Loan preferences", fields: [
      F("desired_loan_features", "Desired loan features", "checkbox", { width: "full", options: ["Variable rate", "Interest only", "Redraw", "Line of credit", "Fixed rate", "Offset account"] }),
      F("additional_comments", "Anything else you would like us to know?", "textarea", { width: "full" }),
    ],
  });
  sections.push({
    title: "Declaration", description: "Almost done — please confirm and sign.", fields: [
      { key: "declaration_info", type: "info", label: "", width: "full", content: "I declare that the information I have provided is true and correct. By typing my name below I am signing this fact find electronically." },
      F("declaration_name", "Name", "text", { required: 1 }),
      F("signature_name", "Signature", "signature", { required: 1 }),
    ],
  });
  return normalizeSchema({
    settings: {
      accent: "#987633", submit_label: "Submit Fact Find",
      intro: "Please complete the steps below. Your answers save automatically — you can leave and return to this page at any time using the same link.",
      success_msg: "Thank you — your Fact Find has been submitted.",
    },
    sections,
  });
}

export function defaultEnquiry(): Schema {
  return normalizeSchema({
    settings: {
      accent: "#987633", submit_label: "Send enquiry", steps: 0, public: 1, create_case: 1,
      intro: "Tell us a little about what you need and we will be in touch shortly.", success_msg: "Thanks — we have your enquiry and will be in touch soon.",
    },
    sections: [
      { title: "About you", fields: [F("applicant_count", "Number of applicants", "select", { required: 1, options: ["1", "2", "3", "4"], default: "1", map: "applicant_count" }), F("full_name", "Applicant 1 — full name", "text", { required: 1, map: "app1_name" }), F("email", "Email address", "email", { required: 1, map: "app1_email" }), F("mobile", "Mobile number", "tel", { map: "app1_mobile", required: 1 })] },
      ...[2, 3, 4].map(n => ({ title: `Applicant ${n}`, tone: n === 2 ? 'a2' : '', show_if: { field: 'applicant_count', op: 'gt', value: String(n - 1) }, fields: [
        F(`full_name_${n}`, 'Full name', 'text', { required: 1, map: `app${n}_name` }),
        F(`email_${n}`, 'Email address', 'email', { map: `app${n}_email` }), F(`mobile_${n}`, 'Mobile number', 'tel', { map: `app${n}_mobile` }),
      ] })),
      {
        title: "What are you looking for?", fields: [
          F("purpose", "I would like help to", "checkbox", { width: "full", options: ["Buy a home", "Refinance", "Invest", "Build", "Something else"] }),
          F("loan_amount", "Approximate loan amount", "currency", { map: "loan_amount" }),
          F("timeframe", "When are you looking to proceed?", "select", { options: ["As soon as possible", "Within 1–3 months", "3–6 months", "Just exploring"] }),
          F("notes", "Additional info (details of the conversation)", "textarea", { width: "full", map: "broker_note", help: "Saved on the case as a time-stamped Broker Note." }),
        ],
      },
    ],
  });
}

/* ---------------- Builder ready-made blocks ---------------- */
const yrs = { min: 0 };
export const BLOCKS: { id: string; label: string; section: FD }[] = [
  { id: "personal", label: "Personal details", section: { title: "Personal details", fields: [
    F("full_name", "Full name", "text", { required: 1, map: "app1_name" }), F("email", "Email address", "email", { required: 1, map: "app1_email" }),
    F("mobile", "Mobile number", "tel", { map: "app1_mobile" }), F("dob", "Date of birth", "date", { map: "app1_dob" }),
    F("citizenship", "Citizenship / visa"), F("dependants", "Number of dependants", "number", yrs),
  ] } },
  { id: "address", label: "Address history", section: { title: "Address", fields: [
    F("current_address", "Current residential address", "text", { required: 1, width: "full" }),
    F("residential_status", "Residential status", "select", { required: 1, options: ["Own", "Mortgaged", "Renting", "Living with family", "Other"] }),
    F("years_at_address", "Time at current address (years)", "number", { required: 1, ...yrs }),
    F("previous_address", "Previous address", "text", { width: "full", required: 1, show_if: { field: "years_at_address", op: "lt", value: "3" } }),
  ] } },
  { id: "employment", label: "Employment & income", section: { title: "Employment & income", fields: [
    F("employment_type", "Employment type", "select", { required: 1, options: ["Full Time", "Part Time", "Casual", "Self Employed", "Contractor", "Retired", "Not employed"] }),
    F("occupation", "Occupation / role", "text", { required: 1 }), F("employer", "Employer / business name", "text", { required: 1 }),
    F("years_employed", "Length of employment (years)", "number", { required: 1, ...yrs }), F("income_amount", "Gross income", "currency"),
    F("income_frequency", "Income frequency", "select", { options: ["Weekly", "Fortnightly", "Monthly", "Annually"] }),
    F("rental_income", "Rental income", "currency"), F("other_income", "Other income (bonus, Centrelink, etc.)", "currency"),
  ] } },
  { id: "expenses", label: "Monthly living expenses", section: { title: "Monthly living expenses", description: "Average monthly spend. Enter 0 if it does not apply.", fields: [
    ...([["exp_food", "Food & groceries"], ["exp_utilities", "Utilities & rates"], ["exp_telecom", "Phone, internet & pay TV"], ["exp_clothing", "Clothing & personal care"],
      ["exp_medical", "Medical, health & fitness"], ["exp_recreation", "Recreation & entertainment"], ["exp_transport", "Transport"], ["exp_education", "Education"],
      ["exp_childcare", "Childcare & child support"], ["exp_insurance", "Insurance (non-mortgage)"]] as [string, string][]).map(([k, l]) => F(k, l, "currency", { required: 1, min: 0 })),
    F("exp_rent", "Rent / board", "currency", { min: 0 }), F("exp_other", "Other", "currency", { required: 1, min: 0 }),
  ] } },
  { id: "assets", label: "Assets", section: { title: "Assets", fields: [
    F("asset_savings", "Savings & cash", "currency"), F("asset_super", "Superannuation balance", "currency"), F("asset_shares", "Shares / investments", "currency"),
    F("asset_vehicle", "Vehicle (make, model & value)"),
    F("properties", "Properties owned", "repeater", { width: "full", add_label: "Add a property", fields: [F("address", "Address", "text", { width: "full" }), F("value", "Estimated value", "currency"), F("loan_balance", "Loan balance", "currency"), F("rental_income", "Monthly rent", "currency")] }),
  ] } },
  { id: "liabilities", label: "Liabilities & debts", section: { title: "Liabilities", description: "Loans, credit cards, HECS, buy-now-pay-later and any other debts.", fields: [
    F("liabilities", "Debts", "repeater", { width: "full", add_label: "Add a debt", fields: [
      F("type", "Type", "select", { options: ["Home loan", "Car loan", "Personal loan", "Credit card", "HECS/HELP", "Buy now pay later", "Other"] }),
      F("lender", "Lender"), F("limit", "Limit", "currency"), F("balance", "Balance", "currency"), F("repayment", "Monthly repayment", "currency"),
    ] }),
  ] } },
  { id: "objective", label: "Loan purpose & objective", section: { title: "Your loan", fields: [
    F("purpose", "Purpose of loan", "checkbox", { width: "full", options: ["Buy", "Refinance", "Construction", "Investment", "Other"] }),
    F("objective", "What would you like to achieve?", "textarea", { width: "full" }),
    F("features", "Desired loan features", "checkbox", { width: "full", options: ["Variable rate", "Fixed rate", "Interest only", "Offset account", "Redraw", "Line of credit"] }),
  ] } },
  { id: "declaration", label: "Declaration & signature", section: { title: "Declaration", fields: [
    { key: "decl_info", type: "info", label: "Declaration", content: "I declare the information I have provided is true and correct. By typing my name below I am signing this form electronically.", width: "full" },
    F("declaration_name", "Full name", "text", { required: 1 }), F("signature", "Signature", "signature", { required: 1 }),
  ] } },
];

/** The WP one-off only replaces public forms with this exact original field set. */
export function upgradeEnquirySchema(s: Schema): Schema {
  const keys = s.sections.flatMap(s => s.fields.map(f => f.key)).sort().join(',');
  if (s.settings.public && keys === ['full_name','email','mobile','purpose','loan_amount','timeframe','notes'].sort().join(',')) return defaultEnquiry();
  // Updated WP sample stores extra contacts in its answers only. Give them case mappings.
  if (s.settings.public && s.sections.some(s => s.fields.some(f => f.key === 'applicant_count'))) {
    s = JSON.parse(JSON.stringify(s));
    for (const field of s.sections.flatMap(s => s.fields)) {
      const m = /^(full_name|email|mobile)_([34])$/.exec(field.key);
      if (m && !field.map) field.map = `app${m[2]}_${m[1] === 'full_name' ? 'name' : m[1]}`;
      if (field.key === 'applicant_count' && !field.map) field.map = 'applicant_count';
    }
  }
  return s;
}

/** Extend an existing designated Fact Find while retaining its custom sections. */
export function withFourApplicants(s: Schema): Schema {
  const out: Schema = JSON.parse(JSON.stringify(s));
  const count = out.sections.flatMap(s => s.fields).find(f => f.key === 'applicant_count');
  if (!count) return out;
  count.options = ['1', '2', '3', '4']; count.map = 'applicant_count';
  for (const section of out.sections) {
    if (section.show_if?.field === 'applicant_count' && section.show_if.op === 'eq' && section.show_if.value === '2') section.show_if = { field: 'applicant_count', op: 'gt', value: '1' };
    for (const f of section.fields) if (f.show_if?.field === 'applicant_count' && f.show_if.op === 'eq' && f.show_if.value === '2') f.show_if = { field: 'applicant_count', op: 'gt', value: '1' };
  }
  for (const n of [3, 4]) {
    if (out.sections.some(s => s.fields.some(f => f.map === `app${n}_name`))) continue;
    const sources = out.sections.filter(s => s.fields.some(f => /^applicant2_/.test(f.key)) && s.fields.every(f => /^applicant2_/.test(f.key)));
    if (sources.length) for (const source of sources) {
      const clone = JSON.parse(JSON.stringify(source).replaceAll('applicant2_', `applicant${n}_`).replaceAll('app2_', `app${n}_`).replaceAll('Applicant 2', `Applicant ${n}`));
      clone.id += `_${n}`; clone.show_if = { field: 'applicant_count', op: 'gt', value: String(n - 1) };
      const previous = out.sections.findIndex(s => s.id === `${source.id}_${n - 1}`);
      out.sections.splice((previous >= 0 ? previous : out.sections.indexOf(source)) + 1, 0, clone);
    } else out.sections.push(normalizeSchema({ sections: [{ title: `Applicant ${n}`, show_if: { field: 'applicant_count', op: 'gt', value: String(n - 1) }, fields: [F(`applicant${n}_fullname`, 'Full name', 'text', { map: `app${n}_name` }), F(`applicant${n}_email`, 'Email address', 'email', { map: `app${n}_email` }), F(`applicant${n}_mobile`, 'Mobile number', 'tel', { map: `app${n}_mobile` })] }] }).sections[0]);
  }
  return out;
}
