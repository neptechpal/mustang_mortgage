"use server";
// Marketing AJAX equivalents (mm_mkt_*).
import { prisma } from "@/lib/db";
import { requireStaff, requireAdmin } from "@/lib/session";
import {
  audiences, ensureAudience, upsertContactRow, syncAllCases, contactWhere, mktLog, sendCampaign, sendTest, signatureHtml,
  getBday, saveBday, runBirthdays, type ContactFilter,
} from "../lib/marketing";
import { getTemplate } from "../lib/templates";

const fail = (e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : String(e) });

export async function mktFetch(f: ContactFilter & { page?: number; per?: number }) {
  await requireStaff();
  const per = Math.min(200, Math.max(1, f.per || 10));
  const page = Math.max(1, f.page || 1);
  const where = contactWhere({ ...f, status: f.status ?? "Active" });
  const [rows, total] = await Promise.all([
    prisma.mktContact.findMany({ where, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], skip: (page - 1) * per, take: per }),
    prisma.mktContact.count({ where }),
  ]);
  return {
    total,
    rows: rows.map((r) => ({ id: r.id, email: r.email, first_name: r.firstName, last_name: r.lastName, full_name: r.fullName, source: r.source, status: r.status, audience: r.audience, birthday: r.birthday, case_id: r.caseId })),
  };
}

export async function mktUpsert(d: { id?: number; first_name: string; last_name: string; email: string; status: string; audience: string; birthday: string }) {
  const s = await requireStaff();
  const email = d.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false as const, error: "Valid email required" };
  const status = ["Active", "Trashed", "Unsubscribed"].includes(d.status) ? d.status : "Active";
  const bday = d.birthday.replace(/[^0-9-]/g, "");
  const birthday = /^\d{4}-\d{2}-\d{2}$/.test(bday) ? bday : "";
  try {
    if (d.id) {
      const ex = await prisma.mktContact.findUnique({ where: { id: d.id } });
      if (!ex) return { ok: false as const, error: "Not found" };
      await prisma.mktContact.update({
        where: { id: d.id },
        data: { email, firstName: d.first_name.trim(), lastName: d.last_name.trim(), fullName: `${d.first_name} ${d.last_name}`.trim(), status, audience: d.audience.trim(), birthday, source: "manual" },
      });
      if (d.audience) await ensureAudience(d.audience);
      await mktLog("contact.update", "Manual contact updated", { id: d.id, email, status, audience: d.audience, birthday }, s.uid);
    } else {
      await upsertContactRow({ email, first: d.first_name, last: d.last_name, status, audience: d.audience, birthday, source: "manual" });
      if (birthday) await prisma.mktContact.update({ where: { email }, data: { birthday } });
      const row = await prisma.mktContact.findUnique({ where: { email } });
      await mktLog("contact.add", "Manual contact added", { id: row?.id, email, status, audience: d.audience, birthday }, s.uid);
    }
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}

export async function mktDelete(id: number) {
  const s = await requireStaff();
  if (!id) return { ok: false as const, error: "Bad id" };
  const c = await prisma.mktContact.findUnique({ where: { id } });
  if (!c) return { ok: false as const, error: "Not found" };
  await prisma.mktContact.update({ where: { id }, data: { status: "Trashed" } });
  await mktLog("contact.trash", "Contact moved to trash", { id, email: c.email }, s.uid);
  return { ok: true as const };
}

export async function mktTplLoad(id: number) {
  await requireStaff();
  const t = await getTemplate(id);
  return t ? { ok: true as const, subject: t.subject || t.title, body: t.body } : { ok: false as const, error: "Could not load template" };
}

export async function mktRecipients(scope: string, f: ContactFilter & { ids?: number[] }) {
  await requireStaff();
  let where: object;
  if (scope === "selected") where = { id: { in: f.ids ?? [] } };
  else if (scope === "all") where = { status: { not: "Trashed" } };
  else if (scope === "source") where = contactWhere({ source: f.source, status: f.status, audiences: f.audiences, audience: f.audience });
  else if (scope === "audience") where = contactWhere({ audiences: f.audiences, audience: f.audience });
  else where = contactWhere(f);
  const rows = await prisma.mktContact.findMany({ where, orderBy: { id: "desc" }, take: 10000, select: { id: true, email: true } });
  return rows;
}

export async function mktSignature() {
  await requireStaff();
  return signatureHtml();
}

export async function mktSend(d: { ids: number[]; template_id?: number; subject: string; body: string; include_sig: boolean; include_unsub: boolean }) {
  const s = await requireStaff();
  try {
    const r = await sendCampaign({ ids: d.ids, templateId: d.template_id, subject: d.subject, body: d.body, includeSig: d.include_sig, includeUnsub: d.include_unsub, userId: s.uid });
    return { ok: true as const, ...r };
  } catch (e) {
    return fail(e);
  }
}

export async function mktSendTest(d: { to: string; template_id?: number; subject: string; body: string; include_sig: boolean }) {
  const s = await requireStaff();
  try {
    await sendTest({ to: d.to, templateId: d.template_id, subject: d.subject, body: d.body, includeSig: d.include_sig, userId: s.uid });
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}

export async function mktHistory(offset: number, limit = 20) {
  await requireStaff();
  const lim = Math.min(100, Math.max(1, limit));
  const [rows, total] = await Promise.all([prisma.mktLog.findMany({ orderBy: { id: "desc" }, skip: Math.max(0, offset), take: lim }), prisma.mktLog.count()]);
  return {
    total,
    rows: rows.map((r) => {
      const p = (r.payload ?? {}) as Record<string, unknown>;
      const snap = p.content_snapshot as { subject?: string; body?: string } | undefined;
      return {
        id: r.id,
        ts: r.ts.toISOString(),
        type: r.type,
        note: r.note,
        subject: String(p.subject ?? snap?.subject ?? ""),
        recipients: (Array.isArray(p.recipients) ? p.recipients : []) as string[],
        truncated: !!p.truncated,
        has_content: !!snap,
      };
    }),
  };
}

export async function mktHistoryView(id: number) {
  await requireStaff();
  const r = await prisma.mktLog.findUnique({ where: { id } });
  const snap = ((r?.payload ?? {}) as Record<string, unknown>).content_snapshot as { subject?: string; body?: string } | undefined;
  return { subject: snap?.subject ?? "", body: snap?.body ?? "" };
}

export async function mktSyncCases() {
  await requireStaff();
  try {
    return { ok: true as const, count: await syncAllCases() };
  } catch (e) {
    return fail(e);
  }
}

export async function mktAudList() {
  await requireStaff();
  return audiences();
}
export async function mktAudAdd(name: string) {
  await requireStaff();
  if (!name.trim()) return { ok: false as const, error: "Audience name required" };
  await ensureAudience(name);
  return { ok: true as const, list: await audiences() };
}

export async function mktBdaySave(d: { enabled: boolean; template_id: number; hour: number }) {
  await requireAdmin();
  await saveBday({ enabled: d.enabled ? 1 : 0, template_id: d.template_id, hour: Number.isFinite(d.hour) ? d.hour : 9 });
  return { ok: true as const, settings: await getBday() };
}
export async function mktBdayTest(templateId: number) {
  await requireStaff();
  if (!templateId) return { ok: false as const, error: "Pick a birthday template first" };
  try {
    return { ok: true as const, ...(await runBirthdays(templateId, true)) };
  } catch (e) {
    return fail(e);
  }
}
