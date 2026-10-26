"use client";

import { useRef, useState } from "react";
import { LEAD_EMAIL_RE, LEAD_FORM, type LeadField } from "./definition";

// Replica of the Mustang Mini-CRM front-end form engine (forms-front.js) for the
// single-step public lead form 3012: same markup/classes, validation messages
// ("<Label> is required.", "Enter a valid email address."), error summary and
// done panel.

type Errors = Record<string, string>;

function blank(form: HTMLFormElement, f: LeadField) {
  if (f.type === "checkbox") return form.querySelectorAll(`input[name="${f.key}[]"]:checked`).length === 0;
  const el = form.elements.namedItem(f.key) as HTMLInputElement | null;
  return !el || String(el.value).trim() === "";
}

export default function LeadForm({ uid = "mmf1" }: { uid?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [summary, setSummary] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const [count, setCount] = useState(1);
  const sections = LEAD_FORM.sections.filter(s => !s.applicant || s.applicant <= count);
  const validate = (form: HTMLFormElement) => {
    const errs: Errors = {};
    for (const f of sections.flatMap((s) => s.fields)) {
      if (f.required && blank(form, f)) errs[f.key] = `${f.label} is required.`;
      else if (f.type === "email") {
        const v = (form.elements.namedItem(f.key) as HTMLInputElement).value;
        if (v && !LEAD_EMAIL_RE.test(v)) errs[f.key] = "Enter a valid email address.";
      }
    }
    return errs;
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setSummary(Object.values(errs));
      const first = form.querySelector<HTMLElement>(`[name="${Object.keys(errs)[0]}"]`);
      first?.focus();
      return;
    }
    setSummary([]);
    setBusy(true);
    try {
      const res = await fetch(`/api/forms/mmf-${LEAD_FORM.id}`, { method: "POST", body: new FormData(form) });
      const j = (await res.json()) as { success: boolean; data?: { errors?: string[]; fields?: Errors } };
      if (j.success) {
        setDone(true);
        const root = formRef.current?.closest(".mmf");
        if (root) window.scrollTo({ top: root.getBoundingClientRect().top + window.pageYOffset - 20, behavior: "smooth" });
      } else {
        setSummary(j.data?.errors ?? ["Something went wrong. Please try again."]);
        setErrors(j.data?.fields ?? {});
      }
    } catch {
      setSummary(["Connection problem — your answers are saved. Please try again."]);
    }
    setBusy(false);
  };

  const onInput = (key: string) => {
    if (!errors[key] || !formRef.current) return;
    const errs = validate(formRef.current);
    setErrors((prev) => {
      const next = { ...prev };
      if (errs[key]) next[key] = errs[key];
      else delete next[key];
      return next;
    });
  };

  const field = (f: LeadField) => {
    const id = `${uid}_${f.key}`;
    const cls = `mmf-field mmf-w-${f.width} mmf-t-${f.type}${errors[f.key] ? " has-err" : ""}`;
    const label = (
      <label className="mmf-label" htmlFor={f.type === "checkbox" ? undefined : id}>
        {f.label}
        {f.required && <i className="mmf-star">*</i>}
      </label>
    );
    let control: React.ReactNode;
    switch (f.type) {
      case "checkbox":
        control = (
          <div className="mmf-choices">
            {f.options!.map((o) => (
              <label className="mmf-choice" key={o}>
                <input type="checkbox" name={`${f.key}[]`} value={o} onChange={() => onInput(f.key)} />
                <span>{o}</span>
              </label>
            ))}
          </div>
        );
        break;
      case "currency":
        control = (
          <div className="mmf-money">
            <span>$</span>
            <input type="text" inputMode="decimal" id={id} name={f.key} defaultValue="" autoComplete="off" />
          </div>
        );
        break;
      case "select":
        control = (
          <select id={id} name={f.key} defaultValue={f.default || ""} onChange={e => { if (f.key === "applicant_count") setCount(Number(e.target.value)); onInput(f.key); }}>
            <option value="">Select…</option>
            {f.options!.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        );
        break;
      case "textarea":
        control = <textarea id={id} name={f.key} rows={4} />;
        break;
      default:
        control = (
          <input
            type={f.type}
            id={id}
            name={f.key}
            defaultValue=""
            data-req={f.required ? "1" : undefined}
            onInput={() => onInput(f.key)}
          />
        );
    }
    return (
      <div className={cls} data-key={f.key} data-type={f.type} data-required={f.required ? "1" : undefined} key={f.key}>
        {label}
        {control}
        <div className="mmf-err">{errors[f.key] ?? ""}</div>
      </div>
    );
  };

  return (
    <div className="mmf-page">
      <div className="mmf" id={uid} style={{ ["--mmf-accent" as string]: LEAD_FORM.accent }}>
        <form ref={formRef} className="mmf-form" method="post" action="" noValidate autoComplete="on" onSubmit={onSubmit} hidden={done}>
          <div className="mmf-hp" aria-hidden="true">
            <label>
              Leave blank
              <input type="text" name="mmf_website" tabIndex={-1} autoComplete="off" />
            </label>
          </div>
          <div className="mmf-head">
            <h2 className="mmf-title">{LEAD_FORM.title}</h2>
            <div className="mmf-intro">
              <p>{LEAD_FORM.intro}</p>
            </div>
            <div className="mmf-meta">
              <span className="mmf-saved" aria-live="polite"></span>
            </div>
          </div>
          <div className="mmf-steps">
            {sections.map((s, i) => (
              <section className="mmf-step" data-step={i} key={s.title}>
                <h3 className="mmf-sec-title">{s.title}</h3>
                <div className="mmf-grid">{s.fields.map(field)}</div>
              </section>
            ))}
          </div>
          <div className="mmf-summary-err" role="alert" hidden={!summary.length}>
            {summary.length > 0 && (
              <>
                <strong>Please fix the following:</strong>
                <ul>
                  {summary.slice(0, 8).map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <div className="mmf-foot">
            <button type="button" className="mmf-btn mmf-back" hidden>
              &larr; Back
            </button>
            <span className="mmf-spacer"></span>
            <button type="button" className="mmf-btn mmf-primary mmf-next" hidden>
              Next &rarr;
            </button>
            <button type="submit" className="mmf-btn mmf-primary mmf-submit" disabled={busy}>
              {busy ? "Submitting…" : LEAD_FORM.submitLabel}
            </button>
          </div>
        </form>
        <div className="mmf-done" hidden={!done}>
          <div className="mmf-done-ic">✓</div>
          <h3>{LEAD_FORM.success}</h3>
        </div>
      </div>
    </div>
  );
}
