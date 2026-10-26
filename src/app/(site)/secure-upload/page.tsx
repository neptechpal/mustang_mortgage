import { redirect } from "next/navigation";

// Legacy WordPress portal page ([mm_doc_portal]) — links in old emails keep working.
export const dynamic = "force-dynamic";
export default async function LegacyPortal({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string") q.set(k, v);
  redirect(`/portal${q.size ? `?${q.toString()}` : ""}`);
}
