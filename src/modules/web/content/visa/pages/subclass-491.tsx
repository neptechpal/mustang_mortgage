import { SRC } from "@/modules/seo-data/visas";
import { TextLink } from "../../../components/ui/Button";
import { formatAud } from "../../../format";
import { fhogFor } from "../../shared/rules";
import type { VisaPageContent, VisaScenario } from "../types";
import { banFrom, banOriginalTo, banTo, scenarioFigures, visaPath } from "../VisaArticle";

const scenario: VisaScenario = {
  title: "a new townhouse in regional NSW",
  setup: (
    <>
      <p>
        A couple both hold 491 visas: one was nominated by NSW, the other is the secondary applicant. They live and work in a city in the Hunter region, inside a designated
        regional area, and have held the visa for two years. Neither has owned property. They have found a new three-bedroom townhouse, sold by the developer, and have saved a
        20% deposit.
      </p>
      <p>The table compares buying now, on the 491, with buying the same home after both have been granted the 191.</p>
    </>
  ),
  columns: [
    {
      label: "On the 491 today",
      duty: { state: "NSW", price: 650_000, propertyType: "new", firstHomeBuyer: true, foreignPurchaser: true, ownerOccupier: true, citizenOrPR: false },
      firbFee: true,
    },
    {
      label: "After the 191 is granted",
      duty: { state: "NSW", price: 650_000, propertyType: "new", firstHomeBuyer: true, foreignPurchaser: false, ownerOccupier: true, citizenOrPR: true },
    },
  ],
  depositPct: 20,
  assumptions: [
    "Both buyers are first home buyers and will live in the home.",
    "The developer does not hold a New or Near-New Dwelling Exemption Certificate, so the couple need their own FIRB approval.",
    "After the 191, both buyers meet the NSW 200-day residence test for permanent residents.",
  ],
  after: null,
};

const fig = scenarioFigures(scenario);
const [now, later] = fig.cols;
const nswFhog = fhogFor("NSW");
const extraNow = now.r.surcharge + (now.firb?.fee ?? 0);

scenario.after = (
  <>
    <p>
      On the 491, the government costs come to {formatAud(now.total)}. After the 191 they fall to {formatAud(later.total)}, because surcharge purchaser duty and the FIRB
      fee no longer apply and the First Home Buyers Assistance Scheme removes transfer duty at this price. The surcharge and FIRB fee alone add {formatAud(extraNow)}, on top of
      the 20% deposit.
    </p>
    <p>
      The First Home Owner (New Homes) Grant doesn&rsquo;t help in either column: at {formatAud(scenario.columns[0].duty.price)} the price is above the grant&rsquo;s{" "}
      {nswFhog?.priceCap ? formatAud(nswFhog.priceCap) : ""} cap.
    </p>
    <p>
      Timing can change the result. Revenue NSW refunds surcharge purchaser duty if you are no longer a foreign person on the date the property is transferred to you. A couple
      who sign for an off-the-plan home today and are granted the 191 before settlement may get the surcharge back. FIRB approval would still be needed when they sign. We map
      these dates out with you before you commit.
    </p>
  </>
);

const content: VisaPageContent = {
  slug: "subclass-491",
  short: "Subclass 491",
  blurb: "Skilled Work Regional (Provisional): FIRB, the new-home rule, condition 8579 and the move to the 191.",
  metaTitle: "Home loans for 491 visa holders: FIRB, duty and the 191",
  metaDescription:
    "Can 491 visa holders buy a house? Yes, a new home in a regional area, with FIRB approval. What lenders check, state surcharges, deposit and LMI, and what changes at the 191.",
  h1: (
    <>
      Home loans for <em>491 visa</em> holders
    </>
  ),
  headline: "Home loans for 491 visa holders",
  lede: "The 491 is a five-year provisional visa with a regional condition. You can buy a home on it, but only a new one, with FIRB approval, in an area where the visa lets you live.",
  publishedAt: "2026-10-26",
  updatedAt: "2026-10-26",
  answer: (
    <>
      <p>
        Yes, but with limits. The 491 is a temporary visa, so for FIRB you are a foreign person. You need FIRB approval to buy, and until {banTo()} you can only buy a new home or
        vacant land, not an established one. Condition 8579 means the home you live in must be in a designated regional area.
      </p>
      <p>
        In most states you also pay a foreign buyer surcharge on top of transfer duty and can&rsquo;t use first home concessions unless a co-buyer is a citizen or permanent
        resident. Fewer lenders accept 491 applications, and those that do often want a larger deposit. Many 491 holders compare buying now with waiting for the 191.
      </p>
    </>
  ),
  lenders: {
    intro: (
      <p>
        A 491 application gets the same questions as any other: income, living expenses, debts, deposit and credit file. On top of that come the visa questions, and those decide
        which lenders will look at the application at all.
      </p>
    ),
    points: [
      {
        title: "Time left on the visa",
        body: "The 491 runs for five years and can't be extended. Lenders read your grant and expiry dates from VEVO. Some are more comfortable once you are close to the three years needed for the 191.",
      },
      {
        title: "Where you live and work",
        body: "Condition 8579 ties you to a designated regional area. Lenders check that your job and the property both fit the condition. A regional job with a city property raises questions.",
      },
      {
        title: "How you are employed",
        body: "Permanent full-time work past probation is the simplest to assess. Casual, contract and newly started roles narrow the lender list. So does income from a business you own.",
      },
      {
        title: "Where the deposit came from",
        body: "Lenders want savings built up over time and a clear source for any large amount. Money sent from overseas needs a paper trail: the sending account, the transfer and, for a gift, a signed letter.",
      },
      {
        title: "FIRB approval in hand",
        body: "As a foreign person you need FIRB approval to buy. Expect the lender to ask for the approval letter, or the developer's exemption certificate, before settlement.",
      },
      {
        title: "Your Australian credit file",
        body: "A short credit history is normal for people who arrived recently. Missed payments on a phone plan or a buy now pay later account do more harm than a thin file.",
      },
    ],
    outro: (
      <p>
        Lender policy for temporary residents changes more often than most, so we check it at the time you apply rather than relying on a list from last year. We do that before
        you pay a holding deposit or sign anything.
      </p>
    ),
  },
  firb: (
    <>
      <p>
        For FIRB, a 491 holder is a temporary resident, and temporary residents are foreign persons. Spending more than 200 days a year in Australia does not change that. Two
        rules follow from it.
      </p>
      <p>
        <strong>You need approval before you buy.</strong> FIRB approval is needed for a new dwelling or for vacant land, and on vacant land the home must be finished within four
        years. There is an application fee, set by the price (see the{" "}
        <TextLink href={SRC.firbFees} external>
          FIRB fees page
        </TextLink>
        ). If the developer holds a New or Near-New Dwelling Exemption Certificate for the project, you don&rsquo;t need your own approval for a home in it. Ask the developer for a
        copy before you sign.
      </p>
      <p>
        <strong>Established homes are off the table for now.</strong> Foreign persons, including temporary residents, are generally banned from buying established dwellings from{" "}
        {banFrom()} to {banTo()}. The ban was due to end on {banOriginalTo()} and was extended in the 2026-27 Budget. Its exceptions are commercial, such as large redevelopments,
        so they don&rsquo;t help someone buying a home to live in.
      </p>
      <p>
        What you can buy is a new home sold for the first time, an off-the-plan apartment or townhouse, or vacant land to build on. If you later move out, keep in mind that foreign
        owners pay an annual vacancy fee when a home isn&rsquo;t lived in or genuinely available to rent for at least 183 days a year.
      </p>
      <p>
        If your spouse is an Australian citizen or permanent resident and you buy together as joint tenants (not tenants in common), you don&rsquo;t need FIRB approval. Whether
        that exemption also covers an established home during the ban isn&rsquo;t settled in the guidance we checked, so confirm it with FIRB before relying on it.
      </p>
    </>
  ),
  states: {
    intro: (
      <p>
        The state the property is in decides the duty, not the state that nominated you. What the 491 changes is your status: states that charge a foreign buyer surcharge treat
        temporary visa holders as foreign, and most first home concessions need at least one buyer who is a citizen or permanent resident.
      </p>
    ),
    after: (
      <>
        <p>
          The ACT and the NT charge no foreign buyer surcharge on duty, and both are outside Sydney, Melbourne and Brisbane, so they count as designated regional areas. FIRB
          approval and the established-home ban still apply there.
        </p>
        <p>
          Two refund rules are worth knowing. In NSW, surcharge purchaser duty is refunded if you are no longer a foreign person at the date of transfer. Queensland tests your
          status when you sign and gives no refund if permanent residence comes later. The scenario below shows why that difference matters.
        </p>
      </>
    ),
  },
  deposit: (
    <>
      <p>
        The 5% Deposit Scheme is closed to you while you hold the 491. Every applicant must be an Australian citizen or permanent resident at the home loan date, and a couple with
        one temporary-visa holder doesn&rsquo;t qualify, even if permanent residence has been applied for. Help to Buy is for Australian citizens only.
      </p>
      <p>
        That leaves a standard home loan. Lenders that accept 491 applicants often set a lower maximum loan-to-value ratio (LVR) than for citizens, and the lenders mortgage
        insurer may have its own rules for temporary residents. In practice, plan on a larger deposit than a citizen buying the same home, and on lenders mortgage insurance (LMI)
        if you borrow more than 80% of the value.
      </p>
      <p>
        Your savings also have to cover costs a citizen doesn&rsquo;t pay. In the NSW scenario below, surcharge purchaser duty and the FIRB fee add {formatAud(extraNow)} before
        transfer duty is counted.
      </p>
      <p>
        We don&rsquo;t publish a maximum LVR for the 491 because it differs by lender and changes during the year. At your consultation we check the current limit for your
        situation with the lenders on our panel.
      </p>
    </>
  ),
  regional: {
    title: "Condition 8579 and where you can buy",
    showNswPostcodes: true,
    body: (
      <>
        <p>
          Condition 8579 says that while you are in Australia you must live, work and study only in a part of Australia that was a designated regional area when your visa was
          granted. Designated regional areas are all of Australia except Sydney, Melbourne and Brisbane. Newcastle, Lake Macquarie, Wollongong and the Illawarra are in Category 2,
          the cities and major regional centres.
        </p>
        <p>For a home loan, that has three effects:</p>
        <ul>
          <li>
            The condition is about where you live, work and study, not where you own property. But the home you buy to live in has to be in a designated regional area, and
            lenders assess it that way.
          </li>
          <li>A move to a Sydney, Melbourne or Brisbane job breaches the condition and puts the 191 at risk. It also changes the income the lender assessed.</li>
          <li>Some lenders lend less against homes in small regional towns. We check the postcode against lender policy early.</li>
        </ul>
        <p>Here are the NSW postcodes Home Affairs lists. For other states, use the regional postcodes page linked in Sources.</p>
      </>
    ),
  },
  pathway: {
    title: "Moving from the 491 to the 191",
    body: (
      <>
        <p>
          The{" "}
          <TextLink href={visaPath("subclass-191")}>Permanent Residence (Skilled Regional) visa, subclass 191</TextLink>, is the permanent visa for 491 and 494 holders. You can
          apply after holding the 491 for at least three years and complying with its conditions. You need ATO notices of assessment for three income years, and there is no
          minimum income requirement.
        </p>
        <p>When the 191 is granted, the home loan picture changes:</p>
        <ul>
          <li>You are a permanent resident, so you no longer need FIRB approval and the established-home ban no longer applies to you.</li>
          <li>
            In NSW, surcharge purchaser duty no longer applies once you meet the 200-day residence test, and the First Home Buyers Assistance Scheme and First Home Owner Grant
            open up if you are a first home buyer.
          </li>
          <li>The 5% Deposit Scheme becomes available, provided everyone on the loan is a citizen or permanent resident.</li>
          <li>More lenders will consider the application, and many assess permanent residents the same way as citizens.</li>
        </ul>
        <p>
          Some 491 holders plan for a 189 instead. If your last substantive visa was a 491, Home Affairs requires you to have held it for at least three years before applying for
          a 189. For visa strategy, speak to a registered migration agent. We look at the lending side.
        </p>
        <p>
          Whether to buy now or wait is a trade-off between renting for longer and paying the extra costs of buying as a foreign person. We work through both with your own
          numbers.
        </p>
      </>
    ),
  },
  documents: {
    intro: (
      <p>
        Expect the standard list below. On a 491 application lenders read the visa grant notice closely for condition 8579 and the expiry date, and they want to see the FIRB
        approval before settlement.
      </p>
    ),
    extra: [
      "FIRB approval letter, or the developer's New or Near-New Dwelling Exemption Certificate",
      "Contract of sale showing the property address in a designated regional area",
      "Partner's documents too, if you are both on the loan",
    ],
  },
  scenario,
  mistakes: [
    { title: "Signing for an established home", body: "Agents don't always ask about your visa. A 491 holder can't get FIRB approval for an established home while the ban applies." },
    { title: "Counting on first home concessions", body: "On a 491 alone, NSW's First Home Buyers Assistance Scheme isn't available, and most states have a similar rule." },
    { title: "Taking a city job before the 191", body: "Moving your work to Sydney, Melbourne or Brisbane breaches condition 8579. It can also undo the loan assessment." },
    { title: "Leaving FIRB until after you sign", body: "Talk to your conveyancer before you sign about FIRB timing, or about making the contract subject to approval." },
  ],
  faqTitle: "Questions about buying on a 491",
  faqs: [
    {
      question: "Can I buy an established house on a 491 visa?",
      answer: `Not while the ban applies. From ${banFrom()} to ${banTo()}, foreign persons, including 491 holders, are generally banned from buying established dwellings. You can buy a new home or vacant land with FIRB approval. Once you hold a permanent visa such as the 191, the ban no longer applies to you.`,
    },
    {
      question: "Can I buy in Sydney on a 491?",
      answer:
        "Condition 8579 is about where you live, work and study, and Sydney is not a designated regional area. So a Sydney home can't be the home you live in while you hold the 491. The condition doesn't stop you owning property elsewhere, but few lenders and few 491 holders are interested in that.",
    },
    {
      question: "Can I get the NSW First Home Buyers Assistance Scheme on a 491?",
      answer:
        "Not on a 491 alone. At least one first home buyer must be an Australian citizen or permanent resident. If your partner is, the concession can apply, but the 491 holder still pays surcharge purchaser duty on their share.",
    },
    {
      question: "Can I use the 5% Deposit Scheme on a 491?",
      answer: "No. Every applicant must be an Australian citizen or permanent resident at the home loan date. It becomes an option once your 191 is granted.",
    },
    {
      question: "Should I wait for the 191 before buying?",
      answer:
        "It depends on how far away the 191 is and what you are paying in rent. Waiting removes the FIRB fee and the surcharge and opens up established homes and first home concessions. We compare both paths with your figures at the consultation.",
    },
  ],
  related: ["subclass-191", "subclass-494", "subclass-190", "permanent-residents"],
};

export default content;
