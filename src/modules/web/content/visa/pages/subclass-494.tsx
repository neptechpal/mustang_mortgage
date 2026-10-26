import { RULES } from "@/modules/calc/rules";
import { TextLink } from "../../../components/ui/Button";
import { formatAud } from "../../../format";
import { fhogFor } from "../../shared/rules";
import type { VisaPageContent, VisaScenario } from "../types";
import { banFrom, banTo, scenarioFigures, visaPath } from "../VisaArticle";

const qldFhog = fhogFor("QLD");
const afad = RULES.QLD.foreignSurcharge;

const scenario: VisaScenario = {
  title: "a new house in regional Queensland",
  setup: (
    <>
      <p>
        An electrician holds a 494 sponsored by a regional Queensland employer; his partner is on the same visa as a secondary applicant and works part time. They have held the
        visa for 18 months, rent in a regional city well outside Brisbane, and have a 20% deposit. They have found a newly built three-bedroom house, never lived in, for{" "}
        {formatAud(640_000)}.
      </p>
      <p>The table compares buying it now on the 494 with buying a similar house after both are granted the 191.</p>
    </>
  ),
  columns: [
    {
      label: "On the 494 today",
      duty: { state: "QLD", price: 640_000, propertyType: "new", firstHomeBuyer: true, foreignPurchaser: true, ownerOccupier: true, citizenOrPR: false },
      firbFee: true,
    },
    {
      label: "After the 191",
      duty: { state: "QLD", price: 640_000, propertyType: "new", firstHomeBuyer: true, foreignPurchaser: false, ownerOccupier: true, citizenOrPR: true },
    },
  ],
  depositPct: 20,
  assumptions: [
    "Both buyers are first home buyers, have never owned property anywhere and will live in the house.",
    "The builder does not hold a FIRB exemption certificate, so the couple need their own approval.",
  ],
  after: null,
};

const fig = scenarioFigures(scenario);
const [now, later] = fig.cols;

scenario.after = (
  <>
    <p>
      On the 494 the couple pay full transfer duty plus {formatAud(now.r.surcharge)} of additional foreign acquirer duty and the FIRB fee: {formatAud(now.total)} in government
      costs, and no grant. After the 191 they qualify for Queensland&rsquo;s first home new home concession, which removes transfer duty on a new home with no price cap, and the{" "}
      {qldFhog ? formatAud(qldFhog.amount) : ""} First Home Owner Grant, because the house is under the {qldFhog?.priceCap ? formatAud(qldFhog.priceCap) : ""} limit. Their
      government costs drop to {formatAud(later.total)}, and the grant comes on top.
    </p>
    <p>
      In Queensland, the timing works against buying early. Your status is fixed when you sign, and there is no refund of the additional duty if permanent residence comes later.
      A couple close to the three-year mark for the 191 have a strong reason to wait, or at least to sign after the grant.
    </p>
  </>
);

const content: VisaPageContent = {
  slug: "subclass-494",
  short: "Subclass 494",
  blurb: "Skilled Employer Sponsored Regional (Provisional): a regional employer, condition 8579, new homes only and the 191 pathway.",
  metaTitle: "Home loans for 494 visa holders: regional buying rules",
  metaDescription:
    "Buying on a 494 employer-sponsored regional visa: FIRB approval, new homes only, condition 8579, state surcharges (with a Queensland example), lender checks and the 191.",
  h1: (
    <>
      Home loans for <em>494 visa</em> holders
    </>
  ),
  headline: "Home loans for 494 visa holders",
  lede: "The 494 combines two things lenders pay attention to: a temporary visa, and an income that depends on a sponsoring employer in a regional area. You can buy a home on it, but the rules on what, where and at what cost are tighter than on a permanent visa.",
  publishedAt: "2026-10-26",
  updatedAt: "2026-10-26",
  answer: (
    <>
      <p>
        Yes, with limits. The 494 is a temporary visa, so you are a foreign person for FIRB: you need approval to buy, and until {banTo()} only a new home or vacant land is
        possible. Condition 8579 means you live, work and study in a designated regional area, so in practice the home is regional too.
      </p>
      <p>
        Most states charge a foreign buyer surcharge on 494 holders and limit first home concessions to purchases with a citizen or permanent resident. In Queensland, for example,
        the additional foreign acquirer duty is {afad.ratePct}% and there is no refund if you become a permanent resident after signing.
      </p>
    </>
  ),
  lenders: {
    intro: (
      <p>
        On a 494, your visa and your income both come from the same place: a regional employer who sponsored you. Lenders look at that link, as well as the usual income,
        expenses and deposit.
      </p>
    ),
    points: [
      {
        title: "Your sponsoring employer",
        body: "Lenders want to know who sponsors you, how long you have worked there and whether the role is ongoing. An employer letter confirming your position and salary is often requested.",
      },
      {
        title: "Five years, no extension",
        body: "The 494 is granted for five years. Lenders look at how much is left and how far you are from the three years needed for the 191.",
      },
      {
        title: "The secondary applicant's job",
        body: "If your partner works, their income can help, but only if they are on the loan. Part-time and casual income is assessed more cautiously than full-time salary.",
      },
      {
        title: "Regional property policy",
        body: "Lenders treat homes in small towns differently from homes in regional cities. Some lend less against properties in certain postcodes or on large blocks.",
      },
      {
        title: "FIRB paperwork",
        body: "Expect to show the FIRB approval letter, or the builder's or developer's exemption certificate, before the loan settles.",
      },
      {
        title: "Deposit and its source",
        body: "Lenders often want a bigger deposit from temporary residents. They will also want to see where it came from, especially money sent from overseas.",
      },
    ],
  },
  firb: (
    <>
      <p>
        For FIRB a 494 holder is a temporary resident, so you are a foreign person regardless of how long you have lived here.
      </p>
      <p>
        <strong>Established homes:</strong> foreign persons are generally banned from buying established dwellings from {banFrom()} to {banTo()}. The exceptions are commercial
        and don&rsquo;t cover a home to live in.
      </p>
      <p>
        <strong>New homes and land:</strong> you can buy a new dwelling or vacant land with FIRB approval and an application fee. On vacant land the home must be completed within
        four years. If the builder or developer holds a New or Near-New Dwelling Exemption Certificate, your own approval isn&rsquo;t needed. A house-and-land package is often
        two contracts, land and build, so check how FIRB applies to each before you sign either.
      </p>
      <p>
        <strong>After you buy:</strong> foreign owners pay an annual vacancy fee if the home isn&rsquo;t lived in or genuinely available to rent for at least 183 days a year.
      </p>
    </>
  ),
  states: {
    intro: (
      <p>
        Each state treats a 494 holder as a temporary visa holder. Where there is a foreign buyer surcharge you pay it, and where first home concessions exist they generally need a
        citizen or permanent resident in the purchase.
      </p>
    ),
    after: (
      <>
        <h3>Queensland in more detail</h3>
        <p>
          Queensland is a common choice for 494 holders because so much of it is regional. Three Queensland rules matter on a 494: additional foreign acquirer duty of{" "}
          {afad.ratePct}% applies on top of transfer duty; for contracts from 1 August 2026 the first home concessions are only for &ldquo;specified residents&rdquo; (citizens and
          permanent residents, among others); and your status is tested at the contract date, with no refund if permanent residence comes later.
        </p>
        <p>
          Compare that with NSW, where surcharge purchaser duty is refunded if you are no longer a foreign person at the date of transfer. Where you buy changes how much the
          timing of your 191 matters.
        </p>
      </>
    ),
  },
  deposit: (
    <>
      <p>
        The 5% Deposit Scheme isn&rsquo;t open to 494 holders: every applicant must be an Australian citizen or permanent resident. Help to Buy is for citizens only.
      </p>
      <p>
        With a standard loan, expect lenders to want more deposit from a temporary resident than from a citizen, and LMI if you borrow more than 80% of the value. Lenders mortgage
        insurers set their own rules for temporary residents, so the LMI question is answered lender by lender.
      </p>
      <p>
        Budget for the extra costs as well as the deposit. In the Queensland scenario below, additional foreign acquirer duty and the FIRB fee add{" "}
        {formatAud(now.r.surcharge + (now.firb?.fee ?? 0))} to the purchase.
      </p>
    </>
  ),
  regional: {
    title: "Condition 8579 on a 494",
    showNswPostcodes: true,
    body: (
      <>
        <p>
          Like the 491, the 494 carries condition 8579: while you are in Australia, you must live, work and study only in a part of Australia that was a designated regional area
          when your visa was granted. Designated regional areas are all of Australia except Sydney, Melbourne and Brisbane.
        </p>
        <p>
          On a 494 the condition sits alongside your sponsorship. Your employer is regional, your work is regional, and the home you live in has to be regional. A purchase in a
          capital-city postcode doesn&rsquo;t fit the visa and won&rsquo;t fit the lender&rsquo;s assessment either.
        </p>
        <p>The NSW postcodes in a designated regional area are listed below. For other states, use the Home Affairs regional postcodes page in Sources.</p>
      </>
    ),
  },
  pathway: {
    title: "Moving from the 494 to the 191",
    body: (
      <>
        <p>
          The permanent visa for 494 holders is the <TextLink href={visaPath("subclass-191")}>subclass 191</TextLink>, available after you have held the 494 for at least three
          years. Home Affairs also requires three income years of ATO notices of assessment for the 191, with no minimum income.
        </p>
        <p>
          On the 191 you are a permanent resident. FIRB approval and the established-home ban no longer apply, the foreign buyer surcharges fall away, and first home concessions,
          grants and the 5% Deposit Scheme become available if you are first home buyers.
        </p>
        <p>
          If you are a year or less from applying, compare the cost of waiting with the cost of buying now. In states that fix your status at the contract date, signing after the
          191 grant is what counts. A migration agent can tell you where you stand on the visa; we work out the numbers for the loan.
        </p>
      </>
    ),
  },
  documents: {
    intro: <p>Sponsorship and FIRB documents go with the standard list.</p>,
    extra: [
      "Employer letter confirming your role, salary and sponsorship",
      "FIRB approval letter, or the builder's or developer's exemption certificate",
      "Building contract and land contract, for a house-and-land purchase",
    ],
  },
  scenario,
  mistakes: [
    { title: "Signing a land contract first", body: "Two contracts can mean two FIRB questions. Check both before you sign the land contract." },
    { title: "Expecting a Queensland refund", body: "Queensland tests foreign status at the contract date. A 191 granted later doesn't bring back the additional duty." },
    { title: "Leaving the secondary applicant off", body: "If you want both incomes counted, both of you need to be borrowers." },
    { title: "Looking at Brisbane homes", body: "Brisbane is not a designated regional area, so it doesn't fit condition 8579 for the home you live in." },
  ],
  faqTitle: "Questions about buying on a 494",
  faqs: [
    {
      question: "Can I buy an established home on a 494 visa?",
      answer: `Not while the ban applies. From ${banFrom()} to ${banTo()}, foreign persons, including 494 holders, are generally banned from buying established dwellings. New homes and vacant land are possible with FIRB approval.`,
    },
    {
      question: "Can I buy in Brisbane on a 494?",
      answer:
        "Brisbane, Sydney and Melbourne are not designated regional areas. Condition 8579 means you live, work and study in a designated regional area, so a Brisbane home can't be the home you live in while you hold the 494.",
    },
    {
      question: "Do I get the Queensland first home concession on a 494?",
      answer:
        "No. For contracts from 1 August 2026 the first home concessions are for specified residents, such as citizens and permanent residents. A 494 holder's share pays full duty plus additional foreign acquirer duty.",
    },
    {
      question: "Can I get the First Home Owner Grant on a 494?",
      answer:
        "Not on your own. In every state with a grant, at least one applicant must be an Australian citizen or permanent resident. Once you hold the 191, you can apply if you meet the other conditions.",
    },
    {
      question: "What happens to my home loan if my sponsorship ends?",
      answer:
        "Your loan contract doesn't end, and the repayments still need to be met. What a change in sponsorship means for your visa is a question for a registered migration agent. Tell us early if your job is at risk, so we can talk through options before repayments are missed.",
    },
  ],
  related: ["subclass-191", "subclass-491", "subclass-482", "subclass-186"],
};

export default content;
