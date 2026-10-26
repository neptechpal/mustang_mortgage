"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Avatar, Notice, UmField, UmSelect } from "./fields";
import {
  changePasswordAction,
  deleteAccountAction,
  requestErasureAction,
  updateGeneralAction,
  updatePrivacyAction,
} from "../account-actions";
import type { FormState } from "../auth-actions";

type Tab = "general" | "password" | "privacy" | "delete";

export type AccountData = {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  displayName: string;
  avatar: string | null;
  profileLink: string;
  privacy: string;
  noindex: string;
  hideInMembers: string;
  canDelete: boolean;
};

const TABS: { id: Tab; title: string; icon: string }[] = [
  { id: "general", title: "Account", icon: "👤" },
  { id: "password", title: "Change Password", icon: "✱" },
  { id: "privacy", title: "Privacy", icon: "🔒" },
  { id: "delete", title: "Delete Account", icon: "🗑" },
];

const DELETE_TEXT =
  "Are you sure you want to delete your account? This will erase all of your account data from the site. To delete your account enter your password below.";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <div className="um-col-alt um-col-alt-b" style={{ textAlign: "left" }}>
      <div className="um-left">
        <input type="submit" className="um-button" value={label} disabled={pending} style={{ width: "auto", minWidth: 200 }} />
      </div>
      <div className="um-clear" />
    </div>
  );
}

function Feedback({ state }: { state: FormState }) {
  if (state.error) return <Notice kind="err">{state.error}</Notice>;
  if (state.message) return <Notice kind="success">{state.message}</Notice>;
  return null;
}

const init: FormState = {};

function GeneralTab({ d }: { d: AccountData }) {
  const [state, action] = useActionState(updateGeneralAction, init);
  const fe = state.fieldErrors ?? {};
  const v = state.values ?? { first_name: d.firstName, last_name: d.lastName, user_email: d.email };
  return (
    <form action={action} noValidate>
      <Feedback state={state} />
      <UmField name="user_login" label="Username" value={d.username} readOnly />
      <UmField name="first_name" label="First Name" value={v.first_name} error={fe.first_name} />
      <UmField name="last_name" label="Last Name" value={v.last_name} error={fe.last_name} />
      <UmField name="user_email" label="E-mail Address" value={v.user_email} error={fe.user_email} />
      <Submit label="Update Account" />
    </form>
  );
}

function PasswordTab() {
  const [state, action] = useActionState(changePasswordAction, init);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action} noValidate>
      <Feedback state={state} />
      <UmField name="current_user_password" label="Current Password" type="password" error={fe.current_user_password} />
      <UmField name="user_password" label="New Password" type="password" error={fe.user_password} autoComplete="new-password" />
      <UmField name="confirm_user_password" label="Confirm Password" type="password" error={fe.confirm_user_password} autoComplete="new-password" />
      <Submit label="Update Password" />
    </form>
  );
}

function PrivacyTab({ d }: { d: AccountData }) {
  const [state, action] = useActionState(updatePrivacyAction, init);
  const [erase, eraseAction] = useActionState(requestErasureAction, init);
  const v = state.values ?? { profile_privacy: d.privacy, profile_noindex: d.noindex, hide_in_members: d.hideInMembers };
  return (
    <>
      <form action={action}>
        <Feedback state={state} />
        <UmSelect name="profile_privacy" label="Profile Privacy" options={["Everyone", "Only me"]} value={v.profile_privacy} help="Who can see your public profile?" />
        <UmSelect
          name="profile_noindex"
          label="Avoid indexing my profile by search engines"
          options={["No", "Yes"]}
          value={v.profile_noindex}
          help="Hide my profile for robots?"
        />
        <UmSelect
          name="hide_in_members"
          label="Hide my profile from directory"
          options={["No", "Yes"]}
          value={v.hide_in_members}
          help="Here you can hide yourself from appearing in public directory"
        />
        <Submit label="Update Privacy" />
      </form>

      <div className="um-field um-field-export_data" style={{ marginTop: 30 }}>
        <div className="um-field-label">
          <label>Download your data</label>
          <div className="um-field-help">You can request a file with the information that we believe is most relevant and useful to you.</div>
        </div>
        <form action="/api/auth/export" method="post" target="_blank">
          <UmField name="um-export-data" label="Enter your current password to confirm a new export of your personal data." type="password" />
          <div style={{ marginTop: 10 }}>
            <input type="submit" className="um-button" value="Request data" style={{ width: "auto", minWidth: 200 }} />
          </div>
        </form>
      </div>

      <div className="um-field um-field-export_data" style={{ marginTop: 30 }}>
        <div className="um-field-label">
          <label>Erase of your data</label>
          <div className="um-field-help">You can request erasing of the data that we have about you.</div>
        </div>
        <form action={eraseAction}>
          <Feedback state={erase} />
          <UmField
            name="um-erase-data"
            label="Enter your current password to confirm the erasure of your personal data."
            type="password"
            error={erase.fieldErrors?.["um-erase-data"]}
          />
          <div style={{ marginTop: 10 }}>
            <input type="submit" className="um-button" value="Request data erase" style={{ width: "auto", minWidth: 200 }} />
          </div>
        </form>
      </div>
    </>
  );
}

function DeleteTab() {
  const [state, action] = useActionState(deleteAccountAction, init);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Are you sure you want to delete your account?")) e.preventDefault();
      }}
    >
      <Feedback state={state} />
      <div className="um-account-tab-text">{DELETE_TEXT}</div>
      <UmField name="single_user_password" label="Password" type="password" error={state.fieldErrors?.single_user_password} />
      <Submit label="Delete Account" />
    </form>
  );
}

export function AccountTabs({ d, initialTab }: { d: AccountData; initialTab?: string }) {
  const tabs = TABS.filter((t) => t.id !== "delete" || d.canDelete);
  const [tab, setTab] = useState<Tab>(tabs.some((t) => t.id === initialTab) ? (initialTab as Tab) : "general");

  useEffect(() => {
    const url = tab === "general" ? "/account" : `/account/${tab}`;
    window.history.replaceState(null, "", url);
  }, [tab]);

  const current = tabs.find((t) => t.id === tab)!;
  return (
    <div className="um um-account">
      <div className="um-form">
        <div className="um-account-wrap">
          <div className="um-account-side">
            <div className="um-account-meta">
              <Link href={d.profileLink}>
                <Avatar src={d.avatar} name={d.displayName} size={120} />
              </Link>
              <div className="um-account-name">
                <Link href={d.profileLink} style={{ color: "#444" }}>
                  {d.displayName}
                </Link>
              </div>
              <div className="um-account-profile-link">
                <Link href={d.profileLink}>View profile</Link>
              </div>
            </div>
            <ul>
              {tabs.map((t) => (
                <li key={t.id}>
                  <button type="button" className={`um-account-link${t.id === tab ? " current" : ""}`} onClick={() => setTab(t.id)}>
                    <span aria-hidden="true" style={{ width: 18, textAlign: "center" }}>
                      {t.icon}
                    </span>
                    <span>{t.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="um-account-main">
            <div className="um-account-heading">
              <span aria-hidden="true">{current.icon}</span>
              {current.title}
            </div>
            {tab === "general" && <GeneralTab d={d} />}
            {tab === "password" && <PasswordTab />}
            {tab === "privacy" && <PrivacyTab d={d} />}
            {tab === "delete" && <DeleteTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
