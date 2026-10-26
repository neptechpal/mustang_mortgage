import { TAS } from "@/modules/calc/rules";
import { TextLink } from "../../../components/ui/Button";
import { PATHS } from "../../../config";
import { formatAud, formatDate } from "../../../format";
import { DEPOSIT_SCHEME, duty, fhogFor } from "../../shared/rules";
import type { FhbStateContent } from "../types";

const g = fhogFor("TAS")!;
const ended = TAS.otherConcessions.find((c) => c.id === "fhb-established-ended");
const otpEnded = TAS.otherConcessions.find((c) => c.id === "otp-ended");
const residence = g.eligibility.find((l) => /6 continuous months/i.test(l));
const caps = DEPOSIT_SCHEME.priceCaps.TAS;
const topBracket = TAS.generalScale.brackets[TAS.generalScale.brackets.length - 1];
const topRate = topBracket.kind === "marginal" ? topBracket.ratePct : 0;
const topFrom = topBracket.kind === "marginal" ? topBracket.over : 0;
const at620 = duty({ state: "TAS", price: 620_000, propertyType: "established", firstHomeBuyer: true, foreignPurchaser: false, ownerOccupier: true });

const content: FhbStateContent = {
  state: "TAS",
  metaTitle: "First home buyer Tasmania: duty after 30 June 2026, grant",
  metaDescription:
    "Tasmanian first home buyers: the established-home duty exemption ended on 30 June 2026, the First Home Owner Grant is $20,000 for new homes to 30 June 2027, plus scheme caps and worked examples.",
  h1: (
    <>
      First home buyers in <em>Tasmania</em>
    </>
  ),
  headline: "First home buyers in Tasmania: duty, grants and schemes",
  lede: "Tasmania's first home duty exemption for established homes has ended, so first home buyers now pay full duty. What remains is a grant for new homes and the federal deposit schemes. Here is what that means at three prices.",
  publishedAt: "2026-10-26",
  updatedAt: "2026-10-26",
  intro: (
    <>
      <p>
        Until 30 June 2026, Tasmanian first home buyers of established homes could get a full duty exemption. That scheme has closed and nothing has replaced it, so a first home
        buyer now pays the same transfer duty as any other buyer, on any type of home.
      </p>
      <p>
        The help that remains is the First Home Owner Grant: {formatAud(g.amount)} for a new home, with no price cap, for transactions that commence between{" "}
        {g.effectiveFrom ? formatDate(g.effectiveFrom) : "1 July 2026"} and {g.effectiveTo ? formatDate(new Date(new Date(g.effectiveTo).getTime() - 86_400_000)) : "30 June 2027"}.
        The grant was higher in the previous year, so check which amount applies to your contract or building start date.
      </p>
      <p>
        Duty itself is charged on a sliding scale, from a {formatAud(TAS.generalScale.minimumDuty ?? 0)} minimum up to {topRate}% on the part of the price above{" "}
        {formatAud(topFrom)}. On a {formatAud(620_000)} established house that comes to {formatAud(at620.transferDuty)}, all of it payable by a first home buyer.
      </p>
      <p>
        With no duty concession, the federal schemes do more of the work in Tasmania. The 5% Deposit Scheme lets eligible buyers avoid LMI with a 5% deposit, under a cap of{" "}
        {formatAud(caps.capital)} in Hobart and {formatAud(caps.regional)} elsewhere.
      </p>
    </>
  ),
  examples: [
    { label: "Unit", price: 480_000, propertyType: "established" },
    { label: "House", price: 620_000, propertyType: "established" },
    { label: "New house", price: 600_000, propertyType: "new" },
  ],
  examplesAfter: (
    <>
      <p>
        All three homes pay full transfer duty. Tasmania has no first home duty concession for contracts signed now, and no owner-occupier rate either. The new house is the only
        one that gets help, through the {formatAud(g.amount)} grant, which is paid separately and can go towards the deposit or costs.
      </p>
      <p>
        If you are choosing between an established home and a new one at a similar price, the grant is the deciding difference in Tasmania. In NSW or Victoria it would be the duty
        concession.
      </p>
    </>
  ),
  schemesIntro: (
    <p>
      With no duty concession in Tasmania, the 5% Deposit Scheme is the main way to cut the cash needed up front: it removes LMI on a deposit from 5%. The Hobart cap is{" "}
      {formatAud(caps.capital)}; outside Hobart it is {formatAud(caps.regional)}. Help to Buy uses the same Tasmanian caps but is open to Australian citizens only.
    </p>
  ),
  extra: {
    id: "ended",
    title: "The concessions that ended on 30 June 2026",
    body: (
      <>
        {ended && <p>{ended.summary}</p>}
        {otpEnded && <p>{otpEnded.summary}</p>}
        <p>
          Older articles, and some calculators, still show these concessions. If a figure you have seen assumes a first home exemption in Tasmania, check the contract date it
          was based on.
        </p>
      </>
    ),
  },
  apply: [
    { title: "Budget for full duty", body: "Use the calculator on this page at your top price. There is no first home concession to reduce it." },
    {
      title: "If buying new, check the grant dates",
      body: `The ${formatAud(g.amount)} amount depends on when your contract is signed or building starts. Completion must follow within the time the grant allows.`,
    },
    {
      title: "Apply for the grant",
      body: "The grant is usually lodged through your lender as an approved agent, or directly with the State Revenue Office.",
    },
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
    "Contract of sale, or the building contract and land title for a new build",
  ],
  mistakes: [
    { title: "Relying on an old calculator", body: "Figures that include the established-home exemption are out of date for contracts signed after 30 June 2026." },
    { title: "Assuming the grant covers established homes", body: "The Tasmanian grant is only for new homes, never occupied or sold as a residence." },
    { title: "Missing the build deadline", body: "The grant requires completion within the time allowed. Allow for building delays when you sign a building contract." },
    { title: "Underestimating cash at settlement", body: "With full duty payable, the cash needed on top of the deposit is higher than in states with a first home exemption." },
  ],
  faqs: [
    {
      question: "Do first home buyers pay stamp duty in Tasmania?",
      answer: "Yes. The first home buyer duty exemption for established homes ended for transactions settling after 30 June 2026, and there is no replacement, so first home buyers pay normal duty.",
    },
    {
      question: "How much is the Tasmanian First Home Owner Grant?",
      answer: `${formatAud(g.amount)} for an eligible new home, with no price cap, for transactions that commence in the 2026-27 financial year.`,
    },
    {
      question: "Can I use the 5% Deposit Scheme in Tasmania?",
      answer: `Yes, if you are eligible. The cap is ${formatAud(caps.capital)} in Hobart and ${formatAud(caps.regional)} in the rest of the state.`,
    },
    {
      question: "Do foreign buyers pay extra in Tasmania?",
      answer: `Yes. The foreign investor duty surcharge is ${TAS.foreignSurcharge.ratePct}% of the dutiable value, on top of transfer duty, for foreign persons including temporary visa holders.`,
    },
    {
      question: "Is it better to buy new in Tasmania?",
      answer: `For a first home buyer it often is, financially: duty is the same on new and established homes, but only a new home gets the ${formatAud(g.amount)} grant. Weigh that against location and price, which matter more over time.`,
    },
    {
      question: "Is there still an off-the-plan concession in Tasmania?",
      answer: "No. The 50% off-the-plan apartment concession needed an agreement signed by 30 June 2026.",
    },
  ],
  calcPrice: 550_000,
};

export default content;
