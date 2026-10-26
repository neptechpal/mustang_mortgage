import { prisma } from "@/lib/db";

const CAP = 250; // same cap as the WP plugin's _mmcrm_activity

export async function logActivity(caseId: number, type: string, detail = "", by = "") {
  await prisma.caseActivity.create({ data: { caseId, type, detail, by } });
  const old = await prisma.caseActivity.findMany({
    where: { caseId },
    orderBy: { createdAt: "desc" },
    skip: CAP,
    select: { id: true },
  });
  if (old.length) await prisma.caseActivity.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
}
