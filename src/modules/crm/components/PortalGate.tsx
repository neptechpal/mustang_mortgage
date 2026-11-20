"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { sendPortalCodeAction, verifyPortalCodeAction, type PortalOtpState } from "../portal-otp-actions";

const init: PortalOtpState = {};

function Btn({ label, secondary }: { label: string; secondary?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`mw-btn ${secondary ? "mw-btn--secondary" : "mw-btn--primary"}`}>
      {pending ? "Please wait..." : label}
    </button>
  );
}

/** Shown when a valid portal link is opened in a browser that has not yet entered the emailed code. */
export default function PortalGate({ caseId, mmKey, step, emails }: { caseId: number; mmKey: string; step: string; emails: string[] }) {
  const [sent, sendAction] = useActionState(sendPortalCodeAction, init);
  const [checked, verifyAction] = useActionState(verifyPortalCodeAction, init);
  const hidden = (
    <>
      <input type="hidden" name="mm_case" value={caseId} />
      <input type="hidden" name="mm_key" value={mmKey} />
    </>
  );

  return (
    <div className="mw-portal__panel mw-portal__empty" style={{ maxWidth: 520, margin: "0 auto" }}>
      <h1 className="mw-h1">Confirm it&rsquo;s you</h1>
      <p className="mw-portal__lede">For your security we email a 6-digit code before opening your secure portal.</p>

      {!sent.sentTo ? (
        <form action={sendAction} style={{ marginTop: 20, display: "grid", gap: 14 }}>
          {hidden}
          {emails.length > 1 && (
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend style={{ marginBottom: 8, fontWeight: 600 }}>Send the code to</legend>
              {emails.map((m, i) => (
                <label key={m} style={{ display: "block", padding: "4px 0" }}>
                  <input type="radio" name="emailIx" value={i} defaultChecked={i === 0} /> {m}
                </label>
              ))}
            </fieldset>
          )}
          {emails.length === 1 && <p>We will send it to <strong>{emails[0]}</strong>.</p>}
          {sent.error && <p role="alert" style={{ color: "var(--mw-danger)" }}>{sent.error}</p>}
          <div>
            <Btn label="Email me a code" />
          </div>
        </form>
      ) : (
        <>
          <form action={verifyAction} style={{ marginTop: 20, display: "grid", gap: 14 }}>
            {hidden}
            <input type="hidden" name="step" value={step} />
            <p>We sent a code to <strong>{sent.sentTo}</strong>. It works for 10 minutes.</p>
            <label htmlFor="portal-code" style={{ fontWeight: 600 }}>6-digit code</label>
            <input
              id="portal-code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              autoFocus
              required
              style={{ fontSize: 28, letterSpacing: 8, textAlign: "center", padding: "12px 14px", border: "1px solid var(--mw-line-strong)", borderRadius: 10, maxWidth: 260 }}
            />
            {checked.error && <p role="alert" style={{ color: "var(--mw-danger)" }}>{checked.error}</p>}
            <div>
              <Btn label="Open my portal" />
            </div>
          </form>
          <form action={sendAction} style={{ marginTop: 14 }}>
            {hidden}
            <input type="hidden" name="emailIx" value={Math.max(0, emails.findIndex((m) => m === sent.sentTo))} />
            <Btn label="Send a new code" secondary />
          </form>
        </>
      )}
    </div>
  );
}
