// Every 10 minutes (WP cron mm_crm_sync_emails / "ten_minutes"): Zoho Mail incremental sync.
import { NextResponse } from "next/server";
import { checkCron } from "@/lib/cron";
import { runSync } from "@/modules/crm-extra/lib/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const deny = checkCron(req);
  if (deny) return deny;
  return NextResponse.json(await runSync(false));
}
