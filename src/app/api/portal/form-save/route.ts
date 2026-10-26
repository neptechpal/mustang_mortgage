import { NextResponse } from "next/server";
import { authPortal } from "@/modules/crm/cases";
import { ffHandle } from "@/modules/crm/factfind";
import { saveFormAnswers } from "@/modules/crm/forms/service";
import type { Values } from "@/modules/crm/forms/engine";
import { mysqlNow } from "@/modules/crm/util";

// mmcrm_form_save (nopriv). Body JSON: {mode, form_id ('ff'|id), case_id, token, silent, values, mmf_website}
const hits = new Map<string, { n: number; t: number }>();

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ success: false, data: { errors: ["Something went wrong. Please try again."] } }, { status: 400 });
  }
  const mode = body.mode === "submit" ? "submit" : "draft";
  const silent = !!body.silent;
  const values = (body.values && typeof body.values === "object" ? body.values : {}) as Values;
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "";
  const ua = req.headers.get("user-agent") || "";
  const caseIdRaw = body.case_id;

  if (body.form_id === "ff" || body.ff) {
    const c = await authPortal(caseIdRaw, body.token);
    if (!c) return NextResponse.json({ success: false, data: { errors: ["This link is not valid."] } }, { status: 403 });
    if (!c.showFactfind) return NextResponse.json({ success: false, data: { errors: ["The Fact Find is not enabled for this case."] } }, { status: 403 });
    const r = await ffHandle(c.id, values, mode === "submit" ? "submit" : "save", silent, { ip, ua });
    if (!r.ok) return NextResponse.json({ success: false, data: { errors: r.errors, fields: r.fields ?? {} } });
    return NextResponse.json({ success: true, data: { saved: mysqlNow(), reload: mode === "submit" } });
  }

  const formId = parseInt(String(body.form_id ?? ""), 10);
  if (!formId) return NextResponse.json({ success: false, data: { errors: ["This form is not available."] } });
  let caseId: number | null = null;
  if (caseIdRaw && String(caseIdRaw) !== "0") {
    const c = await authPortal(caseIdRaw, body.token);
    if (!c) return NextResponse.json({ success: false, data: { errors: ["This link is not valid."] } }, { status: 403 });
    caseId = c.id;
  } else {
    if (body.mmf_website) return NextResponse.json({ success: true, data: { done: true } }); // honeypot
    if (mode !== "submit") return NextResponse.json({ success: true, data: { saved: "" } });
    const k = ip || "x";
    const h = hits.get(k);
    const now = Date.now();
    if (h && now - h.t < 3600_000) {
      if (h.n >= 8) return NextResponse.json({ success: false, data: { errors: ["Too many submissions. Please try again later."] } });
      h.n++;
    } else hits.set(k, { n: 1, t: now });
  }
  const r = await saveFormAnswers({ formId, caseId, raw: values, mode, silent, ip });
  if (!r.ok) return NextResponse.json({ success: false, data: { errors: r.errors, fields: r.fields ?? {} } });
  return NextResponse.json({ success: true, data: { saved: r.saved ?? "", done: !!r.done, reload: !!r.reload } });
}
