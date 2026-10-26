"use client";
// Attachments (mfile-938) + drawn signature (signature-337) for the /factfind page.
import { useEffect, useRef, useState } from "react";

export default function Cf7Extras() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [sig, setSig] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const drawing = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#dddddd";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, []);
  // keep the real <input type=file> in sync with the queued list
  useEffect(() => {
    if (!fileInput.current) return;
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    fileInput.current.files = dt.files;
  }, [files]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) * e.currentTarget.width) / r.width, ((e.clientY - r.top) * e.currentTarget.height) / r.height];
  };
  const clear = () => {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#dddddd";
    ctx.fillRect(0, 0, c.width, c.height);
    setSig("");
  };
  return (
    <>
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="mb-1 text-base font-semibold text-slate-900">Required Document Attachments</h3>
        <p className="text-sm text-slate-600">Attach here or email to <a className="text-[#0073AA] underline" href="mailto:info@mustangmortgage.com.au?subject=Documents%20for%20Mortgage%20Application">info@mustangmortgage.com.au</a>.</p>
        <ul className="my-2 text-sm text-slate-700">
          <li>• Two most recent payslips for each applicant</li>
          <li>• Driver Licence / Photo ID / Passport for each applicant</li>
          <li>• Liability statements (home/personal/credit card)</li>
          <li>• Rates notice / Contract of Sale (if applicable)</li>
          <li>• Tax returns/NOA (if self-employed)</li>
        </ul>
        <label className="mb-1 block text-sm font-medium text-slate-700">Attach File(s)</label>
        <div className="rounded-lg border-2 border-dashed border-slate-300 p-4 text-center text-sm text-slate-600"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); setFiles((f) => [...f, ...Array.from(e.dataTransfer.files)].slice(0, 15)); }}>
          Drag &amp; drop files here or{" "}
          <button type="button" className="text-[#0073AA] underline" onClick={() => document.getElementById("cf7-picker")?.click()}>browse</button>
          <input id="cf7-picker" type="file" multiple accept=".pdf,.jpeg,.png,.jpg,.gif" className="hidden" onChange={(e) => { const l = e.target.files; if (l) setFiles((f) => [...f, ...Array.from(l)].slice(0, 15)); e.target.value = ""; }} />
          <input ref={fileInput} name="mfile-938" type="file" multiple className="hidden" readOnly />
        </div>
        {files.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between rounded border border-slate-200 px-2 py-1">
                <span className="truncate">{f.name}</span>
                <button type="button" className="text-red-600" onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}>×</button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <label className="mb-1 block text-sm font-medium text-slate-700">Signature <i className="not-italic text-red-600">*</i></label>
        <canvas ref={canvas} width={600} height={160} className="w-full max-w-[600px] touch-none rounded border border-slate-300"
          onPointerDown={(e) => { drawing.current = true; const [x, y] = pos(e); const ctx = e.currentTarget.getContext("2d")!; ctx.beginPath(); ctx.moveTo(x, y); e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => { if (!drawing.current) return; const [x, y] = pos(e); const ctx = e.currentTarget.getContext("2d")!; ctx.lineTo(x, y); ctx.stroke(); }}
          onPointerUp={(e) => { drawing.current = false; setSig(e.currentTarget.toDataURL("image/png")); }} />
        <input type="hidden" name="signature-337" value={sig} />
        <button type="button" className="mt-1 text-xs text-slate-600 underline" onClick={clear}>Clear</button>
        <p className="mt-2 text-sm text-slate-600">By submitting, I declare the information provided is true and correct to the best of my knowledge.</p>
      </section>
    </>
  );
}
