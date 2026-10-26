"use client";
// Portal upload drop zone (portal.inline.js): queue files, dedupe, remove, upload.
import { useEffect, useRef, useState } from "react";

function humanSize(bytes: number) {
  if (bytes === 0) return "0 B";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Number((bytes / Math.pow(1024, i)).toFixed(1)) + " " + ["B", "KB", "MB", "GB", "TB"][i];
}
const keyOf = (f: File) => [f.name, f.size, f.lastModified].join("|");

export default function DocUploader({ caseId, itemId, mmKey, label, existing }: { caseId: number; itemId: number; mmKey: string; label: string; existing: { name: string; url: string }[] }) {
  const [buffer, setBuffer] = useState<File[]>([]);
  const [files, setFiles] = useState(existing);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!buffer.length) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = "You selected files but did not upload them."; return e.returnValue; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [buffer.length]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  function add(list: FileList | null) {
    if (!list) return;
    setBuffer((b) => {
      const seen = new Set(b.map(keyOf));
      const next = [...b];
      for (const f of Array.from(list)) if (!seen.has(keyOf(f))) { seen.add(keyOf(f)); next.push(f); }
      return next;
    });
  }

  async function upload() {
    if (!buffer.length) { setToast({ msg: "Please add files first", ok: false }); return; }
    setBusy(true);
    const fd = new FormData();
    fd.append("case_id", String(caseId));
    fd.append("item_id", String(itemId));
    fd.append("mm_key", mmKey);
    buffer.forEach((f) => fd.append("files[]", f));
    try {
      const r = await fetch("/api/portal/upload", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (j?.success && j.data?.files) {
        setFiles((x) => [...x, ...j.data.files]);
        setBuffer([]);
        setToast({ msg: "Uploaded", ok: true });
      } else setToast({ msg: j?.data?.message || "Upload failed", ok: false });
    } catch {
      setToast({ msg: "Network error", ok: false });
    } finally {
      setBusy(false);
    }
  }

  const ready = buffer.length > 0;
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap gap-1.5">
        {files.length ? (
          files.map((f, i) => (
            <a key={i} href={f.url} className="max-w-full truncate rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100">✓ {f.name}</a>
          ))
        ) : (
          <span className="text-xs text-slate-500">No files yet</span>
        )}
      </div>
      <div
        tabIndex={0}
        role="button"
        aria-label={`Choose files to upload for ${label}`}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }}
        onDragEnter={(e) => { e.preventDefault(); setDrag(true); }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}
        className={`cursor-pointer rounded-xl border-[1.5px] border-dashed p-2.5 text-center text-sm outline-none ${drag || ready ? "border-[#f5d48a] bg-[#fffaf2]" : "border-[#e6e1d5] bg-white"}`}
      >
        <strong>Drag &amp; drop</strong> files here, or <strong>click to choose</strong>
        <small className="mt-1 block text-xs text-slate-500">PDF, JPG, PNG, DOCX — Select multiple files, or add more files before uploading</small>
      </div>
      <input ref={input} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      <div className="mt-1.5 flex min-h-[22px] flex-wrap gap-1.5" aria-live="polite">
        {buffer.map((f) => (
          <span key={keyOf(f)} className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-[#f5d48a] bg-[#fff8e6] px-2.5 py-1 text-xs font-semibold text-[#7a5a00]">
            {f.name} ({humanSize(f.size)})
            <button type="button" aria-label={`Remove ${f.name}`} className="text-sm leading-none text-red-700 hover:text-red-900" onClick={() => setBuffer((b) => b.filter((x) => keyOf(x) !== keyOf(f)))}>×</button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" disabled={!ready || busy} onClick={upload} className={`rounded-lg bg-[#987633] px-3.5 py-2 text-sm font-bold text-white shadow disabled:opacity-50 ${ready && !busy ? "animate-pulse" : ""}`}>
          {busy ? "Uploading..." : ready ? `Upload ${buffer.length} file${buffer.length > 1 ? "s" : ""}` : "Upload files"}
        </button>
        {ready && <span className="text-xs font-semibold text-[#7a5a00]">Files selected: click &quot;Upload files&quot;.</span>}
        {!ready && <span className="text-xs text-slate-500">You can keep uploading more anytime.</span>}
      </div>
      {toast && <div className={`fixed bottom-4 right-4 z-50 rounded-lg px-3.5 py-2.5 text-sm text-white shadow-lg ${toast.ok ? "bg-green-700" : "bg-[#b00020]"}`}>{toast.msg}</div>}
    </div>
  );
}
