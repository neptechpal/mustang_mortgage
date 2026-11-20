import { CtaBand } from "@/modules/web/components/content/CtaBand";
import { Disclaimer } from "@/modules/web/components/content/Disclaimer";
import { PageIntro } from "@/modules/web/components/content/PageIntro";
import { Container } from "@/modules/web/components/ui/Container";
import { IndexList } from "@/modules/web/components/ui/IndexList";
import { PATHS } from "@/modules/web/config";
import { LEARN_GUIDES, learnMetadata } from "@/modules/web/learn/LearnPage";
import { JsonLd, breadcrumbJsonLd, webPageJsonLd } from "@/modules/web/seo";

const DESCRIPTION = "Plain-English guides to home loans: fixed or variable rates, offset accounts, ways to repay, and an interactive loan explorer.";
export const metadata = learnMetadata({ title: "Learn about home loans", description: DESCRIPTION, path: PATHS.learn });

export default function LearnHubPage() {
  const crumbs = [{ name: "Learn", path: PATHS.learn }];
  return (
    <>
      <JsonLd data={webPageJsonLd({ path: PATHS.learn, name: "Learn about home loans", description: DESCRIPTION })} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <PageIntro crumbs={crumbs} eyebrow="Learn" title="Home loans, explained plainly" lede="Short guides and a hands-on explorer for the questions people ask before, during and after they borrow." />
      <section className="mw-section" aria-label="Guides">
        <Container>
          <IndexList numbered columns={2} items={LEARN_GUIDES} />
          <div style={{ marginTop: 40 }}>
            <Disclaimer />
          </div>
        </Container>
      </section>
      <CtaBand />
    </>
  );
}
