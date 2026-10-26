import { NT } from "@/modules/calc/rules";
import { TextLink } from "../../../components/ui/Button";
import { PATHS } from "../../../config";
import { formatAud, formatDate } from "../../../format";
import { DEPOSIT_SCHEME, HELP_TO_BUY, STATE_ORDER, duty, fhogFor } from "../../shared/rules";
import type { FhbStateContent } from "../types";

const g = fhogFor("NT")!;
const fresh = NT.grants.find((x) => x.id === "freshstart");
const hlpe = NT.otherConcessions.find((c) => c.id === "hlpe");
const quad = NT.generalScale.brackets.find((b) => b.kind === "quadratic");
const whole = NT.generalScale.brackets.find((b) => b.kind === "whole");
const residence = g.eligibility.find((l) => /12 months/i.test(l));
const caps = DEPOSIT_SCHEME.priceCaps.NT;
const LARGEST = STATE_ORDER.every((st) => (fhogFor(st)?.amount ?? 0) <= g.amount);
const LEDE = `The Northern Territory has no first home duty concession, but its grant for new homes is ${LARGEST ? "the largest of any state or territory" : "substantial"}. Whether you buy new or established changes the numbers more than anything else.`;
const estGrantNote = g.eligibility.find((l) => /established/i.test(l));
const NEW_PRICE = 600_000;
const newDuty = duty({ state: "NT", price: NEW_PRICE, propertyType: "new", firstHomeBuyer: true, foreignPurchaser: false, ownerOccupier: true });
const lastDay = (iso?: string) => (iso ? formatDate(new Date(new Date(iso).getTime() - 86_400_000)) : "");

const content: FhbStateContent = {
  state: "NT",
  metaTitle: "First home buyer NT: HomeGrown grant, duty and caps",
  metaDescription:
    "Northern Territory first home buyers: the $50,000 HomeGrown Territory Grant for new homes, no first home duty concession, the house-and-land package exemption, scheme caps and worked examples.",
  h1: (
    <>
      First home buyers in the <em>Northern Territory</em>
    </>
  ),
  headline: "First home buyers in the Northern Territory: grants, duty and schemes",
  lede: LEDE,
  publishedAt: "2026-10-26",
  updatedAt: "2026-10-26",
  intro: (
    <>
      <p>
        First home buyers in the NT pay normal stamp duty: there is no general first home duty concession for contracts signed now. The help comes as a grant. The{" "}
        <strong>{g.name}</strong> is {formatAud(g.amount)} for a new home, with no price cap, for contracts or building starts before{" "}
        {g.effectiveTo ? lastDay(g.effectiveTo) : "its end date"} (inclusive).
      </p>
      <p>
        NT duty is calculated differently from the states. Up to {quad?.upTo ? formatAud(quad.upTo) : "a threshold"} a formula applies; above it, duty is{" "}
        {whole?.kind === "whole" ? `${whole.ratePct}%` : "a flat percentage"} of the whole value, with higher rates for much more expensive properties.
      </p>
      {fresh && (
        <p>
          The NT also has a {formatAud(fresh.amount)} {fresh.name} for buyers who are <em>not</em> first home buyers. The two can&rsquo;t be combined.
        </p>
      )}
    </>
  ),
  examples: [
    { label: "Unit", price: 450_000, propertyType: "established" },
    { label: "House", price: 580_000, propertyType: "established" },
    { label: "New house", price: NEW_PRICE, propertyType: "new" },
  ],
  examplesAfter: (
    <>
      <p>
        No home in the table gets a duty concession. The established house is above {quad?.upTo ? formatAud(quad.upTo) : "the formula threshold"}, so its duty is a flat
        percentage of the full price. The new house pays {formatAud(newDuty.transferDuty)} in duty
        {g.amount > newDuty.totalGovtCosts
          ? `, but the ${formatAud(g.amount)} grant more than covers it, which makes new homes the stronger first-home option in the NT while the grant lasts.`
          : `, and the ${formatAud(g.amount)} grant offsets much of it.`}
      </p>
      <p>
        The 5% Deposit Scheme cap is {formatAud(caps.capital)} in Darwin and {formatAud(caps.regional)} in the rest of the NT. Help to Buy has a single NT cap of{" "}
        {formatAud(HELP_TO_BUY.priceCaps.NT.capital)}.
      </p>
    </>
  ),
  schemesIntro: (
    <p>
      The NT is the one place where Help to Buy&rsquo;s cap ({formatAud(HELP_TO_BUY.priceCaps.NT.capital)}) is below the 5% Deposit Scheme&rsquo;s Darwin cap (
      {formatAud(caps.capital)}), and it doesn&rsquo;t split Darwin from the rest of the territory. Outside Darwin both schemes cap at the same figure.
    </p>
  ),
  extra: {
    id: "house-and-land",
    title: "The house-and-land package exemption",
    body: (
      <>
        {hlpe && <p>{hlpe.summary}</p>}
        <p>
          The exemption isn&rsquo;t limited to first home buyers, and our calculator doesn&rsquo;t apply it. If you are looking at a house-and-land package, ask your conveyancer
          early whether the contract structure qualifies, because it can remove duty as well as the grant applying.
        </p>
      </>
    ),
  },
  apply: [
    { title: "Decide new or established", body: "The grant is only for a new home, never lived in or sold as a residence. An established home gets no first home help in the NT." },
    {
      title: "Check the grant dates",
      body: `The ${formatAud(g.amount)} grant needs the contract or building start before ${lastDay(g.effectiveTo)}, inclusive. There is a later deadline to apply.`,
    },
    { title: "Apply for the grant", body: "The grant is usually lodged through your lender as an approved agent, or directly with the Territory Revenue Office." },
    { title: "Move in and stay", body: residence ?? "Live in the home for the period the grant requires." },
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
    "Contract of sale, or the building contract for a new build",
    "For a house-and-land package: both contracts and the developer and builder details",
  ],
  mistakes: [
    { title: "Expecting a duty concession", body: "The NT's general first home duty concessions have ended. Budget for full duty on any home." },
    { title: "Counting on an established-home grant", body: estGrantNote ?? "There is no NT grant for established homes for contracts signed now." },
    { title: "Missing the grant deadline", body: "Both the contract or building start date and the application date matter for the HomeGrown grant." },
    { title: "Applying for the wrong grant", body: fresh ? `The ${fresh.name} is for buyers who are not first home buyers. First home buyers apply for the ${g.name}.` : "Check which NT grant applies to you." },
  ],
  faqs: [
    {
      question: "Do first home buyers pay stamp duty in the NT?",
      answer: "Yes. There is no general first home duty concession for contracts signed now. A house-and-land package exemption exists but isn't specific to first home buyers.",
    },
    {
      question: "How much is the NT HomeGrown Territory Grant?",
      answer: `${formatAud(g.amount)} for first home buyers buying or building a new home, with no price cap, for contracts or building starts before ${lastDay(g.effectiveTo)} inclusive.`,
    },
    {
      question: "Is there a grant for established homes in the NT?",
      answer: `Not for contracts signed now. ${estGrantNote ?? ""}`.trim(),
    },
    {
      question: "Do foreign buyers pay extra duty in the NT?",
      answer: "No. The NT has no foreign purchaser surcharge on stamp duty, though FIRB approval and the established-home ban still apply to foreign persons.",
    },
    {
      question: "I owned a home before. Is there anything for me in the NT?",
      answer: fresh
        ? `Possibly. The ${formatAud(fresh.amount)} ${fresh.name} is for buyers who are not first home buyers, buying or building a new home. It can't be combined with the ${g.name}.`
        : "The NT's grants for existing owners change over time; check the Territory Revenue Office.",
    },
    {
      question: "Can I use the 5% Deposit Scheme in the NT?",
      answer: `Yes, if you are eligible. The cap is ${formatAud(caps.capital)} in Darwin and ${formatAud(caps.regional)} elsewhere in the NT.`,
    },
  ],
  calcPrice: 500_000,
};

export default content;
