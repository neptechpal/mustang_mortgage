"use client";

import { useEffect, useId, useMemo, useRef } from "react";
import type { Cf7ClientProps, Cf7Response } from "./types";

// Browser side of the Contact Form 7 replica: drag & drop multi-upload
// (CodeDropz markup), digital signature pad, the form's own inline scripts,
// AJAX submit to /api/forms/<id> and CF7's response/validation UI.

const bytesToSize = (b: number) => {
  if (b === 0) return "0";
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return (b / Math.pow(1024, i)).toFixed(i ? 2 : 0).replace(/\.00$/, "") + ["Bytes", "KB", "MB", "GB"][i];
};
const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

type Upload = { input: HTMLInputElement; name: string; files: File[] };

function runTemplateScript(code: string) {
  // Template scripts wait for DOMContentLoaded, which has already fired.
  const doc = new Proxy(document, {
    get(target, prop) {
      if (prop === "addEventListener")
        return (ev: string, fn: EventListener, o?: AddEventListenerOptions) =>
          ev === "DOMContentLoaded" ? fn(new Event("DOMContentLoaded")) : target.addEventListener(ev, fn, o);
      const v = Reflect.get(target, prop, target);
      return typeof v === "function" ? v.bind(target) : v;
    },
  });
  try {
    new Function("document", code)(doc);
  } catch (e) {
    console.error("cf7 form script failed", e);
  }
}

function setupSignature(root: HTMLElement) {
  const disposers: (() => void)[] = [];
  root.querySelectorAll<HTMLElement>(".dscf7_signature").forEach((wrap) => {
    const canvas = wrap.querySelector<HTMLCanvasElement>("canvas.digital_signature-pad");
    const hidden = wrap.querySelector<HTMLInputElement>("input.dscf7-signature");
    if (!canvas || !hidden) return;
    const ctx = canvas.getContext("2d")!;
    const back = canvas.getAttribute("backcolor") || "#dddddd";
    const pen = canvas.getAttribute("color") || "#000000";
    let dirty = false;
    const clear = () => {
      ctx.fillStyle = back;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      dirty = false;
      hidden.value = "";
    };
    clear();
    let drawing = false;
    let last: { x: number; y: number } | null = null;
    const pos = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) * canvas.width) / r.width, y: ((e.clientY - r.top) * canvas.height) / r.height };
    };
    const down = (e: PointerEvent) => {
      e.preventDefault();
      drawing = true;
      last = pos(e);
      canvas.setPointerCapture(e.pointerId);
      ctx.fillStyle = pen;
      ctx.beginPath();
      ctx.arc(last.x, last.y, 1.25, 0, Math.PI * 2);
      ctx.fill();
      dirty = true;
    };
    const move = (e: PointerEvent) => {
      if (!drawing || !last) return;
      const p = pos(e);
      ctx.strokeStyle = pen;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
    };
    const up = () => {
      if (!drawing) return;
      drawing = false;
      last = null;
      if (dirty) hidden.value = canvas.toDataURL("image/png");
      hidden.closest(".wpcf7-form-control-wrap")?.querySelector(".wpcf7-not-valid-tip")?.remove();
    };
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);
    const btn = wrap.querySelector<HTMLInputElement>(".clearButton");
    btn?.addEventListener("click", clear);
    (wrap as HTMLElement & { _mmClear?: () => void })._mmClear = clear;
    disposers.push(() => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      btn?.removeEventListener("click", clear);
    });
  });
  return () => disposers.forEach((d) => d());
}

function setupUploads(root: HTMLElement, messages: Record<string, string>, uploads: Upload[]) {
  const disposers: (() => void)[] = [];
  root.querySelectorAll<HTMLInputElement>("input.wpcf7-drag-n-drop-file").forEach((input) => {
    const wrapper = input.closest(".codedropz-upload-wrapper") as HTMLElement;
    const handler = wrapper.querySelector<HTMLElement>(".codedropz-upload-handler")!;
    const counter = wrapper.querySelector<HTMLElement>(".dnd-upload-counter span");
    const types = (input.dataset.type || "").split("|").filter(Boolean);
    const limit = Number(input.dataset.limit || 10485760);
    const max = Number(input.dataset.max || 10);
    const up: Upload = { input, name: input.name, files: [] };
    uploads.push(up);

    const refreshCounter = () => counter && (counter.textContent = String(up.files.length));
    const showMsg = (msg: string) => {
      wrapper.querySelector("span.has-error-msg")?.remove();
      if (!msg) return;
      const el = document.createElement("span");
      el.className = "has-error-msg";
      el.textContent = msg;
      wrapper.appendChild(el);
    };
    const addFiles = (list: FileList | File[]) => {
      showMsg("");
      for (const file of Array.from(list)) {
        const ext = (file.name.split(".").pop() || "").toLowerCase();
        const status = document.createElement("div");
        status.className = "dnd-upload-status";
        status.innerHTML =
          `<div class="dnd-upload-image"><span class="file"></span></div><div class="dnd-upload-details">` +
          `<span class="name"><span>${escapeHtml(file.name)}</span><em>(${bytesToSize(file.size)})</em></span>` +
          `<a href="#" title="Remove" class="remove-file"><span class="dnd-icon-remove"></span></a>` +
          `<span class="dnd-progress-bar"><span class="complete" style="width:100%">100% </span></span></div>`;
        if (up.files.length >= max) {
          showMsg(`Note : Some of the files are not uploaded ( Only ${max} files allowed )`);
          break;
        }
        let error = "";
        if (types.length && !types.includes(ext)) error = "Uploaded file is not allowed for file type";
        else if (file.size > limit) error = "Uploaded file is too large";
        if (error) {
          status.querySelector(".dnd-progress-bar")?.remove();
          status.querySelector(".dnd-upload-details")!.insertAdjacentHTML("beforeend", `<span class="has-error">${error}</span>`);
          wrapper.appendChild(status);
          status.querySelector(".remove-file")!.addEventListener("click", (e) => {
            e.preventDefault();
            status.remove();
          });
          continue;
        }
        status.classList.add("complete");
        up.files.push(file);
        wrapper.appendChild(status);
        status.querySelector(".remove-file")!.addEventListener("click", (e) => {
          e.preventDefault();
          up.files = up.files.filter((f) => f !== file);
          status.remove();
          refreshCounter();
          if (!up.files.length) showMsg("");
        });
      }
      refreshCounter();
      wrapper.classList.remove("invalid");
      wrapper.closest(".wpcf7-form-control-wrap")?.querySelector(".wpcf7-not-valid-tip")?.remove();
    };

    const stop = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    const over = (e: Event) => {
      stop(e);
      handler.classList.add("codedropz-dragover");
    };
    const leave = (e: Event) => {
      stop(e);
      handler.classList.remove("codedropz-dragover");
    };
    const drop = (e: DragEvent) => {
      leave(e);
      if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
    };
    const browse = (e: Event) => {
      e.preventDefault();
      input.click();
    };
    const change = () => {
      if (input.files?.length) addFiles(input.files);
      input.value = "";
    };
    ["drag", "dragstart"].forEach((ev) => handler.addEventListener(ev, stop));
    ["dragover", "dragenter"].forEach((ev) => handler.addEventListener(ev, over));
    ["dragleave", "dragend"].forEach((ev) => handler.addEventListener(ev, leave));
    handler.addEventListener("drop", drop);
    const btn = handler.querySelector(".cd-upload-btn");
    btn?.addEventListener("click", browse);
    input.addEventListener("change", change);
    disposers.push(() => {
      btn?.removeEventListener("click", browse);
      input.removeEventListener("change", change);
      handler.removeEventListener("drop", drop);
    });
  });
  return () => disposers.forEach((d) => d());
}

export default function Cf7FormClient(props: Cf7ClientProps) {
  const { formId, bodyHtml, scripts, messages } = props;
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const unitTag = `wpcf7-f${formId}-o${reactId}`;
  const formRef = useRef<HTMLFormElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const uploadsRef = useRef<Upload[]>([]);
  const busy = useRef(false);
  const inner = useMemo(() => ({ __html: bodyHtml }), [bodyHtml]);

  useEffect(() => {
    const form = formRef.current!;
    uploadsRef.current = [];
    const d1 = setupUploads(form, messages, uploadsRef.current);
    const d2 = setupSignature(form);
    scripts.forEach(runTemplateScript);
    const clearTip = (e: Event) => {
      const wrap = (e.target as HTMLElement).closest(".wpcf7-form-control-wrap");
      if (!wrap) return;
      wrap.querySelector(".wpcf7-not-valid-tip")?.remove();
      wrap.querySelectorAll(".wpcf7-not-valid").forEach((el) => {
        el.classList.remove("wpcf7-not-valid");
        el.setAttribute("aria-invalid", "false");
      });
    };
    form.addEventListener("change", clearTip);
    return () => {
      d1();
      d2();
      form.removeEventListener("change", clearTip);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyHtml]);

  const setStatus = (status: string, message: string) => {
    const form = formRef.current!;
    form.setAttribute("data-status", status);
    form.className = `wpcf7-form ${status}`;
    const out = form.querySelector<HTMLElement>(".wpcf7-response-output");
    if (out) {
      out.textContent = message;
      out.setAttribute("aria-hidden", message ? "false" : "true");
    }
    const sr = wrapRef.current?.querySelector(".screen-reader-response p");
    if (sr) sr.textContent = message;
  };

  const clearTips = () => {
    const form = formRef.current!;
    form.querySelectorAll(".wpcf7-not-valid-tip").forEach((el) => el.remove());
    form.querySelectorAll(".wpcf7-not-valid").forEach((el) => {
      el.classList.remove("wpcf7-not-valid");
      el.setAttribute("aria-invalid", "false");
    });
    form.querySelectorAll(".codedropz-upload-wrapper.invalid").forEach((el) => el.classList.remove("invalid"));
  };

  const markInvalid = (field: string, message: string) => {
    const form = formRef.current!;
    const wrap = form.querySelector<HTMLElement>(`.wpcf7-form-control-wrap[data-name="${CSS.escape(field)}"]`);
    if (!wrap || wrap.querySelector(".wpcf7-not-valid-tip")) return;
    wrap.querySelectorAll<HTMLElement>(".wpcf7-form-control, input, textarea, select").forEach((el) => {
      if (el.classList.contains("wpcf7-form-control")) el.classList.add("wpcf7-not-valid");
      el.setAttribute("aria-invalid", "true");
    });
    wrap.querySelector(".codedropz-upload-wrapper")?.classList.add("invalid");
    const tip = document.createElement("span");
    tip.className = "wpcf7-not-valid-tip";
    tip.setAttribute("aria-hidden", "true");
    tip.textContent = message;
    wrap.appendChild(tip);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy.current) return;
    const form = formRef.current!;
    clearTips();

    // Fields made required at runtime by the form's own scripts (applicant 2,
    // previous address/employment when < 3 years).
    const dynamic: string[] = [];
    form.querySelectorAll<HTMLInputElement>("[required]").forEach((el) => {
      const visible = !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
      const empty = el.type === "checkbox" || el.type === "radio" ? !form.querySelector(`[name="${CSS.escape(el.name)}"]:checked`) : !el.value.trim();
      const name = el.name.replace(/\[\]$/, "");
      if (visible && empty && !dynamic.includes(name)) dynamic.push(name);
    });
    if (dynamic.length) {
      dynamic.forEach((n) => markInvalid(n, messages.invalid_required || "Please fill out this field."));
      setStatus("invalid", messages.validation_error || "One or more fields have an error. Please check and try again.");
      return;
    }

    const fd = new FormData(form);
    for (const up of uploadsRef.current) {
      fd.delete(up.name);
      up.files.forEach((f) => fd.append(up.name, f, f.name));
    }
    fd.set("_wpcf7", String(formId));
    fd.set("_wpcf7_unit_tag", unitTag);
    fd.set("_url", window.location.href);

    busy.current = true;
    form.setAttribute("data-status", "submitting");
    form.classList.add("submitting");
    let res: Cf7Response;
    try {
      const r = await fetch(`/api/forms/${formId}`, { method: "POST", body: fd });
      res = (await r.json()) as Cf7Response;
    } catch {
      res = { status: "mail_failed", message: messages.mail_sent_ng || "There was an error trying to send your message. Please try again later." };
    }
    busy.current = false;
    form.classList.remove("submitting");

    const map: Record<string, string> = { mail_sent: "sent", mail_failed: "failed", validation_failed: "invalid", spam: "spam", aborted: "aborted" };
    setStatus(map[res.status] ?? "failed", res.message);
    res.invalid_fields?.forEach((f) => markInvalid(f.field, f.message));
    if (res.status === "mail_sent") {
      form.reset();
      for (const up of uploadsRef.current) {
        up.files = [];
        const wrapper = up.input.closest(".codedropz-upload-wrapper");
        wrapper?.querySelectorAll(".dnd-upload-status, span.has-error-msg").forEach((el) => el.remove());
        const c = wrapper?.querySelector(".dnd-upload-counter span");
        if (c) c.textContent = "0";
      }
      form.querySelectorAll<HTMLElement & { _mmClear?: () => void }>(".dscf7_signature").forEach((w) => w._mmClear?.());
      wrapRef.current?.dispatchEvent(new CustomEvent("wpcf7mailsent", { bubbles: true, detail: { contactFormId: formId } }));
    }
  };

  return (
    <div className="wpcf7 js" id={unitTag} lang="en-US" dir="ltr" data-wpcf7-id={formId} ref={wrapRef}>
      <div className="screen-reader-response">
        <p role="status" aria-live="polite" aria-atomic="true"></p>
        <ul></ul>
      </div>
      <form
        ref={formRef}
        action={`#${unitTag}`}
        method="post"
        className="wpcf7-form init"
        aria-label="Contact form"
        noValidate
        data-status="init"
        encType="multipart/form-data"
        onSubmit={onSubmit}
        dangerouslySetInnerHTML={inner}
        suppressHydrationWarning
      />
    </div>
  );
}
