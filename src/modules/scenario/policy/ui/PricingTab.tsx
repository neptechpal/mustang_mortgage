import Link from "next/link";
import { BadgeDollarSign, CircleCheck, Filter, Plus, TriangleAlert, X } from "lucide-react";
import { Badge, Button, EmptyState, LinkButton, Select, Table, TableWrap, TBody, TD, TH, THead, Toolbar, TR, checkboxStyles, cn } from "@/components/admin/ui";
import { listPrices, loadLookups } from "../data";
import { BASE, PRICING_TYPES, STATUSES, fmtDate, label, money, priceVerifyState, shortOcc } from "../meta";
import { StatusBadge } from "./parts";

const TYPE_TONE: Record<string, "neutral" | "info" | "violet"> = { published: "neutral", conditional: "info", confirmed_quote: "violet" };

export async function PricingTab({ sp }: { sp: Record<string, string | undefined> }) {
  const f = { lender: sp.lender, status: sp.status, verify: sp.verify };
  const [all, lk] = await Promise.all([listPrices(f), loadLookups()]);
  const now = new Date();
  const rows = f.verify === "1" ? all.filter((p) => !priceVerifyState(p, now).ok) : all;
  const filtered = Boolean(f.lender || (f.status && f.status !== "current") || f.verify);

  return (
    <div>
      <form action={BASE} className="contents">
        <input type="hidden" name="tab" value="pricing" />
        <Toolbar>
          <Filter className="ml-1 hidden size-4 text-slate-400 sm:block" />
          <Select name="lender" defaultValue={f.lender ?? ""} aria-label="Lender" className="w-full sm:w-auto sm:min-w-36 sm:max-w-60">
            <option value="">All lenders</option>
            {lk.lenders.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
          <Select name="status" defaultValue={f.status || "current"} aria-label="Status" className="w-full sm:w-auto sm:min-w-36 sm:max-w-60">
            <option value="current">Draft + published</option>
            {STATUSES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            <option value="all">All versions</option>
          </Select>
          <label className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700">
            <input type="checkbox" name="verify" value="1" defaultChecked={f.verify === "1"} className={checkboxStyles} />
            Needs verification
          </label>
          <Button type="submit" variant="secondary">Apply</Button>
          {filtered && <LinkButton href={`${BASE}?tab=pricing`} variant="ghost"><X />Clear</LinkButton>}
          <span className="ml-auto px-1 text-xs text-slate-500 tabular-nums">{rows.length} record{rows.length === 1 ? "" : "s"}</span>
        </Toolbar>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={<BadgeDollarSign />}
          title={filtered ? "No price records match" : "No pricing yet"}
          description="Rates, fees and cashback per product, occupancy, repayment type and LVR band — each citing a rate sheet, aggregator data or written quote."
          action={<LinkButton href={`${BASE}/pricing/new`} variant="primary" size="sm"><Plus />New price record</LinkButton>}
        />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <tr>
                <TH>Product</TH>
                <TH className="hidden sm:table-cell">Segment</TH>
                <TH className="text-right">Rate</TH>
                <TH className="hidden lg:table-cell text-right">Fees</TH>
                <TH className="hidden lg:table-cell text-right">Cashback</TH>
                <TH className="hidden md:table-cell">Verification</TH>
                <TH className="hidden sm:table-cell">Status</TH>
              </tr>
            </THead>
            <TBody>
              {rows.map((p) => {
                const prod = lk.productById.get(p.productId);
                const v = priceVerifyState(p, now);
                return (
                  <TR key={p.id} className={cn("align-top", p.status === "superseded" || p.status === "withdrawn" ? "opacity-70" : "")}>
                    <TD className="align-top">
                      <Link href={`${BASE}/pricing/${p.id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">{prod?.name ?? `Product #${p.productId}`}</Link>
                      <div className="text-xs text-slate-500">{lk.lenderById.get(p.lenderId)?.name}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <Badge tone={TYPE_TONE[p.pricingType] ?? "neutral"} className="text-[11px]">{label(PRICING_TYPES, p.pricingType)}</Badge>
                        {p.caseId && <Badge tone="violet" className="text-[11px]">Case #{p.caseId}</Badge>}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 sm:hidden">{shortOcc(p.occupancy)} · {p.repaymentType} · LVR {p.lvrMin}–{p.lvrMax}%</div>
                      <div className="mt-1.5 flex flex-wrap gap-1 sm:hidden">
                        <StatusBadge status={p.status} className="text-[11px]" />
                        {!v.ok && <Badge tone="warning" className="text-[11px]">{v.label}</Badge>}
                      </div>
                    </TD>
                    <TD className="hidden align-top text-xs sm:table-cell">
                      <div className="text-slate-700">{shortOcc(p.occupancy)} · {p.repaymentType}</div>
                      <div className="tabular-nums text-slate-500">LVR {p.lvrMin}–{p.lvrMax}%</div>
                    </TD>
                    <TD className="align-top text-right tabular-nums">
                      <div className="text-sm font-semibold text-slate-900">{p.ratePct.toFixed(2)}%</div>
                      {p.comparisonPct !== null && <div className="text-xs text-slate-500">{p.comparisonPct.toFixed(2)}% comp.</div>}
                    </TD>
                    <TD className="hidden align-top text-right text-xs tabular-nums text-slate-600 lg:table-cell">
                      <div>{money(p.upfrontFees)} upfront</div>
                      {p.annualFee > 0 && <div>{money(p.annualFee)}/yr</div>}
                      {p.monthlyFee > 0 && <div>{money(p.monthlyFee)}/mth</div>}
                    </TD>
                    <TD className="hidden align-top text-right text-xs tabular-nums lg:table-cell">
                      {p.cashback > 0 ? (
                        <>
                          <div className="font-medium text-slate-800">{money(p.cashback)}</div>
                          {p.cashbackExpiry && <div className="text-slate-500">until {fmtDate(p.cashbackExpiry)}</div>}
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TD>
                    <TD className="hidden align-top md:table-cell">
                      {v.ok ? (
                        <Badge tone="success"><CircleCheck className="size-3" />{v.label}</Badge>
                      ) : (
                        <Badge tone="warning"><TriangleAlert className="size-3" />{v.label}</Badge>
                      )}
                      {!v.ok && <div className="mt-1 text-xs text-slate-500">{v.reasons.join(", ")}</div>}
                    </TD>
                    <TD className="hidden align-top sm:table-cell">
                      <StatusBadge status={p.status} />
                      <div className="mt-1 font-mono text-[11px] text-slate-400">v{p.version}</div>
                      <div className="mt-1 md:hidden">{!v.ok && <Badge tone="warning" className="text-[11px]">{v.label}</Badge>}</div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </TableWrap>
      )}
    </div>
  );
}
