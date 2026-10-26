import { publicUrl } from "@/lib/url";
import { NextResponse } from "next/server";
import { authPortal } from "@/modules/crm/cases";
import { clientMessage } from "@/modules/crm/factfind";

// Portal "Questions & Messages" form post.
export async function POST(req: Request) {
  const fd = await req.formData().catch(() => null);
  if (!fd) return new NextResponse("Invalid request", { status: 400 });
  const c = await authPortal(fd.get("mm_case"), fd.get("mm_key"));
  if (!c) return new NextResponse("Invalid link", { status: 403 });
  const text = String(fd.get("message_text") ?? "");
  if (!text.trim()) return new NextResponse("Empty message", { status: 400 });
  await clientMessage(c.id, text);
  const back = new URL(req.url);
  const step = String(fd.get("step") ?? "");
  const q = new URLSearchParams({ mm_case: String(c.id), mm_key: String(fd.get("mm_key")) });
  if (step) q.set("step", step);
  q.set("sent", "1");
  return NextResponse.redirect(publicUrl(req, `/portal?${q.toString()}#messages`), 303);
}
