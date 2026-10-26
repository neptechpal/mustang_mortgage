// Custom Links (port of includes/custom-links.php). Stored in setting "crmx.links".
import crypto from "crypto";
import { getSetting, setSetting } from "@/lib/settings";

export type CustomLink = { id: string; label: string; url: string; group: string; target: 0 | 1; modal: 0 | 1; order: number; notes: string; icon: string };
const KEY = "crmx.links";

export async function getLinks(): Promise<CustomLink[]> {
  const rows = await getSetting<CustomLink[]>(KEY, []);
  return (Array.isArray(rows) ? rows : []).slice().sort((a, b) => (a.order || 9999) - (b.order || 9999));
}

export async function saveLinks(rows: CustomLink[]) {
  const sorted = rows.slice().sort((a, b) => (a.order || 9999) - (b.order || 9999));
  sorted.forEach((r, i) => (r.order = i + 1));
  await setSetting(KEY, sorted);
}

export function newId() {
  const A = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return "l_" + Array.from(crypto.randomBytes(8), (b) => A[b % A.length]).join("");
}

export function cleanUrl(u: string) {
  const s = u.trim();
  if (!s) return "";
  if (/^(javascript|data|vbscript):/i.test(s)) return "";
  return /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`;
}
