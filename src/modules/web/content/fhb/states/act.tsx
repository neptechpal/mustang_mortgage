import { ACT } from "@/modules/calc/rules";
import { TextLink } from "../../../components/ui/Button";
import { PATHS } from "../../../config";
import { formatAud, formatDate } from "../../../format";
import { DEPOSIT_SCHEME, HELP_TO_BUY, duty } from "../../shared/rules";
import { visaPath } from "../../visa/VisaArticle";
import type { FhbStateContent } from "../types";

const hbcs = ACT.concessions.find((c) => c.id === "hbcs")!;
const otpUnit = ACT.concessions.find((c) => c.id === "otp-unit");
const nut = ACT.otherConcessions.find((c) => c.id === "newly-unit-titled");
const fhogEnded = ACT.otherConcessions.find((c) => c.id === "fhog-abolished");
const residence = hbcs.eligibility.find((l) => /principal place of residence/i.test(l));
const fiveYears = hbcs.eligibility.find((l) => /5 years/i.test(l));
const landTax = ACT.foreignSurcharge.exemptions.find((e) => /land tax/i.test(e));
const PRICES = [600_000, 900_000, 1_300_000] as const;
const top = duty({ state: "ACT", price: PRICES[2], propertyType: "established", firstHomeBuyer: false, foreignPurchaser: false, ownerOccupier: true });

const content: FhbStateContent = {
  state: "ACT",
  metaTitle: "First home buyer ACT: Home Buyer Concession Scheme 2026",
  metaDescription:
    "Buying your first home in the ACT: nil duty at any price under the Home Buyer Concession Scheme from 1 July 2026, the five-year rule, no First Home Owner Grant, scheme caps and worked examples.",
  h1: (
    <>
      First home buyers in the <em>ACT</em>
    </>
  ),
  headline: "First home buyers in the ACT: the Home Buyer Concession Scheme",
  lede: "From 1 July 2026 the ACT charges no conveyance duty to eligible home buyers at any price, and you don't strictly need to be a first home buyer to qualify. There is no grant, so the duty concession and the federal schemes are the whole picture.",
  publishedAt: "2026-10-26",
  updatedAt: "2026-10-26",
  intro: (
    <>
      <p>
        The ACT&rsquo;s Home Buyer Concession Scheme (HBCS) is unusually broad. For transactions from{" "}
        {formatDate(hbcs.effectiveFrom)}, eligible buyers pay no duty on a new or established home, or on vacant land, at any price. The income and property value caps that used
        to apply have been removed.
      </p>
      <p>
        The test is not &ldquo;have you ever owned a home&rdquo;. {fiveYears ?? "It looks at recent ownership."} That opens the scheme to people who owned a home years ago, in
        Australia or overseas, as long as it was more than five years before.
      </p>
      <p>{fhogEnded?.summary ?? "There is no ACT First Home Owner Grant."} So the help in the ACT comes through duty and the federal deposit schemes, not a cash grant.</p>
    </>
  ),
  examples: [
    { label: "Unit", price: PRICES[0], propertyType: "established" },
    { label: "Townhouse", price: PRICES[1], propertyType: "established" },
    { label: "House", price: PRICES[2], propertyType: "established" },
  ],
  examplesAfter: (
    <>
      <p>
        All three pay no duty under the HBCS, which is why the &ldquo;duty payable&rdquo; row is the same at every price. The saving grows with the price: on the{" "}
        {formatAud(PRICES[2])} house it is {formatAud(top.baseDuty)}, measured against the owner-occupier rate any home buyer would otherwise pay. The only government costs left
        are the land titles fees.
      </p>
      <p>
        The 5% Deposit Scheme cap in the ACT is {formatAud(DEPOSIT_SCHEME.priceCaps.ACT.capital)} across the territory, so the house in this table is
        {PRICES[2] > DEPOSIT_SCHEME.priceCaps.ACT.capital ? " over" : " within"} the cap. Help to Buy&rsquo;s ACT cap is {formatAud(HELP_TO_BUY.priceCaps.ACT.capital)}.
      </p>
    </>
  ),
  extra: {
    id: "other-exemptions",
    title: "Other ACT exemptions, and costs after you buy",
    body: (
      <>
        {otpUnit && (
          <p>
            <strong>{otpUnit.name}.</strong> {otpUnit.eligibility[0]} {otpUnit.eligibility[2]}
          </p>
        )}
        {nut && (
          <p>
            <strong>{nut.name}.</strong> {nut.summary}
          </p>
        )}
        {landTax && (
          <p>
            <strong>Foreign owners.</strong> The ACT doesn&rsquo;t charge a foreign buyer surcharge on duty. {landTax}
          </p>
        )}
      </>
    ),
  },
  apply: [
    {
      title: "Check the five-year test for you and your partner",
      body: "Neither of you can have held an interest in land anywhere, including overseas, in the previous five years.",
    },
    { title: "Confirm every buyer is an individual", body: "All buyers must be individuals aged 18 or over, buying in their own right, not through a company or trust." },
    {
      title: "Claim the concession with the duty",
      body: "The HBCS is claimed with the ACT Revenue Office as part of the duty assessment, usually by your conveyancer or solicitor. Tell them at the start that you intend to claim it.",
    },
    { title: "Move in and stay", body: residence ?? "Live in the home for the period the scheme requires." },
  ],
  applyAfter: (
    <p>
      For the general buying process, see <TextLink href={PATHS.homeLoansFirstHomeBuyers}>first home loans</TextLink>.
    </p>
  ),
  documents: [
    "Passport or other identification for every buyer",
    "Payslips and an employment letter, or tax returns if self-employed",
    "Bank statements showing savings and the deposit",
    "Contract of sale, or the land and building contracts",
    "Details of any land you or your partner have owned in the last five years, anywhere",
  ],
  mistakes: [
    { title: "Forgetting land owned overseas", body: "The five-year test counts land anywhere. A share in property overseas within the last five years can rule you out." },
    { title: "Expecting a grant", body: "The ACT First Home Owner Grant ended in 2019. Don't budget for one." },
    { title: "Assuming investors qualify", body: "The concession is for a home you live in. Renting it out instead of moving in breaks the condition." },
    { title: "Using an old calculator", body: `Calculators set up before ${formatDate(hbcs.effectiveFrom)} apply income and price caps that no longer exist.` },
  ],
  faqs: [
    {
      question: "Do first home buyers pay stamp duty in the ACT?",
      answer: `Not if they qualify for the Home Buyer Concession Scheme. For transactions from ${formatDate(hbcs.effectiveFrom)} it is nil duty at any price, with no income test.`,
    },
    {
      question: "Do I have to be a first home buyer for the ACT concession?",
      answer: "No. You and your partner must not have held an interest in land anywhere in the previous five years, but owning a home before that doesn't rule you out.",
    },
    {
      question: "Is there a First Home Owner Grant in the ACT?",
      answer: "No. The ACT grant ended for transactions from 1 July 2019.",
    },
    {
      question: "Can temporary visa holders use the ACT Home Buyer Concession Scheme?",
      answer: (
        <p>
          The scheme&rsquo;s determination has no citizenship or visa requirement on its face, but we haven&rsquo;t been able to confirm with ACT Revenue how it treats temporary
          residents, so check before relying on it. FIRB approval and the established-home ban still apply. See the <TextLink href={PATHS.visaHomeLoans}>visa guides</TextLink>{" "}
          and the <TextLink href={visaPath("subclass-482")}>482 guide</TextLink>.
        </p>
      ),
      answerText:
        "The scheme's determination has no citizenship or visa requirement on its face, but we haven't been able to confirm with ACT Revenue how it treats temporary residents, so check before relying on it. FIRB approval and the established-home ban still apply.",
    },
    {
      question: "Does the ACT charge foreign buyers extra duty?",
      answer: "Not on duty. Foreign owners may pay an annual foreign ownership surcharge on land tax unless they live in the property as their principal place of residence.",
    },
  ],
  calcPrice: 750_000,
};

export default content;
