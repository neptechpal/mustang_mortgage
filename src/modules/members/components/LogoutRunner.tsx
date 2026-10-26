"use client";

import { useEffect, useRef } from "react";
import { logoutAction } from "../auth-actions";

export function LogoutRunner() {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    ref.current?.requestSubmit();
  }, []);
  return (
    <form action={logoutAction} ref={ref}>
      <p style={{ marginBottom: 12 }}>Logging you out…</p>
      <noscript>
        <button type="submit">Log out</button>
      </noscript>
    </form>
  );
}
