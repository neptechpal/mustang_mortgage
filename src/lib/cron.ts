import { NextResponse } from "next/server";

// Scheduled jobs are exposed as POST /api/cron/<job> and triggered by a
// systemd timer on the server with header "x-cron-secret: $CRON_SECRET".
export function checkCron(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
