import { getIncomeSettings } from "@/modules/crm-extra/lib/income-settings";
import Link from "next/link";
import {
  AlertTriangle, ArrowRight, Briefcase, Calculator, CheckCircle2, ClipboardList, Coins, FileClock, FileText, Landmark,
  ListTodo, MailWarning, MessageSquare, Paperclip, PartyPopper, Send, Activity as ActivityIcon, LayoutGrid,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { caseFacts } from "@/modules/crm/cases";
import { STAGE_COLORS, STAGES } from "@/modules/crm/constants";
import { getAutoOptions } from "@/modules/crm/options";
import { dueTasks, flexDoneCount } from "@/modules/crm/reminders-bridge";
import { fmtDate, money, sydParts, timeAgo, timeDiff } from "@/modules/crm/util";
import { AttnButton, TaskCheck } from "@/modules/crm/components/DashActions";
import { Toaster } from "@/modules/crm/components/Toast";
import { getZoho } from "@/modules/crm-extra/lib/opts";
import { Alert, Avatar, Badge, Card, LinkButton, PageHeader, StatCard, buttonStyles, cn, type Tone } from "@/components/admin/ui";

export const dynamic = "force-dynamic";
const DAY = 86400_000;
type Act = ["open" | "flex" | "chase" | "sendff" | "stage", string, string];
type AttnIcon = "message" | "factfind" | "rejected" | "docs" | "sendff" | "alldocs";
type Attn = { prio: number; id: number; name: string; icon: AttnIcon; title: string; detail: string; actions: Act[]; url: string };

const ATTN_ICON: Record<AttnIcon, [React.ReactNode, Tone]> = {
  message: [<MessageSquare key="i" />, "info"],
  factfind: [<FileText key="i" />, "violet"],
  rejected: [<AlertTriangle key="i" />, "danger"],
  docs: [<Paperclip key="i" />, "warning"],
  sendff: [<Send key="i" />, "brand"],
  alldocs: [<CheckCircle2 key="i" />, "success"],
};
const TILE: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-600", brand: "bg-brand-50 text-brand-700", success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600", danger: "bg-red-50 text-red-600", info: "bg-sky-50 text-sky-600", violet: "bg-violet-50 text-violet-600",
};
const compact = (n: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", notation: "compact", maximumFractionDigits: 2 }).format(n || 0);
const decode = (s: string) => s.replace(/&gt;/g, ">").replace(/&lt;/g, "<").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, "&");

export default async function Dashboard() {
  const s = await requireStaff();
  const now = Date.now();
  const income = await getIncomeSettings();
  const [user, auto, cases] = await Promise.all([
    prisma.user.findUnique({ where: { id: s.uid }, select: { firstName: true, displayName: true } }),
    getAutoOptions(),
    prisma.case.findMany({ where: { status: "active" }, include: { documents: true }, orderBy: { updatedAt: "desc" }, take: 400 }),
  ]);
  const ids = cases.map((c) => c.id);
  const [lastMsgs, activity, tasks] = await Promise.all([
    prisma.caseMessage.findMany({ where: { caseId: { in: ids } }, orderBy: { createdAt: "desc" }, distinct: ["caseId"] }),
    prisma.caseActivity.findMany({ where: { caseId: { in: ids } }, orderBy: { createdAt: "desc" }, take: 12 }),
    dueTasks(new Date(now + DAY), ids),
  ]);
  const pipe: Record<string, { n: number; loan: number; comm: number }> = Object.fromEntries(Object.keys(STAGES).map((k) => [k, { n: 0, loan: 0, comm: 0 }]));
  const k = { active: cases.length, new7: 0, waiting_docs: 0, pending_items: 0, ff_open: 0, loan: 0, comm: 0, trail: 0 };
  const attn: Attn[] = [];
  const nameOf: Record<number, string> = {};
  for (const c of cases) {
    const f = caseFacts(c, income);
    nameOf[c.id] = f.name;
    const st = f.stage;
    pipe[st].n++; pipe[st].loan += f.loan; pipe[st].comm += f.commission;
    k.loan += f.loan; k.comm += f.commission; k.trail += f.trail_month;
    if (now - f.created.getTime() <= 7 * DAY) k.new7++;
    if (f.docs_total && f.docs_pending > 0) { k.waiting_docs++; k.pending_items += f.docs_pending; }
    const ffOn = c.showFactfind;
    if (!f.ff_done && ffOn) k.ff_open++;
    const age = Math.max(0, Math.floor((now - f.created.getTime()) / DAY));
    const row = (prio: number, icon: AttnIcon, title: string, detail: string, actions: Act[]): Attn => ({ prio, id: c.id, name: f.name, icon, title, detail, actions, url: f.edit_url });
    const lm = lastMsgs.find((m) => m.caseId === c.id);
    if (lm && lm.by === "client") attn.push(row(0, "message", "Client message waiting", lm.text.split(/\s+/).slice(0, 14).join(" ") + (lm.text.split(/\s+/).length > 14 ? "…" : ""), [["open", "Reply", `${f.edit_url}#tab-emails`]]));
    if (f.ff_done && ["new", "awaiting-docs", "submitted"].includes(st) && (await flexDoneCount(c.id)) < 8) {
      attn.push(row(1, "factfind", "Fact Find submitted — enter in Flex", f.ff_done_at ? timeAgo(f.ff_done_at) : "", [["flex", "Flex Entry", `${f.edit_url}#tab-flex`]]));
    }
    if (f.docs_rejected > 0) {
      attn.push(row(2, "rejected", `${f.docs_rejected} document${f.docs_rejected > 1 ? "s" : ""} need re-upload`, "Rejected items are waiting on the client", [["chase", "Send reminder", ""]]));
    } else if (f.docs_total && f.docs_pending > 0 && age >= 3 && ["new", "awaiting-docs"].includes(st)) {
      const since = c.lastChaseAt ? Math.floor((now - c.lastChaseAt.getTime()) / DAY) : null;
      if (since === null || since >= 3) attn.push(row(3, "docs", `${f.docs_pending} of ${f.docs_total} documents outstanding`, c.lastChaseAt ? `Last reminder ${since} days ago` : `No reminder sent yet · ${age} days old`, [["chase", "Send reminder", ""]]));
    }
    if (!f.ff_done && ffOn && age >= 2 && st === "new") attn.push(row(4, "sendff", f.ff_started ? "Fact Find started but not finished" : "Fact Find not started", `${age} days since case created`, [["sendff", "Send link", ""]]));
    if (f.docs_total && !f.docs_pending && st === "new") attn.push(row(3, "alldocs", "All documents received", "Review and move to the next stage", [["stage", "Mark Docs Received", "awaiting-docs"]]));
  }
  attn.sort((a, b) => a.prio - b.prio);
  const maxn = Math.max(1, ...Object.values(pipe).map((p) => p.n));
  const H = sydParts().H;
  const greet = H < 12 ? "Good morning" : H < 17 ? "Good afternoon" : "Good evening";
  const z = await getZoho();
  const zohoConnected = !!(z.refresh && z.accountId);

  return (
    <div>
      <Toaster />
      <PageHeader
        title={`${greet}, ${user?.firstName || user?.displayName || s.name}`}
        description={
          <>
            {fmtDate(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })} ·{" "}
            {attn.length ? <><strong className="font-semibold text-slate-700">{attn.length} {attn.length === 1 ? "thing needs" : "things need"}</strong> your attention.</> : "you’re all caught up."}
          </>
        }
        actions={
          <>
            <LinkButton href="/admin/cases" variant="secondary"><Briefcase /> All cases</LinkButton>
            <LinkButton href="/admin/borrowing" variant="secondary"><Calculator /> Borrowing capacity</LinkButton>
            <LinkButton href="/admin/income" variant="secondary"><Coins /> Income</LinkButton>
            <LinkButton href="/admin/forms" variant="secondary"><ClipboardList /> Forms</LinkButton>
          </>
        }
      />

      {(!zohoConnected || !auto.chase_enabled) && (
        <div className="mb-6 space-y-3">
          {!zohoConnected && (
            <Alert tone="warning" className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="flex min-w-0 flex-1 items-start gap-2.5">
                <MailWarning className="mt-0.5 size-4 shrink-0" />
                <span><strong className="font-semibold">Email isn’t connected yet.</strong> Connect Zoho Mail so reminders and forms are sent from your own address.</span>
              </span>
              <Link className={buttonStyles({ variant: "secondary", size: "sm" })} href="/admin/zoho">Open settings <ArrowRight /></Link>
            </Alert>
          )}
          {!auto.chase_enabled && (
            <Alert tone="info">
              <strong className="font-semibold">Tip:</strong> turn on <Link className="font-medium underline underline-offset-2" href="/admin/automation">automatic client reminders</Link> and the CRM will chase outstanding documents for you.
            </Alert>
          )}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Active cases" value={k.active} hint={`+${k.new7} this week`} href="/admin/cases" icon={<Briefcase />} tone="info" />
        <StatCard label="Waiting on docs" value={k.waiting_docs} hint={`${k.pending_items} items outstanding`} href="/admin/cases" icon={<FileClock />} tone="warning" />
        <StatCard label="Fact Finds open" value={k.ff_open} hint="not yet submitted" href="/admin/cases" icon={<ClipboardList />} tone="violet" />
        <StatCard label="Pipeline value" value={<span title={money(k.loan)}>{compact(k.loan)}</span>} hint={<span title="Loan amount, active cases" className="tabular-nums">{money(k.loan)} in loans</span>} icon={<Landmark />} tone="brand" />
        <StatCard label="Est. upfront income" href="/admin/income" value={<span title={money(k.comm)}>{compact(k.comm)}</span>} hint={<span title="To MM, active pipeline" className="tabular-nums">+ {money(k.trail)}/mo trail · see Income</span>} icon={<Coins />} tone="success" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <Card
            title={<span className="flex items-center gap-2">Needs your attention <Badge tone={attn.length ? "warning" : "success"}>{attn.length}</Badge></span>}
            description="Client messages, outstanding documents and fact finds that need a nudge."
            padded={false}
          >
            {!attn.length ? (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><PartyPopper className="size-5" /></div>
                <p className="text-sm font-semibold text-slate-900">Nothing urgent</p>
                <p className="mt-1 max-w-sm text-sm text-slate-500">New client messages, outstanding documents and fact finds will show up here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {attn.slice(0, 14).map((a, i) => {
                  const [icon, tone] = ATTN_ICON[a.icon];
                  return (
                    <li key={i} className="flex flex-col gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/60 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-[18px]", TILE[tone])}>{icon}</span>
                        <div className="min-w-0">
                          <Link className="text-sm font-semibold text-slate-900 hover:text-brand-700" href={a.url}>{a.name}</Link>
                          <p className="text-sm text-slate-700">{a.title}{a.detail && <span className="text-slate-500"> · {a.detail}</span>}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pl-12 sm:pl-0">
                        {a.actions.map(([t, label, arg]) => t === "chase" || t === "sendff" || t === "stage"
                          ? <AttnButton key={t} caseId={a.id} act={t} arg={arg} label={label} />
                          : <Link key={t} href={arg} className={buttonStyles({ variant: t === "flex" ? "primary" : "secondary", size: "xs" })}>{t === "flex" ? <FileText /> : <MessageSquare />}{label}</Link>)}
                        <Link className={buttonStyles({ variant: "ghost", size: "xs" })} href={a.url}>Open <ArrowRight /></Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {attn.length > 14 && <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">+ {attn.length - 14} more — open the <Link href="/admin/cases" className="font-medium text-brand-700 hover:underline">cases list</Link> to see everything.</div>}
          </Card>

          <Card
            title="Pipeline"
            description={<span className="tabular-nums">{k.active} active {k.active === 1 ? "case" : "cases"} · {money(k.loan)} in loans</span>}
            actions={<Link className={buttonStyles({ variant: "ghost", size: "sm" })} href="/admin/kanban"><LayoutGrid /> Open board</Link>}
          >
            <div className="space-y-1">
              {Object.entries(STAGES).map(([slug, label]) => {
                const p = pipe[slug];
                return (
                  <Link key={slug} href={`/admin/cases?stage=${slug}`} className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-slate-50 sm:grid-cols-[190px_minmax(0,1fr)_36px_110px]">
                    <span className="flex min-w-0 items-center gap-2 font-medium text-slate-700 group-hover:text-slate-900">
                      <span className="size-2 shrink-0 rounded-full" style={{ background: STAGE_COLORS[slug] }} />
                      <span className="truncate">{label}</span>
                    </span>
                    <span className="order-last col-span-2 h-2 overflow-hidden rounded-full bg-slate-100 sm:order-none sm:col-span-1">
                      <i className="block h-full rounded-full transition-all" style={{ width: `${p.n ? Math.max(4, Math.round((100 * p.n) / maxn)) : 0}%`, background: STAGE_COLORS[slug] }} />
                    </span>
                    <span className="hidden text-right font-semibold text-slate-900 tabular-nums sm:block">{p.n}</span>
                    <span className="text-right text-xs text-slate-500 tabular-nums">
                      <span className="mr-2 font-semibold text-slate-900 sm:hidden">{p.n}</span>
                      {p.loan ? money(p.loan) : "—"}
                    </span>
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>

        <aside className="min-w-0 space-y-6">
          <Card title={<span className="flex items-center gap-2"><ListTodo className="size-4 text-slate-400" /> Today’s tasks <Badge tone={tasks.length ? "info" : "neutral"}>{tasks.length}</Badge></span>} padded={false}>
            {!tasks.length ? <p className="px-5 py-6 text-center text-sm text-slate-500">No tasks due today. Add reminders from any case.</p> : (
              <ul className="divide-y divide-slate-100">
                {tasks.slice(0, 10).map((t) => {
                  const over = t.dueAt.getTime() < now;
                  return (
                    <li key={t.id} className="flex gap-3 px-5 py-3 text-sm">
                      <TaskCheck id={t.id} />
                      <div className="min-w-0 flex-1">
                        <p className="text-slate-800">{t.what}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                          <Link className="font-medium hover:text-brand-700" href={`/admin/cases/${t.caseId}`}>{nameOf[t.caseId] ?? `Case #${t.caseId}`}</Link>
                          {over ? <Badge tone="danger">Overdue {timeDiff(t.dueAt)}</Badge> : <Badge tone="info">Due {fmtDate(t.dueAt, { hour: "numeric", minute: "2-digit" })}</Badge>}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card title={<span className="flex items-center gap-2"><ActivityIcon className="size-4 text-slate-400" /> Recent activity</span>} padded={false}>
            {!activity.length ? <p className="px-5 py-6 text-center text-sm text-slate-500">Client activity (uploads, fact finds) will appear here.</p> : (
              <ul className="px-5 py-2">
                {activity.map((a, i) => {
                  const nm = nameOf[a.caseId] ?? `Case #${a.caseId}`;
                  return (
                    <li key={a.id} className="relative flex gap-3 py-2.5">
                      {i < activity.length - 1 && <span className="absolute left-[13px] top-10 bottom-0 w-px bg-slate-200" aria-hidden />}
                      <Avatar name={nm} size="sm" />
                      <div className="min-w-0 flex-1 text-sm">
                        <Link className="font-semibold text-slate-900 hover:text-brand-700" href={`/admin/cases/${a.caseId}`}>{nm}</Link>{" "}
                        <span className="text-slate-600">{decode(a.detail)}</span>
                        <p className="mt-0.5 text-xs text-slate-400">{timeAgo(a.createdAt)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
