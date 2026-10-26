import { RULES } from "@/modules/calc/rules";
import type { AuState } from "@/modules/calc/types";
import type { StateResidencyRule } from "@/modules/seo-data/types";
import { formatAud, formatDate } from "../../format";
import { STATE_ORDER, fhbConcessionsFor, fhogFor } from "../shared/rules";
import { earliestDate, type SourceInput } from "../shared/sources";

/**
 * State-by-state duty and grant matrix for one residency class (research §C4.4 section 4).
 * Eligibility comes from seo-data/visas (StateResidencyRule, by residency class); rates and grant amounts come
 * from calc/rules. Any fact group marked verified:false, or whose note says to confirm before stating, shows
 * "Confirm" with a link to the official page instead of a value.
 */

export type CellTone = "yes" | "no" | "cond" | "confirm";
export type Cell = { label: string; tone: CellTone; href?: string };
export type MatrixRow = { state: AuState; name: string; surcharge: Cell; fhb: Cell; fhog: Cell; verifiedAt: string; sources: SourceInput[] };

const confirmCell = (href?: string): Cell => ({ label: "Confirm", tone: "confirm", href });

/** "Confirm … before stating" notes block the value from being stated. */
const mustConfirm = (note?: string) => !!note && /confirm\b/i.test(note) && /before stating|confirm with/i.test(note);

function surchargeCell(r: StateResidencyRule): Cell {
  const fs = RULES[r.state].foreignSurcharge;
  if (!r.verified) return confirmCell(r.sourceUrls[0]);
  const rate = `${fs.ratePct}%`;
  switch (r.surcharge) {
    case "yes":
      return { label: `Yes, ${rate}`, tone: "yes" };
    case "no":
      return { label: fs.ratePct === 0 ? "No surcharge" : "No", tone: "no" };
    case "conditional": {
      const n = r.surchargeNote;
      const test = /200/.test(n) ? "200-day test" : /6 consecutive months/.test(n) ? "6-month residence test" : "residence test";
      return { label: `${rate} unless the ${test} is met`, tone: "cond" };
    }
    default:
      return confirmCell(r.sourceUrls[0]);
  }
}

function fhbCell(r: StateResidencyRule): Cell {
  if (!r.verified || mustConfirm(r.fhbConcessionNote) || (r.note && /confirm hbcs/i.test(r.note))) return confirmCell(r.sourceUrls[0]);
  const hasScheme = fhbConcessionsFor(r.state).length > 0;
  const info = RULES[r.state].otherConcessions.find((c) => !c.modelled && !/ended/i.test(c.name) && (c.appliesTo ?? []).includes("new"));
  switch (r.fhbConcession) {
    case "yes":
      return hasScheme ? { label: "Yes", tone: "yes" } : { label: info ? `${info.name} only` : "Limited", tone: "cond" };
    case "no":
      return { label: hasScheme ? "No" : "No current scheme", tone: "no" };
    case "conditional":
      return { label: hasScheme ? "Only with a citizen or PR co-buyer" : `${info?.name ?? "Limited"}, with a citizen or PR co-buyer`, tone: "cond" };
    default:
      return confirmCell(r.sourceUrls[0]);
  }
}

function fhogCell(r: StateResidencyRule): Cell {
  if (!r.verified || mustConfirm(r.fhogNote)) return confirmCell(r.sourceUrls[r.sourceUrls.length - 1]);
  const g = fhogFor(r.state);
  if (!g) return { label: /closed/i.test(r.fhogNote) ? "No grant (closed)" : "No grant", tone: "no" };
  const amount = `${formatAud(g.amount)}, new homes`;
  switch (r.fhog) {
    case "yes":
      return { label: `Yes, ${amount}`, tone: "yes" };
    case "no":
      return { label: "No", tone: "no" };
    case "conditional":
      return { label: `Only with a citizen or PR co-applicant (${formatAud(g.amount)})`, tone: "cond" };
    default:
      return confirmCell(r.sourceUrls[0]);
  }
}

export function buildMatrix(rules: StateResidencyRule[]): MatrixRow[] {
  return STATE_ORDER.map((state) => {
    const r = rules.find((x) => x.state === state);
    const R = RULES[state];
    if (!r) {
      const c = confirmCell(R.revenueOfficeUrl);
      return { state, name: R.name, surcharge: c, fhb: c, fhog: c, verifiedAt: "", sources: [] };
    }
    const g = fhogFor(state);
    const sources: SourceInput[] = [
      ...r.sourceUrls.map((url) => ({ url, verifiedAt: r.verifiedAt })),
      // Rate and grant amount: the first official page for each (the rest are in the calculator's rules data).
      ...R.foreignSurcharge.sourceUrls.slice(0, 1).map((url) => ({ url, verifiedAt: R.foreignSurcharge.verifiedAt, title: `${R.foreignSurcharge.name} rate` })),
      ...(g ? g.sourceUrls.slice(0, 1).map((url) => ({ url, verifiedAt: g.verifiedAt, title: `${g.name} amount` })) : []),
    ];
    return {
      state,
      name: R.name,
      surcharge: surchargeCell(r),
      fhb: fhbCell(r),
      fhog: fhogCell(r),
      verifiedAt: earliestDate(r.verifiedAt, R.foreignSurcharge.verifiedAt, g?.verifiedAt),
      sources,
    };
  });
}

function CellView({ c }: { c: Cell }) {
  if (c.tone === "confirm")
    return c.href ? (
      <a href={c.href} target="_blank" rel="noopener noreferrer" className="mw-link">
        Confirm
      </a>
    ) : (
      <span>Confirm</span>
    );
  return <span style={c.tone === "no" ? { color: "var(--mw-text-3)" } : undefined}>{c.label}</span>;
}

/** The 8-state table. `caption` names the residency class it describes. */
const GRANTS_NEW_ONLY = STATE_ORDER.every((s) => !(fhogFor(s)?.appliesTo ?? []).includes("established"));

export function StateTable({ rows, caption, id }: { rows: MatrixRow[]; caption: React.ReactNode; id?: string }) {
  const checked = earliestDate(...rows.map((r) => r.verifiedAt));
  const anyConfirm = rows.some((r) => [r.surcharge, r.fhb, r.fhog].some((c) => c.tone === "confirm"));
  return (
    <figure style={{ margin: 0 }} id={id}>
      <div className="mw-table-wrap" role="region" aria-label={typeof caption === "string" ? caption : "Duty and grants by state"} tabIndex={0}>
        <table className="mw-table" style={{ minWidth: 640 }}>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">State</th>
              <th scope="col">Foreign buyer duty surcharge</th>
              <th scope="col">First home duty concession</th>
              <th scope="col">First Home Owner Grant</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.state}>
                <th scope="row">{r.state}</th>
                <td>
                  <CellView c={r.surcharge} />
                </td>
                <td>
                  <CellView c={r.fhb} />
                </td>
                <td>
                  <CellView c={r.fhog} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="mw-table-notes">
        Checked against each state and territory revenue office (or its legislation register) on {checked ? formatDate(checked) : "the dates in Sources"}. Rates are a
        percentage of the dutiable value, on top of normal transfer duty. Grants are paid separately from duty{GRANTS_NEW_ONLY ? " and, in every state that has one, only for new homes" : ""}.
        {anyConfirm && " “Confirm” means we could not verify this on the official site, so we link it instead of stating it."}
      </figcaption>
    </figure>
  );
}
