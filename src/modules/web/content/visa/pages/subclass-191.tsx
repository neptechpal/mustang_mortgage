import { TextLink } from "../../../components/ui/Button";
import { PATHS } from "../../../config";
import { formatAud } from "../../../format";
import { DEPOSIT_SCHEME, fhbThresholds, regionalCentresFor } from "../../shared/rules";
import type { VisaPageContent, VisaScenario } from "../types";
import { scenarioFigures, visaPath } from "../VisaArticle";

const caps = DEPOSIT_SCHEME.priceCaps.NSW;
const nsw = fhbThresholds("NSW", "established")!;
const centres = regionalCentresFor("NSW");

const scenario: VisaScenario = {
  title: "two regional homes after the 191",
  setup: (
    <>
      <p>
        A couple were granted 191 visas this year after three years on 491s in regional NSW. They rent, have never owned property, and now want to buy an established home with
        the 5% Deposit Scheme. They are looking in two places: a house in a regional city that is not on the scheme&rsquo;s list of regional centres, and a townhouse in
        Newcastle, which is.
      </p>
      <p>On the 491 neither home was possible, because both are established dwellings. On the 191 both are.</p>
    </>
  ),
  columns: [
    { label: "Regional city house", duty: { state: "NSW", price: 620_000, propertyType: "established", firstHomeBuyer: true, foreignPurchaser: false, ownerOccupier: true } },
    { label: "Newcastle townhouse", duty: { state: "NSW", price: 850_000, propertyType: "established", firstHomeBuyer: true, foreignPurchaser: false, ownerOccupier: true } },
  ],
  depositPct: 5,
  assumptions: [
    "Both buyers hold 191 visas, are first home buyers and meet the NSW 200-day residence test.",
    "Each home is under the 5% Deposit Scheme cap for its area, so no LMI is payable. Confirm the postcode with the official tool.",
  ],
  after: null,
};

const fig = scenarioFigures(scenario);
const [city, nc] = fig.cols;

scenario.after = (
  <>
    <p>
      The regional house is under the {formatAud(nsw.exemptTo ?? 0)} exemption threshold, so no transfer duty is payable and the government costs are {formatAud(city.total)}.
      The Newcastle townhouse is in the reducing band, so {formatAud(nc.r.transferDuty)} of duty remains after a {formatAud(nc.r.concession)} concession.
    </p>
    <p>
      The 5% Deposit Scheme caps are what make the comparison work. Outside the listed regional centres the NSW cap is {formatAud(caps.regional)}, so the regional house fits.
      Newcastle uses the higher {formatAud(caps.capital)} cap, so the townhouse fits too.
      {scenario.columns[1].duty.price > caps.regional
        ? ` The same ${formatAud(scenario.columns[1].duty.price)} price in a town outside the regional centres would be over that area's cap, and the couple would need a 20% deposit or LMI.`
        : ""}
    </p>
  </>
);

const content: VisaPageContent = {
  slug: "subclass-191",
  short: "Subclass 191",
  blurb: "Permanent Residence (Skilled Regional): what opens up after the 491 or 494, and the regional 5% scheme caps.",
  metaTitle: "Home loans for 191 visa holders: buying after the 491",
  metaDescription:
    "The 191 makes you a permanent resident: no FIRB, established homes allowed, first home concessions and the 5% Deposit Scheme. Regional caps, lender checks and refinancing a 491 loan.",
  h1: (
    <>
      Home loans for <em>191 visa</em> holders
    </>
  ),
  headline: "Home loans for 191 visa holders",
  lede: "The 191 is the permanent visa at the end of the regional pathway. For most holders it is the point where buying gets simpler and cheaper, because the FIRB and surcharge rules that applied on the 491 or 494 fall away.",
  publishedAt: "2026-10-26",
  updatedAt: "2026-10-26",
  answer: (
    <>
      <p>
        Yes. The 191 is a permanent visa, so you buy as a permanent resident: no FIRB approval, established homes allowed, and access to first home concessions, grants and the 5%
        Deposit Scheme where you meet their other criteria.
      </p>
      <p>
        If you already bought a home while on the 491 or 494, you are probably no longer a first home buyer, so those concessions may not apply to your next purchase. Refinancing
        the existing loan is often the more useful step.
      </p>
    </>
  ),
  lenders: {
    intro: (
      <p>
        By the time a 191 is granted you have at least three years of Australian income and tax returns, which makes the application easier to assess than it was on the
        provisional visa. Lenders focus on these points.
      </p>
    ),
    points: [
      {
        title: "Three years of tax returns",
        body: "The 191 needs ATO notices of assessment for three income years. Lenders like the same documents: they show a steady income history in Australia.",
      },
      {
        title: "Regional employment",
        body: "Your job is likely to be with a regional employer. Lenders assess it like any other role. If you plan to change jobs or move to a capital city now, tell us before we lodge.",
      },
      {
        title: "Regional property",
        body: "Some lenders lend less against homes in smaller towns or on large blocks. We check the postcode and property type against lender policy before you bid.",
      },
      {
        title: "Your current loan, if any",
        body: "If you bought a new home on the 491, the existing loan, its repayments and the property's value all go into the assessment for anything you do next.",
      },
      {
        title: "Days in Australia",
        body: "After three years on the 491 you will usually pass the NSW 200-day test. A long trip overseas after the 191 grant can change that for a NSW purchase.",
      },
      {
        title: "Savings pattern",
        body: "Lenders want to see savings built up over time. Three years of regular savings into an Australian account is strong evidence.",
      },
    ],
  },
  firb: (
    <>
      <p>
        As a 191 holder you are a permanent visa holder, and permanent visa holders don&rsquo;t need FIRB approval to buy residential land, including established homes. The ban on
        foreign persons buying established dwellings no longer applies to you.
      </p>
      <p>
        If you bought a new home with FIRB approval while you held the 491 or 494, that approval may have come with conditions. Ask FIRB or your conveyancer how they apply now that
        you hold a permanent visa, particularly if you plan to rent the home out or sell it.
      </p>
    </>
  ),
  states: {
    intro: (
      <p>
        The 191 puts you in the permanent-resident column in every state. Compared with the 491, the foreign buyer surcharge disappears (subject to the NSW 200-day test) and the
        first home concessions and grants open up.
      </p>
    ),
    after: (
      <>
        <p>
          The concessions are for first home buyers. If you bought on the 491 or 494, you have owned residential property in Australia, and NSW&rsquo;s First Home Buyers Assistance
          Scheme and most other states&rsquo; schemes will no longer apply to you. That is the main reason some 491 holders choose to wait for the 191 before buying.
        </p>
        <p>
          If this is your first purchase, look at the state&rsquo;s <TextLink href={PATHS.firstHomeBuyers}>first home buyer guide</TextLink> for the thresholds and grant rules.
        </p>
      </>
    ),
  },
  deposit: (
    <>
      <p>
        On a 191 you can use the <strong>5% Deposit Scheme</strong> if you are a first home buyer (or haven&rsquo;t owned property in Australia in the last 10 years), will live in
        the home and buy under the cap. With a guarantee from the Government, there is no LMI. If you bought on the 491, the 10-year test means the scheme is usually closed to you
        for now.
      </p>
      <p>
        If you don&rsquo;t use the scheme, a deposit under 20% usually means LMI. With three years of Australian income and savings, more lenders will consider a higher loan than
        they would have on the 491. We check the current limits with the lenders on our panel.
      </p>
      <p>Help to Buy remains closed until you become an Australian citizen.</p>
    </>
  ),
  regional: {
    title: "Regional areas and the 5% Deposit Scheme caps",
    body: (
      <>
        <p>
          Anyone coming from a 491 or 494 has spent at least three years in a regional area, so the scheme&rsquo;s two NSW caps matter. Capital-city caps also apply in listed regional centres; the rest of the state has a
          lower cap.
        </p>
        <ul>
          <li>
            Sydney and the listed NSW regional centres: {formatAud(caps.capital)}.{centres ? ` The regional centres are ${centres}.` : ""}
          </li>
          <li>Other areas of NSW: {formatAud(caps.regional)}.</li>
        </ul>
        <p>
          Caps are set by suburb and postcode, so confirm yours with the official postcode tool before you rely on the higher cap.
        </p>
        <p>
          Condition 8579 (live, work and study in a regional area) is a condition of the 491 and 494. Our record for the 191, checked against Home Affairs, shows no equivalent
          condition. Check your 191 grant notice and VEVO to confirm what applies to you before planning a move to a capital city.
        </p>
      </>
    ),
  },
  pathway: {
    title: "How you got here, and what comes next",
    body: (
      <>
        <p>
          The 191 is for people who held an eligible <TextLink href={visaPath("subclass-491")}>491</TextLink> or <TextLink href={visaPath("subclass-494")}>494</TextLink> for at
          least three years and complied with its conditions. It needs ATO notices of assessment for three income years and has no minimum income requirement.
        </p>
        <p>
          If you took out a home loan on the provisional visa, the grant is a good time to review it. Lenders that limited lending to temporary residents may now be options, and
          your loan may have been set up when your choices were narrower. See <TextLink href={PATHS.refinancing}>refinancing</TextLink> for how we approach a review.
        </p>
        <p>The next step after the 191 is citizenship, which is what opens Help to Buy. For most 191 holders it doesn&rsquo;t change the home loan in any other way.</p>
      </>
    ),
  },
  documents: {
    intro: <p>A 191 application is the standard list, with your three years of tax records doing a lot of the work.</p>,
    extra: ["ATO notices of assessment for three income years", "Current loan statements, if you bought while on the 491 or 494"],
  },
  scenario,
  mistakes: [
    { title: "Assuming you are still a first home buyer", body: "If you bought on the 491, NSW's First Home Buyers Assistance Scheme and the 5% Deposit Scheme usually no longer apply." },
    { title: "Using the wrong scheme cap", body: "Regional centres use the higher cap; other regional areas use the lower one. Check the postcode, not the town's size." },
    { title: "Leaving an old loan untouched", body: "A loan set up on a temporary visa is worth reviewing once you are a permanent resident." },
    { title: "Moving before checking the visa", body: "Confirm on VEVO that no regional condition applies to you before taking a city job and buying there." },
  ],
  faqTitle: "Questions about buying on a 191",
  faqs: [
    {
      question: "Can I buy an established home on a 191 visa?",
      answer: "Yes. The 191 is a permanent visa, so you don't need FIRB approval and the ban on foreign persons buying established dwellings doesn't apply to you.",
    },
    {
      question: "I bought a home on my 491. Am I still a first home buyer?",
      answer:
        "Usually not. NSW's First Home Buyers Assistance Scheme is for people who have never owned residential property in Australia, and the 5% Deposit Scheme needs you to be a first home buyer or not to have owned property in Australia for 10 years.",
    },
    {
      question: "Can I use the 5% Deposit Scheme in regional NSW?",
      answer: `Yes, if you meet its criteria. The cap is ${formatAud(caps.capital)} in Sydney and the listed regional centres, and ${formatAud(caps.regional)} in other areas of NSW. Confirm your postcode with the official tool.`,
    },
    {
      question: "Can I move to Sydney and buy there on a 191?",
      answer:
        "Our record for the 191 shows no regional condition like the 491's condition 8579. Confirm on your grant notice and VEVO, and speak to a migration agent if you are unsure, before you commit to a move and a purchase.",
    },
    {
      question: "Should I refinance the loan I took out on my 491?",
      answer:
        "It is worth a review. As a permanent resident you may have more lenders to choose from than when the loan was set up. Whether switching makes sense depends on the costs of leaving your current loan, which we work out with you.",
    },
  ],
  related: ["subclass-491", "subclass-494", "permanent-residents", "subclass-189"],
};

export default content;
