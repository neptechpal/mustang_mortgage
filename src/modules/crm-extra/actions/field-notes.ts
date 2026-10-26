"use server";
import { createHash } from 'node:crypto';
import { prisma } from '@/lib/db';
import { requireStaff } from '@/lib/session';
import { escapeHtml } from '@/lib/mail';
import { revalidatePath } from 'next/cache';
import { applicantNames, applicantEmails, applicants, applicantSearch } from '@/modules/crm/applicants';
import { STAGES, STATUSES } from '@/modules/crm/constants';
import { timeAgo } from '@/modules/crm/util';
import { NOTE_TYPES, noteDisplayHtml, whatsappNumber } from '../lib/field-notes';
import { noteDate } from '../lib/notes';

export async function fieldNoteCases(query = '', all = false) {
  await requireStaff();
  const q = query.trim().slice(0, 200);
  const cases = await prisma.case.findMany({ where: {
    ...(!all ? { status: { notIn: ['completed','archive','unsuccessful'] } } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' as const } }, ...applicantSearch(q), ...(/^#?\d+$/.test(q) ? [{ id: Number(q.replace('#', '')) }] : [])] } : {}),
  }, orderBy: { updatedAt: 'desc' }, take: 500 });
  const notes = await prisma.brokerNote.groupBy({ by: ['caseId'], where: { caseId: { in: cases.map(c => c.id) } }, _count: { id: true }, _max: { createdAt: true } });
  const rows = cases.map(c => {
    const n = notes.find(n => n.caseId === c.id);
    return { id: c.id, name: applicantNames(c) || c.title, stage: STAGES[c.stage] || c.stage, status: STATUSES[c.status] || c.status,
      notes: n?._count.id || 0, last: n?._max.createdAt ? timeAgo(n._max.createdAt) : '', sort: Math.max(c.updatedAt.getTime(), n?._max.createdAt?.getTime() || 0) };
  }).sort((a,b) => b.sort - a.sort);
  return { cases: rows.slice(0,40), total: rows.length };
}
async function payload(caseId: number) {
  const [notes, total] = await Promise.all([prisma.brokerNote.findMany({ where: { caseId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 40 }), prisma.brokerNote.count({ where: { caseId } })]);
  return { notes: notes.map(n => ({ id: n.id, title: n.title, html: noteDisplayHtml(n.body), by: n.author || (n.authorId ? 'User' : 'System'), when: noteDate(n.createdAt, ', '), ago: timeAgo(n.createdAt) })), total };
}
export async function fieldNoteCase(caseId: number) {
  await requireStaff();
  const c = await prisma.case.findUnique({ where: { id: caseId } });
  if (!c) return null;
  return { case: { id: c.id, name: applicantNames(c) || c.title, stage: STAGES[c.stage] || c.stage, status: STATUSES[c.status] || c.status,
    emails: applicantEmails(c), phones: applicants(c).filter(a => a.mobile).map(a => ({ name: a.name || `Applicant ${a.n}`, tel: a.mobile.replace(/[^\d+]/g, ''), wa: whatsappNumber(a.mobile) })) }, ...await payload(caseId) };
}
export async function addFieldNote(input: { caseId: number; text: string; type: string; dir: string; title: string; requestId: string }) {
  const me = await requireStaff();
  const text = String(input.text || '').replace(/<[^>]*>/g, '').trim();
  if (!text) return { ok: false as const, error: 'Please type a note first.' };
  if (text.length > 20000) return { ok: false as const, error: 'That note is too long — please split it.' };
  if (!/^[a-zA-Z0-9-]{8,100}$/.test(input.requestId)) return { ok: false as const, error: 'Please reload this page and try again.' };
  const type = NOTE_TYPES.find(t => t.id === input.type) || NOTE_TYPES[4];
  const direction = input.dir === 'in' ? 'Received from client' : input.dir === 'out' ? 'Sent to client' : '';
  const hash = createHash('sha256').update(`${input.caseId}|${text}|${type.id}`).digest('hex');
  // Keep retries idempotent without discarding edits made after a lost response.
  const sourceKey = `mobile:${me.uid}:${input.caseId}:${input.requestId}:${hash}`;
  const when = noteDate(new Date(), ', '), esc = escapeHtml;
  const title = `${input.title.trim().replace(/<[^>]*>/g, '').slice(0,220) || type.label} — ${when}`;
  const body = `<p><strong>${esc(type.label)}</strong>${direction ? ` · ${direction}` : ''} · recorded ${esc(when)} by ${esc(me.name)} <em>(via mobile notes)</em></p><p>${esc(text).replace(/\n/g, '<br>')}</p>`;
  const result = await prisma.$transaction(async tx => {
    // Serialize retries for this staff member, including simultaneous double taps.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261026, ${me.uid}::integer)`;
    if (!await tx.case.findUnique({ where: { id: input.caseId }, select: { id: true } })) return 'missing';
    if (await tx.brokerNote.findUnique({ where: { sourceKey }, select: { id: true } })) return 'duplicate';
    const recent = await tx.caseEvent.findFirst({ where: { type: 'broker_note', by: String(me.uid), createdAt: { gte: new Date(Date.now() - 60000) }, extra: { path: ['hash'], equals: hash } } });
    if (recent) return 'duplicate';
    await tx.brokerNote.create({ data: { caseId: input.caseId, sourceKey, title, body, author: me.name, authorId: me.uid } });
    await tx.caseEvent.create({ data: { caseId: input.caseId, type: 'broker_note', detail: `Broker note added (${type.label})`, by: String(me.uid), extra: { hash } } });
    await tx.caseActivity.create({ data: { caseId: input.caseId, type: 'sys', detail: `Broker note added (${type.label})`, by: me.name } });
    await tx.case.update({ where: { id: input.caseId }, data: { updatedAt: new Date() } });
    return 'created';
  });
  if (result === 'missing') return { ok: false as const, error: 'Case not found.' };
  for (const path of ['/admin/field-notes', '/admin/notes', `/admin/cases/${input.caseId}`]) revalidatePath(path);
  return { ok: true as const, dup: result === 'duplicate', ...await payload(input.caseId) };
}
