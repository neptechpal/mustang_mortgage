// Shared form contract. Unknown fields are stripped before calculation or transmission.
import { z } from "zod/v4";
import { BORROW_DEFAULTS } from "../tools/serviceability/math";

export const QUICK_GOALS = { first_home: "First home", next_home: "Next home (owner-occupier)", investment: "Investment property", refinance: "Refinance", build: "Build" } as const;
export const QUICK_EMPLOYMENT = { full_time: "PAYG full-time", part_time: "PAYG part-time", casual: "PAYG casual", self_employed: "Self-employed", contractor: "Contractor" } as const;
export const QUICK_RESIDENCY = { citizen: "Australian citizen", permanent: "Permanent resident", nz: "NZ citizen", visa: "Visa" } as const;
export const QUICK_VISAS = ["189", "190", "491", "191", "494", "482", "485", "820/801", "500", "bridging", "other"] as const;
const amount = z.number().finite().min(0).max(100_000_000).nullable().default(null);
const applicant = z.object({
  income: amount,
  employment: z.enum(["full_time", "part_time", "casual", "self_employed", "contractor"]).default("full_time"),
  monthsInJob: z.number().int().min(0).max(720).nullable().default(null),
});
export const QuickInputSchema = z.object({
  goal: z.enum(["first_home", "next_home", "investment", "refinance", "build"]),
  state: z.enum(["NSW", "VIC", "QLD", "WA", "SA", "ACT", "TAS", "NT"]),
  price: amount,
  funds: amount,
  applicantCount: z.union([z.literal(1), z.literal(2)]).default(1),
  applicant1: applicant.default({ income: null, employment: "full_time", monthsInJob: null }),
  applicant2: applicant.default({ income: null, employment: "full_time", monthsInJob: null }),
  residency: z.enum(["citizen", "permanent", "nz", "visa"]).default("citizen"),
  visaSubclass: z.enum(QUICK_VISAS).default("other"),
  dependants: z.number().int().min(0).max(20).default(0),
  otherRepayments: amount,
  cardLimits: amount,
  firstHomeBuyer: z.boolean().default(false),
  propertyType: z.enum(["established", "new"]).default("established"),
  ratePct: z.number().finite().gt(0).max(30).default(BORROW_DEFAULTS.product_rate),
  anythingElse: z.string().max(500).default(""),
}).transform((i) => ({
  ...i,
  firstHomeBuyer: i.goal === "first_home" || (i.goal !== "refinance" && i.goal !== "investment" && i.firstHomeBuyer),
  propertyType: i.goal === "build" ? "new" as const : i.propertyType,
  applicant2: i.applicantCount === 2 ? i.applicant2 : { income: null, employment: "full_time" as const, monthsInJob: null },
  visaSubclass: i.residency === "visa" ? i.visaSubclass : "other" as const,
}));
export type QuickInput = z.infer<typeof QuickInputSchema>;
export const QUICK_DEFAULTS: QuickInput = QuickInputSchema.parse({ goal: "first_home", state: "NSW" });
