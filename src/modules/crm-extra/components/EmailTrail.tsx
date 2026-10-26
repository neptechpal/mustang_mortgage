"use client";
// "Email Trail" metabox (trail.php) — manual load from Zoho, flat/conversation view, direction filter.
import { useState } from "react";
import { CornerDownRight, Eye, EyeOff, ExternalLink, History, MessagesSquare, Paperclip, RefreshCw } from "lucide-react";
import { Badge, buttonStyles, cn } from "@/components/admin/ui";

const btnXs = buttonStyles({ variant: "secondary", size: "xs" });
import { useToast } from "../ui/client";
import { trailList, trailGetBody, trailGetAtts } from "../actions/email";
import type { TrailItem, Cursor } from "../lib/trail";

const TZ = "Australia/Sydney";
function ago(ts: number) {
  const s = Math.max(0, Date.now() / 1000 - ts);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
const dayKey = (ts: number) => (ts ? new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(ts * 1000)) : "");
function dayLabel(k: string) {
  if (!k) return "Other";
  const today = dayKey(Date.now() / 1000),
    yest = dayKey(Date.now() / 1000 - 86400);
  if (k === today) return "Today";
  if (k === yest) return "Yesterday";
  return new Intl.DateTimeFormat("en-AU", { timeZone: TZ, weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(new Date(k + "T12:00:00"));
}
const when = (ts: number) =>
  ts ? new Intl.DateTimeFormat("en-AU", { timeZone: TZ, weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(new Date(ts * 1000)) + " · " + ago(ts) : "";

function Card({ m, reply }: { m: TrailItem; reply?: boolean }) {
  const [body, setBody] = useState<string | null>(null);
  const [atts, setAtts] = useState<{ items: { name: string; url: string }[]; zohoLink: string } | null>(null);
  const [loadingAtts, setLoadingAtts] = useState(false);
  return (
    <div className={cn("rounded-lg border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]", reply && "ml-4 border-l-2 border-l-slate-300")}>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <Badge tone={m.direction === "in" ? "success" : "info"} className="font-semibold">
          {m.direction === "in" ? "IN" : "OUT"}
        </Badge>
        <Badge>ZOHO</Badge>
        <Badge tone="warning">{m.why}</Badge>
        {reply && (
          <Badge>
            <CornerDownRight className="size-3" /> reply
          </Badge>
        )}
        <span className="text-slate-500">{when(m.ts)}</span>
      </div>
      <div className="mt-2 font-semibold break-words text-slate-900">{m.subject}</div>
      {m.preview && <div className="mt-0.5 line-clamp-3 text-sm break-words text-slate-600">{m.preview}</div>}
      <div className="mt-1.5 text-xs break-all text-slate-500">
        From: {m.from} To: {m.to} ({m.iso})
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        <button
          type="button"
          className={btnXs}
          onClick={async () => {
            if (body !== null) return setBody(null);
            setBody("<p>Loading…</p>");
            setBody(await trailGetBody(m.folderId, m.id));
            setLoadingAtts(true);
            setAtts(await trailGetAtts(m.folderId, m.id));
            setLoadingAtts(false);
          }}
        >
          {body !== null ? <EyeOff /> : <Eye />} View full message
        </button>
        <a className={btnXs} href={m.zohoLink} target="_blank" rel="noopener noreferrer">
          <ExternalLink /> Open in Zoho
        </a>
      </div>
      {body !== null && <div className="mt-3 max-h-[480px] overflow-auto rounded-lg border border-slate-200 bg-white p-3 text-sm" dangerouslySetInnerHTML={{ __html: body }} />}
      {loadingAtts && <div className="mt-2 text-xs text-slate-500">Loading attachments…</div>}
      {atts && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          {atts.items.length ? (
            <>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Paperclip className="size-3.5" /> Attachments
              </p>
              <ul className="space-y-0.5">
                {atts.items.map((a) => (
                  <li key={a.url}>
                    <a className="font-medium break-all text-brand-700 hover:underline" href={a.url} target="_blank" rel="noopener noreferrer">
                      {a.name}
                    </a>
                  </li>
                ))}
              </ul>
              <a className="mt-1 inline-block text-xs text-slate-600 underline hover:text-slate-900" href={atts.zohoLink} target="_blank" rel="noopener noreferrer">
                Open message in Zoho
              </a>
            </>
          ) : (
            <span className="text-slate-600">
              No attachments found.{" "}
              <a className="text-xs underline hover:text-slate-900" href={atts.zohoLink} target="_blank" rel="noopener noreferrer">
                Open in Zoho
              </a>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function EmailTrail({ caseId }: { caseId: number }) {
  const { show, node } = useToast();
  const [items, setItems] = useState<TrailItem[] | null>(null);
  const [cursor, setCursor] = useState<Cursor>({ start_inbox: 0, start_sent: 0 });
  const [hasMore, setHasMore] = useState(false);
  const [conv, setConv] = useState(false);
  const [dir, setDir] = useState<"all" | "in" | "out">("all");
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");

  const load = async (more: boolean) => {
    setStatus("Loading…");
    setErr("");
    const r = await trailList(caseId, more ? cursor : { start_inbox: 0, start_sent: 0 });
    setStatus("");
    if (!r.ok) {
      setErr(r.error || "Failed to load trail.");
      return show("Failed", true);
    }
    setItems((prev) => {
      const merged = more && prev ? [...prev, ...r.items] : r.items;
      const seen = new Set<string>();
      return merged.filter((i) => (seen.has(i.id + "|" + i.ts) ? false : (seen.add(i.id + "|" + i.ts), true)));
    });
    setCursor(r.cursor);
    setHasMore(r.hasMore);
    show(more ? "Loaded older messages" : "Trail updated");
  };

  const shown = (items ?? []).filter((m) => dir === "all" || m.direction === dir);
  let content: React.ReactNode;
  if (items === null) {
    content = (
      <div className="flex flex-col items-center px-4 py-8 text-center">
        <span className="mb-2.5 flex size-10 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-200">
          <History className="size-5" />
        </span>
        <p className="max-w-md text-sm text-slate-500">Click “Refresh Trail” to load messages for this case. Use “View full message” to display the complete email with formatting.</p>
      </div>
    );
  } else if (!shown.length) {
    content = <p className="px-4 py-8 text-center text-sm text-slate-500">No tagged/matching messages yet.</p>;
  } else if (conv) {
    const groups = new Map<string, TrailItem[]>();
    for (const m of shown) {
      const k = m.conv || m.subject.toLowerCase();
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(m);
    }
    content = Array.from(groups.values()).map((g) => {
      const asc = [...g].sort((a, b) => a.ts - b.ts);
      const min = asc[0].ts;
      return (
        <div key={(asc[0].conv || asc[0].subject) + asc[0].id} className="rounded-xl border border-slate-200 bg-slate-50/60">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3.5 py-2.5">
            <MessagesSquare className="size-4 text-slate-400" />
            <b className="min-w-0 break-words text-sm text-slate-900">{asc[0].subject || "(no subject)"}</b>
            <Badge>{asc.length} message(s)</Badge>
          </div>
          <div className="space-y-2 p-2.5">
            {asc.map((m) => (
              <Card key={m.id + m.ts} m={m} reply={m.ts > min} />
            ))}
          </div>
        </div>
      );
    });
  } else {
    const byDay = new Map<string, TrailItem[]>();
    for (const m of shown) {
      const k = dayKey(m.ts);
      if (!byDay.has(k)) byDay.set(k, []);
      byDay.get(k)!.push(m);
    }
    content = Array.from(byDay.entries()).map(([k, list]) => (
      <div key={k || "other"} className="space-y-2">
        <div className="sticky top-0 z-[1] flex items-center gap-3 bg-slate-50/95 py-1 backdrop-blur">
          <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">{dayLabel(k)}</span>
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        {list.map((m) => (
          <Card key={m.id + m.ts} m={m} />
        ))}
      </div>
    ));
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" className={buttonStyles({ variant: "secondary", size: "sm" })} onClick={() => load(false)}>
          <RefreshCw className={status ? "animate-spin" : ""} /> Refresh Trail
        </button>
        <button
          type="button"
          aria-pressed={conv}
          className={buttonStyles({ variant: "secondary", size: "sm", className: conv ? "!border-brand-300 !bg-brand-50 !text-brand-800" : "" })}
          onClick={() => setConv((c) => !c)}
        >
          <MessagesSquare /> Conversation view: {conv ? "On" : "Off"}
        </button>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5" role="group" aria-label="Direction">
          {(
            [
              ["all", "All"],
              ["in", "Inbound"],
              ["out", "Outbound"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              aria-pressed={dir === k}
              className={cn(
                "h-7 rounded-md px-3 text-[13px] font-medium transition-colors",
                dir === k ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-800",
              )}
              onClick={() => setDir(k)}
            >
              {l}
            </button>
          ))}
        </div>
        <span className="text-sm text-slate-500">{status}</span>
      </div>
      {err && <p className="mb-2 text-sm text-red-600">{err}</p>}
      <div className="max-h-[540px] space-y-3 overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-3">{content}</div>
      {hasMore && !conv && (
        <button type="button" className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-3" })} onClick={() => load(true)}>
          Load older…
        </button>
      )}
      {node}
    </div>
  );
}
