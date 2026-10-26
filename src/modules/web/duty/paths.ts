import type { AuState } from "@/modules/calc/types";

/** /stamp-duty/<state> (lowercase, slash-less). */
export const dutyPath = (s: AuState) => `/stamp-duty/${s.toLowerCase()}`;
