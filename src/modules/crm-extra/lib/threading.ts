// Threading indexes (port of core.php mm_crm_{rfc,msg,conv,contact}_index):
// "id → case" maps, newest-last, capped (rfc/msg/conv 1000, contact 5000).
import { prisma } from "@/lib/db";

export type IndexKind = "rfc" | "msg" | "conv" | "contact";
const CAPS: Record<IndexKind, number> = { rfc: 1000, msg: 1000, conv: 1000, contact: 5000 };

export async function indexAdd(kind: IndexKind, key: string, caseId: number) {
  let k = String(key || "").trim();
  if (kind === "contact") k = k.toLowerCase();
  if (!k || !caseId) return;
  await prisma.zohoIndex.upsert({
    where: { kind_key: { kind, key: k } },
    create: { kind, key: k, caseId },
    update: { caseId, updatedAt: new Date() },
  });
  // Trim oldest beyond cap (cheap check first).
  const n = await prisma.zohoIndex.count({ where: { kind } });
  if (n > CAPS[kind]) {
    const old = await prisma.zohoIndex.findMany({
      where: { kind },
      orderBy: { updatedAt: "desc" },
      skip: CAPS[kind],
      select: { key: true },
    });
    if (old.length) await prisma.zohoIndex.deleteMany({ where: { kind, key: { in: old.map((o) => o.key) } } });
  }
}

export async function indexGet(kind: IndexKind, key: string): Promise<number> {
  let k = String(key || "").trim();
  if (kind === "contact") k = k.toLowerCase();
  if (!k) return 0;
  const r = await prisma.zohoIndex.findUnique({ where: { kind_key: { kind, key: k } } });
  return r?.caseId ?? 0;
}

export async function indexSizes() {
  const rows = await prisma.zohoIndex.groupBy({ by: ["kind"], _count: { _all: true } });
  const out: Record<IndexKind, number> = { rfc: 0, msg: 0, conv: 0, contact: 0 };
  for (const r of rows) out[r.kind as IndexKind] = r._count._all;
  return out;
}
