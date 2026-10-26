import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPublishedForm, formSchema } from "@/modules/crm/forms/service";
import FormRunner from "@/modules/crm/components/FormRunner";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

// [mmcrm_form id="N"]: public forms anyone can fill in (creates a case);
// with mm_case/mm_key the client is sent to their portal tab for this form.
export default async function PublicFormPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const f = await getPublishedForm(Number(id));
  const box = (msg: string) => <main className="mx-auto max-w-2xl px-4 py-12"><div className="rounded-xl border border-slate-200 bg-white p-6 text-slate-700">{msg}</div></main>;
  if (!f) return box("This form is not available.");
  if (sp.mm_case && sp.mm_key) redirect(`/portal?${new URLSearchParams({ mm_case: sp.mm_case, mm_key: sp.mm_key, step: `form-${f.id}` })}`);
  const schema = formSchema(f);
  if (!schema.settings.public) return box("This form is only available through your personal link.");
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <FormRunner schema={schema} values={{}} cfg={{ formId: f.id, isPublic: true, title: f.title }} />
      </div>
    </main>
  );
}
