// [mmcrm_links group="" show_groups="1" class=""] — reusable server component for any page.
import { Globe, Link2 } from "lucide-react";
import { Badge, EmptyState } from "@/components/admin/ui";
import { getLinks } from "../lib/links";
import LinkOpen from "./LinkOpen";

const host = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u;
  }
};

export default async function CustomLinks({ group = "", showGroups = true, className = "" }: { group?: string; showGroups?: boolean; className?: string }) {
  const all = (await getLinks()).filter((l) => l.url);
  if (!all.length)
    return (
      <div className={`mmcrm-links-front ${className}`}>
        <EmptyState icon={<Link2 />} title="No links available." />
      </div>
    );
  const rows = group ? all.filter((l) => l.group.toLowerCase() === group.toLowerCase()) : all;
  if (!rows.length)
    return (
      <div className={`mmcrm-links-front ${className}`}>
        <EmptyState icon={<Link2 />} title="No links in this group." />
      </div>
    );
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = r.group || "Links";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(r);
  }
  return (
    <div className={`mmcrm-links-front space-y-6 ${className}`}>
      {Array.from(groups.entries()).map(([g, list]) => (
        <section key={g}>
          {showGroups && (
            <h3 className="mb-3 flex items-center gap-2 text-[13px] font-semibold tracking-wider text-slate-500 uppercase">
              {g} <span className="font-medium text-slate-400 tabular-nums">{list.length}</span>
            </h3>
          )}
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))" }}>
            {list.map((l) => (
              <div key={l.id} className="group flex flex-col rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-brand-300 hover:shadow-md">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
                    <Globe className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <a
                      href={l.url}
                      target={l.target ? "_blank" : undefined}
                      rel={l.target ? "noopener" : undefined}
                      className="line-clamp-2 text-sm font-semibold text-slate-900 hover:text-brand-700 hover:underline"
                    >
                      {l.label || l.url}
                    </a>
                    <p className="truncate text-xs text-slate-500">{host(l.url)}</p>
                  </div>
                  <Badge tone={l.modal ? "violet" : "neutral"}>{l.modal ? "Modal" : "Link"}</Badge>
                </div>
                {l.notes && <p className="mt-3 line-clamp-3 text-xs text-slate-500">{l.notes}</p>}
                <div className="mt-auto flex items-center gap-2 pt-3">
                  <LinkOpen url={l.url} label={l.label || l.url} modal={!!l.modal} target={!!l.target} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
