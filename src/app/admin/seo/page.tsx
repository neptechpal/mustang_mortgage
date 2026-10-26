import Link from "next/link";
import { AlertTriangle, CheckCircle2, ExternalLink, FileSearch, Hourglass, ShieldAlert } from "lucide-react";
import { requireStaff } from "@/lib/session";
import { Alert, Badge, Card, EmptyState, LinkButton, PageHeader, StatCard, TabLinks, Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/admin/ui";
import { type AuditPage, dataDate, fmtDate, loadAuditReport, loadReviewRows, pageLabel } from "@/modules/seo-admin/data";
import { KIND_LABELS, countWords, editHref, minWordsFor } from "@/modules/seo-admin/shared";

export const metadata = { title: "SEO page review" };
export const dynamic = "force-dynamic";

function GateCell({ a }: { a?: AuditPage }) {
  if (!a) return <span className="text-xs text-slate-400">Not audited</span>;
  const tone = a.hard.length ? "danger" : a.fails.length ? "warning" : "success";
  const label = a.hard.length ? `${a.hard.length} hard stop${a.hard.length > 1 ? "s" : ""}` : a.fails.length ? `${a.fails.length} gate fail${a.fails.length > 1 ? "s" : ""}` : "Gates pass";
  return (
    <div className="flex flex-col items-start gap-1" title={[...a.hard, ...a.fails].join("\n") || undefined}>
      <Badge tone={tone} dot>
        {label}
      </Badge>
      <span className="whitespace-nowrap text-xs tabular-nums text-slate-500">
        {a.words.toLocaleString("en-AU")} words{a.uniqueness ? ` · ${a.uniqueness.min}% unique` : ""}
        {a.completeness ? ` · data ${a.completeness.score}/${a.completeness.of}` : ""}
      </span>
    </div>
  );
}

export default async function SeoReviewPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff();
  const sp = await searchParams;
  const [rows, report] = await Promise.all([loadReviewRows(), loadAuditReport()]);
  const audit = new Map((report?.pages ?? []).map((p) => [p.key, p]));
  const status = sp.status === "approved" || sp.status === "awaiting" ? sp.status : "all";
  const approved = rows.filter((r) => r.reviewed).length;
  const awaiting = rows.length - approved;
  const hardRows = rows.filter((r) => (audit.get(r.key)?.hard.length ?? 0) > 0).length;
  const shown = rows.filter((r) => (status === "approved" ? r.reviewed : status === "awaiting" ? !r.reviewed : true));
  const kinds = [...new Set(shown.map((r) => r.kind))];
  const auditAgeDays = report ? Math.floor((Date.now() - new Date(report.generatedAt).getTime()) / 86_400_000) : null;

  return (
    <div>
      <PageHeader
        icon={<FileSearch />}
        title="SEO page review"
        description="Programmatic pages (suburb, visa, first home buyer, stamp duty, community) stay noindex and out of the sitemap until Sulav approves each one here. There is no bulk approve: every page is read and signed off on its own."
        actions={
          <LinkButton href="/sitemap.xml" target="_blank" variant="secondary">
            <ExternalLink /> Sitemap
          </LinkButton>
        }
      />
      {sp.error === "missing" && (
        <Alert tone="danger" className="mb-4">
          That review row no longer exists.
        </Alert>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pages registered" value={rows.length} icon={<FileSearch />} tone="brand" />
        <StatCard label="Approved" value={approved} hint="Indexable once SEO_INDEXING=on" icon={<CheckCircle2 />} tone="success" href="/admin/seo?status=approved" />
        <StatCard label="Awaiting review" value={awaiting} hint="noindex, not in sitemap" icon={<Hourglass />} tone="warning" href="/admin/seo?status=awaiting" />
        <StatCard label="Audit hard stops" value={report ? hardRows : "—"} hint={report ? `Audit ${fmtDate(report.generatedAt)}` : "No audit report yet"} icon={<ShieldAlert />} tone={hardRows ? "danger" : "neutral"} />
      </div>

      {report ? (
        <Card
          className="mb-6"
          title="Latest quality-gate audit"
          description={`${fmtDate(report.generatedAt)} against ${report.base}. Thresholds: uniqueness ≥${report.thresholds.uniqWarn}% (hard stop below ${report.thresholds.uniqHard}%), type median ≥${report.thresholds.uniqMedian}%, suburb ≥${report.thresholds.minWords.suburb ?? 700} words.`}
          padded={false}
          actions={auditAgeDays != null && auditAgeDays > 7 ? <Badge tone="warning">{auditAgeDays} days old</Badge> : undefined}
        >
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <tr>
                  <TH>Page type</TH>
                  <TH className="text-right">Pages</TH>
                  <TH className="text-right">Words (min / median)</TH>
                  <TH className="text-right">Uniqueness min</TH>
                  <TH className="text-right">Median of page mins</TH>
                  <TH className="text-right">Pairwise median</TH>
                  <TH>Result</TH>
                </tr>
              </THead>
              <TBody>
                {Object.entries(report.types).map(([k, t]) => (
                  <TR key={k}>
                    <TD className="font-medium text-slate-900">{KIND_LABELS[k] ?? k}</TD>
                    <TD className="text-right tabular-nums">{t.pages}</TD>
                    <TD className="text-right tabular-nums">
                      {t.minWords.toLocaleString("en-AU")} / {t.medianWords.toLocaleString("en-AU")}
                    </TD>
                    <TD className="text-right tabular-nums">{t.minUniq != null ? `${t.minUniq}%` : "—"}</TD>
                    <TD className="text-right tabular-nums">{t.medianOfMins != null ? `${t.medianOfMins}%` : "—"}</TD>
                    <TD className="text-right tabular-nums">{t.medianUniq != null ? `${t.medianUniq}%` : "—"}</TD>
                    <TD>
                      {t.hard ? (
                        <Badge tone="danger" dot>
                          {t.hard} hard stop{t.hard > 1 ? "s" : ""}
                        </Badge>
                      ) : t.fails ? (
                        <Badge tone="warning" dot>
                          {t.fails} gate fail{t.fails > 1 ? "s" : ""}
                        </Badge>
                      ) : (
                        <Badge tone="success" dot>
                          Pass
                        </Badge>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        </Card>
      ) : (
        <Alert tone="info" className="mb-6" title="No audit report yet">
          Run <code className="rounded bg-white/70 px-1.5 py-0.5 text-xs">npx tsx scripts/pseo-audit.ts --base http://localhost:3005</code> to check word counts, uniqueness,
          disclaimers, canonicals and rules freshness. Results appear here.
        </Alert>
      )}

      <TabLinks
        tabs={[
          { href: "/admin/seo", label: "All", count: rows.length, active: status === "all" },
          { href: "/admin/seo?status=awaiting", label: "Awaiting review", count: awaiting, active: status === "awaiting" },
          { href: "/admin/seo?status=approved", label: "Approved", count: approved, active: status === "approved" },
        ]}
      />

      {shown.length === 0 ? (
        <EmptyState icon={<FileSearch />} title="Nothing here" description="Pages register themselves the first time they render, and suburb guides are registered from the dataset." />
      ) : (
        <div className="space-y-6">
          {kinds.map((kind) => {
            const list = shown.filter((r) => r.kind === kind);
            const min = minWordsFor(kind);
            return (
              <section key={kind}>
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <h2 className="text-[15px] font-semibold text-slate-900">
                    {KIND_LABELS[kind] ?? kind} <span className="font-normal text-slate-500">({list.length})</span>
                  </h2>
                  {min ? <span className="text-xs text-slate-500">Broker note of {min}+ words required to approve</span> : null}
                </div>
                <TableWrap>
                  <Table>
                    <THead>
                      <tr>
                        <TH>Page</TH>
                        <TH>Status</TH>
                        <TH>Broker note</TH>
                        <TH>Data</TH>
                        <TH>Quality gates</TH>
                        <TH className="text-right">
                          <span className="sr-only">Actions</span>
                        </TH>
                      </tr>
                    </THead>
                    <TBody>
                      {list.map((r) => {
                        const a = audit.get(r.key);
                        const words = countWords(r.brokerNote);
                        const d = dataDate(r);
                        return (
                          <TR key={r.key}>
                            <TD className="min-w-[220px]">
                              <Link href={editHref(r.key)} className="font-medium text-slate-900 hover:text-brand-700">
                                {pageLabel(r, a)}
                              </Link>
                              <a href={r.path} target="_blank" rel="noopener noreferrer" className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 hover:text-brand-700">
                                {r.path}
                                <ExternalLink className="size-3" />
                              </a>
                            </TD>
                            <TD>
                              {r.reviewed ? (
                                <div className="flex flex-col items-start gap-1">
                                  <Badge tone="success" dot>
                                    Approved
                                  </Badge>
                                  <span className="text-xs text-slate-500">
                                    {r.reviewedBy || "—"}, {fmtDate(r.reviewedAt)}
                                  </span>
                                </div>
                              ) : (
                                <Badge tone={min && words < min ? "neutral" : "warning"} dot>
                                  {min && words < min ? "Needs broker note" : "Awaiting review"}
                                </Badge>
                              )}
                            </TD>
                            <TD className="tabular-nums">
                              {min ? (
                                <span className={words >= min ? "text-emerald-700" : words ? "text-amber-700" : "text-slate-400"}>
                                  {words} / {min} words
                                </span>
                              ) : (
                                <span className={words ? "text-slate-700" : "text-slate-400"}>{words ? `${words} words` : "Optional"}</span>
                              )}
                            </TD>
                            <TD className="whitespace-nowrap">
                              <span className="block text-slate-700">{d.date ? fmtDate(d.date) : "—"}</span>
                              <span className="block text-xs text-slate-500">{d.label}</span>
                            </TD>
                            <TD>
                              <GateCell a={a} />
                            </TD>
                            <TD className="text-right">
                              <LinkButton href={editHref(r.key)} size="sm" variant={r.reviewed ? "ghost" : "secondary"}>
                                {r.reviewed ? "Open" : "Review"}
                              </LinkButton>
                            </TD>
                          </TR>
                        );
                      })}
                    </TBody>
                  </Table>
                </TableWrap>
              </section>
            );
          })}
        </div>
      )}

      {report && report.totals.skippedNotBuilt > 0 && (
        <p className="mt-6 flex items-center gap-1.5 text-xs text-slate-500">
          <AlertTriangle className="size-3.5" /> The last audit skipped {report.totals.skippedNotBuilt} candidate URLs that are not built yet.
        </p>
      )}
    </div>
  );
}
