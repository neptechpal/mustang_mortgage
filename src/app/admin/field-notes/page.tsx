import { requireStaff } from '@/lib/session';
import FieldNotes from '@/modules/crm-extra/components/FieldNotes';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Field notes', robots: { index: false, follow: false } };
export default async function FieldNotesPage() {
  const me = await requireStaff();
  return <FieldNotes userId={me.uid} />;
}
