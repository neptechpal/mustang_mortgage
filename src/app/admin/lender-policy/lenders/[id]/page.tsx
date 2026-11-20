import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, Package, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import ConfirmSubmit from "@/components/admin/ConfirmSubmit";
import { Badge, Button, Card, Field, Input, LinkButton, PageHeader, Select, Table, TBody, TD, TH, THead, TR, Textarea, buttonStyles, cn } from "@/components/admin/ui";
import { Toggle, ToggleRow } from "@/modules/crm/components/admin-kit";
import { FEATURES } from "@/modules/scenario/facts";
import { deleteLenderAction, deleteProductAction, saveLenderAction, saveProductAction } from "@/modules/scenario/policy/admin";
import { BASE, OCCUPANCIES, PURPOSES, RATE_TYPES, REPAYMENT_TYPES, label, money } from "@/modules/scenario/policy/meta";
import { CheckGroup, Flash } from "@/modules/scenario/policy/ui/parts";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lender" };

export default async function LenderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requireStaff();
  const isAdmin = s.role === "ADMIN";
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  const lender = isNew ? null : await prisma.scnLender.findUnique({ where: { id: Number(id) || 0 }, include: { products: { orderBy: [{ active: "desc" }, { name: "asc" }] } } });
  if (!isNew && !lender) notFound();
  const editing = sp.product && sp.product !== "new" ? lender?.products.find((p) => p.id === Number(sp.product)) : null;
  const showProductForm = lender && (sp.product === "new" || editing || lender.products.length === 0);
  const [rules, prices, sources] = lender
    ? await Promise.all([
        prisma.scnPolicyRule.count({ where: { lenderId: lender.id, status: "published" } }),
        prisma.scnPriceRecord.count({ where: { lenderId: lender.id, status: "published" } }),
        prisma.scnSource.count({ where: { lenderId: lender.id, status: { in: ["draft", "published"] } } }),
      ])
    : [0, 0, 0];

  return (
    <div className="max-w-5xl">
      <PageHeader
        icon={<Building2 />}
        breadcrumbs={[{ label: "Lender policy", href: BASE }, { label: "Lenders & products", href: `${BASE}?tab=lenders` }, { label: lender?.name ?? "New lender" }]}
        title={lender ? lender.name : "Add lender"}
        description={lender ? <span className="tabular-nums">{lender.products.length} products · {rules} published rules · {prices} published price records · {sources} current sources</span> : "A lender on (or being considered for) Mustang's accredited panel."}
        actions={
          lender && (
            <>
              <LinkButton href={`${BASE}?tab=rules&lender=${lender.id}`} variant="secondary" size="sm">Rules</LinkButton>
              <LinkButton href={`${BASE}?tab=pricing&lender=${lender.id}`} variant="secondary" size="sm">Pricing</LinkButton>
              <LinkButton href={`${BASE}/sources/new?lender=${lender.id}`} variant="secondary" size="sm"><Plus />Source</LinkButton>
            </>
          )
        }
      />
      <Flash sp={sp} />

      <div className="space-y-6">
        <Card title="Lender details">
          <form action={saveLenderAction} className="space-y-5">
            {lender && <input type="hidden" name="id" value={lender.id} />}
            <div className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <Field label="Name" htmlFor="name" required>
                <Input id="name" name="name" required maxLength={120} defaultValue={lender?.name ?? ""} placeholder="e.g. Demo Lender A" />
              </Field>
              <Field label="Code" htmlFor="code" required hint="Short, unique, stable.">
                <Input id="code" name="code" required maxLength={40} pattern="[A-Za-z0-9][A-Za-z0-9_\-]*" defaultValue={lender?.code ?? ""} placeholder="LDR-A" className="font-mono uppercase" />
              </Field>
              <Field label="Sort order" htmlFor="sort">
                <Input id="sort" name="sort" type="number" min={0} step={1} defaultValue={lender?.sort ?? 0} className="tabular-nums" />
              </Field>
            </div>
            <div className="grid gap-x-6 divide-y divide-slate-100 rounded-lg border border-slate-200 px-4 sm:grid-cols-2 sm:divide-y-0">
              <ToggleRow
                input={<Toggle name="onPanel" value="1" defaultChecked={lender ? lender.onPanel : isAdmin} disabled={!isAdmin} />}
                title="On panel"
                description={isAdmin ? "Assessments only consider panel lenders." : "Only an admin can change panel membership."}
              />
              <ToggleRow input={<Toggle name="accredited" value="1" defaultChecked={lender?.accredited ?? true} />} title="Accredited" description="Mustang holds accreditation with this lender." />
            </div>
            <Field label="Notes" htmlFor="notes" hint="Internal notes (BDM contact, accreditation status). Never commission or referral data.">
              <Textarea id="notes" name="notes" rows={3} maxLength={4000} defaultValue={lender?.notes ?? ""} />
            </Field>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4">
              <Button variant="primary"><Save />{lender ? "Save lender" : "Create lender"}</Button>
            </div>
          </form>
          {lender && isAdmin && (
            <form action={deleteLenderAction} className="mt-3 flex justify-end">
              <input type="hidden" name="id" value={lender.id} />
              <ConfirmSubmit message={`Delete ${lender.name} and its products? Only possible when no rules, prices or sources reference it.`} className={buttonStyles({ variant: "ghost", size: "sm", className: "text-red-600 hover:bg-red-50 hover:text-red-700" })}>
                <Trash2 />Delete lender
              </ConfirmSubmit>
            </form>
          )}
        </Card>

        {lender && (
          <Card
            title="Products"
            description="Maximum loan is the product loan limit — separate from borrowing capacity."
            padded={false}
            actions={<LinkButton href={`?product=new#product-form`} variant="secondary" size="sm"><Plus />Add product</LinkButton>}
          >
            {lender.products.length === 0 ? (
              <p className="px-5 py-4 text-sm text-slate-500">No products yet — add the first one below.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <THead>
                    <tr>
                      <TH>Product</TH>
                      <TH className="hidden md:table-cell">Applies to</TH>
                      <TH className="hidden lg:table-cell">Features</TH>
                      <TH className="text-right">Loan limit</TH>
                      <TH className="w-24"><span className="sr-only">Actions</span></TH>
                    </tr>
                  </THead>
                  <TBody>
                    {lender.products.map((p) => (
                      <TR key={p.id} className={cn(editing?.id === p.id && "bg-brand-50/40", !p.active && "opacity-60")}>
                        <TD>
                          <div className="font-medium text-slate-900">{p.name}</div>
                          <div className="text-xs text-slate-500"><code className="font-mono">{p.code}</code> · {label(RATE_TYPES, p.rateType)}{!p.active && " · inactive"}</div>
                        </TD>
                        <TD className="hidden text-xs text-slate-600 md:table-cell">
                          {p.purposes.map((x) => label(PURPOSES, x)).join(", ")} · {p.occupancies.map((x) => label(OCCUPANCIES, x)).join(", ")} · {p.repaymentTypes.join("/")}
                        </TD>
                        <TD className="hidden lg:table-cell">
                          <div className="flex flex-wrap gap-1">{p.features.map((f) => <Badge key={f} className="text-[11px]">{label(FEATURES, f)}</Badge>)}</div>
                        </TD>
                        <TD className="text-right text-xs tabular-nums">{p.maxLoan ? money(p.maxLoan) : "—"}{p.minLoan ? <div className="text-slate-500">min {money(p.minLoan)}</div> : null}</TD>
                        <TD className="text-right">
                          <LinkButton href={`?product=${p.id}#product-form`} variant="ghost" size="xs"><Pencil />Edit</LinkButton>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            )}
          </Card>
        )}

        {lender && showProductForm && (
          <Card id="product-form" title={editing ? `Edit product — ${editing.name}` : "Add product"} className="scroll-mt-24">
            <form action={saveProductAction} className="space-y-5">
              <input type="hidden" name="lenderId" value={lender.id} />
              {editing && <input type="hidden" name="id" value={editing.id} />}
              <div className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <Field label="Product name" htmlFor="p-name" required>
                  <Input id="p-name" name="name" required maxLength={160} defaultValue={editing?.name ?? ""} placeholder="e.g. Basic Variable (synthetic)" />
                </Field>
                <Field label="Code" htmlFor="p-code" required hint="Unique across all lenders.">
                  <Input id="p-code" name="code" required maxLength={40} pattern="[A-Za-z0-9][A-Za-z0-9_\-]*" defaultValue={editing?.code ?? ""} className="font-mono uppercase" placeholder={`${lender.code}-BV`} />
                </Field>
                <Field label="Rate type" htmlFor="p-rate">
                  <Select id="p-rate" name="rateType" defaultValue={editing?.rateType ?? "variable"}>
                    {RATE_TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-3">
                <CheckGroup legend="Purposes" name="purposes" options={PURPOSES} selected={editing?.purposes ?? ["purchase", "refinance"]} />
                <CheckGroup legend="Occupancies" name="occupancies" options={OCCUPANCIES} selected={editing?.occupancies ?? ["owner_occupied", "investment"]} />
                <CheckGroup legend="Repayment types" name="repaymentTypes" options={REPAYMENT_TYPES.map(([k]) => [k, k] as [string, string])} selected={editing?.repaymentTypes ?? ["PI", "IO"]} />
              </div>
              <CheckGroup legend="Features" name="features" options={FEATURES} selected={editing?.features ?? []} />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Min loan (AUD)" htmlFor="p-min">
                  <Input id="p-min" name="minLoan" type="number" min={0} step="any" inputMode="decimal" defaultValue={editing?.minLoan ?? ""} className="tabular-nums" />
                </Field>
                <Field label="Max loan — product loan limit (AUD)" htmlFor="p-max" hint="Not borrowing capacity; that comes from the lender calculator.">
                  <Input id="p-max" name="maxLoan" type="number" min={0} step="any" inputMode="decimal" defaultValue={editing?.maxLoan ?? ""} className="tabular-nums" />
                </Field>
              </div>
              <Field label="Notes" htmlFor="p-notes">
                <Textarea id="p-notes" name="notes" rows={2} maxLength={4000} defaultValue={editing?.notes ?? ""} />
              </Field>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <label className="inline-flex items-center gap-2.5 text-sm text-slate-700">
                  <Toggle name="active" value="1" defaultChecked={editing?.active ?? true} /> Active
                </label>
                <div className="flex flex-wrap gap-2">
                  {editing && <LinkButton href={`${BASE}/lenders/${lender.id}`} variant="ghost">Cancel</LinkButton>}
                  <Button variant="primary"><Package />{editing ? "Save product" : "Add product"}</Button>
                </div>
              </div>
            </form>
            {editing && isAdmin && (
              <form action={deleteProductAction} className="mt-3 flex justify-end">
                <input type="hidden" name="id" value={editing.id} />
                <input type="hidden" name="lenderId" value={lender.id} />
                <ConfirmSubmit message={`Delete product ${editing.name}? Only possible when no rules or prices reference it.`} className={buttonStyles({ variant: "ghost", size: "sm", className: "text-red-600 hover:bg-red-50 hover:text-red-700" })}>
                  <Trash2 />Delete product
                </ConfirmSubmit>
              </form>
            )}
          </Card>
        )}
        {!lender && (
          <p className="text-sm text-slate-500">
            Save the lender first, then add its products. <Link href={`${BASE}?tab=lenders`} className="text-brand-700 hover:underline">Back to lenders</Link>
          </p>
        )}
      </div>
    </div>
  );
}
