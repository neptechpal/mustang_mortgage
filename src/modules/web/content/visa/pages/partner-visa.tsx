import { TextLink } from "../../../components/ui/Button";
import { formatAud } from "../../../format";
import type { VisaPageContent, VisaScenario } from "../types";
import { banFrom, banTo, scenarioFigures, visaPath } from "../VisaArticle";

const scenario: VisaScenario = {
  title: "joint tenants or one name on the title",
  setup: (
    <>
      <p>
        A married couple live in Sydney. One is an Australian citizen; the other holds an 820 partner visa, applied for onshore, and has lived here for two years. Neither has owned
        property. They want a new apartment for {formatAud(780_000)} from a developer without a FIRB exemption certificate.
      </p>
      <p>
        The table compares buying together as joint tenants with the 820 holder buying alone. In both columns the 820 holder meets the NSW residence requirement, so NSW treats them
        like a permanent resident for surcharge purchaser duty.
      </p>
    </>
  ),
  columns: [
    {
      label: "Together, as joint tenants",
      duty: { state: "NSW", price: 780_000, propertyType: "new", firstHomeBuyer: true, foreignPurchaser: false, ownerOccupier: true, citizenOrPR: true },
    },
    {
      label: "820 holder buys alone",
      duty: { state: "NSW", price: 780_000, propertyType: "new", firstHomeBuyer: true, foreignPurchaser: false, ownerOccupier: true, citizenOrPR: false },
      firbFee: true,
    },
  ],
  depositPct: 10,
  assumptions: [
    "Both are first home buyers and will live in the apartment.",
    "Buying together as joint tenants with an Australian-citizen spouse means no FIRB approval is needed for the 820 holder.",
    "Buying alone, the 820 holder is a foreign person for FIRB and needs approval for a new dwelling.",
  ],
  after: null,
};

const fig = scenarioFigures(scenario);
const [joint, alone] = fig.cols;

scenario.after = (
  <>
    <p>
      Together, the couple qualify for the First Home Buyers Assistance Scheme through the citizen spouse, pay no transfer duty at this price and need no FIRB approval: government
      costs of {formatAud(joint.total)}. If the 820 holder bought alone, there would be no first home concession and a FIRB fee, for {formatAud(alone.total)}.
    </p>
    <p>
      How the title is held matters as much as who is on it. The FIRB exemption is for joint tenants. Buying as tenants in common, even in equal shares, puts the 820 holder back in
      the foreign-person rules. The 5% Deposit Scheme isn&rsquo;t available in either column, because one applicant holds a temporary visa.
    </p>
  </>
);

const content: VisaPageContent = {
  slug: "partner-visa",
  short: "Partner visas",
  blurb: "Partner visas 820/801 and 309/100: joint tenancy, the FIRB spouse exemption and NSW's partner rule.",
  metaTitle: "Home loans on a partner visa (820, 801, 309, 100)",
  metaDescription:
    "Buying a home on a partner visa: the FIRB spouse joint-tenant exemption, NSW treating 820 and 309 holders like PRs for surcharge, first home concessions, and what changes at the 801 or 100.",
  h1: (
    <>
      Home loans on a <em>partner visa</em>
    </>
  ),
  headline: "Home loans on a partner visa",
  lede: "Partner visas come in two stages: a temporary visa first (820 onshore or 309 offshore), then the permanent 801 or 100. Most of the home loan rules turn on two questions: which stage you are at, and whether you buy together with your Australian partner.",
  publishedAt: "2026-10-26",
  updatedAt: "2026-10-26",
  answer: (
    <>
      <p>
        Yes. On the temporary stage (820 or 309) you are a foreign person for FIRB, but if you buy together with your Australian-citizen or permanent-resident spouse as joint
        tenants, you don&rsquo;t need FIRB approval. NSW also treats 820 and 309 holders like permanent residents for surcharge purchaser duty once they meet its residence
        requirement.
      </p>
      <p>
        First home concessions can apply through your partner, but the 5% Deposit Scheme isn&rsquo;t available while either of you holds a temporary visa. Once the 801 or 100 is
        granted, you buy as a permanent resident.
      </p>
    </>
  ),
  lenders: {
    intro: (
      <p>
        A lender looks at a partner-visa application as a couple: two incomes, two credit files and two sets of documents. The temporary visa is usually the smaller issue when the
        other partner is a citizen or permanent resident.
      </p>
    ),
    points: [
      {
        title: "Which stage you are at",
        body: "On the 820 or 309 you hold a temporary visa; on the 801 or 100 a permanent one. Lenders read the stage from VEVO, along with any bridging visa you hold while the 820 is processed.",
      },
      {
        title: "The relationship",
        body: "Lenders assess joint applicants together. Your marriage certificate or relationship evidence helps explain shared finances and a joint deposit.",
      },
      {
        title: "Your own income",
        body: "If the partner-visa holder works, lenders consider that income like any other. If you have only just started work after arriving, expect questions about probation.",
      },
      {
        title: "Money from overseas",
        body: "Savings brought from overseas, or a gift from family there, need a paper trail into your Australian account.",
      },
      {
        title: "Whose name is on the title",
        body: "Joint tenancy changes FIRB, duty and concession outcomes. Decide it with your conveyancer before you sign, not at settlement.",
      },
      {
        title: "Debts in either name",
        body: "Both partners' debts count, including any overseas. A car loan in your home country is still a repayment the lender includes.",
      },
    ],
  },
  firb: (
    <>
      <p>
        On the 820 or 309 you are a temporary resident, which makes you a foreign person for FIRB. The 801 and 100 are permanent visas, and permanent visa holders are exempt from
        FIRB approval.
      </p>
      <p>
        <strong>The spouse exemption.</strong> A temporary resident buying as a joint tenant with an Australian-citizen, Australian permanent resident or eligible New Zealand
        citizen spouse doesn&rsquo;t need FIRB approval. It applies to joint tenants only. Buying as tenants in common doesn&rsquo;t qualify, even with equal shares.
      </p>
      <p>
        <strong>The established-home ban.</strong> From {banFrom()} to {banTo()}, the ban applies to an 820 or 309 holder buying alone or as a tenant in common. Whether the spouse
        joint-tenant exemption also allows an established home during the ban is not stated in the FIRB guidance examples we checked. Confirm with FIRB, in writing, before signing
        for an established home on the temporary stage.
      </p>
      <p>
        If the partner-visa holder buys alone, the usual temporary-resident rules apply: approval for a new dwelling or vacant land, with an application fee, and no established
        homes while the ban lasts.
      </p>
    </>
  ),
  states: {
    intro: (
      <p>
        The first table covers the temporary stage. NSW stands out: it treats 820 and 309 holders like permanent residents for surcharge purchaser duty, provided they meet its
        residence requirement (200 days in Australia in the previous 12 months, or 200 continuous days living in the property within 12 months of the contract).
      </p>
    ),
    after: (
      <>
        <p>
          Outside NSW, the surcharge generally applies to the temporary-visa partner&rsquo;s share. A few states have spouse rules of their own. Victoria can exempt a foreign spouse
          buying a home with a non-foreign spouse if they live in it for 12 months, starting within 12 months of settlement. Tasmania exempts spouses holding equal shares where only
          one is foreign and the home is their principal place of residence. Western Australia charges foreign transfer duty on the 820 holder&rsquo;s share, with joint tenants
          treated as equal shares. South Australia charges its surcharge to temporary visa holders even if they are married to an Australian.
        </p>
        <p>
          For first home concessions, most states need at least one buyer to be a citizen or permanent resident, which your partner usually is. The temporary-visa partner&rsquo;s
          share may still attract the surcharge where one applies.
        </p>
      </>
    ),
  },
  permanentStageTable: {
    caption: "After the 801 or 100 is granted (permanent)",
    intro: <p>Once the permanent stage is granted you are a permanent resident, and this table applies instead.</p>,
  },
  deposit: (
    <>
      <p>
        The 5% Deposit Scheme needs every applicant to be an Australian citizen or permanent resident. A couple where one partner holds an 820 or 309 doesn&rsquo;t qualify, even if
        the 801 or 100 has been applied for. Once the permanent stage is granted, the scheme opens to you both if you meet its other criteria.
      </p>
      <p>
        Some couples ask about the Australian partner buying alone with the scheme. That changes who owns the home, whose income the lender counts and how the scheme treats a
        partner. Talk to us and your conveyancer before choosing it, because it is hard to undo.
      </p>
      <p>
        On a standard loan, lender policy for a couple with one temporary-visa borrower varies: some assess it much like a citizen couple, others are more cautious. LMI
        generally applies above 80% of the value. Help to Buy is for Australian citizens only, and every applicant must be one.
      </p>
    </>
  ),
  pathway: {
    title: "From the 820 to the 801 (or 309 to 100)",
    body: (
      <>
        <p>
          Partner visas are applied for together and granted in two stages: the 820 then the 801 onshore, or the 309 then the 100 offshore. Eligibility for the permanent stage is
          generally considered about two years after you applied.
        </p>
        <p>When the 801 or 100 is granted:</p>
        <ul>
          <li>You hold a permanent visa, so FIRB and the established-home ban no longer apply to you in your own right.</li>
          <li>You move to the permanent-resident column in the state tables above.</li>
          <li>The 5% Deposit Scheme becomes available to you as a couple, if you meet its other criteria.</li>
        </ul>
        <p>
          While the 820 is being processed you may hold a bridging visa. For FIRB and the states that is still a temporary status: see the{" "}
          <TextLink href={visaPath("bridging-visa")}>bridging visa guide</TextLink>.
        </p>
      </>
    ),
  },
  documents: {
    intro: <p>Partner-visa applications add relationship documents to the standard list, for both of you.</p>,
    after: <p>If your partner is the citizen or permanent resident on the purchase, the lender asks for their passport or citizenship certificate as well.</p>,
  },
  scenario,
  mistakes: [
    { title: "Tenants in common by default", body: "The FIRB spouse exemption is for joint tenants. Tell your conveyancer how you want to hold title before the contract is drafted." },
    { title: "Assuming the ban doesn't apply", body: "For an established home on the temporary stage, confirm the position with FIRB in writing first." },
    { title: "Applying for the 5% scheme early", body: "The scheme isn't available until both applicants are citizens or permanent residents." },
    { title: "Forgetting the other states' rules", body: "NSW's partner rule is not copied everywhere. Outside NSW, check the surcharge on the temporary-visa partner's share." },
  ],
  faqTitle: "Questions about buying on a partner visa",
  faqs: [
    {
      question: "Do I need FIRB approval to buy with my Australian partner on an 820?",
      answer:
        "Not if you are spouses buying together as joint tenants. A temporary resident buying as a joint tenant with an Australian-citizen, permanent-resident or eligible New Zealand citizen spouse is exempt. As tenants in common, or buying alone, you need approval.",
    },
    {
      question: "Can we buy an established home while I'm on the 820?",
      answer: `The ban on foreign persons buying established dwellings (${banFrom()} to ${banTo()}) applies to an 820 holder buying alone or as a tenant in common. Whether the joint-tenant spouse exemption covers an established home during the ban isn't stated in the guidance we checked, so confirm with FIRB before signing.`,
    },
    {
      question: "Do I pay surcharge purchaser duty in NSW on an 820 or 309?",
      answer:
        "Not if you meet NSW's residence requirement: 200 days in Australia in the 12 months before the contract, or living in the property for 200 continuous days within 12 months of it. NSW treats partner-visa holders like permanent residents for the surcharge.",
    },
    {
      question: "Can we get the NSW First Home Buyers Assistance Scheme?",
      answer: "Yes, if you both meet its conditions. At least one first home buyer must be an Australian citizen or permanent resident, which your partner can be.",
    },
    {
      question: "Can we use the 5% Deposit Scheme?",
      answer: "Not while one of you holds a temporary visa, including an 820 or 309. It opens once the 801 or 100 is granted, if you meet the other criteria.",
    },
  ],
  related: ["permanent-residents", "bridging-visa", "subclass-189", "new-zealand-citizens"],
};

export default content;
