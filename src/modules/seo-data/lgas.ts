/**
 * LGA grouping for the NSW hub (/mortgage-broker/nsw/), derived from the suburb dataset so it stays in
 * sync after each refresh. Membership comes from ASGS 2021 SAL × LGA polygon overlap by land area:
 * a suburb is listed under its primary LGA (largest share) and also under any other LGA holding
 * ≥ SECONDARY_MIN_SHARE of its area (flagged `primary: false`, e.g. Kogarah under Georges River).
 */
import { SUBURBS } from "./suburbs";
import type { SourceRef, StateCode, SuburbRecord } from "./types";

export const SECONDARY_MIN_SHARE = 10;

export interface LgaMember {
  slug: string;
  name: string;
  postcode: string;
  batch: 1 | 2;
  primary: boolean;
  areaSharePct: number;
}

export interface LgaGroup {
  /** ASGS 2021 LGA code. */
  code: string;
  /** ASGS 2021 LGA name ("(NSW)" suffix removed). */
  name: string;
  slug: string;
  state: StateCode;
  /** GCCSA of the member suburbs, e.g. "Greater Sydney" / "Rest of NSW". */
  region: string | null;
  members: LgaMember[];
  /** Sum of Nepal-born persons over primary members (ABS 2021) — for ordering only. */
  nepalBornPrimary: number;
}

export const LGA_SOURCE: SourceRef = {
  source: "ABS ASGS Edition 3 (2021): SAL and LGA boundaries (area overlap)",
  sourceUrl: "https://geo.abs.gov.au/arcgis/rest/services/ASGS2021/LGA/MapServer",
  licence: "CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)",
  attribution: "Source: ABS, Australian Statistical Geography Standard (ASGS) Edition 3, CC BY 4.0",
  year: 2021,
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function buildLgaGroups(suburbs: readonly SuburbRecord[], state: StateCode = "NSW"): LgaGroup[] {
  const groups = new Map<string, LgaGroup>();
  for (const s of suburbs) {
    if (s.state !== state) continue;
    s.lgas.forEach((l, i) => {
      const primary = i === 0;
      if (!primary && l.areaSharePct < SECONDARY_MIN_SHARE) return;
      let g = groups.get(l.code);
      if (!g) {
        g = { code: l.code, name: l.name, slug: slugify(l.name), state, region: s.gccsa, members: [], nepalBornPrimary: 0 };
        groups.set(l.code, g);
      }
      g.members.push({ slug: s.slug, name: s.name, postcode: s.postcode, batch: s.batch, primary, areaSharePct: l.areaSharePct });
      if (primary) g.nepalBornPrimary += s.census.nepalBorn ?? 0;
    });
  }
  for (const g of groups.values())
    g.members.sort((a, b) => Number(b.primary) - Number(a.primary) || a.name.localeCompare(b.name));
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** All NSW LGA groups for the dataset (batch 1 + 2). Filter members by published slugs at render time. */
export const NSW_LGA_GROUPS: LgaGroup[] = buildLgaGroups(SUBURBS, "NSW");

export function lgaGroupsFor(publishedSlugs: ReadonlySet<string>): LgaGroup[] {
  return NSW_LGA_GROUPS.map((g) => ({ ...g, members: g.members.filter((m) => publishedSlugs.has(m.slug)) })).filter(
    (g) => g.members.length > 0,
  );
}
