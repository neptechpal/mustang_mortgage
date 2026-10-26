import { notFound } from "next/navigation";
import { Braces, Check, Mail, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { deleteTemplateAction, saveTemplateAction } from "@/modules/crm/actions";
import { PLACEHOLDER_CATALOG } from "@/modules/crm/email";
import TemplateEditor from "@/modules/crm/components/TemplateEditor";
import PlaceholderChips from "@/modules/crm/components/PlaceholderChips";
import { Alert, Button, Card, PageHeader, hintStyles, inputStyles, labelStyles } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
const TAGS = ["greeting_names", "applicants_first_names", "applicants_full_names", "applicant_first_name", "applicant_full_name", "applicant1_first_name", "applicant1_full_name", "applicant2_first_name", "applicant2_full_name", "applicant_email_list", "client_name", "case_id", "today", "portal_url", "portal_button", "checklist_pending_list", "site_name", "brand_logo_url"];
TAGS.splice(TAGS.indexOf('applicant_email_list'), 0, 'applicant3_first_name', 'applicant3_full_name', 'applicant4_first_name', 'applicant4_full_name');
const LABELS = Object.fromEntries(PLACEHOLDER_CATALOG.map((p) => [p.key, p.label.replace(/\s*\(.*\)\s*$/, "")]));

export default async function TemplatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff();
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  const t = isNew ? null : await prisma.emailTemplate.findUnique({ where: { id: Number(id) } });
  if (!isNew && !t) notFound();
  return (
    <div>
      <PageHeader
        icon={<Mail />}
        breadcrumbs={[{ label: "Email Templates", href: "/admin/templates" }, { label: isNew ? "New template" : t?.title || "Edit" }]}
        title={isNew ? "Add New Template" : "Edit Template"}
        actions={<Button form="tpl-form" variant="primary"><Check />{isNew ? "Publish" : "Update"}</Button>}
      />
      {sp.saved && <Alert tone="success" className="mb-5">Template saved.</Alert>}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <form id="tpl-form" action={saveTemplateAction.bind(null, t?.id ?? null)} className="min-w-0">
          <Card
            footer={
              <div className="flex items-center justify-end gap-2">
                <Button variant="primary"><Check />{isNew ? "Publish" : "Update"}</Button>
              </div>
            }
          >
            <div className="space-y-5">
              <div>
                <label htmlFor="tpl-title" className={labelStyles}>Title</label>
                <input id="tpl-title" name="title" defaultValue={t?.title ?? ""} placeholder="Add title" required className={`${inputStyles} !py-2.5 !text-base font-semibold`} />
              </div>
              <div>
                <label htmlFor="tpl-subject" className={labelStyles}>Subject</label>
                <input id="tpl-subject" name="subject" defaultValue={t?.subject ?? ""} placeholder="Leave blank to use the title" className={inputStyles} />
                <p className={hintStyles}>mm_subject — leave blank to use the title. Placeholders work here too.</p>
              </div>
              <div>
                <span className={labelStyles}>Message</span>
                <TemplateEditor name="body" initial={t?.body ?? ""} placeholders={PLACEHOLDER_CATALOG} />
              </div>
            </div>
          </Card>
        </form>
        <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <Card title={<span className="inline-flex items-center gap-2"><Braces className="size-4 text-slate-400" />Placeholders</span>} padded={false}>
            <div className="border-b border-slate-100 px-5 py-3 text-xs leading-relaxed text-slate-500">
              Use these merge tags in Subject and Body. Example: <code className="rounded bg-slate-100 px-1 font-mono text-slate-700">Dear {"{{greeting_names}}"},</code>
              <span className="mt-1 block text-slate-400">Click a tag to copy it.</span>
            </div>
            <div className="max-h-[420px] overflow-y-auto px-3 py-2 [scrollbar-width:thin]">
              <PlaceholderChips tags={TAGS.map((k) => ({ key: k, label: LABELS[k] }))} />
            </div>
            <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">Tags are merged on insert (when applicable) and on send.</p>
          </Card>
          {t && (
            <Card padded={false}>
              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">Delete template</p>
                  <p className="mt-0.5 text-xs text-slate-500">This can’t be undone.</p>
                </div>
                <form action={deleteTemplateAction.bind(null, t.id)}>
                  <Button variant="danger" size="sm"><Trash2 />Move to Trash</Button>
                </form>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
