// Client portal ([mm_doc_portal] + Fact Find shell + assigned forms + messages).
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { authPortal, docFiles, logEvent } from "../cases";
import { factFindSchema, formSchema, portalForms, prefillFromCase } from "../forms/service";
import { fmtLong, firstWord } from "../util";
import FormRunner from "./FormRunner";
import Summary from "./Summary";
import DocUploader from "./DocUploader";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const STATUS_CHIP: Record<string, string> = {
  Pending: "bg-[#fff7da] border-[#fde7a4] text-[#8a6a00]",
  Received: "bg-[#e9f5ff] border-[#bfe3ff] text-[#0b5ea7]",
  Accepted: "bg-[#e8f9ef] border-[#bfead0] text-[#166534]",
  Rejected: "bg-[#ffe9e9] border-[#ffc9c9] text-[#9f1239]",
};

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto my-7 max-w-[980px] px-3.5 font-sans text-[#111]">{children}</div>;
}
function ErrorBox({ msg }: { msg: string }) {
  return (
    <Shell>
      <div className="rounded-2xl border border-[#f1e6ce] bg-gradient-to-b from-[#fffaf2] to-white px-5 py-5 shadow-[0_10px_30px_rgba(152,118,51,.08)]">
        <h2 className="text-3xl font-extrabold text-[#987633]">Document Checklist</h2>
        <p className="mt-2 text-slate-700">{msg}</p>
      </div>
    </Shell>
  );
}

function greetingName(c: { app1Name: string; app2Name: string; legacyName: string; ffDraft: unknown }) {
  const norm = (s: string) => {
    s = (s || "").trim();
    return ["n/a", "na", "none", "nil", "-", "not applicable"].includes(s.toLowerCase()) ? "" : s.replace(/\s+/g, " ");
  };
  const d = (c.ffDraft || {}) as Record<string, unknown>;
  const a1 = c.app1Name.trim() || String(d.applicant1_fullname ?? "").trim();
  const a2 = c.app2Name.trim() || String(d.applicant2_fullname ?? "").trim();
  const names: string[] = [];
  for (const n of [firstWord(norm(a1)), firstWord(norm(a2))]) if (n && !names.some((x) => x.toLowerCase() === n.toLowerCase())) names.push(n);
  if (names.length) return names.length === 1 ? names[0] : `${names[0]} and ${names[1]}`;
  return firstWord(norm(c.legacyName)) || "there";
}

export default async function Portal({ searchParams, basePath = "/portal" }: { searchParams: SP; basePath?: string }) {
  const caseRaw = one(searchParams.mm_case) || one(searchParams.case);
  const key = one(searchParams.mm_key) || one(searchParams.token);
  if ((!searchParams.mm_case || !searchParams.mm_key) && caseRaw && key) {
    const q = new URLSearchParams({ mm_case: caseRaw, mm_key: key });
    if (one(searchParams.step)) q.set("step", one(searchParams.step));
    redirect(`${basePath}?${q.toString()}`);
  }
  if (!caseRaw || !parseInt(caseRaw, 10)) return <ErrorBox msg="Invalid link." />;
  const c = await authPortal(caseRaw, key, { allowClosed: true });
  if (!c) return <ErrorBox msg="Invalid or expired link." />;
  if (c.portalClosed) return <ErrorBox msg="This secure portal is now closed. If you need access again, please contact us and we will re-open it for you." />;

  let step = one(searchParams.step);
  const edit = one(searchParams.edit) === "1";
  const showFf = c.showFactfind;
  const showDocs = c.showDocuments;
  const forms = await portalForms(c.id);
  const fm = /^form-(\d+)$/.exec(step);
  let formId = fm && forms.some((f) => f.id === Number(fm[1])) ? Number(fm[1]) : 0;
  if (showFf && (showDocs || forms.length) && step === "") step = "factfind";
  if (!showFf && !showDocs && !forms.length) return <ErrorBox msg="This portal has no sections enabled yet." />;
  if (!showFf && !showDocs && forms.length && !formId) { formId = forms[0].id; step = `form-${formId}`; }

  const base = (extra: Record<string, string>) => `${basePath}?${new URLSearchParams({ mm_case: String(c.id), mm_key: key, ...extra }).toString()}`;
  const total = c.documents.length;
  const done = c.documents.filter((d) => d.status === "Received" || d.status === "Accepted").length;
  const pct = total ? Math.round((100 * done) / Math.max(1, total)) : 0;
  const onDocs = !formId && showDocs && (step !== "factfind" || !showFf);
  const curForm = forms.find((f) => f.id === formId);
  const heroTitle = curForm ? curForm.title : onDocs ? "Document Checklist" : "Fact Find";
  const tabsCount = (showFf ? 1 : 0) + (showDocs ? 1 : 0) + forms.length;
  const curTab = formId ? `form-${formId}` : step === "factfind" ? "factfind" : showDocs ? "docs" : "factfind";
  const msgs = await prisma.caseMessage.findMany({ where: { caseId: c.id }, orderBy: { createdAt: "asc" } });

  // ---- Fact Find section ----
  let ffBlock: React.ReactNode = null;
  if (!formId && showFf && (step === "factfind" || (!showDocs && !forms.length))) {
    const lastOpen = await prisma.caseEvent.findFirst({ where: { caseId: c.id, type: "open" }, orderBy: { createdAt: "desc" } });
    if (!lastOpen || Date.now() - lastOpen.createdAt.getTime() > 30 * 60_000) await logEvent(c.id, "open", "Client opened portal", "client");
    const ff = await factFindSchema();
    const draft = (c.ffDraft && typeof c.ffDraft === "object" ? c.ffDraft : {}) as Record<string, unknown>;
    if (c.ffDone && !edit) {
      const latest = await prisma.factFindSubmission.findFirst({ where: { caseId: c.id }, orderBy: { createdAt: "desc" } });
      ffBlock = (
        <div className="mx-auto my-4 rounded-xl bg-white p-4 shadow-[0_6px_20px_rgba(0,0,0,.05)]">
          <h3 className="mb-2 text-lg font-semibold">Fact Find — Completed</h3>
          <p className="text-slate-600">Thanks! You can still edit and re-submit while your portal link is active.</p>
          <div className="my-2 flex flex-wrap gap-2">
            <Link className="rounded-lg bg-[#987633] px-3 py-2.5 font-semibold text-white" href={base({ step: "factfind", edit: "1" })}>Edit &amp; Re-submit</Link>
            {latest && <span className="self-center text-xs text-slate-500">Submitted {fmtLong(latest.createdAt)}</span>}
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-[#7a5f28]">Show summary</summary>
            <div className="mt-3"><Summary schema={ff.schema} values={draft} /></div>
          </details>
        </div>
      );
    } else {
      const values = prefillFromCase(ff.schema, c, draft);
      ffBlock = (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-3 sm:p-5">
          <FormRunner schema={ff.schema} values={values} cfg={{ formId: "ff", caseId: c.id, token: key, title: ff.title }} />
        </div>
      );
    }
  }

  // ---- Assigned form ----
  let formBlock: React.ReactNode = null;
  if (curForm) {
    const schema = formSchema(curForm.form);
    let st = curForm.state;
    if (!st.openedAt) {
      st = await prisma.caseForm.update({ where: { id: st.id }, data: { openedAt: new Date() } });
      await logEvent(c.id, "form_open", `Client opened "${curForm.title}"`, "client");
    }
    const draft = (st.draft && typeof st.draft === "object" ? st.draft : {}) as Record<string, unknown>;
    if (st.submittedAt && !edit) {
      formBlock = (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600 text-xl text-white">✓</div>
          <h3 className="text-lg font-semibold">{curForm.title} — submitted</h3>
          <p className="text-sm text-slate-500">Received {fmtLong(st.submittedAt)}. Thank you!</p>
          {schema.settings.allow_edit ? (
            <p className="mt-3"><Link className="rounded-lg px-4 py-2 font-semibold text-white" style={{ background: schema.settings.accent }} href={base({ step: `form-${curForm.id}`, edit: "1" })}>Edit &amp; re-submit</Link></p>
          ) : null}
          <details className="mt-4 text-left"><summary className="cursor-pointer text-[#7a5f28]">View my answers</summary><div className="mt-3"><Summary schema={schema} values={draft} /></div></details>
        </div>
      );
    } else {
      formBlock = (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-3 sm:p-5">
          <FormRunner schema={schema} values={prefillFromCase(schema, c, draft)} cfg={{ formId: curForm.id, caseId: c.id, token: key, title: curForm.title }} />
        </div>
      );
    }
  }

  return (
    <Shell>
      <div className="rounded-2xl border border-[#f1e6ce] bg-gradient-to-b from-[#fffaf2] to-white px-5 pb-3.5 pt-5 shadow-[0_10px_30px_rgba(152,118,51,.08)]">
        <h2 className="flex items-center gap-2.5 text-[clamp(24px,3.5vw,34px)] font-extrabold tracking-wide text-[#987633]"><span aria-hidden>👋</span>{heroTitle}</h2>
        <p className="mt-1.5 text-[clamp(14px,2.2vw,18px)] text-gray-700">
          Hi <strong className="bg-gradient-to-r from-[#7a5a00] to-[#c8a24e] bg-clip-text font-extrabold text-transparent">{greetingName(c)}</strong> —{" "}
          {onDocs ? "you can upload files to any item below at any time." : "your answers save automatically, so you can come back to this page whenever you like."}
        </p>
        {tabsCount > 1 && (
          <nav className="mt-3.5 flex flex-wrap gap-2.5" aria-label="Portal sections">
            {showFf && <Tab href={base({ step: "factfind" })} active={curTab === "factfind"}>Fact Find{c.ffDone ? " ✓" : ""}</Tab>}
            {forms.map((f) => <Tab key={f.id} href={base({ step: `form-${f.id}` })} active={curTab === `form-${f.id}`}>{f.title}{f.status === "submitted" ? " ✓" : ""}</Tab>)}
            {showDocs && <Tab href={base({ step: "docs" })} active={curTab === "docs"}>Documents</Tab>}
          </nav>
        )}
      </div>

      {formBlock}
      {ffBlock}

      {showDocs && !c.ffDone && !formId && showFf && step === "factfind" && (
        <div className="mx-0 my-3 rounded-xl border border-l-4 border-[#ececec] border-l-[#f5c66b] bg-[#fff8e6] px-4 py-3">
          <strong>Tip:</strong> You can start uploading documents any time from the <Link className="text-[#7a5a00] underline" href={base({ step: "docs" })}>Documents</Link> tab.
        </div>
      )}

      {onDocs && (
        <div className="mt-4">
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {["Pending", "Rejected", "Received", "Accepted"].map((s) => <span key={s} className={`rounded-full border px-2.5 py-1 text-xs ${STATUS_CHIP[s]}`}>{s}</span>)}
            <span className="rounded-full border border-[#e6e6e6] bg-[#f7f7f7] px-2.5 py-1 text-xs text-[#444]">Progress: {done}/{total} ({pct}%)</span>
          </div>
          <div className="overflow-hidden rounded-[14px] border border-[#ececec] bg-white shadow-[0_8px_24px_rgba(0,0,0,.05)]">
            <table className="w-full border-collapse text-sm">
              <thead className="hidden md:table-header-group">
                <tr className="bg-[#fafafa] text-left text-[#344054]">
                  <th className="w-[34%] px-3 py-2.5 font-semibold">Item</th>
                  <th className="w-[15%] px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Notes</th>
                  <th className="w-[36%] px-3 py-2.5 font-semibold">Upload / Files</th>
                </tr>
              </thead>
              <tbody>
                {c.documents.map((d) => (
                  <tr key={d.id} className="block border-b border-[#f0f0f0] align-top last:border-0 md:table-row">
                    <td className="block px-3 py-2.5 md:table-cell"><strong>{d.label}</strong></td>
                    <td className="block px-3 py-1 md:table-cell md:py-2.5"><span className={`rounded-full border px-2.5 py-1 text-xs ${STATUS_CHIP[d.status] ?? ""}`}>{d.status}</span></td>
                    <td className="block whitespace-pre-line px-3 py-1 md:table-cell md:py-2.5">{d.note ? d.note : <span className="text-xs text-[#667085]">— No notes —</span>}</td>
                    <td className="block px-3 py-2.5 md:table-cell">
                      <DocUploader
                        caseId={c.id}
                        itemId={d.id}
                        mmKey={key}
                        label={d.label}
                        existing={docFiles(d).map((f) => ({ name: f.name, url: f.fileId ? `/api/portal/file?mm_case=${c.id}&mm_key=${encodeURIComponent(key)}&id=${f.fileId}` : f.url || "#" }))}
                      />
                    </td>
                  </tr>
                ))}
                {!c.documents.length && <tr><td className="px-3 py-4 text-sm text-slate-500" colSpan={4}>No documents have been requested yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div id="messages" className="mx-auto mt-5 max-w-[980px]">
        <h3 className="mb-2 text-lg font-semibold">Questions &amp; Messages</h3>
        {one(searchParams.sent) === "1" && <p className="mb-2 text-sm text-emerald-700">Message sent — we&apos;ll get back to you soon.</p>}
        <div className="rounded-xl border border-gray-200 bg-white p-2.5">
          {!msgs.length ? (
            <div className="m-1 text-xs text-slate-500">No messages yet.</div>
          ) : (
            msgs.map((m) => (
              <div key={m.id} className={`mt-2 flex flex-col ${m.by === "admin" ? "items-end" : "items-start"}`}>
                <div className={`max-w-[75%] whitespace-pre-line rounded-2xl px-3 py-2.5 ${m.by === "admin" ? "rounded-tr-md bg-[#987633] text-white" : "rounded-tl-md border border-[#eef2f7] bg-[#f8fafc]"}`}>{m.text}</div>
                <div className="mx-0.5 my-1 text-[11px] text-slate-500">{m.by === "admin" ? "Admin" : "You"} · {fmtLong(m.createdAt)}</div>
              </div>
            ))
          )}
        </div>
        <form method="post" action="/api/portal/message" className="mt-2">
          <input type="hidden" name="mm_case" value={c.id} />
          <input type="hidden" name="mm_key" value={key} />
          <input type="hidden" name="step" value={step} />
          <textarea name="message_text" required placeholder="Ask a question…" className="min-h-[90px] w-full rounded-xl border border-gray-300 p-2.5" />
          <div className="mt-2"><button className="rounded-xl bg-[#987633] px-3 py-2.5 font-semibold text-white" type="submit">Send Message</button></div>
        </form>
      </div>
    </Shell>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`inline-block rounded-full border px-4 py-2 font-semibold shadow-[0_2px_6px_rgba(0,0,0,.04)] transition hover:-translate-y-px ${active ? "border-[#f5d48a] bg-[#fff6df] text-[#7a5a00]" : "border-[#e6e1d5] bg-white text-gray-700"}`}>
      {children}
    </Link>
  );
}
