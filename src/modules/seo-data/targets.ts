/**
 * Input list for scripts/pull-abs.ts — which suburbs to pull.
 * SAL codes: ABS ASGS 2021 Suburbs and Localities (checked against the CL_SAL_2021 codelist).
 * Postcodes: the URL postcode for the page; pull-abs.ts cross-checks each one against ASGS POA 2021
 * overlap and warns on mismatch.
 *
 * Batch 1 = research/programmatic-seo.md §C10. Batch 2 = §C7 ("remaining ≥500 Nepal-born":
 * 14 Sydney suburbs named there + Dubbo, the 15th NSW suburb with ≥500 Nepal-born, also listed as a
 * regional 491 guide).
 */
import type { StateCode } from "./types";

export interface SuburbTarget {
  name: string;
  salCode: string;
  postcode: string;
  state: StateCode;
  batch: 1 | 2;
}

export const SUBURB_TARGETS: SuburbTarget[] = [
  // batch 1
  { name: "Auburn", salCode: "10107", postcode: "2144", state: "NSW", batch: 1 },
  { name: "Hurstville", salCode: "11971", postcode: "2220", state: "NSW", batch: 1 },
  { name: "Strathfield", salCode: "13690", postcode: "2135", state: "NSW", batch: 1 },
  { name: "Rockdale", salCode: "13394", postcode: "2216", state: "NSW", batch: 1 },
  { name: "Campsie", salCode: "10781", postcode: "2194", state: "NSW", batch: 1 },
  { name: "Granville", salCode: "11745", postcode: "2142", state: "NSW", batch: 1 },
  { name: "Kogarah", salCode: "12190", postcode: "2217", state: "NSW", batch: 1 },
  { name: "Parramatta", salCode: "13167", postcode: "2150", state: "NSW", batch: 1 },
  { name: "Ashfield", salCode: "10099", postcode: "2131", state: "NSW", batch: 1 },
  { name: "Lidcombe", salCode: "12325", postcode: "2141", state: "NSW", batch: 1 },
  { name: "Burwood", salCode: "10716", postcode: "2134", state: "NSW", batch: 1 },
  // batch 2
  { name: "Homebush West", salCode: "11937", postcode: "2140", state: "NSW", batch: 2 },
  { name: "Penshurst", salCode: "13197", postcode: "2222", state: "NSW", batch: 2 },
  { name: "Hornsby", salCode: "11943", postcode: "2077", state: "NSW", batch: 2 },
  { name: "Merrylands", salCode: "12599", postcode: "2160", state: "NSW", batch: 2 },
  { name: "Dee Why", salCode: "11229", postcode: "2099", state: "NSW", batch: 2 },
  { name: "Homebush", salCode: "11936", postcode: "2140", state: "NSW", batch: 2 },
  { name: "Minto", salCode: "12653", postcode: "2566", state: "NSW", batch: 2 },
  { name: "Allawah", salCode: "10038", postcode: "2218", state: "NSW", batch: 2 },
  { name: "Blacktown", salCode: "10396", postcode: "2148", state: "NSW", batch: 2 },
  { name: "Ingleburn", salCode: "11987", postcode: "2565", state: "NSW", batch: 2 },
  { name: "Carlton", salCode: "10818", postcode: "2218", state: "NSW", batch: 2 },
  { name: "Bardia", salCode: "10195", postcode: "2565", state: "NSW", batch: 2 },
  { name: "Edmondson Park", salCode: "11386", postcode: "2174", state: "NSW", batch: 2 },
  { name: "Westmead", salCode: "14278", postcode: "2145", state: "NSW", batch: 2 },
  { name: "Dubbo", salCode: "11299", postcode: "2830", state: "NSW", batch: 2 },
];

export function suburbSlug(name: string, postcode: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${postcode}`;
}
