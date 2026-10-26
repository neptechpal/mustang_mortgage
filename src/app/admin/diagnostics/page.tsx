import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/session";
import { getSetting } from "@/lib/settings";
import { CheckCircle2, ExternalLink, RefreshCw, Stethoscope, XCircle } from "lucide-react";
import { Alert, Badge, buttonStyles, cn, KeyValue, PageHeader, tableCls } from "@/components/admin/ui";
import { getZoho, getCrmOptions } from "@/modules/crm-extra/lib/opts";
import { zohoToken, zohoApi } from "@/modules/crm-extra/lib/zoho";
import { indexSizes } from "@/modules/crm-extra/lib/threading";
import { runSync, ATTEMPTS_KEY } from "@/modules/crm-extra/lib/sync";
import { BUILDS, diagFolderLists } from "@/modules/crm-extra/lib/diag";

export const metadata = { title: "Email Sync Diagnostics" };
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function syncNow() {
  "use server";
  await requireAdmin();
  const r = await runSync(true);
  redirect(`/admin/diagnostics?synced=${encodeURIComponent(r.message)}`);
}

const Block = ({ title, ok = true, children }: { title: string; ok?: boolean; children: React.ReactNode }) => (
  <section className={cn("overflow-hidden rounded-xl border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]", ok ? "border-slate-200/80" : "border-red-200")}>
    <header className={cn("flex items-center gap-2 border-b px-5 py-3", ok ? "border-slate-100" : "border-red-100 bg-red-50/60")}>
      {ok ? <CheckCircle2 className="size-4 shrink-0 text-emerald-600" /> : <XCircle className="size-4 shrink-0 text-red-600" />}
      <h3 className="min-w-0 flex-1 text-sm font-semibold text-slate-900">{title}</h3>
      <Badge tone={ok ? "success" : "danger"}>{ok ? "OK" : "Issue"}</Badge>
    </header>
    <div className="p-5 text-sm text-slate-700">{children}</div>
  </section>
);
const Pre = ({ v }: { v: unknown }) => (
  <pre className="max-h-80 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-700">
    {typeof v === "string" ? v : JSON.stringify(v, null, 2)}
  </pre>
);

export default async function Diagnostics({ searchParams }: { searchParams: Promise<{ synced?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const z = await getZoho();
  const o = await getCrmOptions();
  const token = await zohoToken();
  const sizes = await indexSizes();
  const attempts = await getSetting<unknown>(ATTEMPTS_KEY, null);
  const header = (
    <>
      <PageHeader
        icon={<Stethoscope />}
        title="Email Sync Diagnostics"
        description={
          <span className="font-mono text-xs">
            Core {BUILDS.core} · Sync {BUILDS.sync} · Diag {BUILDS.diag}
          </span>
        }
        actions={
          <>
            <a className={buttonStyles({ variant: "secondary" })} href="/api/admin/x/diag/list" target="_blank">
              <ExternalLink /> Raw Inbox/Sent Probe
            </a>
            <form action={syncNow}>
              <button className={buttonStyles({ variant: "primary" })}>
                <RefreshCw /> Run Sync Now
              </button>
            </form>
          </>
        }
      />
      {sp.synced && <Alert tone="success">{sp.synced}</Alert>}
      <Block title="Environment & Settings">
        <KeyValue
          cols={3}
          items={[
            ["Runtime", `Node ${process.version}`],
            ["Timezone", "Australia/Sydney"],
            ["From email", z.fromEmail || o.fromEmail],
            ["Zoho DC", z.dc],
            ["Zoho accountId", z.accountId || "—"],
            ["Mapped Inbox folderId", z.inboxFolder || "(auto)"],
            ["Mapped Sent folderId", z.sentFolder || "(auto)"],
          ]}
        />
      </Block>
    </>
  );
  const tail = (
    <>
      <Block title="Current index sizes">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["RFC", sizes.rfc],
              ["Msg", sizes.msg],
              ["Conv", sizes.conv],
              ["Contacts", sizes.contact],
            ] as [string, number][]
          ).map(([k, v]) => (
            <div key={k} className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
              <dt className="text-xs font-medium text-slate-500">{k}</dt>
              <dd className="mt-0.5 text-lg font-semibold text-slate-900 tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </Block>
      {attempts ? (
        <Block title="Last list attempts (saved by sync)">
          <Pre v={attempts} />
        </Block>
      ) : null}
    </>
  );
  if (!token)
    return (
      <div className="max-w-6xl space-y-4">
        {header}
        <Block title="OAuth" ok={false}>
          No access token. Reconnect in settings.
        </Block>
        {tail}
      </div>
    );
  if (!z.accountId)
    return (
      <div className="max-w-6xl space-y-4">
        {header}
        <Block title="Settings" ok={false}>
          No Zoho account id in settings.
        </Block>
        {tail}
      </div>
    );
  const folders = await zohoApi("/folders");
  const { lists } = await diagFolderLists(15);
  return (
    <div className="max-w-6xl space-y-4">
      {header}
      <Block title="Folders" ok={folders.code >= 200 && folders.code < 300}>
        <Pre v={folders.body ?? folders.raw} />
      </Block>
      {lists.map((l) =>
        !l.fid ? (
          <Block key={l.name} title={l.name} ok={false}>
            No folderId
          </Block>
        ) : (
          <div key={l.name} className="space-y-4">
            <Block title={`${l.name} raw (truncated)`}>
              <Pre v={l.raw || "(empty)"} />
            </Block>
            <Block title={`${l.name} list — strategy: ${l.strategy || "none succeeded"}`} ok={!!l.strategy}>
              <ul className="mb-3 flex flex-wrap gap-1.5 text-xs">
                {l.attempts.map((a) => (
                  <li key={a.strategy}>
                    <Badge tone={a.code >= 200 && a.code < 300 ? (a.count ? "success" : "neutral") : "danger"}>
                      <span className="font-mono">
                        {a.strategy}: HTTP {a.code}, {a.count} item(s)
                      </span>
                    </Badge>
                  </li>
                ))}
              </ul>
              <div className={tableCls.wrap}>
                <table className={tableCls.table}>
                  <thead className={tableCls.thead}>
                    <tr>
                      {["when", "from", "to", "subject", "messageId"].map((h) => (
                        <th key={h} className={tableCls.th}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {l.rows.map((r) => (
                      <tr key={r.messageId} className={tableCls.tr}>
                        <td className={`${tableCls.td} py-2 text-xs whitespace-nowrap tabular-nums`}>{r.when}</td>
                        <td className={`${tableCls.td} py-2 text-xs`}>{r.from}</td>
                        <td className={`${tableCls.td} py-2 text-xs`}>{r.to}</td>
                        <td className={`${tableCls.td} py-2 text-xs font-medium text-slate-900`}>{r.subject}</td>
                        <td className={`${tableCls.td} max-w-[220px] py-2 text-xs`}>
                          <a className="block truncate font-mono text-brand-700 hover:underline" href={`/api/admin/x/diag/probe?mid=${encodeURIComponent(r.messageId)}`} target="_blank">
                            {r.messageId}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Block>
          </div>
        ),
      )}
      {tail}
    </div>
  );
}
