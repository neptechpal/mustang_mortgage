import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Ban, CalendarCheck2, CalendarClock, CalendarDays, CalendarX2, ChevronLeft, ChevronRight, Download, Globe, History, Plus, Search, X } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { Avatar, Badge, Button, EmptyState, LinkButton, PageHeader, StatCard, Table, TableWrap, TBody, TD, TH, THead, TR, buttonStyles, cn, inputStyles } from "@/components/admin/ui";
import SubNav from "@/modules/tools/appointments/admin/SubNav";
import { getSsaSettings } from "@/modules/tools/appointments/settings";
import { ensureDefaultTypes } from "@/modules/tools/appointments/types";
import { addDaysYmd, formatWpDateTime, weekdayOf, ymdInTz, zonedToUtc } from "@/modules/tools/tz";

export const dynamic = "force-dynamic";
export const metadata = { title: "Appointments" };

type SP = { view?: string; tab?: string; q?: string; month?: string; page?: string };
const PER_PAGE = 50;

export default async function AppointmentsAdminPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaff();
  await ensureDefaultTypes();
  const sp = await searchParams;
  const s = await getSsaSettings();
  const tz = s.timezone;
  const view = sp.view === "calendar" ? "calendar" : "list";

  const now = new Date();
  const today = ymdInTz(now, tz);
  const [counts, todayCount, next] = await Promise.all([
    Promise.all([
      prisma.appointment.count({ where: { status: "booked", endAt: { gte: now } } }),
      prisma.appointment.count({ where: { status: "booked", endAt: { lt: now } } }),
      prisma.appointment.count({ where: { status: "canceled" } }),
      prisma.appointment.count(),
    ]),
    prisma.appointment.count({ where: { status: "booked", startAt: { gte: zonedToUtc(today, "00:00", tz), lt: zonedToUtc(addDaysYmd(today, 1), "00:00", tz) } } }),
    prisma.appointment.findFirst({ where: { status: "booked", startAt: { gte: now } }, orderBy: { startAt: "asc" }, select: { startAt: true, customerName: true } }),
  ]);

  return (
    <div>
      <PageHeader
        icon={<CalendarClock />}
        title="Appointments"
        description="Online and staff bookings for consultations. Times are shown in the business timezone."
        actions={
          <>
            <a href="/api/admin/appointments?format=csv&status=all" className={buttonStyles({ variant: "secondary" })}>
              <Download /> Export CSV
            </a>
            <LinkButton href="/admin/appointments/new" variant="primary">
              <Plus /> New appointment
            </LinkButton>
          </>
        }
      />
      <SubNav active={view === "calendar" ? "Calendar" : "Appointments"} />

      <div className="mb-5 grid grid-cols-4 divide-x divide-slate-100 rounded-xl border border-slate-200/80 bg-white py-3 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:hidden">
        {(
          [
            ["Today", todayCount, "/admin/appointments?view=calendar"],
            ["Upcoming", counts[0], "/admin/appointments?tab=upcoming"],
            ["Completed", counts[1], "/admin/appointments?tab=past"],
            ["Canceled", counts[2], "/admin/appointments?tab=canceled"],
          ] as const
        ).map(([l, v, h]) => (
          <Link key={l} href={h} className="px-1">
            <span className="block text-lg font-semibold text-slate-900 tabular-nums">{v}</span>
            <span className="block text-[11px] font-medium text-slate-500">{l}</span>
          </Link>
        ))}
      </div>
      <div className="mb-6 hidden gap-4 sm:grid sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Today" value={todayCount} hint={todayCount === 1 ? "booking today" : "bookings today"} icon={<CalendarDays />} tone="brand" href="/admin/appointments?view=calendar" />
        <StatCard
          label="Upcoming"
          value={counts[0]}
          hint={next ? <span className="line-clamp-1">Next: {formatWpDateTime(next.startAt, tz)}</span> : "Nothing scheduled"}
          icon={<CalendarCheck2 />}
          tone="success"
          href="/admin/appointments?tab=upcoming"
        />
        <StatCard label="Completed" value={counts[1]} hint="Past bookings" icon={<History />} tone="neutral" href="/admin/appointments?tab=past" />
        <StatCard label="Canceled" value={counts[2]} hint={`${counts[3]} total all time`} icon={<Ban />} tone="danger" href="/admin/appointments?tab=canceled" />
      </div>

      {view === "calendar" ? <CalendarView month={sp.month} tz={tz} startOfWeek={s.startOfWeek} /> : <ListView sp={sp} tz={tz} counts={counts} />}
    </div>
  );
}

async function ListView({ sp, tz, counts }: { sp: SP; tz: string; counts: number[] }) {
  const tab = ["upcoming", "past", "canceled", "all"].includes(sp.tab ?? "") ? sp.tab! : "upcoming";
  const page = Math.max(1, Number(sp.page) || 1);
  const now = new Date();
  const where: Prisma.AppointmentWhereInput = {};
  if (tab === "upcoming") Object.assign(where, { status: "booked", endAt: { gte: now } });
  if (tab === "past") Object.assign(where, { status: "booked", endAt: { lt: now } });
  if (tab === "canceled") where.status = "canceled";
  const q = sp.q?.trim();
  if (q)
    where.OR = [
      { customerName: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q } },
    ];
  const [rows, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: { appointmentType: { select: { title: true } } },
      orderBy: { startAt: tab === "upcoming" ? "asc" : "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.appointment.count({ where }),
  ]);
  const tabs = [
    ["upcoming", "Upcoming", counts[0]],
    ["past", "Past", counts[1]],
    ["canceled", "Canceled", counts[2]],
    ["all", "All", counts[3]],
  ] as const;
  const qs = (o: Record<string, string | number | undefined>) =>
    "?" + new URLSearchParams(Object.entries({ tab, q, ...o }).filter(([, v]) => v !== undefined && v !== "") as [string, string][]).toString();
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const mon = new Intl.DateTimeFormat("en-AU", { timeZone: tz, month: "short" });
  const day = new Intl.DateTimeFormat("en-AU", { timeZone: tz, day: "numeric" });
  const wk = new Intl.DateTimeFormat("en-AU", { timeZone: tz, weekday: "long" });
  const wks = new Intl.DateTimeFormat("en-AU", { timeZone: tz, weekday: "short" });
  const tm = new Intl.DateTimeFormat("en-AU", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Filter appointments" className="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-slate-200/60 p-1">
          {tabs.map(([k, l, c]) => (
            <Link
              key={k}
              href={qs({ tab: k, page: undefined })}
              role="tab"
              aria-selected={tab === k}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                tab === k ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80" : "text-slate-600 hover:text-slate-900",
              )}
            >
              {l}
              <span className={cn("rounded-full px-1.5 text-[11px] font-semibold tabular-nums", tab === k ? "bg-brand-100 text-brand-800" : "bg-slate-200 text-slate-600")}>{c}</span>
            </Link>
          ))}
        </div>
        <form className="flex w-full items-center gap-2 sm:w-auto">
          <input type="hidden" name="tab" value={tab} />
          <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input name="q" defaultValue={q} placeholder="Search name, email, phone" aria-label="Search name, email, phone" className={cn(inputStyles, "pl-9")} />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
          {q && (
            <LinkButton href={qs({ q: undefined, page: undefined })} variant="ghost" aria-label="Clear search" className="px-2">
              <X />
            </LinkButton>
          )}
        </form>
      </div>

      {!rows.length ? (
        <EmptyState
          icon={<CalendarX2 />}
          title={q ? "No matching appointments" : tab === "upcoming" ? "No upcoming appointments" : "No appointments"}
          description={q ? `Nothing in “${tabs.find((t) => t[0] === tab)?.[1]}” matches “${q}”.` : tab === "upcoming" ? "New online bookings will appear here automatically." : "There is nothing in this view yet."}
          action={
            <LinkButton href="/admin/appointments/new" variant="secondary" size="sm">
              <Plus /> Book an appointment
            </LinkButton>
          }
        />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <tr>
                <TH>When</TH>
                <TH>Customer</TH>
                <TH className="hidden md:table-cell">Contact</TH>
                <TH className="hidden lg:table-cell">Type</TH>
                <TH className="hidden sm:table-cell">Status</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.id}>
                  <TD className="whitespace-nowrap">
                    <Link href={`/admin/appointments/${r.id}`} className="group flex items-center gap-3">
                      <span
                        className={cn(
                          "flex w-11 shrink-0 flex-col items-center overflow-hidden rounded-lg border text-center",
                          r.status === "canceled" ? "border-slate-200 opacity-60" : "border-brand-200",
                        )}
                      >
                        <span className={cn("w-full py-0.5 text-[10px] font-semibold uppercase tracking-wide", r.status === "canceled" ? "bg-slate-100 text-slate-500" : "bg-brand-50 text-brand-700")}>
                          {mon.format(r.startAt)}
                        </span>
                        <span className="py-0.5 text-base font-semibold leading-tight text-slate-900 tabular-nums">{day.format(r.startAt)}</span>
                      </span>
                      <span className="hidden min-w-0 sm:block">
                        <span className="block font-medium text-slate-900 group-hover:text-brand-700 group-hover:underline">{formatWpDateTime(r.startAt, tz)}</span>
                        <span className="block text-xs text-slate-500">{wk.format(r.startAt)}</span>
                      </span>
                      <span className="min-w-0 sm:hidden">
                        <span className="block font-medium text-slate-900 tabular-nums">{tm.format(r.startAt)}</span>
                        <span className="block text-xs text-slate-500">{wks.format(r.startAt)}</span>
                      </span>
                    </Link>
                  </TD>
                  <TD>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="hidden sm:block">
                        <Avatar name={r.customerName || r.customerEmail || "?"} size="sm" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-800">{r.customerName || "—"}</div>
                        <div className="truncate text-xs text-slate-500 lg:hidden">{r.appointmentType.title}</div>
                        <div className="hidden truncate text-xs text-slate-500 sm:block md:hidden">{r.customerEmail}</div>
                        <div className="mt-1 sm:hidden">
                          <StatusBadge status={r.status} past={r.endAt < now} />
                        </div>
                      </div>
                    </div>
                  </TD>
                  <TD className="hidden text-slate-600 md:table-cell">
                    <a href={`mailto:${r.customerEmail}`} className="block hover:text-slate-900 hover:underline">
                      {r.customerEmail}
                    </a>
                    {r.customerPhone ? <div className="text-xs text-slate-500 tabular-nums">{r.customerPhone}</div> : null}
                  </TD>
                  <TD className="hidden lg:table-cell">{r.appointmentType.title}</TD>
                  <TD className="hidden sm:table-cell">
                    <StatusBadge status={r.status} past={r.endAt < now} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-500">
            <span className="tabular-nums">
              {total} appointment{total === 1 ? "" : "s"}
              {pages > 1 ? ` · page ${page} of ${pages}` : ""}
            </span>
            {total > PER_PAGE && (
              <div className="flex gap-2">
                {page > 1 && (
                  <LinkButton href={qs({ page: page - 1 })} size="xs" variant="secondary">
                    <ChevronLeft /> Prev
                  </LinkButton>
                )}
                {page * PER_PAGE < total && (
                  <LinkButton href={qs({ page: page + 1 })} size="xs" variant="secondary">
                    Next <ChevronRight />
                  </LinkButton>
                )}
              </div>
            )}
          </div>
        </TableWrap>
      )}
    </div>
  );
}

function StatusBadge({ status, past }: { status: string; past?: boolean }) {
  return status === "canceled" ? (
    <Badge tone="danger" dot>
      Canceled
    </Badge>
  ) : past ? (
    <Badge tone="neutral" dot>
      Completed
    </Badge>
  ) : (
    <Badge tone="success" dot>
      Booked
    </Badge>
  );
}

async function CalendarView({ month, tz, startOfWeek }: { month?: string; tz: string; startOfWeek: number }) {
  const today = ymdInTz(new Date(), tz);
  const ym = month && /^\d{4}-\d{2}$/.test(month) ? month : today.slice(0, 7);
  const first = `${ym}-01`;
  const [y, m] = ym.split("-").map(Number);
  const nextMonth = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}`;
  const prevMonth = `${m === 1 ? y - 1 : y}-${String(m === 1 ? 12 : m - 1).padStart(2, "0")}`;
  const dows = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const lead = (dows.indexOf(weekdayOf(first)) - startOfWeek + 7) % 7;
  const gridStart = addDaysYmd(first, -lead);
  const days = Array.from({ length: 42 }, (_, i) => addDaysYmd(gridStart, i));
  const weeks = Math.ceil((lead + new Date(Date.UTC(y, m, 0)).getUTCDate()) / 7);
  const cells = days.slice(0, weeks * 7);
  const rows = await prisma.appointment.findMany({
    where: { startAt: { gte: zonedToUtc(days[0], "00:00", tz), lt: zonedToUtc(addDaysYmd(days[41], 1), "00:00", tz) } },
    include: { appointmentType: { select: { title: true } } },
    orderBy: { startAt: "asc" },
  });
  const byDay = new Map<string, typeof rows>();
  for (const r of rows) {
    const d = ymdInTz(r.startAt, tz);
    byDay.set(d, [...(byDay.get(d) ?? []), r]);
  }
  const title = new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
  const heads = Array.from({ length: 7 }, (_, i) => dows[(i + startOfWeek) % 7].slice(0, 3));
  const fmtT = (d: Date) => new Intl.DateTimeFormat("en-AU", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(d);
  const now = new Date();
  const tone = (r: (typeof rows)[number]) => (r.status === "canceled" ? "canceled" : r.endAt < now ? "past" : "booked");
  const CHIP = {
    booked: "border-brand-500 bg-brand-50 text-brand-900 hover:bg-brand-100",
    past: "border-slate-400 bg-slate-100 text-slate-700 hover:bg-slate-200",
    canceled: "border-red-300 bg-red-50 text-red-600 line-through hover:bg-red-100",
  };
  const DOT = { booked: "bg-brand-500", past: "bg-slate-400", canceled: "bg-red-400" };
  const monthRows = rows.filter((r) => ymdInTz(r.startAt, tz).slice(0, 7) === ym);
  const agendaDay = new Intl.DateTimeFormat("en-AU", { timeZone: tz, weekday: "short", day: "numeric", month: "short" });

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <LinkButton href={`?view=calendar&month=${prevMonth}`} variant="secondary" size="sm" className="px-2" aria-label="Previous month">
              <ChevronLeft />
            </LinkButton>
            <LinkButton href={`?view=calendar&month=${nextMonth}`} variant="secondary" size="sm" className="px-2" aria-label="Next month">
              <ChevronRight />
            </LinkButton>
            <h2 className="ml-1 text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-3 text-xs text-slate-500 md:flex">
              <span className="inline-flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", DOT.booked)} /> Booked
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", DOT.past)} /> Completed
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className={cn("size-2 rounded-full", DOT.canceled)} /> Canceled
              </span>
            </div>
            <LinkButton href="?view=calendar" variant="secondary" size="sm">
              Today
            </LinkButton>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80">
          {heads.map((h) => (
            <div key={h} className="px-1 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500 sm:px-3 sm:text-left">
              {h}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const inMonth = d.slice(0, 7) === ym;
            const items = byDay.get(d) ?? [];
            return (
              <div
                key={d}
                className={cn(
                  "min-h-[64px] border-slate-100 p-1 sm:min-h-[118px] sm:p-1.5",
                  i % 7 !== 6 && "border-r",
                  i < cells.length - 7 && "border-b",
                  !inMonth && "bg-slate-50/70",
                )}
              >
                <div className="mb-1 flex justify-center sm:justify-start">
                  <span
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums",
                      d === today ? "bg-brand-600 font-semibold text-white" : inMonth ? "font-medium text-slate-700" : "text-slate-400",
                    )}
                  >
                    {Number(d.slice(8))}
                  </span>
                </div>
                {/* Mobile: dots */}
                {items.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-0.5 sm:hidden">
                    {items.slice(0, 4).map((r) => (
                      <span key={r.id} className={cn("size-1.5 rounded-full", DOT[tone(r)])} />
                    ))}
                  </div>
                )}
                {/* Desktop: chips */}
                <div className="hidden space-y-1 sm:block">
                  {items.map((r) => (
                    <Link
                      key={r.id}
                      href={`/admin/appointments/${r.id}`}
                      className={cn("block truncate rounded-md border-l-2 px-1.5 py-1 text-[11px] leading-tight transition-colors", CHIP[tone(r)])}
                      title={`${r.appointmentType.title} — ${r.customerName}`}
                    >
                      <span className="font-semibold tabular-nums">{fmtT(r.startAt)}</span> {r.customerName}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile agenda for the visible month */}
      <div className="mt-4 sm:hidden">
        <h3 className="mb-2 text-sm font-semibold text-slate-900">This month</h3>
        {monthRows.length ? (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/80 bg-white">
            {monthRows.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/appointments/${r.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                  <span className={cn("size-2 shrink-0 rounded-full", DOT[tone(r)])} />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-sm font-medium text-slate-900", r.status === "canceled" && "line-through")}>{r.customerName || "—"}</span>
                    <span className="block truncate text-xs text-slate-500">{r.appointmentType.title}</span>
                  </span>
                  <span className="text-right text-xs text-slate-500 tabular-nums">
                    <span className="block font-medium text-slate-700">{agendaDay.format(r.startAt)}</span>
                    {fmtT(r.startAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-500">No appointments this month.</p>
        )}
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
        <Globe className="size-3.5" /> Times shown in {tz}.
      </p>
    </div>
  );
}
