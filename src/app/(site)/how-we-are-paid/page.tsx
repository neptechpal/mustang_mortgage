import { ArticleLayout } from "@/modules/web/components/content/ArticleLayout";
import { CtaBand } from "@/modules/web/components/content/CtaBand";
import { Disclaimer } from "@/modules/web/components/content/Disclaimer";
import { Faq } from "@/modules/web/components/content/Faq";
import { Prose } from "@/modules/web/components/content/Prose";
import { Sources } from "@/modules/web/components/content/Sources";
import { TextLink } from "@/modules/web/components/ui/Button";
import { Callout } from "@/modules/web/components/ui/Callout";
import { Fact } from "@/modules/web/components/ui/Fact";
import { PATHS } from "@/modules/web/config";
import { JsonLd, buildMetadata, webPageJsonLd } from "@/modules/web/seo";

const TITLE = "How we are paid";
const DESCRIPTION =
  "How Mustang Mortgage is paid: upfront and trail commission from lenders, any fees, and our legal duty to act in your best interests. Plain-English explanation.";

export const metadata = buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATHS.howWeArePaid });

const TOC = [
  { id: "commission", label: "Commission from lenders" },
  { id: "fees", label: "Fees you might pay" },
  { id: "lender-fees", label: "Lender and government costs" },
  { id: "best-interests", label: "Our best interests duty" },
  { id: "panel", label: "Our lender panel" },
  { id: "questions", label: "Questions" },
];

export default function HowWeArePaidPage() {
  return (
    <>
      <JsonLd data={webPageJsonLd({ path: PATHS.howWeArePaid, name: TITLE, description: DESCRIPTION })} />
      <ArticleLayout
        crumbs={[
          { name: "About", path: PATHS.about },
          { name: TITLE, path: PATHS.howWeArePaid },
        ]}
        eyebrow="About us"
        title="How we are paid"
        lede="Most people never pay us directly. This page explains where our income comes from, what you might pay, and the rules that stop that income from steering our advice."
        toc={TOC}
        notice={
          <Callout tone="draft" title="Draft — to be checked against our licensee's Credit Guide">
            <p>The fee position and commission details must match the Credit Guide issued under our credit licence before this page goes live.</p>
          </Callout>
        }
        summary={
          <p>
            Lenders pay us commission when your loan settles, and usually a smaller ongoing commission while the loan is active. We tell you the amounts in writing before you
            apply. By law we must act in your best interests, whatever a lender pays.
          </p>
        }
        footer={
          <>
            <Sources
              items={[
                {
                  title: "RG 273 Mortgage brokers: Best interests obligations",
                  publisher: "Australian Securities and Investments Commission (ASIC)",
                  url: "https://asic.gov.au/regulatory-resources/find-a-document/regulatory-guides/rg-273-mortgage-brokers-best-interests-duty/",
                },
                { title: "National Consumer Credit Protection Act 2009", publisher: "Federal Register of Legislation", url: "https://www.legislation.gov.au/C2009A00134/latest/text" },
              ]}
            />
            <Disclaimer />
          </>
        }
      >
        <Prose>
          <section id="commission">
            <h2>Commission from lenders</h2>
            <p>
              When a loan we arranged settles, the lender pays us an <strong>upfront commission</strong>. It is worked out as a percentage of the amount you borrow, and the
              percentage varies between lenders.
            </p>
            <p>
              Most lenders also pay a <strong>trail commission</strong>: a smaller amount paid regularly for as long as the loan stays open, based on the balance owing. Trail is
              part of what lets us keep helping after settlement, for example when you want to review your rate or change your loan.
            </p>
            <p>
              Commission is paid by the lender. It is not added to your loan balance. Before you apply, we give you a document that sets out what we expect to be paid on your
              loan.
            </p>
          </section>

          <section id="fees">
            <h2>Fees you might pay</h2>
            <p>
              Our position on fees: <Fact path="fees.clientFeeStatement" />.
            </p>
            <p>
              If we would ever charge you a fee for our help, the law requires us to give you a written quote first, and you have to accept it before any fee applies.
            </p>
          </section>

          <section id="lender-fees">
            <h2>Lender and government costs</h2>
            <p>Some costs of buying or refinancing are not ours and are paid whichever way you get your loan. Depending on the loan and the property, these can include:</p>
            <ul>
              <li>lender fees, such as application, valuation, settlement or ongoing account fees</li>
              <li>lenders mortgage insurance (LMI) if you borrow more than 80% of the property&rsquo;s value</li>
              <li>transfer (stamp) duty and mortgage and transfer registration fees, set by the state government</li>
              <li>your conveyancer or solicitor&rsquo;s fees</li>
            </ul>
            <p>We show you these costs in your recommendation, so you can compare loans on their total cost and not just the interest rate.</p>
          </section>

          <section id="best-interests">
            <h2>Our best interests duty</h2>
            <p>
              Since 1 January 2021, mortgage brokers have had a legal duty to act in the best interests of their clients, and to put the client&rsquo;s interests first when there
              is a conflict. In practice that means:
            </p>
            <ul>
              <li>we recommend the loan that suits your situation and goals, not the one that pays us the most</li>
              <li>we record why we recommended it and which other options we considered</li>
              <li>we tell you about conflicts of interest, including how we are paid</li>
            </ul>
            <p>
              ASIC, the regulator, explains the duty in its regulatory guide RG 273 (see sources below).
            </p>
          </section>

          <section id="panel">
            <h2>Our lender panel</h2>
            <p>
              We can only arrange loans with lenders we are accredited with. We compare loans from <Fact path="lenderPanel.count" /> lenders on our panel. Not every lender in
              Australia is on our panel. Our <TextLink href={PATHS.creditGuide}>Credit Guide</TextLink> lists the lenders we use most often.
            </p>
          </section>

          <section id="questions">
            <h2>Questions</h2>
            <Faq
              headingLevel={3}
              items={[
                {
                  question: "Can I ask what you were paid on my loan?",
                  answer: "Yes. Ask us at any time and we will tell you what we have received, or expect to receive, from the lender on your loan.",
                },
                {
                  question: "Do lenders that pay more get recommended more?",
                  answer:
                    "No. The best interests duty means the recommendation has to fit your needs and objectives. If two loans suit you equally, we explain the differences, including any difference in what we are paid.",
                },
                {
                  question: "Is a broker loan more expensive than going to the bank directly?",
                  answer:
                    "The lender sets the interest rate and fees, and our commission is paid by the lender rather than added to your loan. Some lenders sell certain loans only directly, and we can't arrange those.",
                },
              ]}
            />
          </section>
        </Prose>
      </ArticleLayout>
      <CtaBand title="Talk it through with Sulav" />
    </>
  );
}
