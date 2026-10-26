import { readDeal } from "./lib/income";
import { getIncomeContext } from "./lib/income-settings";
// CONTRACT between crm-core (case screen) and crm-extra (advanced modules).
// crm-core renders these inside the case screen tabs; crm-extra implements them.
// Each is an async Server Component taking { caseId }.
import type { ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight, Calculator, ExternalLink, GitBranch, History, Inbox, Mail, ScrollText } from "lucide-react";
import { prisma } from "@/lib/db";
import { Badge, Card, EmptyState, LinkButton, buttonStyles, cn, tableCls, type Tone } from "@/components/admin/ui";
import { getCrmOptions, getZoho, zohoConnected } from "./lib/opts";
import { portalUrl, ymdHi, money } from "./lib/cases";
import { listTemplates } from "./lib/templates";
import { loadItems } from "./lib/reminders";
import { notesFor } from "./lib/notes";
import { evaluateDocs, tagFor } from "./lib/signals";
import { buildFlex } from "./lib/flex";
import EmailComposer from "./components/EmailComposer";
import EmailTrail from "./components/EmailTrail";
import RemindersBox from "./components/RemindersBox";
import { CaseNotesBox } from "./components/BrokerNotes";
import DealValue from "./components/DealValue";
import FlexEntry from "./components/FlexEntry";

type P = { caseId: number };
const missing = <p className="text-sm text-slate-500">Case not found.</p>;

/** Section inside an already-carded panel: icon + title row, then content. */
function Section({ icon, title, description, actions, children, id }: { icon: ReactNode; title: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="py-6 first:pt-0 last:pb-0">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 [&_svg]:size-4">{icon}</span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
          </div>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Email (Zoho) composer + Email Log + Email Trail. */
export async function EmailPanel({ caseId }: P) {
  const c = await prisma.case.findUnique({ where: { id: caseId } });
  if (!c) return missing;
  const [z, tpls, log] = await Promise.all([
    getZoho(),
    listTemplates(),
    prisma.caseEmail.findMany({ where: { caseId }, orderBy: { sentAt: "desc" }, take: 200 }),
  ]);
  const connected = zohoConnected(z);
  return (
    <div className="divide-y divide-slate-100">
      <Section
        icon={<Mail />}
        title="Email (Zoho)"
        description="Send from your connected Zoho mailbox — the message is logged against this case."
        actions={<Badge tone={connected ? "success" : "warning"} dot>{connected ? "Zoho connected" : "SMTP fallback"}</Badge>}
      >
        <EmailComposer
          caseId={caseId}
          app1={c.app1Email || c.legacyEmail}
          app2={c.app2Email} app3={c.app3Email} app4={c.app4Email}
          portal={c.portalClosed ? "" : portalUrl(c) + "&step=factfind"}
          templates={tpls.map((t) => ({ id: t.id, label: t.subject || t.title }))}
          connected={connected}
        />
      </Section>
      <Section
        id="mm-email-log"
        icon={<ScrollText />}
        title={
          <span className="flex items-center gap-2">
            Email Log
            {log.length > 0 && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 tabular-nums">{log.length}</span>}
          </span>
        }
        description="Every email sent from or synced into this case."
      >
        {log.length === 0 ? (
          <EmptyState icon={<Inbox />} title="No email activity yet" description="Sent and received emails for this case will be listed here." className="py-8" />
        ) : (
          <ul className="max-h-[380px] divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
            {log.map((e) => {
              const inbound = e.direction === "in";
              return (
                <li key={e.id} className="flex items-start gap-3 px-3.5 py-2.5 transition-colors hover:bg-slate-50/70">
                  <span
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ring-1 ring-inset [&_svg]:size-3.5",
                      inbound ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-sky-50 text-sky-700 ring-sky-200",
                    )}
                    title={inbound ? "Inbound" : "Outbound"}
                  >
                    {inbound ? <ArrowDownLeft /> : <ArrowUpRight />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <Badge tone={inbound ? "success" : "info"} className="!px-1.5 !py-0 text-[10.5px] font-semibold">
                        {inbound ? "IN" : "OUT"}
                      </Badge>
                      <span className="min-w-0 break-words text-sm font-medium text-slate-900">{e.subject || "(no subject)"}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-slate-500">
                      <span className="tabular-nums">{ymdHi(e.sentAt)}</span>
                      {(inbound ? e.fromAddr : e.toAddrs) && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span className="min-w-0 break-all">{inbound ? e.fromAddr : e.toAddrs}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <a className={buttonStyles({ variant: "ghost", size: "xs" })} href={`/api/admin/x/email/view?id=${e.id}`} target="_blank">
                    <ExternalLink /> View
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
      <Section icon={<GitBranch />} title="Email Trail" description="Live messages from Zoho tagged or matched to this case.">
        <EmailTrail caseId={caseId} />
      </Section>
    </div>
  );
}

/** Broker Notes & Strategy (per-case broker notes). */
export async function NotesPanel({ caseId }: P) {
  const notes = await notesFor(caseId, " @ ");
  return (
    <div id="mmcrm_bn_case_notes">
      <CaseNotesBox caseId={caseId} notes={notes} printUrl={`/admin/notes/print?case_id=${caseId}`} />
    </div>
  );
}

/** Notes & Reminders timeline. */
export async function RemindersPanel({ caseId }: P) {
  const [items, o, z] = await Promise.all([loadItems(caseId), getCrmOptions(), getZoho()]);
  return <RemindersBox caseId={caseId} items={items} defaultEmail={z.fromEmail || o.fromEmail} />;
}

const ACT_TONE: Record<string, Tone> = { good: "success", bad: "danger", "": "neutral" };
const ACT_DOT: Record<string, string> = { good: "bg-emerald-500 ring-emerald-100", bad: "bg-red-500 ring-red-100", "": "bg-slate-300 ring-slate-100" };

/** "Case Activity" signals metabox (newest first, tagged). */
export async function ActivityPanel({ caseId }: P) {
  await evaluateDocs(caseId).catch(() => undefined);
  const rows = await prisma.caseActivity.findMany({ where: { caseId }, orderBy: { createdAt: "desc" } });
  if (!rows.length)
    return <EmptyState icon={<History />} title="Nothing yet" description="Activity will appear here automatically." className="py-8" />;
  return (
    <div id="mmcrm_signals" className="max-h-[480px] overflow-y-auto pr-1">
      <ol className="relative">
        {rows.map((r, i) => {
          const t = r.type === "audit" ? { label: "Log", tone: "" as const } : tagFor(r.type);
          return (
            <li key={r.id} className="relative flex gap-3 pb-4 last:pb-0">
              {i < rows.length - 1 && <span aria-hidden className="absolute top-4 bottom-0 left-[5px] w-px bg-slate-200" />}
              <span aria-hidden className={cn("relative mt-1.5 size-[11px] shrink-0 rounded-full ring-4", ACT_DOT[t.tone])} />
              <div
                className={cn(
                  "min-w-0 flex-1 rounded-lg border px-3 py-2",
                  t.tone === "good" ? "border-emerald-100 bg-emerald-50/40" : t.tone === "bad" ? "border-red-100 bg-red-50/40" : "border-slate-200/80 bg-white",
                )}
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Badge tone={ACT_TONE[t.tone]}>{t.label}</Badge>
                  <span className="ml-auto text-xs whitespace-nowrap text-slate-500 tabular-nums">{ymdHi(r.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm break-words text-slate-800">
                  {r.detail}
                  {r.by && <span className="text-xs text-slate-400"> — {r.by}</span>}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** Flex Entry workspace for this case. */
export async function FlexPanel({ caseId }: P) {
  const data = await buildFlex(caseId);
  if (!data) return missing;
  return <FlexEntry data={data} />;
}

/** Borrowing capacity: link to calculator (pre-filled) + this case's saved runs (max 10). */
export async function BorrowPanel({ caseId }: P) {
  const hist = await prisma.borrowCalc.findMany({ where: { caseId }, orderBy: { createdAt: "desc" }, take: 10 });
  return (
    <Card
      title="Borrowing capacity"
      description="Indicative capacity runs saved for this client (latest 10)."
      actions={
        <LinkButton href={`/admin/borrowing?case=${caseId}`} variant="primary" size="sm">
          <Calculator /> Open borrowing calculator for this client
        </LinkButton>
      }
      padded={hist.length === 0}
    >
      {hist.length === 0 ? (
        <EmptyState
          icon={<Calculator />}
          title="Nothing saved yet"
          description={
            <>
              Run the calculator and use <b>Save to case</b> to keep a record here.
            </>
          }
          className="py-10"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className={tableCls.table}>
            <thead className={tableCls.thead}>
              <tr>
                <th className={tableCls.th}>When</th>
                <th className={tableCls.th}>Client</th>
                <th className={cn(tableCls.th, "text-right")}>Capacity</th>
                <th className={tableCls.th}>Summary</th>
              </tr>
            </thead>
            <tbody>
              {hist.map((h) => (
                <tr key={h.id} className={tableCls.tr}>
                  <td className={cn(tableCls.td, "align-top whitespace-nowrap tabular-nums text-slate-500")}>{ymdHi(h.createdAt)}</td>
                  <td className={cn(tableCls.td, "align-top font-medium text-slate-900")}>{h.label || "—"}</td>
                  <td className={cn(tableCls.td, "align-top text-right font-semibold whitespace-nowrap text-slate-900 tabular-nums")}>{money(h.maxLoan)}</td>
                  <td className={cn(tableCls.td, "align-top")}>
                    <details className="group">
                      <summary className="cursor-pointer list-none text-xs font-medium text-brand-700 hover:text-brand-800 [&::-webkit-details-marker]:hidden">
                        <span className="group-open:hidden">Show summary</span>
                        <span className="hidden group-open:inline">Hide summary</span>
                      </summary>
                      <pre className="mt-2 max-w-xl rounded-lg border border-slate-200 bg-slate-50 p-3 font-sans text-xs whitespace-pre-wrap text-slate-700">{h.summary}</pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/** Deal Value (loan amount, bank comm %, MM split %) with live estimate. */
export async function CommissionPanel({ caseId }: P) {
  const [c, { settings, projection }] = await Promise.all([prisma.case.findUnique({ where: { id: caseId } }), getIncomeContext()]);
  if (!c) return missing;
  return <DealValue caseId={caseId} deal={readDeal(c, settings, undefined, projection)} projection={projection} />;
}
