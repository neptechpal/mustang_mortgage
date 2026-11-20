import Link from "next/link";
import { Building2, CheckCircle2, Pencil, Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { Alert, Badge, Card, EmptyState, LinkButton, Table, TBody, TD, TH, THead, TR } from "@/components/admin/ui";
import { FEATURES } from "../../facts";
import { BASE, OCCUPANCIES, PURPOSES, RATE_TYPES, label, money, shortOcc } from "../meta";

export async function LendersTab({ isAdmin }: { isAdmin: boolean }) {
  const [lenders, rules, prices] = await Promise.all([
    prisma.scnLender.findMany({ orderBy: [{ sort: "asc" }, { name: "asc" }], include: { products: { orderBy: [{ active: "desc" }, { name: "asc" }] } } }),
    prisma.scnPolicyRule.groupBy({ by: ["lenderId"], where: { status: "published" }, _count: { _all: true } }),
    prisma.scnPriceRecord.groupBy({ by: ["lenderId"], where: { status: "published" }, _count: { _all: true } }),
  ]);
  const onPanel = lenders.filter((l) => l.onPanel).length;
  const rc = (id: number) => rules.find((r) => r.lenderId === id)?._count._all ?? 0;
  const pc = (id: number) => prices.find((r) => r.lenderId === id)?._count._all ?? 0;

  return (
    <div className="space-y-5">
      <Alert tone="info" title={`Panel: ${onPanel} lender${onPanel === 1 ? "" : "s"}`}>
        The panel is every lender with <b>On panel</b> ticked — only panel lenders are considered by assessments. Launch with the five accredited lenders Mustang chooses.
        {!isAdmin && " Only an admin can change panel membership."}
      </Alert>

      {lenders.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title="No lenders yet"
          description="Add the accredited lenders on Mustang's panel, then their products."
          action={<LinkButton href={`${BASE}/lenders/new`} variant="primary" size="sm"><Plus />Add lender</LinkButton>}
        />
      ) : (
        lenders.map((l) => (
          <Card
            key={l.id}
            padded={false}
            title={
              <span className="flex flex-wrap items-center gap-2">
                <Link href={`${BASE}/lenders/${l.id}`} className="hover:text-brand-700">{l.name}</Link>
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-600">{l.code}</code>
                {l.onPanel ? <Badge tone="success" dot>On panel</Badge> : <Badge tone="neutral">Not on panel</Badge>}
                {l.accredited ? <Badge tone="brand"><CheckCircle2 className="size-3" />Accredited</Badge> : <Badge tone="warning">Not accredited</Badge>}
              </span>
            }
            description={
              <span className="tabular-nums">
                {l.products.length} product{l.products.length === 1 ? "" : "s"} · {rc(l.id)} published rule{rc(l.id) === 1 ? "" : "s"} · {pc(l.id)} published price record{pc(l.id) === 1 ? "" : "s"}
              </span>
            }
            actions={
              <>
                <LinkButton href={`${BASE}/lenders/${l.id}?product=new#product-form`} variant="ghost" size="sm"><Plus />Product</LinkButton>
                <LinkButton href={`${BASE}/lenders/${l.id}`} variant="secondary" size="sm"><Pencil />Edit</LinkButton>
              </>
            }
          >
            {l.products.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-500">No products yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table className="lg:table-fixed">
                  <THead>
                    <tr>
                      <TH className="lg:w-[30%]">Product</TH>
                      <TH className="hidden md:table-cell lg:w-[20%]">Purpose · occupancy</TH>
                      <TH className="hidden sm:table-cell lg:w-[11%]">Repayment</TH>
                      <TH className="hidden lg:table-cell">Features</TH>
                      <TH className="text-right lg:w-[14%]">Loan limit</TH>
                    </tr>
                  </THead>
                  <TBody>
                    {l.products.map((p) => (
                      <TR key={p.id} className={p.active ? "" : "opacity-60"}>
                        <TD>
                          <Link href={`${BASE}/lenders/${l.id}?product=${p.id}#product-form`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">{p.name}</Link>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                            <code className="font-mono">{p.code}</code>
                            <span>· {label(RATE_TYPES, p.rateType)}</span>
                            {!p.active && <Badge tone="neutral" className="py-0 text-[10px]">Inactive</Badge>}
                          </div>
                        </TD>
                        <TD className="hidden text-xs md:table-cell">
                          {p.purposes.map((x) => label(PURPOSES, x)).join(", ")}
                          <div className="text-slate-500">{p.occupancies.map((x) => (OCCUPANCIES.some(([k]) => k === x) ? shortOcc(x) : x)).join(", ")}</div>
                        </TD>
                        <TD className="hidden text-xs sm:table-cell">{p.repaymentTypes.join(" / ")}</TD>
                        <TD className="hidden lg:table-cell">
                          <div className="flex max-w-md flex-wrap gap-1">
                            {p.features.length ? p.features.map((f) => <Badge key={f} tone="neutral" className="text-[11px]">{label(FEATURES, f)}</Badge>) : <span className="text-xs text-slate-400">—</span>}
                          </div>
                        </TD>
                        <TD className="text-right text-xs tabular-nums">
                          {p.maxLoan ? money(p.maxLoan) : <span className="text-slate-400">—</span>}
                          {p.minLoan ? <div className="text-slate-500">min {money(p.minLoan)}</div> : null}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
