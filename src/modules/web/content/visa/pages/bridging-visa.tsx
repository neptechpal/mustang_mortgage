import { RULES } from "@/modules/calc/rules";
import { WorkedExampleTable } from "../../../components/content/WorkedExampleTable";
import { TextLink } from "../../../components/ui/Button";
import { formatAud, formatDate } from "../../../format";
import { STATE_ORDER } from "../../shared/rules";
import { earliestDate } from "../../shared/sources";
import type { VisaPageContent, VisaScenario } from "../types";
import { banFrom, banTo, scenarioFigures, visaPath } from "../VisaArticle";

const waFtd = RULES.WA.foreignSurcharge;
const surchargeChecked = earliestDate(...STATE_ORDER.map((st) => RULES[st].foreignSurcharge.verifiedAt));

const scenario: VisaScenario = {
  title: "a Perth apartment while permanent residence is pending",
  setup: (
    <>
      <p>
        A civil engineer applied onshore for a permanent skilled visa and holds Bridging visa A while it is processed. She has full work rights, a permanent job in Perth and a 20%
        deposit. She is signing for a new apartment at {formatAud(560_000)}, due to settle in five months.
      </p>
      <p>
        The table shows the costs if the permanent visa is still pending when the apartment is transferred to her, and if it is granted first and she asks RevenueWA to reassess
        the foreign transfer duty.
      </p>
    </>
  ),
  columns: [
    {
      label: "Still on the bridging visa",
      duty: { state: "WA", price: 560_000, propertyType: "new", firstHomeBuyer: true, foreignPurchaser: true, ownerOccupier: true, citizenOrPR: false },
      firbFee: true,
    },
    {
      label: "PR granted before transfer",
      duty: { state: "WA", price: 560_000, propertyType: "new", firstHomeBuyer: true, foreignPurchaser: false, ownerOccupier: true, citizenOrPR: false },
      firbFee: true,
    },
  ],
  depositPct: 20,
  assumptions: [
    "One buyer, a first home buyer, who will live in the apartment.",
    "She needs FIRB approval when she signs because she is a temporary resident at that point, so the FIRB fee appears in both columns.",
    "The second column assumes no first home owner rate is claimed after the grant; whether one can be is a question for RevenueWA.",
  ],
  after: null,
};

const fig = scenarioFigures(scenario);
const [pending, granted] = fig.cols;

scenario.after = (
  <>
    <p>
      If permanent residence is still pending at transfer, she pays {formatAud(pending.r.surcharge)} of foreign transfer duty on top of transfer duty and the FIRB fee:{" "}
      {formatAud(pending.total)} in total. If the grant comes first, Western Australia reassesses the foreign transfer duty when she is no longer foreign at transfer (form FDA42),
      and her costs fall to {formatAud(granted.total)}.
    </p>
    <p>
      The difference of {formatAud(pending.total - granted.total)} depends on dates she doesn&rsquo;t control. That is why we plan bridging-visa purchases around the worst case,
      with the refund as a bonus rather than part of the budget.
    </p>
  </>
);

const AFTER_SIGNING = [
  { s: "NSW", text: "Surcharge purchaser duty is refunded if you are no longer a foreign person at the date of transfer." },
  { s: "VIC", text: "You are not a foreign purchaser if you hold permanent residence by settlement." },
  { s: "QLD", text: "Your status is fixed at the contract date. No refund if permanent residence is granted later." },
  { s: "WA", text: "Foreign transfer duty can be reassessed (form FDA42) if you are no longer foreign when the property is transferred." },
  { s: "SA", text: "The surcharge is refunded if you stop being a foreign person within 12 months of acquiring the interest." },
  { s: "TAS", text: "The surcharge is refunded if you stop being foreign within 6 months." },
  { s: "ACT", text: "No foreign purchaser surcharge on duty." },
  { s: "NT", text: "No foreign purchaser surcharge on duty." },
] as const;

const content: VisaPageContent = {
  slug: "bridging-visa",
  short: "Bridging visas",
  blurb: "Bridging visas A, B, C and E: buying while a visa decision is pending, and what happens if PR comes after you sign.",
  metaTitle: "Home loans on a bridging visa: buying while PR is pending",
  metaDescription:
    "Buying a home on a bridging visa (BVA, BVB, BVC, BVE): you are still a foreign person for FIRB, state surcharges apply, and each state treats a PR grant after signing differently.",
  h1: (
    <>
      Home loans on a <em>bridging visa</em>
    </>
  ),
  headline: "Home loans on a bridging visa",
  lede: "A bridging visa keeps you lawfully in Australia while a visa application or immigration matter is decided. For buying a home, the key fact is simple: until a permanent visa is granted, you are treated as a temporary resident.",
  publishedAt: "2026-10-26",
  updatedAt: "2026-10-26",
  answer: (
    <>
      <p>
        It is possible, but it is the hardest stage to buy at. On a bridging visa you are a foreign person for FIRB, so you need approval and can only buy a new home or vacant land
        until {banTo()}. States with a foreign buyer surcharge charge it, and the 5% Deposit Scheme isn&rsquo;t available while permanent residence is applied for but not granted.
      </p>
      <p>
        Lender policies on bridging visas vary widely, and some lenders don&rsquo;t accept them. If your permanent visa is granted after you sign, some states refund the surcharge
        and others don&rsquo;t. For many people the better plan is to wait for the grant.
      </p>
    </>
  ),
  lenders: {
    intro: (
      <p>
        A bridging visa tells a lender that something is pending. The questions are what is pending, how long it might take, and what your position is if it isn&rsquo;t granted.
      </p>
    ),
    points: [
      {
        title: "Which bridging visa",
        body: "Bridging visa A covers you after a substantive visa ends while an application is decided; B lets you travel and return; C applies if you applied without holding a substantive visa; E covers other situations. Lenders read the type from VEVO.",
      },
      {
        title: "What you have applied for",
        body: "A pending permanent visa application is a different risk from a pending temporary one. Lenders want the acknowledgement letter showing the visa and the date lodged.",
      },
      {
        title: "Work rights",
        body: "Your bridging visa conditions decide whether you can work. Lenders need to see work rights and income that continues while the application is decided.",
      },
      {
        title: "Your previous visa",
        body: "How long you have lived and worked in Australia on substantive visas helps show a stable history, even though the bridging visa itself is open-ended.",
      },
      {
        title: "A plan if the decision is no",
        body: "Lenders are cautious because a refusal can change everything. A larger deposit and a strong income history are the usual ways to offset that.",
      },
      {
        title: "FIRB timing",
        body: "As a foreign person you need FIRB approval to buy, unless the developer holds an exemption certificate. Lenders will want the paperwork before settlement.",
      },
    ],
  },
  firb: (
    <>
      <p>
        For FIRB, a person on an onshore bridging visa who is waiting for a permanent visa decision is a temporary resident, which makes them a foreign person. Having applied for
        permanent residence doesn&rsquo;t change that until the visa is granted.
      </p>
      <p>
        That brings in the standard foreign-person rules. You need approval for a new dwelling or vacant land, with an application fee. Established dwellings are banned for foreign
        persons from {banFrom()} to {banTo()}. If you buy as a joint tenant with an Australian-citizen or permanent-resident spouse, approval isn&rsquo;t needed, but check the
        established-home question with FIRB before relying on it.
      </p>
      <p>
        If the permanent visa is granted before you sign, none of this applies: you buy as a permanent resident. If you are waiting on a partner visa, see the{" "}
        <TextLink href={visaPath("partner-visa")}>partner visa guide</TextLink>, because NSW treats partner applicants differently for the surcharge.
      </p>
    </>
  ),
  states: {
    intro: (
      <p>
        States treat bridging visa holders as temporary visa holders. Where a foreign buyer surcharge exists you pay it, and first home concessions generally need a citizen or
        permanent resident on the purchase.
      </p>
    ),
    after: (
      <>
        <h3>If permanent residence comes after you sign</h3>
        <p>
          This is the question bridging-visa buyers ask most, and the states answer it differently. Here is what each one does with the surcharge when you become a permanent
          resident between signing and settlement.
        </p>
        <WorkedExampleTable
          caption="Foreign buyer surcharge if PR is granted after the contract"
          rowHeader="State"
          columns={[{ key: "t", label: "What happens" }]}
          rows={AFTER_SIGNING.map((r) => ({ label: r.s, cells: { t: r.text } }))}
          note={<>From each revenue office&rsquo;s foreign-buyer rules, checked {formatDate(surchargeChecked)}. Links are in the state sources below.</>}
        />
        <p>
          A refund helps with the surcharge only. FIRB approval and its fee are dealt with when you sign, and first home concessions may not be available after the event, so
          treat any refund as uncertain until you have it.
        </p>
      </>
    ),
  },
  deposit: (
    <>
      <p>
        The 5% Deposit Scheme isn&rsquo;t available while your permanent visa is applied for but not granted: every applicant must be a citizen or permanent resident at the home
        loan date. Help to Buy is for citizens only.
      </p>
      <p>
        With a standard loan, expect lenders that accept bridging visas to ask for a substantial deposit, with LMI above 80% of the value where an insurer will cover it. The cash
        you need also has to cover FIRB and, in most states, the surcharge. In the WA scenario below, foreign transfer duty at {waFtd.ratePct}% and the FIRB fee add{" "}
        {formatAud(pending.r.surcharge + (pending.firb?.fee ?? 0))}.
      </p>
    </>
  ),
  pathway: {
    title: "What the grant changes",
    body: (
      <>
        <p>
          A bridging visa leads wherever your substantive application leads. If you are granted a permanent visa, the permanent-resident rules apply from the grant: no FIRB, no
          established-home ban and access to first home schemes. If you are granted a temporary visa, the rules for that visa apply, such as the{" "}
          <TextLink href={visaPath("subclass-482")}>482</TextLink> or <TextLink href={visaPath("subclass-491")}>491</TextLink>.
        </p>
        <p>
          We can&rsquo;t tell you how long a decision will take, and we don&rsquo;t give migration advice. What we can do is show you the cost of buying now against the cost of
          waiting, so the decision is made with numbers rather than hope.
        </p>
      </>
    ),
  },
  documents: {
    intro: <p>On a bridging visa, lenders need the paperwork for the visa you hold and the one you are waiting for.</p>,
    extra: ["FIRB approval letter, or the developer's exemption certificate"],
  },
  scenario,
  mistakes: [
    { title: "Budgeting on a refund", body: "Whether the surcharge comes back depends on the state and on dates you don't control. Plan for paying it." },
    { title: "Signing in Queensland early", body: "Queensland fixes your status at the contract date. A grant after signing doesn't help." },
    { title: "Forgetting work-right conditions", body: "Check your bridging visa conditions on VEVO before applying. No work rights usually means no loan." },
    { title: "Travelling without checking", body: "Leaving Australia on some bridging visas can end them. Ask a migration agent before booking a trip in the middle of a purchase." },
  ],
  faqTitle: "Questions about buying on a bridging visa",
  faqs: [
    {
      question: "Can I get a home loan on a bridging visa?",
      answer:
        "Sometimes. Lender policies vary widely and some don't accept bridging visas. Those that do look at the visa you have applied for, your work rights, your income history and a larger deposit.",
    },
    {
      question: "I've applied for PR. Am I still a foreign person?",
      answer: "Yes, for FIRB and for most state surcharges, until the permanent visa is granted. An onshore bridging visa holder awaiting a permanent visa is a temporary resident.",
    },
    {
      question: "If my PR is granted before settlement, do I get the surcharge back?",
      answer:
        "It depends on the state. NSW refunds it if you are no longer a foreign person at the date of transfer, Victoria looks at your status at settlement, and Queensland fixes it at the contract date with no refund. WA, SA and Tasmania have their own reassessment or refund rules.",
    },
    {
      question: "Can I use the 5% Deposit Scheme while my PR is pending?",
      answer: "No. The scheme is not available where permanent residence has been applied for but not granted.",
    },
    {
      question: "Should I wait for my visa decision before buying?",
      answer:
        "Often, yes. Waiting removes FIRB, the surcharge and the established-home ban, and opens first home schemes. We compare that with buying now using your own figures.",
    },
  ],
  related: ["permanent-residents", "partner-visa", "subclass-482", "subclass-186"],
};

export default content;
