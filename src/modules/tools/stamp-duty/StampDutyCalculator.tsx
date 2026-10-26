"use client";

import { useEffect, useRef, useState } from "react";
import { calculateStampDuty, formatCurrency, STATES, type AuState, type PropertyType, type PurchaseType } from "./brackets";

// CSS of WPCode snippet "stampduty-css" (post 2262), scoped to .mm-stamp.
const CSS = `
.mm-stamp{font-family:Arial,sans-serif;background-color:#f4f4f4;padding:20px;border-radius:8px}
.mm-stamp .calculator-container{max-width:600px;margin:auto;background:#fff;padding:20px;box-shadow:0 0 10px rgba(0,0,0,.1);border-radius:8px;color:#333}
.mm-stamp h1{color:#BA7200;text-align:center;font-size:2em;font-weight:bold;margin:.67em 0}
.mm-stamp .input-section{margin-bottom:20px}
.mm-stamp .input-group{margin-bottom:15px}
.mm-stamp .input-group label{display:block;margin-bottom:5px}
.mm-stamp .input-group input,.mm-stamp .input-group select{width:calc(100% - 20px);padding:8px 10px;font-size:16px;border:1px solid #ccc;border-radius:4px}
.mm-stamp .input-group button{padding:10px;font-size:16px;margin:0 5px 5px 0;border:1px solid #ccc;background:#f4f4f4;cursor:pointer;border-radius:4px;outline:none;color:#333}
.mm-stamp .input-group button:hover{background:#ddd}
.mm-stamp .input-group button.active{background:#BA7200;color:#fff;border:1px solid #BA7200}
.mm-stamp .calculate-btn{width:100%;padding:10px;background:#BA7200;color:#fff;border:none;border-radius:4px;font-size:18px;cursor:pointer}
.mm-stamp .calculate-btn:hover{background:#a65c00}
.mm-stamp .results-section{margin-top:20px;background:#f9f9f9;padding:15px;border-radius:8px}
.mm-stamp .results-section h2{color:#BA7200;font-size:1.5em;font-weight:bold;margin:.3em 0 .5em}
.mm-stamp .results-section p{font-size:16px;margin:5px 0;overflow:hidden}
.mm-stamp .results-section p span{float:right;font-weight:bold}
.mm-stamp .disclaimer{margin-top:20px;padding:10px;background-color:#f9f9f9;border:1px solid #ccc;border-radius:5px;font-size:14px;color:#555}
.mm-stamp .disclaimer p{font-size:14px}
@media (max-width:600px){
  .mm-stamp .calculator-container{padding:15px}
  .mm-stamp .input-group input{width:calc(100% - 16px)}
  .mm-stamp .input-group button{padding:8px;font-size:14px;margin-right:3px}
  .mm-stamp .calculate-btn{padding:8px;font-size:16px}
  .mm-stamp .results-section p{font-size:14px}
  .mm-stamp .disclaimer,.mm-stamp .disclaimer p{font-size:12px}
}`;

type Result = ReturnType<typeof calculateStampDuty>;

function Toggle<T extends string | boolean>({ id, options, value, onChange }: { id: string; options: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div id={id}>
      {options.map(([v, label]) => (
        <button key={String(v)} type="button" className={v === value ? "active" : ""} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function NativeStampDuty() {
  const [state, setState] = useState<AuState>("NSW");
  const [firstHomeBuyer, setFirstHomeBuyer] = useState(false);
  const [value, setValue] = useState("550000");
  const [propertyType, setPropertyType] = useState<PropertyType>("Principal Place of Residence");
  const [purchaseType, setPurchaseType] = useState<PurchaseType>("Established Home");
  const [foreignPurchaser, setForeignPurchaser] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const calculate = () => {
    const propertyValue = parseFloat(value);
    if (isNaN(propertyValue) || propertyValue <= 0) {
      alert("Please enter a valid property value.");
      return;
    }
    setResult(calculateStampDuty(state, propertyValue, firstHomeBuyer, foreignPurchaser, propertyType));
  };

  return (
    <div className="mm-stamp">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="calculator-container">
        <h1>Stamp Duty Calculator</h1>
        <div className="input-section">
          <div className="input-group">
            <label>State</label>
            <Toggle id="state" options={STATES.map((s) => [s, s] as [AuState, string])} value={state} onChange={setState} />
          </div>
          <div className="input-group" id="firstHomeBuyerGroup">
            <label>Are you first home buyer?</label>
            <Toggle id="firstHomeBuyer" options={[[true, "Yes"], [false, "No"]]} value={firstHomeBuyer} onChange={setFirstHomeBuyer} />
          </div>
          <div className="input-group">
            <label htmlFor="propertyValue">Value of Property</label>
            <input
              type="number"
              id="propertyValue"
              placeholder="$550,000"
              value={value}
              min={0}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && calculate()}
            />
          </div>
          <div className="input-group">
            <label>Property type</label>
            <Toggle
              id="propertyType"
              options={[
                ["Principal Place of Residence", "Primary Residence"],
                ["Investment", "Investment"],
              ]}
              value={propertyType}
              onChange={setPropertyType}
            />
          </div>
          <div className="input-group">
            <label>Are you purchasing</label>
            <Toggle
              id="purchaseType"
              options={[
                ["Established Home", "Established Home"],
                ["New Home", "New Home"],
              ]}
              value={purchaseType}
              onChange={setPurchaseType}
            />
          </div>
          <div className="input-group">
            <label>Is Foreign Purchaser?</label>
            <Toggle id="foreignPurchaser" options={[[false, "No"], [true, "Yes"]]} value={foreignPurchaser} onChange={setForeignPurchaser} />
          </div>
        </div>
        <button type="button" className="calculate-btn" onClick={calculate}>
          Calculate
        </button>
        {result && (
          <div id="results" className="results-section" aria-live="polite">
            <h2>Government Fees</h2>
            <p>
              Stamp Duty on Property: <span>{formatCurrency(result.stampDuty)}</span>
            </p>
            <p>
              Mortgage Registration: <span>{formatCurrency(result.mortgageRegistrationFee)}</span>
            </p>
            <p>
              Transfer Fee: <span>{formatCurrency(result.transferFee)}</span>
            </p>
            <p>
              <strong>
                Total Government Fees: <span>{formatCurrency(result.totalFees)}</span>
              </strong>
            </p>
            {result.firstHomeGrant > 0 && (
              <p style={{ color: "#555", fontSize: 14 }}>
                Possible First Home Owner Grant (not deducted): <span>{formatCurrency(result.firstHomeGrant)}</span>
              </p>
            )}
            <div className="disclaimer">
              <p>
                Note: The information provided by the calculator is for illustration purposes only. It may produce incorrect data, and it is advised that you consult
                with a mortgage broker about your specific circumstances.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** The live page's embed: calculatorsonline.com.au stamp duty widget (data-state="All"). */
export function CalculatorsOnlineWidget() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = ref.current;
    if (!host || host.querySelector("script")) return;
    const s = document.createElement("script");
    s.id = "stamp-src";
    s.type = "text/javascript";
    s.dataset.state = "All";
    s.src = "https://calculatorsonline.com.au/external/!main/stamp_duty.min.js";
    s.async = true;
    host.appendChild(s);
  }, []);
  return (
    <div ref={ref}>
      <div id="stamp-duty-calculator" className="orange-theme hidden">
        <div id="stamp-duty-anchors">
          <p>
            Stamp Duty Calculator from <a href="https://calculatorsonline.com.au">calculatorsonline.com.au</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function StampDutyCalculator() {
  const [tab, setTab] = useState<"native" | "online">("native");
  const tabCls = (t: string) =>
    `px-4 py-2 text-sm font-medium rounded-t-md border border-b-0 ${tab === t ? "bg-[#BA7200] text-white border-[#BA7200]" : "bg-white text-[#333] border-[#ddd] hover:bg-[#f4f4f4]"}`;
  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-[#BA7200]">
        <button type="button" className={tabCls("native")} onClick={() => setTab("native")}>
          Mustang Stamp Duty Calculator
        </button>
        <button type="button" className={tabCls("online")} onClick={() => setTab("online")}>
          calculatorsonline.com.au
        </button>
      </div>
      <div className="pt-4">{tab === "native" ? <NativeStampDuty /> : <CalculatorsOnlineWidget />}</div>
    </div>
  );
}
