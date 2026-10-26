import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readStoredFile } from "@/lib/storage";
import { getSession, isStaff } from "@/lib/session";
import { getProfile } from "@/modules/members/profile";

// Serves a member's profile photo (stored privately). Visible when the profile itself is visible.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = parseInt(id, 10);
  if (!Number.isFinite(uid)) return new NextResponse("Not found", { status: 404 });
  const user = await prisma.user.findUnique({ where: { id: uid }, select: { id: true, status: true, profile: true } });
  if (!user) return new NextResponse("Not found", { status: 404 });
  const p = getProfile(user);
  if (!p.photoId) return new NextResponse("Not found", { status: 404 });
  const s = await getSession();
  const allowed = s?.uid === user.id || isStaff(s?.role) || (user.status === "approved" && p.profilePrivacy !== "Only me");
  if (!allowed) return new NextResponse("Not found", { status: 404 });
  const file = await readStoredFile(p.photoId);
  if (!file || !file.rec.mimeType.startsWith("image/")) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.rec.mimeType,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
