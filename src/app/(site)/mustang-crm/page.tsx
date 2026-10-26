import { redirect } from "next/navigation";
import { staffSessionOrNull } from "@/lib/session";

// WP page "Mustang CRM" ([ndis_crm_shell] — a staff CRM shell). Staff go to the CRM.
export const dynamic = "force-dynamic";
export default async function MustangCrmPage() {
  if (!(await staffSessionOrNull())) redirect("/login?redirect_to=/admin");
  redirect("/admin");
}
