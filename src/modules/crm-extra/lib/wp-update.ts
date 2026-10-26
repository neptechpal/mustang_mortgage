/** Pure adapters for the 2026-10-26 WP meta. No writes, mail or network calls. */
import { applicantCount, type ApplicantCase } from '@/modules/crm/applicants';
import { validSettlementDate } from './income';
const obj = (v: unknown): Record<string, unknown> => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const str = (v: unknown) => typeof v === 'string' || typeof v === 'number' ? String(v) : '';
const num = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : 0;
const array = (v: unknown): unknown[] => Array.isArray(v) ? v : Object.values(obj(v));
export function updatedWpCaseFields(meta: Record<string, unknown>) {
  const extra = array(meta._mmcrm_extra_apps).map(obj), answers: Record<string, unknown> = { ...obj(meta._mm_ff_draft) };
  for (const raw of array(meta._mmf_forms)) {
    const state = obj(raw), history = array(state.history);
    Object.assign(answers, obj(state.draft), obj(obj(history[history.length - 1]).data));
  }
  const fields: ApplicantCase = {};
  for (const n of [1,2,3,4] as const) for (const [key, suffix] of [['name','Name'],['email','Email'],['mobile','Mobile'],['dob','Dob']] as const) {
    const formKey = key === 'name' ? 'full_name' : key;
    fields[`app${n}${suffix}`] = str(meta[`mm_app${n}_${key}`]) || (n > 2 ? str(extra[n - 3]?.[key]) : '') || str(answers[`applicant${n}_${key === 'name' ? 'fullname' : key}`]) || str(answers[formKey + (n === 1 ? '' : `_${n}`)]);
  }
  const flag = meta._mmcrm_deal_v2;
  return { ...fields, applicantCount: applicantCount({ ...fields, applicantCount: num(meta.mm_applicant_count || answers.applicant_count) }),
    dealV2: flag === true || flag === 1 || flag === '1',
    bankPct: meta._mmcrm_bank_pct === undefined ? null : num(meta._mmcrm_bank_pct),
    aggregatorPct: meta._mmcrm_agg_pct === undefined ? null : num(meta._mmcrm_agg_pct),
    trailPct: meta._mmcrm_trail_pct === undefined ? null : num(meta._mmcrm_trail_pct),
    settlementDate: validSettlementDate(str(meta._mmcrm_settle_date)),
  };
}
