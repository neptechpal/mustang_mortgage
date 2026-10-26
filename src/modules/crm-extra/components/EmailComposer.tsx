"use client";
// Case "Email (Zoho)" composer (admin.php box + admin.inline.js).
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Link2, ListChecks, Send } from "lucide-react";
import { Alert, Field, buttonStyles, checkboxStyles, cn, inputStyles, selectStyles, textareaStyles } from "@/components/admin/ui";
import { useToast } from "../ui/client";
import { emailSend, emailSendPending, emailTemplate } from "../actions/email";

const splitList = (s: string) =>
  s
    .split(/[;,]/)
    .map((x) => x.trim())
    .filter(Boolean);

export default function EmailComposer({
  caseId,
  app1,
  app2,
  portal,
  templates,
  connected,
}: {
  caseId: number;
  app1: string;
  app2: string;
  portal: string;
  templates: { id: number; label: string }[];
  connected: boolean;
}) {
  const router = useRouter();
  const { show, node } = useToast();
  const [pending, start] = useTransition();
  const [to, setTo] = useState([app1, app2].filter(Boolean).join(", "));
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("Update from Mustang Mortgage");
  const [tpl, setTpl] = useState("");
  const [body, setBody] = useState("");

  const togglePick = (email: string, on: boolean) => {
    const cur = splitList(to);
    const has = cur.some((e) => e.toLowerCase() === email.toLowerCase());
    if (on && !has) cur.push(email);
    const next = on ? cur : cur.filter((e) => e.toLowerCase() !== email.toLowerCase());
    setTo(next.join(", "));
  };
  const done = (r: { ok: boolean; error?: string }) => {
    if (r.ok) {
      show("Sent");
      router.refresh();
    } else show("Failed" + (r.error ? `: ${r.error}` : ""), true);
  };

  const picks = [
    ["Applicant 1", app1],
    ["Applicant 2", app2],
  ].filter(([, e]) => e);

  return (
    <div className="space-y-4">
      {!connected && (
        <Alert tone="warning" title="Not connected to Zoho">
          Go to MM CRM settings and connect. (Emails will be sent via SMTP.)
        </Alert>
      )}
      <Field label="To">
        <input className={inputStyles} value={to} onChange={(e) => setTo(e.target.value)} placeholder="email1@example.com, email2@example.com" />
        {picks.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {picks.map(([l, e]) => {
              const on = splitList(to).some((x) => x.toLowerCase() === e.toLowerCase());
              return (
                <label
                  key={l}
                  className={cn(
                    "inline-flex max-w-full cursor-pointer items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                    on ? "border-brand-200 bg-brand-50 text-brand-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                  )}
                >
                  <input type="checkbox" className={checkboxStyles} checked={on} onChange={(ev) => togglePick(e, ev.target.checked)} />
                  <span className="truncate">
                    {l} <span className="text-slate-500">({e})</span>
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="CC" hint="Comma or semicolon separated">
          <input className={inputStyles} value={cc} onChange={(e) => setCc(e.target.value)} />
        </Field>
        <Field label="BCC" hint="Comma or semicolon separated">
          <input className={inputStyles} value={bcc} onChange={(e) => setBcc(e.target.value)} />
        </Field>
      </div>
      <Field label="Subject">
        <input className={inputStyles} value={subject} onChange={(e) => setSubject(e.target.value)} />
      </Field>
      <Field label="Template" hint={<>Placeholders (e.g. {"{{greeting_names}}"}) are merged on insert and on send.</>}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            className={cn(selectStyles, "min-w-0 flex-1")}
            value={tpl}
            onChange={(e) => {
              setTpl(e.target.value);
              const t = templates.find((x) => String(x.id) === e.target.value);
              if (t) setSubject(t.label);
            }}
          >
            <option value="">— Select a template —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={buttonStyles({ variant: "secondary", size: "md", className: "h-[38px]" })}
            onClick={() =>
              start(async () => {
                const r = await emailTemplate(Number(tpl), caseId);
                if (!r.ok) return show(r.error || "Could not load template", true);
                setSubject(r.subject || subject);
                setBody(r.body || "");
              })
            }
          >
            <FileText /> Insert
          </button>
        </div>
      </Field>
      <Field label="Message">
        <textarea className={cn(textareaStyles, "min-h-[200px] font-[inherit]")} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message (plain text or HTML)…" />
      </Field>
      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <button type="button" className={buttonStyles({ variant: "primary" })} disabled={pending} onClick={() => start(async () => done(await emailSend(caseId, { to, cc, bcc, subject, body })))}>
          <Send /> Send via Zoho
        </button>
        <button type="button" className={buttonStyles({ variant: "secondary" })} disabled={pending} onClick={() => start(async () => done(await emailSendPending(caseId, { to, cc, bcc, subject })))}>
          <ListChecks /> Insert pending list &amp; send
        </button>
        <button
          type="button"
          className={buttonStyles({ variant: "secondary" })}
          disabled={pending}
          onClick={() => {
            if (!portal) return show("No portal link found. Create/enable the portal link first.", true);
            const link = portal.replace(/"/g, "&quot;");
            const html = `<p>Hi,</p><p>Your secure client portal is ready. You can complete your Fact Find and upload documents here:</p><p><a href="${link}" target="_blank" rel="noopener">Open your secure portal</a></p><p>If you have any questions, just reply to this email.</p>`;
            const subj = subject && subject !== "Update from Mustang Mortgage" ? subject : "Your secure Mustang Mortgage portal";
            start(async () => done(await emailSend(caseId, { to, cc, bcc, subject: subj, body: html })));
          }}
        >
          <Link2 /> Send Portal Link
        </button>
      </div>
      {node}
    </div>
  );
}
