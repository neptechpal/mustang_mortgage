// Shared pieces for rule / price detail pages: publish readiness checklist and version history.
import Link from "next/link";
import { CircleCheck, CircleX, History } from "lucide-react";
import { Card, cn } from "@/components/admin/ui";
import { fmtDate, fmtDateTime } from "../meta";
import { StatusBadge } from "./parts";

export function Readiness({ items }: { items: [string, boolean][] }) {
  return (
    <ul className="space-y-1.5">
      {items.map(([label, ok]) => (
        <li key={label} className={cn("flex items-start gap-2 text-[13px]", ok ? "text-slate-600" : "text-slate-900")}>
          {ok ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" /> : <CircleX className="mt-0.5 size-4 shrink-0 text-red-500" />}
          {label}
        </li>
      ))}
    </ul>
  );
}

type Ver = { id: number; version: number; status: string; createdAt: Date; createdBy: string; verifiedAt: Date | null; reviewer: string; changeNote: string };

export function VersionHistory({ versions, currentId, hrefBase, keyLabel }: { versions: Ver[]; currentId: number; hrefBase: string; keyLabel: string }) {
  return (
    <Card title={<span className="inline-flex items-center gap-2"><History className="size-4 text-slate-400" />Version history</span>} description={<code className="font-mono">{keyLabel}</code>} padded={false}>
      <ol className="divide-y divide-slate-100">
        {versions.map((v) => (
          <li key={v.id} className={cn("px-5 py-3", v.id === currentId && "bg-brand-50/50")}>
            <div className="flex items-center justify-between gap-2">
              <Link href={`${hrefBase}/${v.id}`} className={cn("text-sm font-semibold tabular-nums hover:text-brand-700", v.id === currentId ? "text-brand-800" : "text-slate-800")}>
                v{v.version}
                {v.id === currentId && <span className="ml-1.5 text-xs font-normal text-slate-500">(viewing)</span>}
              </Link>
              <StatusBadge status={v.status} />
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {fmtDateTime(v.createdAt)}
              {v.createdBy && ` · ${v.createdBy}`}
            </p>
            {v.verifiedAt && <p className="text-xs text-slate-500">Verified {fmtDate(v.verifiedAt)}{v.reviewer && ` by ${v.reviewer}`}</p>}
            {v.changeNote && <p className="mt-1 text-xs text-slate-700">{v.changeNote}</p>}
          </li>
        ))}
      </ol>
    </Card>
  );
}
