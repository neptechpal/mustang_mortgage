"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, TriangleAlert } from "lucide-react";
import { calcStampDuty } from "@/modules/calc/stampDuty";
import { isStale } from "@/modules/calc/freshness";
import { RULES } from "@/modules/calc/rules";
import { AU_STATES, type AuState, type OffThePlanStage, type PropertyType, type StampDutyResult } from "@/modules/calc/types";
import { formatDate } from "../format";
import { Assumptions, CalcShell, Check, Empty, Figure, Group, MoneyField, Notes, Rows, Segmented, SelectField, TalkCta, audAuto, aud, n0 } from "./parts";

export type Residency = "citizen-pr" | "foreign" | "pr-offshore";

export const STATE_NAMES: Record<AuState, string> = {
  NSW: "New South Wales",
  VIC: "Victoria",
  QLD: "Queensland",
  WA: "Western Australia",
  SA: "South Australia",
  ACT: "Australian Capital Territory",
  TAS: "Tasmania",
  NT: "Northern Territory",
};

const TYPE_OPTS: { value: PropertyType; label: string }[] = [
  { value: "established", label: "Established" },
  { value: "new", label: "New home" },
  { value: "off-the-plan", label: "Off the plan" },
  { value: "vacant-land", label: "Vacant land" },
];

export type StampDutyCalculatorProps = {
  /** State preset (e.g. "NSW"; lowercase accepted). */
  defaultState: AuState | Lowercase<AuState>;
  defaultPrice?: number;
  /** Tighter padding and fewer extras, for embedding inside guides, visa and suburb pages. */
  compact?: boolean;
  defaultPropertyType?: PropertyType;
  defaultFirstHomeBuyer?: boolean;
  defaultOwnerOccupier?: boolean;
  /** "foreign" = temporary visa holder or other foreign person; "pr-offshore" (NSW only) = PR outside the 200-day rule. */
  defaultResidency?: Residency;
  /** Hide the state picker (the page is about one state). Default false. */
  lockState?: boolean;
  /** Heading inside the calculator. Default "Stamp duty calculator". Pass null for none. */
  title?: React.ReactNode | null;
  className?: string;
};

function toState(s: string): AuState {
  const up = s.toUpperCase() as AuState;
  return AU_STATES.includes(up) ? up : "NSW";
}

/**
 * Transfer (stamp) duty + government fees + grants for every state, from the verified rules engine
 * (`calcStampDuty`, src/modules/calc). Shows each rule's source and the date it was checked.
 */
export function StampDutyCalculator({
  defaultState,
  defaultPrice,
  compact,
  defaultPropertyType = "established",
  defaultFirstHomeBuyer = false,
  defaultOwnerOccupier = true,
  defaultResidency = "citizen-pr",
  lockState,
  title,
  className,
}: StampDutyCalculatorProps) {
  const [state, setState] = useState<AuState>(toState(defaultState));
  const [price, setPrice] = useState<number | null>(defaultPrice ?? null);
  const [type, setType] = useState<PropertyType>(defaultPropertyType);
  const [fhb, setFhb] = useState(defaultFirstHomeBuyer);
  const [oo, setOo] = useState(defaultOwnerOccupier);
  const [res, setRes] = useState<Residency>(defaultResidency);
  const [withMortgage, setWithMortgage] = useState(true);
  const [build, setBuild] = useState<number | null>(null);
  const [regional, setRegional] = useState(false);
  const [stage, setStage] = useState<OffThePlanStage>("pre-construction");

  const R = RULES[state];
  const residency: Residency = state !== "NSW" && res === "pr-offshore" ? "citizen-pr" : res;
  const showRegional = state === "WA" && fhb && oo && type !== "established" && !!R.grants.some((g) => g.regionalCap);
  const showStage = !!R.totalDutyConcessions?.length && type === "off-the-plan";
  const showBuild = type === "vacant-land" && fhb && oo && R.grants.some((g) => g.appliesTo.includes("vacant-land"));
  const fhbLabel = state === "ACT" ? "First home buyer, or no property owned in the last 5 years" : "First home buyer";

  const result: StampDutyResult | null = useMemo(() => {
    if (!price || price <= 0) return null;
    return calcStampDuty({
      state,
      price,
      propertyType: type,
      firstHomeBuyer: fhb,
      ownerOccupier: oo,
      foreignPurchaser: residency !== "citizen-pr",
      citizenOrPR: residency !== "foreign",
      withMortgage,
      buildContractPrice: showBuild ? n0(build) || undefined : undefined,
      regional: showRegional ? regional : undefined,
      offThePlanStage: showStage ? stage : undefined,
    });
  }, [state, price, type, fhb, oo, residency, withMortgage, build, regional, stage, showBuild, showRegional, showStage]);

  const residencyOpts: { value: Residency; label: string; sub?: string }[] = [
    { value: "citizen-pr", label: "Australian citizen or permanent resident" },
    { value: "foreign", label: "Temporary visa holder or other foreign person" },
    ...(state === "NSW" ? [{ value: "pr-offshore" as const, label: "Permanent resident living overseas", sub: "Fewer than 200 days in Australia in the last 12 months" }] : []),
  ];

  const form = (
    <>
      <div className="mw-calc__grid mw-calc__grid--2">
        {!lockState && (
          <SelectField<AuState>
            label="State or territory"
            value={state}
            onChange={setState}
            options={AU_STATES.map((s) => ({ value: s, label: STATE_NAMES[s] }))}
          />
        )}
        <MoneyField label="Purchase price" value={price} onChange={setPrice} placeholder="e.g. 750,000" full={!!lockState} hint="Or the market value, if that is higher." />
      </div>

      <Segmented<PropertyType> legend="What are you buying?" value={type} onChange={setType} options={TYPE_OPTS} min={128} />

      <div className="mw-calc__grid mw-calc__grid--2">
        <Segmented<"yes" | "no">
          legend="Will you live in it?"
          value={oo ? "yes" : "no"}
          onChange={(v) => setOo(v === "yes")}
          options={[
            { value: "yes", label: "Yes, my home" },
            { value: "no", label: "No, investment" },
          ]}
          min={110}
        />
        <Segmented<"yes" | "no">
          legend={fhbLabel}
          value={fhb ? "yes" : "no"}
          onChange={(v) => setFhb(v === "yes")}
          options={[
            { value: "yes", label: "Yes" },
            { value: "no", label: "No" },
          ]}
          min={90}
        />
      </div>

      <Segmented<Residency>
        legend="Buyers' residency"
        value={residency}
        onChange={setRes}
        options={residencyOpts}
        stack
        hint={
          R.foreignSurcharge.ratePct > 0
            ? `Foreign persons pay ${R.foreignSurcharge.name.charAt(0).toLowerCase() + R.foreignSurcharge.name.slice(1)} of ${R.foreignSurcharge.ratePct}% on top of transfer duty. This assumes every buyer is in the same group.`
            : `${R.name} has no foreign purchaser surcharge on duty. This assumes every buyer is in the same group.`
        }
      />

      {(showStage || showRegional || showBuild || !compact) && (
        <Group legend="Details">
          {showBuild && <MoneyField label="Building contract price" value={build} onChange={setBuild} optional hint="For the First Home Owner Grant price cap (land plus build)." />}
          {showStage && (
            <Segmented<OffThePlanStage>
              legend="Construction stage when you sign"
              value={stage}
              onChange={setStage}
              options={[
                { value: "pre-construction", label: "Not yet started" },
                { value: "under-construction", label: "Under construction" },
              ]}
            />
          )}
          {showRegional && <Check checked={regional} onChange={setRegional} label="The property is north of the 26th parallel" hint="Higher First Home Owner Grant cap in northern WA." />}
          {!compact && <Check checked={withMortgage} onChange={setWithMortgage} label="I'm buying with a home loan" hint="Adds the mortgage registration fee." />}
        </Group>
      )}
    </>
  );

  const revenueOffice = R.revenueOffice;
  const fhogName = R.grants.find((g) => g.id.startsWith("fhog"))?.name ?? "First Home Owner Grant";
  const out = result ? <Result r={result} revenueOffice={revenueOffice} revenueUrl={R.revenueOfficeUrl} compact={compact} fhogName={fhogName} /> : (
    <>
      <Figure label="Estimated stamp duty" value="$0" muted sub={`Enter a purchase price to estimate ${R.name} transfer duty and government fees.`} />
      <Empty>Duty, concessions, any foreign purchaser surcharge and the land titles fees appear here.</Empty>
      <TalkCta />
    </>
  );

  return (
    <CalcShell
      className={className}
      compact={compact}
      label={`${R.name} stamp duty calculator`}
      title={title === null ? undefined : (title ?? (lockState ? `${R.name} stamp duty calculator` : "Stamp duty calculator"))}
      form={form}
      result={out}
    />
  );
}

function Result({ r, revenueOffice, revenueUrl, compact, fhogName }: { r: StampDutyResult; revenueOffice: string; revenueUrl: string; compact?: boolean; fhogName: string }) {
  const duty = r.transferDuty + r.surcharge;
  const stale = isStale(r.rulesVerifiedAt);
  const sub =
    r.concession > 0 && r.transferDuty === 0
      ? `No transfer duty under the ${r.concessionName}, if you meet its conditions.`
      : r.concession > 0
        ? `Includes ${aud(r.concession)} off under the ${r.concessionName}.`
        : r.surcharge > 0
          ? `Includes ${audAuto(r.surcharge)} foreign purchaser surcharge.`
          : undefined;
  const notes = r.notes.filter((x) => !x.startsWith("Estimate only") && !x.startsWith("Full exemption under") && !x.startsWith("You may be eligible for the $"));
  return (
    <>
      <Figure label="Estimated stamp duty" value={audAuto(duty)} sub={sub} />
      <hr className="mw-calc__rule" />
      <Rows
        rows={[
          ...r.breakdown.map((b) => {
            const m = /^Transfer duty \((.+)\)$/.exec(b.label);
            return {
              label: m ? "Transfer duty" : b.label,
              detail: m ? m[1] : undefined,
              value: (b.amount < 0 ? "−" : "") + audAuto(Math.abs(b.amount)),
              tone: b.amount < 0 ? ("neg" as const) : undefined,
            };
          }),
          { label: "Total government costs", value: audAuto(r.totalGovtCosts), tone: "total" as const },
        ]}
      />
      {(r.fhogEligible || r.otherGrants.length > 0) && (
        <div className="mw-calc__grant">
          <BadgeCheck size={20} strokeWidth={1.5} aria-hidden="true" />
          <div>
            {r.fhogEligible && (
              <p>
                You may be eligible for the {fhogName} of {aud(r.fhogAmount)}. It is paid separately and is not taken off the duty.
              </p>
            )}
            {r.otherGrants.map((g) => (
              <p key={g.name}>
                You may be eligible for the {g.name} ({aud(g.amount)}).
              </p>
            ))}
          </div>
        </div>
      )}
      {(stale || r.hasUnverified) && (
        <div className="mw-calc__warn" role="note">
          <TriangleAlert size={18} strokeWidth={1.5} aria-hidden="true" />
          <p>
            {stale ? `These rules were last checked on ${formatDate(r.rulesVerifiedAt)}, more than 90 days ago.` : "Part of this estimate uses a rule we could not confirm on an official source."} Check the figure with{" "}
            <a href={revenueUrl} target="_blank" rel="noopener noreferrer">
              {revenueOffice}
            </a>
            .
          </p>
        </div>
      )}
      {notes.length > 0 && (compact ? (
        <details className="mw-subdetails">
          <summary>Notes for this purchase ({notes.length})</summary>
          <Notes items={notes} />
        </details>
      ) : (
        <Notes items={notes} />
      ))}
      <TalkCta />
      <div className="mw-calc__sources">
        <p>
          Checked against {revenueOffice} on <time dateTime={r.rulesVerifiedAt}>{formatDate(r.rulesVerifiedAt)}</time> ({r.rulesVersion} rules)
        </p>
        <ul>
          {groupSources(r.sources).map((g) => (
            <li key={g.label}>
              {g.label.replace(`${revenueOffice}: `, "")}:{" "}
              {g.links.map((l, i) => (
                <span key={l.url}>
                  {i > 0 && ", "}
                  <a href={l.url} target="_blank" rel="noopener noreferrer">
                    {l.kind}
                  </a>
                </span>
              ))}{" "}
              · checked <time dateTime={g.verifiedAt}>{formatDate(g.verifiedAt)}</time>
            </li>
          ))}
        </ul>
      </div>
      <Assumptions
        items={[
          "The price you enter is treated as the dutiable value (the higher of the price and the market value).",
          "Every buyer is in the same residency group and buys the whole property. Mixed purchases (for example one foreign co-buyer) are worked out differently; use the revenue office calculator.",
          "Concessions and grants assume you meet all their conditions, including living in the home for the required time.",
          "Government fees are the land titles office registration fees for one transfer and one mortgage. Conveyancing, inspections and lender fees are not included.",
          "Your conveyancer or solicitor confirms the duty payable before settlement.",
        ]}
      />
    </>
  );
}

/** One line per rule (fact group), with each official link named by what it is. */
function groupSources(sources: StampDutyResult["sources"]) {
  const kind = (u: string) => (/calculators?\/|\/calculator\b|-calculator|estimator|calculatorservice/i.test(u) ? "official calculator" : /legislation\.|\/act-|Act\/|\/di\/|statutes/i.test(u) ? "legislation" : /\.pdf($|\?)/i.test(u) ? "PDF" : "page");
  const map = new Map<string, { label: string; verifiedAt: string; links: { url: string; kind: string }[] }>();
  for (const s of sources) {
    const g = map.get(s.label) ?? { label: s.label, verifiedAt: s.verifiedAt, links: [] };
    if (s.verifiedAt < g.verifiedAt) g.verifiedAt = s.verifiedAt;
    g.links.push({ url: s.url, kind: kind(s.url) });
    map.set(s.label, g);
  }
  // Number repeated kinds ("page 1", "page 2").
  for (const g of map.values()) {
    const counts = new Map<string, number>();
    for (const l of g.links) counts.set(l.kind, (counts.get(l.kind) ?? 0) + 1);
    const seen = new Map<string, number>();
    for (const l of g.links) {
      if ((counts.get(l.kind) ?? 0) > 1) {
        const n = (seen.get(l.kind) ?? 0) + 1;
        seen.set(l.kind, n);
        l.kind = `${l.kind} ${n}`;
      }
    }
  }
  return [...map.values()];
}
