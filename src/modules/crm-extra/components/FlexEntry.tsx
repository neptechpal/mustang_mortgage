"use client";
// Flex Entry workspace (flex.js + flex-helper.js port).
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3, BookMarked, Briefcase, Check, ChevronsDown, CircleCheckBig, ClipboardList, Copy, CreditCard, Home, Landmark, Lightbulb, Lock, LockOpen,
  PenLine, Plus, Receipt, RotateCcw, Search, Sparkles, Target, TextCursorInput, Trash2, Users, Wallet, type LucideIcon,
} from "lucide-react";
import { Badge, buttonStyles, checkboxStyles, cn, inputStyles, labelStyles, selectStyles, tableCls } from "@/components/admin/ui";
import { copyText, useToast } from "../ui/client";
import { flexOverride, flexText, flexDone, flexFinish, flexSnippets, portalToggle } from "../actions/flex";
import type { FlexSection, FlexRow } from "../lib/flex";

const FACT: Record<string, number> = { weekly: 52, fortnightly: 26, monthly: 12, annual: 1 };
const fmt = (n: number) => Math.round(n * 100) / 100;
type Data = {
  caseId: number;
  name: string;
  stage: string;
  ffDone: boolean;
  portalClosed: boolean;
  sections: FlexSection[];
  done: Record<string, boolean>;
  textBoxes: { id: string; title: string; gen: string; text: string }[];
  prefill: Record<string, string>;
  living: { groups: Record<string, string>; categories: Record<string, string>; table: Record<string, Record<string, number>>; household: string };
  all: { label: string; value: string }[];
  snippets: { t: string; x: string }[];
};
const SEC_ICON: Record<string, LucideIcon> = {
  applicants: Users, addresses: Home, employment: Briefcase, income: Wallet, expenses: Receipt, assets: Landmark, liabilities: CreditCard,
  loan: Target, text: PenLine, helper: Sparkles, living: BarChart3, all: Search,
};
const iconBtn =
  "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 [&_svg]:size-4";
const COUNTED = ["applicants", "addresses", "employment", "income", "expenses", "assets", "liabilities", "loan", "text"];

export default function FlexEntry({ data }: { data: Data }) {
  const { show, node } = useToast();
  const [freq, setFreq] = useState("monthly");
  useEffect(() => {
    try {
      const f = localStorage.getItem("mmflexFreq");
      if (f && FACT[f]) setFreq(f);
    } catch {}
  }, []);
  const [vals, setVals] = useState<Record<string, { value: string; ov: boolean; orig: string }>>(() => {
    const o: Record<string, { value: string; ov: boolean; orig: string }> = {};
    for (const s of data.sections) for (const g of s.groups) for (const r of g.rows) o[r.id] = { value: r.value, ov: !!r.ov, orig: r.orig ?? r.value };
    return o;
  });
  const [done, setDone] = useState<Record<string, boolean>>(data.done);
  const [portalClosed, setPortalClosed] = useState(data.portalClosed);
  const [texts, setTexts] = useState<Record<string, string>>(Object.fromEntries(data.textBoxes.map((t) => [t.id, t.text])));
  const [snips, setSnips] = useState(data.snippets);
  const lastTa = useRef<string>("objective");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [cur, setCur] = useState<{ sec: string; idx: number }>({ sec: "", idx: -1 });
  const [allQ, setAllQ] = useState("");

  const debounce = (k: string, ms: number, fn: () => void) => {
    clearTimeout(timers.current[k]);
    timers.current[k] = setTimeout(fn, ms);
  };
  const countDone = COUNTED.filter((s) => done[s]).length;

  /** Display value for a row given the chosen frequency. */
  const display = (r: FlexRow) => {
    const v = vals[r.id]?.value ?? "";
    if (r.kind === "expense") {
      const m = parseFloat(v);
      return isNaN(m) ? "" : String(fmt((m * 12) / FACT[freq]));
    }
    if (r.kind === "sel") {
      const a = parseFloat(r.annualbase ?? "");
      return isNaN(a) ? "" : String(fmt(a / FACT[freq]));
    }
    return v;
  };
  const doCopy = async (v: string) => {
    try {
      await copyText(v);
      show(v === "" ? "Copied (empty)" : "Copied: " + (v.length > 46 ? v.slice(0, 46) + "…" : v));
    } catch {
      show("Copy failed — select and press Ctrl+C", true);
    }
  };
  const onEdit = (r: FlexRow, shown: string) => {
    let stored = shown;
    if (r.kind === "expense") {
      const n = parseFloat(shown);
      stored = isNaN(n) ? "" : String(fmt((n * FACT[freq]) / 12));
    }
    setVals((o) => ({ ...o, [r.id]: { ...o[r.id], value: stored, ov: true } }));
    debounce("ov:" + r.id, 500, () => flexOverride(data.caseId, r.id, stored));
  };
  const reset = (r: FlexRow) => {
    setVals((o) => ({ ...o, [r.id]: { value: o[r.id].orig, ov: false, orig: o[r.id].orig } }));
    flexOverride(data.caseId, r.id, null);
    show("Reset to Fact Find value");
  };
  const sectionRows = (s: FlexSection) => s.groups.flatMap((g) => g.rows);
  const copyNext = () => {
    const sec = data.sections.find((s) => s.id === cur.sec && s.groups.length) ?? data.sections[0];
    const rows = sectionRows(sec);
    for (let i = (sec.id === cur.sec ? cur.idx : -1) + 1; i < rows.length; i++) {
      const v = display(rows[i]);
      if (v !== "") {
        setCur({ sec: sec.id, idx: i });
        doCopy(v);
        document.getElementById(`row-${rows[i].id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
        return;
      }
    }
    show("End of section — mark it as entered ✓");
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.altKey && e.key === "ArrowDown") {
        e.preventDefault();
        copyNext();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });

  const toggleDone = async (sec: string, on: boolean) => {
    setDone((d) => ({ ...d, [sec]: on }));
    const r = await flexDone(data.caseId, sec, on);
    if (r.portal_closed) {
      setPortalClosed(true);
      show("All sections entered — client portal closed");
    }
  };
  const saveSnips = (next: { t: string; x: string }[]) => {
    setSnips(next);
    debounce("snips", 700, () => flexSnippets(next));
  };

  const pct = Math.round((100 * countDone) / 9);

  return (
    <div className="space-y-4" id="mmcrm_flex">
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <ClipboardList className="size-[18px]" />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-slate-900">{data.name}</h2>
            <p className="text-xs text-slate-500">Flex Entry workspace — copy Fact Find answers straight into Flex.</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
            <Badge>{data.stage}</Badge>
            {data.ffDone ? (
              <Badge tone="success" dot>
                Fact Find submitted
              </Badge>
            ) : (
              <Badge tone="warning" dot>
                Fact Find not submitted — showing saved draft
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="z-10 -mt-1 flex md:sticky md:top-16 flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-slate-200/80 bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur">
          <label className="flex items-center gap-2 text-[13px] font-medium text-slate-600">
            Frequency
            <select
              className={cn(selectStyles, "w-auto !py-1.5")}
              value={freq}
              onChange={(e) => {
                setFreq(e.target.value);
                try {
                  localStorage.setItem("mmflexFreq", e.target.value);
                } catch {}
              }}
            >
              <option value="monthly">Monthly</option>
              <option value="fortnightly">Fortnightly</option>
              <option value="weekly">Weekly</option>
              <option value="annual">Annual</option>
            </select>
          </label>
          <div className="flex items-center gap-2.5 text-[13px] text-slate-600">
            <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/70 ring-inset">
              <div className={cn("h-full rounded-full transition-all", countDone >= 9 ? "bg-emerald-500" : "bg-brand-500")} style={{ width: `${pct}%` }} />
            </div>
            <span className="tabular-nums">
              <b className="font-semibold text-slate-900">{countDone}/9</b> sections entered
            </span>
          </div>
          <button className={buttonStyles({ variant: "secondary", size: "sm" })} title="Copy the next value in the current section (Alt+↓)" onClick={copyNext}>
            <ChevronsDown /> Copy next
            <kbd className="ml-0.5 hidden rounded border border-slate-200 bg-slate-50 px-1 font-sans text-[10px] font-medium text-slate-500 sm:inline">Alt+↓</kbd>
          </button>
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <Badge tone={portalClosed ? "warning" : "success"} dot>
              {portalClosed ? "Client portal closed" : "Client portal open"}
            </Badge>
            <button
              className={buttonStyles({ variant: "secondary", size: "sm" })}
              onClick={async () => {
                if (!portalClosed && !confirm("Close the client portal? Their link will stop working until you re-open it.")) return;
                await portalToggle(data.caseId, portalClosed);
                setPortalClosed(!portalClosed);
                show(portalClosed ? "Client portal re-opened" : "Client portal closed");
              }}
            >
              {portalClosed ? <LockOpen /> : <Lock />}
              {portalClosed ? "Re-open" : "Close portal"}
            </button>
            <button
              className={buttonStyles({ variant: "primary", size: "sm" })}
              title="Tick every section and close the client's portal"
              onClick={async () => {
                if (!confirm("Mark everything as entered in Flex and close the client’s portal link? You can re-open it any time.")) return;
                await flexFinish(data.caseId);
                setDone(Object.fromEntries(COUNTED.map((s) => [s, true])));
                setPortalClosed(true);
                show("All done — client portal closed");
              }}
            >
              <CircleCheckBig /> Finished in Flex
            </button>
          </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="hidden lg:block">
          <div className="sticky top-[136px] space-y-3">
            <div className="rounded-xl border border-slate-200/80 bg-white p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              {data.sections.map((s) => {
                const Ic = SEC_ICON[s.id];
                return (
                  <a
                    key={s.id}
                    href={`#sec-${s.id}`}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors hover:bg-slate-100",
                      cur.sec === s.id ? "bg-brand-50 text-brand-800" : done[s.id] ? "text-emerald-700" : "text-slate-600 hover:text-slate-900",
                    )}
                  >
                    {Ic ? <Ic className="size-4 shrink-0 opacity-80" /> : <span>{s.icon}</span>}
                    <span className="min-w-0 flex-1 truncate">{s.title}</span>
                    {done[s.id] && <Check className="size-3.5 shrink-0 text-emerald-600" />}
                  </a>
                );
              })}
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
              <p className="mb-1 flex items-center gap-1.5 font-semibold text-slate-800">
                <Lightbulb className="size-3.5 text-brand-600" /> Tips
              </p>
              Click a value to select &amp; copy it. Edit any value and it’s saved for this case. Alt+↓ copies the next value.
            </div>
          </div>
        </nav>
        <div className="min-w-0 space-y-5">
          {data.sections.map((s) => {
            const Ic = SEC_ICON[s.id];
            return (
              <section
                key={s.id}
                id={`sec-${s.id}`}
                className={cn(
                  "scroll-mt-36 rounded-xl border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow",
                  cur.sec === s.id ? "border-brand-300 ring-3 ring-brand-500/10" : "border-slate-200/80",
                )}
              >
                <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-100 px-5 py-3.5">
                  <span
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset [&_svg]:size-4",
                      done[s.id] ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-50 text-slate-600 ring-slate-200",
                    )}
                  >
                    {Ic ? <Ic /> : <span className="text-sm">{s.icon}</span>}
                  </span>
                  <h3 className="min-w-fit flex-1 text-[15px] font-semibold text-slate-900">{s.title}</h3>
                  <div className="flex items-center gap-2">
                    {!s.special && (
                      <button
                        className={buttonStyles({ variant: "secondary", size: "xs" })}
                        onClick={() => {
                          const rows = sectionRows(s);
                          copyText(rows.map((r) => `${r.label}\t${display(r)}`).join("\n")).then(() => show(`Copied ${rows.length} rows (label ⇥ value)`));
                        }}
                      >
                        <Copy /> Copy all
                      </button>
                    )}
                    {COUNTED.includes(s.id) && (
                      <label
                        className={cn(
                          "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition-colors",
                          done[s.id] ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50",
                        )}
                      >
                        <input type="checkbox" className={checkboxStyles} checked={!!done[s.id]} onChange={(e) => toggleDone(s.id, e.target.checked)} /> Entered in Flex
                      </label>
                    )}
                  </div>
                </header>
                <div className="space-y-4 p-5">
                  {s.note && <p className="-mt-1 text-xs text-slate-500">{s.note}</p>}
                  {s.groups.map((g) => {
                    const total = g.total ? g.rows.reduce((t, r) => t + (parseFloat(display(r)) || 0), 0) : 0;
                    return (
                      <div key={g.title}>
                        <h4 className="mb-1.5 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">{g.title}</h4>
                        <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
                          {g.rows.map((r) => {
                            const v = display(r);
                            const st = vals[r.id];
                            const isCur = cur.sec === s.id && sectionRows(s).indexOf(r) === cur.idx;
                            return (
                              <div
                                key={r.id}
                                id={`row-${r.id}`}
                                className={cn(
                                  "flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 sm:flex-nowrap",
                                  isCur ? "bg-brand-50/70" : st?.ov ? "bg-sky-50/60" : "",
                                )}
                              >
                                <span className="w-full shrink-0 text-[13px] text-slate-600 sm:w-56">
                                  {r.label}
                                  {st?.ov && <span className="ml-1.5 text-[10px] font-semibold tracking-wide text-sky-700 uppercase">edited</span>}
                                </span>
                                {r.kind === "long" ? (
                                  <textarea
                                    rows={2}
                                    spellCheck={false}
                                    className={cn(inputStyles, "min-w-0 flex-1 !py-1.5", v === "" && "bg-slate-50")}
                                    value={v}
                                    onFocus={(e) => (e.target.select(), setCur({ sec: s.id, idx: sectionRows(s).indexOf(r) }))}
                                    onChange={(e) => onEdit(r, e.target.value)}
                                  />
                                ) : (
                                  <input
                                    spellCheck={false}
                                    autoComplete="off"
                                    readOnly={r.kind === "sel"}
                                    className={cn(inputStyles, "min-w-0 flex-1 !py-1.5", v === "" && "bg-slate-50")}
                                    value={v}
                                    onFocus={(e) => (e.target.select(), setCur({ sec: s.id, idx: sectionRows(s).indexOf(r) }))}
                                    onClick={() => doCopy(v)}
                                    onChange={(e) => onEdit(r, e.target.value)}
                                  />
                                )}
                                <button className={iconBtn} title="Copy" aria-label="Copy" onClick={() => (setCur({ sec: s.id, idx: sectionRows(s).indexOf(r) }), doCopy(v))}>
                                  <Copy />
                                </button>
                                <button className={cn(iconBtn, st?.ov ? "" : "invisible max-sm:hidden")} title="Reset to Fact Find value" aria-label="Reset to Fact Find value" onClick={() => reset(r)}>
                                  <RotateCcw />
                                </button>
                              </div>
                            );
                          })}
                          {g.total && (
                            <div className="flex flex-wrap items-center gap-2 bg-slate-50 px-3 py-2.5 text-sm">
                              <span className="font-semibold text-slate-700 sm:w-56">Total</span>
                              <strong className="text-slate-900 tabular-nums">
                                {"$" + total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " " + freq}
                              </strong>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {s.special === "text" && (
                    <div className="space-y-4">
                      {data.textBoxes.map((t) => (
                        <div key={t.id}>
                          <div className="mb-1.5 flex flex-wrap items-center gap-2">
                            <b className="text-[13px] font-semibold text-slate-800">{t.title}</b>
                            {t.gen && (
                              <button
                                className={buttonStyles({ variant: "ghost", size: "xs", className: "ml-auto" })}
                                onClick={() => {
                                  setTexts((o) => ({ ...o, [t.id]: t.gen }));
                                  flexText(data.caseId, t.id, t.gen);
                                }}
                              >
                                <RotateCcw /> Regenerate
                              </button>
                            )}
                            <button
                              className={buttonStyles({ variant: "primary", size: "xs", className: t.gen ? "" : "ml-auto" })}
                              onClick={() => copyText(texts[t.id] ?? "").then(() => show("Copied text"))}
                            >
                              <Copy /> Copy
                            </button>
                          </div>
                          <textarea
                            rows={4}
                            spellCheck
                            className={inputStyles}
                            placeholder={t.gen ? undefined : "Type or paste a snippet below…"}
                            value={texts[t.id] ?? ""}
                            onFocus={() => (lastTa.current = t.id)}
                            onChange={(e) => {
                              const v = e.target.value;
                              setTexts((o) => ({ ...o, [t.id]: v }));
                              debounce("txt:" + t.id, 700, () => flexText(data.caseId, t.id, v));
                            }}
                          />
                        </div>
                      ))}
                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <BookMarked className="size-4 text-slate-400" />
                          <h4 className="text-sm font-semibold text-slate-900">Snippet library</h4>
                          <button className={buttonStyles({ variant: "secondary", size: "xs", className: "ml-auto" })} onClick={() => saveSnips([{ t: "New snippet", x: "Type your text here…" }, ...snips])}>
                            <Plus /> New snippet
                          </button>
                        </div>
                        <p className="mt-1 mb-3 text-xs text-slate-500">Your reusable phrases. Click Copy to copy, or Insert to add it to the text box you last clicked in.</p>
                        {snips.length === 0 && <p className="text-sm text-slate-500">No snippets yet.</p>}
                        <div className="grid gap-3 xl:grid-cols-2">
                          {snips.map((sn, i) => (
                            <div key={i} className="flex flex-col rounded-lg border border-slate-200 bg-white p-3">
                              <input
                                className={cn(inputStyles, "mb-2 !py-1.5 font-semibold")}
                                value={sn.t}
                                onChange={(e) => saveSnips(snips.map((x, j) => (j === i ? { ...x, t: e.target.value } : x)))}
                              />
                              <textarea className={cn(inputStyles, "flex-1")} rows={3} value={sn.x} onChange={(e) => saveSnips(snips.map((x, j) => (j === i ? { ...x, x: e.target.value } : x)))} />
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <button className={buttonStyles({ variant: "secondary", size: "xs" })} onClick={() => copyText(sn.x).then(() => show("Snippet copied"))}>
                                  <Copy /> Copy
                                </button>
                                <button
                                  className={buttonStyles({ variant: "secondary", size: "xs" })}
                                  onClick={() => {
                                    const id = lastTa.current;
                                    const v = (texts[id] ?? "").replace(/\s+$/, "");
                                    const next = (v ? v + " " : "") + sn.x;
                                    setTexts((o) => ({ ...o, [id]: next }));
                                    flexText(data.caseId, id, next);
                                    show("Inserted");
                                  }}
                                >
                                  <TextCursorInput /> Insert into text box
                                </button>
                                <button className={buttonStyles({ variant: "ghost", size: "xs", className: "ml-auto hover:!bg-red-50 hover:!text-red-600" })} onClick={() => saveSnips(snips.filter((_, j) => j !== i))}>
                                  <Trash2 /> Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {s.special === "helper" && <FlexHelper prefill={data.prefill} toast={show} />}
                  {s.special === "living" && <LivingGuide living={data.living} toast={show} />}
                  {s.special === "all" && (
                    <div>
                      <div className="relative mb-3">
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                        <input className={cn(inputStyles, "pl-9")} placeholder="Filter answers…" value={allQ} onChange={(e) => setAllQ(e.target.value)} />
                      </div>
                      {data.all.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">No fact find answers yet.</p>
                      ) : (
                        <div className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
                          <div className="bg-slate-50 px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">Answers</div>
                          {data.all
                            .filter((r) => !allQ || `${r.label} ${r.value}`.toLowerCase().includes(allQ.toLowerCase()))
                            .map((r) => (
                              <div key={r.label} className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5 sm:flex-nowrap">
                                <span className="w-full shrink-0 text-[13px] text-slate-600 sm:w-56">{r.label}</span>
                                <input readOnly className={cn(inputStyles, "min-w-0 flex-1 !py-1.5")} value={r.value} onClick={() => doCopy(r.value)} />
                                <button className={iconBtn} title="Copy" aria-label="Copy" onClick={() => doCopy(r.value)}>
                                  <Copy />
                                </button>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>
      {node}
    </div>
  );
}

/* ---------------- Flex helper (three generators) ---------------- */
const TIME_DEFAULT = "within the next 3–6 months (subject to contract dates and lender processing times)";
const EXTRA_DEFAULT = "the ability to make extra repayments without penalty (within lender limits)";
const REQ_RATE_DEFAULT = "a suitable product as long as repayments remain affordable within their budget";

function Sel({ label, v, on, opts }: { label: string; v: string; on: (v: string) => void; opts: [string, string][] }) {
  return (
    <label className="block">
      <span className={labelStyles}>{label}</span>
      <select className={selectStyles} value={v} onChange={(e) => on(e.target.value)}>
        {opts.map(([val, l]) => (
          <option key={val} value={val}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

function L({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={cn("block", className)}>
      <span className={labelStyles}>{label}</span>
      {children}
    </label>
  );
}

function FlexHelper({ prefill, toast }: { prefill: Record<string, string>; toast: (t: string, bad?: boolean) => void }) {
  const [tab, setTab] = useState<"prod" | "req" | "feat">("prod");
  const P = (k: string, d: string, allowed: string[]) => (prefill[k] && allowed.includes(prefill[k]) ? prefill[k] : d);
  const PROD_TYPES: [string, string][] = [
    ["standard home loan", "Standard home loan"],
    ["new purchase home loan", "New purchase home loan"],
    ["refinance home loan", "Refinance home loan"],
    ["investment property loan", "Investment property loan"],
    ["construction home loan", "Construction home loan"],
    ["equity release / cash-out home loan", "Equity release / cash-out home loan"],
    ["other", "Other (type below)"],
  ];
  const PROD_PURP: [string, string][] = [
    ["the purchase of a residential property", "Purchase – residential property"],
    ["the refinance of an existing home loan", "Refinance existing home loan"],
    ["the construction of a new dwelling", "Construction of new dwelling"],
    ["releasing equity for acceptable purposes", "Equity release / cash-out"],
    ["other purposes as discussed with the client", "Other (type below)"],
  ];
  const OCC: [string, string][] = [
    ["owner-occupied", "Owner-occupied"],
    ["investment", "Investment"],
    ["owner-occupied or investment (to be confirmed)", "To be confirmed"],
  ];
  const REPAY: [string, string][] = [
    ["principal & interest", "Principal & interest"],
    ["interest-only for an initial period then principal & interest", "Interest-only then P&I"],
  ];
  const PROD_RATE: [string, string][] = [
    ["variable", "Variable"],
    ["fixed", "Fixed"],
    ["a split between fixed and variable", "Split (fixed / variable)"],
    ["no strong preference as long as repayments are affordable within their budget", "No strong preference"],
  ];
  const REQ_PURP: [string, string][] = [
    ["purchase an owner-occupied home", "Purchase – owner-occupied home"],
    ["purchase a residential investment property", "Purchase – investment property"],
    ["refinance their existing home loan to achieve a better overall position", "Refinance existing home loan"],
    ["construct a new dwelling on owned or to-be-purchased land", "Construction"],
    ["release equity for acceptable purposes (e.g. renovations, debt consolidation, or investment)", "Equity release / cash-out"],
    ["other purposes as discussed with the client", "Other (type below)"],
  ];
  const REQ_RATE: [string, string][] = [
    ["variable home loan with the flexibility to make additional repayments", "Variable with flexibility"],
    ["fixed rate home loan to provide certainty of repayments for a set period", "Fixed to provide certainty"],
    ["a split loan (part fixed, part variable) to balance certainty and flexibility", "Split loan (fixed / variable)"],
    [REQ_RATE_DEFAULT, "No strong preference"],
  ];
  const FEAT_RATE: [string, string][] = [
    ["variable", "Variable"],
    ["fixed", "Fixed"],
    ["a split between fixed and variable", "Split (fixed / variable)"],
    ["to be confirmed – client is comfortable with a suitable structure based on advice", "To be confirmed"],
  ];
  const vals = (o: [string, string][]) => o.map((x) => x[0]);
  const [p, setP] = useState({
    type: P("prodType", PROD_TYPES[0][0], vals(PROD_TYPES)),
    typeOther: "",
    purpose: P("prodPurpose", PROD_PURP[0][0], vals(PROD_PURP)),
    purposeOther: "",
    occ: P("occ", OCC[0][0], vals(OCC)),
    addr: "",
    repay: REPAY[0][0],
    term: "30",
    rate: P("prodRate", PROD_RATE[0][0], vals(PROD_RATE)),
  });
  const [q, setQ] = useState({
    purpose: P("reqPurpose", REQ_PURP[0][0], vals(REQ_PURP)),
    purposeOther: "",
    amount: prefill.amount ?? "",
    time: TIME_DEFAULT,
    term: "30",
    rate: P("reqRate", REQ_RATE_DEFAULT, vals(REQ_RATE)),
    special: prefill.special ?? "",
  });
  const [ft, setFt] = useState({
    rate: P("featRate", FEAT_RATE[0][0], vals(FEAT_RATE)),
    offset: prefill.offset === "no" ? "no" : "yes",
    redraw: prefill.redraw === "no" ? "no" : "yes",
    extra: EXTRA_DEFAULT,
    other: "",
  });
  const [out, setOut] = useState({ prod: "", req: "", feat: "" });
  const [unlocked, setUnlocked] = useState({ prod: false, req: false, feat: false });

  const buildProduct = () => {
    const type = p.type === "other" ? p.typeOther.trim() || "home loan" : p.type;
    const purpose = p.purpose.startsWith("other purposes") ? p.purposeOther.trim() || p.purpose : p.purpose;
    const occ = p.occ || "owner-occupied or investment";
    const addr = p.addr.trim() || "the proposed property / TBA";
    const repay = p.repay || "principal & interest";
    const term = p.term.trim() || "the proposed";
    const rate = p.rate || "variable";
    return `Client is seeking a ${type} for the purpose of ${purpose} of a ${occ} residential property at ${addr}.

A ${repay} home loan over approximately ${term} years is considered appropriate having regard to the useful life of the property and the client's medium to long-term housing plans.

This type of product aligns with the client's preference for a ${rate} interest rate, the ability to make extra repayments within lender limits, and flexibility to review or refinance if circumstances change. A standard residential mortgage is more suitable than short-term, business or higher-risk credit options for this need.`;
  };
  const buildReq = () => {
    const purpose = q.purpose.startsWith("other purposes") ? q.purposeOther.trim() || q.purpose : q.purpose;
    const lines = [
      "Summary of the client's requirements and objectives:",
      "",
      `- Purpose of credit: The client wishes to ${purpose}.`,
      `- Amount of credit: An approximate loan amount of ${q.amount.trim() || "[loan amount – to be confirmed]"}, subject to lender assessment and valuation.`,
      `- Timeframe for credit: Funds are required ${q.time.trim() || TIME_DEFAULT}.`,
      `- Loan term: Approximately ${q.term.trim() || "30"} years, which is appropriate relative to the useful life of the property and expected retirement age.`,
      "- Repayment objective: Repayments that are comfortably affordable from verified net disposable income after living expenses and other committed debts.",
      `- Rate / product preference: The client prefers a ${q.rate || REQ_RATE_DEFAULT}.`,
      "- Features required: Offset / redraw and standard internet and mobile banking access so they can manage cash flow and reduce interest over time (as applicable to the selected product).",
    ];
    if (q.special.trim()) lines.push(`- Other objectives / considerations: ${q.special.trim()}`);
    lines.push(
      "- The client has been made aware of the key costs and risks of this type of credit (including that interest rates may change over time and that fees/charges may apply if they vary or repay the loan early) and confirms that the recommended approach is consistent with their goals and risk tolerance.",
    );
    return lines.join("\n");
  };
  const buildFeat = () => {
    const lines = [
      "Features requested and reasons:",
      "",
      `- Rate structure: The client prefers ${ft.rate || "variable"} and understands the advantages and disadvantages of this structure (including interest-rate risk and, where applicable, any potential break costs on fixed portions).`,
      ft.offset === "no"
        ? "- Offset account: Offset is not essential for this client; priority is overall affordability and simplicity."
        : "- Offset account: The client would like a 100% offset account linked to the home loan so that surplus income and savings reduce interest while remaining accessible for emergencies and future goals.",
      ft.redraw === "no"
        ? "- Redraw facility: Redraw is not critical, provided the product otherwise meets their objectives."
        : "- Redraw facility: The client values the ability to make additional repayments and redraw these funds if required, instead of relying on separate personal loans or credit cards.",
      `- Extra repayments: The client would like ${ft.extra || EXTRA_DEFAULT}.`,
    ];
    if (ft.other.trim()) lines.push(`- Other features / package: ${ft.other.trim()}`);
    lines.push(
      "",
      "Overall, these features have been selected because they support the client's objectives to manage cash flow effectively, reduce interest over time and maintain appropriate flexibility while remaining consistent with their financial situation and risk profile.",
    );
    return lines.join("\n");
  };
  const builders = { prod: buildProduct, req: buildReq, feat: buildFeat };
  const hints = {
    prod: "Click Show text to build the paragraph, then Copy and paste into Flex “Product Type Reason”. Use Edit text to tweak wording for this client.",
    req: "Copy this into Flex “Your Requirements and Objectives”. It covers purpose, amount, timeframe, term, rate preference and other objectives.",
    feat: "Copy this into Flex “Feature Notes”. It records which features the client needs and why.",
  };
  const rows = { prod: 7, req: 10, feat: 9 };
  const [copied, setCopied] = useState(false);

  const other = "self-end";

  return (
    <div id="mm-flex-helper" className="space-y-4">
      <p className="text-sm text-slate-600">Pre-filled from this client’s Fact Find where possible. Pick the options, press Show text, then Copy and paste into Flex.</p>
      <div className="flex max-w-full overflow-x-auto">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5" role="tablist">
          {(
            [
              ["prod", "Product Type Reason"],
              ["req", "Requirements & Objectives"],
              ["feat", "Feature Notes"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              className={cn(
                "h-8 rounded-md px-3 text-[13px] font-medium whitespace-nowrap transition-colors",
                tab === k ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800",
              )}
              onClick={() => setTab(k)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      {tab === "prod" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Sel label="Type of product" v={p.type} on={(v) => setP({ ...p, type: v })} opts={PROD_TYPES} />
          {p.type === "other" && <input className={cn(inputStyles, other)} placeholder="If Other, type here" value={p.typeOther} onChange={(e) => setP({ ...p, typeOther: e.target.value })} />}
          <Sel label="Purpose of credit" v={p.purpose} on={(v) => setP({ ...p, purpose: v })} opts={PROD_PURP} />
          {p.purpose.startsWith("other purposes") && (
            <input className={cn(inputStyles, other)} placeholder="If Other, type here" value={p.purposeOther} onChange={(e) => setP({ ...p, purposeOther: e.target.value })} />
          )}
          <Sel label="Occupancy" v={p.occ} on={(v) => setP({ ...p, occ: v })} opts={OCC} />
          <L label="Property address">
            <input className={inputStyles} placeholder="e.g. 1 Sample St, Suburb / TBA" value={p.addr} onChange={(e) => setP({ ...p, addr: e.target.value })} />
          </L>
          <Sel label="Repayment type" v={p.repay} on={(v) => setP({ ...p, repay: v })} opts={REPAY} />
          <L label="Loan term (years)">
            <input type="number" min={1} max={40} className={inputStyles} value={p.term} onChange={(e) => setP({ ...p, term: e.target.value })} />
          </L>
          <Sel label="Rate preference" v={p.rate} on={(v) => setP({ ...p, rate: v })} opts={PROD_RATE} />
        </div>
      )}
      {tab === "req" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Sel label="Purpose" v={q.purpose} on={(v) => setQ({ ...q, purpose: v })} opts={REQ_PURP} />
          {q.purpose.startsWith("other purposes") && (
            <input className={cn(inputStyles, other)} placeholder="If Other, type here" value={q.purposeOther} onChange={(e) => setQ({ ...q, purposeOther: e.target.value })} />
          )}
          <L label="Approx. loan amount">
            <input className={inputStyles} placeholder="e.g. 650,000" value={q.amount} onChange={(e) => setQ({ ...q, amount: e.target.value })} />
          </L>
          <L label="Timeframe for credit">
            <input className={inputStyles} value={q.time} onChange={(e) => setQ({ ...q, time: e.target.value })} />
          </L>
          <L label="Loan term (years)">
            <input type="number" min={1} max={40} className={inputStyles} value={q.term} onChange={(e) => setQ({ ...q, term: e.target.value })} />
          </L>
          <Sel label="Rate / product preference" v={q.rate} on={(v) => setQ({ ...q, rate: v })} opts={REQ_RATE} />
          <L label="Special objectives / notes" className="md:col-span-2">
            <textarea
              rows={3}
              className={inputStyles}
              placeholder="e.g. consolidate existing unsecured debts, maintain a cash buffer, minimise fees, avoid mortgage insurance where possible, etc."
              value={q.special}
              onChange={(e) => setQ({ ...q, special: e.target.value })}
            />
          </L>
        </div>
      )}
      {tab === "feat" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Sel label="Rate structure" v={ft.rate} on={(v) => setFt({ ...ft, rate: v })} opts={FEAT_RATE} />
          <Sel
            label="Offset account required?"
            v={ft.offset}
            on={(v) => setFt({ ...ft, offset: v })}
            opts={[
              ["yes", "Yes – offset required"],
              ["no", "No – offset not required"],
            ]}
          />
          <Sel
            label="Redraw facility required?"
            v={ft.redraw}
            on={(v) => setFt({ ...ft, redraw: v })}
            opts={[
              ["yes", "Yes – redraw required"],
              ["no", "No – redraw not required"],
            ]}
          />
          <Sel
            label="Extra repayments"
            v={ft.extra}
            on={(v) => setFt({ ...ft, extra: v })}
            opts={[
              [EXTRA_DEFAULT, "Wants ability to pay extra"],
              ["no particular focus on additional repayments", "No strong need for extra repayments"],
            ]}
          />
          <L label="Package / other features" className="md:col-span-2">
            <textarea
              rows={3}
              className={inputStyles}
              placeholder="e.g. package with annual fee and credit card, multiple loan splits, online banking, ability to fix part of the loan in future, etc."
              value={ft.other}
              onChange={(e) => setFt({ ...ft, other: e.target.value })}
            />
          </L>
        </div>
      )}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <button className={buttonStyles({ variant: "primary", size: "sm" })} onClick={() => setOut((o) => ({ ...o, [tab]: builders[tab]() }))}>
            <Sparkles /> Show text
          </button>
          <button className={buttonStyles({ variant: "secondary", size: "sm" })} onClick={() => setUnlocked((u) => ({ ...u, [tab]: !u[tab] }))}>
            {unlocked[tab] ? <Lock /> : <PenLine />}
            {unlocked[tab] ? "Lock text" : "Edit text"}
          </button>
          <button
            className={buttonStyles({ variant: "secondary", size: "sm" })}
            onClick={async () => {
              const t = out[tab] || builders[tab]();
              if (!out[tab]) setOut((o) => ({ ...o, [tab]: t }));
              await copyText(t);
              setCopied(true);
              setTimeout(() => setCopied(false), 900);
              toast("Copied");
            }}
          >
            {copied ? <Check className="text-emerald-600" /> : <Copy />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <textarea
          id={`mmfh_${tab}_output`}
          rows={rows[tab]}
          readOnly={!unlocked[tab]}
          className={cn(inputStyles, !unlocked[tab] && "bg-white/70 text-slate-700")}
          value={out[tab]}
          onChange={(e) => setOut((o) => ({ ...o, [tab]: e.target.value }))}
        />
        <p className="mt-2 text-xs text-slate-500">{hints[tab]}</p>
      </div>
    </div>
  );
}

function LivingGuide({ living, toast }: { living: Data["living"]; toast: (t: string) => void }) {
  const groups = Object.entries(living.groups);
  const totals = useMemo(() => Object.fromEntries(groups.map(([g]) => [g, Object.values(living.table[g] ?? {}).reduce((s, v) => s + (Number(v) || 0), 0)])), [living, groups]);
  const hl = "bg-emerald-50/80";
  return (
    <div>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className={tableCls.table}>
          <thead className={tableCls.thead}>
            <tr>
              <th className={tableCls.th}>Category (monthly)</th>
              {groups.map(([g, l]) => (
                <th key={g} className={cn(tableCls.th, "text-right", g === living.household && "bg-emerald-50 text-emerald-800")}>
                  {l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(living.categories).map(([c, cl]) => (
              <tr key={c} className={tableCls.tr}>
                <td className={cn(tableCls.td, "min-w-[220px] !py-2 text-[13px]")}>{cl}</td>
                {groups.map(([g]) => {
                  const v = Number(living.table[g]?.[c] ?? 0);
                  return (
                    <td
                      key={g}
                      title="Click to copy"
                      className={cn(tableCls.td, "cursor-pointer !py-2 text-right tabular-nums hover:bg-brand-50", g === living.household && `${hl} font-semibold text-slate-900`)}
                      onClick={() => copyText(String(v)).then(() => toast(`Copied ${v}`))}
                    >
                      {Math.round(v).toLocaleString("en-AU")}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-slate-50 font-semibold">
              <td className={cn(tableCls.td, "py-2.5 text-slate-900")}>Total / month</td>
              {groups.map(([g]) => (
                <td key={g} className={cn(tableCls.td, "py-2.5 text-right text-slate-900 tabular-nums", g === living.household && "bg-emerald-100/70")}>
                  {Math.round(totals[g]).toLocaleString("en-AU")}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
        Reference only. The column for this client’s household ({living.groups[living.household] ?? living.household}) is highlighted — click any figure to copy it. Edit the numbers
        under Borrowing Capacity → Assumptions.
      </p>
    </div>
  );
}
