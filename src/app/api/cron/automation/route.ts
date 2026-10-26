import { NextResponse } from "next/server";
import { checkCron } from "@/lib/cron";
import { runChaseCron } from "@/modules/crm/automation";

// Hourly: automatic client reminders (mmcrm_auto_hourly).
export async function POST(req: Request) {
  const denied = checkCron(req);
  if (denied) return denied;
  const report = await runChaseCron();
  return NextResponse.json({ ok: true, report });
}
