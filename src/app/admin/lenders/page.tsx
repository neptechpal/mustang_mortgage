import { Landmark, Save } from "lucide-react";
import { requireArea } from "@/lib/session";
import { Card, Field, PageHeader, Textarea, buttonStyles } from "@/components/admin/ui";
import { Flash, btnPrimary, sp1 } from "@/modules/members/components/AdminUi";
import { resetLendersAction, saveLendersAction } from "@/modules/web/admin-actions";
import { LendersGrid } from "@/modules/web/components/content/LendersGrid";
import { formatLenderLines, getLenders } from "@/modules/web/lenders";

export const metadata = { title: "Lenders" };
export const dynamic = "force-dynamic";

export default async function LendersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireArea("/admin/lenders");
  const sp = await searchParams;
  const lenders = await getLenders();
  return (
    <div>
      <PageHeader title="Lenders" description="The banks and lenders listed on the home page. Edit the list to match your current AFG panel." icon={<Landmark />} />
      <Flash msg={sp1(sp.msg)} error={sp1(sp.error)} />
      <div className="grid gap-6 lg:grid-cols-2">
        <form action={saveLendersAction}>
          <Card
            title="Lender list"
            description="One lender per line as Name | Category. Lenders with the same category are grouped together, in the order the categories first appear."
            footer={
              <div className="flex justify-end">
                <button className={btnPrimary}>
                  <Save /> Save lenders
                </button>
              </div>
            }
          >
            <Field label="Lenders" hint="Names only. Do not add logos unless the lender has given permission.">
              <Textarea name="lenders" defaultValue={formatLenderLines(lenders)} rows={22} className="font-mono text-[13px]" spellCheck={false} />
            </Field>
          </Card>
        </form>
        <div className="space-y-6">
          <Card title="Preview" description="How the list is grouped on the website.">
            <div className="web">
              <LendersGrid lenders={lenders} />
            </div>
          </Card>
          <form action={resetLendersAction}>
            <button className={buttonStyles({ variant: "secondary" })}>Reset to starting list</button>
          </form>
        </div>
      </div>
    </div>
  );
}
