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
      <div className="mw-upload__files">
        {files.length ? (
          files.map((f, i) => (
            <a key={i} href={f.url} className="mw-upload__file">✓ {f.name}</a>
          ))
        ) : (
          <span className="mw-portal__meta">No files yet</span>
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
        className={`mw-upload__dropzone${drag || ready ? " is-ready" : ""}`}
      >
        <strong>Drag &amp; drop</strong> files here, or <strong>click to choose</strong>
        <small className="mw-upload__hint">PDF, JPG, PNG, DOCX — Select multiple files, or add more files before uploading</small>
      </div>
      <input ref={input} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      <div className="mw-upload__queue" aria-live="polite">
        {buffer.map((f) => (
          <span key={keyOf(f)} className="mw-upload__queued">
            <span>{f.name} ({humanSize(f.size)})</span>
            <button type="button" aria-label={`Remove ${f.name}`} className="mw-upload__remove" onClick={() => setBuffer((b) => b.filter((x) => keyOf(x) !== keyOf(f)))}>×</button>
          </span>
        ))}
      </div>
      <div className="mw-upload__actions">
        <button type="button" disabled={!ready || busy} onClick={upload} className="mw-btn mw-btn--secondary mw-btn--sm">
          {busy ? "Uploading..." : ready ? `Upload ${buffer.length} file${buffer.length > 1 ? "s" : ""}` : "Upload files"}
        </button>
        {ready && <span className="mw-upload__ready">Files selected: click &quot;Upload files&quot;.</span>}
        {!ready && <span className="mw-portal__meta">You can keep uploading more anytime.</span>}
      </div>
      {toast && <div role="status" className={`mw-upload__toast${toast.ok ? " is-success" : " is-error"}`}>{toast.msg}</div>}
    </div>
  );
}
