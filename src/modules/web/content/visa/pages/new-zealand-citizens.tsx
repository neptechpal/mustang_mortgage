import { SRC } from "@/modules/seo-data/visas";
import { TextLink } from "../../../components/ui/Button";
import { formatAud } from "../../../format";
import { fhbThresholds } from "../../shared/rules";
import type { VisaPageContent, VisaScenario } from "../types";
import { scenarioFigures, visaPath } from "../VisaArticle";

const qld = fhbThresholds("QLD", "established")!;

const scenario: VisaScenario = {
  title: "two Brisbane homes either side of Queensland's threshold",
  setup: (
    <>
      <p>
        A New Zealand citizen moved to Brisbane three years ago and has lived here since on a Special Category visa. He has never owned property anywhere, works full time and has
        saved a 10% deposit. He is choosing between two established homes: a unit at {formatAud(650_000)} and a townhouse at {formatAud(760_000)}.
      </p>
      <p>Queensland treats a New Zealand citizen holding a 444 when entering the contract as a permanent resident, so its first home concession can apply.</p>
    </>
  ),
  columns: [
    { label: "Unit", duty: { state: "QLD", price: 650_000, propertyType: "established", firstHomeBuyer: true, foreignPurchaser: false, ownerOccupier: true, citizenOrPR: true } },
    { label: "Townhouse", duty: { state: "QLD", price: 760_000, propertyType: "established", firstHomeBuyer: true, foreignPurchaser: false, ownerOccupier: true, citizenOrPR: true } },
  ],
  depositPct: 10,
  assumptions: ["One buyer, a first home buyer with no interest in residential land anywhere, who will live in the home.", "He holds a 444 visa on the contract date."],
  after: null,
};

const fig = scenarioFigures(scenario);
const [unit, town] = fig.cols;

scenario.after = (
  <>
    <p>
      The unit is under Queensland&rsquo;s {qld.exemptTo ? formatAud(qld.exemptTo) : ""} level for established first homes, so no transfer duty is payable and government costs
      are {formatAud(unit.total)}. At {formatAud(scenario.columns[1].duty.price)} the concession steps down, leaving {formatAud(town.r.transferDuty)} of duty, and it ends
      altogether at {qld.reducedTo ? formatAud(qld.reducedTo) : "the upper threshold"}.
    </p>
    <p>
      With a 10% deposit he will pay LMI on either home, unless a participating lender confirms he can use the 5% Deposit Scheme. The scheme&rsquo;s documents don&rsquo;t mention
      New Zealand citizens or the 444 visa, so that is a question to settle with the lender before he relies on it.
    </p>
  </>
);

const content: VisaPageContent = {
  slug: "new-zealand-citizens",
  short: "New Zealand citizens",
  blurb: "Special Category visa (444): no FIRB, state residence tests, first home concessions and the open question on the 5% scheme.",
  metaTitle: "Home loans for New Zealand citizens living in Australia",
  metaDescription:
    "Buying a home in Australia as a New Zealand citizen on a 444 visa: no FIRB approval, state residence tests for surcharges, first home concessions and grants, and what lenders check.",
  h1: (
    <>
      Home loans for <em>New Zealand citizens</em>
    </>
  ),
  headline: "Home loans for New Zealand citizens in Australia",
  lede: "New Zealand citizens usually live here on the Special Category visa (subclass 444), granted on arrival. It is technically a temporary visa, but for buying a home it works much more like permanent residence, with a few state residence tests to watch.",
  publishedAt: "2026-10-26",
  updatedAt: "2026-10-26",
  answer: (
    <>
      <p>
        Yes. New Zealand citizens who hold or are eligible for a 444 visa don&rsquo;t need FIRB approval, and the established-home ban doesn&rsquo;t apply to them. Most states treat
        444 holders like permanent residents for first home concessions and grants.
      </p>
      <p>
        The catches are residence tests. NSW applies surcharge purchaser duty unless you meet a 200-day residence requirement, and Victoria looks at whether you have been ordinarily
        resident here for six consecutive months around settlement. Help to Buy is for Australian citizens only, and whether you can use the 5% Deposit Scheme is something the
        participating lender has to confirm.
      </p>
    </>
  ),
  lenders: {
    intro: (
      <p>
        Many lenders treat a New Zealand citizen living in Australia much like a permanent resident. What they look at most is how settled you are here, and how much of your
        financial life is still in New Zealand.
      </p>
    ),
    points: [
      {
        title: "Time living in Australia",
        body: "A 444 is granted each time you arrive. Lenders look at how long you have been living and working here, not just the visa.",
      },
      {
        title: "Income earned here",
        body: "Lenders assess Australian income. Salary from a New Zealand employer, or rent from a house there, is harder to use and often isn't counted.",
      },
      {
        title: "A New Zealand mortgage",
        body: "If you still own a home in New Zealand, its loan repayments count as a commitment, converted to Australian dollars, and the property is an asset.",
      },
      {
        title: "Credit history",
        body: "Your New Zealand credit history doesn't carry over to an Australian credit file. A few years of Australian accounts in good order help.",
      },
      {
        title: "Savings moved across",
        body: "Money brought from New Zealand needs statements showing it leaving one account and arriving in the other.",
      },
      {
        title: "Your passport",
        body: "The 444 sits on your New Zealand passport. Lenders and some grant schemes ask to see a current one.",
      },
    ],
  },
  firb: (
    <>
      <p>
        New Zealand citizens who are not ordinarily resident in Australia are generally foreign persons. But New Zealand citizens who hold, or are eligible for, a Special Category
        visa are exempt from needing FIRB approval to buy residential land, and that includes established homes during the ban on foreign purchases.
      </p>
      <p>
        If you live here on a 444, you don&rsquo;t need FIRB approval to buy a home, new or established. If you live in New Zealand and are buying from there, check with FIRB
        how the exemption applies to you before you sign.
      </p>
      <p>
        If your partner is not a New Zealand or Australian citizen and holds a temporary visa, their status brings FIRB back in for a joint purchase. The{" "}
        <TextLink href={visaPath("partner-visa")}>partner visa guide</TextLink> explains how joint tenancy changes that.
      </p>
    </>
  ),
  states: {
    intro: (
      <p>
        Each state has its own way of deciding when a New Zealand citizen is &ldquo;foreign&rdquo; for its surcharge, and whether a 444 holder counts as a permanent resident for
        its first home schemes. The table uses each state&rsquo;s rules for 444 holders.
      </p>
    ),
    after: (
      <>
        <ul>
          <li>
            <strong>NSW:</strong> not a foreign person for surcharge if you meet the residence requirement: 200 days in Australia in the 12 months before the contract, or living in
            the property for 200 continuous days within 12 months. For the First Home Owner Grant you must be living in Australia at the commencement date.
          </li>
          <li>
            <strong>Victoria:</strong> from 26 November 2025, a New Zealand citizen is not foreign if ordinarily resident here for six consecutive months within the 12 months before
            or after settlement. The first home grant is open to New Zealand citizens whether or not they hold a 444.
          </li>
          <li>
            <strong>Queensland:</strong> a New Zealand citizen holding a 444 when entering the transaction is a permanent resident for its additional foreign acquirer duty and first
            home schemes.
          </li>
          <li>
            <strong>Western Australia:</strong> a 444 holder is not a foreign individual. Its first home owner grant rules also refer to an intention to reside permanently in
            Australia, read from an older version of the Act, so confirm that point with RevenueWA.
          </li>
          <li>
            <strong>Tasmania:</strong> a 444 holder is not a foreign natural person, and must be living in Australia when applying for the grant.
          </li>
        </ul>
        <p>The ACT and the NT charge no foreign buyer surcharge on duty. South Australia shows &ldquo;Confirm&rdquo; because we couldn&rsquo;t verify its pages directly.</p>
      </>
    ),
  },
  deposit: (
    <>
      <p>
        The 5% Deposit Scheme is for Australian citizens and permanent residents. Its documents define &ldquo;permanent resident&rdquo; by reference to Australian citizenship law
        and don&rsquo;t mention New Zealand citizens or the 444 visa. We don&rsquo;t state either way whether you qualify: the participating lender confirms eligibility, so we ask
        before building a plan around a 5% deposit.
      </p>
      <p>
        Help to Buy requires all applicants to be Australian citizens, so it isn&rsquo;t available to New Zealand citizens who haven&rsquo;t taken out Australian citizenship.
      </p>
      <p>
        On a standard loan, lenders that treat you like a permanent resident apply their usual deposit rules, with LMI above 80% of the value. If a lender treats you as a temporary
        resident instead, expect a lower maximum LVR. That difference is one reason lender choice matters for New Zealand citizens.
      </p>
    </>
  ),
  pathway: {
    title: "Permanent residence and citizenship",
    body: (
      <>
        <p>
          You don&rsquo;t need to change visas to buy a home. Some New Zealand citizens apply for Australian permanent residence anyway; the{" "}
          <TextLink href={visaPath("subclass-189")}>subclass 189</TextLink> has a New Zealand stream (see the{" "}
          <TextLink href={SRC.ha189} external>
            Home Affairs 189 page
          </TextLink>
          ). Permanent residence would settle the 5% Deposit Scheme question, and Australian citizenship would open Help to Buy.
        </p>
        <p>
          Whether that is worth doing for you is a migration question, and one for a registered migration agent. For the home loan itself, the 444 is usually enough.
        </p>
      </>
    ),
  },
  documents: {
    intro: <p>For a New Zealand citizen the passport does the visa work. The rest is standard.</p>,
    extra: ["Statements and loan details for any property you own in New Zealand"],
  },
  scenario,
  mistakes: [
    { title: "Assuming the 444 is temporary for everything", body: "For FIRB and most first home schemes, a 444 holder is treated much like a permanent resident." },
    { title: "Buying in NSW right after arriving", body: "Check the 200-day residence requirement before you sign, or plan to live in the home for 200 continuous days." },
    { title: "Relying on the 5% scheme without asking", body: "Have the participating lender confirm eligibility before you plan around a 5% deposit." },
    { title: "Leaving out the house in New Zealand", body: "A home and mortgage in New Zealand count in the assessment, and can affect first home status in some states." },
  ],
  faqTitle: "Questions from New Zealand citizens",
  faqs: [
    {
      question: "Do New Zealand citizens need FIRB approval to buy a house in Australia?",
      answer:
        "Not if you hold or are eligible for a Special Category visa (subclass 444). You are exempt from FIRB approval for residential land, including established homes during the foreign-buyer ban.",
    },
    {
      question: "Can I get the NSW First Home Buyers Assistance Scheme as a New Zealand citizen?",
      answer:
        "Yes, if you meet its other conditions. For the scheme, a permanent resident includes a New Zealand citizen holding a special category visa.",
    },
    {
      question: "Do I pay foreign buyer duty in NSW as a New Zealand citizen?",
      answer:
        "Not if you meet the residence requirement: 200 days in Australia in the 12 months before the contract, or living in the property for 200 continuous days within 12 months of it.",
    },
    {
      question: "Can New Zealand citizens use the 5% Deposit Scheme?",
      answer: "The scheme's documents don't mention New Zealand citizens or the 444 visa. The participating lender confirms eligibility, so ask before relying on it.",
    },
    {
      question: "I own a house in New Zealand. Am I a first home buyer here?",
      answer:
        "It depends on the scheme. NSW's First Home Buyers Assistance Scheme looks at property in Australia. Queensland's first home concession and the ACT's Home Buyer Concession Scheme also count property overseas.",
    },
  ],
  related: ["permanent-residents", "subclass-189", "partner-visa", "subclass-190"],
};

export default content;
