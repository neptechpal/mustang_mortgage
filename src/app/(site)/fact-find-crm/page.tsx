import { redirect } from "next/navigation";

// WP page "Fact-Find-Crm" ([mmcrm_fact_find]): token-authenticated Fact Find.
// The same form lives in the client portal (step=factfind, with messages).
export const dynamic = "force-dynamic";
export default async function FactFindCrmPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const id = sp.mm_case || sp.case || "";
  const key = sp.mm_key || sp.token || "";
  const q = new URLSearchParams({ step: "factfind" });
  if (id) q.set("mm_case", id);
  if (key) q.set("mm_key", key);
  if (sp.edit) q.set("edit", sp.edit);
  redirect(`/portal?${q.toString()}`);
}
