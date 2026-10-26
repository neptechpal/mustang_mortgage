"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Coins, Landmark, Sparkles, Target, TrendingUp, Trophy } from "lucide-react";
import { Badge, Button, cn, StatCard, tableCls, type Tone } from "@/components/admin/ui";

export type SumRow = { id: number; title: string; loan: number; amt: number };
const aud2 = (n: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
const A2 = (n: number) => "A$" + n.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const A0 = (n: number) => "A$" + Math.round(n).toLocaleString("en-AU");
const TICKER = [
  "High-value cases first. Momentum beats motivation.",
  "What gets measured gets improved.",
  "Follow-ups uncover hidden approvals.",
  "Celebrate small wins — they compound.",
  "Deep work hour: protect it like a meeting.",
];
const CARD = "rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

export default function CasesSummary({ rows, target: rawTarget, targetForm }: { rows: SumRow[]; target: number; targetForm?: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try {
      setOpen(localStorage.getItem("mmc_cases_sum_open") !== "0");
    } catch {}
  }, []);
  const toggle = () => {
    setOpen((o) => {
      try {
        localStorage.setItem("mmc_cases_sum_open", o ? "0" : "1");
      } catch {}
      return !o;
    });
  };
  const tLoan = rows.reduce((s, r) => s + Math.max(0, r.loan), 0);
  const tComm = rows.reduce((s, r) => s + Math.max(0, r.amt), 0);
  const avg = rows.length ? tComm / rows.length : 0;
  const top = rows[0];
  const auto = rawTarget <= 0;
  const target = auto ? Math.ceil(Math.max(1, tComm) / 5000 + 1) * 5000 : rawTarget;
  const progress = Math.min(1, Math.max(0, tComm / target));
  const pct = Math.round(progress * 100);
  const delta = target - tComm;
  const word = delta >= 0 ? "to go" : "ahead";
  const remain = Math.round((Math.max(0, delta) / target) * 100);
  const deltaTone: Tone = delta < 0 ? "success" : remain > 50 ? "danger" : remain > 15 ? "warning" : "violet";
  const maxLoan = Math.max(1, ...rows.map((r) => r.loan));
  const maxAmt = Math.max(1, ...rows.map((r) => r.amt));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total loan" value={aud2(tLoan)} hint={`${rows.length} cases`} icon={<Landmark />} tone="info" />
        <StatCard label="Total commission" value={aud2(tComm)} hint="Commission to MM" icon={<Coins />} tone="brand" />
        <StatCard label="Avg / case" value={aud2(avg)} hint="Across cases in this view" icon={<TrendingUp />} tone="success" />
        <StatCard
          label="Top case"
          value={top ? aud2(top.amt) : "—"}
          hint={
            top ? (
              <Link className="line-clamp-1 font-medium text-brand-700 hover:underline" href={`/admin/cases/${top.id}`}>
                {top.title || "(no title)"}
              </Link>
            ) : (
              "No cases yet"
            )
          }
          icon={<Trophy />}
          tone="violet"
        />
      </div>

      <div className={cn("grid gap-6", targetForm ? "lg:grid-cols-[minmax(0,1fr)_340px]" : "")}>
        <section className={cn(CARD, "flex flex-col overflow-hidden")}>
          <div className="flex-1 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500">
                  <Target className="size-4 text-brand-600" />
                  {auto ? "Stretch Goal (auto)" : "Target"}
                </p>
                <p className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">{pct}%</span>
                  <span className="text-sm text-slate-500">
                    of <span className="font-semibold text-slate-800 tabular-nums">{A2(target)}</span>
                  </span>
                </p>
              </div>
              <Badge tone={deltaTone} dot className="text-[13px]">
                <span className="tabular-nums">{A0(Math.abs(delta))}</span> {word}
              </Badge>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200/70">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-[width] duration-700" style={{ width: `${pct}%` }} />
            </div>
            <dl className="mt-5 grid divide-y divide-slate-100 rounded-lg border border-slate-100 bg-slate-50/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:text-center">
              {[
                ["Earned", A2(tComm)],
                [delta >= 0 ? "Remaining" : "Ahead by", A2(Math.abs(delta))],
                [auto ? "Stretch goal" : "Target", A2(target)],
              ].map(([k, v]) => (
                <div key={k} className="flex min-w-0 items-center justify-between gap-2 px-3 py-2 sm:block sm:px-2 sm:py-2.5">
                  <dt className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{k}</dt>
                  <dd className="text-sm font-semibold text-slate-900 tabular-nums sm:mt-0.5 sm:truncate">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="mmc-ticker relative overflow-hidden whitespace-nowrap border-t border-ink-700 bg-ink-900 py-2 text-[13px] text-slate-200">
            <div className="mmc-track inline-block">
              {[...TICKER, ...TICKER].map((t, i) => (
                <span key={i} className="inline-flex items-center gap-2 px-6">
                  <Sparkles className="size-3.5 text-brand-300" /> {t}
                </span>
              ))}
            </div>
            <style>{`.mmc-track{animation:mmcTick 24s linear infinite}@keyframes mmcTick{from{transform:translateX(0)}to{transform:translateX(-50%)}}@media (prefers-reduced-motion:reduce){.mmc-track{animation:none}}`}</style>
          </div>
        </section>
        {targetForm}
      </div>

      <section className={CARD}>
        <header className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-[15px] font-semibold text-slate-900">Cases Summary</h2>
          <Badge>{rows.length} cases</Badge>
          <Button variant="ghost" size="sm" className="ml-auto" aria-expanded={open} onClick={toggle}>
            {open ? <ChevronUp /> : <ChevronDown />}
            {open ? "Collapse" : "Expand"}
          </Button>
        </header>
        {open && (
          <div className="overflow-x-auto">
            <table className={cn(tableCls.table, "min-w-[600px]")}>
              <thead className={tableCls.thead}>
                <tr>
                  <th className={tableCls.th}>Case</th>
                  <th className={cn(tableCls.th, "w-[30%] text-right")}>Loan Amount</th>
                  <th className={cn(tableCls.th, "w-[30%] text-right")}>Commission to MM</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-10 text-center text-sm text-slate-500">
                      No cases in this view.
                    </td>
                  </tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} className={tableCls.tr}>
                    <td className={cn(tableCls.td, "min-w-[220px] py-2.5")}>
                      <Link href={`/admin/cases/${r.id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">
                        {r.title || "(no title)"}
                      </Link>
                    </td>
                    <td className={cn(tableCls.td, "py-2.5 text-right tabular-nums")}>
                      <DataBar value={r.loan} max={maxLoan} label={r.loan > 0 ? aud2(r.loan) : "—"} bar="bg-sky-400/70" />
                    </td>
                    <td className={cn(tableCls.td, "py-2.5 text-right font-medium tabular-nums text-slate-900")}>
                      <DataBar value={r.amt} max={maxAmt} label={r.amt > 0 ? aud2(r.amt) : "—"} bar="bg-brand-500/80" />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50/80 font-semibold text-slate-900">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right tabular-nums">{aud2(tLoan)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{aud2(tComm)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function DataBar({ value, max, label, bar }: { value: number; max: number; label: string; bar: string }) {
  return (
    <div className="ml-auto flex max-w-[240px] flex-col items-end gap-1.5">
      <span>{label}</span>
      {value > 0 && (
        <span aria-hidden className="block h-1 w-full overflow-hidden rounded-full bg-slate-100">
          <span className={cn("ml-auto block h-full rounded-full", bar)} style={{ width: `${Math.max(2, Math.round((value / max) * 100))}%` }} />
        </span>
      )}
    </div>
  );
}
