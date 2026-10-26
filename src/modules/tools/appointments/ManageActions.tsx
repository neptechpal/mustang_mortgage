"use client";

import "@/modules/web/styles/booking.css";
import { useState } from "react";

/** Public manage actions, in the site tokens (booking.css). `accent` is kept for API compatibility. */
export default function ManageActions({ token, accent }: { token: string; accent: string }) {
  void accent;
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
    <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--mw-line)" }}>
      {error && <p className="mw-bk__error">{error}</p>}
      {mode === "idle" ? (
        <div className="mw-btnrow">
          <a href={`/book-appointment/manage/${token}?reschedule=1`} className="mw-btn mw-btn--primary">
            <span>Reschedule</span>
          </a>
          <button type="button" onClick={() => setMode("cancel")} className="mw-btn mw-btn--secondary">
            <span>Cancel appointment</span>
          </button>
          <a href={`/api/appointments/${token}/ics`} className="mw-bk__textbtn">
            Add to calendar
          </a>
        </div>
      ) : (
        <div className="mw-field">
          <label htmlFor="ssa-cancel-note" className="mw-label">
            Reason for canceling <span className="mw-label__opt">optional</span>
          </label>
          <textarea id="ssa-cancel-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="mw-textarea" />
          <div className="mw-btnrow" style={{ marginTop: 12 }}>
            <button type="button" disabled={busy} onClick={cancel} className="mw-btn mw-btn--primary" style={{ background: "var(--mw-danger)", borderColor: "var(--mw-danger)" }}>
              <span>{busy ? "Canceling…" : "Yes, cancel appointment"}</span>
            </button>
            <button type="button" onClick={() => setMode("idle")} className="mw-btn mw-btn--quiet">
              <span>Keep appointment</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
