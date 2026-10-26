import { NSW } from "@/modules/calc/rules";
import { TextLink } from "../../../components/ui/Button";
import { PATHS } from "../../../config";
import { formatAud, formatDate } from "../../../format";
import { DEPOSIT_SCHEME, HELP_TO_BUY, duty, fhbThresholds, fhogFor } from "../../shared/rules";
import { visaPath } from "../../visa/VisaArticle";
import type { FhbStateContent } from "../types";

const home = fhbThresholds("NSW", "established")!;
const land = fhbThresholds("NSW", "vacant-land")!;
const g = fhogFor("NSW")!;
const homeConc = NSW.concessions.find((c) => c.id === "fhbas-home")!;
const deferral = NSW.otherConcessions.find((c) => c.id === "otp-deferral");
const residence = homeConc.eligibility.find((l) => /move in/i.test(l));
const surcharge = NSW.foreignSurcharge;
const atExempt = duty({ state: "NSW", price: home.exemptTo ?? 0, propertyType: "established", firstHomeBuyer: false, foreignPurchaser: false, ownerOccupier: true });

const EXAMPLE_PRICES = [650_000, 900_000, 1_200_000];
const content_examples_under_cap = () => EXAMPLE_PRICES.every((p) => p <= DEPOSIT_SCHEME.priceCaps.NSW.capital);

const content: FhbStateContent = {
  state: "NSW",
  metaTitle: "First home buyer NSW: stamp duty, grant and 5% deposit",
  metaDescription:
    "NSW first home buyers: the First Home Buyers Assistance Scheme thresholds, the $10,000 new home grant, 5% Deposit Scheme caps, worked examples and how to apply.",
  h1: (
    <>
      First home buyers in <em>NSW</em>
    </>
  ),
  headline: "First home buyers in NSW: concessions, grants and schemes",
  lede: "NSW gives first home buyers a full transfer duty exemption up to a set price and a reduced rate above it, a grant for new homes, and access to the federal deposit schemes. Here is what applies today, worked through at three prices.",
  publishedAt: "2026-10-26",
  updatedAt: "2026-10-26",
  intro: (
    <>
      <p>
        Most NSW first home buyers benefit from one scheme above all: the First Home Buyers Assistance Scheme (FHBAS). It removes transfer duty on a new or existing home up to{" "}
        {formatAud(home.exemptTo ?? 0)} and reduces it on homes up to {formatAud(home.reducedTo ?? 0)}. At the exemption threshold that is a saving of{" "}
        {formatAud(atExempt.baseDuty)}. Vacant land to build on has its own, lower thresholds: no duty up to {formatAud(land.exemptTo ?? 0)}, reduced duty up to{" "}
        {formatAud(land.reducedTo ?? 0)}.
      </p>
      <p>
        The scheme&rsquo;s thresholds have applied since {formatDate(homeConc.effectiveFrom)}. The general duty brackets they are measured against change every 1 July, so the
        dollar value of the concession moves a little each year even when the thresholds don&rsquo;t.
      </p>
      <p>
        The grant is narrower than many people expect. The First Home Owner (New Homes) Grant is {formatAud(g.amount)}, only for a new home, and only up to{" "}
        {formatAud(g.priceCap ?? 0)} (or {formatAud(g.buildCap ?? 0)} for land plus a building contract). At Sydney prices many new apartments are over the cap, so most
        Sydney buyers rely on the duty exemption rather than the grant.
      </p>
    </>
  ),
  examples: [
    { label: "Unit", price: EXAMPLE_PRICES[0], propertyType: "established" },
    { label: "Townhouse", price: EXAMPLE_PRICES[1], propertyType: "established" },
    { label: "House", price: EXAMPLE_PRICES[2], propertyType: "established" },
  ],
  examplesAfter: (
    <>
      <p>
        The three prices show the three bands. The unit is under the exemption threshold, so the only government costs are registration fees. The townhouse sits in the reducing
        band, where the concession shrinks the further the price is above {formatAud(home.exemptTo ?? 0)}. The house is over {formatAud(home.reducedTo ?? 0)}, so full transfer
        duty applies.
      </p>
      <p>
        {content_examples_under_cap()
          ? `All three are under the ${formatAud(DEPOSIT_SCHEME.priceCaps.NSW.capital)} Sydney cap for the 5% Deposit Scheme, so an eligible buyer could buy any of them with a 5% deposit and no LMI.`
          : `Check each price against the ${formatAud(DEPOSIT_SCHEME.priceCaps.NSW.capital)} Sydney cap for the 5% Deposit Scheme in the table.`}{" "}
        The cash needed at settlement is very different, though: the house needs the full duty on top of the deposit.
      </p>
    </>
  ),
  schemesIntro: (
    <p>
      The 5% Deposit Scheme&rsquo;s Sydney cap of {formatAud(DEPOSIT_SCHEME.priceCaps.NSW.capital)} also covers the listed regional centres, so a Newcastle or Wollongong buyer
      uses the same cap as a Sydney buyer. Help to Buy sets a lower NSW cap of {formatAud(HELP_TO_BUY.priceCaps.NSW.capital)}, so a home can fit one scheme and not the other.
    </p>
  ),
  extra: {
    id: "off-the-plan",
    title: "Off the plan, new homes and land in NSW",
    body: (
      <>
        <p>
          FHBAS applies to new homes and off-the-plan purchases on the same thresholds as existing homes, so a new apartment and an older one at the same price get the same
          concession. The difference is the grant, which only new homes can get.
        </p>
        {deferral && <p>{deferral.summary}</p>}
        <p>
          If you are buying land to build on, check two sets of numbers: the land thresholds for FHBAS ({formatAud(land.exemptTo ?? 0)} exempt, reduced up to{" "}
          {formatAud(land.reducedTo ?? 0)}) and the grant&rsquo;s {formatAud(g.buildCap ?? 0)} cap on land plus the building contract. A construction loan is paid out in stages;
          see <TextLink href={PATHS.constructionLoans}>construction loans</TextLink>.
        </p>
      </>
    ),
  },
  apply: [
    {
      title: "Check eligibility before you exchange",
      body: "Confirm that every buyer, and every buyer's spouse or partner, has never owned residential property in Australia, and that at least one of you is a citizen or permanent resident. Do this before you exchange contracts, not after.",
    },
    {
      title: "Get pre-approval with the concession in the budget",
      body: "Your lender assesses the purchase with the duty you will actually pay. If the price could land in the reducing band, we work out the cash needed at the top of your range.",
    },
    {
      title: "Your conveyancer claims FHBAS with the duty",
      body: "In most purchases your conveyancer or solicitor lodges the FHBAS claim when the duty is assessed. Tell them early that you are claiming it, and confirm it is on the assessment before settlement.",
    },
    {
      title: "Apply for the grant, if your home qualifies",
      body: "For a new home under the cap, many lenders can lodge the First Home Owner (New Homes) Grant application for you. Otherwise you apply to Revenue NSW directly.",
    },
    {
      title: "Move in and stay",
      body: residence ?? "Live in the home for the period the scheme requires.",
    },
  ],
  applyAfter: (
    <p>
      For the full path from saving to settlement, including pre-approval and bidding at auction, see <TextLink href={PATHS.homeLoansFirstHomeBuyers}>first home loans</TextLink>.
    </p>
  ),
  documents: [
    "Passport or birth certificate, and proof of citizenship or permanent residence",
    "Recent payslips and an employment letter, or tax returns if self-employed",
    "Bank statements showing your savings and the deposit",
    "Contract of sale (and building contract for land or a new build)",
    "Details of your spouse or partner, who must also never have owned residential property in Australia",
  ],
  mistakes: [
    { title: "Bidding just over a threshold", body: `Between ${formatAud(home.exemptTo ?? 0)} and ${formatAud(home.reducedTo ?? 0)} every extra dollar reduces the concession. Know your duty at each price before auction day.` },
    { title: "Counting on the grant for an existing home", body: "The NSW grant is for new homes only. An established unit or house gets FHBAS but no grant." },
    { title: "Forgetting a partner's past property", body: "FHBAS looks at you and your spouse or partner. If your partner has owned residential property in Australia, you can't use it." },
    { title: "Renting it out too early", body: "If you don't meet the residence requirement, the concession can be withdrawn and full duty becomes payable." },
  ],
  faqs: [
    {
      question: "How much stamp duty does a first home buyer pay in NSW?",
      answer: `Nothing on a new or existing home up to ${formatAud(home.exemptTo ?? 0)}, if you meet the FHBAS conditions. Between ${formatAud(home.exemptTo ?? 0)} and ${formatAud(home.reducedTo ?? 0)} you pay reduced duty; above that, full duty. Use the calculator on this page for your price.`,
    },
    {
      question: "Can I get the First Home Owner Grant on an established home in NSW?",
      answer: `No. The First Home Owner (New Homes) Grant is only for new, off-the-plan or substantially renovated homes up to ${formatAud(g.priceCap ?? 0)}, or ${formatAud(g.buildCap ?? 0)} when building.`,
    },
    {
      question: "Is the NSW first home buyer concession income tested?",
      answer: "The FHBAS rules we checked have no income test. What matters is the price, your ownership history and your residency.",
    },
    {
      question: "Can I get FHBAS if I'm on a visa?",
      answer: (
        <>
          <p>
            At least one first home buyer must be an Australian citizen or permanent resident. Temporary visa holders can only benefit with a citizen or PR co-buyer, and still pay
            surcharge purchaser duty of {surcharge.ratePct}% on their share. See the <TextLink href={PATHS.visaHomeLoans}>visa guides</TextLink>, or the{" "}
            <TextLink href={visaPath("permanent-residents")}>permanent resident guide</TextLink> for the 200-day rule.
          </p>
        </>
      ),
      answerText: `At least one first home buyer must be an Australian citizen or permanent resident. Temporary visa holders can only benefit with a citizen or PR co-buyer, and still pay surcharge purchaser duty of ${surcharge.ratePct}% on their share.`,
    },
    {
      question: "Do I have to live in the home?",
      answer: residence ? `Yes. ${residence}` : "Yes. FHBAS is for a home you live in.",
    },
  ],
  calcPrice: 750_000,
};

export default content;
