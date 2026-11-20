// Follow-up task planning (pure). service.ts syncs the plan into ScnTask + CaseReminder without
// duplicating open reminders and without reopening completed ones.
import { applicantIds, bool, income, labelOf, num, str, type Facts } from "./facts";
import type { ScenarioCalc } from "./calc";
import type { EngineResult } from "./engine";

export type TaskPlan = { key: string; category: string; title: string; detail: string; dueAt: Date; priority: "Low" | "Normal" | "High" };

const DAY = 86400_000;
const addBusinessDays = (d: Date, n: number) => {
  const x = new Date(d);
  let left = n;
  while (left > 0) {
    x.setTime(x.getTime() + DAY);
    const wd = x.getUTCDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return x;
};
const dateMinus = (ymd: string, days: number) => {
  const t = Date.parse(`${ymd}T09:00:00+11:00`);
  return Number.isNaN(t) ? null : new Date(t - days * DAY);
};

export function planTasks(f: Facts, calc: ScenarioCalc, engine: EngineResult, now = new Date(), dueDays = 2): TaskPlan[] {
  const due = addBusinessDays(now, dueDays);
  const out: TaskPlan[] = [];
  const add = (t: Omit<TaskPlan, "dueAt" | "priority"> & { dueAt?: Date; priority?: TaskPlan["priority"] }) => {
    if (!out.some((x) => x.key === t.key)) out.push({ dueAt: due, priority: "Normal", ...t });
  };
  const live = engine.candidates.filter((c) => c.tier !== "outside");
  const minPayslips = 2; // lender-specific payslip counts surface via the employment rule results

  for (const a of applicantIds(f)) {
    const n = a.slice(1);
    const emp = str(f, `${a}.employment`);
    const res = str(f, `${a}.residency`);
    if (emp && ["payg_full_time", "payg_part_time", "casual", "contract"].includes(emp)) {
      const ps = num(f, `${a}.payslips`);
      if (ps === null || ps < minPayslips)
        add({ key: `payslips:${a}`, category: "documents", title: `Collect recent payslips — Applicant ${n}`, detail: `${ps ?? "Unknown number of"} payslip(s) held. Do not assume income that is not evidenced.` });
    }
    if (emp && (["casual", "contract"].includes(emp) || bool(f, `${a}.probation`) || ["parental_returned", "parental_on", "other_leave"].includes(str(f, `${a}.leave`) ?? "")))
      add({ key: `emp_letter:${a}`, category: "documents", title: `Employment letter — Applicant ${n}`, detail: "Confirm role, start date, hours, probation / return-from-leave date and base income." });
    if (emp && ["self_employed", "director"].includes(emp))
      add({ key: `fin_docs:${a}`, category: "documents", title: `Tax returns / financials — Applicant ${n}`, detail: "Two years' individual and company returns + notices of assessment (or lender alt-doc requirements)." });
    if (res === "temporary_visa" && (!str(f, `${a}.visaSubclass`) || !str(f, `${a}.visaExpiry`) || !f[`${a}.visaSubclass`]?.ok))
      add({ key: `visa:${a}`, category: "documents", title: `Visa evidence (grant notice / VEVO) — Applicant ${n}`, detail: "Need subclass and expiry, verified against the grant notice or VEVO.", priority: "High" });
    for (const comp of ["overtime", "penalties", "commission", "bonus", "allowances"]) {
      const inc = income(f, `${a}.inc.${comp}`);
      if (inc && inc.amount > 0 && inc.months === null)
        add({ key: `inc_hist:${a}:${comp}`, category: "documents", title: `Evidence of ${comp} history — Applicant ${n}`, detail: "Year-to-date payslips / payment summaries covering the lender's required period." });
    }
  }

  if (calc.purpose !== "refinance" && (num(f, "con.savings") ?? 0) > 0 && (num(f, "con.savingsHeldMonths") === null || !f["con.savings"]?.ok))
    add({ key: "savings_history", category: "documents", title: "Savings history statements", detail: "Statements showing genuine savings held over the lender's required period (typically 3 months)." });
  if ((num(f, "con.gift") ?? 0) > 0)
    add({ key: "gift_letter", category: "documents", title: "Gift letter / statutory declaration", detail: "Non-repayable gift letter plus evidence of the donor's funds and the transfer." });

  for (const k of calc.missing.slice(0, 12))
    add({ key: `fact:${k}`, category: "facts", title: `Confirm: ${labelOf(k)}`, detail: "Needed for the funding / LVR calculation." });

  for (const c of live) {
    if (c.serviceability.state !== "current")
      add({ key: `calc:${c.lenderId}`, category: "calculator", title: `${c.serviceability.state === "obsolete" ? "Rerun" : "Run"} ${c.lenderName} serviceability calculator`, detail: c.serviceability.state === "obsolete" ? "Income, commitments or loan terms changed since the last result." : "Record the result (calculator name, inputs, date, max borrowing) in the Scenario page." });
    for (const m of c.missingEvidence) add({ key: `policy:${c.lenderId}:${m.slice(0, 60)}`, category: "policy", title: `Confirm policy with ${c.lenderName} BDM`, detail: m });
    for (const s of c.stale) add({ key: `stale:${s.split(" ")[0]}`, category: "policy", title: `Re-verify ${c.lenderName} policy rule ${s.split(" ")[0]}`, detail: s });
    for (const x of c.conflicts) add({ key: `conflict:${c.lenderId}:${x.slice(0, 40)}`, category: "policy", title: `Resolve conflicting ${c.lenderName} policy`, detail: x, priority: "High" });
    for (const x of c.confirmations) add({ key: `confirm:${c.lenderId}:${x.slice(0, 60)}`, category: "policy", title: `Written confirmation from ${c.lenderName}`, detail: x });
    if (c.pricing.state === "verify") add({ key: `price:${c.pricing.recordKey ?? c.productId}`, category: "pricing", title: `Verify pricing — ${c.lenderName} ${c.productName}`, detail: c.pricing.reasons.join("; ") });
    if (c.tier === "conditional" && c.conditions.length)
      add({ key: `cond:${c.lenderId}`, category: "lender_condition", title: `Check lender conditions — ${c.lenderName}`, detail: c.conditions.slice(0, 4).join("; "), priority: "Low" });
  }

  const dated: [string, string, number][] = [
    ["prop.financeDate", "Finance clause date approaching", 5],
    ["prop.exchangeDate", "Exchange date approaching", 3],
    ["prop.settlementDate", "Settlement date approaching", 7],
  ];
  for (const [k, label, before] of dated) {
    const d = str(f, k);
    const at = d ? dateMinus(d, before) : null;
    if (d && at && at.getTime() > now.getTime() - DAY) add({ key: `date:${k}:${d}`, category: "dates", title: `${label} (${d})`, detail: `${labelOf(k)} is ${d}.`, dueAt: at, priority: "High" });
  }
  return out;
}
