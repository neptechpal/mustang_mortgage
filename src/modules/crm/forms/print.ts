import type { Case } from '@prisma/client';
import { prisma } from '@/lib/db';
import { readStoredFile } from '@/lib/storage';
import { applicants } from '../applicants';
import { factFindSchema, formSchema } from './service';
import { summary, type Values, type SummaryGroup } from './engine';
import { getCrmOptions } from '../options';
import { borrowSettings } from '@/modules/crm-extra/lib/borrow';
import { fromSydLocal } from '@/modules/crm-extra/lib/cases';
import { fmtLong } from '../util';

export const staffPrintUrl = (caseId: number, form: number | string = 'ff', v?: number) => `/admin/cases/${caseId}/forms/${form}/print${v === undefined ? '' : `?v=${v}`}`;
export const clientPrintUrl = (caseId: number, key: string, form: number | string = 'ff') => `/portal/print?${new URLSearchParams({ mm_case: String(caseId), mm_key: key, form: String(form) })}`;
const wallTime = (ts: string) => fmtLong(fromSydLocal(ts)) || ts;

/** The original hard-coded Fact Find has no saved form schema. */
function classicGroups(values: Values): SummaryGroup[] {
  const order = ['Your loan', 'Applicant 1', 'Applicant 2', 'Applicant 3', 'Applicant 4', 'Monthly expenses', 'Assets', 'Liabilities', 'Preferences', 'Declaration', 'Other'];
  const buckets: Record<string, SummaryGroup['rows']> = {};
  for (const [key, raw] of Object.entries(values)) {
    if (key.endsWith('__ts') || raw === '' || raw == null) continue;
    if (Array.isArray(raw) && raw.some(v => v && typeof v === 'object')) continue;
    const value = Array.isArray(raw) ? raw.join(', ') : String(raw);
    if (!value) continue;
    let group = 'Other', label = key;
    const applicant = /^applicant(\d)_(.*)$/.exec(key);
    if (applicant) { group = `Applicant ${applicant[1]}`; label = applicant[2]; }
    else if (key.startsWith('expenses_')) { group = 'Monthly expenses'; label = key.slice(9); }
    else if (/^(asset_|realestate_)/.test(key)) group = 'Assets';
    else if (key.startsWith('liability_')) group = 'Liabilities';
    else if (['purpose_of_lending','compliance_objective','applicant_count'].includes(key)) group = 'Your loan';
    else if (['desired_loan_features','additional_comments'].includes(key)) group = 'Preferences';
    else if (/^(declaration_|signature_)/.test(key)) group = 'Declaration';
    (buckets[group] ||= []).push({ key, label: label.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), type: 'text', raw, value });
  }
  return [...order, ...Object.keys(buckets).filter(k => !order.includes(k))].filter(k => buckets[k]?.length).map(title => ({ title, rows: buckets[title], tone: '' }));
}

/** Caller authenticates the case. Client printing additionally requires a visible assignment. */
export async function printSubmission(c: Case, formId: string, version?: string, client = false) {
  let title = 'Fact Find', schema, classic = false, draft: Values = {}, history: { data: Values; ts: string; ip: string }[] = [];
  if (formId === 'ff') {
    if (client && !c.showFactfind) return null;
    const ff = await factFindSchema(); schema = ff.schema; classic = !ff.engine;
    draft = (c.ffDraft || {}) as Values;
    const subs = await prisma.factFindSubmission.findMany({ where: { caseId: c.id }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
    history = subs.map(s => ({ data: s.data as Values, ts: fmtLong(s.createdAt), ip: s.ip }));
  } else {
    const id = Number(formId); if (!Number.isSafeInteger(id) || id < 1) return null;
    const [f, st] = await Promise.all([prisma.crmForm.findUnique({ where: { id } }), prisma.caseForm.findUnique({ where: { caseId_formId: { caseId: c.id, formId: id } } })]);
    if (!f || !st || (client && (st.removed || f.status !== 'publish'))) return null;
    title = f.title; schema = formSchema(f); draft = (st.draft || {}) as Values;
    history = (Array.isArray(st.history) ? st.history : []).flatMap(s => s && typeof s === 'object' && !Array.isArray(s) && s.data && typeof s.data === 'object' ? [{ data: s.data as Values, ts: wallTime(String(s.ts || '')), ip: String(s.ip || '') }] : []);
  }
  let index = version === undefined ? history.length - 1 : Number(version);
  if (!Number.isInteger(index) || index < 0 || index >= history.length) index = history.length - 1;
  const selected = history[index], values = selected?.data || draft, groups = classic ? classicGroups(values) : summary(schema, values);
  for (const group of groups) for (const row of group.rows) {
    if (row.type !== 'signature' && !/^signature(?:_|-|$)/i.test(row.key)) continue;
    row.type = 'signature';
    if (!row.signed_at) row.signed_at = String(values[`${row.key}__ts`] || (classic ? c.ffSignatureTs : '') || '');
    if (row.signed_at) row.signed_at = wallTime(row.signed_at);
    let raw = String(row.raw || '');
    if (raw.startsWith('file:')) {
      const file = await readStoredFile(raw.slice(5));
      if (file && file.rec.owner === `case:${c.id}` && /^image\/(png|jpeg|webp)$/.test(file.rec.mimeType)) raw = `data:${file.rec.mimeType};base64,${file.data.toString('base64')}`;
    }
    // Only raster signatures; SVG/active URLs must never execute in print views.
    (row as typeof row & { image?: string }).image = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/.test(raw) ? raw : undefined;
  }
  const [core, borrow] = await Promise.all([getCrmOptions(), borrowSettings()]);
  return { caseId: c.id, title, groups, contacts: applicants(c).filter(a => a.name || a.email).map(a => [a.name, a.email].filter(Boolean).join(' · ')),
    fallbackName: c.title, submitted: !!selected, submittedAt: selected?.ts || '—', version: selected ? `Submission ${index + 1} of ${history.length}` : 'Draft — not yet submitted',
    ip: client ? '' : selected?.ip || '', company: borrow.company || 'Mustang Mortgage', logo: borrow.logo || core.brand_logo,
    broker: [borrow.broker_name, borrow.broker_mobile, borrow.broker_email].filter(Boolean).join(' · '), printedAt: fmtLong(new Date()) };
}
export type PrintedSubmission = NonNullable<Awaited<ReturnType<typeof printSubmission>>>;
