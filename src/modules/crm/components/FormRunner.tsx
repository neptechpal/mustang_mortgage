"use client";
// Client runtime for schema forms (port of forms-front.js).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { evalCond, type Field, type Schema, type Values } from "../forms/engine";

export type RunnerCfg = {
  formId: number | "ff";
  caseId?: number;
  token?: string;
  preview?: boolean;
  isPublic?: boolean;
  title?: string;
  endpoint?: string;
  multipart?: boolean; // submit as FormData (payload JSON + any file/hidden inputs rendered as children)
  successMessage?: string;
};

const W: Record<string, string> = { full: "sm:col-span-6", half: "sm:col-span-3", third: "sm:col-span-2" };
const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[var(--acc)] focus:outline-none focus:ring-2 focus:ring-[var(--acc)]/20";

function initialValues(s: Schema, v: Values): Values {
  const out: Values = { ...v };
  for (const sec of s.sections)
    for (const f of sec.fields) {
      if (f.type === "info") continue;
      if (out[f.key] === undefined) out[f.key] = f.type === "checkbox" || f.type === "repeater" ? [] : f.default || "";
    }
  return out;
}

export default function FormRunner({ schema, values: init, cfg, children }: { schema: Schema; values: Values; cfg: RunnerCfg; children?: React.ReactNode }) {
  const st = schema.settings;
  const [vals, setVals] = useState<Values>(() => initialValues(schema, init));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<string[]>([]);
  const [saved, setSaved] = useState(cfg.preview ? "Preview mode" : "");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hp, setHp] = useState("");
  const wizard = !!st.steps && schema.sections.length > 1;
  const [cur, setCur] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const latest = useRef(vals);
  latest.current = vals;
  const rootRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const endpoint = cfg.endpoint || "/api/portal/form-save";

  const vis = useMemo(() => {
    const secs = new Set<number>();
    const fields = new Set<string>();
    const eff: Values = { ...vals };
    schema.sections.forEach((sec, si) => {
      const sv = evalCond(sec.show_if, eff);
      if (sv) secs.add(si);
      for (const f of sec.fields) {
        const fv = sv && evalCond(f.show_if, eff);
        if (fv) fields.add(f.key);
        else eff[f.key] = "";
      }
    });
    return { secs, fields };
  }, [vals, schema]);
  const visibleSteps = schema.sections.map((_, i) => i).filter((i) => vis.secs.has(i));
  const curStep = visibleSteps.includes(cur) ? cur : visibleSteps[0] ?? 0;
  const pos = visibleSteps.indexOf(curStep);
  const last = !wizard || pos === visibleSteps.length - 1;

  const post = useCallback(
    async (mode: "draft" | "submit", silent: boolean, v: Values) => {
      if (cfg.multipart && mode === "submit" && formRef.current) {
        const fd = new FormData(formRef.current);
        fd.set("payload", JSON.stringify({ mode, silent, form_id: cfg.formId, values: v, mmf_website: hp }));
        const r = await fetch(endpoint, { method: "POST", body: fd });
        return (await r.json().catch(() => ({}))) as { success?: boolean; data?: { errors?: string[]; fields?: Record<string, string>; reload?: boolean; done?: boolean } };
      }
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, silent, form_id: cfg.formId, case_id: cfg.caseId || 0, token: cfg.token || "", values: v, mmf_website: hp }),
      });
      return (await r.json().catch(() => ({}))) as { success?: boolean; data?: { errors?: string[]; fields?: Record<string, string>; reload?: boolean; done?: boolean } };
    },
    [endpoint, cfg.formId, cfg.caseId, cfg.token, cfg.multipart, hp],
  );

  const doSave = useCallback(async () => {
    dirty.current = false;
    try {
      const j = await post("draft", true, latest.current);
      setSaved(j.success ? "Draft saved " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Could not save — check your connection");
    } catch {
      setSaved("Could not save — check your connection");
    }
  }, [post]);

  const autosave = useCallback(() => {
    if (cfg.preview || cfg.isPublic) return;
    dirty.current = true;
    setSaved("Saving…");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(doSave, 1300);
  }, [cfg.preview, cfg.isPublic, doSave]);

  useEffect(() => {
    const h = () => {
      if (!dirty.current || cfg.preview || cfg.isPublic) return;
      try {
        const blob = new Blob([JSON.stringify({ mode: "draft", silent: true, form_id: cfg.formId, case_id: cfg.caseId || 0, token: cfg.token || "", values: latest.current })], { type: "application/json" });
        navigator.sendBeacon?.(endpoint, blob);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [cfg, endpoint]);

  function set(key: string, v: unknown) {
    setVals((p) => ({ ...p, [key]: v }));
    if (errs[key]) setErrs((e) => ({ ...e, [key]: "" }));
    autosave();
  }

  function fieldError(f: Field, v: unknown): string {
    const blank = Array.isArray(v) ? v.length === 0 : String(v ?? "").trim() === "";
    const label = f.label || "This field";
    if (f.required && blank) return `${label} is required.`;
    if (blank) return "";
    if (f.type === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v))) return "Enter a valid email address.";
    if (f.type === "number" || f.type === "currency") {
      const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
      if (f.min !== "" && n < f.min) return `Must be at least ${f.min}.`;
      if (f.max !== "" && n > f.max) return `Must be at most ${f.max}.`;
    }
    if (f.type === "repeater" && Array.isArray(v)) {
      for (const row of v as Record<string, string>[]) for (const sf of f.fields || []) if (sf.required && !String(row[sf.key] ?? "").trim()) return `${label}: please complete the highlighted fields.`;
    }
    return "";
  }
  function validateStep(i: number) {
    const out: Record<string, string> = {};
    if (!vis.secs.has(i)) return out;
    for (const f of schema.sections[i].fields) {
      if (f.type === "info" || !vis.fields.has(f.key)) continue;
      const m = fieldError(f, vals[f.key]);
      if (m) out[f.key] = m;
    }
    return out;
  }
  function showErrors(e: Record<string, string>) {
    setErrs((p) => ({ ...p, ...e }));
    setSummary(Object.values(e).filter(Boolean));
    const k = Object.keys(e)[0];
    if (k) setTimeout(() => (rootRef.current?.querySelector(`[data-key="${k}"] input, [data-key="${k}"] select, [data-key="${k}"] textarea`) as HTMLElement | null)?.focus(), 30);
  }
  function go(i: number) {
    setCur(i);
    setSummary([]);
    const top = (rootRef.current?.getBoundingClientRect().top ?? 0) + window.pageYOffset - 20;
    if (top < window.pageYOffset) window.scrollTo({ top, behavior: "smooth" });
  }
  function next() {
    const e = validateStep(curStep);
    if (Object.keys(e).length) return showErrors(e);
    const n = visibleSteps[pos + 1];
    if (n !== undefined) go(n);
  }
  async function submit(ev?: React.FormEvent) {
    ev?.preventDefault();
    if (cfg.preview) { alert("This is a preview — nothing is submitted."); return; }
    let all: Record<string, string> = {};
    let firstBad = -1;
    for (const i of visibleSteps) {
      const e = validateStep(i);
      if (Object.keys(e).length) { if (firstBad < 0) firstBad = i; all = { ...all, ...e }; }
    }
    if (Object.keys(all).length) {
      if (wizard && firstBad > -1) setCur(firstBad);
      return showErrors(all);
    }
    setSummary([]);
    setBusy(true);
    if (timer.current) clearTimeout(timer.current);
    try {
      const j = await post("submit", false, vals);
      if (j.success) {
        dirty.current = false;
        if (j.data?.reload) {
          const u = new URL(window.location.href);
          u.searchParams.delete("edit");
          window.location.href = u.toString();
          return;
        }
        setDone(true);
      } else {
        setSummary(j.data?.errors || ["Something went wrong. Please try again."]);
        if (j.data?.fields) setErrs(j.data.fields);
      }
    } catch {
      setSummary(["Connection problem — your answers are saved. Please try again."]);
    } finally {
      setBusy(false);
    }
  }
  async function saveDraft() {
    if (cfg.preview) return;
    setSaved("Saving…");
    try {
      const j = await post("draft", false, vals);
      dirty.current = false;
      setSaved(j.success ? "Draft saved ✓" : "Could not save");
    } catch {
      setSaved("Could not save");
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full text-2xl text-white" style={{ background: st.accent }}>✓</div>
        <h3 className="text-lg font-semibold">{cfg.successMessage || st.success_msg}</h3>
      </div>
    );
  }

  const renderInput = (f: Field, value: unknown, onChange: (v: unknown) => void, id: string) => {
    const v = Array.isArray(value) ? "" : String(value ?? "");
    switch (f.type) {
      case "textarea":
        return <textarea id={id} rows={4} className={inputCls} placeholder={f.placeholder} value={v} onChange={(e) => onChange(e.target.value)} />;
      case "select":
        return (
          <select id={id} className={inputCls} value={v} onChange={(e) => onChange(e.target.value)}>
            <option value="">Select…</option>
            {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        );
      case "radio":
      case "yesno": {
        const opts = f.type === "yesno" ? ["Yes", "No"] : f.options;
        return (
          <div className="flex flex-wrap gap-2" role="radiogroup">
            {opts.map((o) => (
              <label key={o} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${v === o ? "border-[var(--acc)] bg-[var(--acc)]/5" : "border-slate-300"}`}>
                <input type="radio" name={id} value={o} checked={v === o} onChange={() => onChange(o)} /> <span>{o}</span>
              </label>
            ))}
          </div>
        );
      }
      case "checkbox": {
        const sel = Array.isArray(value) ? (value as string[]) : [];
        return (
          <div className="flex flex-wrap gap-2">
            {f.options.map((o) => (
              <label key={o} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${sel.includes(o) ? "border-[var(--acc)] bg-[var(--acc)]/5" : "border-slate-300"}`}>
                <input type="checkbox" checked={sel.includes(o)} onChange={(e) => onChange(e.target.checked ? [...sel, o] : sel.filter((x) => x !== o))} /> <span>{o}</span>
              </label>
            ))}
          </div>
        );
      }
      case "currency":
        return (
          <div className="flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-[var(--acc)]">
            <span className="pl-3 text-slate-500">$</span>
            <input id={id} type="text" inputMode="decimal" autoComplete="off" className="w-full rounded-lg px-2 py-2 text-sm focus:outline-none" placeholder={f.placeholder} value={v} onChange={(e) => onChange(e.target.value)} />
          </div>
        );
      case "number":
        return <input id={id} type="number" step="any" inputMode="decimal" min={f.min === "" ? undefined : f.min} max={f.max === "" ? undefined : f.max} className={inputCls} placeholder={f.placeholder} value={v} onChange={(e) => onChange(e.target.value)} />;
      case "signature":
        return <input id={id} type="text" autoComplete="off" className={`${inputCls} font-[cursive] text-xl italic`} placeholder="Type your full name to sign" value={v} onChange={(e) => onChange(e.target.value)} />;
      default: {
        const t = ["email", "tel", "date"].includes(f.type) ? f.type : "text";
        return <input id={id} type={t} className={inputCls} placeholder={f.placeholder} value={v} onChange={(e) => onChange(e.target.value)} />;
      }
    }
  };

  const renderField = (f: Field) => {
    if (!vis.fields.has(f.key)) return null;
    if (f.type === "info") {
      return (
        <div key={f.key} data-key={f.key} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700 sm:col-span-6">
          {f.label && <strong className="block">{f.label}</strong>}
          {f.content && <div className="mt-1 [&_p]:mb-2" dangerouslySetInnerHTML={{ __html: f.content }} />}
        </div>
      );
    }
    const id = `mmf_${cfg.formId}_${f.key}`;
    const err = errs[f.key];
    const label = (
      <label htmlFor={["radio", "yesno", "checkbox", "repeater"].includes(f.type) ? undefined : id} className="mb-1 block text-sm font-medium text-slate-700">
        {f.label || f.key}
        {f.required ? <i className="ml-0.5 not-italic text-red-600">*</i> : null}
      </label>
    );
    if (f.type === "repeater") {
      const rows = (Array.isArray(vals[f.key]) ? vals[f.key] : []) as Record<string, string>[];
      const max = f.max_rows || 10;
      return (
        <div key={f.key} data-key={f.key} className="sm:col-span-6">
          {label}
          {f.help && <div className="mb-2 text-xs text-slate-500">{f.help}</div>}
          <div className="space-y-3">
            {rows.map((row, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span>Item {i + 1}</span>
                  <button type="button" aria-label="Remove" className="text-lg leading-none text-slate-400 hover:text-red-600" onClick={() => set(f.key, rows.filter((_, j) => j !== i))}>×</button>
                </div>
                <div className="grid gap-3 sm:grid-cols-6">
                  {(f.fields || []).map((sf) => {
                    const bad = err && sf.required && !String(row[sf.key] ?? "").trim();
                    return (
                      <div key={sf.key} className={sf.width === "third" ? "sm:col-span-2" : "sm:col-span-3"}>
                        <label className="mb-1 block text-xs font-medium text-slate-600">{sf.label || sf.key}{sf.required ? <i className="ml-0.5 not-italic text-red-600">*</i> : null}</label>
                        {renderInput(sf, row[sf.key] ?? "", (nv) => set(f.key, rows.map((r, j) => (j === i ? { ...r, [sf.key]: String(nv) } : r))), `${id}_${i}_${sf.key}`)}
                        {bad && <div className="mt-1 text-xs text-red-600">Required</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <button type="button" disabled={rows.length >= max} className="mt-2 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:border-[var(--acc)] disabled:opacity-50" onClick={() => set(f.key, [...rows, {}])}>
            + {f.add_label || "Add another"}
          </button>
          {err && <div className="mt-1 text-xs text-red-600">{err}</div>}
        </div>
      );
    }
    const sigTs = f.type === "signature" ? String(vals[f.key + "__ts"] ?? "") : "";
    return (
      <div key={f.key} data-key={f.key} className={`${W[f.width] || W.full} ${err ? "[&_input]:border-red-400 [&_select]:border-red-400 [&_textarea]:border-red-400" : ""}`}>
        {label}
        {renderInput(f, vals[f.key], (nv) => {
          set(f.key, nv);
          if (f.type === "signature") setVals((p) => ({ ...p, [f.key]: nv, [f.key + "__ts"]: String(nv).trim() ? new Date().toLocaleString("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "" }));
        }, id)}
        {f.type === "signature" && sigTs && <div className="mt-1 text-xs text-slate-500">Signed {sigTs}</div>}
        {f.help && <div className="mt-1 text-xs text-slate-500">{f.help}</div>}
        {err && <div className="mt-1 text-xs text-red-600">{err}</div>}
      </div>
    );
  };

  const tone = (t: string) => (t === "a1" ? "border-l-4 border-l-indigo-500" : t === "a2" ? "border-l-4 border-l-amber-500" : "");

  return (
    <div ref={rootRef} className="mmf" style={{ ["--acc" as string]: st.accent }}>
      <form ref={formRef} onSubmit={submit} noValidate autoComplete="on" onKeyDown={(e) => {
        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") { e.preventDefault(); if (wizard && !last) next(); }
      }}>
        {cfg.isPublic && (
          <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
            <label>Leave blank<input type="text" tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} /></label>
          </div>
        )}
        <div className="mb-4">
          {cfg.title && <h2 className="text-xl font-bold text-slate-900">{cfg.title}</h2>}
          {st.intro && <div className="mt-1 text-sm text-slate-600 whitespace-pre-line">{st.intro.replace(/<[^>]*>/g, "")}</div>}
          <div className="mt-1 h-4 text-xs text-slate-500" aria-live="polite">{saved}</div>
        </div>
        {wizard && (
          <>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full transition-all" style={{ width: `${Math.round(((pos + 1) / Math.max(visibleSteps.length, 1)) * 100)}%`, background: st.accent }} />
            </div>
            <ol className="mb-5 flex gap-2 overflow-x-auto pb-1">
              {schema.sections.map((s, i) =>
                vis.secs.has(i) ? (
                  <li key={s.id}>
                    <button type="button" className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1 text-xs ${i === curStep ? "border-[var(--acc)] bg-[var(--acc)] text-white" : i < curStep ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600"}`}
                      onClick={() => {
                        if (i > curStep) {
                          const bad = visibleSteps.filter((k) => k >= curStep && k < i).some((k) => Object.keys(validateStep(k)).length);
                          if (bad) { setSummary(["Please complete this step before moving ahead."]); return; }
                        }
                        go(i);
                      }}>
                      <span className="font-semibold">{visibleSteps.indexOf(i) + 1}</span>
                      <span>{s.title}</span>
                    </button>
                  </li>
                ) : null,
              )}
            </ol>
          </>
        )}
        {schema.sections.map((s, i) => {
          if (!vis.secs.has(i)) return null;
          if (wizard && i !== curStep) return null;
          return (
            <section key={s.id} className={`mb-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 ${tone(s.tone)}`}>
              {s.title && <h3 className="mb-1 text-base font-semibold text-slate-900">{s.title}</h3>}
              {s.description && <p className="mb-3 text-sm text-slate-500">{s.description}</p>}
              <div className="grid gap-4 sm:grid-cols-6">{s.fields.map(renderField)}</div>
            </section>
          );
        })}
        {children}
        {summary.length > 0 && (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <strong>Please fix the following:</strong>
            <ul className="ml-5 list-disc">{summary.slice(0, 8).map((m, i) => <li key={i}>{m}</li>)}</ul>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {wizard && pos > 0 && <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm" onClick={() => go(visibleSteps[pos - 1])}>← Back</button>}
          <span className="flex-1" />
          {!cfg.preview && !cfg.isPublic && <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm" onClick={saveDraft}>Save draft</button>}
          {!last && <button type="button" className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: st.accent }} onClick={next}>Next →</button>}
          {last && <button type="submit" disabled={busy} className="rounded-lg px-5 py-2 text-sm font-semibold text-white disabled:opacity-60" style={{ background: st.accent }}>{busy ? "Submitting…" : st.submit_label}</button>}
        </div>
      </form>
    </div>
  );
}
