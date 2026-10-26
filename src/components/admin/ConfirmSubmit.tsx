"use client";

import type { ComponentProps } from "react";

/** Submit button that asks for confirmation before the form is submitted. */
export default function ConfirmSubmit({ message, onClick, ...p }: ComponentProps<"button"> & { message: string }) {
  return (
    <button
      {...p}
      type="submit"
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
        onClick?.(e);
      }}
    />
  );
}
