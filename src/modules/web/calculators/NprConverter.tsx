"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeftRight, Copy, RotateCcw } from "lucide-react";
import { Button } from "../components/ui/Button";
import { CalcShell, Check, DecimalField, Empty, Figure, Group, SelectField, TalkCta } from "./parts";
import {
  AREA,
  AREA_GROUPS,
  LS,
  UNIT_LABEL,
  UNIT_LIST,
  convertArea,
  convertCurrency,
  convertNumbering,
  hillyToM2,
  normaliseAreaName,
  teraiToM2,
  type ConvResult,
  type Currency,
  type Unit,
} from "./npr";

type Mode = "numbers" | "currency" | "area";

function read(k: string, f: string) {
  try {
    const v = localStorage.getItem(k);
    return v === null ? f : v;
  } catch {
    return f;
  }
}
function save(k: string, v: unknown) {
  try {
    localStorage.setItem(k, String(v));
  } catch {
    /* private mode */
  }
}
const isUnit = (u: string): u is Unit => (UNIT_LIST as readonly string[]).includes(u);
const unitOpts = UNIT_LIST.map((u) => ({ value: u, label: UNIT_LABEL[u] }));
const CUR_OPTS: { value: Currency; label: string }[] = [
  { value: "AUD", label: "AUD (Australian dollar)" },
  { value: "NPR", label: "NPR (Nepalese rupee)" },
];

export type NprConverterProps = { defaultMode?: Mode; compact?: boolean; className?: string };

/**
 * Lakh/crore ⇄ million/billion, AUD ⇄ NPR (with units) and Nepali land area (ropani/aana, bigha/kattha) converter.
 * Port of the original [mustang_converter] widget with every mode kept; preferences persist in localStorage.
 */
export function NprConverter({ defaultMode = "currency", compact, className }: NprConverterProps) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [dp, setDp] = useState(2);
  const [indian, setIndian] = useState(true);

  // numbering
  const [num, setNum] = useState<number | null>(null);
  const [numFrom, setNumFrom] = useState<Unit>("Million");
  const [numTo, setNumTo] = useState<Unit>("Crore");
  // currency
  const [rate, setRate] = useState<number | null>(null);
  const [amt, setAmt] = useState<number | null>(null);
  const [cf, setCf] = useState<Currency>("AUD");
  const [ct, setCt] = useState<Currency>("NPR");
  const [uf, setUf] = useState<Unit>("One");
  const [ut, setUt] = useState<Unit>("Lakh");
  // area
  const [area, setArea] = useState<number | null>(null);
  const [af, setAf] = useState("Square metre (m²)");
  const [at, setAt] = useState("Ropani");
  const [hilly, setHilly] = useState({ ro: "", an: "", pa: "", da: "" });
  const [terai, setTerai] = useState({ bi: "", ka: "", dh: "" });

  // Restore saved preferences once (client only).
  const restored = useRef(false);
  useEffect(() => {
    const u = (k: string, f: Unit) => {
      const v = read(k, f);
      return isUnit(v) ? v : f;
    };
    setDp(Number(read(LS.round, "2")) || 0);
    setIndian(read(LS.indian, "true") === "true");
    setNumFrom(u(LS.numFrom, "Million"));
    setNumTo(u(LS.numTo, "Crore"));
    setUf(u(LS.curFromUnit, "One"));
    setUt(u(LS.curToUnit, "Lakh"));
    const c1 = read(LS.curFromCur, "AUD");
    const c2 = read(LS.curToCur, "NPR");
    setCf(c1 === "NPR" ? "NPR" : "AUD");
    setCt(c2 === "AUD" ? "AUD" : "NPR");
    const r = Number(read(LS.rate, ""));
    if (r > 0) setRate(r);
    const a1 = normaliseAreaName(read(LS.areaFrom, "Square metre (m²)"));
    const a2 = normaliseAreaName(read(LS.areaTo, "Ropani"));
    if (AREA[a1]) setAf(a1);
    if (AREA[a2]) setAt(a2);
    restored.current = true;
  }, []);
  const persist = <T,>(k: string, set: (v: T) => void) => (v: T) => {
    set(v);
    save(k, v);
  };

  let result: ConvResult | null = null;
  if (mode === "numbers" && num != null) result = convertNumbering(num, numFrom, numTo, dp, indian);
  if (mode === "currency" && amt != null && rate && rate > 0) result = convertCurrency(amt, rate, uf, cf, ct, ut, dp, indian);
  if (mode === "area" && area != null) result = convertArea(area, af, at, dp);

  const tabsId = useId();
  const TABS: { id: Mode; label: string }[] = [
    { id: "currency", label: "NPR and AUD" },
    { id: "numbers", label: "Lakh and crore" },
    { id: "area", label: "Land area" },
  ];

  const settings = (
    <div className="mw-calc__grid mw-calc__grid--2" style={{ alignItems: "end" }}>
      <SelectField<"0" | "2" | "4">
        label="Decimal places"
        value={String(dp) as "0" | "2" | "4"}
        onChange={(v) => persist<number>(LS.round, setDp)(Number(v))}
        options={[
          { value: "0", label: "0" },
          { value: "2", label: "2" },
          { value: "4", label: "4" },
        ]}
      />
      {mode !== "area" && (
        <div style={{ paddingBottom: 12 }}>
          <Check checked={indian} onChange={persist<boolean>(LS.indian, setIndian)} label="Nepali digit grouping" hint="12,34,567 for NPR, lakh and crore" />
        </div>
      )}
    </div>
  );

  let form: React.ReactNode;
  if (mode === "numbers") {
    form = (
      <>
        <DecimalField label="Number" value={num} onChange={setNum} placeholder="e.g. 2.5" max={1e15} />
        <div className="mw-swaprow">
          <SelectField<Unit> label="From" value={numFrom} onChange={persist(LS.numFrom, setNumFrom)} options={unitOpts} />
          <SwapButton
            label="Swap units"
            onClick={() => {
              persist(LS.numFrom, setNumFrom)(numTo);
              persist(LS.numTo, setNumTo)(numFrom);
            }}
          />
          <SelectField<Unit> label="To" value={numTo} onChange={persist(LS.numTo, setNumTo)} options={unitOpts} />
        </div>
        {settings}
      </>
    );
  } else if (mode === "currency") {
    form = (
      <>
        <div className="mw-calc__grid mw-calc__grid--2">
          <DecimalField
            label="Exchange rate: 1 AUD ="
            value={rate}
            onChange={(v) => {
              setRate(v);
              if (v && v > 0) save(LS.rate, v);
            }}
            suffix="NPR"
            placeholder="Today's rate"
            max={10_000}
            hint={
              <>
                Enter the rate from your bank or money transfer service, or the{" "}
                <a className="mw-link" href="https://www.nrb.org.np/" target="_blank" rel="noopener noreferrer">
                  Nepal Rastra Bank
                </a>{" "}
                reference rate. Rates change daily.
              </>
            }
          />
          <DecimalField label="Amount" value={amt} onChange={setAmt} placeholder="e.g. 50" max={1e15} />
        </div>
        <div className="mw-swaprow">
          <div style={{ display: "grid", gap: 12 }}>
            <SelectField<Currency> label="From" value={cf} onChange={persist(LS.curFromCur, setCf)} options={CUR_OPTS} />
            <SelectField<Unit> label="Amount is in" value={uf} onChange={persist(LS.curFromUnit, setUf)} options={unitOpts} />
          </div>
          <SwapButton
            label="Swap sides"
            onClick={() => {
              persist(LS.curFromCur, setCf)(ct);
              persist(LS.curToCur, setCt)(cf);
              persist(LS.curFromUnit, setUf)(ut);
              persist(LS.curToUnit, setUt)(uf);
            }}
          />
          <div style={{ display: "grid", gap: 12 }}>
            <SelectField<Currency> label="To" value={ct} onChange={persist(LS.curToCur, setCt)} options={CUR_OPTS} />
            <SelectField<Unit> label="Show result in" value={ut} onChange={persist(LS.curToUnit, setUt)} options={unitOpts} />
          </div>
        </div>
        {settings}
      </>
    );
  } else {
    const areaOpts = AREA_GROUPS.flatMap((g) => g.units.map((u) => ({ value: u, label: g.label.startsWith("Nepal") ? `${u} (${g.label.replace("Nepal: ", "")})` : u })));
    form = (
      <>
        <DecimalField label="Area" value={area} onChange={setArea} placeholder="e.g. 4" max={1e12} />
        <div className="mw-swaprow">
          <SelectField label="From" value={af} onChange={persist(LS.areaFrom, setAf)} options={areaOpts} />
          <SwapButton
            label="Swap area units"
            onClick={() => {
              persist(LS.areaFrom, setAf)(at);
              persist(LS.areaTo, setAt)(af);
            }}
          />
          <SelectField label="To" value={at} onChange={persist(LS.areaTo, setAt)} options={areaOpts} />
        </div>
        <Group legend="Or enter a Nepali land measurement">
          <details className="mw-subdetails" style={{ borderTop: 0, paddingTop: 0 }}>
            <summary>Hilly region: ropani, aana, paisa, dam</summary>
            <div className="mw-calc__grid mw-calc__grid--2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
              {(["ro", "an", "pa", "da"] as const).map((k) => (
                <QuickField key={k} label={{ ro: "Ropani", an: "Aana", pa: "Paisa", da: "Dam" }[k]} value={hilly[k]} onChange={(v) => setHilly((h) => ({ ...h, [k]: v }))} />
              ))}
            </div>
            <p style={{ margin: "12px 0 0" }}>
              <button
                type="button"
                className="mw-linkbtn"
                onClick={() => {
                  const m2 = hillyToM2(+hilly.ro || 0, +hilly.an || 0, +hilly.pa || 0, +hilly.da || 0);
                  setArea(Number(m2.toFixed(4)));
                  persist(LS.areaFrom, setAf)("Square metre (m²)");
                }}
              >
                Use this measurement
              </button>
            </p>
          </details>
          <details className="mw-subdetails">
            <summary>Terai: bigha, kattha, dhur</summary>
            <div className="mw-calc__grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              {(["bi", "ka", "dh"] as const).map((k) => (
                <QuickField key={k} label={{ bi: "Bigha", ka: "Kattha", dh: "Dhur" }[k]} value={terai[k]} onChange={(v) => setTerai((t) => ({ ...t, [k]: v }))} />
              ))}
            </div>
            <p style={{ margin: "12px 0 0" }}>
              <button
                type="button"
                className="mw-linkbtn"
                onClick={() => {
                  const m2 = teraiToM2(+terai.bi || 0, +terai.ka || 0, +terai.dh || 0);
                  setArea(Number(m2.toFixed(4)));
                  persist(LS.areaFrom, setAf)("Square metre (m²)");
                }}
              >
                Use this measurement
              </button>
            </p>
          </details>
        </Group>
        {settings}
      </>
    );
  }

  const reset = () => {
    if (mode === "numbers") setNum(null);
    if (mode === "currency") setAmt(null);
    if (mode === "area") {
      setArea(null);
      setHilly({ ro: "", an: "", pa: "", da: "" });
      setTerai({ bi: "", ka: "", dh: "" });
    }
  };

  const emptyText =
    mode === "currency" ? (!rate ? "Enter today's exchange rate and an amount." : "Enter an amount to convert.") : mode === "numbers" ? "Enter a number to convert." : "Enter an area, or a ropani or bigha measurement.";

  const out = result ? (
    <>
      <Figure label="Result" value={<span style={{ fontSize: "clamp(1.75rem, 1.2rem + 2.4cqi, 2.75rem)" }}>{result.primary}</span>} sub={result.secondary} />
      <hr className="mw-calc__rule" />
      <div className="mw-chiprow">
        {result.chips.map((c) => (
          <span className="mw-minichip" key={c}>
            {c}
          </span>
        ))}
      </div>
      <p className="mw-formula">{result.formula}</p>
      <div className="mw-btnrow">
        <CopyButton text={result.copyText} />
        <Button variant="quiet" size="sm" onClick={reset} icon={<RotateCcw size={16} strokeWidth={1.5} aria-hidden="true" />}>
          Reset
        </Button>
      </div>
      {mode === "currency" && (
        <p className="mw-field__hint" style={{ margin: 0 }}>
          Banks and transfer services add fees and use their own rate. Lenders also convert overseas savings and gifts at their own rate.
        </p>
      )}
      {!compact && <TalkCta note="If savings or family help from Nepal are part of your deposit, lenders want the money documented in Australian dollars. We can explain what to collect." />}
    </>
  ) : (
    <>
      <Figure label="Result" value="–" muted sub={emptyText} />
      <Empty>The converted figure, a best-fit unit, the formula and a copy button appear here.</Empty>
    </>
  );

  return (
    <div className={className} style={{ display: "grid", gap: 16 }}>
      <div className="mw-tabs" role="tablist" aria-label="Converter">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${tabsId}-${t.id}`}
            aria-selected={mode === t.id}
            aria-controls={`${tabsId}-panel`}
            tabIndex={mode === t.id ? 0 : -1}
            className="mw-tab"
            onClick={() => setMode(t.id)}
            onKeyDown={(e) => {
              const i = TABS.findIndex((x) => x.id === mode);
              const next = e.key === "ArrowRight" ? (i + 1) % TABS.length : e.key === "ArrowLeft" ? (i - 1 + TABS.length) % TABS.length : -1;
              if (next >= 0) {
                e.preventDefault();
                setMode(TABS[next].id);
                document.getElementById(`${tabsId}-${TABS[next].id}`)?.focus();
              }
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-${mode}`}>
        <CalcShell compact={compact} label={`${TABS.find((t) => t.id === mode)?.label} converter`} form={form} result={out} />
      </div>
    </div>
  );
}

function SwapButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="mw-swapbtn" onClick={onClick} aria-label={label} title={label}>
      <ArrowLeftRight size={18} strokeWidth={1.5} aria-hidden="true" />
    </button>
  );
}

function QuickField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <div className="mw-field">
      <label className="mw-label" htmlFor={id} style={{ fontSize: "0.875rem" }}>
        {label}
      </label>
      <input id={id} className="mw-input mw-num" type="text" inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))} />
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState<"" | "ok" | "fail">("");
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(""), 1500);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <Button
      variant="secondary"
      size="sm"
      icon={<Copy size={16} strokeWidth={1.5} aria-hidden="true" />}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone("ok");
        } catch {
          setDone("fail");
        }
      }}
    >
      <span aria-live="polite">{done === "ok" ? "Copied" : done === "fail" ? "Copy failed" : "Copy result"}</span>
    </Button>
  );
}
