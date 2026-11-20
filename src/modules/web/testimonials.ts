import { prisma } from "@/lib/db";

export type PublicTestimonial = { id: number; clientName: string; content: string; detail: string; rating: number | null };

/** Published testimonials for the home page. Returns [] if the database is unreachable so the page still renders. */
export async function getPublishedTestimonials(limit = 6): Promise<PublicTestimonial[]> {
  try {
    return await prisma.testimonial.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: limit,
      select: { id: true, clientName: true, content: true, detail: true, rating: true },
    });
  } catch {
    return [];
  }
}
