import { Disclaimer } from "@/modules/web/components/content/Disclaimer";
import { CtaBand } from "@/modules/web/components/content/CtaBand";
import { PageIntro } from "@/modules/web/components/content/PageIntro";
import { Container } from "@/modules/web/components/ui/Container";
import { PATHS } from "@/modules/web/config";
import { LoanExplorer } from "@/modules/web/learn/LoanExplorer";
import { LEARN_GUIDES, learnMetadata } from "@/modules/web/learn/LearnPage";
import { IndexList } from "@/modules/web/components/ui/IndexList";
import { JsonLd, breadcrumbJsonLd, webPageJsonLd } from "@/modules/web/seo";

const DESCRIPTION = "Slide the loan amount, rate, term and extra repayments and see your home loan year by year: repayments, interest, and how fast the balance falls.";
export const metadata = learnMetadata({ title: "Loan explorer: see your home loan year by year", description: DESCRIPTION, path: PATHS.loanExplorer });

export default function LoanExplorerPage() {
  const crumbs = [
    { name: "Learn", path: PATHS.learn },
    { name: "Loan explorer", path: PATHS.loanExplorer },
  ];
  return (
    <>
      <JsonLd data={webPageJsonLd({ path: PATHS.loanExplorer, name: "Loan explorer", description: DESCRIPTION })} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <PageIntro
        crumbs={crumbs}
        eyebrow="Learn"
        title="See your loan year by year"
        lede="Move the sliders and watch what a home loan really does: how much you repay, how much of it is interest, and how an extra payment each month changes the finish line."
      />
      <section className="mw-section" aria-label="Loan explorer">
        <Container>
          <LoanExplorer />
          <div style={{ marginTop: 40 }}>
            <Disclaimer variant="calculator" />
          </div>
        </Container>
      </section>
      <section className="mw-section mw-section--tight" aria-label="More to read">
        <Container>
          <h2 className="mw-h3" style={{ marginBottom: 20 }}>
            More to read
          </h2>
          <IndexList columns={2} items={LEARN_GUIDES.filter((g) => g.href !== PATHS.loanExplorer)} />
        </Container>
      </section>
      <CtaBand />
    </>
  );
}
