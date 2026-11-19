import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;
    const data = await request.json();

    const testimonial = await prisma.testimonial.update({
      where: { id: parseInt(id) },
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
    console.error("Testimonial update error:", error);
    return NextResponse.json({ error: "Failed to update testimonial" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id } = await params;

    await prisma.testimonial.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Testimonial delete error:", error);
    return NextResponse.json({ error: "Failed to delete testimonial" }, { status: 500 });
  }
}
