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
import { Container } from "@/modules/web/components/ui/Container";
import "@/modules/web/styles/portal.css";

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const STATUS_CHIP: Record<string, string> = {
  Pending: "mw-portal__badge--pending",
  Received: "mw-portal__badge--received",
  Accepted: "mw-portal__badge--accepted",
  Rejected: "mw-portal__badge--rejected",
};

function Shell({ children }: { children: React.ReactNode }) {
  return <Container className="mw-portal__body">{children}</Container>;
}
function ErrorBox({ msg }: { msg: string }) {
  return (
    <Shell>
      <div className="mw-portal__panel mw-portal__empty">
        <h1 className="mw-h1">Document Checklist</h1>
        <p className="mw-portal__lede">{msg}</p>
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
        <div className="mw-portal__panel">
          <h2 className="mw-h3">Fact Find — Completed</h2>
          <p className="mw-portal__muted">Thanks! You can still edit and re-submit while your portal link is active.</p>
          <div className="mw-portal__actions">
            <Link className="mw-btn mw-btn--primary" href={base({ step: "factfind", edit: "1" })}>Edit &amp; Re-submit</Link>
            {latest && <span className="mw-portal__meta">Submitted {fmtLong(latest.createdAt)}</span>}
          </div>
          <details className="mt-3">
            <summary className="mw-portal__disclosure">Show summary</summary>
            <div className="mt-3"><Summary schema={ff.schema} values={draft} publicView /></div>
          </details>
        </div>
      );
    } else {
      const values = prefillFromCase(ff.schema, c, draft);
      ffBlock = (
        <div className="mw-portal__form">
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
        <div className="mw-portal__panel">
          <div className="mw-portal__success-mark" aria-hidden="true">✓</div>
          <h2 className="mw-h3">{curForm.title} — submitted</h2>
          <p className="mw-portal__meta">Received {fmtLong(st.submittedAt)}. Thank you!</p>
          {schema.settings.allow_edit ? (
            <p className="mt-3"><Link className="mw-btn mw-btn--primary" href={base({ step: `form-${curForm.id}`, edit: "1" })}>Edit &amp; re-submit</Link></p>
          ) : null}
          <details className="mt-4 text-left"><summary className="mw-portal__disclosure">View my answers</summary><div className="mt-3"><Summary schema={schema} values={draft} publicView /></div></details>
        </div>
      );
    } else {
      formBlock = (
        <div className="mw-portal__form">
          <FormRunner schema={schema} values={prefillFromCase(schema, c, draft)} cfg={{ formId: curForm.id, caseId: c.id, token: key, title: curForm.title }} />
        </div>
      );
    }
  }

  return (
    <Shell>
      <div className="mw-portal__intro">
        <h1 className="mw-h1">{heroTitle}</h1>
        <p className="mw-portal__lede">
          Hi <strong className="mw-portal__name">{greetingName(c)}</strong> —{" "}
          {onDocs ? "you can upload files to any item below at any time." : "your answers save automatically, so you can come back to this page whenever you like."}
        </p>
        {tabsCount > 1 && (
          <nav className="mw-portal__tabs" aria-label="Portal sections">
            {showFf && <Tab href={base({ step: "factfind" })} active={curTab === "factfind"}>Fact Find{c.ffDone ? " ✓" : ""}</Tab>}
            {forms.map((f) => <Tab key={f.id} href={base({ step: `form-${f.id}` })} active={curTab === `form-${f.id}`}>{f.title}{f.status === "submitted" ? " ✓" : ""}</Tab>)}
            {showDocs && <Tab href={base({ step: "docs" })} active={curTab === "docs"}>Documents</Tab>}
          </nav>
        )}
      </div>

      {formBlock}
      {ffBlock}

      {showDocs && !c.ffDone && !formId && showFf && step === "factfind" && (
        <div className="mw-portal__tip">
          <strong>Tip:</strong> You can start uploading documents any time from the <Link className="mw-link" href={base({ step: "docs" })}>Documents</Link> tab.
        </div>
      )}

      {onDocs && (
        <div className="mt-4">
          <div className="mw-portal__legend">
            {["Pending", "Rejected", "Received", "Accepted"].map((s) => <span key={s} className={`mw-portal__badge ${STATUS_CHIP[s]}`}>{s}</span>)}
            <span className="mw-portal__badge mw-portal__progress">Progress: {done}/{total} ({pct}%)</span>
          </div>
          <div className="mw-portal__documents">
            <table className="mw-portal__table">
              <thead className="mw-portal__table-head">
                <tr className="mw-portal__table-labels">
                  <th className="mw-portal__item-col" scope="col">Item</th>
                  <th className="mw-portal__status-col" scope="col">Status</th>
                  <th scope="col">Notes</th>
                  <th className="mw-portal__upload-col" scope="col">Upload / Files</th>
                </tr>
              </thead>
              <tbody>
                {c.documents.map((d) => (
                  <tr key={d.id} className="mw-portal__document">
                    <td className="mw-portal__cell"><strong>{d.label}</strong></td>
                    <td className="mw-portal__cell"><span className={`mw-portal__badge ${STATUS_CHIP[d.status] ?? ""}`}>{d.status}</span></td>
                    <td className="mw-portal__cell mw-portal__notes">{d.note ? d.note : <span className="mw-portal__meta">— No notes —</span>}</td>
                    <td className="mw-portal__cell">
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
                {!c.documents.length && <tr><td className="mw-portal__cell mw-portal__meta" colSpan={4}>No documents have been requested yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div id="messages" className="mw-portal__messages">
        <h2 className="mw-h3">Questions &amp; Messages</h2>
        {one(searchParams.sent) === "1" && <p className="mw-portal__sent" role="status">Message sent — we&apos;ll get back to you soon.</p>}
        <div className="mw-portal__thread">
          {!msgs.length ? (
            <div className="mw-portal__meta">No messages yet.</div>
          ) : (
            msgs.map((m) => (
              <div key={m.id} className={`mw-portal__message${m.by === "admin" ? " mw-portal__message--staff" : ""}`}>
                <div className="mw-portal__bubble">{m.text}</div>
                <div className="mw-portal__meta">{m.by === "admin" ? "Admin" : "You"} · {fmtLong(m.createdAt)}</div>
              </div>
            ))
          )}
        </div>
        <form method="post" action="/api/portal/message" className="mw-portal__message-form">
          <input type="hidden" name="mm_case" value={c.id} />
          <input type="hidden" name="mm_key" value={key} />
          <input type="hidden" name="step" value={step} />
          <label htmlFor="portal-message" className="mw-label">Ask a question</label>
          <textarea id="portal-message" name="message_text" required placeholder="Ask a question…" className="mw-textarea" />
          <div className="mt-2"><button className="mw-btn mw-btn--primary" type="submit">Send Message</button></div>
        </form>
      </div>
    </Shell>
  );
}

function Tab({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={`mw-portal__tab${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}
