// Staff-side helpers for /admin/users — thin wrappers over the shared admin kit.
import type { ReactNode } from "react";
import type { Role } from "@prisma/client";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { Badge, Card as KitCard, buttonStyles, cn, hintStyles, inputStyles, labelStyles, type Tone } from "@/components/admin/ui";

export const inputCls = inputStyles;
export const btnCls = buttonStyles();
export const btnPrimary = buttonStyles({ variant: "primary" });
export const btnGhost = buttonStyles({ variant: "secondary" });
export const btnDanger = buttonStyles({ variant: "danger" });
const OK = "!border-emerald-600 !bg-emerald-600 hover:!border-emerald-700 hover:!bg-emerald-700 focus-visible:ring-emerald-500/40";
export const btnOk = buttonStyles({ variant: "primary", className: OK });
/** Compact approve button for table rows. */
export const btnOkXs = buttonStyles({ variant: "primary", size: "xs", className: OK });

export function Flash({ msg, error }: { msg?: string; error?: string }) {
  if (!error && !msg) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={cn(
        "mb-5 flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm",
        error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800",
      )}
    >
      {error ? <AlertCircle className="mt-px size-4 shrink-0" /> : <CheckCircle2 className="mt-px size-4 shrink-0" />}
      <span>{error || msg}</span>
    </div>
  );
}

export function Card({ title, children, actions }: { title?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <KitCard title={title} actions={actions} className="mb-6">
      {children}
    </KitCard>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className={labelStyles}>{label}</span>
      {children}
      {hint && <span className={cn(hintStyles, "block")}>{hint}</span>}
    </label>
  );
}

export const STATUS_TONE: Record<string, Tone> = {
  approved: "success",
  pending: "warning",
  checkmail: "info",
  rejected: "danger",
  inactive: "neutral",
};
export const STATUS_SHORT: Record<string, string> = {
  approved: "Approved",
  pending: "Pending review",
  checkmail: "Awaiting email",
  rejected: "Rejected",
  inactive: "Inactive",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? "neutral"} dot>
      {STATUS_SHORT[status] ?? status}
    </Badge>
  );
}

const ROLE: Record<Role, { label: string; tone: Tone }> = {
  ADMIN: { label: "Administrator", tone: "violet" },
  STAFF: { label: "Staff", tone: "info" },
  MEMBER: { label: "Member", tone: "neutral" },
};

export function RoleBadge({ role }: { role: Role }) {
  const r = ROLE[role] ?? { label: role, tone: "neutral" as Tone };
  return <Badge tone={r.tone}>{r.label}</Badge>;
}

export const sp1 = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
