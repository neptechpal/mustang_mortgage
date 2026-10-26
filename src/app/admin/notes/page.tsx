import Link from "next/link";
import { BriefcaseBusiness, ExternalLink, GraduationCap, Info, NotebookPen, Printer, StickyNote } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { Alert, Badge, Card, EmptyState, LinkButton, PageHeader, StatCard, buttonStyles } from "@/components/admin/ui";
import { notesFor, noteDate } from "@/modules/crm-extra/lib/notes";
import { NoteBubbles, QuickAddNote } from "@/modules/crm-extra/components/BrokerNotes";

export const metadata = { title: "Broker Notes" };
export const dynamic = "force-dynamic";

export default async function NotesOverview() {
  await requireStaff();
  const recent = await prisma.case.findMany({ orderBy: { updatedAt: "desc" }, take: 50, select: { id: true, title: true } });
  const caseOpts = recent.map((c) => ({ id: c.id, label: c.title || `Case #${c.id}` }));
  const general = await notesFor(0, " ");
  const grouped = await prisma.brokerNote.groupBy({ by: ["caseId"], where: { caseId: { gt: 0 } } });
  const cases = await prisma.case.findMany({
    where: { id: { in: grouped.map((g) => g.caseId) } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true },
  });
  const caseNotes = await prisma.brokerNote.findMany({ where: { caseId: { in: cases.map((c) => c.id) } }, orderBy: { createdAt: "desc" } });
  const smallBtn = buttonStyles({ variant: "secondary", size: "sm" });
  return (
    <div>
      <PageHeader
        icon={<NotebookPen />}
        title="Broker Notes"
        description="View and manage broker notes across all cases."
        actions={
          <LinkButton href="/admin/notes/learning" variant="secondary">
            <GraduationCap /> Learning Vault
          </LinkButton>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2 sm:hidden">
        <Badge tone="brand">{general.length} general</Badge>
        <Badge tone="info">{caseNotes.length} case notes</Badge>
        <Badge tone="violet">
          {cases.length} {cases.length === 1 ? "case" : "cases"}
        </Badge>
      </div>
      <div className="mb-6 hidden gap-4 sm:grid sm:grid-cols-3">
        <StatCard label="General notes" value={general.length} icon={<StickyNote />} tone="brand" href="#general-notes" />
        <StatCard label="Case notes" value={caseNotes.length} icon={<NotebookPen />} tone="info" href="#case-notes" />
        <StatCard label="Cases with notes" value={cases.length} icon={<BriefcaseBusiness />} tone="violet" href="#case-notes" />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <aside className="space-y-4 xl:sticky xl:top-20 xl:order-2">
          <QuickAddNote cases={caseOpts} />
          <Alert tone="info">
            <span className="flex gap-2">
              <Info className="mt-0.5 size-4 shrink-0" />
              <span>
                Tip: You can also add notes directly from any{" "}
                <Link href="/admin/cases" className="font-medium underline">
                  case edit screen
                </Link>
                .
              </span>
            </span>
          </Alert>
        </aside>

        <div className="min-w-0 space-y-6">
          <Card
            id="general-notes"
            title="General Notes (No Case)"
            description="Notes not attached to a client case."
            actions={
              <a href="/admin/notes/print?scope=general" target="_blank" className={smallBtn}>
                <Printer /> Print General Notes
              </a>
            }
          >
            {general.length === 0 ? (
              <EmptyState icon={<StickyNote />} title="No general notes yet." description="Use Quick Add with “General Note (no case)” to add one." className="py-8" />
            ) : (
              <NoteBubbles notes={general} assignCases={caseOpts} />
            )}
          </Card>

          <section id="case-notes" className="scroll-mt-20">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-slate-900">Case Notes</h2>
              <Badge>
                {cases.length} {cases.length === 1 ? "case" : "cases"}
              </Badge>
            </div>
            {cases.length === 0 && <EmptyState icon={<NotebookPen />} title="No case notes yet." description="Notes added on a case’s Broker Notes tab appear here." />}
            <div className="space-y-4">
              {cases.map((c) => (
                <Card
                  key={c.id}
                  title={
                    <Link href={`/admin/cases/${c.id}`} className="hover:text-brand-700 hover:underline">
                      {c.title || `Case #${c.id}`}
                    </Link>
                  }
                  actions={
                    <>
                      <Link href={`/admin/cases/${c.id}`} className={smallBtn}>
                        <ExternalLink /> Edit Case
                      </Link>
                      <a href={`/admin/notes/print?case_id=${c.id}`} target="_blank" className={smallBtn}>
                        <Printer /> Print
                      </a>
                    </>
                  }
                >
                  <NoteBubbles
                    notes={caseNotes
                      .filter((n) => n.caseId === c.id)
                      .map((n) => ({ id: n.id, title: n.title, body: n.body, author: n.author, date: noteDate(n.createdAt) }))}
                  />
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
