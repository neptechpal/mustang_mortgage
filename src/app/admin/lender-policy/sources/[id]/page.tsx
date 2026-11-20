import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArrowRightLeft, Bot, CircleSlash, Database, ExternalLink, FileText, Paperclip, Pencil, Save, Send, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import { Alert, Badge, Button, Card, Field, Input, KeyValue, LinkButton, PageHeader, Select, Textarea, buttonStyles, checkboxStyles } from "@/components/admin/ui";
import { deleteSourceAction, publishSourceAction, rekeySourceAction, saveSourceAction, supersedeSourceAction, withdrawSourceAction } from "@/modules/scenario/policy/admin";
import { sourceUsage } from "@/modules/scenario/policy/data";
import { BASE, SOURCE_KINDS, fmtDate, fmtDateTime, sourceKindLabel, toDateInput } from "@/modules/scenario/policy/meta";
import { Flash, StatusBadge } from "@/modules/scenario/policy/ui/parts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Policy source" };

export default async function SourcePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requireStaff();
  const isAdmin = s.role === "ADMIN";
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  const src = isNew ? null : await prisma.scnSource.findUnique({ where: { id: Number(id) || 0 } });
  if (!isNew && !src) notFound();
  const [lenders, file, usage, citing, targets] = await Promise.all([
    prisma.scnLender.findMany({ orderBy: [{ sort: "asc" }, { name: "asc" }], select: { id: true, name: true, code: true } }),
    src?.fileId ? prisma.storedFile.findUnique({ where: { id: src.fileId } }) : null,
    src ? sourceUsage(src.id) : null,
    src
      ? Promise.all([
          prisma.scnPolicyRule.findMany({ where: { sourceId: src.id, status: { in: ["draft", "published"] } }, orderBy: [{ status: "asc" }, { id: "asc" }], take: 50 }),
          prisma.scnPriceRecord.findMany({ where: { sourceId: src.id, status: { in: ["draft", "published"] } }, orderBy: [{ status: "asc" }, { id: "asc" }], take: 50 }),
        ])
      : null,
    src ? prisma.scnSource.findMany({ where: { id: { not: src.id }, status: { in: ["draft", "published"] }, ...(src.lenderId ? { OR: [{ lenderId: src.lenderId }, { lenderId: null }] } : {}) }, orderBy: { createdAt: "desc" } }) : [],
  ]);
  const editable = isNew || src!.status === "draft" || (src!.status === "published" && isAdmin);
  const showForm = isNew || (editable && (src!.status === "draft" || sp.edit === "1"));
  const lenderName = (lid: number | null) => (lid ? lenders.find((l) => l.id === lid)?.name ?? `#${lid}` : "Panel-wide");
  const prodNames = citing ? new Map((await prisma.scnProduct.findMany({ where: { id: { in: citing[1].map((p) => p.productId) } }, select: { id: true, name: true } })).map((p) => [p.id, p.name])) : new Map<number, string>();
  const stopWarning = usage ? `${usage.rules} published rule(s) and ${usage.prices} published price record(s) cite this source and will stop being used by assessments.` : "";
  const defLender = sp.lender && Number(sp.lender) ? Number(sp.lender) : null;

  return (
    <div className="max-w-6xl">
      <PageHeader
        icon={<FileText />}
        breadcrumbs={[{ label: "Lender policy", href: BASE }, { label: "Sources", href: `${BASE}?tab=sources` }, { label: src ? `#${src.id}` : "New" }]}
        title={src ? src.title : "Register source"}
        description={src ? <span className="flex flex-wrap items-center gap-2"><StatusBadge status={src.status} />{sourceKindLabel(src.kind)} · {lenderName(src.lenderId)}{src.reference && ` · ${src.reference}`}</span> : "Authorised material that rules and price records cite."}
        actions={src && !showForm && editable && <LinkButton href={`?edit=1`} variant="secondary"><Pencil />Edit</LinkButton>}
      />
      <Flash sp={sp} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          {showForm ? (
            <Card title={src ? "Edit source" : "Source details"} description={src?.status === "published" ? "Published source — changes apply immediately. Storage permission must stay confirmed." : undefined}>
              <form action={saveSourceAction} className="space-y-5">
                {src && <input type="hidden" name="id" value={src.id} />}
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Kind" htmlFor="kind" required>
                    <Select id="kind" name="kind" required defaultValue={src?.kind ?? "lender_guide"}>
                      {SOURCE_KINDS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </Select>
                  </Field>
                  <Field label="Lender" htmlFor="lenderId" hint="Blank = panel-wide (e.g. aggregator data).">
                    <Select id="lenderId" name="lenderId" defaultValue={src?.lenderId ?? defLender ?? ""}>
                      <option value="">Panel-wide</option>
                      {lenders.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
                    </Select>
                  </Field>
                  <Field label="Title" htmlFor="title" required className="sm:col-span-2">
                    <Input id="title" name="title" required maxLength={200} defaultValue={src?.title ?? ""} placeholder="e.g. Demo Lender A credit guide (synthetic)" />
                  </Field>
                  <Field label="Reference / version" htmlFor="reference" hint="Document number, version or issue date.">
                    <Input id="reference" name="reference" maxLength={200} defaultValue={src?.reference ?? ""} placeholder="v2026.11" />
                  </Field>
                  <Field label="URL" htmlFor="url" hint="Broker portal or public page.">
                    <Input id="url" name="url" type="url" maxLength={1000} defaultValue={src?.url ?? ""} placeholder="https://" />
                  </Field>
                  <Field label="File" htmlFor="file" hint={file ? `Current: ${file.originalName}. Uploading replaces it.` : "PDF or image, max 20 MB. Stored privately."} className="sm:col-span-2">
                    <Input id="file" name="file" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.xlsx,.csv,.txt" className="file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-2.5 file:py-1 file:text-[13px] file:font-medium file:text-slate-700" />
                    {file && src?.status === "draft" && (
                      <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-600">
                        <input type="checkbox" name="removeFile" value="1" className={checkboxStyles} /> Remove current file
                      </label>
                    )}
                  </Field>
                  <Field label="Excerpt" htmlFor="excerpt" hint="Pasted text of the relevant section. Required for BDM confirmations (paste the written response)." className="sm:col-span-2">
                    <Textarea id="excerpt" name="excerpt" rows={6} maxLength={20000} defaultValue={src?.excerpt ?? ""} />
                  </Field>
                </div>
                <fieldset className="rounded-lg border border-slate-200 p-4">
                  <legend className="px-1 text-[13px] font-semibold text-slate-800">BDM confirmation</legend>
                  <div className="grid gap-5 sm:grid-cols-3">
                    <Field label="BDM name" htmlFor="bdmName">
                      <Input id="bdmName" name="bdmName" maxLength={160} defaultValue={src?.bdmName ?? ""} />
                    </Field>
                    <Field label="Received" htmlFor="receivedAt">
                      <Input id="receivedAt" name="receivedAt" type="date" defaultValue={toDateInput(src?.receivedAt)} />
                    </Field>
                    <Field label="Case #" htmlFor="caseId" hint="Only for a case-specific confirmation.">
                      <Input id="caseId" name="caseId" type="number" min={1} inputMode="numeric" defaultValue={src?.caseId ?? ""} className="tabular-nums" />
                    </Field>
                  </div>
                </fieldset>
                <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
                  <legend className="px-1 text-[13px] font-semibold text-slate-800">Permissions</legend>
                  <label className="flex items-start gap-2.5 text-sm text-slate-800">
                    <input type="checkbox" name="permStore" value="1" defaultChecked={src?.permStore ?? false} className={`${checkboxStyles} mt-0.5`} />
                    <span>Permission confirmed to store/index this material<span className="block text-xs text-slate-500">Required before the source can be published.</span></span>
                  </label>
                  <label className="flex items-start gap-2.5 text-sm text-slate-800">
                    <input type="checkbox" name="permAi" value="1" defaultChecked={src?.permAi ?? false} className={`${checkboxStyles} mt-0.5`} />
                    <span>Permission confirmed to transmit extracts to the AI provider<span className="block text-xs text-slate-500">Without it, extracts are never sent to the model; structured rules still apply.</span></span>
                  </label>
                  <Field label="Permission note" htmlFor="permNote" hint="Who confirmed, when and how (e.g. aggregator licence terms, BDM email).">
                    <Textarea id="permNote" name="permNote" rows={2} maxLength={2000} defaultValue={src?.permNote ?? ""} className="min-h-0" />
                  </Field>
                </fieldset>
                <Alert tone="warning">Never upload or paste commission, referral or other remuneration information.</Alert>
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                  {src && sp.edit === "1" && <LinkButton href={`${BASE}/sources/${src.id}`} variant="ghost">Cancel</LinkButton>}
                  <Button variant="primary"><Save />{src ? "Save source" : "Save as draft"}</Button>
                </div>
              </form>
            </Card>
          ) : (
            src && (
              <Card title="Source">
                <KeyValue
                  items={[
                    ["Kind", sourceKindLabel(src.kind)],
                    ["Lender", lenderName(src.lenderId)],
                    ["Reference / version", src.reference],
                    ["URL", src.url ? <a href={src.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-brand-700 hover:underline">{src.url}<ExternalLink className="size-3" /></a> : ""],
                    ["File", file ? <a href={`/api/admin/crm/files/${file.id}`} target="_blank" className="inline-flex items-center gap-1 text-brand-700 hover:underline"><Paperclip className="size-3.5" />{file.originalName}</a> : ""],
                    ["Case", src.caseId ? <Link href={`/admin/cases/${src.caseId}`} className="text-brand-700 hover:underline">#{src.caseId}</Link> : "Not case-specific"],
                    ["BDM", src.bdmName],
                    ["Received", fmtDate(src.receivedAt)],
                    ["Registered", `${fmtDateTime(src.createdAt)}${src.createdBy ? ` by ${src.createdBy}` : ""}`],
                    ["Permission note", src.permNote],
                  ]}
                />
                {src.excerpt && (
                  <div className="mt-5">
                    <p className="text-xs font-medium text-slate-500">Excerpt</p>
                    <blockquote className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border-l-4 border-brand-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{src.excerpt}</blockquote>
                  </div>
                )}
              </Card>
            )
          )}

          {src && citing && (
            <Card title="Cited by" description="Draft and published records that cite this source." padded={false}>
              {citing[0].length + citing[1].length === 0 ? (
                <p className="px-5 py-4 text-sm text-slate-500">No rules or price records cite this source yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {citing[0].map((r) => (
                    <li key={`r${r.id}`} className="flex items-center gap-3 px-5 py-2.5">
                      <Badge tone="neutral" className="text-[11px]">Rule</Badge>
                      <Link href={`${BASE}/rules/${r.id}`} className="min-w-0 flex-1 truncate text-sm text-slate-800 hover:text-brand-700 hover:underline">{r.statement}</Link>
                      <StatusBadge status={r.status} />
                    </li>
                  ))}
                  {citing[1].map((p) => (
                    <li key={`p${p.id}`} className="flex items-center gap-3 px-5 py-2.5">
                      <Badge tone="neutral" className="text-[11px]">Price</Badge>
                      <Link href={`${BASE}/pricing/${p.id}`} className="min-w-0 flex-1 truncate text-sm text-slate-800 hover:text-brand-700 hover:underline">
                        {prodNames.get(p.productId) ?? `Product #${p.productId}`} · <span className="tabular-nums">{p.ratePct.toFixed(2)}%</span> · LVR <span className="tabular-nums">{p.lvrMin}–{p.lvrMax}%</span>
                      </Link>
                      <StatusBadge status={p.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>

        {src && (
          <aside className="space-y-6">
            <Card title="Status">
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between"><span className="text-slate-500">Status</span><StatusBadge status={src.status} /></div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-slate-500"><Database className="size-3.5" />Store / index</span>
                  {src.permStore ? <Badge tone="success">Confirmed</Badge> : <Badge tone="warning">Not confirmed</Badge>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-slate-500"><Bot className="size-3.5" />AI transmission</span>
                  {src.permAi ? <Badge tone="success">Confirmed</Badge> : <Badge tone="warning">Not confirmed</Badge>}
                </div>
                {usage && (
                  <div className="flex items-center justify-between"><span className="text-slate-500">Cited by (published)</span><span className="tabular-nums text-slate-800">{usage.rules} rules · {usage.prices} prices</span></div>
                )}
              </div>
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                {src.status === "draft" && isAdmin && (
                  <form action={publishSourceAction}>
                    <input type="hidden" name="id" value={src.id} />
                    <Button variant="primary" className="w-full" disabled={!src.permStore}><Send />Publish source</Button>
                    {!src.permStore && <p className="mt-1.5 text-xs text-amber-700">Confirm storage permission before publishing.</p>}
                  </form>
                )}
                {src.status === "draft" && !isAdmin && <p className="text-xs text-slate-500">An admin publishes sources.</p>}
                {src.status === "published" && isAdmin && (
                  <form action={supersedeSourceAction}>
                    <input type="hidden" name="id" value={src.id} />
                    <ConfirmSubmit message={`Mark this source superseded? ${stopWarning} Re-key them to the new source first.`} className={buttonStyles({ variant: "secondary", className: "w-full" })}>
                      <Archive />Supersede
                    </ConfirmSubmit>
                  </form>
                )}
                {(src.status === "draft" || src.status === "published") && isAdmin && (
                  <form action={withdrawSourceAction}>
                    <input type="hidden" name="id" value={src.id} />
                    <ConfirmSubmit message={`Withdraw this source? ${stopWarning}`} className={buttonStyles({ variant: "danger", className: "w-full" })}>
                      <CircleSlash />Withdraw
                    </ConfirmSubmit>
                    {usage && usage.rules + usage.prices > 0 && <p className="mt-1.5 text-xs text-red-700">Withdrawing stops {usage.rules + usage.prices} published record(s) being used.</p>}
                  </form>
                )}
                {src.status === "draft" && (
                  <form action={deleteSourceAction}>
                    <input type="hidden" name="id" value={src.id} />
                    <ConfirmSubmit message="Delete this draft source (and its file)?" className={buttonStyles({ variant: "ghost", size: "sm", className: "w-full text-red-600 hover:bg-red-50" })}>
                      <Trash2 />Delete draft
                    </ConfirmSubmit>
                  </form>
                )}
              </div>
            </Card>

            {usage && usage.rules + usage.prices > 0 && (
              <Card title="Re-key to a new source" description="Creates draft versions of every published rule and price on this source, citing the new source. Verify and publish each.">
                {targets.length === 0 ? (
                  <p className="text-sm text-slate-500">Register the new source version first.</p>
                ) : (
                  <form action={rekeySourceAction} className="space-y-3">
                    <input type="hidden" name="id" value={src.id} />
                    <Select name="toSourceId" required aria-label="New source" defaultValue="">
                      <option value="" disabled>Select new source…</option>
                      {targets.map((t) => <option key={t.id} value={t.id}>{t.title}{t.reference ? ` · ${t.reference}` : ""} [{t.status}]</option>)}
                    </Select>
                    <Button variant="secondary" className="w-full"><ArrowRightLeft />Create re-keyed drafts</Button>
                  </form>
                )}
              </Card>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
