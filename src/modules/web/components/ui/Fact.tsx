import { factValue, type FactPath } from "../../config";

/** Unknown details are hidden on the public site rather than shown as "[Label]" tokens. */
export function Placeholder(_props: { label: string }) {
  return null;
}

/** Renders the SITE value at `path`, or nothing when it has not been filled in. */
export function Fact({ path }: { path: FactPath; fallbackLabel?: string }) {
  const v = factValue(path);
  return v ? <>{v}</> : null;
}
