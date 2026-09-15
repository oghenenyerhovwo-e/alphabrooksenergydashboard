"use client";

/**
 * MAIN OPERATIONS — DAILY REPORTS BROWSER (Phase 7, completed in Phase 8)
 *
 * Owns the interactive state: which month the calendar shows, which date
 * is selected, which tab is active, and the fetched historical reports.
 *
 * Request budget, by design:
 *   - first paint:      0 (the server component supplies the initial data)
 *   - select a date:    1 request, and 0 if that date is already cached
 *   - change month:     1 request, and 0 if that month is already cached
 *   - switch tabs:      0 — both panels read the same snapshot object
 *   - expand anything:  0
 *
 * Caching a snapshot in memory is safe because Phase 6 snapshots are
 * immutable once captured — re-fetching could never return anything
 * different. Planner is never contacted from this page.
 *
 * PHASE 8: the Performance tab is enabled and renders PerformancePanel
 * from the same selected snapshot. There is one calendar and one selected
 * date driving both tabs; changing the date updates whichever tab is open
 * without resetting the user's tab choice.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatReportDateLabel } from "@/lib/operations/report-date";
import type {
  OperationsDailyReportSnapshot,
  OperationsDailyReportIndexEntry,
} from "@/types/operations-history";
import { ReportCalendar } from "./ReportCalendar";
import { TeamTasksPanel } from "./TeamTasksPanel";
import { PerformancePanel } from "./PerformancePanel";
import styles from "./daily-reports.module.css";

type TabKey = "tasks" | "performance";

/** null is a real, distinct value here: "fetched, and no report exists for this date". */
type SnapshotCacheValue = OperationsDailyReportSnapshot | null;

interface DailyReportsBrowserProps {
  today: string;
  initialDate: string;
  initialMonthKey: string;
  initialIndex: OperationsDailyReportIndexEntry[];
  initialSnapshot: OperationsDailyReportSnapshot | null;
}

function lastDayOfMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${monthKey}-${String(last).padStart(2, "0")}`;
}

export function DailyReportsBrowser({
  today,
  initialDate,
  initialMonthKey,
  initialIndex,
  initialSnapshot,
}: DailyReportsBrowserProps) {
  const [monthKey, setMonthKey] = useState(initialMonthKey);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [activeTab, setActiveTab] = useState<TabKey>("tasks");
  const [calendarCollapsed, setCalendarCollapsed] = useState(false);

  const [snapshots, setSnapshots] = useState<Map<string, SnapshotCacheValue>>(
    () => new Map([[initialDate, initialSnapshot]])
  );
  const [monthIndex, setMonthIndex] = useState<Map<string, OperationsDailyReportIndexEntry[]>>(
  () => new Map([[initialMonthKey, initialIndex]])
);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [indexLoading, setIndexLoading] = useState(false);

  // Guards against a slow earlier response overwriting a newer selection.
  const latestRequest = useRef<string>(initialDate);

  /* ---- month index ---- */

  useEffect(() => {
    if (monthIndex.has(monthKey)) return;

    let cancelled = false;
    setIndexLoading(true);

    const from = `${monthKey}-01`;
    const to = lastDayOfMonth(monthKey);

    fetch(`/api/operations/reports?from=${from}&to=${to}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("index"))))
      .then((body: { reports?: OperationsDailyReportIndexEntry[] }) => {
        if (cancelled) return;
        setMonthIndex((current) => {
          const next = new Map(current);
          next.set(monthKey, body.reports ?? []);
          return next;
        });
      })
      .catch(() => {
        if (cancelled) return;
        // A failed index only costs the availability dots, not the report
        // itself — record an empty month rather than blocking the page.
        setMonthIndex((current) => {
          const next = new Map(current);
          next.set(monthKey, []);
          return next;
        });
      })
      .finally(() => {
        if (!cancelled) setIndexLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [monthKey, monthIndex]);

  /* ---- selected report ---- */

  useEffect(() => {
    if (snapshots.has(selectedDate)) {
      setReportError(null);
      setReportLoading(false);
      return;
    }

    let cancelled = false;
    latestRequest.current = selectedDate;
    setReportLoading(true);
    setReportError(null);

    fetch(`/api/operations/reports?date=${selectedDate}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("report"))))
      .then((body: { snapshot?: OperationsDailyReportSnapshot | null }) => {
        if (cancelled || latestRequest.current !== selectedDate) return;
        setSnapshots((current) => {
          const next = new Map(current);
          next.set(selectedDate, body.snapshot ?? null);
          return next;
        });
      })
      .catch(() => {
        if (cancelled || latestRequest.current !== selectedDate) return;
        // Deliberately generic — no server detail reaches the browser.
        setReportError("Unable to load the daily report. Please try again.");
      })
      .finally(() => {
        if (!cancelled && latestRequest.current === selectedDate) {
          setReportLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate, snapshots]);

  // The active tab is deliberately preserved across date changes: a manager
  // comparing performance day to day should not be thrown back to Team
  // Tasks on every click.
  const handleSelectDate = useCallback((date: string) => {
    setSelectedDate(date);
  }, []);

  const handleToggleCalendarCollapsed = useCallback(() => {
    setCalendarCollapsed((current) => !current);
  }, []);

  const handleRetry = useCallback(() => {
    setSnapshots((current) => {
      const next = new Map(current);
      next.delete(selectedDate);
      return next;
    });
    setReportError(null);
  }, [selectedDate]);

  const datesWithReports = useMemo(() => {
    const entries = monthIndex.get(monthKey) ?? [];
    return new Set(entries.map((entry) => entry.reportDate));
  }, [monthIndex, monthKey]);

  const snapshot = snapshots.get(selectedDate);
  const hasSnapshot = snapshot !== undefined && snapshot !== null;
  const dateLabel = formatReportDateLabel(selectedDate);

  return (
    <div className={styles.layout}>
      <ReportCalendar
        monthKey={monthKey}
        selectedDate={selectedDate}
        today={today}
        datesWithReports={datesWithReports}
        indexLoading={indexLoading}
        collapsed={calendarCollapsed}
        onMonthChange={setMonthKey}
        onSelectDate={handleSelectDate}
        onToggleCollapsed={handleToggleCalendarCollapsed}
      />

      <section className={styles.reportCard} aria-live="polite">
        <header className={styles.reportHead}>
          <div>
            <div className={styles.reportEyebrow}>SELECTED REPORT</div>
            <h2 className={styles.reportTitle}>{dateLabel}</h2>
            <p className={styles.reportSubtitle}>Daily Team Report</p>
          </div>

          {hasSnapshot && (
            <div className={styles.overallBlock}>
              <div className={styles.overallLabel}>Overall team completion</div>
              <div className={styles.overallValue}>
                {snapshot.overall.completionPercentage === null
                  ? "—"
                  : `${snapshot.overall.completionPercentage}%`}
              </div>
              <div className={styles.overallCounts}>
                {snapshot.overall.completedUniqueTasks} of{" "}
                {snapshot.overall.totalUniqueTasks} tasks completed
              </div>
            </div>
          )}
        </header>

        {reportLoading && (
          <div className={styles.loading}>Loading daily report…</div>
        )}

        {!reportLoading && reportError && (
          <div className={styles.errorState}>
            <div className={styles.emptyTitle}>Unable to load the daily report</div>
            <p>Please try again.</p>
            <button type="button" className={styles.retryButton} onClick={handleRetry}>
              Try again
            </button>
          </div>
        )}

        {!reportLoading && !reportError && snapshot === null && (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>
              No daily report is available for {dateLabel}.
            </div>
            <p>
              No report snapshot was recorded for this date. This is not a
              zero-performance day — there is simply nothing stored for it.
            </p>
          </div>
        )}

        {!reportLoading && !reportError && hasSnapshot && (
          <>
            <div className={styles.summaryStrip}>
              <Summary
                label="Completed"
                value={snapshot.overall.statusCounts.completed}
              />
              <Summary
                label="In Progress"
                value={snapshot.overall.statusCounts.inProgress}
              />
              <Summary
                label="Pending"
                value={snapshot.overall.statusCounts.pending}
              />
              <Summary
                label="Overdue"
                value={snapshot.overall.statusCounts.overdue}
                tone={snapshot.overall.statusCounts.overdue > 0 ? "warn" : undefined}
              />
              <Summary
                label="Blockers"
                value={snapshot.overall.blockerCount}
                tone={snapshot.overall.blockerCount > 0 ? "warn" : undefined}
              />
            </div>

            <div className={styles.tabs} role="tablist" aria-label="Report sections">
              <button
                type="button"
                role="tab"
                id="tab-team-tasks"
                aria-selected={activeTab === "tasks"}
                aria-controls="panel-team-tasks"
                className={styles.tab}
                data-active={activeTab === "tasks"}
                onClick={() => setActiveTab("tasks")}
              >
                Team Tasks
              </button>

              <button
                type="button"
                role="tab"
                id="tab-performance"
                aria-selected={activeTab === "performance"}
                aria-controls="panel-performance"
                className={styles.tab}
                data-active={activeTab === "performance"}
                onClick={() => setActiveTab("performance")}
              >
                Performance
              </button>
            </div>

            {activeTab === "tasks" && (
              <div
                role="tabpanel"
                id="panel-team-tasks"
                aria-labelledby="tab-team-tasks"
                className={styles.tabPanel}
              >
                <TeamTasksPanel snapshot={snapshot} />
              </div>
            )}

            {activeTab === "performance" && (
              <div
                role="tabpanel"
                id="panel-performance"
                aria-labelledby="tab-performance"
                className={styles.tabPanel}
              >
                <PerformancePanel snapshot={snapshot} />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Summary({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "warn";
}) {
  return (
    <div className={styles.summaryItem} data-tone={tone}>
      <div className={styles.summaryLabel}>{label}</div>
      <div className={styles.summaryValue}>{value}</div>
    </div>
  );
}