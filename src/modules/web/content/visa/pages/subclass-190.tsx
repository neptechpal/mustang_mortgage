import { TextLink } from "../../../components/ui/Button";
import { PATHS } from "../../../config";
import { formatAud } from "../../../format";
import { DEPOSIT_SCHEME, FHSS, fhbThresholds } from "../../shared/rules";
import type { VisaPageContent, VisaScenario } from "../types";
import { scenarioFigures, visaPath } from "../VisaArticle";

const nsw = fhbThresholds("NSW", "established")!;
const vic = fhbThresholds("VIC", "established")!;
const capSydney = DEPOSIT_SCHEME.priceCaps.NSW.capital;

const scenario: VisaScenario = {
  title: "where the NSW concession runs out",
  setup: (
    <>
      <p>
        A couple were nominated by NSW for 190 visas and granted them two years ago. Both work full time in Sydney and neither has owned property anywhere. They plan to use the 5%
        Deposit Scheme and are choosing between two established homes in western Sydney: a townhouse at {formatAud(900_000)} and a house at {formatAud(1_050_000)}.
      </p>
      <p>The table shows how much of the First Home Buyers Assistance Scheme survives at each price.</p>
    </>
  ),
  columns: [
    { label: "Townhouse", duty: { state: "NSW", price: 900_000, propertyType: "established", firstHomeBuyer: true, foreignPurchaser: false, ownerOccupier: true } },
    { label: "House", duty: { state: "NSW", price: 1_050_000, propertyType: "established", firstHomeBuyer: true, foreignPurchaser: false, ownerOccupier: true } },
  ],
  depositPct: 5,
  assumptions: [
    "Both buyers are permanent residents, first home buyers, and have been in Australia for more than 200 of the last 365 days.",
    "Both homes are in Sydney postcodes, under the 5% Deposit Scheme cap, so no LMI is payable.",
  ],
  after: null,
};

const fig = scenarioFigures(scenario);
const [town, house] = fig.cols;

scenario.after = (
  <>
    <p>
      At {formatAud(scenario.columns[0].duty.price)} the concession still takes {formatAud(town.r.concession)} off the duty bill, leaving {formatAud(town.r.transferDuty)}. At{" "}
      {formatAud(scenario.columns[1].duty.price)} the price is past the {nsw.reducedTo ? formatAud(nsw.reducedTo) : ""} end of the concession, so the couple pay the full{" "}
      {formatAud(house.r.transferDuty)}. The house costs {formatAud(scenario.columns[1].duty.price - scenario.columns[0].duty.price)} more to buy and{" "}
      {formatAud(house.total - town.total)} more in government costs.
    </p>
    <p>
      Both prices sit under the {formatAud(capSydney)} Sydney cap for the 5% Deposit Scheme, so the couple can buy either one with a 5% deposit and no LMI. What decides it is how
      much the lender will lend against their incomes, and whether the extra duty on the house comes out of savings they would rather keep as a buffer.
    </p>
  </>
);

const content: VisaPageContent = {
  slug: "subclass-190",
  short: "Subclass 190",
  blurb: "Skilled Nominated: permanent, state-nominated, and eligible for first home concessions in every state that has them.",
  metaTitle: "Home loans for 190 visa holders: concessions and lenders",
  metaDescription:
    "Buying on a Skilled Nominated 190 visa: no FIRB, first home buyer concessions and the 5% Deposit Scheme, what lenders check, and what state nomination does and doesn't change.",
  h1: (
    <>
      Home loans for <em>190 visa</em> holders
    </>
  ),
  headline: "Home loans for 190 visa holders",
  lede: "The 190 is a permanent visa granted after a state or territory nominates you. For a home loan it works like any other permanent visa. The questions people ask are about the nomination: whether it limits where you buy, and whether the nominating state's rules apply.",
  publishedAt: "2026-10-26",
  updatedAt: "2026-10-26",
  answer: (
    <>
      <p>
        Yes. A 190 is a permanent visa, so you don&rsquo;t need FIRB approval, you can buy an established or a new home, and you can use the first home buyer concessions, grants
        and the 5% Deposit Scheme on the same terms as other permanent residents.
      </p>
      <p>
        The duty you pay depends on the state the property is in, not the state that nominated you. Home Affairs lists no visa condition that requires you to live in the
        nominating state. Any commitment you made to the state as part of your nomination is a migration matter, so check it with a registered migration agent before buying
        interstate.
      </p>
    </>
  ),
  lenders: {
    intro: (
      <p>
        Lenders treat the 190 as a permanent visa. Your application is assessed on income, expenses, debts, deposit and credit history, with a few points that come up more often
        for people who were nominated recently.
      </p>
    ),
    points: [
      {
        title: "Work in your nominated occupation",
        body: "Many 190 holders start a job in their nominated field soon after grant. Lenders are comfortable with a new job in the same line of work. A change of career at the same time as a loan application is harder.",
      },
      {
        title: "Probation periods",
        body: "Policies on probation differ. Some lenders accept a permanent role during probation if you have worked in the same field before; others want probation finished.",
      },
      {
        title: "Two incomes, two histories",
        body: "When a couple both hold 190s, lenders assess each income. If one partner is still job hunting after the move, the loan is sized on one income until the other starts.",
      },
      {
        title: "Savings from before the move",
        body: "Savings held overseas, or moved to Australia recently, need statements that show the money's path. Lenders also want to see some savings history in Australia.",
      },
      {
        title: "Debts in your old country",
        body: "A loan you are still repaying overseas counts as a commitment. Lenders convert the repayments to Australian dollars and include them.",
      },
      {
        title: "Interstate moves",
        body: "If you nominated with one state and now plan to live in another, a lender looks at where your job is. The migration side of that move is a question for a migration agent, not a lender.",
      },
    ],
  },
  firb: (
    <>
      <p>
        You don&rsquo;t need FIRB approval to buy. Holders of permanent visas are exempt from approval for residential land, including established homes. The ban on foreign persons
        buying established dwellings doesn&rsquo;t apply to you.
      </p>
      <p>
        That difference is the main reason the 190 is easier to buy on than the provisional{" "}
        <TextLink href={visaPath("subclass-491")}>491</TextLink>. A 491 holder can only buy a new home with approval; a 190 holder can buy an established house or unit without any
        FIRB step.
      </p>
      <p>
        If you are buying with someone who is on a temporary visa, their status still matters for their share of the property. We go through that combination on the{" "}
        <TextLink href={visaPath("partner-visa")}>partner visa page</TextLink>.
      </p>
    </>
  ),
  states: {
    intro: (
      <p>
        The table applies to every permanent visa, the 190 included. Your nominating state doesn&rsquo;t appear in it: the rules of the state where the property is located apply.
        The only permanent-resident trap is the NSW 200-day test for surcharge purchaser duty.
      </p>
    ),
    after: (
      <>
        <p>
          The first home concessions differ a lot from state to state. In NSW, the First Home Buyers Assistance Scheme removes transfer duty on a home up to{" "}
          {formatAud(nsw.exemptTo ?? 0)} and reduces it up to {nsw.reducedTo ? formatAud(nsw.reducedTo) : ""}. In Victoria the exemption ends at {formatAud(vic.exemptTo ?? 0)}{" "}
          and the concession at {vic.reducedTo ? formatAud(vic.reducedTo) : ""}. A 190 holder nominated by Victoria and buying in Melbourne gets the Victorian thresholds, not the
          NSW ones.
        </p>
        <p>
          Our <TextLink href={PATHS.firstHomeBuyers}>first home buyer guides</TextLink> set out each state&rsquo;s concession, grant and deposit-scheme caps in full.
        </p>
      </>
    ),
  },
  deposit: (
    <>
      <p>
        With a 190 you can use the <strong>5% Deposit Scheme</strong>: a deposit of at least 5%, a Government guarantee for part of the loan, and no LMI, as long as you are a first
        home buyer (or haven&rsquo;t owned property in Australia in the last 10 years), live in the home and buy under the price cap. A couple can apply together if both are
        citizens or permanent residents. There is no income cap.
      </p>
      <p>
        If you are saving inside super, the First Home Super Saver Scheme lets you release voluntary contributions of up to {formatAud(FHSS.maxPerFinancialYear)} a financial year
        and {formatAud(FHSS.maxTotal)} in total, plus earnings, towards a first home deposit. The scheme has its own steps and timing, run through the ATO, so read the official
        page well before you sign a contract.
      </p>
      <p>
        Help to Buy is only for Australian citizens, so it isn&rsquo;t open to you until you become one. Without a scheme, a deposit under 20% usually means paying LMI, which we
        price for your loan before you choose a lender.
      </p>
    </>
  ),
  pathway: {
    title: "A permanent visa, with a nomination behind it",
    body: (
      <>
        <p>
          The 190 is permanent from grant, with a five-year travel facility. You don&rsquo;t need another visa before buying. Citizenship later opens Help to Buy, but most 190
          holders who are ready to buy don&rsquo;t need to wait for it.
        </p>
        <p>
          The nomination is where 190 holders differ from 189 holders. Home Affairs lists no visa condition that requires you to live in the nominating state, and we could not find
          a stated period on the NSW nomination page. If you gave the state any commitment about where you would live when you were nominated, whether it affects a move is a
          question for a registered migration agent. For the loan, what counts is where your income is earned and where the home is.
        </p>
      </>
    ),
  },
  documents: {
    intro: <p>The visa grant notice and VEVO record cover the visa. The rest is the same evidence any borrower provides.</p>,
    extra: ["State or territory nomination letter (some lenders ask to see it)", "Statements for any overseas loans you are still repaying"],
  },
  scenario,
  mistakes: [
    { title: "Using another state's thresholds", body: "The concession depends on where the property is. Numbers you read for NSW don't apply in Victoria or Queensland." },
    { title: "Paying for FIRB advice", body: "Permanent visa holders are exempt from FIRB approval. You don't need an application or a fee." },
    { title: "Buying just over a threshold", body: "In NSW, a few thousand dollars over the concession limit can cost tens of thousands in duty. Check the price bands before you bid." },
    { title: "Moving interstate without checking", body: "If you made a commitment to your nominating state, ask a migration agent before buying in another state." },
  ],
  faqTitle: "Questions about buying on a 190",
  faqs: [
    {
      question: "Do I have to buy in the state that nominated me?",
      answer:
        "Home Affairs lists no visa condition requiring you to live in the nominating state, and the duty rules that apply are those of the state where the property is. If you made a commitment to the state when you were nominated, check it with a registered migration agent before buying elsewhere.",
    },
    {
      question: "Can I get the NSW First Home Buyers Assistance Scheme on a 190?",
      answer: `Yes, if you meet its other conditions. At least one first home buyer must be an Australian citizen or permanent resident, and a 190 holder is a permanent resident. Homes up to ${formatAud(nsw.exemptTo ?? 0)} are exempt and the concession reduces to nothing at ${nsw.reducedTo ? formatAud(nsw.reducedTo) : "the upper threshold"}.`,
    },
    {
      question: "Do lenders treat a 190 like a citizen?",
      answer:
        "Many lenders assess permanent residents on the same policy as citizens. Differences usually come from how recently you arrived: time in your job, Australian credit history and savings history.",
    },
    {
      question: "Do I pay foreign buyer duty on a 190?",
      answer:
        "Not in most states. In NSW, a permanent resident who has spent fewer than 200 days in Australia in the 12 months before the contract can be charged surcharge purchaser duty unless they qualify as an exempt permanent resident.",
    },
    {
      question: "Can my partner and I use the 5% Deposit Scheme together?",
      answer:
        "Yes, if you are both Australian citizens or permanent residents and meet the other criteria. If one of you is on a temporary visa, the joint application doesn't qualify.",
    },
  ],
  related: ["subclass-189", "subclass-491", "permanent-residents", "partner-visa"],
};

export default content;
