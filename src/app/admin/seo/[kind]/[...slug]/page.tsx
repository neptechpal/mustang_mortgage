import { notFound } from "next/navigation";
import { ExternalLink, FileSearch, History } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { Alert, Badge, Card, KeyValue, LinkButton, PageHeader } from "@/components/admin/ui";
import { approveReview, saveReview, unapproveReview } from "@/modules/seo-admin/actions";
import { dataDate, fmtDate, loadAuditReport, loadReviewRows, pageLabel, readLog, suburbFor } from "@/modules/seo-admin/data";
import { ReviewForm } from "@/modules/seo-admin/ReviewForm";
import { KIND_LABELS, countWords, keyFromParams, minWordsFor } from "@/modules/seo-admin/shared";
import { aud, num, pct } from "@/modules/web/suburbs/copy";
import { medianPrice } from "@/modules/web/suburbs/model";

export const metadata = { title: "Review page" };
export const dynamic = "force-dynamic";

const ACTION_LABEL = { approved: "Approved", unapproved: "Unapproved", saved: "Saved", "auto-unapproved": "Unapproved (note too short)" } as const;

export default async function ReviewEditPage({ params, searchParams }: { params: Promise<{ kind: string; slug: string[] }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireStaff();
  const { kind, slug } = await params;
  const sp = await searchParams;
  const key = keyFromParams(kind, slug);
  await loadReviewRows(); // registers suburb rows from route data
  const row = await prisma.seoReview.findUnique({ where: { key } });
  if (!row) notFound();
  const [report, log] = await Promise.all([loadAuditReport(), readLog(key)]);
  const a = report?.pages.find((p) => p.key === key);
  const label = pageLabel(row, a);
  const min = minWordsFor(row.kind);
  const words = countWords(row.brokerNote);
  const d = dataDate(row);
  const s = suburbFor(key);
  const unit = s ? medianPrice(s, "unit") : null;
  const house = s ? medianPrice(s, "house") : null;

  return (
    <div>
      <PageHeader
        icon={<FileSearch />}
        breadcrumbs={[{ label: "SEO page review", href: "/admin/seo" }, { label: KIND_LABELS[row.kind] ?? row.kind, href: "/admin/seo" }, { label }]}
        title={label}
        description={
          <span className="font-mono text-xs">
            {row.key} · {row.path}
          </span>
        }
        actions={
          <LinkButton href={row.path} target="_blank" variant="secondary">
            <ExternalLink /> View page
          </LinkButton>
        }
      />

      {sp.saved && (
        <Alert tone="success" className="mb-4">
          Saved.
        </Alert>
      )}
      {sp.approved && (
        <Alert tone="success" className="mb-4" title="Approved">
          The page is now marked reviewed: it is indexable and in the sitemap once SEO_INDEXING=on in production.
        </Alert>
      )}
      {sp.unapproved && (
        <Alert tone="warning" className="mb-4" title="Sign-off withdrawn">
          {sp.unapproved === "short" ? `The broker note is under ${min} words, so the page was unapproved.` : "The page is back to noindex and out of the sitemap."}
        </Alert>
      )}
      {sp.error === "short" && (
        <Alert tone="danger" className="mb-4" title="Not approved">
          Your changes were saved, but this page needs a broker note of at least {min} words before it can be approved.
        </Alert>
      )}
      {a && a.hard.length > 0 && (
        <Alert tone="danger" className="mb-4" title="The latest audit found hard stops on this page">
          {a.hard.join("; ")}. Fix the template or data before approving.
        </Alert>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <Card title="Sign-off" description="Read the live page first. Approving records your name and the date.">
            <ReviewForm
              reviewKey={row.key}
              kind={row.kind}
              initialNote={row.brokerNote}
              initialNotes={row.notes}
              reviewed={row.reviewed}
              minWords={min}
              saveAction={saveReview}
              approveAction={approveReview}
              unapproveAction={unapproveReview}
            />
          </Card>

          {s && (
            <Card title="Figures on this page" description="For reference while writing the note. Don't repeat them; add what the data can't say.">
              <KeyValue
                cols={3}
                items={[
                  ["Residents (2021)", s.census.population != null ? num(s.census.population) : null],
                  ["Born in Nepal", s.census.nepalBorn != null ? `${num(s.census.nepalBorn)} (${pct(s.census.nepalBornPct ?? 0)})` : null],
                  ["Households renting", s.census.renterPct != null ? pct(s.census.renterPct) : null],
                  ["Flats and apartments", s.census.dwellingMix ? pct(s.census.dwellingMix.flatApartmentPct) : null],
                  ["Median unit (DCJ)", unit ? `${aud(unit.value)}${unit.geography === "lga" ? " (council area)" : ""}` : null],
                  ["Median house (DCJ)", house ? `${aud(house.value)}${house.geography === "lga" ? " (council area)" : ""}` : null],
                  ["Median rent, new leases", s.dcj.rent?.medianRentWkLatest ? `${aud(s.dcj.rent.medianRentWkLatest)}/wk` : null],
                  ["Council area", s.lgas.map((l) => l.name).join(", ")],
                  ["Data notes", s.notes.length ? s.notes.join(" ") : "None"],
                ]}
              />
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card title="Status">
            <KeyValue
              cols={1}
              items={[
                [
                  "Review",
                  row.reviewed ? (
                    <Badge tone="success" dot>
                      Approved
                    </Badge>
                  ) : (
                    <Badge tone="warning" dot>
                      Not approved (noindex)
                    </Badge>
                  ),
                ],
                ["Reviewed by", row.reviewedBy || null],
                ["Reviewed at", row.reviewedAt ? fmtDate(row.reviewedAt) : null],
                ["Broker note", min ? `${words} / ${min} words` : `${words} words`],
                ["Data", d.date ? `${fmtDate(d.date)} · ${d.label}` : d.label],
                ["Last changed", fmtDate(row.updatedAt)],
              ]}
            />
          </Card>

          <Card
            title="Quality gates"
            description={report ? `Audit ${fmtDate(report.generatedAt)}` : "No audit report yet: run npx tsx scripts/pseo-audit.ts"}
            actions={
              a ? (
                <Badge tone={a.hard.length ? "danger" : a.fails.length ? "warning" : "success"} dot>
                  {a.hard.length ? "Hard stop" : a.fails.length ? "Gate fail" : "Pass"}
                </Badge>
              ) : undefined
            }
          >
            {a ? (
              <div className="space-y-4">
                <KeyValue
                  cols={2}
                  items={[
                    ["Main-content words", `${a.words.toLocaleString("en-AU")}${a.minWords ? ` (min ${a.minWords})` : ""}`],
                    ["Uniqueness (min)", a.uniqueness ? `${a.uniqueness.min}%` : "—"],
                    ["Uniqueness (median)", a.uniqueness ? `${a.uniqueness.median}%` : "—"],
                    ["Closest page", a.uniqueness?.nearest ? a.uniqueness.nearest.split("/").pop() : "—"],
                    ["Data completeness", a.completeness ? `${a.completeness.score}/${a.completeness.of}` : "—"],
                    ["Rules fresh", a.rules.fresh ? "Yes" : "No"],
                    ["Disclaimer", a.disclaimer ? "Yes" : "Missing"],
                    ["Licence block", a.licence ? "Yes" : "Missing"],
                    ["Self-canonical", a.canonicalOk ? "Yes" : "No"],
                    ["In sitemap", a.inSitemap ? "Yes" : "No"],
                  ]}
                />
                {[...a.hard.map((m) => ["danger", m] as const), ...a.fails.map((m) => ["warning", m] as const), ...a.warns.map((m) => ["neutral", m] as const)].length > 0 && (
                  <ul className="space-y-1.5 border-t border-slate-100 pt-3 text-xs">
                    {a.hard.map((m) => (
                      <li key={m} className="text-red-700">
                        Hard stop: {m}
                      </li>
                    ))}
                    {a.fails.map((m) => (
                      <li key={m} className="text-amber-800">
                        Gate: {m}
                      </li>
                    ))}
                    {a.warns.map((m) => (
                      <li key={m} className="text-slate-500">
                        {m}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500">This page was not in the latest audit.</p>
            )}
          </Card>

          <Card title="Sign-off log" actions={<History className="size-4 text-slate-400" />}>
            {log.length ? (
              <ul className="space-y-2 text-sm">
                {log.slice(0, 12).map((e, i) => (
                  <li key={i} className="flex items-start justify-between gap-3">
                    <span>
                      <span className="font-medium text-slate-800">{ACTION_LABEL[e.action] ?? e.action}</span> <span className="text-slate-500">by {e.by}</span>
                    </span>
                    <span className="whitespace-nowrap text-xs tabular-nums text-slate-500">
                      {fmtDate(e.at)} · {e.words}w
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No sign-off activity yet.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
