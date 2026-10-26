"use client";

import { useEffect, useRef } from "react";
import { initConverter } from "./engine";
import { CONVERTER_CSS, CONVERTER_HTML } from "./markup";

/** [mustang_converter] — Numbering system + AUD/NPR + Area converter (verbatim markup/CSS). */
export default function Converter() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => (ref.current ? initConverter(ref.current) : undefined), []);
  return (
    <div ref={ref}>
      <style dangerouslySetInnerHTML={{ __html: CONVERTER_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: CONVERTER_HTML }} />
    </div>
  );
}
