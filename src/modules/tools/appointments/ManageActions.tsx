"use client";

import { useState } from "react";

export default function ManageActions({ token, accent }: { token: string; accent: string }) {
  const [mode, setMode] = useState<"idle" | "cancel">("idle");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function cancel() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/appointments/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", note }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(j.error || "Could not cancel the appointment.");
    window.location.reload();
  }

  return (
    <div className="mt-6 border-t border-black/10 pt-5">
      {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {mode === "idle" ? (
        <div className="flex flex-wrap gap-3">
          <a href={`/book-appointment/manage/${token}?reschedule=1`} className="rounded px-5 py-2.5 text-sm font-medium text-white" style={{ background: accent }}>
            Reschedule
          </a>
          <button type="button" onClick={() => setMode("cancel")} className="rounded border px-5 py-2.5 text-sm font-medium" style={{ borderColor: accent, color: accent }}>
            Cancel appointment
          </button>
          <a href={`/api/appointments/${token}/ics`} className="rounded px-4 py-2.5 text-sm font-medium hover:underline" style={{ color: accent }}>
            Add to calendar
          </a>
        </div>
      ) : (
        <div>
          <label htmlFor="ssa-cancel-note" className="mb-1 block text-sm text-black/70">
            Reason for canceling (optional)
          </label>
          <textarea id="ssa-cancel-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded border border-black/25 px-3 py-2" />
          <div className="mt-3 flex gap-3">
            <button type="button" disabled={busy} onClick={cancel} className="rounded bg-red-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50">
              {busy ? "Canceling…" : "Yes, cancel appointment"}
            </button>
            <button type="button" onClick={() => setMode("idle")} className="rounded px-4 py-2.5 text-sm" style={{ color: accent }}>
              Keep appointment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
