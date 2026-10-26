import { VIC } from "@/modules/calc/rules";
import { TextLink } from "../../../components/ui/Button";
import { PATHS } from "../../../config";
import { formatAud, formatDate } from "../../../format";
import { DEPOSIT_SCHEME, fhbThresholds, fhogFor, regionalCentresFor } from "../../shared/rules";
import { visaPath } from "../../visa/VisaArticle";
import type { FhbStateContent } from "../types";

const t = fhbThresholds("VIC", "established")!;
const g = fhogFor("VIC")!;
const fhb = VIC.concessions[0];
const ppr = VIC.ownerOccupierScale!;
const otpTemp = VIC.otherConcessions.find((c) => c.id === "otp-temporary");
const otpOngoing = VIC.otherConcessions.find((c) => c.id === "otp-ongoing");
const residence = fhb.eligibility.find((l) => /12 continuous months/i.test(l));
const ownershipTest = fhb.eligibility.find((l) => /owned and lived/i.test(l));
const caps = DEPOSIT_SCHEME.priceCaps.VIC;
const centres = regionalCentresFor("VIC");
const PRICES = [550_000, 680_000, 820_000] as const;

const content: FhbStateContent = {
  state: "VIC",
  metaTitle: "First home buyer Victoria: stamp duty, grant and caps",
  metaDescription:
    "Victorian first home buyers: no duty up to $600,000 and a concession to $750,000 on new and established homes, the $10,000 new home grant, 5% Deposit Scheme caps and worked examples.",
  h1: (
    <>
      First home buyers in <em>Victoria</em>
    </>
  ),
  headline: "First home buyers in Victoria: concessions, grants and schemes",
  lede: "Victoria's first home buyer duty exemption covers new and established homes alike, with a lower price ceiling than NSW. Here is what applies, what the thresholds mean at real prices, and how Melbourne compares with the rest of the state for the deposit schemes.",
  publishedAt: "2026-10-26",
  updatedAt: "2026-10-26",
  intro: (
    <>
      <p>
        In Victoria a first home buyer pays no land transfer duty on a home valued up to {formatAud(t.exemptTo ?? 0)}, and reduced duty up to {formatAud(t.reducedTo ?? 0)}. It
        applies to established homes as well as new ones, and to vacant land you will build your first home on (assessed on the land value). There is no income test.
      </p>
      <p>
        The ceiling matters in Melbourne. Above {formatAud(t.reducedTo ?? 0)} there is no first home concession at all, and general rates apply to the whole price. Many
        townhouses and houses sit above that line, so the price you bid at changes the duty bill by tens of thousands of dollars.
      </p>
      <p>
        Victoria also has a principal place of residence concession that any owner-occupier can use on a property worth up to {formatAud(ppr.maxValue ?? 0)}. First home buyers at
        that price get the full exemption anyway, but it helps people who don&rsquo;t qualify as first home buyers.
      </p>
      {ownershipTest && (
        <p>
          The ownership test is worded differently from NSW. The rule we checked says the exemption isn&rsquo;t available if you or your partner have received a First Home Owner
          Grant or first home duty concession before, or <strong>owned and lived in</strong> a home in Australia. If you own property you have never lived in, ask your conveyancer
          to confirm the position with the State Revenue Office before you rely on it.
        </p>
      )}
    </>
  ),
  examples: [
    { label: "Unit", price: PRICES[0], propertyType: "established" },
    { label: "Townhouse", price: PRICES[1], propertyType: "established" },
    { label: "House", price: PRICES[2], propertyType: "established" },
  ],
  examplesAfter: (
    <>
      <p>
        The unit is under {formatAud(t.exemptTo ?? 0)}, so no duty applies. The townhouse is in the reducing band: duty is charged on a sliding scale that reaches full duty at{" "}
        {formatAud(t.reducedTo ?? 0)}. The house is past that point and pays general rates on the full price.
      </p>
      <p>
        Victoria&rsquo;s transfer registration fee rises with the price, which is why the fees row climbs across the table. In Melbourne
        {centres ? ` and ${centres}` : ""} the 5% Deposit Scheme cap is {formatAud(caps.capital)}; in the rest of the state it is {formatAud(caps.regional)}
        {PRICES[1] > caps.regional ? `, so the ${formatAud(PRICES[1])} townhouse would be over the cap in a regional town` : ""}.
      </p>
    </>
  ),
  schemesIntro: (
    <p>
      Victoria has one listed regional centre on the 5% Deposit Scheme&rsquo;s capital-city cap{centres ? `: ${centres}` : ""}. Everywhere else outside Melbourne uses the lower
      cap of {formatAud(caps.regional)}, which sits below the first home concession&rsquo;s {formatAud(t.reducedTo ?? 0)} ceiling. In regional Victoria the scheme cap, not the
      duty concession, is usually the limit that bites.
    </p>
  ),
  extra: {
    id: "off-the-plan",
    title: "Off-the-plan apartments and townhouses in Victoria",
    body: (
      <>
        {otpTemp && (
          <p>
            {otpTemp.summary} The concession runs to {otpTemp.effectiveTo ? formatDate(otpTemp.effectiveTo) : "its end date"} for contracts.
          </p>
        )}
        {otpOngoing && <p>{otpOngoing.summary}</p>}
        <p>
          If you are a first home buyer buying off the plan under {formatAud(t.exemptTo ?? 0)}, the first home exemption already removes duty. The off-the-plan rules matter more
          for prices above that, where the construction-cost deduction can bring the dutiable value down into or below the reducing band.
        </p>
      </>
    ),
  },
  apply: [
    {
      title: "Check the ownership test for both of you",
      body: "The exemption looks at you and your partner: any previous first home grant or concession, and any home in Australia you have owned and lived in.",
    },
    {
      title: "Price the duty before you bid",
      body: `Between ${formatAud(t.exemptTo ?? 0)} and ${formatAud(t.reducedTo ?? 0)} the duty rises quickly with the price. Use the calculator on this page for your top price, and get pre-approval on that figure.`,
    },
    {
      title: "Your conveyancer claims the exemption",
      body: "The exemption or concession is applied for as part of the duty lodgement before settlement, usually by your conveyancer or solicitor. Confirm early that they are claiming it.",
    },
    {
      title: "Apply for the grant on a new home",
      body: `If the home is new and valued up to ${formatAud(g.priceCap ?? 0)}, you can apply for the ${formatAud(g.amount)} First Home Owner Grant, often through your lender, or directly with the State Revenue Office.`,
    },
    { title: "Move in and stay", body: residence ?? "Live in the home for the period the scheme requires." },
  ],
  applyAfter: (
    <p>
      The steps from saving to settlement are on <TextLink href={PATHS.homeLoansFirstHomeBuyers}>first home loans</TextLink>.
    </p>
  ),
  documents: [
    "Passport, and proof of citizenship, permanent residence or New Zealand citizenship",
    "Payslips and an employment letter, or tax returns if self-employed",
    "Bank statements showing savings and the deposit",
    "Contract of sale, and the building contract if you are building",
    "Your partner's details for the ownership test",
  ],
  mistakes: [
    { title: "Assuming the NSW thresholds", body: `Victoria's exemption ends at ${formatAud(t.exemptTo ?? 0)} and the concession at ${formatAud(t.reducedTo ?? 0)}, both lower than NSW.` },
    { title: "Expecting a grant on an established home", body: "The Victorian First Home Owner Grant is for new homes only." },
    { title: "Forgetting land is valued separately", body: "For vacant land, the first home exemption is assessed on the land value. The build cost doesn't count towards that test." },
    { title: "Moving out too soon", body: "Someone on the title needs to live there for 12 continuous months, starting within 12 months of settlement." },
  ],
  faqs: [
    {
      question: "How much stamp duty does a first home buyer pay in Victoria?",
      answer: `None on a home valued up to ${formatAud(t.exemptTo ?? 0)}, reduced duty up to ${formatAud(t.reducedTo ?? 0)}, and general rates above that, if you meet the conditions. The same thresholds apply to new and established homes.`,
    },
    {
      question: "Can New Zealand citizens get the Victorian first home exemption?",
      answer: (
        <p>
          Yes. At least one buyer must be an Australian citizen, a New Zealand citizen or a permanent resident. See our{" "}
          <TextLink href={visaPath("new-zealand-citizens")}>guide for New Zealand citizens</TextLink> for the foreign purchaser duty rules.
        </p>
      ),
      answerText: "Yes. At least one buyer must be an Australian citizen, a New Zealand citizen or a permanent resident.",
    },
    {
      question: "Is the Victorian First Home Owner Grant available for established homes?",
      answer: `No. The ${formatAud(g.amount)} grant is for new homes valued up to ${formatAud(g.priceCap ?? 0)}.`,
    },
    {
      question: "Is the Victorian first home buyer exemption income tested?",
      answer: "No. The rules we checked have no income test.",
    },
    {
      question: "I'm on a temporary visa. Can I buy in Victoria?",
      answer: (
        <p>
          You need FIRB approval and can only buy a new home or vacant land while the established-home ban applies. Victoria charges foreign purchaser additional duty of{" "}
          {VIC.foreignSurcharge.ratePct}% to temporary visa holders. See the <TextLink href={PATHS.visaHomeLoans}>visa guides</TextLink>.
        </p>
      ),
      answerText: `You need FIRB approval and can only buy a new home or vacant land while the established-home ban applies. Victoria charges foreign purchaser additional duty of ${VIC.foreignSurcharge.ratePct}% to temporary visa holders.`,
    },
  ],
  calcPrice: 650_000,
};

export default content;
