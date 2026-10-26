// Legacy CRM UI helpers — thin aliases over the admin design kit
// (src/components/admin/ui.tsx). Export names/props are kept so every older
// call site picks up the new look without changes.
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import {
  Alert, Badge, Card as KitCard, PageHeader, buttonStyles, cn, inputStyles, labelStyles,
  type Crumb, type Tone,
} from "@/components/admin/ui";

/** Secondary button (md). */
export const btn = buttonStyles({ variant: "secondary", size: "md" });
/** Primary (brand) button (md). */
export const btnPrimary = buttonStyles({ variant: "primary", size: "md" });
/** Append to `btn` / `btnPrimary` for the compact size. */
export const btnSm = "!h-7 !px-2.5 !text-xs [&_svg]:!size-3.5";
export const input = inputStyles;
export const label = labelStyles;

/** Legacy chip tones → kit badge tones. */
export const CHIP_TONE: Record<string, Tone> = { good: "success", warn: "warning", bad: "danger", info: "info", "": "neutral" };
export const chipTone = (t?: string): Tone => CHIP_TONE[t ?? ""] ?? "neutral";

export function Chip({ tone = "", children, style, dot }: { tone?: string; children: ReactNode; style?: CSSProperties; dot?: boolean }) {
  return <Badge tone={chipTone(tone)} style={style} dot={dot}>{children}</Badge>;
}

export function Card({ title, right, children, className = "", id, description, padded = true }: {
  title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; id?: string; description?: ReactNode; padded?: boolean;
}) {
  return <KitCard id={id} title={title} description={description} actions={right} className={className} padded={padded}>{children}</KitCard>;
}

export function PageHead({ title, sub, children, icon, breadcrumbs }: { title: ReactNode; sub?: ReactNode; children?: ReactNode; icon?: ReactNode; breadcrumbs?: Crumb[] }) {
  return <PageHeader title={title} description={sub} actions={children} icon={icon} breadcrumbs={breadcrumbs} />;
}

export function Notice({ tone = "good", children }: { tone?: "good" | "bad" | "info"; children: ReactNode }) {
  return <Alert tone={tone === "good" ? "success" : tone === "bad" ? "danger" : "info"} className="mb-4">{children}</Alert>;
}

export const A = ({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) => (
  <Link href={href} className={cn("font-medium text-brand-700 hover:text-brand-800 hover:underline", className)}>{children}</Link>
);
