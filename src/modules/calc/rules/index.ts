// All state/territory rules, keyed by state code, plus the Commonwealth schemes.
import type { AuState, StateRules } from "../types";
import { NSW } from "./nsw";
import { VIC } from "./vic";
import { QLD } from "./qld";
import { WA } from "./wa";
import { SA } from "./sa";
import { ACT } from "./act";
import { TAS } from "./tas";
import { NT } from "./nt";
import { FEDERAL } from "./federal";

export const RULES: Record<AuState, StateRules> = { NSW, VIC, QLD, WA, SA, ACT, TAS, NT };
export const ALL_RULES = { ...RULES, FEDERAL };
export { NSW, VIC, QLD, WA, SA, ACT, TAS, NT, FEDERAL };
