import { getSetting, setSetting } from "@/lib/settings";

export type Lender = { name: string; category: string };

const SETTING_KEY = "site.lenders";

/** Starting list shown until staff edit it in Admin > Lenders. Names only, no logos. Confirm against the current AFG panel. */
export const DEFAULT_LENDERS: Lender[] = [
  ...["Commonwealth Bank", "ANZ", "NAB", "Westpac"].map((name) => ({ name, category: "Major banks" })),
  ...["St.George Bank", "Bank of Melbourne", "BankSA", "Macquarie Bank", "ING", "Suncorp Bank", "Bendigo and Adelaide Bank", "Bank of Queensland", "AMP Bank", "Heritage Bank"].map((name) => ({ name, category: "Banks and mutuals" })),
  ...["Pepper Money", "Liberty Financial", "La Trobe Financial", "Resimac", "Firstmac"].map((name) => ({ name, category: "Non-bank lenders" })),
];

export async function getLenders(): Promise<Lender[]> {
  try {
    const v = await getSetting<Lender[] | null>(SETTING_KEY, null);
    if (Array.isArray(v)) return v.filter((l) => l && typeof l.name === "string" && l.name.trim()).map((l) => ({ name: l.name.trim(), category: String(l.category ?? "").trim() }));
  } catch {
    // database unavailable: fall back to the starting list so the home page still renders
  }
  return DEFAULT_LENDERS;
}

export const saveLenders = (list: Lender[]) => setSetting(SETTING_KEY, list);

/** One lender per line: "Name | Category" (category optional). */
export function parseLenderLines(text: string): Lender[] {
  const seen = new Set<string>();
  const out: Lender[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const [name, ...rest] = raw.split("|");
    const n = (name ?? "").trim().slice(0, 80);
    if (!n || seen.has(n.toLowerCase())) continue;
    seen.add(n.toLowerCase());
    out.push({ name: n, category: rest.join("|").trim().slice(0, 60) });
  }
  return out.slice(0, 200);
}

export const formatLenderLines = (list: Lender[]) => list.map((l) => (l.category ? `${l.name} | ${l.category}` : l.name)).join("\n");

/** Groups in the order categories first appear; uncategorised lenders go under "Other lenders". */
export function groupLenders(list: Lender[]): { category: string; items: Lender[] }[] {
  const groups = new Map<string, Lender[]>();
  for (const l of list) {
    const c = l.category || "Other lenders";
    groups.set(c, [...(groups.get(c) ?? []), l]);
  }
  return [...groups].map(([category, items]) => ({ category, items }));
}
