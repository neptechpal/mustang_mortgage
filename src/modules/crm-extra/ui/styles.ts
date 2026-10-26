// Class presets for crm-extra screens — thin aliases over the admin design kit
// (src/components/admin/ui.tsx) so older call sites pick up the new look.
import { badgeStyles, buttonStyles, inputStyles, labelStyles, tableCls } from "@/components/admin/ui";

const CARD = "rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

export const cx = {
  btn: buttonStyles({ variant: "secondary", size: "md" }),
  btnSm: buttonStyles({ variant: "secondary", size: "xs" }),
  btnPrimary: buttonStyles({ variant: "primary", size: "md" }),
  btnDanger: buttonStyles({ variant: "danger", size: "md" }),
  btnGhost: buttonStyles({ variant: "ghost", size: "xs" }),
  input: inputStyles,
  label: labelStyles,
  card: CARD + " p-5",
  /** Card without padding (for header/body layouts). */
  panel: CARD,
  h1: "text-2xl font-semibold tracking-tight text-slate-900",
  h2: "text-[15px] font-semibold text-slate-900",
  muted: "text-slate-500",
  chip: badgeStyles("neutral"),
  chipGood: badgeStyles("success"),
  chipWarn: badgeStyles("warning"),
  chipBad: badgeStyles("danger"),
  chipInfo: badgeStyles("info"),
  table: tableCls.table,
  thead: tableCls.thead,
  th: tableCls.th,
  td: "border-b border-slate-100 px-4 py-3 align-top text-slate-700",
  notice: "rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900",
  noticeBad: "rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900",
  noticeWarn: "rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900",
  link: "font-medium text-brand-700 hover:text-brand-800 hover:underline",
};
