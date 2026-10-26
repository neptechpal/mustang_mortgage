"use server";
// Broker sign-off for programmatic pages (contract: src/modules/web/review.ts). One page at a time:
// there is deliberately no bulk approve (research §C6: 100% human review in batch 1).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { appendLog } from "./data";
import { countWords, editHref, minWordsFor } from "./shared";

const MAX_NOTE = 4000;
const MAX_NOTES = 8000;

function readForm(fd: FormData) {
  const key = String(fd.get("key") ?? "").trim();
  // Normalise line endings, trim trailing spaces, keep paragraph breaks.
  const clean = (v: FormDataEntryValue | null, max: number) =>
    String(v ?? "")
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, max);
  return { key, brokerNote: clean(fd.get("brokerNote"), MAX_NOTE), notes: clean(fd.get("notes"), MAX_NOTES) };
}

async function rowOrBack(key: string) {
  const row = key ? await prisma.seoReview.findUnique({ where: { key } }) : null;
  if (!row) redirect("/admin/seo?error=missing");
  return row;
}

function revalidateRow(path: string) {
  if (path) revalidatePath(path);
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/seo");
}

/** Save the broker note and internal notes. An approved page whose note drops below the minimum is unapproved. */
export async function saveReview(fd: FormData) {
  const s = await requireStaff();
  const { key, brokerNote, notes } = readForm(fd);
  const row = await rowOrBack(key);
  const words = countWords(brokerNote);
  const tooShort = words < minWordsFor(row.kind);
  const unapprove = row.reviewed && tooShort;
  await prisma.seoReview.update({
    where: { key },
    data: { brokerNote, notes, ...(unapprove ? { reviewed: false, reviewedBy: "", reviewedAt: null } : {}) },
  });
  await appendLog({ at: new Date().toISOString(), by: s.name, key, action: unapprove ? "auto-unapproved" : "saved", words });
  revalidateRow(row.path);
  redirect(`${editHref(key)}?${unapprove ? "unapproved=short" : "saved=1"}`);
}

/** Approve (sign off) one page: saves the form, then records reviewedBy = current staff name and reviewedAt = now. */
export async function approveReview(fd: FormData) {
  const s = await requireStaff();
  const { key, brokerNote, notes } = readForm(fd);
  const row = await rowOrBack(key);
  const words = countWords(brokerNote);
  if (words < minWordsFor(row.kind)) {
    await prisma.seoReview.update({ where: { key }, data: { brokerNote, notes } });
    redirect(`${editHref(key)}?error=short`);
  }
  await prisma.seoReview.update({ where: { key }, data: { brokerNote, notes, reviewed: true, reviewedBy: s.name, reviewedAt: new Date() } });
  await appendLog({ at: new Date().toISOString(), by: s.name, key, action: "approved", words });
  revalidateRow(row.path);
  redirect(`${editHref(key)}?approved=1`);
}

/** Withdraw sign-off: the page goes back to noindex and out of the sitemap. */
export async function unapproveReview(fd: FormData) {
  const s = await requireStaff();
  const { key, brokerNote, notes } = readForm(fd);
  const row = await rowOrBack(key);
  await prisma.seoReview.update({ where: { key }, data: { brokerNote, notes, reviewed: false, reviewedBy: "", reviewedAt: null } });
  await appendLog({ at: new Date().toISOString(), by: s.name, key, action: "unapproved", words: countWords(brokerNote) });
  revalidateRow(row.path);
  redirect(`${editHref(key)}?unapproved=1`);
}
