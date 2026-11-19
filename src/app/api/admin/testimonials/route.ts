import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const data = await request.json();

    const testimonial = await prisma.testimonial.create({
      data: {
        clientName: data.clientName,
        content: data.content,
        role: data.role || "",
        rating: parseInt(data.rating) || 5,
        approved: data.approved || false,
        published: data.published || false,
      },
    });

    return NextResponse.json(testimonial);
  } catch (error) {
    console.error("Testimonial creation error:", error);
    return NextResponse.json({ error: "Failed to create testimonial" }, { status: 500 });
  }
}
