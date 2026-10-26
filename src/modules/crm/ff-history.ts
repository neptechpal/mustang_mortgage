// [fact_find_history] grouping (wpcode 2771 mm_group_key).
export const FF_SECTIONS: [string, string, string, string][] = [
  // id, label, head bg, accent
  ["purpose", "Purpose & Objective", "#e6def7", "#b09ad9"],
  ["a1_personal", "Applicant 1 — Personal", "#e3efff", "#8ab4f8"],
  ["a1_address", "Applicant 1 — Address", "#edf5ff", "#bcd9ff"],
  ["a1_employment", "Applicant 1 — Employment", "#e6f0fa", "#a5c1e2"],
  ["a1_income", "Applicant 1 — Income", "#e4eef6", "#8fb0d6"],
  ["a2_personal", "Applicant 2 — Personal", "#e7f7ee", "#9ed8b7"],
  ["a2_address", "Applicant 2 — Address", "#eef9f2", "#bce7cc"],
  ["a2_employment", "Applicant 2 — Employment", "#e4f5ea", "#8fcfa6"],
  ["a2_income", "Applicant 2 — Income", "#e2f3e8", "#79c596"],
  ["expenses", "Expenses", "#fff1e6", "#f3b684"],
  ["assets", "Assets", "#e6f7f4", "#80d4c2"],
  ["liabilities", "Liabilities", "#fdecec", "#e7a4a4"],
  ["documents", "Documents", "#f1f3f4", "#c7cfd3"],
  ["declaration", "Declaration", "#eef2f6", "#a9b3c0"],
  ["comments", "Additional Comments", "#f3e9fb", "#cba8e3"],
  ["other", "Other", "#f3f6f7", "#cfd8dc"],
];

export function groupKey(key: string): string {
  if (["purpose_of_lending", "compliance_objective", "applicant_count"].includes(key)) return "purpose";
  for (const n of ["1", "2"]) {
    const p = `applicant${n}_`;
    if (key.startsWith(p)) {
      const r = key.slice(p.length);
      if (r.startsWith("income_")) return `a${n}_income`;
      if (/^(employment|employer|occupation|previous_|length)/.test(r)) return `a${n}_employment`;
      if (/^(current_address|residential_status|time_current_address|previous_address|time_previous_address)/.test(r)) return `a${n}_address`;
      return `a${n}_personal`;
    }
  }
  if (key.startsWith("expenses_")) return "expenses";
  if (key.startsWith("asset_") || key.startsWith("realestate_")) return "assets";
  if (key.startsWith("liability_")) return "liabilities";
  if (key === "additional_comments") return "comments";
  if (key === "declaration_name" || key.includes("signature")) return "declaration";
  if (key.includes("mfile") || key.includes("attachment")) return "documents";
  return "other";
}

export function pretty(v: unknown): string {
  if (Array.isArray(v)) return v.flat(Infinity as 1).map((x) => (typeof x === "object" && x ? Object.values(x).join(", ") : String(x ?? ""))).filter((x) => x.trim() !== "").join(", ");
  if (v && typeof v === "object") return Object.values(v).map(String).filter(Boolean).join(", ");
  return String(v ?? "");
}
