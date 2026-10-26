import type { Metadata } from "next";
import Portal from "@/modules/crm/components/Portal";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Secure Upload Portal | Mustang Mortgage", robots: { index: false, follow: false } };

export default async function PortalPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <main className="min-h-screen bg-white">
      <Portal searchParams={await searchParams} />
    </main>
  );
}
