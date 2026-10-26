import Link from "next/link";
import { ArrowRight, FilePlus2, Sparkles, UserPlus } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { createBlankCaseAction } from "@/modules/crm/actions";
import { getAutoOptions, getFfFormId, getPresets } from "@/modules/crm/options";
import { formSchema } from "@/modules/crm/forms/service";
import WizardForm from "@/modules/crm/components/WizardForm";
import { Notice } from "@/modules/crm/components/ui";
import { Card, PageHeader, buttonStyles, cn, inputStyles, labelStyles } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function NewClientPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff();
  const sp = await searchParams;
  if (sp.blank) {
    return (
      <div className="max-w-2xl">
        <PageHeader icon={<FilePlus2 />} title="Add New Case" description="Create an empty case and fill in the details yourself." breadcrumbs={[{ label: "Cases", href: "/admin/cases" }, { label: "Add New Case" }]} />
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-brand-200 bg-brand-50/70 p-4 sm:flex-row sm:items-center">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 ring-1 ring-brand-200"><Sparkles className="size-[18px]" /></span>
          <p className="flex-1 text-sm text-brand-900"><strong className="font-semibold">Setting up a new client?</strong> The guided screen creates the case, builds the document list and emails the secure link in one go.</p>
          <Link className={buttonStyles({ variant: "primary", size: "sm" })} href="/admin/cases/new">Use New Client <ArrowRight /></Link>
        </div>
        <Card title="Blank case">
          <form action={createBlankCaseAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="title" className={labelStyles}>Case title</label>
              <input id="title" name="title" placeholder="Case title" className={inputStyles} required />
            </div>
            <button className={buttonStyles({ variant: "primary", size: "md", className: "h-[38px]" })}><FilePlus2 /> Create case</button>
          </form>
        </Card>
      </div>
    );
  }
  const [presets, ffId, auto, forms] = await Promise.all([getPresets(), getFfFormId(), getAutoOptions(), prisma.crmForm.findMany({ where: { status: "publish" }, orderBy: { title: "asc" } })]);
  const ff = forms.find((f) => f.id === ffId);
  const sendable = forms.filter((f) => f.id !== ffId && !formSchema(f).settings.public).map((f) => ({ id: f.id, title: f.title }));
  return (
    <div>
      <PageHeader
        icon={<UserPlus />}
        title="New client"
        description="One screen to create the case, build the document checklist and send everything to the client."
        breadcrumbs={[{ label: "Cases", href: "/admin/cases" }, { label: "New client" }]}
        actions={<Link href="/admin/cases/new?blank=1" className={cn(buttonStyles({ variant: "ghost", size: "sm" }))}><FilePlus2 /> Blank case instead</Link>}
      />
      {sp.err && <Notice tone="bad">{sp.err}</Notice>}
      <WizardForm presets={presets} forms={sendable} ffTitle={ff?.title ?? ""} chaseOn={!!auto.chase_enabled} />
    </div>
  );
}
