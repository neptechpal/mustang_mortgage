// Adapter to crm-core's email templates (WP mm_template: title, subject, body).
// crm-core owns the model; we look it up defensively so this module compiles
// independently of its exact name. Expected shape: { id, title, subject?, body? | content? }.
import { prisma } from "@/lib/db";

export type Tpl = { id: number; title: string; subject: string; body: string };

type Delegate = { findMany: (a?: unknown) => Promise<Record<string, unknown>[]>; findUnique: (a: unknown) => Promise<Record<string, unknown> | null> };

function delegate(): Delegate | null {
  const p = prisma as unknown as Record<string, Delegate | undefined>;
  for (const k of ["emailTemplate", "mmTemplate", "crmTemplate", "template"]) {
    const d = p[k];
    if (d && typeof d.findMany === "function") return d;
  }
  return null;
}

const norm = (r: Record<string, unknown>): Tpl => ({
  id: Number(r.id),
  title: String(r.title ?? r.name ?? ""),
  subject: String(r.subject ?? r.title ?? ""),
  body: String(r.body ?? r.content ?? r.html ?? ""),
});

export async function listTemplates(): Promise<Tpl[]> {
  const d = delegate();
  if (!d) return [];
  try {
    return (await d.findMany()).map(norm).sort((a, b) => a.title.localeCompare(b.title));
  } catch {
    return [];
  }
}

export async function getTemplate(id: number): Promise<Tpl | null> {
  const d = delegate();
  if (!d || !id) return null;
  try {
    const r = await d.findUnique({ where: { id } });
    return r ? norm(r) : null;
  } catch {
    return null;
  }
}
