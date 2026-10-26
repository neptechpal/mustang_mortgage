import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity, Calculator, CalendarClock, ChevronDown, ChevronRight, ClipboardList, Eye, FileCode2, FileText, FolderOpen, Globe, Hash, LayoutDashboard,
  Lock, Mail, NotebookPen, Phone, Printer, Send, Table2, Trash2,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { caseFacts, docFiles, loadCase, portalUrl } from "@/modules/crm/cases";
import { STAGE_COLORS, STAGES, STATUS_OPTIONS } from "@/modules/crm/constants";
import { PLACEHOLDER_CATALOG } from "@/modules/crm/email";
import { caseFormRows, factFindSchema, formSchema, statusLabel } from "@/modules/crm/forms/service";
import { getFfFormId, getFormEmailTpl, getPresets } from "@/modules/crm/options";
import { flexDoneCount } from "@/modules/crm/reminders-bridge";
import { fmtDate, fmtDateTime, money, timeAgo } from "@/modules/crm/util";
import { deleteCaseAction } from "@/modules/crm/actions";
import Summary from "@/modules/crm/components/Summary";
import { Card, Notice, chipTone } from "@/modules/crm/components/ui";
import { Toaster } from "@/modules/crm/components/Toast";
import {
  ApplicantsBox, CaseHeaderControls, CaseTabs, ChecklistBox, DealBox, EmailComposer, FormsBox, MessagesBox, PortalSections, StageSelect, StatusBox,
  type CaseTab, type DocRow, type FormRowView,
} from "@/modules/crm/components/CaseClient";
import { ActivityPanel, BorrowPanel, CommissionPanel, EmailPanel, FlexPanel, NotesPanel, RemindersPanel } from "@/modules/crm-extra/case-panels";
import { Badge, EmptyState, buttonStyles, cn, type Tone } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const EVENT_BADGE: Record<string, string> = { save: "Saved", submit: "Submitted", open: "Open", message_client: "Msg (Client)", message_admin: "Msg (Admin)" };
const EVENT_TONE: Record<string, Tone> = { save: "info", submit: "success", open: "neutral", message_client: "violet", message_admin: "brand" };
const STATUS_TONE: Record<string, Tone> = { active: "success", completed: "info", archive: "neutral", unsuccessful: "danger" };
const LOAN_TYPES: Record<string, string> = { purchase: "Purchase", refinance: "Refinance", investment: "Investment", construction: "Construction" };

function Fact({ label, children, sub, icon }: { label: string; children: React.ReactNode; sub?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="min-w-0 bg-white px-5 py-4">
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 [&_svg]:size-3.5 [&_svg]:text-slate-400">{icon}{label}</dt>
      <dd className="mt-1.5 text-[15px] font-semibold text-slate-900 tabular-nums">{children}</dd>
      {sub && <dd className="mt-1 truncate text-xs text-slate-500">{sub}</dd>}
    </div>
  );
}

function Meter({ pct, done }: { pct: number; done?: boolean }) {
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
      <i className={cn("block h-full rounded-full", done ? "bg-emerald-500" : "bg-brand-500")} style={{ width: `${Math.min(100, Math.max(pct, pct ? 4 : 0))}%` }} />
    </div>
  );
}

export default async function CasePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requireStaff();
  const { id } = await params;
  const sp = await searchParams;
  const c = await loadCase(Number(id));
  if (!c) notFound();
  const f = caseFacts(c);
  const link = await portalUrl(c, { step: "factfind" });
  const [rows, presets, tpl, ffSchema, ffId, forms, templates, msgs, events, subs, flex] = await Promise.all([
    caseFormRows(c), getPresets(), getFormEmailTpl(), factFindSchema(), getFfFormId(),
    prisma.crmForm.findMany({ where: { status: "publish" }, orderBy: { title: "asc" } }),
    prisma.emailTemplate.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.caseMessage.findMany({ where: { caseId: c.id }, orderBy: { createdAt: "asc" } }),
    prisma.caseEvent.findMany({ where: { caseId: c.id }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.factFindSubmission.findMany({ where: { caseId: c.id }, orderBy: { createdAt: "asc" } }),
    flexDoneCount(c.id),
  ]);
  const ff = rows[0];
  const [ffLab, ffTone] = statusLabel(ff.status);
  const otherOpen = rows.slice(1).filter((r) => r.status !== "submitted").length;
  const initials = ([f.a1, f.a2].filter(Boolean).map((n) => n.trim()[0]?.toUpperCase()).join("") || "C").slice(0, 2);
  const stageColor = STAGE_COLORS[f.stage] ?? "#94a3b8";

  // Forms box rows (answers rendered server-side)
  const formViews: FormRowView[] = await Promise.all(
    rows.map(async (r) => {
      const [label, tone] = statusLabel(r.status);
      const canView = r.status === "submitted" || r.status === "in_progress";
      let answers: React.ReactNode = null;
      if (canView) {
        if (r.isFf) answers = <Summary schema={ffSchema.schema} values={(c.ffDraft ?? {}) as Record<string, unknown>} />;
        else {
          const st = await prisma.caseForm.findUnique({ where: { caseId_formId: { caseId: c.id, formId: Number(r.id) } } });
          const form = forms.find((x) => x.id === r.id);
          if (st && form) answers = <Summary schema={formSchema(form)} values={(st.draft ?? {}) as Record<string, unknown>} />;
        }
      }
      return { id: String(r.id), title: r.title, isFf: r.isFf, statusLabel: label, tone, sent: r.sentAt ? fmtDateTime(r.sentAt) : "", submitted: r.submittedAt ? fmtDateTime(r.submittedAt) : "", url: r.url, canView, answers };
    }),
  );
  const ffForm = forms.find((x) => x.id === ffId);
  const formOptions = [{ value: "ff", label: "Fact Find" + (ffForm ? ` — ${ffForm.title}` : " (classic)") }, ...forms.filter((x) => x.id !== ffId).map((x) => ({ value: String(x.id), label: x.title }))];

  const docRows: DocRow[] = c.documents.map((d) => ({
    id: d.id, label: d.label, status: d.status, note: d.note,
    files: docFiles(d).map((x) => ({
      key: x.fileId || x.url || x.name, name: x.name,
      viewUrl: x.fileId ? `/api/admin/crm/files/${x.fileId}` : x.url || "#",
      dlUrl: x.fileId ? `/api/admin/crm/files/${x.fileId}?dl=1` : x.url || "#",
    })),
  }));
  const pendingDocs = c.documents.filter((d) => d.status === "Pending" || d.status === "Rejected").length;
  const openForms = formViews.filter((r) => r.tone !== "good").length;
  const zipUrl = `/api/admin/crm/cases/${c.id}/download`;

  const timeline = !events.length ? (
    <p className="py-6 text-center text-sm text-slate-500">No activity yet.</p>
  ) : (
    <ol className="max-h-[480px] overflow-auto pr-1">
      {events.map((e, i) => (
        <li key={e.id} className="relative flex gap-3 pb-4 last:pb-0">
          {i < events.length - 1 && <span className="absolute bottom-0 left-[5px] top-4 w-px bg-slate-200" aria-hidden />}
          <span className="relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-white bg-slate-300 ring-1 ring-slate-200" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={EVENT_TONE[e.type] ?? "neutral"}>{EVENT_BADGE[e.type] ?? e.type.replace(/_/g, " ").replace(/^\w/, (x) => x.toUpperCase())}</Badge>
              <time className="text-xs text-slate-400 tabular-nums">{fmtDate(e.createdAt, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</time>
            </div>
            <p className="mt-1 text-sm text-slate-700">{e.by ? <span className="font-medium text-slate-900">{e.by.replace(/^\w/, (x) => x.toUpperCase())} – </span> : ""}{e.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );

  const contacts: [string, string, string][] = [[f.a1, c.app1Email.trim(), c.app1Mobile.trim()], [f.a2, c.app2Email.trim(), c.app2Mobile.trim()]];
  const shown = contacts.filter(([, e, m]) => e || m);

  const tabs: CaseTab[] = [
    {
      id: "overview", label: "Overview", icon: <LayoutDashboard />,
      content: (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-6">
            <Card title="Applicants & portal link" description="Contact details used on emails, forms and the client portal."><ApplicantsBox caseId={c.id} closed={c.portalClosed} link={link} apps={{ title: c.title, app1Name: c.app1Name, app1Email: c.app1Email, app1Mobile: c.app1Mobile, app1Dob: c.app1Dob, app2Name: c.app2Name, app2Email: c.app2Email, app2Mobile: c.app2Mobile, app2Dob: c.app2Dob }} /></Card>
            <Card title="Notes & Reminders"><RemindersPanel caseId={c.id} /></Card>
          </div>
          <div className="min-w-0 space-y-6">
            <Card title="Case status"><StatusBox caseId={c.id} status={c.status} options={STATUS_OPTIONS} /></Card>
            <Card title="Deal value">
              <DealBox caseId={c.id} loanType={c.loanType} loanAmount={c.loanAmount} />
              <div className="mt-5 border-t border-slate-100 pt-5"><CommissionPanel caseId={c.id} /></div>
            </Card>
            <Card title="Client portal sections"><PortalSections caseId={c.id} ff={c.showFactfind} docs={c.showDocuments} /></Card>
            {s.role === "ADMIN" && (
              <section className="rounded-xl border border-red-200/80 bg-white p-5">
                <h2 className="text-[15px] font-semibold text-slate-900">Danger zone</h2>
                <p className="mt-1 text-xs text-slate-500">Permanently remove this case from the CRM. This can’t be undone.</p>
                <form action={deleteCaseAction.bind(null, c.id)} className="mt-3">
                  <ConfirmSubmit message="Delete this case permanently? Documents, notes and history will be removed. This can’t be undone." className={buttonStyles({ variant: "danger", size: "sm" })}><Trash2 /> Delete case permanently</ConfirmSubmit>
                </form>
              </section>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "docs", label: "Documents", icon: <FolderOpen />, badge: pendingDocs, count: c.documents.length,
      content: (
        <Card title="Document checklist" id="mm_items" description="Track what the client has sent. Drop files onto a row to upload on their behalf.">
          <ChecklistBox caseId={c.id} rows={docRows} presets={presets.map((p) => p.name)} />
        </Card>
      ),
    },
    {
      id: "forms", label: "Fact Find & Forms", icon: <ClipboardList />, badge: openForms, count: formViews.length,
      content: (
        <>
          <Card title="Forms & Fact Find" description="Everything sent to this client’s portal, with status and answers."><FormsBox caseId={c.id} rows={formViews} options={formOptions} tpl={tpl} /></Card>
          <Card title="Submission history" description="Every submission creates a separate HTML snapshot."
            right={
              <div className="flex gap-1.5">
                <Link className={buttonStyles({ variant: "secondary", size: "sm" })} href={`/admin/factfinds/case/${c.id}`}><Eye /> View answers</Link>
                <Link className={buttonStyles({ variant: "ghost", size: "sm" })} href={`/admin/factfinds/case/${c.id}?print=1`} target="_blank"><Printer /> Print</Link>
              </div>
            }>
            {subs.length ? (
              <ol className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/80">
                {subs.map((x, i) => (
                  <li key={x.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 tabular-nums">{i + 1}</span>
                    <span className="min-w-0 flex-1 font-medium text-slate-900 tabular-nums">{fmtDate(x.createdAt, { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                    <span className="flex flex-wrap gap-1.5">
                      {x.htmlFileId && <a className={buttonStyles({ variant: "secondary", size: "xs" })} target="_blank" href={`/api/admin/crm/files/${x.htmlFileId}`}><FileCode2 /> HTML</a>}
                      {x.legacyHtmlUrl && <a className={buttonStyles({ variant: "secondary", size: "xs" })} target="_blank" href={x.legacyHtmlUrl}><FileCode2 /> HTML</a>}
                      {x.pdfFileId && <a className={buttonStyles({ variant: "secondary", size: "xs" })} target="_blank" href={`/api/admin/crm/files/${x.pdfFileId}`}><FileText /> PDF</a>}
                      {x.legacyPdfUrl && <a className={buttonStyles({ variant: "secondary", size: "xs" })} target="_blank" href={x.legacyPdfUrl}><FileText /> PDF</a>}
                    </span>
                  </li>
                ))}
              </ol>
            ) : <EmptyState className="py-8" icon={<ClipboardList />} title="No submissions yet" description="When the client submits the Fact Find, a snapshot appears here." />}
          </Card>
        </>
      ),
    },
    {
      id: "emails", label: "Emails & Messages", icon: <Mail />, count: msgs.length,
      content: (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-6">
            <Card><EmailPanel caseId={c.id} /></Card>
            <details id="mm_email" className="group rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-5 py-4 hover:bg-slate-50/70 [&::-webkit-details-marker]:hidden">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600"><Send className="size-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">Send via site mailer <Badge>SMTP2GO</Badge></span>
                  <span className="block text-xs text-slate-500">Alternative to Zoho: sends from the website’s mail service, with HTML preview, placeholder picker, pending list and portal link.</span>
                </span>
                <ChevronDown className="size-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-slate-100 p-5">
                <EmailComposer caseId={c.id} app1={c.app1Email} app2={c.app2Email} templates={templates} placeholders={PLACEHOLDER_CATALOG} portalLink={c.portalClosed ? "" : link} closed={c.portalClosed} />
              </div>
            </details>
          </div>
          <Card title="Portal messages" id="mmcrm_ff_messages" description="Conversation with the client on their portal." className="xl:sticky xl:top-36">
            <MessagesBox caseId={c.id} msgs={msgs.map((m) => ({ id: m.id, by: m.by, text: m.text, name: m.name, when: fmtDateTime(m.createdAt) }))} />
          </Card>
        </div>
      ),
    },
    { id: "flex", label: "Flex Entry", icon: <Table2 />, content: <FlexPanel caseId={c.id} /> },
    { id: "borrow", label: "Borrowing", icon: <Calculator />, content: <BorrowPanel caseId={c.id} /> },
    { id: "notes", label: "Broker Notes", icon: <NotebookPen />, content: <Card><NotesPanel caseId={c.id} /></Card> },
    {
      id: "activity", label: "Activity", icon: <Activity />,
      content: (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Client activity" description="Uploads, fact finds and portal signals."><ActivityPanel caseId={c.id} /></Card>
          <Card title="Case timeline" description="Every save, submission and message on this case.">{timeline}</Card>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Toaster />
      <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1 text-xs text-slate-500">
        <Link href="/admin/cases" className="hover:text-slate-800">Cases</Link>
        <ChevronRight className="size-3 text-slate-400" />
        <span className="truncate text-slate-700">{f.name}</span>
      </nav>
      {sp.notice && <Notice>{sp.notice}</Notice>}

      <section className="mb-6 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${stageColor}, ${stageColor}55)` }} aria-hidden />
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-semibold text-white shadow-sm ring-4 ring-brand-50">{initials}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{f.name}</h1>
                  <Badge tone={STATUS_TONE[c.status] ?? "neutral"} dot>{STATUS_OPTIONS[c.status] ?? f.statusLabel}</Badge>
                  {c.portalClosed ? <Badge tone="danger"><Lock className="size-3" /> Portal closed</Badge> : <Badge tone="success"><Globe className="size-3" /> Portal open</Badge>}
                </div>
                {c.title && c.title !== f.name && <p className="mt-0.5 truncate text-sm text-slate-500" title={c.title}>{c.title}</p>}
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-slate-600 [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-slate-400">
                  {shown.length ? shown.map(([n, e, m], i) => (
                    <span key={i} className="inline-flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                      {shown.length > 1 && n && <span className="font-medium text-slate-800">{n.split(/\s+/)[0]}</span>}
                      {e && <a href={`mailto:${e}`} className="inline-flex min-w-0 items-center gap-1.5 hover:text-brand-700"><Mail /><span className="truncate">{e}</span></a>}
                      {m && <a href={`tel:${m.replace(/\s+/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-brand-700"><Phone />{m}</a>}
                    </span>
                  )) : <span className="inline-flex items-center gap-1.5 text-slate-400"><Mail /> No email yet</span>}
                  <span className="inline-flex items-center gap-1.5"><Hash />Case {c.id}</span>
                  <span className="inline-flex items-center gap-1.5" title={fmtDateTime(f.created)}><CalendarClock />Opened {timeAgo(f.created)}</span>
                </div>
              </div>
            </div>
            <div className="w-full shrink-0 lg:w-auto">
              <StageSelect caseId={c.id} stage={f.stage} stages={STAGES} colors={STAGE_COLORS} />
            </div>
          </div>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <CaseHeaderControls
              caseId={c.id} link={c.portalClosed ? "" : link} closed={c.portalClosed} paused={c.chasePaused} zipUrl={zipUrl}
              chaseDisabled={!f.docs_pending && ff.status === "submitted"} lastChase={c.lastChaseAt ? timeAgo(c.lastChaseAt) : ""} chaseCount={c.chaseCount}
            />
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-px border-t border-slate-200/70 bg-slate-100 md:grid-cols-3 xl:grid-cols-6">
          <Fact label="Loan amount" sub={LOAN_TYPES[c.loanType] ?? (c.loanType || "Loan type not set")}>{f.loan ? money(f.loan) : <span className="font-normal text-slate-400">Not set</span>}</Fact>
          <Fact label="Est. commission" sub="to MM">{money(f.commission)}</Fact>
          <Fact label="Documents" sub={f.docs_total ? (f.docs_pending ? `${f.docs_pending} outstanding${f.docs_rejected ? ` · ${f.docs_rejected} rejected` : ""}` : "All received") : "No checklist yet"}>
            <span className="flex items-baseline justify-between gap-2"><span>{f.docs_done}/{f.docs_total}</span>{f.docs_total > 0 && <span className="text-xs font-medium text-slate-400">{f.docs_pct}%</span>}</span>
            {f.docs_total > 0 && <Meter pct={f.docs_pct} done={f.docs_pct >= 100} />}
          </Fact>
          <Fact label="Fact Find" sub={otherOpen > 0 ? `${otherOpen} other form${otherOpen > 1 ? "s" : ""} open` : rows.length > 1 ? "Other forms complete" : "No other forms"}>
            <Badge tone={chipTone(ffTone)} dot>{ffLab}</Badge>
          </Fact>
          <Fact label="Flex entry" sub="sections entered">
            <span className="flex items-baseline justify-between gap-2"><span>{flex}/9</span>{flex >= 8 && <Badge tone="success">Done</Badge>}</span>
            <Meter pct={Math.round((100 * flex) / 9)} done={flex >= 8} />
          </Fact>
          <Fact label="Client portal" sub={[c.showFactfind && "Fact Find", c.showDocuments && "Documents"].filter(Boolean).join(" · ") || "No sections visible"}>
            {c.portalClosed ? <span className="text-red-600">Closed</span> : <span className="text-emerald-700">Open</span>}
          </Fact>
        </dl>
      </section>

      <CaseTabs tabs={tabs} />
    </div>
  );
}
