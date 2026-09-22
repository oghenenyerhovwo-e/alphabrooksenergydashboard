/**
 * MAIN OPERATIONS — HISTORICAL DAILY REPORT API (Phase 6)
 *
 * Serves stored snapshots for past dates. Today's Africa/Lagos reporting
 * date is the one exception: it is never read from the database — the
 * daily capture now runs late at night (see /api/operations/reports/capture
 * and vercel.json), so during the day there either is no row for today
 * yet, or an older one that predates a normalization fix. Today is always
 * built live from Planner instead, using the same pure
 * buildOperationsDailyReportSnapshot() shaper the nightly capture uses —
 * so the shape returned to the client is identical either way.
 *
 *   GET /api/operations/reports?date=2026-09-15
 *       -> today: live from Planner. Any other date: the stored snapshot.
 *
 *   GET /api/operations/reports?from=2026-09-01&to=2026-09-30
 *   GET /api/operations/reports            (defaults to the current Lagos month)
 *       -> the index of dates that have a report, headline numbers only
 *
 * Authorization follows the existing session convention used by
 * /api/cng/data: a valid ab_session cookie belonging to an ACTIVE user.
 * Historical reports contain internal business information and are never
 * public.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getOperationsTeamData } from "@/lib/operations/team-data";
import {
  getOperationsDailyReportSnapshot,
  listOperationsDailyReportDates,
  buildOperationsDailyReportSnapshot,
} from "@/lib/operations/snapshot";
import {
  getLagosReportDate,
  getReportMonthRange,
  isValidReportDate,
} from "@/lib/operations/report-date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  /* ---- Single reporting date ---- */
  if (date !== null) {
    if (!isValidReportDate(date)) {
      return NextResponse.json(
        { error: "Invalid date. Expected an Africa/Lagos reporting date in YYYY-MM-DD form." },
        { status: 400 }
      );
    }

    try {
      const today = getLagosReportDate();

      // Today is always live — never read from the (possibly missing or
      // stale) stored row. Every other date is the frozen archive, as before.
      if (date === today) {
        const liveData = await getOperationsTeamData(date);
        const liveSnapshot = buildOperationsDailyReportSnapshot(liveData, new Date());

        return NextResponse.json(
          { reportDate: date, snapshot: liveSnapshot },
          { status: 200 }
        );
      }

      const snapshot = await getOperationsDailyReportSnapshot(date);

      if (!snapshot) {
        // 200, not 404: "no report was recorded for this date" is a
        // normal, expected answer the calendar must render clearly.
        return NextResponse.json({ reportDate: date, snapshot: null }, { status: 200 });
      }

      return NextResponse.json({ reportDate: date, snapshot }, { status: 200 });
    } catch (e) {
      console.error("[Operations Reports API] snapshot read failed:", e);
      return NextResponse.json(
        { error: "An unexpected server error occurred." },
        { status: 500 }
      );
    }
  }

  /* ---- Date index for a range / the current Lagos month ---- */
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  let range: { from: string; to: string };

  if (fromParam !== null || toParam !== null) {
    if (!isValidReportDate(fromParam) || !isValidReportDate(toParam)) {
      return NextResponse.json(
        { error: "Invalid range. Provide both from and to as YYYY-MM-DD." },
        { status: 400 }
      );
    }
    if (fromParam > toParam) {
      return NextResponse.json(
        { error: "Invalid range. from must not be after to." },
        { status: 400 }
      );
    }
    range = { from: fromParam, to: toParam };
  } else {
    range = getReportMonthRange(getLagosReportDate());
  }

  try {
    const reports = await listOperationsDailyReportDates(range);
    return NextResponse.json({ ...range, reports }, { status: 200 });
  } catch (e) {
    console.error("[Operations Reports API] index read failed:", e);
    return NextResponse.json(
      { error: "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}