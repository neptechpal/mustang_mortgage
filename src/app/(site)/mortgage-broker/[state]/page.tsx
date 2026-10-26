import { notFound } from "next/navigation";
import { Disclaimer } from "@/modules/web/components/content/Disclaimer";
import { KeyFacts } from "@/modules/web/components/content/KeyFacts";
import { PageIntro } from "@/modules/web/components/content/PageIntro";
import { Sources } from "@/modules/web/components/content/Sources";
import { LinkButton } from "@/modules/web/components/ui/Button";
import { Container } from "@/modules/web/components/ui/Container";
import { IndexList } from "@/modules/web/components/ui/IndexList";
import { Section } from "@/modules/web/components/ui/Section";
import { PATHS } from "@/modules/web/config";
import { consultationModes, formatDate } from "@/modules/web/format";
import { JsonLd, buildMetadata, webPageJsonLd } from "@/modules/web/seo";
import { LGA_SOURCE, lgaGroupsFor } from "@/modules/seo-data/lgas";
import { getSuburbBySlug, suburbDataset } from "@/modules/seo-data/suburbs";
import { aud, num, period } from "@/modules/web/suburbs/copy";
import { DATA_PULLED_AT, PUBLISHED_SLUGS, PUBLISHED_SUBURBS, medianPrice, suburbPath } from "@/modules/web/suburbs/model";

// State hub for the suburb guides, grouped by council area (research §C10). Only NSW has guides today.
export const dynamicParams = false;

const STATES = { nsw: { code: "NSW", name: "New South Wales" } } as const;

export function generateStaticParams() {
  return Object.keys(STATES).map((state) => ({ state }));
}

const TITLE = "NSW suburb guides for home buyers, by council area";
const DESCRIPTION = `Home-buying guides for ${PUBLISHED_SUBURBS.length} Sydney and NSW suburbs: median prices and rents (NSW DCJ), 2021 Census data, stamp duty and deposits at the median, grouped by council area.`;

export async function generateMetadata({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  if (!(state in STATES)) return {};
  return buildMetadata({ title: TITLE, description: DESCRIPTION, path: PATHS.mortgageBrokerNsw });
}

export default async function StateHub({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params;
  if (!(state in STATES)) notFound();
  const groups = lgaGroupsFor(PUBLISHED_SLUGS);
  const regions = [...new Set(groups.map((g) => g.region ?? "Other"))].sort((a, b) => (a === "Greater Sydney" ? -1 : b === "Greater Sydney" ? 1 : a.localeCompare(b)));
  const sales = suburbDataset.sources.dcjSales;
  const rent = suburbDataset.sources.dcjRent;

  return (
    <>
      <JsonLd data={webPageJsonLd({ path: PATHS.mortgageBrokerNsw, name: TITLE, description: DESCRIPTION, type: "CollectionPage" })} />
      <PageIntro
        crumbs={[
          { name: "Mortgage broker", path: PATHS.mortgageBroker },
          { name: "NSW", path: PATHS.mortgageBrokerNsw },
        ]}
        eyebrow="NSW suburb guides"
        title="Buying in Sydney and NSW, suburb by suburb"
        lede={`Each guide uses the suburb's own figures: who lives there (ABS Census 2021), what homes sell and rent for (NSW DCJ), and what duty and deposit a buyer needs at the median price. We work with buyers in every one of these suburbs by ${consultationModes()}; we don't have offices in them.`}
        actions={
          <LinkButton href={PATHS.book} arrow>
            Book a consultation
          </LinkButton>
        }
      >
        <KeyFacts
          className="mt-10"
          items={[
            { value: PUBLISHED_SUBURBS.length, label: "Suburb guides" },
            { value: groups.length, label: "Council areas" },
            { value: sales?.quarter?.replace("-", " ") ?? "—", label: <>Latest DCJ sales quarter{sales?.period ? ` (${period(sales.period)})` : ""}</> },
          ]}
        />
      </PageIntro>

      {regions.map((region, ri) => (
        <Section
          key={region}
          id={region.toLowerCase().replace(/[^a-z]+/g, "-")}
          tone={ri % 2 ? "sand" : "white"}
          index={String(ri + 1).padStart(2, "0")}
          eyebrow={region}
          title={region === "Greater Sydney" ? "Sydney suburbs by council area" : `${region}: regional guides`}
          lede={
            region === "Greater Sydney"
              ? "A suburb that spans two council areas is listed under both. Prices are medians for the latest DCJ quarter, by postcode."
              : "Outside Sydney, the 5% Deposit Scheme has a lower price cap, and some postcodes are designated regional areas for 491 and 494 visa holders."
          }
        >
          <div className="grid gap-12">
            {groups
              .filter((g) => (g.region ?? "Other") === region)
              .map((g) => (
                <div key={g.code}>
                  <h3 className="mw-h3" style={{ marginBottom: 12 }}>
                    {g.name}
                  </h3>
                  <IndexList
                    columns={2}
                    items={g.members.map((m) => {
                      const s = getSuburbBySlug(m.slug)!;
                      const u = medianPrice(s, "unit");
                      const h = medianPrice(s, "house");
                      const price = u ? `Median unit ${aud(u.value)}` : h ? `Median house ${aud(h.value)}` : null;
                      return {
                        href: suburbPath(s),
                        title: `${m.name} ${m.postcode}`,
                        description: [price, s.census.nepalBorn != null ? `${num(s.census.nepalBorn)} born in Nepal` : null].filter(Boolean).join(" · "),
                        meta: m.primary ? (s.lgas.length > 1 ? `Mostly in ${g.name} (${m.areaSharePct}% of its area)` : undefined) : `Partly in ${g.name} (${m.areaSharePct}% of its area)`,
                      };
                    })}
                  />
                </div>
              ))}
          </div>
        </Section>
      ))}

      <Section id="sources" size="tight">
        <Sources
          id="hub-sources"
          items={[
            { title: LGA_SOURCE.source, publisher: "ABS, CC BY 4.0", url: LGA_SOURCE.sourceUrl },
            { title: "Census of Population and Housing 2021", publisher: "ABS, CC BY 4.0", url: "https://www.abs.gov.au/census/find-census-data/quickstats/2021" },
            ...(sales ? [{ title: `Rent and Sales Report, sales tables (${period(sales.period ?? "")})`, publisher: "NSW DCJ", url: sales.sourceUrl }] : []),
            ...(rent ? [{ title: `Rent and Sales Report, rent tables (${period(rent.period ?? "")})`, publisher: "NSW DCJ", url: rent.sourceUrl }] : []),
          ]}
          intro={<>Data last updated {formatDate(DATA_PULLED_AT)}. Council areas are assigned by land area, not population.</>}
        />
      </Section>
      <Container>
        <div style={{ paddingBottom: 64 }}>
          <Disclaimer />
        </div>
      </Container>
    </>
  );
}
