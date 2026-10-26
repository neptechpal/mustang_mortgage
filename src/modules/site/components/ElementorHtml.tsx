"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Cf7FormClient from "../cf7/Cf7FormClient";
import type { Cf7ClientProps } from "../cf7/types";
import LeadForm from "../lead/LeadForm";
import { initElementor, runFragmentScripts } from "../runtime/elementor";

type Slot = { el: HTMLElement; key: string; kind: "cf7" | "mmf"; id: string };

/**
 * Renders Elementor markup captured from the live site (identical DOM/classes,
 * so the original Elementor CSS applies 1:1) and wires the widgets.
 * `[data-cf7-slot]` / `[data-mmf-slot]` placeholders are filled with the React
 * form components via portals.
 */
export default function ElementorHtml({
  html,
  scripts = [],
  forms = {},
}: {
  html: string;
  scripts?: { src?: string; code?: string }[];
  forms?: Record<string, Cf7ClientProps | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  // Stable object identity: React 19 re-applies innerHTML (wiping the widgets'
  // runtime state and portal targets) whenever this object changes.
  const inner = useMemo(() => ({ __html: html }), [html]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const found: Slot[] = [];
    root.querySelectorAll<HTMLElement>("[data-cf7-slot]").forEach((el, i) =>
      found.push({ el, kind: "cf7", id: el.dataset.cf7Slot!, key: `cf7-${i}` }),
    );
    root.querySelectorAll<HTMLElement>("[data-mmf-slot]").forEach((el, i) =>
      found.push({ el, kind: "mmf", id: el.dataset.mmfSlot!, key: `mmf-${i}` }),
    );
    if (found.length) setSlots(found);
    const dispose = initElementor(root);
    runFragmentScripts(root, scripts);
    return () => {
      dispose();
      if (found.length) setSlots([]);
    };
    // scripts are static per html
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  return (
    <>
      <div ref={ref} style={{ display: "contents" }} dangerouslySetInnerHTML={inner} suppressHydrationWarning />
      {slots.map((s) => {
        if (s.kind === "mmf") return createPortal(<LeadForm uid={`mmf${Number(s.key.slice(4)) + 1}`} />, s.el, s.key);
        const props = forms[s.id];
        return props ? createPortal(<Cf7FormClient {...props} />, s.el, s.key) : null;
      })}
    </>
  );
}
