"use client";

import { useEffect, useRef } from "react";

/** WP page 2093 HTML widget: mortgage-calculator.net amortization iframe with auto-height. */
export default function AmortizationEmbed() {
  const ref = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { frameHeight?: number } | null;
      if (d && typeof d === "object" && Object.prototype.hasOwnProperty.call(d, "frameHeight") && ref.current) {
        ref.current.style.height = `${Number(d.frameHeight) + 30}px`;
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);
  return (
    <>
      <iframe
        ref={ref}
        id="iframe"
        src="https://mortgage-calculator.net/widget/amortization.html"
        title="mortgage calculator"
        style={{ width: "100%", border: "none", minHeight: 150 }}
      />
      <div style={{ textAlign: "center" }}>
        <a href="https://mortgage-calculator.net" style={{ color: "#343A40", textDecoration: "none", fontSize: 14 }}>
          Mortgage Calculator
        </a>
      </div>
    </>
  );
}
