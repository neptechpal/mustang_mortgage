"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, Check, CircleAlert, LoaderCircle } from "lucide-react";
import { LEAD_EMAIL_RE, LEAD_FORM, type LeadField } from "@/modules/site/lead/definition";
import { HEADER_ACTIONS, PATHS, SITE } from "../../config";

type Errors = Record<string, string>;

const ENDPOINT = `/api/forms/mmf-${LEAD_FORM.id}`;
const AUTOCOMPLETE: Record<string, string> = { full_name: "name", email: "email", mobile: "tel" };
const SECTION_TITLES = ["Your details", "What you need"];

function validateField(f: LeadField, form: HTMLFormElement): string | null {
  if (f.type === "checkbox") {
    const any = form.querySelectorAll(`input[name="${f.key}[]"]:checked`).length > 0;
    return f.required && !any ? `Choose at least one option.` : null;
  }
  const el = form.elements.namedItem(f.key) as HTMLInputElement | null;
  const v = (el?.value ?? "").trim();
  if (f.required && !v) return `Enter your ${f.label.toLowerCase()}.`;
  if (v && f.type === "email" && !LEAD_EMAIL_RE.test(v)) return "Enter an email address like name@example.com.";
  if (v && f.type === "tel" && v.replace(/\D/g, "").length < 8) return "Enter a phone number we can call, e.g. 0400 000 000.";
  if (v && f.type === "currency" && !/^\$?\s*[\d,]+(\.\d{1,2})?$/.test(v)) return "Enter an amount in dollars, e.g. 650,000.";
  return null;
}

/**
 * Website enquiry form. Posts multipart to /api/forms/mmf-3012 (same endpoint and field keys as
 * the CRM lead form, so every enquiry still creates a CRM case) plus hidden `source_page` and `_url`
 * for attribution. Inline validation on blur, error summary on submit, success state with a
 * booking link. Fields come from src/modules/site/lead/definition.ts.
 */
export function EnquiryForm({ sourcePage, defaultPurpose = [], submitLabel = "Send enquiry" }: { sourcePage?: string; defaultPurpose?: string[]; submitLabel?: string }) {
  const uid = useId().replace(/:/g, "");
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [summary, setSummary] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [doneName, setDoneName] = useState<string | null>(null);

  const fields = LEAD_FORM.sections.flatMap((s) => s.fields);

  const checkOne = (f: LeadField) => {
    if (!formRef.current) return;
    const msg = validateField(f, formRef.current);
    setErrors((prev) => {
      const next = { ...prev };
      if (msg) next[f.key] = msg;
      else delete next[f.key];
      return next;
    });
  };

  const onBlur = (f: LeadField) => () => {
    const form = formRef.current;
    if (!form) return;
    const el = form.elements.namedItem(f.key) as HTMLInputElement | null;
    // Validate on blur only once the person has typed something, or when the field already shows an error.
    if ((el && el.value.trim()) || errors[f.key]) checkOne(f);
  };
  const onChange = (f: LeadField) => () => {
    if (errors[f.key]) checkOne(f);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const errs: Errors = {};
    for (const f of fields) {
      const m = validateField(f, form);
      if (m) errs[f.key] = m;
    }
    setErrors(errs);
    if (Object.keys(errs).length) {
      setSummary(Object.values(errs));
      requestAnimationFrame(() => summaryRef.current?.focus());
      return;
    }
    setSummary([]);
    setBusy(true);
    try {
      const fd = new FormData(form);
      const loan = String(fd.get("loan_amount") ?? "").replace(/[^0-9.]/g, "");
      fd.set("loan_amount", loan);
      fd.set("_url", window.location.href.split("#")[0]);
      const res = await fetch(ENDPOINT, { method: "POST", body: fd });
      const j = (await res.json().catch(() => ({ success: false }))) as { success: boolean; data?: { errors?: string[]; fields?: Errors } };
      if (j.success) {
        const first = String(fd.get("full_name") ?? "").trim().split(/\s+/)[0] ?? "";
        setDoneName(first);
        requestAnimationFrame(() => doneRef.current?.focus());
      } else {
        setErrors(j.data?.fields ?? {});
        setSummary(j.data?.errors?.length ? j.data.errors : ["Something went wrong sending your enquiry. Please try again, or call us."]);
        requestAnimationFrame(() => summaryRef.current?.focus());
      }
    } catch {
      setSummary([`We couldn't reach our server. Check your connection and try again, or call ${SITE.broker.phone}.`]);
      requestAnimationFrame(() => summaryRef.current?.focus());
    }
    setBusy(false);
  };

  if (doneName !== null) {
    return (
      <div className="mw-form-done" ref={doneRef} tabIndex={-1} role="status" aria-live="polite">
        <span className="mw-form-done__icon" aria-hidden="true">
          <Check size={24} strokeWidth={1.75} />
        </span>
        <h2 className="mw-h3">Thanks{doneName ? `, ${doneName}` : ""}. We have your enquiry.</h2>
        <p className="mw-body">
          {SITE.broker.givenName} will reply {SITE.responsePromise}, usually by phone. If you would rather pick a time now, you can book a {SITE.consultation.minutes}-minute
          consultation online.
        </p>
        <div className="mw-btnrow" style={{ marginTop: 20 }}>
          <Link href={HEADER_ACTIONS.book.href} className="mw-btn mw-btn--primary">
            <span>{HEADER_ACTIONS.book.label}</span>
            <ArrowRight className="mw-arrow" size={18} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        </div>
      </div>
    );
  }

  const errId = (k: string) => `${uid}-${k}-err`;

  const control = (f: LeadField) => {
    const id = `${uid}-${f.key}`;
    const invalid = !!errors[f.key];
    const describedBy = invalid ? errId(f.key) : undefined;
    switch (f.type) {
      case "checkbox":
        return (
          <div className="mw-toggles" role="group" aria-labelledby={`${id}-label`} aria-describedby={describedBy}>
            {f.options!.map((o) => (
              <label className="mw-toggle" key={o}>
                <input type="checkbox" name={`${f.key}[]`} value={o} defaultChecked={defaultPurpose.includes(o)} onChange={onChange(f)} />
                <span>
                  <Check size={16} strokeWidth={2} aria-hidden="true" />
                  {o}
                </span>
              </label>
            ))}
          </div>
        );
      case "currency":
        return (
          <div className="mw-money">
            <span aria-hidden="true">$</span>
            <input className="mw-input" id={id} name={f.key} type="text" inputMode="decimal" autoComplete="off" placeholder="650,000" aria-invalid={invalid || undefined} aria-describedby={describedBy} onBlur={onBlur(f)} onChange={onChange(f)} />
          </div>
        );
      case "select":
        return (
          <select className="mw-select" id={id} name={f.key} defaultValue="" aria-invalid={invalid || undefined} aria-describedby={describedBy} onChange={onChange(f)}>
            <option value="">Choose one</option>
            {f.options!.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        );
      case "textarea":
        return <textarea className="mw-textarea" id={id} name={f.key} rows={4} aria-describedby={describedBy} placeholder="For example: we're on 190 visas, have a 10% deposit and are looking in Parramatta." />;
      default:
        return (
          <input
            className="mw-input"
            id={id}
            name={f.key}
            type={f.type}
            autoComplete={AUTOCOMPLETE[f.key]}
            inputMode={f.type === "tel" ? "tel" : f.type === "email" ? "email" : undefined}
            required={f.required}
            aria-required={f.required || undefined}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            onBlur={onBlur(f)}
            onChange={onChange(f)}
          />
        );
    }
  };

  return (
    <form ref={formRef} className="mw-form" method="post" action={ENDPOINT} encType="multipart/form-data" noValidate onSubmit={onSubmit}>
      <input type="hidden" name="source_page" value={sourcePage ?? pathname ?? ""} />
      <div className="mw-hp" aria-hidden="true">
        <label>
          Leave this field empty
          <input type="text" name="mmf_website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {summary.length > 0 && (
        <div className="mw-form__summary" role="alert" tabIndex={-1} ref={summaryRef}>
          <strong>Please check {summary.length === 1 ? "this" : "these"}:</strong>
          <ul>
            {summary.slice(0, 8).map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}

      {LEAD_FORM.sections.map((s, si) => (
        <fieldset className="mw-form__section" key={s.title}>
          <legend className="mw-form__legend">{SECTION_TITLES[si] ?? s.title}</legend>
          <div className="mw-form__grid">
            {s.fields.map((f) => {
              const id = `${uid}-${f.key}`;
              const full = f.width === "full" || f.type === "checkbox" || f.type === "textarea";
              return (
                <div className={`mw-field${full ? " mw-field--full" : ""}`} key={f.key}>
                  {f.type === "checkbox" ? (
                    <span className="mw-label" id={`${id}-label`}>
                      {f.label}
                      {!f.required && <span className="mw-label__opt">optional</span>}
                    </span>
                  ) : (
                    <label className="mw-label" htmlFor={id}>
                      {f.label}
                      {!f.required && <span className="mw-label__opt">optional</span>}
                    </label>
                  )}
                  {control(f)}
                  {errors[f.key] && (
                    <span className="mw-field__error" id={errId(f.key)}>
                      <CircleAlert size={16} strokeWidth={1.75} aria-hidden="true" />
                      {errors[f.key]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="mw-form__foot">
        <button type="submit" className="mw-btn mw-btn--primary mw-btn--lg" disabled={busy} aria-disabled={busy || undefined}>
          {busy ? <LoaderCircle className="mw-spin" size={18} strokeWidth={1.75} aria-hidden="true" /> : null}
          <span>{busy ? "Sending…" : submitLabel}</span>
          {!busy && <ArrowRight className="mw-arrow" size={18} strokeWidth={1.75} aria-hidden="true" />}
        </button>
        <p className="mw-form__privacy">
          We use these details only to respond to your enquiry. Read our <Link href={PATHS.privacy}>Privacy policy</Link> and <Link href={PATHS.creditGuide}>Credit Guide</Link>.
          We reply {SITE.responsePromise}.
        </p>
      </div>
    </form>
  );
}
