import { SA } from "@/modules/calc/rules";
import { TextLink } from "../../../components/ui/Button";
import { PATHS } from "../../../config";
import { formatAud, formatDate } from "../../../format";
import { DEPOSIT_SCHEME, STATE_ORDER, duty, fhogFor } from "../../shared/rules";
import type { FhbStateContent } from "../types";

const relief = SA.concessions.find((c) => c.id === "fhb-relief")!;
const g = fhogFor("SA")!;
const residence = relief.eligibility.find((l) => /6 continuous months/i.test(l));
const notFor = relief.eligibility.find((l) => /not available for established/i.test(l));
const caps = DEPOSIT_SCHEME.priceCaps.SA;
const LOWEST_REGIONAL = STATE_ORDER.filter((x) => x !== "ACT").every((x) => DEPOSIT_SCHEME.priceCaps[x].regional >= caps.regional);
const EST = 600_000;
const estDuty = duty({ state: "SA", price: EST, propertyType: "established", firstHomeBuyer: true, foreignPurchaser: false, ownerOccupier: true });

const content: FhbStateContent = {
  state: "SA",
  metaTitle: "First home buyer SA: stamp duty relief, $15k grant, caps",
  metaDescription:
    "South Australian first home buyers: full stamp duty relief on new homes, off-the-plan and land at any price, no relief on established homes, the $15,000 grant, scheme caps and worked examples.",
  h1: (
    <>
      First home buyers in <em>South Australia</em>
    </>
  ),
  headline: "First home buyers in South Australia: relief, grants and schemes",
  lede: "South Australia is generous to first home buyers who buy new and gives nothing on duty to those who buy established. That single choice can be worth more than the deposit itself.",
  publishedAt: "2026-10-26",
  updatedAt: "2026-10-26",
  intro: (
    <>
      <p>
        South Australia&rsquo;s first home buyer stamp duty relief removes duty entirely, at any price, on a new home, an off-the-plan apartment or vacant land you will build your
        first home on. It isn&rsquo;t means tested and has no value cap. The {formatAud(g.amount)} First Home Owner Grant applies to new homes, also without a price cap.
      </p>
      <p>
        The other side is just as important. {notFor ?? "Established homes get no relief."} A first home buyer paying {formatAud(EST)} for an established home pays the same duty
        as anyone else: {formatAud(estDuty.transferDuty)} at that price.
      </p>
      <p>
        South Australia&rsquo;s transfer registration fee also rises steeply with the price, so government costs on an established home are a large part of the cash you need at
        settlement.
      </p>
    </>
  ),
  examples: [
    { label: "Unit", price: EST, propertyType: "established" },
    { label: "House", price: 650_000, propertyType: "new" },
    { label: "Apartment", price: 900_000, propertyType: "off-the-plan" },
  ],
  examplesAfter: (
    <>
      <p>
        The established unit pays full duty plus registration fees. The new house and the off-the-plan apartment pay no duty at all, whatever the price, and both qualify for the{" "}
        {formatAud(g.amount)} grant. The registration fees remain, and they grow with the price.
      </p>
      <p>
        For the 5% Deposit Scheme the cap is {formatAud(caps.capital)} in Adelaide and {formatAud(caps.regional)} in the rest of South Australia.
      </p>
    </>
  ),
  schemesIntro: (
    <p>
      South Australia&rsquo;s regional cap for the 5% Deposit Scheme is {formatAud(caps.regional)}
      {LOWEST_REGIONAL ? ", the lowest regional cap of any state" : ""}. Because new homes get full duty relief at any price, an Adelaide buyer of a new home can combine no
      duty, the grant and a 5% deposit up to the {formatAud(caps.capital)} cap.
    </p>
  ),
  extra: {
    id: "new-or-established",
    title: "New or established: what counts in South Australia",
    body: (
      <>
        <ul>
          {relief.eligibility.slice(0, 2).map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p>
          The relief covers a new home, including a substantially renovated one, bought from a GST-registered builder or developer. If someone has already lived in a recently
          built home, ask your conveyancer whether it still counts before you sign. House-and-land packages count, because the relief covers vacant land you will build your first
          home on.
        </p>
        <p>
          Seniors have their own downsizing relief in South Australia; it doesn&rsquo;t apply to first home buyers.
        </p>
      </>
    ),
  },
  apply: [
    {
      title: "Confirm the property qualifies",
      body: "Relief depends on the property being new, off the plan or vacant land for your first home. Get this in writing from the developer or builder.",
    },
    {
      title: "Check every applicant's history",
      body: "No applicant or partner can ever have held an interest in Australian residential property, and at least one must be a citizen, permanent resident or New Zealand citizen on a special category visa.",
    },
    {
      title: "Relief is claimed with the duty",
      body: "Your conveyancer claims the relief when the stamp duty is assessed. Make sure they know before the contract is lodged.",
    },
    {
      title: "Apply for the grant separately",
      body: `The ${formatAud(g.amount)} grant is a separate application, often lodged through your lender, or directly with RevenueSA.`,
    },
    { title: "Move in", body: residence ?? "Live in the home for the period the relief requires." },
  ],
  applyAfter: (
    <p>
      For the general buying process, see <TextLink href={PATHS.homeLoansFirstHomeBuyers}>first home loans</TextLink>.
    </p>
  ),
  documents: [
    "Passport, and proof of citizenship, permanent residence or New Zealand citizenship",
    "Payslips and an employment letter, or tax returns if self-employed",
    "Bank statements showing savings and the deposit",
    "Contract of sale, or land and building contracts for a house-and-land package",
    "Confirmation from the builder or developer that the home is new",
  ],
  mistakes: [
    { title: "Assuming all first homes get relief", body: "Established homes get no first home relief in South Australia. Price the duty before you choose." },
    { title: "Buying a lived-in 'new' home", body: "A recently built home that has already been occupied may not count as new. Check how it is classified." },
    { title: "Forgetting the partner rule", body: "If your partner has ever held an interest in Australian residential property, the relief doesn't apply." },
    { title: "Overlooking the surcharge", body: "Relief doesn't reduce the foreign ownership surcharge for buyers who are foreign persons." },
  ],
  faqs: [
    {
      question: "Do first home buyers pay stamp duty in South Australia?",
      answer: "Not on a new home, off-the-plan apartment or vacant land for a first home, at any price, if you meet the conditions. On an established home, yes, at the normal rates.",
    },
    {
      question: "Is there a price cap on South Australia's first home relief?",
      answer: "No. The relief applies regardless of the property value, for eligible new homes, off-the-plan apartments and land.",
    },
    {
      question: "How much is the South Australian First Home Owner Grant?",
      answer: `Up to ${formatAud(g.amount)} for a new home, an off-the-plan apartment or a substantially renovated home, with no price cap. It isn't available for established homes or vacant land alone.`,
    },
    {
      question: "Do foreign buyers pay extra in South Australia?",
      answer: `Yes. The foreign ownership surcharge is ${SA.foreignSurcharge.ratePct}% of the value, on top of normal duty, and first home relief doesn't reduce it. It is refunded if the buyer stops being a foreign person within 12 months of buying.`,
    },
    {
      question: "Does a house-and-land package get the South Australian relief?",
      answer: `Yes, if you meet the other conditions: the relief covers vacant land to build your first home, including house-and-land packages. Rules checked ${formatDate(relief.verifiedAt)}.`,
    },
  ],
  calcPrice: 650_000,
};

export default content;
