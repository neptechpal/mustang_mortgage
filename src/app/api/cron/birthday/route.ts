// Daily birthday automation (WP cron mmcrm_mkt_bday_daily). Runs once per Sydney day at/after the
// configured hour, so it can be triggered hourly or daily.
import { NextResponse } from "next/server";
import { checkCron } from "@/lib/cron";
import { birthdayCron } from "@/modules/crm-extra/lib/marketing";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const deny = checkCron(req);
  if (deny) return deny;
  return NextResponse.json(await birthdayCron());
}
