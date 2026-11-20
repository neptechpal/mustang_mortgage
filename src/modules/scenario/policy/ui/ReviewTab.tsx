import Link from "next/link";
import { BadgeDollarSign, ChevronRight, FileText, ListChecks, PartyPopper } from "lucide-react";
import { Badge, EmptyState, Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/admin/ui";
import type { LenderLite, QueueItem } from "../data";
import { REVIEW_WINDOW_DAYS } from "../meta";
import { FlagBadges, StatusBadge } from "./parts";

const KIND = {
  rule: { label: "Rule", Icon: ListChecks },
  price: { label: "Pricing", Icon: BadgeDollarSign },
  source: { label: "Source", Icon: FileText },
} as const;

export function ReviewTab({ queue, lenders }: { queue: QueueItem[]; lenders: LenderLite[] }) {
  const lname = new Map(lenders.map((l) => [l.id, l.name]));
  if (!queue.length)
    return (
      <EmptyState
        icon={<PartyPopper />}
        title="Nothing needs attention"
        description={`Rules and prices due for review within ${REVIEW_WINDOW_DAYS} days, expired or unverified records, drafts awaiting publish and sources without permissions show up here.`}
      />
    );
  const counts = { rule: 0, price: 0, source: 0 };
  queue.forEach((q) => counts[q.kind]++);
  return (
    <div>
      <p className="mb-3 text-sm text-slate-500">
        <span className="tabular-nums">{queue.length}</span> item{queue.length === 1 ? "" : "s"} need broker/admin attention ·{" "}
        <span className="tabular-nums">{counts.rule}</span> rules · <span className="tabular-nums">{counts.price}</span> prices · <span className="tabular-nums">{counts.source}</span> sources. Most urgent first.
      </p>
      <TableWrap>
        <Table>
          <THead>
            <tr>
              <TH>Item</TH>
              <TH className="hidden md:table-cell">Lender</TH>
              <TH>Needs</TH>
              <TH className="hidden sm:table-cell">Status</TH>
              <TH className="w-10"><span className="sr-only">Open</span></TH>
            </tr>
          </THead>
          <TBody>
            {queue.map((q) => {
              const K = KIND[q.kind];
              return (
                <TR key={`${q.kind}:${q.id}`} className="align-top">
                  <TD className="max-w-[420px] align-top">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-500"><K.Icon className="size-3.5" /></span>
                      <div className="min-w-0">
                        <Link href={q.href} className="line-clamp-2 text-sm font-medium text-slate-900 hover:text-brand-700 hover:underline">{q.title}</Link>
                        <div className="mt-0.5 truncate text-xs text-slate-500">{K.label} · {q.subtitle}</div>
                      </div>
                    </div>
                  </TD>
                  <TD className="hidden whitespace-nowrap align-top text-sm md:table-cell">{q.lenderId ? lname.get(q.lenderId) ?? `#${q.lenderId}` : <span className="text-slate-500">Panel-wide</span>}</TD>
                  <TD className="align-top"><FlagBadges flags={q.flags} /></TD>
                  <TD className="hidden align-top sm:table-cell"><StatusBadge status={q.status} /></TD>
                  <TD className="align-top">
                    <Link href={q.href} aria-label="Open" className="inline-flex size-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><ChevronRight className="size-4" /></Link>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </TableWrap>
      <p className="mt-3 text-xs text-slate-500"><Badge tone="danger" className="mr-1">Red</Badge>items are expired, overdue or not used by assessments; <Badge tone="warning" className="mx-1">amber</Badge>items are due soon or incomplete.</p>
    </div>
  );
}
