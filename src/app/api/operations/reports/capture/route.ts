import { NextResponse } from "next/server";
import { getOperationsTeamData } from "@/lib/operations/team-data";
import { captureOperationsDailyReportSnapshot } from "@/lib/operations/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * MAIN OPERATIONS — HISTORICAL SNAPSHOT CAPTURE (close-of-day)
 *
 * Captures the Main Operations historical snapshot for the current
 * Africa/Lagos reporting date. Runs late at night, after the day's
 * Planner activity is actually done — deliberately separate from the
 * 7am email cron (/api/aria/report/main/send), which used to capture
 * the snapshot at the start of the day instead of the end.
 */
async function captureToday(force: boolean) {
  const data = await getOperationsTeamData();
  const result = await captureOperationsDailyReportSnapshot(data, { force });
  console.log(
    `[Operations Snapshot Capture] ${result.status} for ${result.reportDate}${
      result.reason ? ` — ${result.reason}` : ""
    }`
  );
  return result;
}

/** Vercel Cron calls this at close of day (see vercel.json). */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const result = await captureToday(false);
  return NextResponse.json(result, { status: result.status === "failed" ? 500 : 200 });
}

/**
 * Manual/admin re-run. Use this once, right after deploying, to force-
 * regenerate today's already-stored (and incorrectly normalized) row.
 */
export async function POST(req: Request) {
  const token = req.headers.get("x-aria-internal-token");
  if (!token || token !== process.env.ARIA_INTERNAL_TOKEN) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const result = await captureToday(true); // force overwrite
  return NextResponse.json(result, { status: result.status === "failed" ? 500 : 200 });
}