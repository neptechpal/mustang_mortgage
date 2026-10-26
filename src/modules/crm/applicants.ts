/** Case applicant fields are shared by forms, email, search and marketing. */
export const APPLICANT_NUMBERS = [1, 2, 3, 4] as const;
export type ApplicantNumber = typeof APPLICANT_NUMBERS[number];
export type ApplicantCase = Partial<Record<`app${ApplicantNumber}${'Name' | 'Email' | 'Mobile' | 'Dob'}`, string>> & { applicantCount?: number; legacyName?: string; legacyEmail?: string };
export function applicants(c: ApplicantCase) {
  return APPLICANT_NUMBERS.map(n => ({ n, name: (c[`app${n}Name`] || '').trim(), email: (c[`app${n}Email`] || '').trim(), mobile: (c[`app${n}Mobile`] || '').trim(), dob: c[`app${n}Dob`] || '' }));
}
export function applicantCount(c: ApplicantCase) {
  return Math.max(1, Math.min(4, Math.trunc(c.applicantCount || 1)), ...applicants(c).filter(a => a.name || a.email || a.mobile || a.dob).map(a => a.n));
}
export const applicantNames = (c: ApplicantCase) => applicants(c).map(a => a.name).filter(Boolean).join(' & ');
export const applicantEmails = (c: ApplicantCase) => [...new Set(applicants(c).map(a => a.email.toLowerCase()).filter(Boolean))];
export function applicantSearch(q: string) {
  return APPLICANT_NUMBERS.flatMap(n => ['Name', 'Email', 'Mobile'].map(field => ({ [`app${n}${field}`]: { contains: q, mode: 'insensitive' as const } })));
}
