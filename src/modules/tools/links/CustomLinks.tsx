"use client";

import { useState } from "react";
import type { CustomLink } from "./links";

/** [mmcrm_links] front-end list (grouped grid + ThickBox-style modal preview). */
export default function CustomLinks({ links, showGroups = true }: { links: CustomLink[]; showGroups?: boolean }) {
  const [modal, setModal] = useState<string | null>(null);
  if (!links.length) return <div className="mmcrm-links-front">No links available.</div>;
  const groups = new Map<string, CustomLink[]>();
  for (const l of links) {
    const g = (l.group ?? "").trim();
    groups.set(g, [...(groups.get(g) ?? []), l]);
  }
  const open = (l: CustomLink) => {
    if (!l.url) return;
    if (l.modal) setModal(l.url);
    else window.open(l.url, l.target ? "_blank" : "_self");
  };

  return (
    <div className="mmcrm-links-front my-[6px] mb-[10px] box-border">
      {[...groups.entries()].map(([g, items]) => (
        <div key={g || "_"}>
          {showGroups && <h3 className="mt-3 mb-1.5 text-[1.05rem] font-semibold text-[#333]">{g || "Links"}</h3>}
          <ul className="my-2 mb-3.5 grid list-none grid-cols-1 gap-2.5 p-0 min-[481px]:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
            {items
              .filter((l) => l.url)
              .map((l) => (
                <li key={l.id} className="flex flex-wrap items-center gap-1.5 rounded-[10px] border border-[#e5e7eb] bg-white p-2.5">
                  <a className="flex-auto font-semibold text-[#0f172a] no-underline" href={l.url} {...(l.target ? { target: "_blank", rel: "noopener" } : {})}>
                    {l.label || l.url}
                  </a>
                  <span className="inline-block rounded-full border border-[#dbeafe] bg-[#eef2ff] px-1.5 text-[11px] leading-4 text-[#1e3a8a]">{l.modal ? "Modal" : "Link"}</span>
                  <button
                    type="button"
                    onClick={() => open(l)}
                    className="ml-auto rounded-[3px] border border-[#2271b1] bg-[#f6f7f7] px-2 py-0.5 text-[11px] leading-5 text-[#2271b1] hover:bg-[#f0f0f1]"
                  >
                    Open
                  </button>
                  {l.notes && <span className="mt-0.5 basis-full text-[.9em] text-[#64748b]">{l.notes}</span>}
                </li>
              ))}
          </ul>
        </div>
      ))}

      {modal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label="Link Preview" onClick={() => setModal(null)}>
          <div className="flex h-[min(900px,calc(100vh-140px))] w-[min(1200px,calc(100vw-40px))] flex-col bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#ddd] bg-[#fcfcfc] px-4 py-2 text-sm font-semibold text-[#333]">
              <span>Link Preview</span>
              <div className="flex items-center gap-3">
                <a href={modal} target="_blank" rel="noopener" className="text-xs font-normal text-[#2271b1] underline">
                  Open in new tab
                </a>
                <button type="button" onClick={() => setModal(null)} className="text-xl leading-none text-[#666] hover:text-black" aria-label="Close">
                  ×
                </button>
              </div>
            </div>
            <iframe src={modal} title="Link Preview" className="w-full flex-1 border-0" />
          </div>
        </div>
      )}
    </div>
  );
}
