import { WA } from "@/modules/calc/rules";
import { TextLink } from "../../../components/ui/Button";
import { PATHS } from "../../../config";
import { formatAud, formatDate } from "../../../format";
import { DEPOSIT_SCHEME, fhbThresholds, fhogFor } from "../../shared/rules";
import type { FhbStateContent } from "../types";

const home = fhbThresholds("WA", "established")!;
const land = fhbThresholds("WA", "vacant-land")!;
const g = fhogFor("WA")!;
const fhor = WA.concessions.find((c) => c.id === "fhor-home")!;
const homeRate = fhor.bands.find((b) => b.kind === "marginal");
const otp = WA.totalDutyConcessions?.find((c) => c.id === "otp");
const residence = fhor.eligibility.find((l) => /6 continuous months/i.test(l));
const caps = DEPOSIT_SCHEME.priceCaps.WA;
const HOUSE = 700_000;

const content: FhbStateContent = {
  state: "WA",
  metaTitle: "First home buyer WA: first home owner rate, grant and caps",
  metaDescription:
    "Western Australian first home buyers: the first home owner rate of duty from 7 May 2026, the $10,000 new home grant (higher cap north of the 26th parallel), the off-the-plan concession and worked examples.",
  h1: (
    <>
      First home buyers in <em>Western Australia</em>
    </>
  ),
  headline: "First home buyers in Western Australia: concessions, grants and schemes",
  lede: "WA changed its first home buyer rules on 7 May 2026: one set of thresholds for the whole state, a higher grant cap, and an off-the-plan concession that any buyer can use. Here is how they combine.",
  publishedAt: "2026-10-26",
  updatedAt: "2026-10-26",
  intro: (
    <>
      <p>
        WA doesn&rsquo;t exempt first home buyers in the same way as NSW. Instead it charges a <strong>first home owner rate of duty</strong>: nothing on a home up to{" "}
        {formatAud(home.exemptTo ?? 0)}, then{" "}
        {homeRate && homeRate.kind === "marginal" ? `${formatAud(homeRate.ratePct, { cents: true })} for every $100 above that` : "a concessional rate above that"}, up to{" "}
        {formatAud(home.reducedTo ?? 0)}. Above that, the general rate applies. For vacant land the figures are no duty up to {formatAud(land.exemptTo ?? 0)} and a concessional
        rate to {formatAud(land.reducedTo ?? 0)}.
      </p>
      <p>
        Since {formatDate(fhor.effectiveFrom)} the same thresholds apply across the state, metropolitan or regional, for new and established homes alike. There is no income or
        assets test.
      </p>
      <p>
        The first home owner rate follows the First Home Owner Grant&rsquo;s definition of a first home owner. Every buyer has to meet it, not just one: if one buyer has owned and
        lived in a home in Australia before, the rate doesn&rsquo;t apply to the purchase.
      </p>
    </>
  ),
  examples: [
    { label: "Unit", price: 560_000, propertyType: "established" },
    { label: "House", price: HOUSE, propertyType: "established" },
    { label: "Apartment", price: 750_000, propertyType: "off-the-plan" },
  ],
  examplesAfter: (
    <>
      <p>
        The unit is under {formatAud(home.exemptTo ?? 0)}, so no duty is payable. The house pays the first home owner rate on the amount above that threshold, which is still well
        below general duty. The off-the-plan apartment combines two concessions: the first home owner rate and the off-the-plan concession, which together remove the duty, and as a
        new home under {formatAud(g.priceCap ?? 0)} it also gets the {formatAud(g.amount)} grant.
      </p>
      <p>
        The 5% Deposit Scheme cap is {formatAud(caps.capital)} in Perth and {formatAud(caps.regional)} in the rest of WA, so in a regional town the {formatAud(HOUSE)} house in
        this table would be {HOUSE > caps.regional ? "over" : "within"} the cap.
      </p>
    </>
  ),
  schemesIntro: (
    <p>
      WA&rsquo;s duty thresholds are the same across the state, but the scheme caps are not: {formatAud(caps.capital)} in Perth and {formatAud(caps.regional)} elsewhere. A
      regional buyer can qualify for the first home owner rate on a home that is over the regional 5% Deposit Scheme cap.
    </p>
  ),
  extra: {
    id: "off-the-plan",
    title: "Off the plan, and north of the 26th parallel",
    body: (
      <>
        {otp && (
          <>
            <p>
              <strong>{otp.name}.</strong> {otp.eligibility[0]} {otp.eligibility[1]}
            </p>
            <p>
              Signed before construction starts, the concession is {otp.stages["pre-construction"].fullPct}% of the duty up to {formatAud(otp.fullUpTo)}, tapering to{" "}
              {otp.stages["pre-construction"].floorPct}% from {formatAud(otp.floorFrom)}. Signed once construction is under way, it starts at{" "}
              {otp.stages["under-construction"].fullPct}%. It is capped at {formatAud(otp.maxSaving)}. {otp.eligibility[2]}
            </p>
          </>
        )}
        <p>
          <strong>The grant cap is higher in the north.</strong> The {formatAud(g.amount)} First Home Owner Grant applies to new homes up to {formatAud(g.priceCap ?? 0)} south
          of the 26th parallel, which includes all of Perth, and up to {g.regionalCap?.priceCap ? formatAud(g.regionalCap.priceCap) : "a higher cap"} north of it.
        </p>
      </>
    ),
  },
  apply: [
    {
      title: "Check every buyer against the first home owner test",
      body: "All buyers must qualify, and at least one must be an Australian citizen or permanent resident. Check each buyer's ownership history before you sign.",
    },
    {
      title: "Know which concession applies",
      body: "Established, new and off-the-plan homes are treated differently. For off the plan, the construction stage at the contract date changes the concession.",
    },
    {
      title: "Duty assessment and your settlement agent",
      body: "In WA your settlement agent or lawyer usually handles the duty lodgement. Tell them you are claiming the first home owner rate so it goes on the assessment.",
    },
    {
      title: "Apply for the grant on a new home",
      body: `For a new home under the cap, the ${formatAud(g.amount)} grant is usually applied for through your lender, or directly with RevenueWA.`,
    },
    { title: "Move in", body: residence ?? "Live in the home for the period the concession requires." },
  ],
  applyAfter: (
    <p>
      For the general buying process, see <TextLink href={PATHS.homeLoansFirstHomeBuyers}>first home loans</TextLink>.
    </p>
  ),
  documents: [
    "Passport, and proof of citizenship or permanent residence",
    "Payslips and an employment letter, or tax returns if self-employed",
    "Bank statements showing savings and the deposit",
    "Contract of sale; for off the plan, the developer's details and construction status at the contract date",
    "Building contract, if you are building on vacant land",
  ],
  mistakes: [
    { title: "One buyer who has owned before", body: "The first home owner rate needs every buyer to qualify. A co-buyer who has owned and lived in a home before rules it out." },
    { title: "Missing the off-the-plan form", body: otp ? otp.eligibility[2] : "Off-the-plan concessions have their own application form and deadline." },
    { title: "Using the old thresholds", body: `The current thresholds apply to contracts from ${formatDate(fhor.effectiveFrom)}. Older guides show different numbers.` },
    { title: "Expecting the grant on an established home", body: "The WA grant is for new homes only." },
  ],
  faqs: [
    {
      question: "How much stamp duty does a first home buyer pay in WA?",
      answer: `None on a home up to ${formatAud(home.exemptTo ?? 0)}. Between ${formatAud(home.exemptTo ?? 0)} and ${formatAud(home.reducedTo ?? 0)} you pay the first home owner rate on the amount above the threshold. Above ${formatAud(home.reducedTo ?? 0)}, the general rate applies.`,
    },
    {
      question: "Are the thresholds different in regional WA?",
      answer: `Not for duty: since ${formatDate(fhor.effectiveFrom)} one set of first home owner rate thresholds applies statewide. The grant has a higher price cap north of the 26th parallel.`,
    },
    {
      question: "Can anyone use the WA off-the-plan concession?",
      answer: otp ? `${otp.eligibility[1]}` : "It is open to buyers without a first home test; check RevenueWA's conditions.",
    },
    {
      question: "Do temporary visa holders pay extra duty in WA?",
      answer: `Yes. Foreign transfer duty of ${WA.foreignSurcharge.ratePct}% applies to foreign persons, including temporary visa holders, on top of transfer duty, and FIRB approval is needed.`,
    },
    {
      question: "How much is the WA First Home Owner Grant?",
      answer: `${formatAud(g.amount)} for a new home up to ${formatAud(g.priceCap ?? 0)}, or ${g.regionalCap?.priceCap ? formatAud(g.regionalCap.priceCap) : "a higher cap"} north of the 26th parallel.`,
    },
  ],
  calcPrice: 650_000,
};

export default content;
