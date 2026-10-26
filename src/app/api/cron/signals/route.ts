// Daily ~02:17 Sydney (WP cron mmcrm_signals_daily): re-evaluate document signals for every case.
import { NextResponse } from "next/server";
import { checkCron } from "@/lib/cron";
import { signalsDaily } from "@/modules/crm-extra/lib/signals";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const deny = checkCron(req);
  if (deny) return deny;
  return NextResponse.json(await signalsDaily());
}
