// Shared (client + server) helpers for /admin/seo. No DB, no Node APIs.

export const countWords = (t: string) => t.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

/** Broker-note minimum per page kind (research §C4.1 / §C6: suburb pages need ≥80 human-written words to be indexed). */
export const NOTE_MIN_WORDS: Record<string, number> = { suburb: 80 };
export const NOTE_TARGET_MAX = 200;
export const minWordsFor = (kind: string) => NOTE_MIN_WORDS[kind] ?? 0;

export const KIND_LABELS: Record<string, string> = {
  suburb: "Suburb guides",
  visa: "Visa guides",
  fhb: "First home buyer guides",
  duty: "Stamp duty pages",
  community: "Community pages",
  lender: "Lender pages",
  guide: "Guides",
};
export const KIND_ORDER = ["suburb", "visa", "fhb", "duty", "community", "lender", "guide"];

/** "suburb:nsw/rockdale-2216" ⇄ /admin/seo/suburb/nsw/rockdale-2216 */
export function editHref(key: string) {
  const i = key.indexOf(":");
  const kind = key.slice(0, i);
  const slug = key.slice(i + 1);
  return `/admin/seo/${encodeURIComponent(kind)}/${slug.split("/").map(encodeURIComponent).join("/")}`;
}
export const keyFromParams = (kind: string, slug: string[]) => `${decodeURIComponent(kind)}:${slug.map(decodeURIComponent).join("/")}`;
