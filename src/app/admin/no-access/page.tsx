import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { PageHeader, buttonStyles } from "@/components/admin/ui";

export const metadata = { title: "No access" };

export default function NoAccessPage() {
  return (
    <div>
      <PageHeader title="You don't have access to that page" description="Your account can use the sections shown in the menu. Ask an administrator if you need something added." />
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5">
        <LockKeyhole className="size-5 text-slate-400" />
        <Link href="/admin" className={buttonStyles({ variant: "secondary" })}>
          Back to the dashboard
        </Link>
      </div>
    </div>
  );
}
