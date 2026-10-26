import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { Save } from "lucide-react";
import { Alert, Button, Card, inputStyles, labelStyles, tableCls } from "@/components/admin/ui";
import { borrowSettings, borrowPrefill, borrowHistory, GROUPS, CATEGORIES, type BorrowSettings } from "@/modules/crm-extra/lib/borrow";
import { borrowSettingsSave } from "@/modules/crm-extra/actions/borrow";
import { caseName, ymdHi } from "@/modules/crm-extra/lib/cases";
import BorrowCalc from "@/modules/crm-extra/components/BorrowCalc";

export const metadata = { title: "Borrowing Capacity" };
export const dynamic = "force-dynamic";

function Settings({ s, saved }: { s: BorrowSettings; saved: boolean }) {
  const scal: [string, string][] = [
    ["product_rate", "Default product rate %"],
    ["buffer_percent", "Buffer +%"],
    ["floor_rate", "Assessment floor %"],
    ["term_years", "Default term (years)"],
    ["io_years", "Interest-only period (yrs)"],
    ["rent_shade_pct", "Rent counted %"],
    ["bonus_shade_pct", "Bonus / overtime counted %"],
    ["cc_assess_pct", "Credit card assessed % of limit / month"],
    ["dti_cap", "DTI cap (× gross income)"],
    ["solicitor_fee", "Solicitor / conveyancer ($)"],
  ];
  const hem: [string, string][] = [
    ["hem_single", "Single"],
    ["hem_single1", "Single + 1 dep"],
    ["hem_couple", "Couple"],
    ["hem_c1", "Couple + 1 dep"],
    ["hem_c2", "Couple + 2 dep"],
    ["hem_c3", "Couple + 3+ dep"],
  ];
  const S = s as unknown as Record<string, number | string>;
  const grid = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";
  const num = inputStyles + " tabular-nums";
  return (
    <form action={borrowSettingsSave} className="space-y-6">
      {saved && <Alert tone="success">Assumptions saved.</Alert>}
      <Card title="Assessment assumptions" description="Defaults used when assessing borrowing capacity.">
        <div className={grid}>
          {scal.map(([k, l]) => (
            <label key={k} className="block">
              <span className={labelStyles}>{l}</span>
              <input type="number" step="any" name={`s[${k}]`} defaultValue={String(S[k])} className={num} />
            </label>
          ))}
        </div>
      </Card>
      <Card title="Living-cost benchmarks (monthly)" description="Used as the floor when the client’s declared living costs are lower.">
        <div className={grid}>
          {hem.map(([k, l]) => (
            <label key={k} className="block">
              <span className={labelStyles}>{l}</span>
              <span className="relative block">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-slate-400">$</span>
                <input type="number" step="10" name={`s[${k}]`} defaultValue={String(S[k])} className={num + " pl-7"} />
              </span>
            </label>
          ))}
        </div>
      </Card>
      <Card
        title="Flex living-category breakdown (monthly)"
        description="Reference table shown in Flex Entry so you can enter expenses by category."
        padded={false}
      >
        <div className="overflow-x-auto">
          <table className={tableCls.table}>
            <thead className={tableCls.thead}>
              <tr>
                <th className={tableCls.th}>Category</th>
                {Object.values(GROUPS).map((l) => (
                  <th key={l} className={tableCls.th}>
                    {l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(CATEGORIES).map(([c, cl]) => (
                <tr key={c} className={tableCls.tr}>
                  <td className={tableCls.td + " font-medium whitespace-nowrap text-slate-900"}>{cl}</td>
                  {Object.keys(GROUPS).map((g) => (
                    <td key={g} className="px-2 py-2">
                      <input
                        type="number"
                        step="1"
                        name={`s[living_table][${g}][${c}]`}
                        defaultValue={s.living_table[g][c]}
                        className={num + " !w-24 !py-1.5"}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Government fees by state" description="Transfer and mortgage registration fees added to purchase costs." padded={false}>
        <div className="overflow-x-auto">
          <table className={tableCls.table}>
            <thead className={tableCls.thead}>
              <tr>
                <th className={tableCls.th}>State</th>
                <th className={tableCls.th}>Transfer</th>
                <th className={tableCls.th}>Mortgage reg.</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(s.fees).map(([st, v]) => (
                <tr key={st} className={tableCls.tr}>
                  <td className={tableCls.td + " font-semibold text-slate-900"}>{st}</td>
                  <td className="px-2 py-2">
                    <input type="number" aria-label={`${st} transfer`} name={`s[fees][${st}][transfer]`} defaultValue={v.transfer} className={num + " !w-36"} />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      aria-label={`${st} mortgage registration`}
                      name={`s[fees][${st}][mortgage]`}
                      defaultValue={v.mortgage}
                      className={num + " !w-36"}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Printed / emailed summary" description="Branding and contact details on the copied / printed summary.">
        <div className={grid}>
          {(
            [
              ["company", "Company"],
              ["broker_name", "Broker name"],
              ["broker_email", "Email"],
              ["broker_mobile", "Mobile"],
              ["logo", "Logo URL"],
            ] as [string, string][]
          ).map(([k, l]) => (
            <label key={k} className="block">
              <span className={labelStyles}>{l}</span>
              <input type="text" name={`s[${k}]`} defaultValue={String(S[k])} className={inputStyles} />
            </label>
          ))}
        </div>
      </Card>
      <div className="flex justify-end">
        <Button variant="primary">
          <Save />
          Save assumptions
        </Button>
      </div>
    </form>
  );
}

export default async function BorrowingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sess = await requireStaff();
  const sp = await searchParams;
  const caseId = Number(sp.case || 0);
  const c = caseId
    ? await prisma.case.findUnique({
        where: { id: caseId },
        select: { id: true, title: true, app1Name: true, app2Name: true },
      })
    : null;
  const S = await borrowSettings();
  const prefill = c ? await borrowPrefill(c.id) : {};
  const hist = await borrowHistory();
  const isAdmin = sess.role === "ADMIN";
  const tabs = ["capacity", "income", "repay", "equity", "history", ...(isAdmin ? ["settings"] : [])];
  const tab = tabs.includes(sp.tab ?? "") ? sp.tab! : "capacity";
  return (
    <BorrowCalc
      S={S}
      prefill={prefill}
      caseId={c?.id ?? 0}
      caseName={c ? caseName(c) : undefined}
      caseHref={c ? `/admin/cases/${c.id}` : undefined}
      groups={GROUPS}
      isAdmin={isAdmin}
      tab={tab}
      banner={!!c && !!prefill.a1Gross}
      history={hist.map((h) => ({
        id: h.id,
        ts: ymdHi(h.createdAt),
        label: h.label,
        max_loan: h.maxLoan,
        case: h.caseId,
        data: (h.data ?? {}) as Record<string, string>,
      }))}
      settingsPane={isAdmin ? <Settings s={S} saved={sp.saved === "1"} /> : undefined}
    />
  );
}
