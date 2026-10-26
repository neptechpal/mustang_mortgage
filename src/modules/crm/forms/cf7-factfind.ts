// The public /factfind page: CF7 form 2651 "MM Fact Find" rebuilt on the form
// engine (same field keys, labels, placeholders, requireds and show/hide rules).
// File attachments (mfile-938) and the drawn signature (signature-337) are
// rendered by Cf7Extras and handled by /api/factfind.
import { normalizeSchema, type Schema } from "./engine";

type FD = Record<string, unknown>;
const F = (key: string, label: string, type = "text", o: FD = {}): FD => ({ key, label, type, width: "half", ...o });
const info = (key: string, label: string, content = ""): FD => ({ key, type: "info", label, content, width: "full" });

export const CF7_SUCCESS = "Thank you for submitting the Fact Find and for your cooperation, and we look forward to assisting you soon.";
export const CF7_FILE_TYPES = /\.(pdf|jpe?g|png|gif)$/i;
export const CF7_FILE_LIMIT = 52428800;
export const CF7_MAX_FILES = 15;

export function cf7FactFind(): Schema {
  const two = { field: "applicant_count", op: "eq", value: "2" };
  const lt3 = (k: string) => ({ field: k, op: "lt", value: "3" });
  const applicant = (n: 1 | 2): FD[] => {
    const p = `applicant${n}_`;
    const r = n === 1 ? 1 : 1; // applicant 2 fields become required when shown (toggleApplicants)
    const show = n === 2 ? { show_if: two } : {};
    const ex = n === 1
      ? { dob: "e.g. 07/09/1992", tca: "e.g. 2", tpa: "e.g. 1 year 6 months", occ: "e.g. Chef", emp: "Company Name", lce: "e.g. 2.5", pocc: "e.g. Admin Assistant", lpe: "e.g. 1 year 2 months", inc: "e.g. 6,200 per month" }
      : { dob: "e.g. 04/11/1993", tca: "e.g. 1.5", tpa: "e.g. 9 months", occ: "e.g. Chef", emp: "Business name", lce: "e.g. 2", pocc: "e.g. Sales Assistant", lpe: "e.g. 1 year", inc: "e.g. 1,800 per fortnight" };
    const personal: FD[] = [
      F(p + "fullname", "Full Name", "text", { required: r, placeholder: "First and Last Name", map: `app${n}_name` }),
      F(p + "email", "Email Address", "email", { required: r, placeholder: "name@example.com", map: `app${n}_email` }),
      F(p + "dob", "Date of Birth (DD/MM/YYYY)", "text", { placeholder: ex.dob }),
      F(p + "mobile", "Mobile Number", "tel", { placeholder: "04xx xxx xxx", map: `app${n}_mobile` }),
      F(p + "citizenship", "Citizenship / Visa", "text", { placeholder: "e.g. Citizen / PR / Visa type" }),
    ];
    if (n === 1) {
      personal.push(
        F("applicant1_dependants", "Number of Dependants", "text", { placeholder: "e.g. 0, 1, 2" }),
        F("applicant1_dependant_details", "Age(s) of Dependant(s) & Child Care Expenses", "text", { placeholder: "e.g. Ages 3 & 6; childcare $200/month" }),
      );
    }
    return [
      { title: `Applicant ${n} — Personal Details`, tone: `a${n}`, ...show, fields: personal },
      {
        title: `Applicant ${n} — Address Details`, tone: `a${n}`, ...show,
        description: n === 1 ? "All fields in this section are required." : "All fields in this section are required (when Applicant 2 is selected).",
        fields: [
          F(p + "current_address", "Current Residential Address", "text", { required: r, placeholder: "Street, Suburb, State, Postcode", width: "full" }),
          F(p + "residential_status", "Residential Status", "select", { required: r, options: ["Own", "Mortgaged", "Renting", "Other"] }),
          F(p + "time_current_address", "Time at Current Address (years)", "number", { required: r, min: 0, placeholder: ex.tca, help: "If less than 3 years, previous address fields will be required." }),
          F(p + "previous_address", "Previous Address (< 3 yrs)", "text", { required: 1, placeholder: "Street, Suburb, State, Postcode", show_if: lt3(p + "time_current_address") }),
          F(p + "time_previous_address", "Time at Previous Address (years/months)", "text", { required: 1, placeholder: ex.tpa, show_if: lt3(p + "time_current_address") }),
        ],
      },
      {
        title: `Applicant ${n} — Employment Details`, tone: `a${n}`, ...show,
        description: n === 1 ? "All fields in this section are required." : "All fields in this section are required (when Applicant 2 is selected).",
        fields: [
          F(p + "employment_type", "Employment Type", "select", { required: r, options: ["Full Time", "Part Time", "Casual", "Self Employed", "Contractor"] }),
          F(p + "occupation", "Occupation / Role", "text", { required: r, placeholder: ex.occ }),
          F(p + "employer_name", "Employer / Business Name", "text", { required: r, placeholder: ex.emp }),
          F(p + "length_current_employer", "Length of Current Employment (years)", "number", { required: r, min: 0, placeholder: ex.lce, help: "If less than 3 years, previous employment fields will be required." }),
          F(p + "previous_employer", "Previous Employer (< 3 yrs)", "text", { required: 1, placeholder: "Company / Business name", show_if: lt3(p + "length_current_employer") }),
          F(p + "previous_occupation", "Previous Occupation / Role", "text", { required: 1, placeholder: ex.pocc, show_if: lt3(p + "length_current_employer") }),
          F(p + "length_previous_employment", "Length of Previous Employment", "text", { required: 1, placeholder: ex.lpe, show_if: lt3(p + "length_current_employer") }),
          info(p + "income_h", `Applicant ${n} — Income`),
          F(p + "income_frequency", "Income Frequency", "select", { options: ["Weekly", "Fortnightly", "Monthly"] }),
          F(p + "income_amount", "Gross Income Amount", "text", { placeholder: ex.inc }),
          F(p + "rental_income", "Rental Income (if any)", "text", { placeholder: "Monthly amount, if applicable" }),
        ],
      },
    ];
  };
  const exp: [string, string][] = [
    ["expenses_utilities_owner", "Utilities & Rates (Owner Occupied)"], ["expenses_telecom", "Telephone, Internet & Pay TV"], ["expenses_food", "Food & Groceries"],
    ["expenses_recreation", "Recreation & Entertainment"], ["expenses_clothing", "Clothing & Personal Care"], ["expenses_medical", "Medical & Health"],
    ["expenses_transport", "Transport"], ["expenses_education", "Education"], ["expenses_childcare", "Childcare"], ["expenses_insurance", "Insurance"], ["expenses_other", "Other"],
  ];
  return normalizeSchema({
    settings: { accent: "#0073AA", submit_label: "Submit Fact Find", steps: 0, public: 1, create_case: 0, allow_edit: 0, intro: "Fields marked with * are required.", success_msg: CF7_SUCCESS },
    sections: [
      { title: "Purpose of Loan", description: "Select all that apply.", fields: [F("purpose_of_lending", "Purpose of Loan", "checkbox", { width: "full", options: ["Buy", "Refinance", "Construction", "Other"] })] },
      { title: "Objective of the Loan", fields: [F("compliance_objective", "Describe your objective", "textarea", { width: "full", placeholder: "Briefly describe what you want to achieve with this loan" })] },
      { title: "", fields: [F("applicant_count", "Number of Applicants", "select", { required: 1, options: ["1", "2"], default: "1" })] },
      ...applicant(1),
      ...applicant(2),
      { title: "Monthly Expenses", description: "Mandatory for compliance. If none, enter 0.", fields: exp.map(([k, l]) => F(k, l, "text", { required: 1, placeholder: "Monthly amount" })) },
      {
        title: "Assets", fields: [
          F("asset_savings", "Savings Amount", "text", { placeholder: "Approximate amount" }), F("asset_vehicle_make_model", "Vehicle Make/Model", "text", { placeholder: "e.g. Toyota Corolla" }),
          F("asset_vehicle_value", "Vehicle Est. Value", "text", { placeholder: "e.g. $12,000" }), F("asset_superfund", "Superfund (approx. value)", "text", { placeholder: "e.g. $45,000" }),
          F("asset_home_contents", "Home Contents (approx. value)", "text", { placeholder: "e.g. $15,000" }),
        ],
      },
      {
        title: "Real Estate Assets", fields: [
          F("realestate_type", "Property Type", "text", { placeholder: "e.g. House / Unit" }), F("realestate_address", "Property Address", "text", { placeholder: "Street, Suburb, State, Postcode" }),
          F("realestate_value", "Estimated Value", "text", { placeholder: "e.g. $650,000" }),
        ],
      },
      {
        title: "Liabilities", fields: [
          info("liab_mortgage", "Current Mortgage"),
          F("liability_mortgage_loan_repayment", "Remaining Balance", "text", { placeholder: "e.g. $420,000" }), F("liability_mortgage_loan_rate", "Current Interest Rate", "text", { placeholder: "e.g. 6.19% p.a." }),
          F("liability_mortgage_loan_lender", "Current Lender (Bank Name)", "text", { placeholder: "e.g. Bank Australia" }),
          info("liab_vehicle", "Vehicle Loan"),
          F("liability_vehicle_loan_repayment", "Repayment", "text", { placeholder: "e.g. $450 / month" }), F("liability_vehicle_loan_balance", "Balance", "text", { placeholder: "e.g. $9,500" }),
          F("liability_vehicle_loan_rate", "Interest Rate (%)", "text", { placeholder: "e.g. 7.99%" }),
          info("liab_cc", "Credit Card(s)"),
          F("liability_cc_limit", "Limit", "text", { placeholder: "Combined limit if multiple cards" }), F("liability_cc_balance", "Balance", "text", { placeholder: "Total balance owing" }),
        ],
      },
      { title: "Desired Loan Features", description: "Select all that apply.", fields: [F("desired_loan_features", "Desired Loan Features", "checkbox", { width: "full", options: ["Variable rate", "Interest only", "Redraw", "Line of credit", "Fixed rate", "Offset account"] })] },
      { title: "Additional Comments", fields: [F("additional_comments", "Additional Comments", "textarea", { width: "full", placeholder: "Anything else you’d like us to know" })] },
      { title: "Declaration", fields: [F("declaration_name", "Name", "text", { required: 1, placeholder: "Full Name" })] },
    ],
  });
}
