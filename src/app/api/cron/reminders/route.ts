// Hourly (WP cron mmcrm_nr_cron): email due reminders.
import { NextResponse } from "next/server";
import { checkCron } from "@/lib/cron";
import { sendDueReminders } from "@/modules/crm-extra/lib/reminders";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const deny = checkCron(req);
  if (deny) return deny;
  return NextResponse.json(await sendDueReminders());
}
