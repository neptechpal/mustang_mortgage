import { NextResponse } from "next/server";
import { getCf7Definition } from "@/modules/site/cf7/registry";
import { handleCf7Submission } from "@/modules/site/cf7/server";
import { clientIp, honeypotTripped, rateLimited } from "@/modules/site/forms/guard";
import { handleLeadSubmission, handleNewsletter } from "@/modules/site/lead/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public form endpoint:
//   POST /api/forms/<cf7 id>   Contact Form 7 replicas (1767, 2651, 2790) - multipart
//   POST /api/forms/mmf-3012   contact-page lead form
//   POST /api/forms/newsletter footer "Join Our Community"
const MAX_BODY = 60 * 1024 * 1024; // largest CF7 upload limit is 50MB per file

export async function POST(req: Request, { params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  const len = Number(req.headers.get("content-length") || 0);
  if (len > MAX_BODY) return NextResponse.json({ status: "aborted", message: "The uploaded file is too large." }, { status: 413 });

  const ip = clientIp(req);
  const ctx = { ip, userAgent: req.headers.get("user-agent") || "", url: req.headers.get("referer") || "" };
  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return NextResponse.json({ status: "aborted", message: "Invalid request." }, { status: 400 });
  }
  const pageUrl = fd.get("_url");
  if (typeof pageUrl === "string" && pageUrl) ctx.url = pageUrl.slice(0, 500);

  if (formId === "newsletter") {
    if (rateLimited(`nl:${ip}`, 5) || honeypotTripped(fd)) return NextResponse.json({ status: "error" });
    return NextResponse.json(await handleNewsletter(fd, ctx));
  }

  if (formId === "mmf-3012") {
    if (honeypotTripped(fd)) return NextResponse.json({ success: true, data: {} }); // silently drop bots
    if (rateLimited(`mmf:${ip}`)) return NextResponse.json({ success: false, data: { errors: ["Too many submissions — please try again later."] } }, { status: 429 });
    return NextResponse.json(await handleLeadSubmission(fd, ctx));
  }

  const id = Number(formId);
  const def = Number.isInteger(id) ? await getCf7Definition(id) : null;
  if (!def) return NextResponse.json({ status: "aborted", message: "The requested contact form was not found." }, { status: 404 });
  const spam = def.messages.spam || "There was an error trying to send your message. Please try again later.";
  if (honeypotTripped(fd) || rateLimited(`cf7:${id}:${ip}`)) return NextResponse.json({ status: "spam", message: spam });
  try {
    return NextResponse.json(await handleCf7Submission(def, fd, ctx));
  } catch (e) {
    console.error("cf7 submission failed", e);
    return NextResponse.json({ status: "mail_failed", message: def.messages.mail_sent_ng }, { status: 500 });
  }
}
