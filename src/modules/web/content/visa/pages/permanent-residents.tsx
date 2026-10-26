import { RULES } from "@/modules/calc/rules";
import { TextLink } from "../../../components/ui/Button";
import { PATHS } from "../../../config";
import { formatAud } from "../../../format";
import { DEPOSIT_SCHEME } from "../../shared/rules";
import type { VisaPageContent, VisaScenario } from "../types";
import { scenarioFigures, visaPath } from "../VisaArticle";

const nswRate = RULES.NSW.foreignSurcharge.ratePct;

const scenario: VisaScenario = {
  title: "the same purchase in NSW and Victoria after a long trip",
  setup: (
    <>
      <p>
        A permanent resident has lived in Australia for six years but spent seven of the last twelve months overseas caring for a parent. Back at work, he wants to buy his first
        home, an established apartment for {formatAud(700_000)}. He is weighing Sydney against Melbourne, where his employer also has an office.
      </p>
      <p>
        Because he has been in Australia for fewer than 200 of the last 365 days, NSW treats him as a foreign person for surcharge purchaser duty unless he qualifies as an exempt
        permanent resident. Victoria has no days-in-Australia test for permanent residents.
      </p>
    </>
  ),
  columns: [
    {
      label: "Sydney (under 200 days)",
      duty: { state: "NSW", price: 700_000, propertyType: "established", firstHomeBuyer: true, foreignPurchaser: true, ownerOccupier: true, citizenOrPR: true },
    },
    {
      label: "Melbourne",
      duty: { state: "VIC", price: 700_000, propertyType: "established", firstHomeBuyer: true, foreignPurchaser: false, ownerOccupier: true, citizenOrPR: true },
    },
  ],
  depositPct: 10,
  assumptions: [
    "One buyer, a permanent resident and first home buyer, who will live in the apartment.",
    "The NSW column assumes he does not claim the exempt permanent resident treatment described below.",
  ],
  after: null,
};

const fig = scenarioFigures(scenario);
const [syd, mel] = fig.cols;

scenario.after = (
  <>
    <p>
      In Sydney the First Home Buyers Assistance Scheme still removes transfer duty, because a permanent resident keeps that concession even when the surcharge applies. But
      surcharge purchaser duty of {formatAud(syd.r.surcharge)} pushes his government costs to {formatAud(syd.total)}. In Melbourne he pays reduced first home duty of{" "}
      {formatAud(mel.r.transferDuty)} and no foreign purchaser additional duty, for {formatAud(mel.total)} in total.
    </p>
    <p>
      He doesn&rsquo;t have to move states to fix it. In NSW he can wait until he has 200 days in Australia in the 12 months before he signs, or buy as an individual, live in the
      apartment as his home for 200 continuous days within 12 months of the contract, and apply to be treated as an exempt permanent resident. His conveyancer should confirm how
      the claim is lodged before he signs.
    </p>
  </>
);

const content: VisaPageContent = {
  slug: "permanent-residents",
  short: "Permanent residents",
  blurb: "Any permanent visa: no FIRB, full access to first home schemes, and the NSW 200-day rule explained.",
  metaTitle: "Home loans for permanent residents in Australia",
  metaDescription:
    "Buying a home as a permanent resident: no FIRB approval, first home concessions and the 5% Deposit Scheme, how lenders assess PRs, and the NSW 200-day surcharge rule.",
  h1: (
    <>
      Home loans for <em>permanent residents</em>
    </>
  ),
  headline: "Home loans for permanent residents",
  lede: "Whatever the subclass, a permanent visa puts you on close to the same footing as a citizen when you buy a home. This page covers what is the same, what is different, and the one rule that catches permanent residents who travel: the NSW 200-day test.",
  publishedAt: "2026-10-26",
  updatedAt: "2026-10-26",
  answer: (
    <>
      <p>
        Yes. Permanent residents don&rsquo;t need FIRB approval, can buy established or new homes, and can use first home concessions, grants and the 5% Deposit Scheme where they
        meet the other criteria. Many lenders assess permanent residents the same way as citizens.
      </p>
      <p>
        The differences are narrow. Help to Buy is for citizens only. And in NSW, a permanent resident who was in Australia for fewer than 200 days in the 12 months before the
        contract can be charged surcharge purchaser duty at {nswRate}% unless they qualify as an exempt permanent resident.
      </p>
    </>
  ),
  lenders: {
    intro: (
      <p>
        Lenders care about the visa being permanent, and after that they assess you like anyone else. What varies is how long you have been settled here, and that shows up in a
        few places.
      </p>
    ),
    points: [
      {
        title: "Permanent visa, any subclass",
        body: "Skilled, employer, family or other permanent visas are assessed the same way by most lenders. The grant notice and VEVO record confirm it.",
      },
      {
        title: "Time back after a long trip",
        body: "If you have just returned after months overseas, lenders want to see you back in your job and your income flowing into Australian accounts again.",
      },
      {
        title: "Income from overseas",
        body: "Rent from a property overseas or income from a business abroad is hard to use. Some lenders count part of it with strong evidence; many don't count it at all.",
      },
      {
        title: "Property overseas",
        body: "A home you own overseas, and any loan on it, goes into the assessment as an asset and a commitment. It can also affect some state first home concessions.",
      },
      {
        title: "A partner on a temporary visa",
        body: "If your partner is on a temporary visa, their status affects FIRB, duty and scheme eligibility for the purchase, even though yours doesn't.",
      },
      {
        title: "Credit history",
        body: "Someone who has been a PR for years usually has a full Australian credit file. Recent arrivals may not, which is normal but worth knowing before you apply.",
      },
    ],
  },
  firb: (
    <>
      <p>
        Permanent visa holders are exempt from needing FIRB approval to buy residential land, and the exemption includes established homes. The ban on foreign persons buying
        established dwellings doesn&rsquo;t apply to you.
      </p>
      <p>
        You will see &ldquo;ordinarily resident&rdquo; and &ldquo;200 days&rdquo; in the foreign investment rules. Under that law, a permanent visa holder who has been in
        Australia for 200 days or more in the previous 12 months is ordinarily resident and not a foreign person. FIRB&rsquo;s exemption for permanent visa holders doesn&rsquo;t
        depend on it. The same 200-day idea does matter for NSW duty, covered below.
      </p>
      <p>
        If your spouse holds a temporary visa and you buy together as joint tenants, FIRB approval isn&rsquo;t needed for them either. See the{" "}
        <TextLink href={visaPath("partner-visa")}>partner visa guide</TextLink> for how the rest of that purchase works.
      </p>
    </>
  ),
  states: {
    intro: (
      <p>
        Permanent residents pay no foreign buyer surcharge in most states and can use first home concessions and grants where they exist. NSW is the exception for the surcharge:
        it applies its 200-day test to permanent residents.
      </p>
    ),
    after: (
      <>
        <h3>The NSW 200-day test in practice</h3>
        <p>
          NSW treats a permanent resident as a foreign person for surcharge purchaser duty unless they were in Australia for at least 200 days in the 12 months before the contract.
          There is a second route: buy as an individual, live in the property as your principal place of residence for 200 continuous days within 12 months of the contract, and
          apply to be treated as an exempt permanent resident.
        </p>
        <p>
          You can count your days from your international movement records, which you can request from Home Affairs. Count back 12 months from the date you expect to sign, not
          from today. If you are close to the line, a short delay before signing can save the whole surcharge.
        </p>
        <p>
          Victoria, Queensland, Western Australia and Tasmania don&rsquo;t apply a days test to permanent residents for their surcharges, and the ACT and the NT charge no surcharge
          on duty. South Australia reads &ldquo;Confirm&rdquo; in the table only because we couldn&rsquo;t check its residency rules directly.
        </p>
        <p>
          Each state&rsquo;s first home concession and grant has its own thresholds. Our <TextLink href={PATHS.firstHomeBuyers}>first home buyer guides</TextLink> set them out
          state by state.
        </p>
      </>
    ),
  },
  deposit: (
    <>
      <p>
        As a permanent resident you can use the <strong>5% Deposit Scheme</strong>: buy with a deposit of at least 5%, with a Government guarantee in place of LMI, if you are a
        first home buyer or haven&rsquo;t owned property in Australia in the last 10 years. You must live in the home, and the price must be under the cap for the area (in NSW,{" "}
        {formatAud(DEPOSIT_SCHEME.priceCaps.NSW.capital)} in Sydney and the listed regional centres). Joint applicants must both be citizens or permanent residents.
      </p>
      <p>
        Single parents and legal guardians can use the scheme&rsquo;s single parent stream with a deposit from {DEPOSIT_SCHEME.singleParent.minDepositPct}%, and don&rsquo;t need
        to be first home buyers.
      </p>
      <p>
        Help to Buy, the Government shared-equity scheme, requires every applicant to be an Australian citizen, so it opens to you only after citizenship. Outside the schemes, a
        deposit under 20% generally means LMI.
      </p>
    </>
  ),
  pathway: {
    title: "Citizenship, and what it changes",
    body: (
      <>
        <p>For a home loan, becoming a citizen changes two things:</p>
        <ul>
          <li>Help to Buy becomes available, if you meet its income and price caps and don&rsquo;t own property in Australia or overseas.</li>
          <li>The NSW 200-day test no longer applies, because citizens are exempt from surcharge purchaser duty.</li>
        </ul>
        <p>
          Everything else stays the same: FIRB, first home concessions, grants and the 5% Deposit Scheme already treat you like a citizen. If your only reason to wait for
          citizenship is the home loan, it is usually not a strong one. The exception is someone who travels a lot and wants to buy in NSW.
        </p>
      </>
    ),
  },
  documents: {
    intro: <p>Permanent residents provide the standard documents. If you are buying in NSW after time overseas, add your movement records.</p>,
    extra: ["Statements and loan details for any property you own overseas"],
  },
  scenario,
  mistakes: [
    { title: "Counting days from today", body: "The NSW test counts the 12 months before the contract date. Work it out for the day you expect to sign." },
    { title: "Assuming a partner's visa doesn't matter", body: "A partner on a temporary visa changes FIRB, duty and scheme eligibility for a joint purchase." },
    { title: "Leaving overseas debts off", body: "Loans on property overseas still count. Lenders find them in bank statements if you don't list them." },
    { title: "Waiting for citizenship by default", body: "Apart from Help to Buy and the NSW day count, citizenship doesn't change your home loan options." },
  ],
  faqTitle: "Questions from permanent residents",
  faqs: [
    {
      question: "Do permanent residents need FIRB approval to buy a house?",
      answer: "No. Permanent visa holders are exempt from FIRB approval for residential land, including established homes.",
    },
    {
      question: "I spent most of last year overseas. Do I pay surcharge in NSW?",
      answer:
        "Possibly. NSW charges surcharge purchaser duty to a permanent resident who was in Australia for fewer than 200 days in the 12 months before the contract, unless you buy as an individual, live in the home for 200 continuous days within 12 months and apply as an exempt permanent resident.",
    },
    {
      question: "How do I prove how many days I have been in Australia?",
      answer: "Your international movement records, which you can request from the Department of Home Affairs, show each arrival and departure. Lenders and conveyancers may ask for them.",
    },
    {
      question: "Do lenders treat permanent residents the same as citizens?",
      answer:
        "Many do. Differences tend to come from how long you have been working in Australia, your Australian credit history and any income or debts overseas, not from the visa itself.",
    },
    {
      question: "Can a permanent resident use Help to Buy?",
      answer: "No. Help to Buy requires all applicants to be Australian citizens. The 5% Deposit Scheme is open to permanent residents.",
    },
    {
      question: "My partner is on a temporary visa. Can we buy together?",
      answer:
        "Yes, but their visa changes parts of the purchase. If you are spouses and buy as joint tenants, FIRB approval isn't needed. First home concessions can apply because you are a PR, but surcharges may apply to their share and the 5% Deposit Scheme isn't available to the couple.",
    },
  ],
  related: ["subclass-189", "subclass-190", "partner-visa", "new-zealand-citizens"],
};

export default content;
