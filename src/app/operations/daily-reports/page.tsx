/**
 * MAIN OPERATIONS — DAILY REPORTS (Phase 7)
 *
 * Server Component. Past dates are read straight from the Phase 6
 * historical archive — no HTTP round trip, no Planner call. Today's
 * Africa/Lagos date is the one exception: it is built live from Planner
 * on every load, since the archive for today either doesn't exist yet or
 * predates the late-night capture (see /lib/operations/snapshot.ts and
 * vercel.json). The page always opens on today, because today's data is
 * now always available regardless of whether it's been captured.
 *
 * Authorization is already enforced for every page in src/app/layout.tsx
 * (getCurrentUser -> redirect to /login), so there is deliberately no
 * duplicate session check here. The Phase 6 API route keeps its own
 * check because it can be called directly.
 */

import { getOperationsTeamData } from "@/lib/operations/team-data";
import {
  getOperationsDailyReportSnapshot,
  listOperationsDailyReportDates,
  buildOperationsDailyReportSnapshot,
} from "@/lib/operations/snapshot";
import {
  getLagosReportDate,
  getReportMonthRange,
} from "@/lib/operations/report-date";
import { DailyReportsBrowser } from "@/components/operations/daily-reports/DailyReportsBrowser";
import styles from "./page.module.css";

// Today's tab is always live, and historical snapshots are per-session
// reads; never serve this from a static or shared cache.
export const dynamic = "force-dynamic";
export const revalidate = 0;

/** "2026-09-15" -> "2026-09". Month key used by the client-side index cache. */
function monthKeyOf(reportDate: string): string {
  return reportDate.slice(0, 7);
}

export default async function DailyReportsPage() {
  const today = getLagosReportDate();

  // Calendar index for the current Africa/Lagos month — used only to
  // paint availability dots on past dates. It never affects which date
  // the page opens on.
  const range = getReportMonthRange(today);
  const index = await listOperationsDailyReportDates(range);

  // Always open on today. Today's data is always available live now, so
  // there is no need to fall back to "most recently captured date."
  const initialDate = today;
  const initialSnapshot = buildOperationsDailyReportSnapshot(await getOperationsTeamData());

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <div className={styles.eyebrow}>MAIN OPERATIONS</div>
          <h1 className={styles.title}>Daily Reports</h1>
          <p className={styles.subtitle}>
            Main Operations team reports. .
          </p>
        </div>
      </header>

      <DailyReportsBrowser
        today={today}
        initialDate={initialDate}
        initialMonthKey={monthKeyOf(initialDate)}
        initialIndex={index}
        initialSnapshot={initialSnapshot}
      />
    </div>
  );
}