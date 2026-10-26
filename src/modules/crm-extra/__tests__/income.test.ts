import test from 'node:test';
import assert from 'node:assert/strict';
import { balanceFactor, computeIncome, dealAmounts, dealSaveData, financialYear, INCOME_DEFAULTS, normAggregatorPct, normIncomePct, planIncome, readDeal, sydneyDate, validSettlementDate, type IncomeCase } from '../lib/income';
import { updatedWpCaseFields } from '../lib/wp-update';
import { applicantCount, applicantEmails, applicantNames } from '../../crm/applicants';
import { classicFactFind, defaultEnquiry, defaultFactFind, upgradeEnquirySchema, withFourApplicants } from '../../crm/forms/defaults';
import { caseMapColumn, formatValue, normalizeSchema, sanitizeValues, stripHidden, validate, visibility } from '../../crm/forms/engine';
import { noteDisplayHtml, whatsappNumber } from '../lib/field-notes';
const near = (actual: number, expected: number, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} != ${expected}`);
const flat = { rate: 6.2, term: 30, paydown: false };
const fixture = (patch: Partial<IncomeCase> = {}): IncomeCase => ({ id: 1, name: 'Example', stage: 'new', status: 'active', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-10-10T00:00:00Z', loanAmount: 650000, bankPct: .7, aggregatorPct: 20, trailPct: .2, dealV2: true, ...patch });

test('PHP percentage threshold and aggregator fraction normalisation', () => {
  near(normIncomePct(.007), .7); assert.equal(normIncomePct(.7), .7); assert.equal(normIncomePct(.05), .05);
  assert.equal(normIncomePct(.002), .2); assert.equal(normIncomePct(80), 80);
  assert.equal(normIncomePct(-1), 0); assert.equal(normIncomePct(NaN), 0);
  assert.equal(normAggregatorPct(.2), 20); assert.equal(normAggregatorPct(20), 20);
  assert.equal(normAggregatorPct(200), 100); assert.equal(normAggregatorPct(-10), 0);
});
test('worked PHP example: $650k, bank .7%, aggregator 20%, trail .2%', () => {
  // Outputs obtained by executing the supplied mmcrm_balance_factor() in PHP.
  const d = dealAmounts(650000, .7, 20, .2);
  near(d.upfrontGross, 4550); near(d.upfrontYou, 3640); near(d.aggregatorUpfront, 910);
  near(d.trailMonthYou, 86.66666666666667); near(d.trailYearYou, 1040); near(d.trail5Years, 5031.390301294077);
  near(dealAmounts(650000, .7, 20, .2, flat).trail5Years, 5200);
});
test('paydown balance and zero-interest / term limits match PHP', () => {
  near(balanceFactor(1), .9990419768924037); near(balanceFactor(60), .9328140091255013);
  near(balanceFactor(60, 0, 30), 5 / 6); assert.equal(balanceFactor(0), 1);
  assert.equal(balanceFactor(-1), 1); assert.equal(balanceFactor(360), 0); assert.equal(balanceFactor(800), 0);
  assert.equal(balanceFactor(1, 0, 0), 0);
});
test('legacy fractions and MM split convert automatically without locking defaults', () => {
  for (const bank of [.007, .7]) for (const mm of [.8, 80]) {
    const d = readDeal({ loanAmount: 650000, commPct: bank, commMmPct: mm });
    near(d.upfrontYou, 3640); assert.equal(d.aggPct, 20); assert.equal(d.assumed, true);
  }
  const old = readDeal({ meta: { mm_loan_amount: 650000, mm_commission_pct: .007, mm_commission_to_mm_pct: .8 } });
  near(old.upfrontYou, 3640);
  const s = { ...INCOME_DEFAULTS, bank_pct: .8, agg_pct: 10, trail_pct: .25 };
  near(readDeal({ loanAmount: 650000 }, s).upfrontYou, 4680);
  near(readDeal(fixture(), s).upfrontYou, 3640);
  assert.equal(readDeal(fixture()).assumed, false);
});
test('explicit zero v2 percentages remain zero; writes preserve legacy reader values', () => {
  const data = dealSaveData(650000, .7, 20, .2, '2026-10-26');
  near(data.commPct, .007); assert.equal(data.commMmPct, 80); assert.equal(data.dealV2, true);
  assert.equal(readDeal({ ...data, bankPct: 0 }).hasDeal, false);
  assert.equal(readDeal({ ...data, aggregatorPct: 100 }).upfrontYou, 0);
  assert.equal(readDeal({ ...data, trailPct: 0 }).trailMonthYou, 0);
  assert.equal(dealSaveData(-1, -2, 120, -1, 'bad').loanAmount, 0);
  assert.equal(dealSaveData(1, 1, 20, 1, '').settlementDate, '');
  assert.equal('settlementDate' in dealSaveData(1, 1, 20, 1), false);
});
test('settlement states, including completed fallback and archived/lost exclusions', () => {
  const now = '2026-10-26';
  assert.equal(readDeal(fixture({ settlementDate: now }), INCOME_DEFAULTS, now).state, 'settled');
  assert.equal(readDeal(fixture({ settlementDate: '2026-10-27' }), INCOME_DEFAULTS, now).state, 'pipeline');
  assert.equal(readDeal(fixture({ status: 'unsuccessful', settlementDate: '2026-09-01' }), INCOME_DEFAULTS, now).state, 'lost');
  assert.equal(readDeal(fixture({ status: 'archive' }), INCOME_DEFAULTS, now).state, 'archived');
  assert.equal(readDeal(fixture({ status: 'archive', settlementDate: '2026-09-01' }), INCOME_DEFAULTS, now).state, 'settled');
  assert.equal(readDeal(fixture({ status: 'completed' }), INCOME_DEFAULTS, now).settleDate, '2026-10-10');
  // PHP treats completed as settled even when its explicitly saved date is future.
  assert.equal(readDeal(fixture({ status: 'completed', settlementDate: '2027-01-01' }), INCOME_DEFAULTS, now).state, 'settled');
});
test('Australian financial year and Sydney dates handle June/July and DST', () => {
  assert.equal(financialYear('2026-06-30').label, '2025–26');
  assert.deepEqual(financialYear('2026-07-01'), { start: 2026 * 12 + 6, label: '2026–27', startDate: '2026-07-01', endDate: '2027-06-30' });
  assert.equal(sydneyDate('2026-06-30T14:00:00Z'), '2026-07-01');
  assert.equal(sydneyDate('2026-10-25T13:00:00Z'), '2026-10-26');
  assert.equal(validSettlementDate('2026-02-30'), ''); assert.equal(validSettlementDate('2028-02-29'), '2028-02-29');
});
test('locked-in trail includes settlement month; payment chart starts next month', () => {
  const c = computeIncome([fixture({ settlementDate: '2026-10-26' })], INCOME_DEFAULTS, flat, '2026-10-26');
  near(c.runRate, 86.66666666666667); near(c.upfrontMonth, 3640); near(c.upfrontFy, 3640);
  assert.equal(c.settledProj[0], 0); near(c.settledProj[1], 86.66666666666667);
  assert.equal(c.bars[11], 3640); assert.equal(c.bars.length, 12);
  assert.deepEqual(c.barLabels, ['Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct']);
});
test('FY totals and last month amounts use settlement month boundaries', () => {
  const c = computeIncome([fixture({ settlementDate: '2026-06-30' }), fixture({ id: 2, settlementDate: '2026-07-01' })], INCOME_DEFAULTS, flat, '2026-07-15');
  near(c.upfrontLast, 3640); near(c.upfrontMonth, 3640); near(c.upfrontFy, 3640); near(c.upfrontAll, 7280);
});
test('all six stage probabilities, lead days and stale-date fallback match PHP', () => {
  const stages = ['new','awaiting-docs','submitted','pre-approved','full-approval','settlement'];
  const cases = stages.map((stage,i) => fixture({ id: i + 1, stage, createdAt: '2026-10-26T00:00:00Z' }));
  const c = computeIncome(cases, INCOME_DEFAULTS, flat, '2026-10-26');
  near(c.pipeUpfront, 21840); near(c.pipeUpfrontWeighted, 11648); near(c.pipeTrailWeighted, 277.3333333333333);
  assert.deepEqual(c.deals.map(d => d.when), ['2027-02-03','2027-01-14','2026-12-20','2026-12-10','2026-11-16','2026-11-02']);
  const stale = computeIncome([fixture()], INCOME_DEFAULTS, flat, '2026-10-26');
  assert.equal(stale.deals[0].when, '2026-11-09'); assert.equal(stale.deals[0].estDate, true);
  assert.equal(stale.pipeProj[1], 0); near(stale.pipeProj[2], 8.666666666666667);
});
test('settled averages preferred; lost/no-deal/undated archived omitted; empty book is finite', () => {
  const c = computeIncome([fixture({ status: 'completed' }), fixture({ id: 2, loanAmount: 1000000 }), fixture({ id: 3, status: 'unsuccessful' }), fixture({ id: 4, status: 'archive' }), fixture({ id: 5, bankPct: 0 })], INCOME_DEFAULTS, flat, '2026-10-26');
  assert.equal(c.deals.length, 2); assert.equal(c.avgLoan, 650000); near(c.avgUpfront, 3640);
  const empty = computeIncome([], INCOME_DEFAULTS, flat, '2026-10-26');
  assert.equal(empty.avgLoan, 0); assert.equal(empty.runRate, 0); assert.ok(empty.pipeProj.every(v => v === 0));
});
test('one-more-deal planner uses 24 upfronts and exact .93 three-year allowance', () => {
  const p = planIncome(650000, .7, 20, .2, 2, 500);
  near(p.yearUpfront, 87360); near(p.trailAdded, 2080); near(p.book3, 6303.2); near(p.book3Year, 75638.4);
  near(planIncome(650000, .7, .2, .2, 2, 500, flat).book3, 6740);
  near(planIncome(650000, .7, 20, .2, 0, 500).book3, 500);
});
test('new WP meta: extras and website submissions preserve all four applicants and deal values', () => {
  const fields = updatedWpCaseFields({ mm_app1_name: 'One', mm_app2_name: 'Two', _mmcrm_extra_apps: [{ name: 'Three', email: 'three@example.test', mobile: '0400000003' }, { name: 'Four', email: 'four@example.test' }], _mmcrm_deal_v2: '1', _mmcrm_bank_pct: '.7', _mmcrm_agg_pct: '20', _mmcrm_trail_pct: '.2', _mmcrm_settle_date: '2026-10-26' });
  assert.equal(fields.applicantCount, 4); assert.equal(fields.app3Name, 'Three'); assert.equal(fields.bankPct, .7); assert.equal(fields.aggregatorPct, 20); assert.equal(fields.dealV2, true);
  assert.equal(applicantNames(fields), 'One & Two & Three & Four'); assert.deepEqual(applicantEmails(fields), ['three@example.test','four@example.test']);
  const direct = updatedWpCaseFields({ mm_app3_name: 'Explicit Three', _mmcrm_extra_apps: [{ name: 'Older Three' }] });
  assert.equal(direct.app3Name, 'Explicit Three'); assert.equal(direct.applicantCount, 3);
  const fromForm = updatedWpCaseFields({ _mmf_forms: { 3012: { history: [{ data: { applicant_count: '4', full_name: 'One', full_name_3: 'Three', email_4: 'four@example.test' } }] } } });
  assert.equal(fromForm.app3Name, 'Three'); assert.equal(fromForm.app4Email, 'four@example.test'); assert.equal(fromForm.applicantCount, 4);
});
test('enquiry retains legacy fields, validates selected applicants and strips hidden details', () => {
  const schema = defaultEnquiry();
  const base = { applicant_count: '1', full_name: 'One', email: 'one@example.test', mobile: '0400000001', notes: 'A conversation', full_name_4: 'Hidden' };
  assert.deepEqual(validate(schema, base), {});
  assert.equal(stripHidden(schema, base).full_name_4, undefined);
  assert.equal(validate(schema, { ...base, applicant_count: '4' }).full_name_3, 'Full name is required.');
  assert.equal(caseMapColumn('app4_email'), 'app4Email'); assert.equal(caseMapColumn('broker_note'), '');
  const clean = sanitizeValues(schema, { ...base, applicant_count: '4', full_name_3: 'Three', email_4: 'four@example.test' });
  assert.equal(clean.email_4, 'four@example.test');
  assert.equal(schema.sections.flatMap(s => s.fields).find(f => f.key === 'notes')?.map, 'broker_note');
  const original = normalizeSchema({ settings: { public: 1 }, sections: [{ fields: ['full_name','email','mobile','purpose','loan_amount','timeframe','notes'].map(key => ({ key, type: 'text' })) }] });
  assert.equal(upgradeEnquirySchema(original).sections.length, 5);
  const custom = normalizeSchema({ settings: { public: 1 }, sections: [{ fields: [{ key: 'custom', type: 'text' }] }] });
  assert.deepEqual(upgradeEnquirySchema(custom), custom);
});
test('four applicant Fact Finds retain all sections and activate the second applicant for counts 3/4', () => {
  for (const schema of [classicFactFind(), defaultFactFind(), withFourApplicants(defaultFactFind())]) {
    const fields = schema.sections.flatMap(s => s.fields);
    assert.equal(new Set(fields.map(f => f.key)).size, fields.length);
    for (const n of [1,2,3,4]) assert.ok(visibility(schema, { applicant_count: '4' }).fields.has(`applicant${n}_fullname`));
  }
  assert.equal(applicantCount({ app2Name: 'Two' }), 2);
  const old = normalizeSchema({ sections: [{ fields: [{ key: 'applicant_count', type: 'select', options: ['1','2'] }] }, { title: 'Applicant 2', show_if: { field: 'applicant_count', op: 'eq', value: '2' }, fields: [{ key: 'applicant2_fullname', map: 'app2_name', type: 'text' }] }] });
  const upgraded = withFourApplicants(old);
  assert.deepEqual(upgraded.sections.slice(1).map(s => s.title), ['Applicant 2','Applicant 3','Applicant 4']);
  assert.ok(visibility(upgraded, { applicant_count: '4' }).fields.has('applicant4_fullname'));
  assert.deepEqual(withFourApplicants(upgraded), upgraded);
  assert.equal(formatValue({ type: 'repeater' }, [{ name: 'One' }, { name: 'Two' }]), '2 items');
});
test('mobile AU/00 phone normalisation and safe note rendering', () => {
  assert.equal(whatsappNumber('0412 345 678'), '61412345678');
  assert.equal(whatsappNumber('+61 412 345 678'), '61412345678');
  assert.equal(whatsappNumber('0061 412 345 678'), '61412345678'); assert.equal(whatsappNumber(''), '');
  assert.equal(noteDisplayHtml('<p onclick="bad()"><strong>Note</strong><img src=x onerror=bad()></p><script>bad()</script>'), '<p><strong>Note</strong></p>');
});
