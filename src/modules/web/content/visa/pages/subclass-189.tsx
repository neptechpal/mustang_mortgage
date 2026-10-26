import { TextLink } from "../../../components/ui/Button";
import { PATHS } from "../../../config";
import { formatAud } from "../../../format";
import { DEPOSIT_SCHEME } from "../../shared/rules";
import type { VisaPageContent, VisaScenario } from "../types";
import { scenarioFigures, visaPath } from "../VisaArticle";

const capSydney = DEPOSIT_SCHEME.priceCaps.NSW.capital;
const capNswOther = DEPOSIT_SCHEME.priceCaps.NSW.regional;

const scenario: VisaScenario = {
  title: "a new arrival buying a Sydney unit",
  setup: (
    <>
      <p>
        A software engineer was granted a 189 while living overseas and moved to Sydney four months ago. She started a permanent full-time job on arrival and has her deposit in
        an Australian account. She is a first home buyer and wants an established two-bedroom unit for $780,000 using the 5% Deposit Scheme.
      </p>
      <p>
        Because she has been in Australia for fewer than 200 of the last 365 days, the NSW surcharge question comes up. The table shows the costs if she signs now and is treated
        as a foreign person for surcharge purposes, and if she signs once she passes 200 days.
      </p>
    </>
  ),
  columns: [
    {
      label: "Signs now (under 200 days)",
      duty: { state: "NSW", price: 780_000, propertyType: "established", firstHomeBuyer: true, foreignPurchaser: true, ownerOccupier: true, citizenOrPR: true },
    },
    {
      label: "Signs after 200 days",
      duty: { state: "NSW", price: 780_000, propertyType: "established", firstHomeBuyer: true, foreignPurchaser: false, ownerOccupier: true, citizenOrPR: true },
    },
  ],
  depositPct: 5,
  assumptions: [
    "One buyer, a permanent resident and first home buyer, who will live in the unit.",
    "The unit is in a Sydney postcode, under the 5% Deposit Scheme cap for Sydney, so no LMI is payable.",
    "The first column ignores the exempt permanent resident option described below.",
  ],
  after: null,
};

const fig = scenarioFigures(scenario);
const [early, later] = fig.cols;
const deposit = Math.round((scenario.columns[0].duty.price * (scenario.depositPct ?? 5)) / 100);

scenario.after = (
  <>
    <p>
      The First Home Buyers Assistance Scheme removes transfer duty in both columns, because a permanent resident can still qualify for it even when the surcharge applies. The
      difference is surcharge purchaser duty: {formatAud(early.r.surcharge)} if she signs while she is under the 200-day mark, nothing if she waits. Her 5% deposit is{" "}
      {formatAud(deposit)}, so the surcharge would be {early.r.surcharge > deposit ? "more than her entire deposit" : "a large share of her deposit"}.
    </p>
    <p>
      There is a second way out. NSW treats a permanent resident who buys as an individual and lives in the home as their principal place of residence for 200 continuous days
      within 12 months as an &ldquo;exempt permanent resident&rdquo;. It has to be applied for. If she can&rsquo;t wait, her conveyancer should confirm how and when to claim it
      before she signs, so the surcharge is never a surprise at settlement. Her later costs total {formatAud(later.total)}.
    </p>
  </>
);

const content: VisaPageContent = {
  slug: "subclass-189",
  short: "Subclass 189",
  blurb: "Skilled Independent: permanent from day one, with the NSW 200-day rule to watch if you've just arrived.",
  metaTitle: "Home loans for 189 visa holders: first home buyer options",
  metaDescription:
    "Buying a home on a Skilled Independent 189 visa: no FIRB, first home concessions and the 5% Deposit Scheme apply, plus the NSW 200-day surcharge rule for new arrivals.",
  h1: (
    <>
      Home loans for <em>189 visa</em> holders
    </>
  ),
  headline: "Home loans for 189 visa holders",
  lede: "The 189 is a permanent visa, so you buy on much the same terms as an Australian citizen. The exceptions are timing and paperwork: how long you have been here, how long you have been in your job, and the NSW 200-day rule.",
  publishedAt: "2026-10-26",
  updatedAt: "2026-10-26",
  answer: (
    <>
      <p>
        Yes. A 189 is a permanent visa, so you don&rsquo;t need FIRB approval and you can buy an established home or a new one. You can use first home buyer concessions and
        grants in every state that has them, and the 5% Deposit Scheme lets eligible buyers purchase with a 5% deposit and no LMI.
      </p>
      <p>
        Two things catch new arrivals. In NSW, a permanent resident who has spent fewer than 200 days in Australia in the past year can be charged surcharge purchaser duty. And
        lenders look hard at short employment history in Australia. Help to Buy waits until you are a citizen.
      </p>
    </>
  ),
  lenders: {
    intro: (
      <p>
        Many lenders assess a 189 holder on the same policy as a citizen. The questions that change the outcome are less about the visa and more about how recently you arrived.
      </p>
    ),
    points: [
      {
        title: "Your Australian job history",
        body: "A permanent role that you have held for a while is the simplest case. If you started recently, lenders look at probation, your contract and whether you have worked in the same field before arriving.",
      },
      {
        title: "Income earned overseas",
        body: "Lenders generally assess the income you earn in Australia. Salary from a previous job overseas helps explain your history but usually isn't counted towards repayments.",
      },
      {
        title: "Savings that crossed borders",
        body: "Savings moved from overseas need a clear trail from the original account to your Australian one. One documented transfer is easier to assess than many small ones.",
      },
      {
        title: "A new Australian credit file",
        body: "New arrivals often have little or no Australian credit history. That's normal. What matters is that the few accounts you do have, like a phone plan or credit card, are paid on time.",
      },
      {
        title: "Debts back home",
        body: "A car loan, personal loan or mortgage overseas is still a commitment. Lenders count the repayments, converted to Australian dollars, even if the debt doesn't appear on your Australian credit file.",
      },
      {
        title: "Days in Australia (NSW)",
        body: "If you are buying in NSW in your first year, your travel history affects the duty bill. It doesn't change the loan, but it changes how much cash you need at settlement.",
      },
    ],
  },
  firb: (
    <>
      <p>
        You don&rsquo;t need FIRB approval. Holders of permanent visas are exempt from needing approval to buy residential land, and that includes established homes. The
        foreign-buyer ban on established dwellings doesn&rsquo;t apply to you.
      </p>
      <p>
        FIRB&rsquo;s definitions do mention a 200-day test: a permanent visa holder who has been in Australia for 200 days or more in the previous 12 months is &ldquo;ordinarily
        resident&rdquo; and not a foreign person. But the exemption from approval for permanent visa holders is stated without that qualification. In practice the 200-day number
        matters for NSW duty, not for FIRB.
      </p>
      <p>
        If you are buying with a partner who is on a temporary visa, the picture changes for their share. See the{" "}
        <TextLink href={visaPath("partner-visa")}>partner visa guide</TextLink> and the <TextLink href={PATHS.visaHomeLoans}>visa overview</TextLink>.
      </p>
    </>
  ),
  states: {
    intro: (
      <p>
        As a permanent resident you are outside the foreign buyer surcharge in every state except one case: NSW applies surcharge purchaser duty to permanent residents who were in
        Australia for fewer than 200 days in the 12 months before the contract, unless they qualify as an exempt permanent resident. First home concessions and grants are open to
        you wherever they exist.
      </p>
    ),
    after: (
      <>
        <p>
          Victoria, Queensland and Western Australia don&rsquo;t apply a days-in-Australia test to permanent residents for their surcharges. If you hold a 189 and are buying outside
          NSW, the surcharge isn&rsquo;t a concern. Tasmania currently has no first home duty concession for anyone, and the ACT closed its grant in 2019, so those rows read
          &ldquo;no&rdquo; for every buyer, not just visa holders.
        </p>
        <p>
          If you were nominated by a state for a different visa in the past, it doesn&rsquo;t matter here. The 189 is not tied to a state, so you can buy wherever you want to live.
        </p>
      </>
    ),
  },
  deposit: (
    <>
      <p>
        The <strong>5% Deposit Scheme</strong> is the biggest advantage the 189 gives you over a temporary visa. If you are a first home buyer (or haven&rsquo;t owned property in
        Australia in the last 10 years), will live in the home and buy under the price cap, you can buy with a 5% deposit and the Government guarantees part of the loan, so no LMI
        is payable. There are no income caps. The NSW cap is {formatAud(capSydney)} in Sydney and the listed regional centres and {formatAud(capNswOther)} elsewhere in the state.
      </p>
      <p>
        Owning a home overseas doesn&rsquo;t stop you using the scheme: the 10-year test is about property in Australia. It can matter for some state concessions, though. In
        Queensland, for example, the first home concession is only for buyers who have never held an interest in residential land anywhere, overseas included.
      </p>
      <p>
        Without the scheme, a deposit under 20% usually means paying LMI. LMI is a one-off premium that protects the lender, not you, and it is often added to the loan. We
        don&rsquo;t publish LMI estimates because premiums vary by insurer and lender; we get a figure for your loan before you decide.
      </p>
      <p>
        <strong>Help to Buy</strong> is for Australian citizens only, so it isn&rsquo;t available to you until you become a citizen.
      </p>
    </>
  ),
  pathway: {
    title: "Permanent from the start",
    body: (
      <>
        <p>
          The 189 is permanent from the day it is granted, with a five-year travel facility. There is no next visa to wait for, which is why 189 holders can usually buy sooner than
          people on provisional visas.
        </p>
        <p>
          If you came to the 189 from a 491 or 494, Home Affairs requires you to have held that visa for at least three years before applying for the 189. Once the 189 is granted,
          the regional condition of your old visa is no longer relevant to your lending.
        </p>
        <p>
          Citizenship changes two things for a home loan: Help to Buy opens up, and the NSW 200-day test no longer applies. For most 189 holders neither is a reason to wait. Being
          in a stable job for long enough to satisfy lenders usually matters more.
        </p>
      </>
    ),
  },
  documents: {
    intro: <p>For a 189 application, the visa grant notice and VEVO record do most of the visa work. The rest is the usual income and savings evidence.</p>,
    extra: [
      "International movement records, if you are buying in NSW within your first year",
      "Statements from overseas accounts, for savings you transferred",
      "Statements for any loans you still have overseas",
    ],
  },
  scenario,
  mistakes: [
    { title: "Signing in your first months in NSW", body: "If you have been in Australia for under 200 of the last 365 days, check the surcharge position with your conveyancer before you sign." },
    { title: "Applying in week one of a new job", body: "Some lenders accept applicants on probation, others don't. Applying to the wrong one first leaves an enquiry on a new credit file." },
    { title: "Forgetting loans back home", body: "A car loan or mortgage overseas still counts. Leaving it off the application causes problems when it shows up in your bank statements." },
    { title: "Assuming you need FIRB", body: "Permanent visa holders don't need FIRB approval. Paying an adviser to apply for it costs money and time you don't need to spend." },
  ],
  faqTitle: "Questions about buying on a 189",
  faqs: [
    {
      question: "Do I need FIRB approval to buy a house on a 189 visa?",
      answer: "No. Permanent visa holders are exempt from FIRB approval for residential land, including established homes. The ban on foreign buyers purchasing established dwellings does not apply to you.",
    },
    {
      question: "Can I buy a home before I move to Australia?",
      answer:
        "FIRB doesn't stop you, but lenders generally want to see you working in Australia before they lend. In NSW, buying before you have spent 200 days here in the past year can also mean surcharge purchaser duty unless you qualify as an exempt permanent resident.",
    },
    {
      question: "Can I use the 5% Deposit Scheme on a 189?",
      answer: `Yes, if you meet the other criteria: a first home buyer or no property owned in Australia in the last 10 years, living in the home, and a price under the cap (${formatAud(capSydney)} in Sydney). No income caps apply.`,
    },
    {
      question: "I own an apartment overseas. Am I still a first home buyer?",
      answer:
        "It depends on the scheme. The 5% Deposit Scheme and NSW's First Home Buyers Assistance Scheme look at property in Australia. Queensland's first home concession and the ACT's Home Buyer Concession Scheme also count property overseas. We check the rule for the state you are buying in.",
    },
    {
      question: "Will lenders count my salary from my last job overseas?",
      answer:
        "Usually not. Lenders assess the income you earn in Australia. Your overseas work history still helps, because it shows you have worked in the same field before starting your Australian job.",
    },
    {
      question: "Can I get Help to Buy on a 189?",
      answer: "No. Help to Buy requires all applicants to be Australian citizens. You can look at it again once you become a citizen.",
    },
  ],
  related: ["permanent-residents", "subclass-190", "subclass-191", "new-zealand-citizens"],
};

export default content;
