// Shared vocabularies of the Mustang Mini CRM (mmcrm-lib.php, kanban-inline, case-ui).
// Statuses, stages and chase buckets are three independent vocabularies.

export const STAGES: Record<string, string> = {
  new: "New and Awaiting Docs",
  "awaiting-docs": "Docs Received",
  submitted: "Submitted",
  "pre-approved": "Pre-Approved",
  "full-approval": "Full Approval",
  settlement: "Settlement",
};

export const STAGE_COLORS: Record<string, string> = {
  new: "#3b82f6",
  "awaiting-docs": "#f59e0b",
  submitted: "#8b5cf6",
  "pre-approved": "#06b6d4",
  "full-approval": "#22c55e",
  settlement: "#64748b",
};

export const CHASE_BUCKETS: Record<string, string> = {
  "likely-return": "Likely to Return",
  "worth-trying": "Worth Trying",
  "keep-following-up": "Keep Following Up",
  "maybe-later": "Maybe Later",
  "low-chance": "Low Chance",
};

// Taxonomy term names (filter dropdown / status column)
export const STATUSES: Record<string, string> = {
  active: "Active",
  archive: "Archive",
  completed: "Completed",
  unsuccessful: "Unsuccessful",
};

// Inline status <select> labels (MMCRM_Case_UI::status_options)
export const STATUS_OPTIONS: Record<string, string> = {
  active: "Active",
  completed: "Completed",
  archive: "Archive",
  unsuccessful: "Closed / unsuccessful",
};

export const DOC_STATUSES = ["Pending", "Received", "Accepted", "Rejected"] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];

export const DEFAULT_DOC_ROWS = ["Payslips", "Photo ID", "Bank Statements"];

// Kanban lane tints (kanban-inline.php CSS): [pill bg, pill fg, pill border, card bg, accent]
export const STAGE_LANE: Record<string, [string, string, string, string, string]> = {
  new: ["#e7f2ff", "#1e3a8a", "#d6e6ff", "#f7fbff", "#93c5fd"],
  "awaiting-docs": ["#fff5e6", "#7a4d0b", "#ffe7c2", "#fff8ed", "#fbbf24"],
  submitted: ["#f5f3ff", "#4c1d95", "#e9d5ff", "#f7f6ff", "#a78bfa"],
  "pre-approved": ["#ecfeff", "#0f766e", "#a5f3fc", "#f0fdfa", "#06b6d4"],
  "full-approval": ["#ecfdf5", "#166534", "#bbf7d0", "#f5fff8", "#22c55e"],
  settlement: ["#f1f5f9", "#1f2937", "#e2e8f0", "#f8fafc", "#94a3b8"],
};
export const CHASE_LANE: Record<string, [string, string, string, string, string]> = {
  "likely-return": ["#ecfdf5", "#166534", "#bbf7d0", "#f5fff8", "#22c55e"],
  "worth-trying": ["#e7f2ff", "#1e3a8a", "#d6e6ff", "#f7fbff", "#93c5fd"],
  "keep-following-up": ["#fff5e6", "#7a4d0b", "#ffe7c2", "#fff8ed", "#f59e0b"],
  "maybe-later": ["#f5f3ff", "#4c1d95", "#e9d5ff", "#f7f6ff", "#a78bfa"],
  "low-chance": ["#fff1f2", "#9f1239", "#fecdd3", "#fff7f8", "#f43f5e"],
};

export const BRAND = "#987633";
export const TZ = "Australia/Sydney";

// Portal upload limits (portal accept list: .pdf,.jpg,.jpeg,.png,.doc,.docx)
export const UPLOAD_EXT = /\.(pdf|jpe?g|png|docx?|heic|gif|webp)$/i;
export const UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
export const UPLOAD_MAX_FILES = 20;
