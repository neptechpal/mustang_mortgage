"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Avatar, Notice, UmField } from "./fields";
import { updateProfileAction } from "../account-actions";
import type { FormState } from "../auth-actions";

function Save() {
  const { pending } = useFormStatus();
  return <input type="submit" className="um-button" value="Update profile" disabled={pending} />;
}

export function ProfileEditForm({
  description,
  avatar,
  name,
  maxChars,
  cancelHref,
}: {
  description: string;
  avatar: string | null;
  name: string;
  maxChars: number;
  cancelHref: string;
}) {
  const [state, action] = useActionState(updateProfileAction, {} as FormState);
  const [preview, setPreview] = useState<string | null>(avatar);
  const [bio, setBio] = useState(state.values?.description ?? description);
  const fe = state.fieldErrors ?? {};
  return (
    <form action={action}>
      {state.error && <Notice kind="err">{state.error}</Notice>}
      <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
        <Avatar src={preview} name={name} size={120} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <UmField name="profile_photo" label="Profile photo" error={fe.profile_photo}>
            <input
              type="file"
              name="profile_photo"
              id="profile_photo-um"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                setPreview(f ? URL.createObjectURL(f) : avatar);
              }}
            />
          </UmField>
          {avatar && (
            <label className="um-field-checkbox" style={{ marginTop: 10 }}>
              <input type="checkbox" name="remove_photo" value="1" /> Remove photo
            </label>
          )}
        </div>
      </div>
      <UmField name="description" label="Biography" error={fe.description} help={`${maxChars - bio.length} characters left`}>
        <textarea
          className={`um-form-field${fe.description ? " um-error" : ""}`}
          name="description"
          id="description-um"
          maxLength={maxChars}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="A few lines about yourself"
        />
      </UmField>
      <div className="um-col-alt">
        <div className="um-left um-half">
          <Save />
        </div>
        <div className="um-right um-half">
          <Link href={cancelHref} className="um-button um-alt">
            Cancel
          </Link>
        </div>
        <div className="um-clear" />
      </div>
    </form>
  );
}
