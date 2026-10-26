import { Fragment } from "react";
import { Phone } from "lucide-react";
import { ArticleLayout } from "../components/content/ArticleLayout";
import { CtaBand } from "../components/content/CtaBand";
import { Disclaimer } from "../components/content/Disclaimer";
import { Faq, type FaqEntry } from "../components/content/Faq";
import { Prose } from "../components/content/Prose";
import { Sources, type SourceItem } from "../components/content/Sources";
import { WorkedExampleTable, type WorkedRow } from "../components/content/WorkedExampleTable";
import { LinkButton, TextLink } from "../components/ui/Button";
import { Callout } from "../components/ui/Callout";
import { Placeholder } from "../components/ui/Fact";
import { PATHS, SITE, confirmedLanguages } from "../config";
import { consultationModes, formatDate } from "../format";
import { JsonLd, BUSINESS_ID, webPageJsonLd } from "../seo";
import type { ReviewState } from "../review";
import { NSW } from "@/modules/calc/rules/nsw";
import { FIVE_PERCENT_DEPOSIT_SCHEME } from "@/modules/calc/rules/federal";
import {
  aud,
  costIntro,
  countryName,
  dutySentences,
  glanceCommentary,
  headings,
  introSentences,
  nearbyAnchor,
  nearbySentence,
  num,
  pct,
  period,
  pick,
  medianOf,
  priceWord,
  rentSentences,
  schemeSentences,
  shareWords,
} from "./copy";
import { DutyIsland } from "./DutyIsland";
import type { PriceBlock, SuburbView } from "./model";

export const suburbTitle = (v: SuburbView) => `Mortgage Broker ${v.s.name} ${v.s.postcode}`;

export function suburbDescription(v: SuburbView) {
  const { s } = v;
  const b = v.unit ?? v.house;
  const price = b ? `median ${b.price.kind} ${aud(b.price.value)}` : null;
  const duty = b ? (b.duty.firstHome.transferDuty === 0 ? "no duty for eligible first home buyers" : `first home buyer duty ${aud(b.duty.firstHome.transferDuty)}`) : null;
  const facts = [price, duty, s.census.renterPct != null ? `${pct(s.census.renterPct)} renting` : null].filter(Boolean).join(", ");
  return `Buying in ${s.name} ${s.postcode}: ${facts}. Deposits, rent vs buying and nearby suburbs, with sources. NSW broker Sulav Adhikari, by phone or video.`;
}

const countWords = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

function DataCard({ items }: { items: { label: string; value: React.ReactNode; sub?: React.ReactNode; source: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-[var(--mw-line)] bg-[var(--mw-line)]" style={{ margin: "24px 0 0" }}>
      {items.map((it) => (
        <div key={it.label} className="flex flex-col gap-1 bg-[var(--mw-surface)] px-3.5 py-3.5 sm:px-5 sm:py-4">
          <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[var(--mw-text-3)] sm:text-[0.8125rem]">{it.label}</dt>
          <dd className="m-0 flex flex-col gap-1">
            <span className="mw-num" style={{ fontFamily: "var(--mw-serif)", fontSize: "clamp(1.375rem, 1.1rem + 1vw, 1.75rem)", lineHeight: 1.15, fontWeight: 400, color: "var(--mw-text)" }}>
              {it.value}
            </span>
            {it.sub && <span className="text-[0.875rem] text-[var(--mw-text-2)] sm:text-[0.9375rem]">{it.sub}</span>}
            <span className="text-[0.8125rem] text-[var(--mw-text-3)]">{it.source}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function SuburbGuide({ v, review, isProduction }: { v: SuburbView; review: ReviewState; isProduction: boolean }) {
  const { s } = v;
  const c = s.census;
  const name = s.name;
  const sl = s.slug;
  const modes = consultationModes();
  const H = headings(v);
  const census = "ABS Census 2021";
  const dcjSales = v.unit?.price ?? v.house?.price;
  const dcjRentLabel = v.rent.period ? `NSW DCJ, ${period(v.rent.period)}` : "NSW DCJ";
  const checked = v.rulesCheckedAt ? formatDate(v.rulesCheckedAt) : "";
  const nepaliConfirmed = confirmedLanguages().some((l) => l.code === "ne");
  const note = review.brokerNote.trim();
  const fb = v.unit ?? v.house; // headline price block (unit where there is one)

  /* -------- data card: 10 fields, each with source and year */
  const top3 = (c.topCountriesOfBirth ?? []).map((t) => countryName(t.name));
  const card = [
    c.population != null && { label: "Residents", value: num(c.population), sub: c.occupiedPrivateDwellings ? `${num(c.occupiedPrivateDwellings)} occupied homes` : undefined, source: census },
    c.bornOverseasPct != null && { label: "Born overseas", value: pct(c.bornOverseasPct), sub: top3.length ? `Top birthplaces: ${top3.join(", ")}` : undefined, source: census },
    c.nepalBorn != null && { label: "Born in Nepal", value: num(c.nepalBorn), sub: c.nepalBornPct != null ? `${pct(c.nepalBornPct)} of residents` : undefined, source: census },
    c.nepaliSpokenAtHome != null && { label: "Speak Nepali at home", value: num(c.nepaliSpokenAtHome), sub: c.nepaliSpokenAtHomePct != null ? `${pct(c.nepaliSpokenAtHomePct)} of residents` : undefined, source: census },
    c.arrivedLast5yrsPct != null && { label: "Arrived 2016 to 2021", value: pct(c.arrivedLast5yrsPct), sub: c.arrived2016to2021 ? `${num(c.arrived2016to2021)} people born overseas` : undefined, source: census },
    c.medianAge != null && { label: "Median age", value: String(c.medianAge), sub: c.avgHouseholdSize ? `${c.avgHouseholdSize} people per household` : undefined, source: census },
    c.medianHouseholdIncomeWk != null && { label: "Median household income", value: `${aud(c.medianHouseholdIncomeWk)}/wk`, sub: `${aud(c.medianHouseholdIncomeWk * 52)} a year`, source: census },
    c.renterPct != null && {
      label: "Households renting",
      value: pct(c.renterPct),
      sub: c.ownerWithMortgagePct != null && c.ownedOutrightPct != null ? `${pct(c.ownerWithMortgagePct)} mortgage, ${pct(c.ownedOutrightPct)} owned outright` : undefined,
      source: census,
    },
    c.dwellingMix && { label: "Flats and apartments", value: pct(c.dwellingMix.flatApartmentPct), sub: `${pct(c.dwellingMix.separateHousePct)} separate houses, ${pct(c.dwellingMix.semiDetachedPct)} semis and townhouses`, source: census },
    v.rent.latestWk != null && { label: "Median rent, new leases", value: `${aud(v.rent.latestWk)}/wk`, sub: v.rent.where ? `All dwellings, ${v.rent.where}` : undefined, source: dcjRentLabel },
  ].filter(Boolean) as { label: string; value: string; sub?: string; source: string }[];

  /* -------- cost table */
  const blocks = [v.unit, v.house].filter((b): b is PriceBlock => !!b);
  const cols = blocks.map((b, i) => ({ key: `c${i}`, label: `Median ${b.price.kind}${b.price.geography === "lga" ? " (council area)" : ""}`, numeric: true }));
  const cells = (f: (b: PriceBlock) => React.ReactNode) => Object.fromEntries(blocks.map((b, i) => [`c${i}`, f(b)]));
  const dutyCell = (n: number) => (v.rulesOk ? aud(n) : "See Revenue NSW");
  const costRows: WorkedRow[] = [
    { label: "Median sale price", cells: cells((b) => aud(b.price.value)) },
    ...[5, 10, 20].map((p) => ({ label: `${p}% deposit${p === 20 ? " (no LMI)" : ""}`, cells: cells((b) => aud(b.deposit.rows.find((r) => r.depositPct === p)?.deposit ?? 0)) })),
    { label: "Transfer duty, standard", cells: cells((b) => dutyCell(b.duty.standard.transferDuty)) },
    { label: "Transfer duty, first home buyer", cells: cells((b) => dutyCell(b.duty.firstHome.transferDuty)) },
    { label: "Registration fees", cells: cells((b) => aud(b.duty.firstHome.mortgageRegFee + b.duty.firstHome.transferFee)) },
    { label: `5% Deposit Scheme cap (${aud(v.schemeCap)})`, cells: cells((b) => (b.scheme.withinCap ? "Under" : "Over")) },
    { label: "Cash needed, first home buyer, 10% deposit", cells: cells((b) => (v.rulesOk ? aud(b.deposit.rows.find((r) => r.depositPct === 10)?.cashNeeded ?? 0) : "—")), total: true },
  ];

  /* -------- rent table */
  const rentRows: WorkedRow[] = v.rent.rows.slice(0, 7).map((r) => ({
    label: (
      <>
        {r.label}
        {r.smallSample && <span className="mw-small"> (small sample)</span>}
      </>
    ),
    cells: { wk: aud(r.medianWk), yr: aud(r.medianWk * 52), bonds: r.bonds != null ? num(r.bonds) : "11 to 30" },
  }));

  /* -------- who we help: blocks switched on by data thresholds */
  const help: { id: string; title: string; body: React.ReactNode }[] = [];
  if (c.nepalBornPct != null && c.nepalBornPct >= 5 && c.nepalBorn) {
    help.push({
      id: "nepali",
      title: pick(sl, "hNep", ["Buyers from the Nepali community", `Nepali-Australian buyers in ${name}`, "Nepali-speaking households"]),
      body: (
        <>
          <p>
            {pick(sl, "nep0", [
              `${num(c.nepalBorn)} residents (${pct(c.nepalBornPct)}) were born in Nepal${c.nepaliSpokenAtHome ? ` and ${num(c.nepaliSpokenAtHome)} speak Nepali at home` : ""}, ${shareWords(c.nepalBornPct)} of the suburb.`,
              c.nepaliSpokenAtHome
                ? `Nepali is the home language of ${num(c.nepaliSpokenAtHome)} residents (${pct(c.nepaliSpokenAtHomePct ?? 0)}), and ${num(c.nepalBorn)} people here were born in Nepal.`
                : `${num(c.nepalBorn)} people here (${pct(c.nepalBornPct)}) were born in Nepal.`,
              `Nepal-born residents number ${num(c.nepalBorn)} here, ${pct(c.nepalBornPct)} of the population${c.nepaliSpokenAtHome ? `, with ${num(c.nepaliSpokenAtHome)} speaking Nepali at home` : ""}.`,
            ])}{" "}
            {pick(sl, "nep1", [
              "We often help document a gift from family in Nepal, explain how lenders treat savings held overseas, and turn lakh and crore figures into a deposit in Australian dollars.",
              "Common questions here: will a lender accept a gift from parents in Nepal, how is overseas income or savings counted, and what does a deposit in lakh come to in dollars.",
              "For many buyers part of the deposit comes from Nepal, so we check how each lender wants that money documented before it is transferred.",
            ])}
            {nepaliConfirmed ? " Sulav can run the consultation in Nepali." : ""}
          </p>
          <p>
            <TextLink href={PATHS.nepaliCommunity} arrow>
              Nepali community home loans
            </TextLink>{" "}
            <TextLink href={PATHS.nprConverter} arrow>
              NPR to AUD converter
            </TextLink>
          </p>
        </>
      ),
    });
  }
  // Visa block: many recent arrivals, or a designated regional area (491/494 holders can live here).
  const showVisa = (c.arrivedLast5yrsPct != null && c.arrivedLast5yrsPct >= 12 && !!c.arrived2016to2021) || !!v.regional.category;
  if (showVisa && c.arrived2016to2021 != null && c.arrivedLast5yrsPct != null) {
    const sur = fb?.duty.foreign.surcharge;
    help.push({
      id: "visa",
      title: pick(sl, "hVisa", ["Recent arrivals and visa holders", "Buying soon after you arrive", "Visa holders and new permanent residents"]),
      body: (
        <>
          <p>
            {v.regional.category && c.arrivedLast5yrsPct < 12
              ? `Only ${pct(c.arrivedLast5yrsPct)} of residents arrived between 2016 and 2021, but ${name} is in a designated regional area, so it is one of the places a subclass 491 or 494 holder can live.`
              : pick(sl, "visa0", [
              `${num(c.arrived2016to2021)} residents (${pct(c.arrivedLast5yrsPct)}) arrived in Australia between 2016 and Census night 2021.`,
              `${pct(c.arrivedLast5yrsPct)} of ${name}'s population, ${num(c.arrived2016to2021)} people, had arrived in Australia in the five years to 2021.`,
              `Recent arrivals are a big group: ${num(c.arrived2016to2021)} people came to Australia between 2016 and 2021${c.arrivedLast5yrsPctOfOverseasBorn != null ? `, ${pct(c.arrivedLast5yrsPctOfOverseasBorn)} of everyone here born overseas` : ""}.`,
                ])}{" "}
            {pick(sl, "visa1", [
              `Permanent residents can usually get the same first home concessions as citizens. Temporary residents need FIRB approval, generally can't buy an established home before ${formatDate(v.ban.to)}, and pay ${v.surchargePct}% surcharge purchaser duty`,
              `Your visa changes the numbers: a temporary resident pays ${v.surchargePct}% surcharge purchaser duty, needs FIRB approval and is generally limited to new homes until ${formatDate(v.ban.to)}, while a permanent resident is treated much like a citizen`,
              `On a temporary visa you are a foreign person, so FIRB approval, the ban on established homes (to ${formatDate(v.ban.to)}) and ${v.surchargePct}% surcharge purchaser duty all apply; permanent residents usually avoid all three`,
            ])}
            {sur && v.rulesOk && fb ? `. The surcharge alone is ${aud(sur)} on the median ${priceWord(fb.price.kind)}.` : "."}{" "}
            {v.regional.category
              ? `Postcode ${s.postcode} is a Category ${v.regional.category} designated regional area, so 491 and 494 holders can live and work here.`
              : `Postcode ${s.postcode} is not a designated regional area, so a 491 or 494 holder bound by condition 8579 can't live here on that visa.`}
          </p>
          <p>
            Visa guides: <TextLink href={PATHS.visa189}>subclass 189</TextLink>, <TextLink href={PATHS.visa190}>190</TextLink>, <TextLink href={PATHS.visa491}>491</TextLink>,{" "}
            <TextLink href={PATHS.visa482}>482</TextLink>.
          </p>
        </>
      ),
    });
  }
  if (c.renterPct != null && c.renterPct >= 50 && fb) {
    help.push({
      id: "fhb",
      title: pick(sl, "hFhb", ["First home buyers", "Renters ready to buy", "Moving from renting to owning"]),
      body: (
        <>
          <p>
            {pct(c.renterPct)} of households rent, {shareWords(c.renterPct)}. On the median {priceWord(fb.price.kind)}, a first purchase means {aud(fb.deposit.rows[0].deposit)} for a 5%
            deposit, {fb.duty.firstHome.transferDuty === 0 ? "no transfer duty" : `${aud(fb.duty.firstHome.transferDuty)} in duty`} and a price{" "}
            {fb.scheme.withinCap ? "inside" : "outside"} the 5% scheme cap.{" "}
            {pick(sl, "fhb1", [
              "Lenders also look for genuine savings and steady income, and some accept a family guarantor instead of part of the deposit.",
              "Three months of steady savings and recent payslips usually matter as much as the deposit itself.",
              "A gift from family or a guarantor can close the gap, but lenders still want to see your own savings history.",
            ])}
          </p>
          <p>
            <TextLink href={PATHS.firstHomeBuyersNsw} arrow>
              NSW first home buyer guide
            </TextLink>
          </p>
        </>
      ),
    });
  }
  if (c.ownerWithMortgagePct != null && c.ownerWithMortgagePct >= 25) {
    help.push({
      id: "refi",
      title: pick(sl, "hRefi", ["Owners with a mortgage", "Refinancing an existing loan", "Reviewing the loan you have"]),
      body: (
        <>
          <p>
            {pct(c.ownerWithMortgagePct)} of {name} homes are owned with a mortgage
            {c.medianMortgageRepayMth2021 ? `, with a median repayment of ${aud(c.medianMortgageRepayMth2021 * 12)} a year in 2021` : ""}.{" "}
            {pick(sl, "refi1", [
              "If your loan is a few years old, or your income or visa status has changed, a review shows whether another lender would treat you better.",
              "Loans taken out before a move to permanent residency are often worth a second look.",
            ])}{" "}
            <TextLink href={PATHS.refinancing}>Refinancing</TextLink>
          </p>
        </>
      ),
    });
  }
  if (c.dwellingMix && c.dwellingMix.flatApartmentPct >= 50) {
    help.push({
      id: "units",
      title: pick(sl, "hUnit", ["Buying a unit", "Units and strata", "Apartment purchases"]),
      body: (
        <p>
          {pick(sl, "unit0", [
            `${pct(c.dwellingMix.flatApartmentPct)} of homes are flats or apartments, and lender policies differ on units, for example on minimum floor area and high-density buildings.`,
            `With units making up ${pct(c.dwellingMix.flatApartmentPct)} of homes, the building matters: some lenders limit loans on small or high-density apartments.`,
            `Most buyers here are looking at strata (${pct(c.dwellingMix.flatApartmentPct)} of homes are apartments), where the valuation and the building decide how much you can borrow.`,
          ])}{" "}
          {pick(sl, "unit1", [
            "Get the strata report before you bid and send us the address so we can check lender policy for that building.",
            "Send us the building address early: we check which lenders accept it before you spend money on reports.",
            "Before you bid, read the strata report for special levies and defects, and let us confirm the building suits your lender.",
          ])}
        </p>
      ),
    });
  }
  if (c.dwellingMix && c.dwellingMix.separateHousePct >= 60) {
    const fhog = NSW.grants.find((g) => g.id === "fhog");
    help.push({
      id: "houses",
      title: pick(sl, "hHouse", ["Buying a house or building new", "Houses and new builds", "House and land buyers"]),
      body: (
        <>
          <p>
            {pct(c.dwellingMix.separateHousePct)} of homes are separate houses.
            {fhog
              ? ` The ${aud(fhog.amount)} ${fhog.name} is for new homes up to ${aud(fhog.priceCap ?? 0)}${fhog.buildCap ? ` (land and build up to ${aud(fhog.buildCap)})` : ""}${v.house ? `, against a ${aud(v.house.price.value)} median house here` : ""}.`
              : ""}{" "}
            Building means a construction loan paid in stages. <TextLink href={PATHS.constructionLoans}>Construction loans</TextLink>
          </p>
        </>
      ),
    });
  }

  /* -------- FAQ: 4 to 5 questions, answered from this suburb's figures */
  const faq: FaqEntry[] = [];
  if (fb && v.rulesOk) {
    const fh = fb.duty.firstHome.transferDuty;
    const std = fb.duty.standard.transferDuty;
    const w = priceWord(fb.price.kind);
    faq.push({
      question: `How much stamp duty would a first home buyer pay on a median ${name} ${w}?`,
      answer:
        fh === 0
          ? `None, if you qualify for the First Home Buyers Assistance Scheme: the ${aud(fb.price.value)} median ${w} is under the exemption limit. Other buyers pay ${aud(std)}. Checked against Revenue NSW on ${checked}.`
          : fh < std
            ? `About ${aud(fh)} instead of ${aud(std)}: the ${aud(fb.price.value)} median ${w} is in the concession taper. Checked against Revenue NSW on ${checked}.`
            : `${aud(std)}, the same as any other buyer: the ${aud(fb.price.value)} median ${w} is above the concession limit. Checked against Revenue NSW on ${checked}.`,
    });
  }
  if (fb) {
    const r = fb.deposit.rows;
    faq.push({
      question: `What deposit do I need to buy in ${name}?`,
      answer: `For the ${medianOf(fb)} (${aud(fb.price.value)}): ${aud(r[0].deposit)} at 5%, ${aud(r[1].deposit)} at 10% or ${aud(r[2].deposit)} at 20%.${v.house && v.unit ? ` The ${medianOf(v.house)} needs ${aud(v.house.deposit.rows[2].deposit)} for 20%.` : ""} Below 20%, expect LMI unless you use the 5% Deposit Scheme or a guarantor.`,
    });
    faq.push({
      question: `Can I use the 5% Deposit Scheme in ${name}?`,
      answer: `${blocks.map((b) => `The ${medianOf(b)} (${aud(b.price.value)}) is ${b.scheme.withinCap ? `${aud(v.schemeCap - b.price.value)} under` : `${aud(b.price.value - v.schemeCap)} over`} the ${aud(v.schemeCap)} cap.`).join(" ")} You must be a citizen or permanent resident and a first home buyer.`,
    });
  }
  if (v.rent.latestWk && v.rent.censusRepayMonthly) {
    faq.push({
      question: `Is it cheaper to rent or buy in ${name}?`,
      answer: pick(sl, "faqRent", [
        `That depends on the rate you are offered, so we don't assume one. New leases in ${v.rent.where} cost a median ${aud(v.rent.latestWk * 52)} a year; in 2021 the median mortgage here cost ${aud(v.rent.censusRepayMonthly * 12)} a year in repayments.`,
        `We can't say without your rate. For scale: a year of median rent on a new lease is ${aud(v.rent.latestWk * 52)}, and 2021 mortgage repayments ran at a median ${aud(v.rent.censusRepayMonthly * 12)} a year.`,
      ]),
    });
  }
  if (showVisa) {
    faq.push(
      v.regional.category
        ? {
            question: `Does ${name} count as regional for a 491 visa?`,
            answer: `Yes. Postcode ${s.postcode} is a Category ${v.regional.category} designated regional area, so 491 and 494 holders can live and work here. As temporary residents they still need FIRB approval and pay ${v.surchargePct}% surcharge purchaser duty.`,
          }
        : {
            question: `Can I buy in ${name} on a 491 visa?`,
            answer: pick(sl, "faq491", [
              `Not to live in while you hold the 491: postcode ${s.postcode} is not a designated regional area, and condition 8579 requires you to live in one. Once you hold the 191 permanent visa, that restriction ends.`,
              `Only once you move to the permanent 191. Until then condition 8579 keeps you in a designated regional area, and postcode ${s.postcode} is not one.`,
              `Postcode ${s.postcode} is outside the designated regional areas, so a 491 holder can't live here under condition 8579. The permanent 191 visa removes that limit.`,
            ]),
          },
    );
  }

  /* -------- sources (one line per source, checked dates for rules) */
  const ruleDate = blocks[0]?.duty.firstHome.rulesVerifiedAt;
  const sources: SourceItem[] = [
    { title: `ABS QuickStats 2021: ${name} (SAL${s.salCode})`, publisher: "ABS, CC BY 4.0", url: c.quickStatsUrl },
    { title: `ABS Census 2021 tables for SAL${s.salCode}`, publisher: "ABS Data API, CC BY 4.0", url: c.tableUrls.G02 ?? c.sourceRef.sourceUrl },
    { title: "ASGS Edition 3 boundaries", publisher: "ABS, CC BY 4.0", url: s.geoSourceRef.sourceUrl },
    ...(dcjSales ? [{ title: `Rent and Sales Report, sales ${period(dcjSales.period)}`, publisher: "NSW DCJ", url: dcjSales.sourceUrl }] : []),
    ...(v.rent.sourceUrl ? [{ title: `Rent and Sales Report, rents ${period(v.rent.period)}`, publisher: "NSW DCJ", url: v.rent.sourceUrl }] : []),
    { title: "Transfer duty rates", publisher: "Revenue NSW", url: NSW.generalScale.sourceUrls[0], checkedAt: ruleDate },
    ...(v.fhbas ? [{ title: v.fhbas.name, publisher: "Revenue NSW", url: v.fhbas.sourceUrls[0], checkedAt: v.fhbas.verifiedAt }] : []),
    { title: "5% Deposit Scheme price caps", publisher: "Housing Australia", url: FIVE_PERCENT_DEPOSIT_SCHEME.sourceUrls[0], checkedAt: FIVE_PERCENT_DEPOSIT_SCHEME.verifiedAt },
    ...(help.some((h) => h.id === "visa")
      ? [
          { title: "Regional postcodes (condition 8579)", publisher: "Home Affairs", url: v.regional.sourceUrls[v.regional.sourceUrls.length - 1], checkedAt: v.regional.verifiedAt },
          { title: "Established dwelling ban", publisher: "Australian Government", url: v.ban.sourceUrls[0], checkedAt: v.ban.verifiedAt },
        ]
      : []),
  ];

  /* -------- JSON-LD (§C4.1: WebPage about Place, mainEntity Service; no AggregateRating, no LocalBusiness address) */
  const place = {
    "@type": "Place",
    name: `${name} NSW ${s.postcode}`,
    address: { "@type": "PostalAddress", addressLocality: name, postalCode: s.postcode, addressRegion: "NSW", addressCountry: "AU" },
    ...(s.lga ? { containedInPlace: { "@type": "AdministrativeArea", name: `${s.lga.name} council area` } } : {}),
    ...(s.centroid ? { geo: { "@type": "GeoCoordinates", latitude: s.centroid.lat, longitude: s.centroid.lng } } : {}),
  };
  const h1 = `Mortgage broker for ${name} (${s.postcode}) home buyers`;
  const jsonLd = webPageJsonLd({
    path: v.path,
    name: h1,
    description: suburbDescription(v),
    about: place,
    mainEntity: { "@type": "Service", serviceType: "Mortgage broking", provider: { "@id": BUSINESS_ID }, areaServed: place },
  });

  const showNote = !!note || !isProduction;
  const toc = [
    { id: "glance", label: H.glance },
    { id: "cost", label: "Buying costs" },
    { id: "rent", label: "Renting vs buying" },
    { id: "help", label: "Who we help" },
    ...(showNote ? [{ id: "note", label: "Sulav's local note" }] : []),
    ...(v.nearby.length ? [{ id: "nearby", label: "Nearby suburbs" }] : []),
    { id: "faq", label: "Questions" },
    { id: "sources", label: "Sources" },
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      <ArticleLayout
        crumbs={[
          { name: "Mortgage broker", path: PATHS.mortgageBroker },
          { name: "NSW", path: PATHS.mortgageBrokerNsw },
          { name, path: v.path },
        ]}
        eyebrow={`Suburb guide${v.lgaLabel ? ` · ${v.lgaLabel} council area` : ""}`}
        title={h1}
        lede={
          <>
            <p className="mw-lede">{introSentences(v, modes).join(" ")}</p>
            <div className="mw-btnrow" style={{ marginTop: 28 }}>
              <LinkButton href={PATHS.book} arrow>
                Book a consultation
              </LinkButton>
              <LinkButton href={PATHS.borrowingPower} variant="secondary">
                Check borrowing power
              </LinkButton>
              <LinkButton href={SITE.broker.phoneHref} variant="quiet" icon={<Phone size={18} strokeWidth={1.5} aria-hidden="true" />}>
                <span className="mw-num">{SITE.broker.phone}</span>
              </LinkButton>
            </div>
          </>
        }
        reviewed={review.reviewed && review.reviewedAt ? { reviewedAt: review.reviewedAt.toISOString().slice(0, 10), updatedAt: v.dataPulledAt, sourcesHref: "#sources" } : undefined}
        toc={toc}
        footer={
          <>
            {faq.length > 0 && (
              <section id="faq" aria-labelledby="faq-title" style={{ marginTop: 64 }}>
                <h2 id="faq-title" className="mw-h2" style={{ marginBottom: 20, fontSize: "clamp(1.625rem, 1.35rem + 1vw, 2.125rem)" }}>
                  {H.faq}
                </h2>
                <Faq items={faq} />
              </section>
            )}
            <div style={{ marginTop: 56 }}>
              <CtaBand
                bare
                compact
                headingLevel={2}
                title={pick(sl, "ctaT", [`Buying in ${name}?`, "Talk it through with Sulav", `Your ${name} numbers, checked`])}
                body={
                  fb
                    ? `Sulav checks your deposit, income and visa against lender policy for a ${priceWord(fb.price.kind)} around ${aud(fb.price.value)}, in a ${SITE.consultation.minutes}-minute call by ${modes}.`
                    : `A ${SITE.consultation.minutes}-minute call by ${modes}, ${SITE.hours.days}.`
                }
              />
            </div>
            <div style={{ marginTop: 56 }}>
              <Sources
                items={sources}
                intro={
                  <>
                    Data last updated <time dateTime={v.dataPulledAt}>{formatDate(v.dataPulledAt)}</time>. Census figures are for 2021; DCJ figures are quarterly medians.
                  </>
                }
              />
            </div>
            <div style={{ marginTop: 40 }}>
              <Disclaimer />
            </div>
          </>
        }
      >
        <Prose>
          <section id="glance">
            <h2>{H.glance}</h2>
            <DataCard items={card} />
            <p style={{ marginTop: 24 }}>{glanceCommentary(v).join(" ")}</p>
          </section>

          <section id="cost">
            <h2>{H.cost}</h2>
            <p>{costIntro(v).join(" ")}</p>
            {blocks.length > 0 && (
              <WorkedExampleTable
                caption={`Buying at the median price in ${name}`}
                rowHeader="Item"
                columns={cols}
                rows={costRows}
                assumptions={[
                  v.rulesOk
                    ? `Owner-occupier, established home, every scheme condition met. Cash needed excludes conveyancing and LMI. ${NSW.rulesVersion} rules, checked ${checked}.`
                    : "Duty rules are due for re-checking: confirm with Revenue NSW.",
                ]}
              />
            )}
            {v.rulesOk ? (
              <>
                <p>{dutySentences(v).join(" ")}</p>
                <p>{schemeSentences(v).join(" ")}</p>
              </>
            ) : (
              <Callout tone="warning" title="Duty figures need re-checking">
                Our copy of the NSW duty rules is more than 90 days old, so we are not showing duty amounts. Use the{" "}
                <TextLink href={NSW.revenueOfficeUrl} external>
                  Revenue NSW calculators
                </TextLink>
                .
              </Callout>
            )}
            {fb && v.rulesOk && <DutyIsland price={fb.price.value} title={`Stamp duty from the ${aud(fb.price.value)} median`} />}
            <p>
              <TextLink href={PATHS.stampDutyNsw} arrow>
                {fb ? `Try a price other than ${aud(fb.price.value)} in the NSW stamp duty calculator` : "NSW stamp duty calculator"}
              </TextLink>
            </p>
          </section>

          <section id="rent">
            <h2>{H.rent}</h2>
            {rentSentences(v).map((g, i) => (
              <p key={i}>{g.join(" ")}</p>
            ))}
            {rentRows.length > 0 && (
              <WorkedExampleTable
                caption={`Median rent on new leases, ${v.rent.where}, ${period(v.rent.period)}`}
                rowHeader="Dwelling"
                columns={[
                  { key: "wk", label: "Weekly", numeric: true },
                  { key: "yr", label: "Yearly", numeric: true },
                  { key: "bonds", label: "New bonds", numeric: true },
                ]}
                rows={rentRows}
                assumptions={["No interest rate is assumed: compare with your own rate in the repayments calculator."]}
              />
            )}
            <p>
              <TextLink href={PATHS.repayments} arrow>
                Repayments calculator
              </TextLink>
            </p>
          </section>

          {help.length > 0 && (
            <section id="help">
              <h2>{H.help}</h2>
              {help.map((b) => (
                <Fragment key={b.id}>
                  <h3>{b.title}</h3>
                  {b.body}
                </Fragment>
              ))}
            </section>
          )}

          {showNote && (
            <section id="note">
              <h2>Sulav&rsquo;s local note on {name}</h2>
              {note ? (
                <>
                  {note.split(/\n\s*\n/).map((para, i) => (
                    <p key={i}>{para.trim()}</p>
                  ))}
                  <p className="mw-small">
                    {SITE.broker.name}, {SITE.broker.role.toLowerCase()}
                    {review.reviewedAt ? `, ${formatDate(review.reviewedAt)}` : ""}
                  </p>
                </>
              ) : (
                <Callout tone="draft" title="Broker note required before publishing">
                  <Placeholder label={`80 to 200 words from Sulav (now ${countWords(note)})`} />
                </Callout>
              )}
            </section>
          )}

          {v.nearby.length > 0 && (
            <section id="nearby">
              <h2>{H.nearby}</h2>
              <p>{nearbySentence(v)}</p>
              <WorkedExampleTable
                caption={`${name} and its nearest neighbours in our guides`}
                rowHeader="Suburb"
                columns={[
                  { key: "km", label: "Distance", numeric: true },
                  { key: "nep", label: "Born in Nepal", numeric: true },
                  { key: "rent", label: "Median rent", numeric: true },
                  { key: "unit", label: "Median unit", numeric: true },
                ]}
                rows={[
                  {
                    label: <strong>{name}</strong>,
                    cells: { km: "—", nep: c.nepalBorn != null ? num(c.nepalBorn) : "—", rent: v.rent.latestWk ? `${aud(v.rent.latestWk)}/wk` : "—", unit: v.unit ? aud(v.unit.price.value) : "—" },
                  },
                  ...v.nearby.map((n) => ({
                    label: <TextLink href={n.path}>{n.name}</TextLink>,
                    cells: {
                      km: `${n.distanceKm} km`,
                      nep: n.nepalBorn != null ? num(n.nepalBorn) : "—",
                      rent: n.rentWk ? `${aud(n.rentWk)}/wk` : "—",
                      unit: n.unit ? `${aud(n.unit.value)}${n.unit.geography === "lga" ? "*" : ""}` : "—",
                    },
                  })),
                ]}
                assumptions={[
                  `Born in Nepal: ${census}. Rent and unit price: NSW DCJ, latest quarter.${v.nearby.some((n) => n.unit?.geography === "lga") ? " * Council-area median." : ""}`,
                ]}
              />
              <p>
                {v.nearby.slice(0, 3).map((n, i, arr) => (
                  <span key={n.slug}>
                    {i === 0 ? "See " : ""}
                    <TextLink href={n.path}>{nearbyAnchor(sl, i, n.name)}</TextLink>
                    {i < arr.length - 2 ? ", " : i === arr.length - 2 ? " or " : "."}
                  </span>
                ))}{" "}
                <TextLink href={PATHS.mortgageBrokerNsw}>All NSW suburb guides</TextLink>
              </p>
            </section>
          )}
        </Prose>
      </ArticleLayout>
    </>
  );
}
