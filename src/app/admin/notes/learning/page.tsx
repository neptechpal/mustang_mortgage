import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { GraduationCap } from "lucide-react";
import { PageHeader } from "@/components/admin/ui";
import { fmtDate } from "@/modules/crm-extra/lib/cases";
import LearningVault from "@/modules/crm-extra/components/LearningVault";

export const metadata = { title: "Learning Vault" };
export const dynamic = "force-dynamic";

export default async function LearningPage() {
  await requireStaff();
  const rows = await prisma.learningItem.findMany();
  rows.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.getTime() - a.updatedAt.getTime());
  const d = (x: Date) => fmtDate(x, { month: "short", day: "numeric", year: "numeric" });
  return (
    <div>
      <PageHeader
        icon={<GraduationCap />}
        title="Learning Vault"
        description="Capture strategies, resources, and client insights. Keep everything one click away."
        breadcrumbs={[{ label: "Broker Notes", href: "/admin/notes" }, { label: "Learning Vault" }]}
      />
      <LearningVault
        items={rows.map((r) => ({
          id: r.id,
          title: r.title,
          url: r.url,
          summary: r.summary,
          tags: r.tags,
          pinned: r.pinned,
          added: d(r.createdAt),
          updated: r.updatedAt.getTime() - r.createdAt.getTime() > 1000 ? d(r.updatedAt) : "",
        }))}
      />
    </div>
  );
}
