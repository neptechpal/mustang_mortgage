import { FACT_LABELS, factValue, type FactPath } from "../../config";

/**
 * Placeholder token for an unknown fact. Renders a visible, bracketed token such as
 * "[Credit Representative number]" so missing facts are obvious on staging.
 * Never replace with an invented value: fill the real one in config.ts.
 */
export function Placeholder({ label }: { label: string }) {
  return (
    <span className="mw-ph" title="To be supplied before launch">
      [{label}]
    </span>
  );
}

/** Renders SITE value at `path` or its placeholder token. `<Fact path="licence.licenseeAcl" />` */
export function Fact({ path, fallbackLabel }: { path: FactPath; fallbackLabel?: string }) {
  const v = factValue(path);
  if (v) return <>{v}</>;
  return <Placeholder label={fallbackLabel ?? FACT_LABELS[path]} />;
}
