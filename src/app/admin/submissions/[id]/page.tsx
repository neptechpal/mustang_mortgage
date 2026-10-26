import { notFound } from "next/navigation";
import { Download, FileText, Globe, Mail, MailOpen, Paperclip, PenLine, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { Avatar, Badge, Button, Card, KeyValue, PageHeader, cn, type Tone } from "@/components/admin/ui";
import { FORM_LABELS, submissionFiles, submissionRows, type SubmissionFile } from "@/modules/site/forms/admin";
import { deleteSubmissionAction, setSubmissionStatusAction } from "../actions";

export const dynamic = "force-dynamic";

const fmt = (d: Date) =>
  new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", dateStyle: "full", timeStyle: "short" }).format(d);
const size = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

type MailResult = { ok?: boolean; error?: string; skipped?: boolean };
type Row = { key: string; label: string; value: string };

/* ---------------------------------------------------------- display helpers */

const SECTION_TITLES: Record<string, string> = { asset: "Assets", expenses: "Expenses", liability: "Liabilities", realestate: "Real estate" };
const humanize = (s: string) => {
  const t = s.replace(/([a-z])(\d)/gi, "$1 $2").replace(/[_-]+/g, " ").trim();
  return t ? t[0].toUpperCase() + t.slice(1) : s;
};
/** Raw CF7 field names that share a prefix (applicant1_*, expenses_*) become their own section. */
function sectionize(rows: Row[]) {
  const prefixOf = (r: Row) => (r.label === r.key && r.key.includes("_") ? r.key.split("_")[0] : "");
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(prefixOf(r), (counts.get(prefixOf(r)) ?? 0) + 1);
  const sections: { id: string; title: string; rows: (Row & { display: string })[] }[] = [];
  for (const r of rows) {
    const p = prefixOf(r);
    const key = p && (counts.get(p) ?? 0) >= 3 ? p : "";
    const display = r.label !== r.key ? r.label : key ? humanize(r.key.slice(key.length + 1)) : humanize(r.key);
    const last = sections[sections.length - 1];
    if (last && last.id === key) last.rows.push({ ...r, display });
    else sections.push({ id: key, title: key ? SECTION_TITLES[key] ?? humanize(key) : "", rows: [{ ...r, display }] });
  }
  let general = 0;
  for (const s of sections) if (!s.id) s.title = sections.length === 1 ? "Submitted details" : general++ === 0 ? "General" : "Other details";
  return sections;
}
const isLong = (v: string) => v.length > 70 || v.includes("\n");
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isImage = (f: SubmissionFile) => /^image\/(png|jpe?g|gif)$/.test(f.mimeType);

export default async function SubmissionDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  let sub = await prisma.formSubmission.findUnique({ where: { id } });
  if (!sub) notFound();
  if (sub.status === "new") sub = await prisma.formSubmission.update({ where: { id }, data: { status: "read" } });

  const data = (sub.data ?? {}) as Record<string, unknown>;
  const rows = await submissionRows(sub.formKey, data);
  const files = submissionFiles(sub.files);
  const meta = (sub.meta ?? {}) as { ip?: string; userAgent?: string; url?: string; source?: string; mail?: Record<string, MailResult> };
  const subId = sub.id;
  const fileUrl = (fid: string, inline = false) => `/api/admin/submissions/${subId}/files/${fid}${inline ? "?inline=1" : ""}`;
  const formLabel = FORM_LABELS[sub.formKey] ?? sub.formTitle;
  const sections = sectionize(rows);
  const uploads = files.filter((f) => f.kind !== "signature");
  const signatures = files.filter((f) => f.kind === "signature");
  const mail = Object.entries(meta.mail ?? {});

  const FileChip = ({ f }: { f: SubmissionFile }) => (
    <a
      href={fileUrl(f.fileId)}
      className="group flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 pr-3 transition hover:border-brand-300 hover:bg-brand-50/40"
      title={`Download ${f.name}`}
    >
      {isImage(f) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={fileUrl(f.fileId, true)} alt="" className="size-9 shrink-0 rounded-md border border-slate-200 object-cover" />
      ) : (
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md ring-1 ring-inset",
            f.mimeType === "application/pdf" ? "bg-red-50 text-red-600 ring-red-100" : "bg-slate-50 text-slate-500 ring-slate-200",
          )}
        >
          <FileText className="size-4" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-slate-800 group-hover:text-brand-800">{f.name}</span>
        <span className="block text-xs text-slate-500">
          {f.field} · {size(f.size)}
        </span>
      </span>
      <Download className="size-4 shrink-0 text-slate-400 group-hover:text-brand-700" />
    </a>
  );

  const submitterCard = (
    <Card>
      <div className="flex items-center gap-3">
        <Avatar name={sub.name || sub.email || "?"} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{sub.name || "Unknown submitter"}</p>
          {sub.email ? (
            <a href={`mailto:${sub.email}`} className="block truncate text-sm text-brand-700 hover:underline">
              {sub.email}
            </a>
          ) : (
            <p className="text-sm text-slate-400">No e-mail</p>
          )}
        </div>
      </div>
      <KeyValue
        cols={1}
        className="mt-5 border-t border-slate-100 pt-4"
        items={[
          ["Form", formLabel],
          ["Received", fmt(sub.createdAt)],
          ["Submission ID", <span key="id" className="tabular-nums">#{sub.id}</span>],
        ]}
      />
    </Card>
  );

  const mailTone = (v: MailResult): Tone => (v.skipped ? "neutral" : v.ok ? "success" : "danger");

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Form submissions", href: "/admin/submissions" }, { label: formLabel, href: `/admin/submissions?form=${encodeURIComponent(sub.formKey)}` }, { label: `#${sub.id}` }]}
        icon={<Mail />}
        title={
          <>
            {formLabel} <span className="font-normal text-slate-400">#{sub.id}</span>
          </>
        }
        description={
          <>
            {sub.formTitle} · received {fmt(sub.createdAt)}
          </>
        }
        actions={
          <>
            <form action={setSubmissionStatusAction}>
              <input type="hidden" name="id" value={sub.id} />
              <input type="hidden" name="status" value="new" />
              <Button variant="secondary">
                <MailOpen /> Mark as unread
              </Button>
            </form>
            <form action={deleteSubmissionAction}>
              <input type="hidden" name="id" value={sub.id} />
              <Button variant="danger">
                <Trash2 /> Delete submission
              </Button>
            </form>
          </>
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <div className="lg:hidden">{submitterCard}</div>
          {sections.map((s, si) => {
            const answered = s.rows.filter((r) => r.value).length;
            return (
              <Card key={si} title={s.title} actions={<span className="text-xs text-slate-400 tabular-nums">{answered}/{s.rows.length} answered</span>}>
                <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  {s.rows.map((r) => {
                    const fieldFiles = files.filter((f) => f.field === r.key);
                    return (
                      <div key={r.key} className={cn("min-w-0", (isLong(r.value) || fieldFiles.length > 0) && "sm:col-span-2")}>
                        <dt className="text-xs font-medium text-slate-500" title={r.key}>
                          {r.display}
                        </dt>
                        <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm text-slate-900">
                          {r.value ? (
                            isEmail(r.value) ? (
                              <a href={`mailto:${r.value}`} className="text-brand-700 hover:underline">
                                {r.value}
                              </a>
                            ) : (
                              r.value
                            )
                          ) : fieldFiles.length > 0 ? (
                            <span className="flex flex-wrap gap-1.5 whitespace-normal">
                              {fieldFiles.map((f) => (
                                <a
                                  key={f.fileId}
                                  href={fileUrl(f.fileId)}
                                  className="inline-flex max-w-full items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-800"
                                >
                                  {f.kind === "signature" ? <PenLine className="size-3 shrink-0" /> : <Paperclip className="size-3 shrink-0" />}
                                  <span className="truncate">{f.name}</span>
                                </a>
                              ))}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </Card>
            );
          })}
        </div>

        <aside className="min-w-0 space-y-6">
          <div className="hidden lg:block">{submitterCard}</div>

          {files.length > 0 && (
            <Card
              title={
                <span className="flex items-center gap-2">
                  Attachments <Badge>{files.length}</Badge>
                </span>
              }
            >
              <div className="space-y-4">
                {uploads.length > 0 && (
                  <ul className="space-y-2">
                    {uploads.map((f) => (
                      <li key={f.fileId}>
                        <FileChip f={f} />
                      </li>
                    ))}
                  </ul>
                )}
                {signatures.map((f) => (
                  <figure key={f.fileId} className="overflow-hidden rounded-lg border border-slate-200">
                    <div className="flex items-center justify-center bg-[linear-gradient(45deg,#f8fafc_25%,transparent_25%),linear-gradient(-45deg,#f8fafc_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#f8fafc_75%),linear-gradient(-45deg,transparent_75%,#f8fafc_75%)] bg-[length:16px_16px] p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={fileUrl(f.fileId, true)} alt="Signature" className="block max-h-40 w-full max-w-xs rounded bg-white object-contain" />
                    </div>
                    <figcaption className="flex items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/70 px-3 py-2 text-xs">
                      <span className="flex min-w-0 items-center gap-1.5 text-slate-600">
                        <PenLine className="size-3.5 shrink-0 text-slate-400" />
                        <span className="font-medium">Signature</span>
                        <span className="truncate text-slate-400">
                          {f.name} · {size(f.size)}
                        </span>
                      </span>
                      <a href={fileUrl(f.fileId)} className="inline-flex shrink-0 items-center gap-1 font-medium text-brand-700 hover:underline">
                        <Download className="size-3.5" /> Download
                      </a>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </Card>
          )}

          <Card title="Details">
            <KeyValue
              cols={1}
              items={[
                [
                  "Page",
                  meta.url ? (
                    <a key="u" href={meta.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-start gap-1 break-all text-brand-700 hover:underline">
                      <Globe className="mt-0.5 size-3.5 shrink-0" />
                      {meta.url}
                    </a>
                  ) : null,
                ],
                ["IP address", meta.ip ? <span key="ip" className="font-mono text-[13px]">{meta.ip}</span> : null],
                ["Browser", meta.userAgent ? <span key="ua" className="break-all text-xs text-slate-600">{meta.userAgent}</span> : null],
                ...(meta.source ? ([["Source", meta.source]] as [string, string][]) : []),
              ]}
            />
            {mail.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-medium text-slate-500">E-mail delivery</p>
                <ul className="space-y-2">
                  {mail.map(([k, v]) => (
                    <li key={k} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="text-slate-700">{k === "mail1" ? "Mail (1)" : k === "mail2" ? "Mail (2)" : "Notification"}</span>
                      <Badge tone={mailTone(v)} dot>
                        {v.skipped ? "inactive" : v.ok ? "sent" : `not sent (${v.error ?? "error"})`}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
