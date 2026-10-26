import { redirect } from "next/navigation";
import { staffSessionOrNull } from "@/lib/session";

// WP page "Factfind History" ([fact_find_history]). The WP page exposed client
// data publicly; here it is staff-only and lives in the CRM.
export const dynamic = "force-dynamic";
export default async function FactFindHistoryPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = new URLSearchParams({ view: "legacy" });
  if (sp.fact_find_id) q.set("fact_find_id", sp.fact_find_id);
  const target = `/admin/factfinds?${q.toString()}`;
  if (!(await staffSessionOrNull())) redirect(`/login?redirect_to=${encodeURIComponent(target)}`);
  redirect(target);
}
