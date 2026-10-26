"use client";

// Building blocks shared by the public calculators: AUD/percent/number inputs, segmented radio groups,
// checkboxes, the result panel, the "Talk this through" CTA and the assumptions disclosure.
// All styling lives in ../styles/calc.css (tokens from web.css).

import "../styles/calc.css";
import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronDown, Phone } from "lucide-react";
import { PATHS, SITE } from "../config";
import { LinkButton } from "../components/ui/Button";
import { cx } from "../components/ui/cx";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const AUD0 = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0, minimumFractionDigits: 0 });
const AUD2 = new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 2, minimumFractionDigits: 2 });
const GROUP = new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 });

/** $12,345 (whole dollars) or $12,345.67 with `cents`. Negative values keep the minus sign. */
export function aud(n: number, cents = false) {
  if (!Number.isFinite(n)) return "–";
  return (cents ? AUD2 : AUD0).format(cents ? n : Math.round(n));
}
/** Cents only when the amount has them ($182.73, $23,437). */
export function audAuto(n: number) {
  return Math.abs(n - Math.round(n)) > 0.004 ? aud(n, true) : aud(n);
}
export function pct(n: number, dp = 2) {
  return `${n.toLocaleString("en-AU", { minimumFractionDigits: dp, maximumFractionDigits: dp })}%`;
}
export function yearsMonths(totalMonths: number) {
  const m = Math.max(0, Math.round(totalMonths));
  const y = Math.floor(m / 12);
  const r = m % 12;
  const parts = [y ? `${y} year${y === 1 ? "" : "s"}` : "", r ? `${r} month${r === 1 ? "" : "s"}` : ""].filter(Boolean);
  return parts.length ? parts.join(" ") : "0 months";
}

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

type FieldShell = { id?: string; label: React.ReactNode; hint?: React.ReactNode; optional?: boolean; className?: string; full?: boolean };

function Shell({ id, label, hint, optional, className, full, children, hintId }: FieldShell & { id: string; hintId?: string; children: React.ReactNode }) {
  return (
    <div className={cx("mw-field", full && "mw-field--full", className)}>
      <label className="mw-label" htmlFor={id}>
        {label}
        {optional && <span className="mw-label__opt">optional</span>}
      </label>
      {children}
      {hint && (
        <span className="mw-field__hint" id={hintId}>
          {hint}
        </span>
      )}
    </div>
  );
}

const digitsOnly = (s: string) => s.replace(/[^\d]/g, "");
const groupDigits = (d: string) => (d ? GROUP.format(Number(d)) : "");

/**
 * Whole-dollar input: shows "$" and groups thousands while you type (caret kept in place).
 * `value` is a number or null (empty). Uses inputMode="numeric" for the phone keypad.
 */
export function MoneyField({
  value,
  onChange,
  placeholder,
  max = 1_000_000_000,
  suffix,
  ...shell
}: FieldShell & { value: number | null; onChange: (v: number | null) => void; placeholder?: string; max?: number; suffix?: string }) {
  const auto = useId();
  const id = shell.id ?? `mwc-${auto}`;
  const ref = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(() => (value == null ? "" : groupDigits(String(Math.round(value)))));
  const caret = useRef<number | null>(null);

  // Follow external changes (reset, presets).
  useEffect(() => {
    const cur = digitsOnly(text);
    const want = value == null ? "" : String(Math.round(value));
    if (cur !== want) setText(groupDigits(want));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || caret.current == null || document.activeElement !== el) return;
    // Place the caret after the same number of digits as before formatting.
    let digits = caret.current;
    let pos = 0;
    while (pos < text.length && digits > 0) {
      if (/\d/.test(text[pos])) digits--;
      pos++;
    }
    el.setSelectionRange(pos, pos);
    caret.current = null;
  }, [text]);

  return (
    <Shell {...shell} id={id} hintId={shell.hint ? `${id}-hint` : undefined}>
      <div className={cx("mw-affix mw-affix--pre", suffix && "mw-affix--suf")}>
        <span className="mw-affix__pre" aria-hidden="true">
          $
        </span>
        <input
          ref={ref}
          id={id}
          className="mw-input"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={placeholder}
          value={text}
          aria-describedby={shell.hint ? `${id}-hint` : undefined}
          onChange={(e) => {
            const raw = e.target.value;
            const sel = e.target.selectionStart ?? raw.length;
            caret.current = digitsOnly(raw.slice(0, sel)).length;
            let d = digitsOnly(raw).replace(/^0+(?=\d)/, "");
            if (d && Number(d) > max) d = String(max);
            setText(groupDigits(d));
            onChange(d ? Number(d) : null);
          }}
        />
        {suffix && <span className="mw-affix__suf">{suffix}</span>}
      </div>
    </Shell>
  );
}

/** Decimal input (rates, years). Keeps exactly what the user typed; reports a number or null. */
export function DecimalField({
  value,
  onChange,
  placeholder,
  suffix,
  min = 0,
  max = 100,
  integer,
  ...shell
}: FieldShell & { value: number | null; onChange: (v: number | null) => void; placeholder?: string; suffix?: string; min?: number; max?: number; integer?: boolean }) {
  const auto = useId();
  const id = shell.id ?? `mwc-${auto}`;
  const [text, setText] = useState(() => (value == null ? "" : String(value)));
  useEffect(() => {
    const cur = text === "" ? null : Number(text);
    if (cur !== value && !(Number.isNaN(cur) && value == null)) setText(value == null ? "" : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const short = suffix && suffix.length <= 2;
  return (
    <Shell {...shell} id={id} hintId={shell.hint ? `${id}-hint` : undefined}>
      <div className={cx("mw-affix", suffix && (short ? "mw-affix--suf mw-affix--suf-short" : "mw-affix--suf"))}>
        <input
          id={id}
          className="mw-input"
          type="text"
          inputMode={integer ? "numeric" : "decimal"}
          autoComplete="off"
          placeholder={placeholder}
          value={text}
          aria-describedby={shell.hint ? `${id}-hint` : undefined}
          onChange={(e) => {
            let t = e.target.value.replace(",", ".").replace(integer ? /[^\d]/g : /[^\d.]/g, "");
            const dot = t.indexOf(".");
            if (dot >= 0) t = t.slice(0, dot + 1) + t.slice(dot + 1).replace(/\./g, "");
            setText(t);
            const n = t === "" || t === "." ? null : Number(t);
            onChange(n == null || Number.isNaN(n) ? null : Math.min(max, n));
          }}
          onBlur={() => {
            if (text === "") return;
            const n = Number(text);
            if (Number.isNaN(n)) return setText("");
            const c = Math.min(max, Math.max(min, n));
            if (c !== n) {
              setText(String(c));
              onChange(c);
            }
          }}
        />
        {suffix && <span className="mw-affix__suf">{suffix}</span>}
      </div>
    </Shell>
  );
}

export function SelectField<T extends string>({
  value,
  onChange,
  options,
  ...shell
}: FieldShell & { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  const auto = useId();
  const id = shell.id ?? `mwc-${auto}`;
  return (
    <Shell {...shell} id={id} hintId={shell.hint ? `${id}-hint` : undefined}>
      <select id={id} className="mw-select" value={value} onChange={(e) => onChange(e.target.value as T)} aria-describedby={shell.hint ? `${id}-hint` : undefined}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Shell>
  );
}

/** Radio group drawn as a segmented control. `stack` lists options vertically (long labels). */
export function Segmented<T extends string>({
  legend,
  value,
  onChange,
  options,
  stack,
  min,
  hint,
  className,
}: {
  legend: React.ReactNode;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; sub?: React.ReactNode }[];
  stack?: boolean;
  /** Minimum option width in px before wrapping (default 118). */
  min?: number;
  hint?: React.ReactNode;
  className?: string;
}) {
  const name = useId();
  return (
    <fieldset className={cx("mw-seg", stack && "mw-seg--stack", className)} style={min ? ({ ["--mw-seg-min" as string]: `${min}px` } as React.CSSProperties) : undefined}>
      <legend>{legend}</legend>
      <div className="mw-seg__opts">
        {options.map((o) => (
          <label className="mw-seg__opt" key={o.value}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>
              {o.label}
              {o.sub && <small>{o.sub}</small>}
            </span>
          </label>
        ))}
      </div>
      {hint && <span className="mw-field__hint">{hint}</span>}
    </fieldset>
  );
}

export function Check({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <label className="mw-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="mw-check__label">{label}</span>
      {hint && <span className="mw-check__hint">{hint}</span>}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Layout + result                                                     */
/* ------------------------------------------------------------------ */

/** Two-panel calculator shell (form | result). Goes two-column when its own width is ≥ 860px. */
export function CalcShell({
  title,
  intro,
  form,
  result,
  compact,
  label,
  className,
}: {
  title?: React.ReactNode;
  intro?: React.ReactNode;
  form: React.ReactNode;
  result: React.ReactNode;
  compact?: boolean;
  /** Accessible name for the calculator region. */
  label: string;
  className?: string;
}) {
  return (
    <div className={cx("mw-calcwrap", className)}>
      <section className={cx("mw-calc", compact && "mw-calc--compact")} aria-label={label}>
        <form className="mw-calc__form" onSubmit={(e) => e.preventDefault()} noValidate>
          {(title || intro) && (
            <div className="mw-calc__head">
              {title && <h2 className="mw-calc__title">{title}</h2>}
              {intro && <p className="mw-calc__intro">{intro}</p>}
            </div>
          )}
          {form}
        </form>
        <div className="mw-calc__result">
          <div className="mw-calc__result-inner" aria-live="polite" aria-atomic="false">
            {result}
          </div>
        </div>
      </section>
    </div>
  );
}

export function Group({ legend, children, className }: { legend: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <fieldset className={cx("mw-calc__group", className)}>
      <legend>{legend}</legend>
      {children}
    </fieldset>
  );
}

export function Figure({ label, value, unit, sub, muted }: { label: React.ReactNode; value: React.ReactNode; unit?: React.ReactNode; sub?: React.ReactNode; muted?: boolean }) {
  return (
    <div>
      <p className="mw-calc__label">{label}</p>
      <p className={cx("mw-calc__figure", muted && "mw-calc__figure--muted")}>
        {value}
        {unit && <small>{unit}</small>}
      </p>
      {sub && <p className="mw-calc__sub">{sub}</p>}
    </div>
  );
}

export type Row = { label: React.ReactNode; detail?: React.ReactNode; value: React.ReactNode; tone?: "neg" | "total" };

export function Rows({ rows }: { rows: Row[] }) {
  return (
    <dl className="mw-calc__rows">
      {rows.map((r, i) => (
        <div key={i} className={cx(r.tone === "neg" && "is-neg", r.tone === "total" && "is-total")}>
          <dt>
            {r.label}
            {r.detail && <small>{r.detail}</small>}
          </dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Stat({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="mw-calc__stat">
      <p className="mw-calc__stat-l">{label}</p>
      <p className="mw-calc__stat-v">{value}</p>
    </div>
  );
}

export function Notes({ items }: { items: React.ReactNode[] }) {
  if (!items.length) return null;
  return (
    <ul className="mw-calc__notes">
      {items.map((n, i) => (
        <li key={i}>{n}</li>
      ))}
    </ul>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mw-calc__empty">{children}</p>;
}

/** Booking CTA at the bottom of every result card. */
export function TalkCta({ note }: { note?: React.ReactNode }) {
  return (
    <div className="mw-calc__cta" data-pseo-exclude="">
      <LinkButton href={PATHS.book} block arrow>
        Talk this through
      </LinkButton>
      <LinkButton href={SITE.broker.phoneHref} variant="quiet" block icon={<Phone size={18} strokeWidth={1.5} aria-hidden="true" />}>
        <span className="mw-num">{SITE.broker.phone}</span>
      </LinkButton>
      <p>{note ?? `A ${SITE.consultation.minutes}-minute consultation with ${SITE.broker.name}, by ${SITE.consultation.modes.join(" or ")}. We check these numbers against real lender policy.`}</p>
    </div>
  );
}

/** "How this is calculated" disclosure with a link to /legal/important-information. */
export function Assumptions({ items, title = "Assumptions", children, open }: { items: React.ReactNode[]; title?: string; children?: React.ReactNode; open?: boolean }) {
  return (
    <details className="mw-assume" open={open} data-pseo-exclude="">
      <summary>
        <span>{title}</span>
        <ChevronDown size={18} strokeWidth={1.5} aria-hidden="true" />
      </summary>
      <div className="mw-assume__body">
        <ul>
          {items.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
        {children}
        <p>
          Estimates only, not a quote or credit approval.{" "}
          <Link href={`${PATHS.importantInfo}#calculators`} className="mw-link">
            Important information about our calculators
          </Link>
          .
        </p>
      </div>
    </details>
  );
}

/** Number from possibly-null input, defaulting to 0. */
export const n0 = (v: number | null | undefined) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
