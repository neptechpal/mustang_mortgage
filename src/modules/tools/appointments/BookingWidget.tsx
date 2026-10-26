"use client";

import "@/modules/web/styles/booking.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { PublicType } from "./types";

type Props = {
  types: PublicType[];
  initialType?: string;
  accent?: string;
  businessTz?: string;
  startOfWeek?: number;
  companyName?: string;
  /** Reschedule an existing appointment instead of creating one. */
  reschedule?: { token: string; typeSlug: string; currentStart: string };
};

type Step = "type" | "time" | "details" | "done";
type Done = { token: string; start: string; end: string };

const pad = (n: number) => String(n).padStart(2, "0");
const ymdUtc = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const addDays = (ymd: string, n: number) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return ymdUtc(new Date(Date.UTC(y, m - 1, d + n)));
};
const dowOf = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};
function ymdIn(date: Date, tz: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date).map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}`;
}
function hourIn(date: Date, tz: string) {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(date)) % 24;
}
const fmtTime = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-AU", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso)).replace(/\s/g, " ");
const fmtLong = (iso: string, tz: string) =>
  new Intl.DateTimeFormat("en-AU", { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
const dayLabel = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return {
    dow: new Intl.DateTimeFormat("en-AU", { weekday: "short", timeZone: "UTC" }).format(dt),
    day: d,
    month: new Intl.DateTimeFormat("en-AU", { month: "short", timeZone: "UTC" }).format(dt),
  };
};

const ICONS: Record<string, string> = {
  face: "M12 12c2.7 0 4.8-2.2 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z",
  email: "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z",
  phone: "M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z",
  place: "M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5c-1.4 0-2.5-1.1-2.5-2.5S10.6 6.5 12 6.5s2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5z",
  assignment: "M19 3h-4.2C14.4 1.8 13.3 1 12 1s-2.4.8-2.8 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z",
};

function Icon({ name, className = "" }: { name?: string; className?: string }) {
  const d = ICONS[name ?? ""] ?? ICONS.assignment;
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d={d} />
    </svg>
  );
}

const TZ_CHOICES = [
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Brisbane",
  "Australia/Adelaide",
  "Australia/Darwin",
  "Australia/Perth",
  "Australia/Hobart",
  "Pacific/Auckland",
  "Asia/Kathmandu",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

export default function BookingWidget({
  types,
  initialType,
  accent = "#AE7C28",
  businessTz = "Australia/Sydney",
  startOfWeek = 1,
  companyName = "Mustang Mortgage",
  reschedule,
}: Props) {
  const preselected = types.find((t) => t.slug === (reschedule?.typeSlug ?? initialType)) ?? (types.length === 1 ? types[0] : undefined);
  const [type, setType] = useState<PublicType | undefined>(preselected);
  const [step, setStep] = useState<Step>(preselected ? "time" : "type");
  const [tz, setTz] = useState(businessTz);
  const [weekStart, setWeekStart] = useState<string>("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [day, setDay] = useState<string>("");
  const [slot, setSlot] = useState<string>("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [honeypot, setHoneypot] = useState("");

  // Customer's own timezone ("localized" timezone style in SSA).
  useEffect(() => {
    try {
      const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (local) setTz(local);
    } catch {
      /* keep business tz */
    }
  }, []);

  const tzOptions = useMemo(() => Array.from(new Set([tz, businessTz, ...TZ_CHOICES])), [tz, businessTz]);

  const today = useMemo(() => ymdIn(new Date(), tz), [tz]);
  const firstOfWeek = useCallback((ymd: string) => addDays(ymd, -((dowOf(ymd) - startOfWeek + 7) % 7)), [startOfWeek]);

  const fetchSlots = useCallback(
    async (from: string, to: string) => {
      if (!type) return [] as string[];
      const q = new URLSearchParams({ type: type.slug, from: addDays(from, -1), to: addDays(to, 1) });
      if (reschedule) q.set("token", reschedule.token);
      const res = await fetch(`/api/appointments/slots?${q}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load availability");
      const j = (await res.json()) as { slots: Record<string, string[]> };
      return Object.values(j.slots).flat();
    },
    [type, reschedule],
  );

  // Initial load: jump to the first week with availability (looks ahead ~12 weeks).
  useEffect(() => {
    if (!type || step !== "time" || weekStart) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        let start = firstOfWeek(today);
        for (let i = 0; i < 3; i++) {
          const found = await fetchSlots(start, addDays(start, 27));
          if (cancelled) return;
          if (found.length) {
            const first = ymdIn(new Date(found.sort()[0]), tz);
            const ws = firstOfWeek(first);
            setWeekStart(ws);
            setSlots(found);
            return;
          }
          start = addDays(start, 28);
        }
        setWeekStart(firstOfWeek(today));
        setSlots([]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load availability");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [type, step, weekStart, today, tz, fetchSlots, firstOfWeek]);

  const loadWeek = useCallback(
    async (ws: string) => {
      setWeekStart(ws);
      setLoading(true);
      setError("");
      try {
        setSlots(await fetchSlots(ws, addDays(ws, 6)));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load availability");
      } finally {
        setLoading(false);
      }
    },
    [fetchSlots],
  );

  const weekDays = useMemo(() => (weekStart ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)) : []), [weekStart]);
  const byDay = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const s of slots) {
      const d = ymdIn(new Date(s), tz);
      (m[d] ??= []).push(s);
    }
    for (const k of Object.keys(m)) m[k] = Array.from(new Set(m[k])).sort();
    return m;
  }, [slots, tz]);

  useEffect(() => {
    if (!weekDays.length) return;
    if (day && weekDays.includes(day) && byDay[day]?.length) return;
    setDay(weekDays.find((d) => byDay[d]?.length) ?? "");
  }, [weekDays, byDay, day]);

  const columns = useMemo(() => {
    const list = byDay[day] ?? [];
    const cols = { Morning: [] as string[], Afternoon: [] as string[], Evening: [] as string[] };
    for (const s of list) {
      const h = hourIn(new Date(s), tz);
      (h < 12 ? cols.Morning : h < 17 ? cols.Afternoon : cols.Evening).push(s);
    }
    return cols;
  }, [byDay, day, tz]);

  const chooseType = (t: PublicType) => {
    setType(t);
    setWeekStart("");
    setSlots([]);
    setSlot("");
    setStep("time");
  };

  const pickSlot = (s: string) => {
    setSlot(s);
    setError("");
    if (!reschedule) setStep("details");
  };

  async function submitBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!type || !slot) return;
    setSubmitting(true);
    setError("");
    setFieldErrors({});
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: type.slug, start: slot, fields: values, timezone: tz, website: honeypot }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error || "Could not book the appointment.");
        setFieldErrors(j.fieldErrors || {});
        if (res.status === 409) {
          setStep("time");
          setSlot("");
          void loadWeek(weekStart);
        }
        return;
      }
      setDone({ token: j.token, start: j.start, end: j.end });
      setStep("done");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReschedule() {
    if (!reschedule || !slot) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/appointments/${reschedule.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reschedule", start: slot, timezone: tz }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error || "Could not reschedule.");
        if (res.status === 409) {
          setSlot("");
          void loadWeek(weekStart);
        }
        return;
      }
      window.location.href = `/book-appointment/manage/${j.token}?rescheduled=1`;
    } finally {
      setSubmitting(false);
    }
  }

  const endIso = slot && type ? new Date(new Date(slot).getTime() + type.durationMin * 60000).toISOString() : "";

  // Visual design: public-site tokens (src/modules/web/styles/booking.css, classes mw-bk-*). `accent` is kept for
  // API compatibility with the admin settings but the site palette is used.
  void accent;
  return (
    <div className="mw-bk">
      <div className="mw-bk__card">
        {/* Header */}
        {type && step !== "type" && (
          <div className="mw-bk__head">
            <div>
              <div className="mw-bk__title">{type.title}</div>
              <div className="mw-bk__meta">{type.durationMin} minutes</div>
            </div>
            {types.length > 1 && !reschedule && step !== "done" && (
              <button type="button" className="mw-bk__textbtn" onClick={() => setStep("type")}>
                Change appointment type
              </button>
            )}
          </div>
        )}

        <div className="mw-bk__body">
          {error && (
            <div role="alert" className="mw-bk__error">
              {error}
            </div>
          )}

          {step === "type" && (
            <div>
              <h2 className="mw-bk__h2">Select an appointment type</h2>
              <div className="mw-bk__types">
                {types.map((t) => (
                  <button key={t.slug} type="button" onClick={() => chooseType(t)} className="mw-bk__type">
                    <span className="mw-bk__type-title">{t.title}</span>
                    <span className="mw-bk__meta">{t.durationMin} minutes</span>
                    {t.description && <span className="mw-bk__type-desc">{t.description}</span>}
                  </button>
                ))}
                {!types.length && <p className="mw-bk__muted">No appointment types are available right now.</p>}
              </div>
            </div>
          )}

          {step === "time" && type && (
            <div>
              {reschedule && (
                <p className="mw-bk__note">
                  Currently booked for <b>{fmtLong(reschedule.currentStart, tz)}</b> at <b>{fmtTime(reschedule.currentStart, tz)}</b>. Pick a new time below.
                </p>
              )}
              <div className="mw-bk__bar">
                <h2 className="mw-bk__h2">Select a date</h2>
                <label className="mw-bk__tz">
                  <span>Time zone</span>
                  <select value={tz} onChange={(e) => setTz(e.target.value)} className="mw-select">
                    {tzOptions.map((z) => (
                      <option key={z} value={z}>
                        {z.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mw-bk__week">
                <button
                  type="button"
                  aria-label="Previous week"
                  disabled={!weekStart || weekStart <= firstOfWeek(today) || loading}
                  onClick={() => loadWeek(addDays(weekStart, -7))}
                  className="mw-bk__nav"
                >
                  ‹
                </button>
                <div className="mw-bk__days">
                  {weekDays.map((d) => {
                    const l = dayLabel(d);
                    const has = !!byDay[d]?.length;
                    const active = d === day;
                    return (
                      <button key={d} type="button" disabled={!has} onClick={() => setDay(d)} aria-pressed={active} className={`mw-bk__day${active ? " is-active" : ""}`}>
                        <span className="mw-bk__dow">{l.dow}</span>
                        <span className="mw-bk__dnum">{l.day}</span>
                        <span className="mw-bk__mon">{l.month}</span>
                      </button>
                    );
                  })}
                </div>
                <button type="button" aria-label="Next week" disabled={!weekStart || loading} onClick={() => loadWeek(addDays(weekStart, 7))} className="mw-bk__nav">
                  ›
                </button>
              </div>

              <div className="mw-bk__slots">
                {loading ? (
                  <p className="mw-bk__empty">Loading available times…</p>
                ) : !day ? (
                  <p className="mw-bk__empty">No available times this week. Try the next week.</p>
                ) : (
                  <>
                    <h3 className="mw-bk__h3">{fmtLong(byDay[day][0], tz)}</h3>
                    <div className="mw-bk__cols">
                      {(Object.keys(columns) as (keyof typeof columns)[]).map((col) => (
                        <div key={col}>
                          <div className="mw-bk__colhead">{col}</div>
                          <div className="mw-bk__collist">
                            {columns[col].length ? (
                              columns[col].map((s) => (
                                <button key={s} type="button" onClick={() => pickSlot(s)} aria-pressed={slot === s} className={`mw-bk__slot${slot === s ? " is-active" : ""}`}>
                                  {fmtTime(s, tz)}
                                </button>
                              ))
                            ) : (
                              <span className="mw-bk__muted">–</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {reschedule && slot && (
                <div className="mw-bk__confirm">
                  <span>
                    New time: <b>{fmtLong(slot, tz)}</b> at <b>{fmtTime(slot, tz)}</b>
                  </span>
                  <button type="button" disabled={submitting} onClick={submitReschedule} className="mw-btn mw-btn--primary">
                    <span>{submitting ? "Rescheduling…" : "Confirm new time"}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {step === "details" && type && slot && (
            <form onSubmit={submitBooking} noValidate>
              <div className="mw-bk__note mw-bk__note--row">
                <span>
                  <b>{fmtLong(slot, tz)}</b>, {fmtTime(slot, tz)} – {fmtTime(endIso, tz)} <span className="mw-bk__muted">({tz.replace(/_/g, " ")})</span>
                </span>
                <button type="button" className="mw-bk__textbtn" onClick={() => setStep("time")}>
                  Change time
                </button>
              </div>
              <h2 className="mw-bk__h2">Enter your details</h2>
              <div className="mw-bk__fields">
                {type.fields.map((f) => {
                  const id = `ssa-${f.field.toLowerCase().replace(/\W+/g, "-")}`;
                  const err = fieldErrors[f.field];
                  const common = {
                    id,
                    name: f.field,
                    required: f.required,
                    value: values[f.field] ?? "",
                    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValues((v) => ({ ...v, [f.field]: e.target.value })),
                    className: f.field === "Notes" || f.type === "textarea" ? "mw-textarea" : "mw-input",
                    "aria-invalid": err ? ("true" as const) : undefined,
                  };
                  return (
                    <div key={f.field} className={`mw-field${f.field === "Notes" || f.type === "textarea" ? " mw-bk__wide" : ""}`}>
                      <label htmlFor={id} className="mw-label">
                        <Icon name={f.icon} className="mw-bk__ficon" />
                        {f.field}
                        {f.required ? <span aria-hidden="true"> *</span> : <span className="mw-label__opt">optional</span>}
                      </label>
                      {f.field === "Notes" || f.type === "textarea" ? (
                        <textarea rows={4} {...common} />
                      ) : (
                        <input
                          type={f.field === "Email" ? "email" : f.field === "Phone" ? "tel" : "text"}
                          autoComplete={
                            { Name: "name", Email: "email", Phone: "tel", Address: "street-address", City: "address-level2", State: "address-level1", Zip: "postal-code" }[f.field] ??
                            "off"
                          }
                          list={f.field === "State" ? "ssa-au-states" : undefined}
                          {...common}
                        />
                      )}
                      {err && <p className="mw-field__error">{err}</p>}
                    </div>
                  );
                })}
                <datalist id="ssa-au-states">
                  {["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"].map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
                <input type="text" name="website" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} className="hidden" aria-hidden="true" />
              </div>
              <div className="mw-bk__actions">
                <button type="button" onClick={() => setStep("time")} className="mw-btn mw-btn--quiet">
                  <span>Back</span>
                </button>
                <button type="submit" disabled={submitting} className="mw-btn mw-btn--primary">
                  <span>{submitting ? "Booking…" : "Confirm booking"}</span>
                </button>
              </div>
            </form>
          )}

          {step === "done" && done && type && (
            <div className="mw-bk__done">
              <div className="mw-bk__tick" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <h2 className="mw-bk__h2">Your consultation is booked</h2>
              <p className="mw-bk__muted">A confirmation has been sent to {values.Email || "your email"}.</p>
              <div className="mw-bk__summary">
                <div className="mw-bk__type-title">{type.title}</div>
                <div>
                  {fmtLong(done.start, tz)}, {fmtTime(done.start, tz)} – {fmtTime(done.end, tz)}
                </div>
                <div className="mw-bk__meta">{tz.replace(/_/g, " ")}</div>
                {type.instructions && <p className="mw-bk__instructions">{type.instructions}</p>}
              </div>
              <div className="mw-bk__actions mw-bk__actions--center">
                <a href={`/api/appointments/${done.token}/ics`} className="mw-btn mw-btn--primary mw-btn--sm">
                  <span>Add to calendar (.ics)</span>
                </a>
                <a
                  target="_blank"
                  rel="noopener"
                  className="mw-btn mw-btn--secondary mw-btn--sm"
                  href={`https://calendar.google.com/calendar/render?${new URLSearchParams({
                    action: "TEMPLATE",
                    text: `${type.title} (${companyName})`,
                    dates: `${done.start.replace(/[-:]/g, "").replace(/\.\d{3}/, "")}/${done.end.replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
                  })}`}
                >
                  <span>Google Calendar</span>
                </a>
                <a href={`/book-appointment/manage/${done.token}`} className="mw-bk__textbtn">
                  Change or cancel
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
