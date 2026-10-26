"use client";

import { useActionState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { buttonStyles, cn } from "@/components/admin/ui";
import type { ActionState } from "../actions";

type Props = {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  submitLabel: string;
  okMessage?: string;
  className?: string;
  danger?: boolean;
  confirm?: string;
  /** Optional icon shown in the submit button. */
  submitIcon?: ReactNode;
  /** Render the submit row as a floating bar that sticks to the bottom of the viewport (long forms). */
  sticky?: boolean;
  /** Make the submit button full width (narrow side cards). */
  block?: boolean;
  /** Use a secondary (outlined) submit button. */
  secondary?: boolean;
};

export default function ActionForm({ action, children, submitLabel, okMessage = "Saved.", className = "", danger, confirm, submitIcon, sticky, block, secondary }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const status = (
    <>
      {state?.error && (
        <span role="alert" className="inline-flex items-center gap-1.5 text-sm text-red-600">
          <AlertCircle className="size-4 shrink-0" />
          {state.error}
        </span>
      )}
      {state?.ok && (
        <span role="status" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="size-4 shrink-0" />
          {okMessage}
        </span>
      )}
    </>
  );
  const button = (
    <button
      type="submit"
      disabled={pending}
      className={buttonStyles({ variant: danger ? "danger" : secondary ? "secondary" : "primary", className: cn(block && "w-full") })}
    >
      {pending ? <Loader2 className="animate-spin" /> : submitIcon}
      {pending ? "Working…" : submitLabel}
    </button>
  );
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      {state?.fieldErrors && Object.keys(state.fieldErrors).length > 0 && (
        <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="flex items-center gap-1.5 font-semibold">
            <AlertCircle className="size-4" /> Please fix the following
          </p>
          <ul className="mt-1 list-disc pl-6">
            {Object.values(state.fieldErrors).map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {sticky ? (
        <div className="sticky bottom-4 z-10 mt-6 flex flex-wrap items-center justify-end gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.18)] backdrop-blur">
          <div className="mr-auto min-w-0">{status}</div>
          {button}
        </div>
      ) : (
        <div className={cn("mt-4 flex flex-wrap items-center gap-3", block && "flex-col items-stretch")}>
          {button}
          {status}
        </div>
      )}
    </form>
  );
}
