"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Notice } from "./fields";
import { cancelLoginAction, confirmSetupAction, finishSetupAction, verifyLoginAction, type TwoFactorState } from "../twofactor-actions";

const init: TwoFactorState = {};

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <input type="submit" value={pending ? "Checking..." : label} className="um-button" disabled={pending} />;
}

function CodeField({ label, help }: { label: string; help?: string }) {
  return (
    <div className="um-field um-field-code um-field-type_text">
      <div className="um-field-label">
        <label htmlFor="code-um">{label}</label>
      </div>
      <div className="um-field-area">
        <input className="um-form-field" type="text" name="code" id="code-um" inputMode="text" autoComplete="one-time-code" autoFocus required maxLength={20} spellCheck={false} />
      </div>
      {help && <div className="um-field-help">{help}</div>}
    </div>
  );
}

function TrustBox() {
  return (
    <div className="um-field um-field-c">
      <div className="um-field-area">
        <label className="um-field-checkbox">
          <input type="checkbox" name="trust" value="1" />
          <span className="um-field-checkbox-option"> Remember this device for 30 days</span>
        </label>
      </div>
    </div>
  );
}

function CancelLink() {
  return (
    <form action={cancelLoginAction} style={{ marginTop: 14 }}>
      <button type="submit" className="um-link-alt" style={{ background: "none", border: 0, padding: 0, cursor: "pointer", textDecoration: "underline" }}>
        Cancel and go back
      </button>
    </form>
  );
}

export function VerifyForm() {
  const [state, action] = useActionState(verifyLoginAction, init);
  return (
    <div className="um um-login um-15">
      <div className="um-form">
        <form action={action} autoComplete="off">
          {state.error && <Notice kind="err">{state.error}</Notice>}
          <CodeField label="6-digit code" help="Open your authenticator app and enter the current code. Lost your phone? Enter one of your backup codes instead." />
          <TrustBox />
          <div style={{ height: 20 }} />
          <Submit label="Continue" />
        </form>
        <CancelLink />
      </div>
    </div>
  );
}

export function SetupForm() {
  const [state, action] = useActionState(confirmSetupAction, init);

  if (state.codes) {
    return (
      <div className="um um-login um-15">
        <div className="um-form">
          <Notice kind="success">Two-step sign-in is on.</Notice>
          <p style={{ margin: "14px 0 8px" }}>
            <strong>Save these backup codes now.</strong> Each works once if you lose your phone. They will not be shown again.
          </p>
          <ul style={{ listStyle: "none", padding: 14, margin: "0 0 16px", columns: 2, fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: 16, lineHeight: 1.9, background: "#f6f3ec", borderRadius: 8 }}>
            {state.codes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="button" className="um-button um-alt" onClick={() => window.print()}>
              Print
            </button>
            <form action={finishSetupAction}>
              <Submit label="I have saved them, continue" />
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="um um-login um-15">
      <div className="um-form">
        <form action={action} autoComplete="off">
          {state.error && <Notice kind="err">{state.error}</Notice>}
          <CodeField label="Enter the 6-digit code from the app" />
          <TrustBox />
          <div style={{ height: 20 }} />
          <Submit label="Turn on two-step sign-in" />
        </form>
        <CancelLink />
      </div>
    </div>
  );
}
