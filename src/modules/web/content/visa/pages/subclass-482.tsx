import { TextLink } from "../../../components/ui/Button";
import { formatAud } from "../../../format";
import { fhogFor, firbNewDwellingFee } from "../../shared/rules";
import type { VisaPageContent, VisaScenario } from "../types";
import { banFrom, banTo, scenarioFigures, visaPath } from "../VisaArticle";

const scenario: VisaScenario = {
  title: "an off-the-plan apartment in Sydney",
  setup: (
    <>
      <p>
        A hospital pharmacist holds a 482 in the Core Skills stream and has worked for her sponsoring employer in Sydney for 18 months. She is single, has never owned property and
        has saved enough for a 20% deposit. She is looking at a two-bedroom apartment off the plan in Parramatta for {formatAud(720_000)}, from a developer that does not hold a
        FIRB exemption certificate.
      </p>
      <p>
        The table compares buying now on the 482 with buying the same apartment after a 186 (Temporary Residence Transition) is granted, which she expects to be eligible for after
        two years with her employer.
      </p>
    </>
  ),
  columns: [
    {
      label: "Buys now on the 482",
      duty: { state: "NSW", price: 720_000, propertyType: "off-the-plan", firstHomeBuyer: true, foreignPurchaser: true, ownerOccupier: true, citizenOrPR: false },
      firbFee: true,
    },
    {
      label: "Buys after the 186",
      duty: { state: "NSW", price: 720_000, propertyType: "off-the-plan", firstHomeBuyer: true, foreignPurchaser: false, ownerOccupier: true, citizenOrPR: true },
    },
  ],
  depositPct: 20,
  assumptions: [
    "One buyer, a first home buyer, who will live in the apartment.",
    "After the 186 she meets the NSW 200-day residence test for permanent residents.",
  ],
  after: null,
};

const fig = scenarioFigures(scenario);
const [now, later] = fig.cols;
const nswFhog = fhogFor("NSW");
const fee = firbNewDwellingFee(scenario.columns[0].duty.price);

scenario.after = (
  <>
    <p>
      Buying now, her government costs are {formatAud(now.total)}: transfer duty, {formatAud(now.r.surcharge)} of surcharge purchaser duty and a {fee.fee ? formatAud(fee.fee) : ""}{" "}
      FIRB fee. After the 186 the same apartment costs {formatAud(later.total)} in government charges, because the First Home Buyers Assistance Scheme removes transfer duty and
      the surcharge and FIRB fee fall away.
    </p>
    <p>
      Two NSW details matter for off-the-plan buyers on a 482. Owner-occupiers buying off the plan can normally defer paying duty, but not if any purchaser is a foreign person.
      And because surcharge purchaser duty is refunded when you are no longer a foreign person at the date of transfer, a 186 granted before settlement could bring the
      surcharge back. The First Home Owner (New Homes) Grant isn&rsquo;t available in either column, because {formatAud(scenario.columns[0].duty.price)} is above its{" "}
      {nswFhog?.priceCap ? formatAud(nswFhog.priceCap) : ""} price cap.
    </p>
  </>
);

const content: VisaPageContent = {
  slug: "subclass-482",
  short: "Subclass 482",
  blurb: "Skills in Demand (employer sponsored): new homes only with FIRB approval, surcharges, and the 186 pathway.",
  metaTitle: "Home loans for 482 visa holders: what you can buy and costs",
  metaDescription:
    "Buying on a 482 Skills in Demand visa: FIRB approval, new homes only until 2029, state foreign buyer surcharges, what lenders check about your sponsor, and the 186 pathway.",
  h1: (
    <>
      Home loans for <em>482 visa</em> holders
    </>
  ),
  headline: "Home loans for 482 visa holders",
  lede: "The 482 Skills in Demand visa is a temporary, employer-sponsored visa. You can borrow to buy a home on it, anywhere in Australia, but the home has to be new, you need FIRB approval, and in most states you pay a foreign buyer surcharge.",
  publishedAt: "2026-10-26",
  updatedAt: "2026-10-26",
  answer: (
    <>
      <p>
        Yes, with conditions. As a temporary resident you are a foreign person for FIRB, so you need approval before buying and, until {banTo()}, you can only buy a new home or
        vacant land. The 482 has no regional condition, so the home can be in a capital city.
      </p>
      <p>
        Most states charge 482 holders a foreign buyer surcharge on top of duty, and first home concessions generally need a citizen or permanent resident on the purchase. Lenders
        that accept 482 applications look closely at your sponsor, your visa expiry and your deposit. Many 482 holders compare buying now with waiting for a 186.
      </p>
    </>
  ),
  lenders: {
    intro: (
      <p>
        On a 482 your income depends on a sponsoring employer, and lenders build that into the assessment. Here is what they look at beyond the usual income, expenses and debts.
      </p>
    ),
    points: [
      {
        title: "Your sponsor and your role",
        body: "Lenders want to know who sponsors you, how long you have been with them and whether the role is ongoing. An employer letter confirming your position and salary is common.",
      },
      {
        title: "Visa expiry against the loan",
        body: "The 482 can be granted for up to four years (five for Hong Kong passport holders). Lenders look at how long is left and at your plans, such as a 186 application.",
      },
      {
        title: "Which stream you are in",
        body: "Core Skills, Specialist Skills and Labour Agreement are all 482 streams. If you still hold a Temporary Skill Shortage 482, the visa this one replaced, tell us so we describe it correctly to the lender.",
      },
      {
        title: "A larger deposit",
        body: "Lenders that accept temporary residents often cap the loan at a lower LVR than for citizens. Plan on more than the minimum a citizen would need.",
      },
      {
        title: "FIRB approval",
        body: "Expect the lender to want your FIRB approval letter, or the developer's exemption certificate, before settlement.",
      },
      {
        title: "Overtime and allowances",
        body: "Base salary is the simplest income to assess. Overtime, shift allowances and bonuses are counted differently by each lender, often only part of them.",
      },
    ],
  },
  firb: (
    <>
      <p>
        A 482 holder is a temporary resident and therefore a foreign person for FIRB. Being in Australia for most of the year doesn&rsquo;t change that.
      </p>
      <p>
        <strong>Established homes are banned until the ban ends.</strong> From {banFrom()} to {banTo()}, foreign persons, including temporary residents, are generally prohibited
        from buying established dwellings. Temporary residents can no longer get approval to buy an established home to live in, which they could apply for before the ban.
      </p>
      <p>
        <strong>New homes and vacant land need approval.</strong> For a new dwelling or vacant land you need FIRB approval and pay an application fee, which rises with the price
        (see Sources). For a home up to {fee.upTo ? formatAud(fee.upTo) : "the first fee tier"}, the 2026-27 fee is {fee.fee ? formatAud(fee.fee) : "on the FIRB fees page"}. On
        vacant land, the home must be finished within four years. If the developer holds a New or Near-New Dwelling Exemption Certificate for the project, you don&rsquo;t need your
        own approval.
      </p>
      <p>
        Foreign owners also pay an annual vacancy fee if a home they bought isn&rsquo;t lived in or genuinely available to rent for at least 183 days a year. That matters if a job
        move takes you to another city before you sell.
      </p>
      <p>
        If your spouse is an Australian citizen or permanent resident and you buy together as joint tenants, FIRB approval isn&rsquo;t needed. The guidance we checked doesn&rsquo;t
        say whether that also allows an established home during the ban, so confirm with FIRB first.
      </p>
    </>
  ),
  states: {
    intro: (
      <p>
        The 482 is treated as a temporary visa in every state. That means a foreign buyer surcharge where a state has one, and first home concessions only if a citizen or
        permanent resident buys with you.
      </p>
    ),
    after: (
      <>
        <p>
          Because the 482 doesn&rsquo;t restrict where you live, it&rsquo;s worth knowing which states don&rsquo;t charge a surcharge: the ACT and the NT have none on duty. FIRB
          approval and the established-home ban still apply in both.
        </p>
        <p>
          Status is tested differently. NSW refunds surcharge purchaser duty if you are no longer a foreign person on the date of transfer, and Victoria treats you as not foreign if
          you hold permanent residence by settlement. Queensland fixes your status at the contract date, with no refund if permanent residence comes later. If a 186 is close, the
          state and the settlement date both matter.
        </p>
      </>
    ),
  },
  deposit: (
    <>
      <p>
        The 5% Deposit Scheme isn&rsquo;t available on a 482: every applicant has to be an Australian citizen or permanent resident. Help to Buy is for citizens only. That leaves a
        standard loan, usually with a larger deposit than a citizen would need and LMI if you borrow more than 80% of the value.
      </p>
      <p>
        Your deposit has to cover the extra costs too. In the NSW scenario below, the surcharge and the FIRB fee together add {formatAud(now.r.surcharge + (now.firb?.fee ?? 0))}.
        Saving for those costs on top of the deposit is why we compare buying now with waiting for the 186.
      </p>
      <p>We don&rsquo;t publish maximum LVRs for the 482 because they differ by lender and change. We confirm the current limits at your consultation.</p>
    </>
  ),
  pathway: {
    title: "From the 482 to the 186",
    body: (
      <>
        <p>
          The usual route to permanent residence from a 482 is the <TextLink href={visaPath("subclass-186")}>Employer Nomination Scheme visa (subclass 186)</TextLink>,
          Temporary Residence Transition stream. It usually needs two years of full-time sponsored employment in the three years before you apply.
        </p>
        <p>Once the 186 is granted:</p>
        <ul>
          <li>You no longer need FIRB approval, and you can buy an established home.</li>
          <li>The foreign buyer surcharges no longer apply (in NSW, once you meet the 200-day residence test).</li>
          <li>First home concessions, grants and the 5% Deposit Scheme open up if you are a first home buyer.</li>
        </ul>
        <p>
          The Skills in Demand visa replaced the Temporary Skill Shortage visa on 7 December 2024. TSS applications lodged on or before 6 December 2024 are decided under the TSS
          rules. Ask a registered migration agent how your own visa history affects the 186; we look at the lending.
        </p>
      </>
    ),
  },
  documents: {
    intro: <p>Lenders add sponsor and FIRB documents to the standard list for a 482 application.</p>,
    extra: [
      "FIRB approval letter, or the developer's New or Near-New Dwelling Exemption Certificate",
      "Employer letter confirming your role, salary and sponsorship",
    ],
  },
  scenario,
  mistakes: [
    { title: "Paying a deposit on an established home", body: `While the ban runs (to ${banTo()}), a 482 holder can't get approval to buy an established dwelling.` },
    { title: "Budgeting for duty only", body: "The surcharge and the FIRB fee can add more than transfer duty itself. Price them in before you choose a home." },
    { title: "Changing jobs mid-application", body: "Your visa and your income both rest on your sponsor. Talk to us before you change employer during a purchase." },
    { title: "Expecting a duty deferral off the plan", body: "NSW's off-the-plan duty deferral is not available if any purchaser is a foreign person." },
  ],
  faqTitle: "Questions about buying on a 482",
  faqs: [
    {
      question: "Can I buy a house on a 482 visa?",
      answer: `You can buy a new house, or vacant land to build on, with FIRB approval. An established house isn't possible while the ban on foreign persons buying established dwellings applies (${banFrom()} to ${banTo()}).`,
    },
    {
      question: "Can I buy in Sydney on a 482?",
      answer: "Yes. Unlike the 491 and 494, the 482 has no regional condition, so you can buy a new home in a capital city, subject to FIRB approval.",
    },
    {
      question: "How much time needs to be left on my 482?",
      answer:
        "There is no single rule. Each lender sets its own policy on visa time remaining, and some also look at your plans for a 186. We check current policy for your dates before you apply.",
    },
    {
      question: "Can I get the NSW first home buyer concession on a 482?",
      answer:
        "Not on your own. At least one first home buyer must be an Australian citizen or permanent resident. If you buy with a citizen or PR partner, the concession can apply, but you still pay surcharge purchaser duty on your share.",
    },
    {
      question: "Does my employer have to be involved in my home loan?",
      answer: "Not formally, but many lenders ask for an employer letter confirming your role and salary. Your payslips and visa grant notice cover the rest.",
    },
  ],
  related: ["subclass-186", "bridging-visa", "subclass-494", "partner-visa"],
};

export default content;
