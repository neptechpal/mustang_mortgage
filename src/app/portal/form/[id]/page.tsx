import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPublishedForm, formSchema } from "@/modules/crm/forms/service";
import FormRunner from "@/modules/crm/components/FormRunner";
import { AppBody } from "@/modules/web/account/AppHead";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false } };

// [mmcrm_form id="N"]: public forms anyone can fill in (creates a case);
// with mm_case/mm_key the client is sent to their portal tab for this form.
export default async function PublicFormPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const f = await getPublishedForm(Number(id));
  const box = (msg: string) => <AppBody width="narrow"><div className="mw-portal__panel"><h1 className="mw-h3">{msg}</h1></div></AppBody>;
  if (!f) return box("This form is not available.");
  if (sp.mm_case && sp.mm_key) redirect(`/portal?${new URLSearchParams({ mm_case: sp.mm_case, mm_key: sp.mm_key, step: `form-${f.id}` })}`);
  const schema = formSchema(f);
  if (!schema.settings.public) return box("This form is only available through your personal link.");
  return (
    <AppBody width="narrow">
      <FormRunner schema={schema} values={{}} cfg={{ formId: f.id, isPublic: true, title: f.title }} />
    </AppBody>
  );
}
