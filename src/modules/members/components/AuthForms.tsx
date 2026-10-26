"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Honeypot, Notice, UmField } from "./fields";
import {
  loginAction,
  registerAction,
  requestResetAction,
  setNewPasswordAction,
  type FormState,
} from "../auth-actions";

function Submit({ label, className = "um-button" }: { label: string; className?: string }) {
  const { pending } = useFormStatus();
  return <input type="submit" value={label} className={className} id="um-submit-btn" disabled={pending} />;
}

const init: FormState = {};

export function LoginForm({ redirectTo, notice, warning }: { redirectTo?: string; notice?: string; warning?: string }) {
  const [state, action] = useActionState(loginAction, init);
  const fe = state.fieldErrors ?? {};
  return (
    <div className="um um-login um-15">
      <div className="um-form">
        <form action={action} autoComplete="off" noValidate>
          {notice && !state.error && <Notice kind="success">{notice}</Notice>}
          {warning && !state.error && <Notice kind="err">{warning}</Notice>}
          {state.error && <Notice kind="err">{state.error}</Notice>}
          <div className="um-row _um_row_1">
            <div className="um-col-1">
              <UmField name="username" label="Username or E-mail" value={state.values?.username} error={fe.username} autoComplete="username" />
              <UmField name="user_password" label="Password" type="password" error={fe.user_password} />
            </div>
          </div>
          <input type="hidden" name="redirect_to" value={redirectTo ?? ""} />
          <Honeypot />
          <div className="um-col-alt">
            <div className="um-field um-field-c">
              <div className="um-field-area">
                <label className="um-field-checkbox">
                  <input type="checkbox" name="rememberme" value="1" />
                  <span className="um-field-checkbox-option"> Keep me signed in</span>
                </label>
              </div>
            </div>
            <div className="um-clear" />
            <div style={{ height: 20 }} />
            <div className="um-left um-half">
              <Submit label="Login" />
            </div>
            <div className="um-right um-half">
              <Link href="/register" className="um-button um-alt">
                Register
              </Link>
            </div>
            <div className="um-clear" />
          </div>
          <div className="um-col-alt-b">
            <Link href="/password-reset" className="um-link-alt">
              Forgot your password?
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, init);
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? {};
  if (state.message) {
    return (
      <div className="um um-register um-14">
        <div className="um-form">
          <div className="um-postmessage">{state.message}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="um um-register um-14">
      <div className="um-form" data-mode="register">
        <form action={action} noValidate>
          {state.error && <Notice kind="err">{state.error}</Notice>}
          <div className="um-row _um_row_1">
            <div className="um-col-1">
              <UmField name="user_login" label="Username" value={v.user_login} error={fe.user_login} />
              <UmField name="first_name" label="First Name" value={v.first_name} error={fe.first_name} />
              <UmField name="last_name" label="Last Name" value={v.last_name} error={fe.last_name} />
              <UmField name="user_email" label="E-mail Address" value={v.user_email} error={fe.user_email} />
              <UmField name="user_password" label="Password" type="password" error={fe.user_password} autoComplete="new-password" />
              <UmField
                name="confirm_user_password"
                label="Confirm Password"
                type="password"
                placeholder="Confirm Password"
                error={fe.confirm_user_password}
                autoComplete="new-password"
              />
            </div>
          </div>
          <Honeypot />
          <div className="um-col-alt">
            <div className="um-left um-half">
              <Submit label="Register" />
            </div>
            <div className="um-right um-half">
              <Link href="/login" className="um-button um-alt">
                Login
              </Link>
            </div>
            <div className="um-clear" />
          </div>
        </form>
      </div>
    </div>
  );
}

export function ResetRequestForm({ notice }: { notice?: string }) {
  const [state, action] = useActionState(requestResetAction, init);
  const fe = state.fieldErrors ?? {};
  return (
    <div className="um um-password um-um_password_id">
      <div className="um-form">
        <form action={action} noValidate>
          {state.error && <Notice kind="err">{state.error}</Notice>}
          <div className="um-field um-field-block um-field-type_block">
            <div className="um-field-block">
              <div style={{ textAlign: "center" }}>
                {notice ?? "To reset your password, please enter your email address or username below."}
              </div>
            </div>
          </div>
          <UmField
            name="username_b"
            label="Username or Email"
            placeholder="Enter your username or email"
            value={state.values?.username_b}
            error={fe.username_b}
            autoComplete="username"
          />
          <Honeypot />
          <div className="um-col-alt um-col-alt-b">
            <div className="um-center">
              <Submit label="Reset password" />
            </div>
            <div className="um-clear" />
          </div>
        </form>
      </div>
    </div>
  );
}

export function SetPasswordForm({ rpKey }: { rpKey: string }) {
  const [state, action] = useActionState(setNewPasswordAction, init);
  const fe = state.fieldErrors ?? {};
  return (
    <div className="um um-password um-um_password_id">
      <div className="um-form">
        <form action={action} noValidate>
          {state.error && <Notice kind="err">{state.error}</Notice>}
          <input type="hidden" name="rp_key" value={rpKey} />
          <UmField name="user_password" label="New Password" type="password" error={fe.user_password} autoComplete="new-password" />
          <UmField
            name="confirm_user_password"
            label="Confirm Password"
            type="password"
            placeholder="Confirm Password"
            error={fe.confirm_user_password}
            autoComplete="new-password"
          />
          <div className="um-col-alt um-col-alt-b">
            <div className="um-center">
              <Submit label="Change password" />
            </div>
            <div className="um-clear" />
          </div>
        </form>
      </div>
    </div>
  );
}
