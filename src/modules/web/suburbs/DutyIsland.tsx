"use client";

import dynamic from "next/dynamic";

/**
 * NSW stamp duty calculator preset to the suburb's median price, loaded as a client-only island (research §C4.1:
 * preset lives in client state, never a URL parameter; §C6: calculator lazy-loaded, everything else SSR).
 * The page keeps a plain link to /stamp-duty/nsw for no-JS readers.
 */
const StampDutyCalculator = dynamic(() => import("../calculators/StampDutyCalculator").then((m) => m.StampDutyCalculator), {
  ssr: false,
  loading: () => <div aria-hidden="true" style={{ minHeight: 420, borderRadius: 12, border: "1px solid var(--mw-line)", background: "var(--mw-surface)" }} />,
});

export function DutyIsland({ price, title }: { price: number; title: string }) {
  return (
    // Inside <Prose>: cancel the prose h2 top margin on the calculator's own heading (utilities beat the components layer).
    <div className="[&_h2]:mt-0" style={{ minHeight: 420 }}>
      <StampDutyCalculator defaultState="NSW" defaultPrice={price} defaultFirstHomeBuyer compact lockState title={title} />
    </div>
  );
}
