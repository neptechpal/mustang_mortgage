import { QLD } from "@/modules/calc/rules";
import { TextLink } from "../../../components/ui/Button";
import { PATHS } from "../../../config";
import { formatAud } from "../../../format";
import { DEPOSIT_SCHEME, fhbThresholds, fhogFor, regionalCentresFor } from "../../shared/rules";
import { visaPath } from "../../visa/VisaArticle";
import type { FhbStateContent } from "../types";

const est = fhbThresholds("QLD", "established")!;
const g = fhogFor("QLD")!;
const firstHome = QLD.concessions.find((c) => c.id === "first-home-concession")!;
const newHome = QLD.concessions.find((c) => c.id === "first-home-new-home")!;
const land = QLD.concessions.find((c) => c.id === "first-home-vacant-land")!;
const moveIn = firstHome.eligibility.find((l) => /move in/i.test(l));
const caps = DEPOSIT_SCHEME.priceCaps.QLD;
const centres = regionalCentresFor("QLD");
const PRICES = { est1: 650_000, est2: 760_000, new1: 720_000 };

const content: FhbStateContent = {
  state: "QLD",
  metaTitle: "First home buyer Queensland: duty, $30k grant and caps",
  metaDescription:
    "Queensland first home buyers: no duty on new homes at any price, the established-home concession to $800,000, the $30,000 new home grant, the specified-resident rule and worked examples.",
  h1: (
    <>
      First home buyers in <em>Queensland</em>
    </>
  ),
  headline: "First home buyers in Queensland: concessions, grants and schemes",
  lede: "Queensland splits first home buyers in two. Buy a new home and you pay no transfer duty at any price, and may get a grant. Buy an established home and the concession phases out by a set price. Here is how each works today.",
  publishedAt: "2026-10-26",
  updatedAt: "2026-10-26",
  intro: (
    <>
      <p>
        Queensland has three first home duty concessions. For an <strong>established home</strong> you pay no transfer duty up to about {formatAud(est.exemptTo ?? 0)}, and the
        concession steps down to nothing at {formatAud(est.reducedTo ?? 0)}. For a <strong>new home</strong> (never lived in, substantially renovated, or off the plan) and for{" "}
        <strong>vacant land</strong> you build your first home on, there is no duty at all and no price cap.
      </p>
      <p>
        The established-home concession is calculated from the home concession rates, which any owner-occupier can use, so even buyers above {formatAud(est.reducedTo ?? 0)} pay
        less than an investor would. The new-home concession doesn&rsquo;t cover knocking down an existing house and rebuilding.
      </p>
      <p>
        Queensland&rsquo;s ownership test is strict: every buyer must never have held an interest in residential land anywhere, including overseas. Someone who owns, or co-owns,
        a house or land in their home country is not a first home buyer for these concessions, even if they have never owned anything in Australia.
      </p>
    </>
  ),
  examples: [
    { label: "Unit", price: PRICES.est1, propertyType: "established" },
    { label: "Townhouse", price: PRICES.est2, propertyType: "established" },
    { label: "House", price: PRICES.new1, propertyType: "new" },
  ],
  examplesAfter: (
    <>
      <p>
        The established unit is under {formatAud(est.exemptTo ?? 0)}, so no duty applies. The townhouse sits in the stepped band, where the concession falls in fixed amounts for
        each $10,000 of price. The new house pays no duty, and because it is under {formatAud(g.priceCap ?? 0)} it also qualifies for the {formatAud(g.amount)} grant.
      </p>
      <p>
        Queensland&rsquo;s transfer registration fee is charged per $10,000 above a base amount, so it is much higher than in NSW at the same price. The 5% Deposit Scheme cap is{" "}
        {formatAud(caps.capital)} in Brisbane{centres ? ` and ${centres}` : ""}, and {formatAud(caps.regional)} elsewhere.
      </p>
    </>
  ),
  schemesIntro: (
    <p>
      In Queensland the capital-city cap of {formatAud(caps.capital)} also applies {centres ? `in ${centres}` : "in the listed regional centres"}. A new home over the cap can still
      get the no-duty new home concession, because that concession has no price limit, but it would miss out on the 5% Deposit Scheme and possibly the grant.
    </p>
  ),
  extra: {
    id: "specified-resident",
    title: "The specified-resident rule from 1 August 2026",
    body: (
      <>
        <p>
          For contracts from 1 August 2026, Queensland&rsquo;s home concessions are only for buyers who are &ldquo;specified residents&rdquo;: Australian citizens, permanent
          residents (including New Zealand citizens on a special category visa) and specified foreign retirees. A temporary visa holder buying alone gets none of the first home
          concessions, and pays additional foreign acquirer duty of {QLD.foreignSurcharge.ratePct}% on top of full duty.
        </p>
        <p>
          Where a citizen or permanent resident buys with a temporary visa holder, each buyer&rsquo;s share is assessed separately. Queensland also fixes foreign status at the
          contract date, with no refund if permanent residence comes later. If you are close to a permanent visa grant, sign after it. The{" "}
          <TextLink href={visaPath("subclass-494")}>494 guide</TextLink> works through a Queensland example.
        </p>
      </>
    ),
  },
  apply: [
    {
      title: "Check the ownership test for every buyer",
      body: "Each buyer must never have held an interest in residential land anywhere, in Australia or overseas, and must be a specified resident.",
    },
    {
      title: "Decide new or established early",
      body: `The concession, the grant and the price ceiling all depend on it. A new home has no duty cap; an established home's concession ends at ${formatAud(est.reducedTo ?? 0)}.`,
    },
    {
      title: "Claim the concession with the duty",
      body: "Your conveyancer or solicitor claims the concession when the transfer duty is assessed. Make sure they know you are a first home buyer before the contract is lodged.",
    },
    {
      title: "Apply for the grant on a new home",
      body: `For a new home under ${formatAud(g.priceCap ?? 0)}, apply for the ${formatAud(g.amount)} grant, often through your lender, or directly with the Queensland Revenue Office.`,
    },
    { title: "Move in", body: moveIn ?? "Move in within the time the concession requires." },
  ],
  applyAfter: (
    <p>
      For the general buying process, see <TextLink href={PATHS.homeLoansFirstHomeBuyers}>first home loans</TextLink>.
    </p>
  ),
  documents: [
    "Passport, and proof of citizenship or permanent residence for every buyer",
    "Payslips and an employment letter, or tax returns if self-employed",
    "Bank statements showing savings and the deposit",
    "Contract of sale, or land contract and building contract for a new build",
    "Details of any property you own or have owned overseas",
  ],
  mistakes: [
    { title: "Forgetting land overseas", body: "Any interest in residential land anywhere, including a share in a family home overseas, can rule you out of the concession." },
    { title: "Assuming established homes are like new", body: `New homes have no duty cap. Established homes lose the concession entirely at ${formatAud(est.reducedTo ?? 0)}.` },
    { title: "Knock-down rebuilds", body: "Demolishing an existing home and building a new one doesn't qualify for the new-home concession." },
    { title: "Budgeting only for duty", body: "Queensland's transfer registration fee rises with the price. Include it in your cash at settlement." },
  ],
  faqs: [
    {
      question: "Do first home buyers pay stamp duty in Queensland?",
      answer: `Not on a new home or vacant land for a first home, at any price, if you meet the conditions. On an established home there is no duty up to about ${formatAud(est.exemptTo ?? 0)}, a stepped concession above that, and none from ${formatAud(est.reducedTo ?? 0)}.`,
    },
    {
      question: "How much is the Queensland First Home Owner Grant?",
      answer: `${formatAud(g.amount)} for a new home valued under ${formatAud(g.priceCap ?? 0)}. It isn't available for established homes.`,
    },
    {
      question: "I own land overseas. Am I a first home buyer in Queensland?",
      answer: "Not for the duty concessions. Every buyer must never have held an interest in residential land anywhere, including overseas.",
    },
    {
      question: "Can a temporary visa holder get the Queensland first home concession?",
      answer: `Not for contracts from 1 August 2026. The concessions are for specified residents. A temporary visa holder's share pays full duty plus ${QLD.foreignSurcharge.ratePct}% additional foreign acquirer duty.`,
    },
    {
      question: "Is there a price cap on the new home concession?",
      answer: `No. ${newHome.name} and the ${land.name.toLowerCase()} have no value cap.`,
    },
  ],
  calcPrice: 680_000,
};

export default content;
