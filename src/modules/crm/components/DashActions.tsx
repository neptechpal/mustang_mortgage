"use client";
import { useState, useTransition } from "react";
import { Check, Loader2, Send } from "lucide-react";
import { buttonStyles, checkboxStyles, cn } from "@/components/admin/ui";
import { chaseNowAction, sendFormAction, setStageAction, toggleTaskAction } from "../actions";
import { toast } from "./Toast";

export function AttnButton({ caseId, act, arg, label }: { caseId: number; act: "chase" | "sendff" | "stage"; arg: string; label: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [, start] = useTransition();
  return (
    <button type="button" className={cn(buttonStyles({ variant: "secondary", size: "xs" }), state === "done" && "!border-emerald-200 !bg-emerald-50 !text-emerald-700 !opacity-100")} disabled={state !== "idle"} onClick={() => {
      setState("busy");
      start(async () => {
        const r = act === "chase" ? await chaseNowAction(caseId) : act === "sendff" ? await sendFormAction(caseId, "ff", true, "", "") : await setStageAction(caseId, arg);
        if (r.ok) { setState("done"); toast(r.message || "Done"); } else { setState("idle"); toast(r.error || "Something went wrong", true); }
      });
    }}>
      {state === "busy" ? <><Loader2 className="animate-spin" /> Working…</> : state === "done" ? <><Check /> Done</> : <>{act === "stage" ? <Check /> : <Send />}{label}</>}
    </button>
  );
}

export function TaskCheck({ id }: { id: number }) {
  const [on, setOn] = useState(false);
  const [, start] = useTransition();
  return (
    <input type="checkbox" aria-label="Mark task done" className={cn(checkboxStyles, "mt-0.5 cursor-pointer")} checked={on} onChange={(e) => {
      const v = e.target.checked;
      setOn(v);
      start(async () => { const r = await toggleTaskAction(id, v); if (!r.ok) { setOn(!v); toast("Could not update task", true); } else toast(v ? "Task completed" : "Task re-opened"); });
    }} />
  );
}
