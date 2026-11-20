import { Sparkles } from "lucide-react";
import { requireArea } from "@/lib/session";
import { PageHeader } from "@/components/admin/ui";
import QuickScenario from "@/modules/scenario/ui/QuickScenario";

export const dynamic = "force-dynamic";

export default async function QuickScenarioPage() {
  const staff = await requireArea("/admin/quick-scenario");
  return <>
    <PageHeader icon={<Sparkles />} title="Quick Scenario" description="A few details. Clear estimates and talking points for your next client conversation." />
    <QuickScenario isAdmin={staff.role === "ADMIN"} storageOwner={staff.uid} />
  </>;
}
