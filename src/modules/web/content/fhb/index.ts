import type { AuState } from "@/modules/calc/types";
import { STATE_ORDER, stateFromSlug, stateSlug } from "../shared/rules";
import type { FhbStateContent } from "./types";
import nsw from "./states/nsw";
import vic from "./states/vic";
import qld from "./states/qld";
import wa from "./states/wa";
import sa from "./states/sa";
import tas from "./states/tas";
import act from "./states/act";
import nt from "./states/nt";
import { fhbPath } from "./FhbArticle";

export const FHB_PAGES: Record<AuState, FhbStateContent> = { NSW: nsw, VIC: vic, QLD: qld, WA: wa, SA: sa, TAS: tas, ACT: act, NT: nt };
export const FHB_SLUGS = STATE_ORDER.map(stateSlug);

export function getFhbPage(slug: string): FhbStateContent | null {
  const s = stateFromSlug(slug);
  return s ? FHB_PAGES[s] : null;
}

export { fhbPath };
