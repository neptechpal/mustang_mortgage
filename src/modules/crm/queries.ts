import { applicantSearch } from "./applicants";
import { getIncomeSettings } from "@/modules/crm-extra/lib/income-settings";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { caseFacts } from "./cases";
import { CHASE_BUCKETS, STAGE_COLORS, STAGES } from "./constants";
import { statusLabel } from "./forms/service";
import { fmtDate, timeAgo } from "./util";
import type { KCard } from "./components/Kanban";
import type { CaseRow } from "./components/CasesTable";

export async function listCases(f: { status?: string; stage?: string; q?: string }) {
  const where: Prisma.CaseWhereInput = {};
  if (f.status) where.status = f.status;
  if (f.stage) where.stage = f.stage;
  if (f.q) {
    const q = f.q.trim();
    const id = parseInt(q.replace(/^#/, ""), 10);
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      ...applicantSearch(q),
      { legacyEmail: { contains: q, mode: "insensitive" } },
      ...(id ? [{ id }] : []),
    ];
  }
  const income = await getIncomeSettings();
  const cases = await prisma.case.findMany({ where, include: { documents: true }, orderBy: { createdAt: "desc" }, take: 500 });
  return cases.map((c): CaseRow => {
    const fc = caseFacts(c, income);
    const draft = c.ffDraft && typeof c.ffDraft === "object" ? Object.keys(c.ffDraft as object).length : 0;
    const ff = c.ffDone ? "submitted" : draft ? "in_progress" : c.ffSentAt ? "sent" : "not_started";
    const [ffLabel, ffTone] = statusLabel(ff);
    return {
      id: c.id, title: c.title, status: c.status, stageLabel: STAGES[fc.stage], stageColor: STAGE_COLORS[fc.stage] ?? "#94a3b8",
      docsTotal: fc.docs_total, docsDone: fc.docs_done, docsRejected: fc.docs_rejected, docsPct: fc.docs_pct,
      ffLabel, ffTone, created: fmtDate(c.createdAt, { year: "numeric", month: "2-digit", day: "2-digit", hour: "numeric", minute: "2-digit" }),
      names: fc.name,
      // display-only extras for the redesigned list
      stage: fc.stage, email: fc.emails[0] ?? "", loan: fc.loan, docsPending: fc.docs_pending,
      updated: timeAgo(c.updatedAt), lastChase: timeAgo(c.lastChaseAt), chaseCount: c.chaseCount, chasePaused: c.chasePaused, portalClosed: c.portalClosed,
    };
  });
}

export async function kanbanData() {
  const income = await getIncomeSettings();
  const cases = await prisma.case.findMany({ where: { status: { in: ["active", "completed", "unsuccessful", "archive"] } }, include: { documents: true }, orderBy: { createdAt: "desc" } });
  const card = (c: (typeof cases)[number]): KCard => {
    const f = caseFacts(c, income);
    return {
      id: c.id, title: c.title || `Case #${c.id}`, names: f.name,
      loan: f.loan, toMm: f.commission, stage: STAGES[c.stage] ? c.stage : "new", chase: c.chaseBucket && CHASE_BUCKETS[c.chaseBucket] ? c.chaseBucket : "worth-trying",
    };
  };
  return {
    pipeline: cases.filter((c) => c.status === "active" || c.status === "completed").map(card),
    lost: cases.filter((c) => c.status === "unsuccessful" || c.status === "archive").map(card),
  };
}
