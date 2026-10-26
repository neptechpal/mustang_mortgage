import { notFound } from 'next/navigation';
import { authPortal } from '@/modules/crm/cases';
import { printSubmission } from '@/modules/crm/forms/print';
import SubmissionPrint from '@/modules/crm/components/SubmissionPrint';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Print your submission', robots: { index: false, follow: false }, referrer: 'no-referrer' as const };
export default async function ClientPrint({ searchParams }: { searchParams: Promise<{ mm_case?: string; mm_key?: string; form?: string; v?: string }> }) {
  const sp = await searchParams;
  const c = await authPortal(sp.mm_case, sp.mm_key);
  if (!c) notFound();
  const data = await printSubmission(c, sp.form || 'ff', sp.v, true);
  if (!data) notFound();
  return <SubmissionPrint data={data} />;
}
