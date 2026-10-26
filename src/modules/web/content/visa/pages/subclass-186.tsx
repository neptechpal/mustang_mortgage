import { TextLink } from "../../../components/ui/Button";
import { PATHS } from "../../../config";
import { formatAud } from "../../../format";
import { DEPOSIT_SCHEME, fhbThresholds, fhogFor } from "../../shared/rules";
import type { VisaPageContent, VisaScenario } from "../types";
import { scenarioFigures, visaPath } from "../VisaArticle";

const vic = fhbThresholds("VIC", "established")!;
const vicFhog = fhogFor("VIC");
const vicCap = DEPOSIT_SCHEME.priceCaps.VIC.capital;

const scenario: VisaScenario = {
  title: "two Melbourne homes either side of the exemption threshold",
  setup: (
    <>
      <p>
        A couple moved to Melbourne on 482 visas, and both have just been granted 186 visas through the Temporary Residence Transition stream. They rented the whole time, so they
        are first home buyers. With the 5% Deposit Scheme now open to them, they are choosing between an established unit at {formatAud(590_000)} and an established townhouse at{" "}
        {formatAud(700_000)}.
      </p>
    </>
  ),
  columns: [
    { label: "Unit", duty: { state: "VIC", price: 590_000, propertyType: "established", firstHomeBuyer: true, foreignPurchaser: false, ownerOccupier: true, citizenOrPR: true } },
    { label: "Townhouse", duty: { state: "VIC", price: 700_000, propertyType: "established", firstHomeBuyer: true, foreignPurchaser: false, ownerOccupier: true, citizenOrPR: true } },
  ],
  depositPct: 5,
  assumptions: ["Both buyers hold 186 visas, are first home buyers and will live in the home.", "Both homes are in Melbourne, under the 5% Deposit Scheme cap, so no LMI is payable."],
  after: null,
};

const fig = scenarioFigures(scenario);
const [unit, town] = fig.cols;

scenario.after = (
  <>
    <p>
      The unit is under Victoria&rsquo;s {formatAud(vic.exemptTo ?? 0)} first home exemption threshold, so no duty is payable and the government costs are {formatAud(unit.total)}.
      The townhouse is in the reducing band up to {vic.reducedTo ? formatAud(vic.reducedTo) : ""}, so {formatAud(town.r.transferDuty)} of duty remains after a{" "}
      {formatAud(town.r.concession)} concession.
    </p>
    <p>
      A year earlier, on the 482, neither home was possible: both are established, and the ban on foreign persons buying established dwellings applied to them. Both prices are under
      the {formatAud(vicCap)} Melbourne cap for the 5% Deposit Scheme. Neither home qualifies for the {vicFhog ? formatAud(vicFhog.amount) : ""} First Home Owner Grant, which is for
      new homes only.
    </p>
  </>
);

const content: VisaPageContent = {
  slug: "subclass-186",
  short: "Subclass 186",
  blurb: "Employer Nomination Scheme: permanent residence through your employer, and what changes after a 482.",
  metaTitle: "Home loans for 186 visa holders: buying after the 482",
  metaDescription:
    "Buying on an Employer Nomination Scheme 186 visa: no FIRB, established homes allowed, first home concessions and the 5% Deposit Scheme, lender checks, and refinancing a 482-era loan.",
  h1: (
    <>
      Home loans for <em>186 visa</em> holders
    </>
  ),
  headline: "Home loans for 186 visa holders",
  lede: "The 186 is a permanent visa nominated by an employer, and the usual next step for 482 holders. Its grant is the point where the FIRB rules, the established-home ban and the foreign buyer surcharges stop applying.",
  publishedAt: "2026-10-26",
  updatedAt: "2026-10-26",
  answer: (
    <>
      <p>
        Yes. The 186 is a permanent visa, so you don&rsquo;t need FIRB approval, you can buy established homes, and you can use first home concessions, grants and the 5% Deposit
        Scheme where you meet their criteria. Lenders generally assess you as a permanent resident.
      </p>
      <p>
        If you bought a home while you were on a 482, you have lost first home buyer status for most of those schemes, and the better question may be whether to refinance. If you
        came straight from overseas on the Direct Entry stream, watch the NSW 200-day test in your first year.
      </p>
    </>
  ),
  lenders: {
    intro: (
      <p>
        Once the 186 is granted, the lender&rsquo;s visa questions mostly disappear. What is left is the standard assessment, with a few points specific to people who reached
        permanent residence through an employer.
      </p>
    ),
    points: [
      {
        title: "Same employer, permanent visa",
        body: "If you are still with the employer that nominated you, a lender sees a stable, ongoing role and assesses it like any permanent employee's.",
      },
      {
        title: "A job change soon after grant",
        body: "If you plan to change employers after the grant, tell us before we lodge. Lenders assess the job you have at approval and settlement.",
      },
      {
        title: "Your loan from the 482",
        body: "If you bought on the 482, that loan's balance and repayments go into the assessment. Its terms may also be worth reviewing now.",
      },
      {
        title: "Australian history",
        body: "Temporary Residence Transition applicants usually have about two years of Australian employment behind them, which helps. If you are new to Australia, lenders want more evidence.",
      },
      {
        title: "Savings record",
        body: "Savings built up in an Australian account while on the 482 are usually strong evidence. Money transferred from overseas needs statements that show its path.",
      },
      {
        title: "Visa grant date",
        body: "Lenders and schemes care whether you held the 186 on the relevant date. Don't apply for the 5% Deposit Scheme on the strength of a pending application.",
      },
    ],
  },
  firb: (
    <>
      <p>
        Once your 186 is granted you hold a permanent visa, and permanent visa holders are exempt from FIRB approval for residential land, including established homes. The
        established-dwelling ban for foreign persons no longer applies to you.
      </p>
      <p>
        Until the grant, you are a temporary resident on the 482 or a bridging visa, and the foreign-person rules still apply. If your 186 application is pending, the{" "}
        <TextLink href={visaPath("bridging-visa")}>bridging visa guide</TextLink> covers buying in that gap.
      </p>
      <p>
        If you bought a new home with FIRB approval while on the 482, ask FIRB or your conveyancer how any conditions of that approval apply now that you are a permanent visa
        holder.
      </p>
    </>
  ),
  states: {
    intro: (
      <p>
        A 186 holder is a permanent resident in every state. The surcharges fall away (subject to the NSW 200-day test) and first home concessions and grants are available if you
        are a first home buyer.
      </p>
    ),
    after: (
      <>
        <p>
          Victoria shows how much the state matters. Its first home buyer exemption applies up to {formatAud(vic.exemptTo ?? 0)}, with a reducing concession to{" "}
          {vic.reducedTo ? formatAud(vic.reducedTo) : ""}, on new and established homes alike. The Victorian grant is {vicFhog ? formatAud(vicFhog.amount) : ""} for new homes up
          to {vicFhog?.priceCap ? formatAud(vicFhog.priceCap) : ""}. Victoria&rsquo;s foreign purchaser additional duty doesn&rsquo;t apply to permanent residents, and there is
          no days-in-Australia test.
        </p>
        <p>
          For the full list of thresholds and grants in your state, see our <TextLink href={PATHS.firstHomeBuyers}>first home buyer guides</TextLink>.
        </p>
      </>
    ),
  },
  deposit: (
    <>
      <p>
        The <strong>5% Deposit Scheme</strong> is open to you once the 186 is granted, if you are a first home buyer or haven&rsquo;t owned property in Australia for 10 years,
        will live in the home and buy under the cap ({formatAud(vicCap)} in Melbourne, for example). The Government guarantee replaces LMI. If you are applying as a couple, both
        of you need to be citizens or permanent residents.
      </p>
      <p>
        If you bought a new home while on the 482, the scheme generally won&rsquo;t apply to your next purchase, and lenders look at your equity and existing loan instead. Help to
        Buy remains for citizens only.
      </p>
    </>
  ),
  pathway: {
    title: "The 186 and the 482 before it",
    body: (
      <>
        <p>The 186 has three streams: Temporary Residence Transition, Direct Entry and Labour Agreement.</p>
        <ul>
          <li>
            <strong>Temporary Residence Transition</strong> is the usual route from the <TextLink href={visaPath("subclass-482")}>482</TextLink>, generally after two years of
            full-time sponsored employment in the three years before applying.
          </li>
          <li>
            <strong>Direct Entry</strong> doesn&rsquo;t need a prior 482. If yours was granted before you moved to Australia, you face the same new-arrival questions as a{" "}
            <TextLink href={visaPath("subclass-189")}>189</TextLink> holder: a short job history here and, in NSW, the 200-day test.
          </li>
        </ul>
        <p>
          If you took out a loan while on the 482, the 186 grant is a good time to review it. Lenders that wouldn&rsquo;t consider a temporary resident may now be options. See{" "}
          <TextLink href={PATHS.refinancing}>refinancing</TextLink>.
        </p>
      </>
    ),
  },
  documents: {
    intro: <p>For a 186 holder the list is the standard one. Bring the grant notice rather than the nomination paperwork.</p>,
    extra: ["Statements for your current home loan, if you bought while on the 482"],
  },
  scenario,
  mistakes: [
    { title: "Signing before the grant", body: "Until the 186 is granted, you are still a foreign person. Sign after the grant to avoid FIRB and surcharges." },
    { title: "Assuming you are a first home buyer", body: "If you bought on the 482, most first home concessions and the 5% Deposit Scheme no longer apply." },
    { title: "Changing jobs during the loan", body: "Tell us before a job change. It doesn't affect the 186, but it does affect the loan assessment." },
    { title: "Keeping the 482-era loan by default", body: "A loan set up when your options were limited is worth checking against what is available now." },
  ],
  faqTitle: "Questions about buying on a 186",
  faqs: [
    {
      question: "Can I buy an established home on a 186?",
      answer: "Yes. Once the 186 is granted you hold a permanent visa, so FIRB approval isn't needed and the established-dwelling ban doesn't apply.",
    },
    {
      question: "I bought a home on my 482. Can I use first home buyer schemes now?",
      answer:
        "Usually not. Most first home concessions and the 5% Deposit Scheme require you not to have owned property in Australia (the 5% scheme allows it if more than 10 years ago). Refinancing your existing loan may be the more useful step.",
    },
    {
      question: "Do I have to stay with my nominating employer to keep my home loan?",
      answer:
        "Your home loan isn't tied to your employer. Lenders assess the job you have when you apply and when the loan settles. Questions about your visa and your employer are for a registered migration agent.",
    },
    {
      question: "Does Victoria charge foreign purchaser duty to a 186 holder?",
      answer: "No. A permanent visa holder is not a foreign natural person for Victoria's foreign purchaser additional duty, and there is no days-in-Australia test.",
    },
    {
      question: "I arrived on a Direct Entry 186. Can I buy straight away?",
      answer:
        "FIRB doesn't stop you, but lenders want to see you working here first, and in NSW you may pay surcharge purchaser duty until you have spent 200 days in Australia in the past year, unless you qualify as an exempt permanent resident.",
    },
  ],
  related: ["subclass-482", "permanent-residents", "bridging-visa", "subclass-189"],
};

export default content;
