"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireArea } from "@/lib/session";
import { DEFAULT_LENDERS, parseLenderLines, saveLenders } from "./lenders";

const text = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);

function refreshPublic() {
  revalidatePath("/");
  revalidatePath("/admin/testimonials");
}

export async function saveTestimonialAction(fd: FormData) {
  await requireArea("/admin/testimonials");
  const id = parseInt(text(fd, "id", 12), 10) || 0;
  const clientName = text(fd, "clientName", 120);
  const content = text(fd, "content", 2000);
  const back = id ? `/admin/testimonials/${id}` : "/admin/testimonials/new";
  if (!clientName || !content) redirect(`${back}?error=${encodeURIComponent("Please enter the client name and the testimonial.")}`);

  const rating = parseInt(text(fd, "rating", 2), 10);
  const data = {
    clientName,
    content,
    detail: text(fd, "detail", 160),
    rating: rating >= 1 && rating <= 5 ? rating : null,
    sortOrder: Math.max(0, Math.min(9999, parseInt(text(fd, "sortOrder", 5), 10) || 0)),
    published: String(fd.get("published") ?? "") === "1",
  };
  if (id) await prisma.testimonial.update({ where: { id }, data });
  else await prisma.testimonial.create({ data });
  refreshPublic();
  redirect(`/admin/testimonials?msg=${encodeURIComponent(data.published ? "Testimonial saved and shown on the website." : "Testimonial saved. It is hidden until you tick \"Show on website\".")}`);
}

export async function deleteTestimonialAction(fd: FormData) {
  await requireArea("/admin/testimonials");
  const id = parseInt(text(fd, "id", 12), 10);
  if (id) await prisma.testimonial.deleteMany({ where: { id } });
  refreshPublic();
  redirect(`/admin/testimonials?msg=${encodeURIComponent("Testimonial deleted.")}`);
}

export async function saveLendersAction(fd: FormData) {
  await requireArea("/admin/lenders");
  const list = parseLenderLines(String(fd.get("lenders") ?? ""));
  if (!list.length) redirect(`/admin/lenders?error=${encodeURIComponent("Add at least one lender, or use \"Reset to starting list\".")}`);
  await saveLenders(list);
  revalidatePath("/");
  redirect(`/admin/lenders?msg=${encodeURIComponent(`Saved ${list.length} lenders.`)}`);
}

export async function resetLendersAction() {
  await requireArea("/admin/lenders");
  await saveLenders(DEFAULT_LENDERS);
  revalidatePath("/");
  redirect(`/admin/lenders?msg=${encodeURIComponent("Reset to the starting list.")}`);
}
