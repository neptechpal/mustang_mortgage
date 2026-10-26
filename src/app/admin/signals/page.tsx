import { requireStaff } from "@/lib/session";
import { buildBoard, parseRange, tagFor } from "@/modules/crm-extra/lib/signals";
import { fmtDate } from "@/modules/crm-extra/lib/cases";
import SignalsBoard, { type BoardCard } from "@/modules/crm-extra/components/SignalsBoard";

export const metadata = { title: "Recent Case Activity" };
export const dynamic = "force-dynamic";

export default async function SignalsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff();
  const sp = await searchParams;
  const range = ["7d", "30d", "90d", "1y", "custom"].includes(sp.range ?? "") ? sp.range! : "7d";
  const show = sp.show === "1";
  const [from, to] = parseRange(range, sp.from, sp.to);
  const cards = await buildBoard({ from, to, showDismissed: show, status: "active", evaluate: true });
  const data: BoardCard[] = cards.map((c) => ({
    caseId: c.caseId,
    title: c.title,
    items: c.items.map((i) => ({
      id: i.id,
      type: i.type,
      msg: i.msg,
      dismissed: i.dismissed,
      tone: tagFor(i.type).tone,
      when: fmtDate(i.at, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }),
    })),
  }));
  return <SignalsBoard cards={data} range={range} from={sp.from ?? ""} to={sp.to ?? ""} show={show} />;
}
