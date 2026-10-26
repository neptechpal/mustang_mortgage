import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { listTemplates } from "@/modules/crm-extra/lib/templates";
import { audiences, getBday } from "@/modules/crm-extra/lib/marketing";
import Marketing from "@/modules/crm-extra/components/Marketing";

export const metadata = { title: "Marketing" };
export const dynamic = "force-dynamic";

export default async function MarketingPage() {
  const s = await requireStaff();
  const me = await prisma.user.findUnique({ where: { id: s.uid }, select: { email: true } });
  const tpls = await listTemplates();
  return (
    <Marketing
      me={me?.email ?? ""}
      templates={tpls.map((t) => ({ id: t.id, label: t.subject || t.title }))}
      initialAudiences={await audiences()}
      bday={await getBday()}
      isAdmin={s.role === "ADMIN"}
    />
  );
}
