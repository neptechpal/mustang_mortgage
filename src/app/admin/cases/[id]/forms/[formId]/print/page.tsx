import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/session';
import { prisma } from '@/lib/db';
import { printSubmission } from '@/modules/crm/forms/print';
import SubmissionPrint from '@/modules/crm/components/SubmissionPrint';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Print submission', robots: { index: false, follow: false }, referrer: 'no-referrer' as const };
export default async function PrintPage({ params, searchParams }: { params: Promise<{ id: string; formId: string }>; searchParams: Promise<{ v?: string }> }) {
  const me = await requireStaff(), { id, formId } = await params, { v } = await searchParams;
  if (!/^\d+$/.test(id)) notFound();
  const c = await prisma.case.findUnique({ where: { id: Number(id) } });
  if (!c) notFound();
  const data = await printSubmission(c, formId, v);
  if (!data) notFound();
  return <SubmissionPrint data={data} printedBy={me.name} />;
}
