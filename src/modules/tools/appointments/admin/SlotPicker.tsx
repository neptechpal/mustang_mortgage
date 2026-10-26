"use client";

import { useEffect, useState } from "react";
import { CalendarSearch, Loader2 } from "lucide-react";
import { cn, inputStyles, labelStyles, selectStyles } from "@/components/admin/ui";

/** Date + time inputs; suggests available slots for the chosen date (business timezone). */
export default function SlotPicker({ typeSlug, typeIdField, types, token }: { typeSlug?: string; typeIdField?: boolean; types?: { id: number; slug: string; title: string }[]; token?: string }) {
  const [slug, setSlug] = useState(typeSlug ?? types?.[0]?.slug ?? "");
  const [date, setDate] = useState("");
  const [times, setTimes] = useState<string[] | null>(null);
  const [time, setTime] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!slug || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return setTimes(null);
    const q = new URLSearchParams({ type: slug, from: date, to: date });
    if (token) q.set("token", token);
    setLoading(true);
    fetch(`/api/admin/appointments/slots?${q}`)
      .then((r) => r.json())
      .then((j: { times?: string[] }) => setTimes(j.times ?? []))
      .catch(() => setTimes([]))
      .finally(() => setLoading(false));
  }, [slug, date, token]);

  return (
    <div className={cn("grid gap-4", typeIdField && types ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
      {typeIdField && types && (
        <label className="block">
          <span className={labelStyles}>Appointment type</span>
          <select name="typeId" className={selectStyles} onChange={(e) => setSlug(types.find((t) => String(t.id) === e.target.value)?.slug ?? "")}>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block">
        <span className={labelStyles}>Date</span>
        <input type="date" name="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputStyles} />
      </label>
      <label className="block">
        <span className={labelStyles}>Time (business timezone)</span>
        <input type="time" name="time" required value={time} onChange={(e) => setTime(e.target.value)} step={300} className={cn(inputStyles, "tabular-nums")} />
      </label>
      <div className={cn("text-sm", typeIdField && types ? "sm:col-span-3" : "sm:col-span-2")}>
        {loading ? (
          <p className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-slate-500">
            <Loader2 className="size-4 animate-spin" /> Checking availability…
          </p>
        ) : times ? (
          times.length ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
              <p className="mb-2 text-xs font-medium text-slate-500">Available start times — click to select</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                {times.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setTime(t)}
                    aria-pressed={time === t}
                    className={cn(
                      "rounded-lg border px-2 py-1.5 text-[13px] font-medium tabular-nums transition-colors",
                      time === t ? "border-brand-600 bg-brand-600 text-white shadow-sm" : "border-slate-200 bg-white text-slate-700 hover:border-brand-400 hover:text-brand-800",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-amber-800">No free slots on this date (outside availability or fully booked).</p>
          )
        ) : (
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <CalendarSearch className="size-4 text-slate-400" /> Pick a date to see available start times.
          </p>
        )}
      </div>
    </div>
  );
}
