// Small numeric helpers shared by the calc engines. Pure functions, no dependencies.

/** Round to cents (half away from zero), avoiding binary float artefacts like 1.005 → 1.00. */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return n;
  const sign = n < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(n) * 100 + 1e-7)) / 100;
}

/** Round up to the next multiple of `step` (e.g. "for every $100 or part"). */
export function ceilTo(n: number, step: number): number {
  if (step <= 0) return n;
  return Math.ceil(n / step - 1e-9) * step;
}

/** Round down to a multiple of `step`. */
export function floorTo(n: number, step: number): number {
  if (step <= 0) return n;
  return Math.floor(n / step + 1e-9) * step;
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

/** Finite, non-negative number or 0. Use on user input. */
export function nonNeg(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  return Number.isFinite(x) && x > 0 ? x : 0;
}

export const formatAUD = (n: number, cents = false) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(n);
